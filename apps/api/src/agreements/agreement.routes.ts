import { Router, Response } from 'express';
import { z } from 'zod';
import asyncHandler from '../utils/asyncHandler';
import { AppError } from '../utils/AppError';
import { FORBIDDEN } from '../utils/httpStatusCodes';
import validate from '../middlewares/validateResource';
import { authenticateJWT, AuthenticatedRequest } from '../middlewares/auth.middleware';
import * as agreementService from './agreement.service';

const router = Router();

// Public: the agreement has to be readable before anyone signs up, and on its own page.
router.get('/provider', asyncHandler(async (_req, res: Response) => {
    res.json({ success: true, data: agreementService.presentAgreement(await agreementService.getCurrentAgreement()) });
}));

const acceptSchema = z.object({
    body: z.object({
        version: z.string().min(1),
        contentHash: z.string().length(64),
        attestations: z.array(z.boolean()).min(1).max(20),
        signatureName: z.string().trim().min(2).max(120),
    }),
});

// The signed-in doctor's own acceptance status and receipt
router.get('/provider/status', authenticateJWT, asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    if (req.user?.type !== 'doctor') throw new AppError('Forbidden', FORBIDDEN);
    res.json({ success: true, data: { accepted: await agreementService.hasAcceptedCurrent(req.user.doctorId) } });
}));

router.post('/provider/accept', authenticateJWT, validate(acceptSchema), asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    if (req.user?.type !== 'doctor') throw new AppError('Forbidden', FORBIDDEN);
    const result = await agreementService.acceptAgreement(req.user.doctorId, req.body, {
        ipAddress: req.ip,
        userAgent: req.header('user-agent'),
    });
    res.status(201).json({ success: true, data: result });
}));

export default router;
