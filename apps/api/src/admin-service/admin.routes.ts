import { NextFunction, Request, Response, Router } from 'express';
import rateLimit from 'express-rate-limit';
import { z } from 'zod';
import asyncHandler from '../utils/asyncHandler';
import { AppError } from '../utils/AppError';
import { BAD_REQUEST, FORBIDDEN } from '../utils/httpStatusCodes';
import { authenticateJWT, AuthenticatedRequest } from '../middlewares/auth.middleware';
import * as adminService from './admin.service';

const router = Router();

const loginLimiter = rateLimit({ windowMs: 15 * 60_000, limit: 10, standardHeaders: 'draft-7', legacyHeaders: false, message: { status: 'fail', message: 'Too many attempts. Try again later.' } });

const loginSchema = z.object({ email: z.string().trim().email(), password: z.string().min(1).max(200) });
const reviewSchema = z.object({ note: z.string().trim().max(500).optional() });

const parse = <T>(schema: { safeParse: (v: unknown) => any }, value: unknown): T => {
    const r = schema.safeParse(value);
    if (!r.success) throw new AppError(r.error.issues[0]?.message ?? 'Invalid request', BAD_REQUEST);
    return r.data;
};

// A doctor or patient token must never open admin routes, and a deleted admin loses access immediately
const requireAdmin = (req: AuthenticatedRequest, res: Response, next: NextFunction) =>
    authenticateJWT(req, res, () => {
        if (req.user?.type !== 'admin') return next(new AppError('Forbidden', FORBIDDEN));
        adminService.adminExists(req.user.id).then((ok) => (ok ? next() : next(new AppError('Forbidden', FORBIDDEN)))).catch(next);
    });

router.post('/login', loginLimiter, asyncHandler(async (req: Request, res: Response) => {
    const { email, password } = parse<z.infer<typeof loginSchema>>(loginSchema, req.body);
    res.json({ success: true, data: await adminService.loginAdmin(email, password) });
}));

router.get('/rci-submissions', requireAdmin, asyncHandler(async (req: Request, res: Response) => {
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit as string) || 20));
    res.json({ success: true, ...(await adminService.listCardSubmissions(req.query.status, page, limit)) });
}));

// Streamed with the stored type and never cached; the browser fetches it with the admin token and shows it as a blob
router.get('/rci-submissions/:id/file', requireAdmin, asyncHandler(async (req: Request, res: Response) => {
    const file = await adminService.getCardFile(req.params.id as string);
    res.setHeader('Content-Type', file.mimeType);
    res.setHeader('Content-Disposition', 'inline');
    res.setHeader('Cache-Control', 'private, no-store');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.send(Buffer.from(file.data, 'base64'));
}));

router.post('/rci-submissions/:id/approve', requireAdmin, asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    res.json({ success: true, data: await adminService.reviewCard(req.params.id as string, req.user.email, 'APPROVED') });
}));

router.post('/rci-submissions/:id/reject', requireAdmin, asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { note } = parse<z.infer<typeof reviewSchema>>(reviewSchema, req.body);
    res.json({ success: true, data: await adminService.reviewCard(req.params.id as string, req.user.email, 'REJECTED', note) });
}));

export default router;
