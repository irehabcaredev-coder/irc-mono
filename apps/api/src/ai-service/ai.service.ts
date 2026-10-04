import { AiSession, Prisma } from '@prisma/client';
import prisma from '../config/prisma';
import { AppError } from '../utils/AppError';
import { BAD_REQUEST, FORBIDDEN, NOT_FOUND, UNAUTHORIZED } from '../utils/httpStatusCodes';
import { OptionalUser } from '../middlewares/optionalAuth';
import { complete, streamCompletion, ChatMessage, ContentPart } from './openrouter.client';
import { ALLOWED_FILE_TYPES, limits, modelFor } from './ai.config';
import { DOCTOR_SYSTEM_PROMPT, LEAD_QUALIFICATION_PROMPT, PATIENT_SYSTEM_PROMPT } from './prompts';
import { leadQualificationSchema } from './ai.schema';

const TOO_MANY_REQUESTS = 429;
const UUID = /^[0-9a-f-]{36}$/i;

export type Attachment = { name: string; mimeType: string; data: Buffer };
export type TurnInput = { prompt: string; chatId?: string; file?: Attachment; imageData?: string };

// ---------- sessions ----------

export const createSession = async (user: OptionalUser) => {
    const session = await prisma.aiSession.create({
        data: { userType: user?.type ?? null, userId: user?.id ?? null },
        select: { id: true },
    });
    return session.id;
};

export const deleteSession = async (sessionId: string | undefined) => {
    if (sessionId && UUID.test(sessionId)) await prisma.aiSession.deleteMany({ where: { id: sessionId } });
};

/** The session id is the credential for chat endpoints. Unknown/missing -> 401 so the client opens a new one. */
export const requireSession = async (sessionId: string | undefined): Promise<AiSession> => {
    if (!sessionId || !UUID.test(sessionId)) throw new AppError('Session required', UNAUTHORIZED);
    const session = await prisma.aiSession.findUnique({ where: { id: sessionId } });
    if (!session) throw new AppError('Session expired', UNAUTHORIZED);
    return session;
};

// Signed-in users see their chats across sessions; guests only see their own session's.
const ownerWhere = (s: AiSession): Prisma.AiChatWhereInput =>
    s.userId ? { userType: s.userType, userId: s.userId } : { sessionId: s.id };

// ---------- history ----------

export const listChats = async (session: AiSession) => {
    const chats = await prisma.aiChat.findMany({
        where: ownerWhere(session),
        orderBy: { updatedAt: 'desc' },
        take: 100,
    });
    return chats.map((c) => ({ chat_id: c.id, title: c.title, created_at: c.createdAt, updated_at: c.updatedAt }));
};

export const getMessages = async (session: AiSession, chatId: string, page: number, pageSize: number) => {
    if (!UUID.test(chatId)) throw new AppError('Chat not found', NOT_FOUND);
    const chat = await prisma.aiChat.findFirst({ where: { id: chatId, ...ownerWhere(session) } });
    if (!chat) throw new AppError('Chat not found', NOT_FOUND);

    const [rows, total] = await Promise.all([
        prisma.aiMessage.findMany({
            where: { chatId },
            orderBy: { createdAt: 'asc' },
            skip: (page - 1) * pageSize,
            take: pageSize,
        }),
        prisma.aiMessage.count({ where: { chatId } }),
    ]);
    return {
        messages: rows.map((m) => ({ role: m.role === 'USER' ? 'user' : 'assistant', content: m.content, timestamp: m.createdAt })),
        total,
        page,
        page_size: pageSize,
    };
};

// ---------- chat ----------

const toDataUrl = (a: Attachment) => `data:${a.mimeType};base64,${a.data.toString('base64')}`;

const attachmentPart = (input: TurnInput): ContentPart | null => {
    if (input.file) {
        if (!ALLOWED_FILE_TYPES.includes(input.file.mimeType)) throw new AppError('Only JPG, PNG or PDF files are supported', BAD_REQUEST);
        return input.file.mimeType === 'application/pdf'
            ? { type: 'file', file: { filename: input.file.name, file_data: toDataUrl(input.file) } }
            : { type: 'image_url', image_url: { url: toDataUrl(input.file) } };
    }
    if (input.imageData) {
        // Raw base64 has no type; PNGs start "iVBOR", everything else we accept is treated as JPEG
        const url = input.imageData.startsWith('data:')
            ? input.imageData
            : `data:image/${input.imageData.startsWith('iVBOR') ? 'png' : 'jpeg'};base64,${input.imageData}`;
        if (!/^data:image\/(jpeg|png);base64,/.test(url)) throw new AppError('Only JPG or PNG images are supported', BAD_REQUEST);
        return { type: 'image_url', image_url: { url } };
    }
    return null;
};

const enforceLimits = async (session: AiSession, hasAttachment: boolean) => {
    const l = limits();
    if (!session.userId) {
        const used = await prisma.aiMessage.count({ where: { role: 'USER', chat: { sessionId: session.id } } });
        if (used >= l.anonMessageLimit) throw new AppError('Guest chat limit reached. Please sign in to continue.', TOO_MANY_REQUESTS);
    }
    if (hasAttachment) {
        const analyses = await prisma.aiMessage.count({
            where: { role: 'USER', attachmentName: { not: null }, chat: ownerWhere(session) },
        });
        if (analyses >= l.fileAnalysisLimit) throw new AppError('File analysis limit reached', FORBIDDEN);
    }
};

