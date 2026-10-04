import { AppError } from '../utils/AppError';
import { INTERNAL_SERVER_ERROR, SERVICE_UNAVAILABLE } from '../utils/httpStatusCodes';

// OPENROUTER_BASE_URL exists so tests can point at a local mock
const endpoint = () => `${process.env.OPENROUTER_BASE_URL || 'https://openrouter.ai/api/v1'}/chat/completions`;
const BAD_GATEWAY = 502;

type Cache = { cache_control?: { type: 'ephemeral' } };
export type ContentPart =
    | ({ type: 'text'; text: string } & Cache)
    | { type: 'image_url'; image_url: { url: string } }
    | { type: 'file'; file: { filename: string; file_data: string } };

export type ChatMessage = { role: 'system' | 'user' | 'assistant'; content: string | ContentPart[] };

export type CompletionOptions = {
    model: string;
    messages: ChatMessage[];
    maxTokens?: number;
    json?: boolean;
    /** OpenRouter plugins, e.g. the PDF parser */
    plugins?: unknown[];
    signal?: AbortSignal;
};

const request = async (opts: CompletionOptions, stream: boolean): Promise<Response> => {
    const key = process.env.OPENROUTER_API_KEY;
    if (!key) throw new AppError('AI service is not configured', SERVICE_UNAVAILABLE);

    let res: Response;
    try {
        res = await fetch(endpoint(), {
            method: 'POST',
            signal: opts.signal,
            headers: {
                Authorization: `Bearer ${key}`,
                'Content-Type': 'application/json',
                'HTTP-Referer': process.env.FRONTEND_URL || 'https://irehabcare.com',
                'X-Title': 'iRehabCare',
            },
            body: JSON.stringify({
                model: opts.model,
                messages: opts.messages,
                max_tokens: opts.maxTokens,
                stream,
                ...(opts.json ? { response_format: { type: 'json_object' } } : {}),
                ...(opts.plugins ? { plugins: opts.plugins } : {}),
            }),
        });
    } catch (err: any) {
        if (err?.name === 'AbortError') throw err;
        throw new AppError('Could not reach the AI provider', BAD_GATEWAY);
    }

    if (!res.ok) {
        // Log the provider's reason server-side; never forward it to the client
        console.error(`[ai] OpenRouter ${res.status}: ${(await res.text().catch(() => '')).slice(0, 500)}`);
        throw new AppError(res.status === 429 ? 'The AI is busy, please try again shortly' : 'The AI provider returned an error', res.status === 429 ? 429 : BAD_GATEWAY);
    }
    return res;
};

/** One-shot completion; returns the full text. */
export const complete = async (opts: CompletionOptions): Promise<string> => {
    const res = await request(opts, false);
    const data: any = await res.json();
    const text = data?.choices?.[0]?.message?.content;
    if (typeof text !== 'string') throw new AppError('Empty response from the AI provider', INTERNAL_SERVER_ERROR);
    return text;
};

/** Streaming completion; yields text deltas as they arrive. */
export async function* streamCompletion(opts: CompletionOptions): AsyncGenerator<string> {
    const res = await request(opts, true);
    if (!res.body) throw new AppError('Empty response from the AI provider', INTERNAL_SERVER_ERROR);

    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';
    try {
        while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split('\n');
            buffer = lines.pop() ?? '';
            for (const raw of lines) {
                const line = raw.trim();
                // SSE comments (": OPENROUTER PROCESSING") and blank lines are keep-alives
                if (!line.startsWith('data:')) continue;
                const payload = line.slice(5).trim();
                if (payload === '[DONE]') return;
                let evt: any;
                try { evt = JSON.parse(payload); } catch { continue; }
                if (evt.error) throw new AppError('The AI provider failed mid-response', BAD_GATEWAY);
                const delta = evt.choices?.[0]?.delta?.content;
                if (typeof delta === 'string' && delta) yield delta;
            }
        }
    } finally {
        reader.cancel().catch(() => {});
    }
}
