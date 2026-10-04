import express, { NextFunction, Request, Response } from 'express';
import rateLimit from 'express-rate-limit';
import { timingSafeEqual } from 'crypto';
import { z } from 'zod';
import asyncHandler from '../utils/asyncHandler';
import { AppError } from '../utils/AppError';
import { BAD_REQUEST, FORBIDDEN, NOT_FOUND, SERVICE_UNAVAILABLE } from '../utils/httpStatusCodes';
import * as prompts from './prompt.service';

// Admin API for the two master prompts. Protected by ADMIN_API_TOKEN (header: x-admin-token);
// with no token configured the whole API is switched off.
const router = express.Router();

router.use(rateLimit({ windowMs: 60_000, limit: 20, standardHeaders: 'draft-7', legacyHeaders: false, message: { status: 'fail', message: 'Too many requests' } }));

const requireAdmin = (req: Request, _res: Response, next: NextFunction) => {
    const expected = process.env.ADMIN_API_TOKEN;
    if (!expected) return next(new AppError('Admin API is not enabled', SERVICE_UNAVAILABLE));
    const given = String(req.header('x-admin-token') ?? '');
    const a = Buffer.from(given);
    const b = Buffer.from(expected);
    // Constant-time comparison; lengths must match first or timingSafeEqual throws
    if (a.length !== b.length || !timingSafeEqual(a, b)) return next(new AppError('Invalid admin token', FORBIDDEN));
    next();
};
router.use(requireAdmin);

const roleOf = (raw: string | undefined): prompts.PromptRole => {
    if (raw === 'doctor' || raw === 'patient') return raw;
    throw new AppError('Role must be "doctor" or "patient"', NOT_FOUND);
};

const bodySchema = z.object({
    content: z.string().trim().min(100, 'A master prompt should be at least 100 characters').max(20_000, 'Prompt is too long (max 20,000 characters)'),
});

const audit = (req: Request, action: string, role: string, extra = '') =>
    console.log(`[ai-admin] ${action} ${role} prompt${extra} from ${req.ip}`);

router.get('/prompts', asyncHandler(async (_req, res) => {
    res.json({ prompts: await prompts.describePrompts() });
}));

router.put('/prompts/:role', asyncHandler(async (req, res) => {
    const role = roleOf(req.params.role as string);
    const parsed = bodySchema.safeParse(req.body);
    if (!parsed.success) throw new AppError(parsed.error.issues[0]?.message ?? 'Invalid request', BAD_REQUEST);
    await prompts.setMasterPrompt(role, parsed.data.content);
    audit(req, 'updated', role, ` (${parsed.data.content.length} chars)`);
    res.json({ success: true, role });
}));

router.delete('/prompts/:role', asyncHandler(async (req, res) => {
    const role = roleOf(req.params.role as string);
    await prompts.resetMasterPrompt(role);
    audit(req, 'reset to default', role);
    res.json({ success: true, role });
}));

export default router;
