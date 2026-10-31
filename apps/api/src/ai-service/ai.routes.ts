import express, { NextFunction, Request, Response } from 'express';
import multer from 'multer';
import rateLimit from 'express-rate-limit';
import { AiSession } from '@prisma/client';
import asyncHandler from '../utils/asyncHandler';
import { AppError } from '../utils/AppError';
import { BAD_REQUEST, SERVICE_UNAVAILABLE } from '../utils/httpStatusCodes';
import { getOptionalUser } from '../middlewares/optionalAuth';
import * as aiService from './ai.service';
import { ALLOWED_FILE_TYPES, attachmentsEnabled, limits } from './ai.config';
import { chatBodySchema, fileBodySchema, pagingSchema } from './ai.schema';

const router = express.Router();

const limiter = (limit: number) =>
    rateLimit({
        windowMs: 60_000,
        limit,
        standardHeaders: 'draft-7',
        legacyHeaders: false,
        message: { status: 'fail', message: 'Too many requests, please slow down' },
    });

const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: limits().maxFileBytes, files: 1 },
    fileFilter: (_req, file, cb) =>
        ALLOWED_FILE_TYPES.includes(file.mimetype) ? cb(null, true) : cb(new AppError('Only JPG, PNG or PDF files are supported', BAD_REQUEST)),
});

// Looks the session up before anything heavy (such as buffering an upload) happens
const withSession = asyncHandler(async (req, res, next) => {
    res.locals.session = await aiService.requireSession(req.header('x-session-id'));
    next();
});

// Refuses before the upload is buffered, so a switched-off feature costs nothing
const requireAttachments = (_req: Request, _res: Response, next: NextFunction) =>
    attachmentsEnabled()
        ? next()
        : next(new AppError('Image and PDF analysis is not available right now. Please describe it in text.', SERVICE_UNAVAILABLE));

const parse = <T>(schema: { safeParse: (v: unknown) => any }, value: unknown): T => {
    const r = schema.safeParse(value);
    if (!r.success) throw new AppError(r.error.issues[0]?.message ?? 'Invalid request', BAD_REQUEST);
    return r.data;
};

const uploadFile = (req: Request, res: Response, next: NextFunction) =>
    upload.single('file')(req, res, (err: unknown) => {
        if (err instanceof multer.MulterError) {
            return next(new AppError(err.code === 'LIMIT_FILE_SIZE' ? 'File is too large' : err.message, err.code === 'LIMIT_FILE_SIZE' ? 413 : BAD_REQUEST));
        }
        next(err);
    });

/** Streams `stream` to the client, saving the assistant's reply even if the client disconnects part-way. */
const pipeReply = async (
    res: Response,
    chatId: string,
    stream: AsyncGenerator<string>,
    abort: AbortController,
    format: 'sse' | 'text'
) => {
    res.status(200);
    res.setHeader('Content-Type', format === 'sse' ? 'text/event-stream; charset=utf-8' : 'text/plain; charset=utf-8');
    res.setHeader('Cache-Control', 'no-cache, no-transform');
    res.setHeader('X-Accel-Buffering', 'no');
    res.setHeader('X-Chat-Id', chatId);
    res.flushHeaders();
    if (format === 'sse') res.write(`data: ${JSON.stringify({ chat_id: chatId })}\n\n`);

    let full = '';
    try {
        for await (const delta of stream) {
            full += delta;
            res.write(format === 'sse' ? `data: ${JSON.stringify({ content: delta })}\n\n` : delta);
        }
        if (format === 'sse') res.write('data: [DONE]\n\n');
    } catch (err: any) {
        if (!abort.signal.aborted) console.error(`[ai] stream failed: ${err?.message}`);
    } finally {
        if (full) await aiService.saveAssistantMessage(chatId, full).catch((e) => console.error(`[ai] could not save reply: ${e?.message}`));
        res.end();
    }
};

const abortOnDisconnect = (res: Response) => {
    const abort = new AbortController();
    res.on('close', () => { if (!res.writableEnded) abort.abort(); });
    return abort;
};

router.post('/session', limiter(30), asyncHandler(async (req, res) => {
    const sessionId = await aiService.createSession(getOptionalUser(req));
    res.status(201).json({ session_id: sessionId });
}));

router.delete('/session', asyncHandler(async (req, res) => {
    await aiService.deleteSession(req.header('x-session-id'));
    res.json({ success: true });
}));

router.post('/chat', limiter(20), withSession, asyncHandler(async (req, res) => {
    const body = parse<any>(chatBodySchema, req.body);
    if (body.mode === 'image_analysis' && !body.image_data) throw new AppError('image_data is required for image_analysis', BAD_REQUEST);
    const abort = abortOnDisconnect(res);
    const { chatId, stream } = await aiService.startTurn(
        res.locals.session as AiSession,
        { prompt: body.prompt, chatId: body.chat_id, imageData: body.mode === 'image_analysis' ? body.image_data : undefined },
        abort.signal
    );
    await pipeReply(res, chatId, stream, abort, 'sse');
}));

router.post('/chat/file', limiter(10), withSession, requireAttachments, uploadFile, asyncHandler(async (req, res) => {
    if (!req.file) throw new AppError('file is required', BAD_REQUEST);
    const body = parse<any>(fileBodySchema, req.body);
    const abort = abortOnDisconnect(res);
    const { chatId, stream } = await aiService.startTurn(
        res.locals.session as AiSession,
        { prompt: body.prompt, chatId: body.chat_id, file: { name: req.file.originalname, mimeType: req.file.mimetype, data: req.file.buffer } },
        abort.signal
    );
    await pipeReply(res, chatId, stream, abort, 'text');
}));

router.get('/chat-history', withSession, asyncHandler(async (_req, res) => {
    res.json({ chats: await aiService.listChats(res.locals.session) });
}));

router.get('/chat-history/:chatId', withSession, asyncHandler(async (req, res) => {
    const { page, page_size } = parse<{ page: number; page_size: number }>(pagingSchema, req.query);
    res.json(await aiService.getMessages(res.locals.session, req.params.chatId as string, page, page_size));
}));

export default router;
