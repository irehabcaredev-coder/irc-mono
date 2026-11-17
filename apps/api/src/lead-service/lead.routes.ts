
import { Router, Response } from 'express';
import asyncHandler from '../utils/asyncHandler';
import { AppError } from '../utils/AppError';
import { FORBIDDEN } from '../utils/httpStatusCodes';
import validate from '../middlewares/validateResource';
import { viewProfileSchema } from './lead.schema';
import * as leadService from './lead.service';
import { authenticateJWT, AuthenticatedRequest } from '../middlewares/auth.middleware';

const router = Router();
// local asyncHandler removed

// View Doctor Profile (Generates Lead). The viewer is the signed-in patient: a patient id in the body is never trusted
router.post('/:id/view', authenticateJWT, validate(viewProfileSchema), asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    if (req.user?.type === 'patient') {
        await leadService.registerProfileView(req.params.id as string, req.user.id);
    }
    res.json({ success: true, message: 'View registered' });
}));

router.get('/my-leads', authenticateJWT, asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    // Assuming authenticateJWT populates req.user with { doctorId } if it's a doctor
    if (req.user?.type !== 'doctor') throw new AppError('Forbidden', FORBIDDEN);
    
    const doctorId = req.user.id;
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit as string) || 10));

    const result = await leadService.getLeadsForDoctor(doctorId, page, limit);
    res.json({ success: true, ...result });
}));

export default router;