/**
 * Validates, stores the user's message and starts the model stream. Resolves once the first text has arrived,
 * so provider/config errors surface as normal HTTP errors before any streaming headers are sent.
 */
export const startTurn = async (session: AiSession, input: TurnInput, signal?: AbortSignal) => {
    const l = limits();
    const attachment = attachmentPart(input);
    await enforceLimits(session, !!attachment);

    let chatId = input.chatId;
    let createdChat = false;
    if (chatId) {
        if (!UUID.test(chatId) || !(await prisma.aiChat.findFirst({ where: { id: chatId, ...ownerWhere(session) }, select: { id: true } }))) {
            throw new AppError('Chat not found', NOT_FOUND);
        }
    } else {
        const chat = await prisma.aiChat.create({
            data: { sessionId: session.id, userType: session.userType, userId: session.userId, title: input.prompt.replace(/\s+/g, ' ').slice(0, 60) },
            select: { id: true },
        });
        chatId = chat.id;
        createdChat = true;
    }

    // Most recent turns, oldest first. Read before inserting the new message.
    const history = (
        await prisma.aiMessage.findMany({ where: { chatId }, orderBy: { createdAt: 'desc' }, take: l.contextMessages })
    ).reverse();

    const userMessage = await prisma.aiMessage.create({
        data: { chatId, role: 'USER', content: input.prompt, attachmentName: attachment ? (input.file?.name ?? 'image') : null },
        select: { id: true },
    });

    const isDoctor = session.userType === 'doctor';
    const messages: ChatMessage[] = [
        // The stable prefix: marked cacheable so repeat turns don't pay full price for it
        { role: 'system', content: [{ type: 'text', text: isDoctor ? DOCTOR_SYSTEM_PROMPT : PATIENT_SYSTEM_PROMPT, cache_control: { type: 'ephemeral' } }] },
        ...history.map((m, i): ChatMessage => {
            const text = m.attachmentName ? `${m.content}\n[Attached: ${m.attachmentName}]` : m.content;
            const role = m.role === 'USER' ? 'user' : 'assistant';
            // Second breakpoint at the end of history, so the growing conversation is cached too
            return i === history.length - 1
                ? { role, content: [{ type: 'text', text, cache_control: { type: 'ephemeral' } }] }
                : { role, content: text };
        }),
        { role: 'user', content: attachment ? [{ type: 'text', text: input.prompt }, attachment] : input.prompt },
    ];

    const model = attachment ? modelFor('fileAnalysis') : modelFor(isDoctor ? 'doctorChat' : 'patientChat');
    const isPdf = input.file?.mimeType === 'application/pdf';
    const plugins = isPdf ? [{ id: 'file-parser', pdf: { engine: process.env.AI_PDF_ENGINE || 'pdf-text' } }] : undefined;

    try {
        const it = streamCompletion({ model, messages, maxTokens: l.maxOutputTokens, plugins, signal })[Symbol.asyncIterator]();
        const first = await it.next();
        if (first.done) throw new AppError('The AI returned an empty response', 502);
        async function* stream(): AsyncGenerator<string> {
            yield first.value as string;
            for (let n = await it.next(); !n.done; n = await it.next()) yield n.value;
        }
        return { chatId, stream: stream() };
    } catch (err) {
        // Nothing was answered: don't leave an orphaned question (or empty chat) behind
        await prisma.aiMessage.delete({ where: { id: userMessage.id } }).catch(() => {});
        if (createdChat) await prisma.aiChat.delete({ where: { id: chatId } }).catch(() => {});
        throw err;
    }
};

export const saveAssistantMessage = async (chatId: string, content: string) => {
    await prisma.aiMessage.create({ data: { chatId, role: 'ASSISTANT', content } });
    await prisma.aiChat.update({ where: { id: chatId }, data: { updatedAt: new Date() } });
};

// ---------- lead qualification ----------

/**
 * Scores how well a new lead fits the doctor with the cheap model. Best-effort and background:
 * never throws, and sends no name, phone or email to the provider.
 */
export const qualifyLead = async (leadId: string): Promise<void> => {
    if (!process.env.OPENROUTER_API_KEY) return;
    try {
        const lead = await prisma.lead.findUnique({ where: { id: leadId }, include: { patient: true, doctor: true } });
        if (!lead) return;
        const { patient, doctor } = lead;
        const facts = {
            patient: { age: patient.age, gender: patient.gender, city: patient.city, state: patient.state, issues: patient.issues },
            doctor: { specialty: doctor.specialty, city: doctor.city, state: doctor.state },
        };
        const text = await complete({
            model: modelFor('leadQualification'),
            messages: [
                { role: 'system', content: [{ type: 'text', text: LEAD_QUALIFICATION_PROMPT, cache_control: { type: 'ephemeral' } }] },
                { role: 'user', content: JSON.stringify(facts) },
            ],
            maxTokens: 200,
            json: true,
        });
        const match = text.match(/\{[\s\S]*\}/);
        const parsed = leadQualificationSchema.safeParse(match ? JSON.parse(match[0]) : null);
        if (!parsed.success) throw new Error('unparseable model output');
        await prisma.lead.update({
            where: { id: leadId },
            data: { aiScore: parsed.data.score, aiSummary: parsed.data.summary, aiQualifiedAt: new Date() },
        });
    } catch (err: any) {
        console.error(`[ai] Lead qualification failed for ${leadId}: ${err?.message}`);
    }
};
