
import { Router, Request, Response } from 'express';
import asyncHandler from '../utils/asyncHandler';
import { AppError } from '../utils/AppError';
import validate from '../middlewares/validateResource';
import { patientPersonalInfoSchema, patientPreferencesSchema } from './patient.schema';
import * as patientService from './patient.service';
import { patientSignupSchema, loginSchema, verifyOtpSchema, forgotPasswordSchema, resetPasswordSchema } from '../google-auth-service/auth.schema';
import { authenticateJWT, AuthenticatedRequest } from '../middlewares/auth.middleware';
import { authLimiter, otpLimiter } from '../middlewares/rateLimit';
import { FORBIDDEN, NOT_FOUND } from '../utils/httpStatusCodes';

const router = Router();

router.post('/onboarding/auth', authLimiter, validate(patientSignupSchema), asyncHandler(async (req: Request, res: Response) => {
    const { patient } = await patientService.createPatient(req.body);
    res.status(201).json({ 
        success: true, 
        message: 'Account created successfully.', 
        data: { patientId: patient.id } 
    });
}));

router.post('/login', authLimiter, validate(loginSchema), asyncHandler(async (req: Request, res: Response) => {
    const { patient, token } = await patientService.loginPatient(req.body);
    res.json({ 
        success: true, 
        message: 'Login successful',
        data: {
            patientId: patient.id,
            token,
            email: patient.email,
            name: patient.name,
            onboardingStep: patient.onboardingStep
        }
    });
}));

router.post('/onboarding/verify-otp', otpLimiter, validate(verifyOtpSchema), asyncHandler(async (req: Request, res: Response) => {
    const { email, otp } = req.body;
    const { patient, token } = await patientService.verifyOtp(email, otp);
    res.json({ 
        success: true, 
        message: 'Email verified successfully. You can now proceed with onboarding.',
        data: {
            patientId: patient.id,
            token,
            onboardingStep: patient.onboardingStep
        }
    });
}));


// Profile writes always target the signed-in patient; an id in the request body is never trusted
const requirePatient = (req: AuthenticatedRequest): string => {
    if (req.user?.type !== 'patient') throw new AppError('Forbidden', FORBIDDEN);
    return req.user.id;
};

router.post('/onboarding/personal-info', authenticateJWT, validate(patientPersonalInfoSchema), asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const patientId = requirePatient(req);
    const { patientId: _ignored, ...data } = req.body;
    const updated = await patientService.updatePatientProfile(patientId, {
        ...data,
        ...(typeof data.shareContactWithDoctors === 'boolean' ? { shareContactAt: new Date() } : {}),
        onboardingStep: 'PERSONAL_INFO_COMPLETE',
    });
    res.json({ success: true, data: patientService.presentPatient(updated) });
}));

// Auth Routes - Password Reset
router.post('/forgot-password', authLimiter, validate(forgotPasswordSchema), asyncHandler(async (req: Request, res: Response) => {
    const result = await patientService.forgotPassword(req.body.email);
    res.json({ ...result });
}));

router.post('/verify-reset-otp', otpLimiter, validate(verifyOtpSchema), asyncHandler(async (req: Request, res: Response) => {
    const { email, otp } = req.body;
    const result = await patientService.verifyResetOtp(email, otp);
    res.json({ success: true, data: result });
}));

router.post('/reset-password', otpLimiter, validate(resetPasswordSchema), asyncHandler(async (req: Request, res: Response) => {
    const { email, otp, newPassword } = req.body;
    const result = await patientService.resetPassword(email, otp, newPassword);
    res.json({ ...result });
}));

// The patient's own choice about what doctors may see; can be changed at any time
router.patch('/me/preferences', authenticateJWT, validate(patientPreferencesSchema), asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const updated = await patientService.updatePatientProfile(requirePatient(req), {
        shareContactWithDoctors: req.body.shareContactWithDoctors,
        shareContactAt: new Date(),
    });
    res.json({ success: true, data: patientService.presentPatient(updated) });
}));

// Account deletion: personal data is erased now; payment records are kept for the legal retention period
router.delete('/me', authenticateJWT, asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    await patientService.deletePatientAccount(requirePatient(req));
    res.json({ success: true, message: 'Your account and personal data have been deleted.' });
}));

// Saved Doctors
router.post('/saved-doctors', authenticateJWT, asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const result = await patientService.saveDoctor(requirePatient(req), req.body.doctorId);
    res.json({ success: true, data: result });
}));

router.delete('/saved-doctors', authenticateJWT, asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const result = await patientService.unsaveDoctor(requirePatient(req), req.body.doctorId);
    res.json({ success: true, data: result });
}));

router.get('/:patientId/saved-doctors', authenticateJWT, asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    if (requirePatient(req) !== req.params.patientId) throw new AppError('Forbidden', FORBIDDEN);
    const result = await patientService.getSavedDoctors(req.params.patientId as string);
    res.json({ success: true, data: result });
}));

// A patient can read only their own record
router.get('/:id', authenticateJWT, asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    if (requirePatient(req) !== req.params.id) throw new AppError('Forbidden', FORBIDDEN);
    const patient = await patientService.findPatientById(req.params.id as string);
    if (!patient) throw new AppError('Patient not found', NOT_FOUND);
    res.json({ success: true, data: patientService.presentPatient(patient) });
}));

export default router;
