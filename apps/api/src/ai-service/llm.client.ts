import { AppError } from '../utils/AppError';
import { INTERNAL_SERVER_ERROR, SERVICE_UNAVAILABLE } from '../utils/httpStatusCodes';
import { fallbackModel } from './ai.config';

// Z.ai (GLM) via its OpenAI-compatible API. AI_BASE_URL exists so tests can point at a local mock, or at
// another OpenAI-compatible provider (then set GLM_KEY to that provider's key and AI_THINKING to "").
const endpoint = () => `${process.env.AI_BASE_URL || 'https://api.z.ai/api/paas/v4'}/chat/completions`;

// GLM thinks by default, which adds many seconds per reply. Chat answers are better off without it.
// "disabled" | "enabled" | "" (don't send the field; some models, e.g. glm-5.3*, always think and reject "disabled").
const thinkingMode = () => process.env.AI_THINKING ?? 'disabled';

// Text-only messages are sent as plain strings: the widest-supported shape, and it drops the cache_control hints
// (an Anthropic/OpenRouter feature) that GLM has no use for. Messages with images/files keep their parts.
const flatten = (m: ChatMessage): ChatMessage =>
    Array.isArray(m.content) && m.content.every((p) => p.type === 'text')
        ? { role: m.role, content: m.content.map((p) => (p as { text: string }).text).join('\n') }
        : m;
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
    /** Provider plugins (OpenRouter's PDF parser); GLM ignores these, kept for when attachments return */
    plugins?: unknown[];
    signal?: AbortSignal;
};

const request = async (opts: CompletionOptions, stream: boolean): Promise<Response> => {
    const key = process.env.GLM_KEY;
    if (!key) throw new AppError('AI service is not configured', SERVICE_UNAVAILABLE);

    let res: Response;
    try {
        res = await fetch(endpoint(), {
            method: 'POST',
            signal: opts.signal,
            headers: {
                Authorization: `Bearer ${key}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                model: opts.model,
                messages: opts.messages.map(flatten),
                max_tokens: opts.maxTokens,
                stream,
                ...(thinkingMode() ? { thinking: { type: thinkingMode() } } : {}),
                ...(opts.json ? { response_format: { type: 'json_object' } } : {}),
                ...(opts.plugins ? { plugins: opts.plugins } : {}),
            }),
        });
    } catch (err: any) {
        if (err?.name === 'AbortError') throw err;
        throw new AppError('Could not reach the AI provider', BAD_GATEWAY);
    }

    // Optional: retry once on AI_MODEL_FALLBACK when the main model throttles (429) or hiccups (5xx)
    const fallback = fallbackModel();
    if ((res.status === 429 || res.status >= 500) && fallback && opts.model !== fallback) {
        console.warn(`[ai] ${opts.model} returned ${res.status}, retrying on ${fallback}`);
        return request({ ...opts, model: fallback }, stream);
    }

    if (!res.ok) {
        // Log the provider's reason server-side; never forward it to the client
        console.error(`[ai] provider ${res.status}: ${(await res.text().catch(() => '')).slice(0, 500)}`);
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
                // SSE comments and blank lines are keep-alives
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
