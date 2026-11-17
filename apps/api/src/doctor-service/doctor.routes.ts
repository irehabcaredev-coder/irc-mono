
import { Router } from 'express';
import { getOptionalUser } from '../middlewares/optionalAuth';
import multer from 'multer';
import asyncHandler from '../utils/asyncHandler';
import { AppError } from '../utils/AppError';
import { FORBIDDEN, NOT_FOUND } from '../utils/httpStatusCodes';
import validate from '../middlewares/validateResource';
import { onboardingPersonalInfoSchema, onboardingProfessionalInfoSchema, onboardingAvailabilitySchema, onboardingPaymentInfoSchema } from './doctor.schema';
import * as doctorService from './doctor.service';
import * as rciService from './rci.service';
import { presentDoctor } from './doctorPrivacy';
import { assertAgreementAccepted, hasAcceptedCurrent } from '../agreements/agreement.service';
import { rciVerifySchema } from './doctor.schema';
import * as leadService from '../lead-service/lead.service'; // For lead compatibility
import { signupSchema, loginSchema, verifyOtpSchema, forgotPasswordSchema, resetPasswordSchema } from '../google-auth-service/auth.schema';
import { NextFunction, Request, Response } from 'express';
import { authenticateJWT, AuthenticatedRequest } from '../middlewares/auth.middleware'; // Import Auth Middleware
import { authLimiter, otpLimiter } from '../middlewares/rateLimit';

const router = Router();

// The card is held in memory just long enough to validate and store it
const cardUpload = multer({ storage: multer.memoryStorage(), limits: { fileSize: rciService.MAX_CARD_BYTES, files: 1 } });
const uploadCard = (req: Request, res: Response, next: NextFunction) =>
    cardUpload.single('card')(req, res, (err: unknown) => {
        if (err instanceof multer.MulterError) {
            return next(new AppError(err.code === 'LIMIT_FILE_SIZE' ? 'The file is too large. The limit is 5 MB.' : err.message, 400));
        }
        next(err);
    });

// Profile writes always target the signed-in doctor; an id in the request body is never trusted
const onboardingDoctorId = (req: AuthenticatedRequest): string => {
    if (req.user?.type !== 'doctor') throw new AppError('Forbidden', FORBIDDEN);
    return req.user.doctorId;
};

// Auth Routes for Doctor
router.post('/onboarding/auth', authLimiter, validate(signupSchema), asyncHandler(async (req: Request, res: Response) => {
    const { doctor } = await doctorService.createDoctor(req.body);
    res.status(201).json({ 
        success: true, 
        message: 'Account created successfully.', 
        data: { doctorId: doctor.id } 
    });
}));

router.post('/login', authLimiter, validate(loginSchema), asyncHandler(async (req: Request, res: Response) => {
    const { doctor, token } = await doctorService.loginDoctor(req.body);
    res.json({ 
        success: true, 
        message: 'Login successful',
        data: {
            doctorId: doctor.id,
            token,
            email: doctor.email,
            name: doctor.name,
            onboardingStep: doctor.onboardingStep
        }
    });
}));

router.post('/onboarding/verify-otp', otpLimiter, validate(verifyOtpSchema), asyncHandler(async (req: Request, res: Response) => {
    const { email, otp } = req.body;
    const { doctor, token } = await doctorService.verifyOtp(email, otp);
    res.json({ 
        success: true, 
        message: 'Email verified successfully. You can now proceed with onboarding.',
        data: {
            doctorId: doctor.id,
            token,
            onboardingStep: doctor.onboardingStep
        }
    });
}));


router.post('/onboarding/rci-verify', authenticateJWT, validate(rciVerifySchema), asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    if (req.user?.type !== 'doctor') throw new AppError('Forbidden', FORBIDDEN);
    const result = await rciService.verifyRegistration(req.user.doctorId, req.body.registrationNo);
    res.json({ success: true, data: result });
}));

router.post('/onboarding/rci-card', authenticateJWT, uploadCard, asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    if (req.user?.type !== 'doctor') throw new AppError('Forbidden', FORBIDDEN);
    const registrationNo = typeof req.body?.registrationNo === 'string' ? req.body.registrationNo : undefined;
    const submission = await rciService.submitCard(req.user.doctorId, req.file, registrationNo);
    res.status(201).json({ success: true, data: submission });
}));

router.get('/onboarding/rci-card', authenticateJWT, asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    if (req.user?.type !== 'doctor') throw new AppError('Forbidden', FORBIDDEN);
    res.json({ success: true, data: await rciService.getCardStatus(req.user.doctorId) });
}));

router.post('/onboarding/personal-info', authenticateJWT, validate(onboardingPersonalInfoSchema), asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const doctorId = onboardingDoctorId(req);
    const { doctorId: _ignored, contactConsent: _consent, ...data } = req.body;
    await rciService.assertRciVerified(doctorId);
    const updated = await doctorService.updateDoctorProfile(doctorId, { ...data, contactConsentAt: new Date(), onboardingStep: 'PROFESSIONAL_INFO_COMPLETE' }); 
    res.json({ success: true, data: updated });
}));

router.post('/onboarding/professional-info', authenticateJWT, validate(onboardingProfessionalInfoSchema), asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const doctorId = onboardingDoctorId(req);
    const { doctorId: _ignored, ...data } = req.body;
    await rciService.assertRciVerified(doctorId);
    await assertAgreementAccepted(doctorId);
    const updated = await doctorService.updateDoctorProfile(doctorId, { ...data, onboardingStep: 'AVAILABILITY_COMPLETE' }); 
    res.json({ success: true, data: updated });
}));

router.post('/onboarding/availability', authenticateJWT, validate(onboardingAvailabilitySchema), asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const doctorId = onboardingDoctorId(req);
    const { doctorId: _ignored, ...data } = req.body;
    await rciService.assertRciVerified(doctorId);
    await assertAgreementAccepted(doctorId);
    const updated = await doctorService.updateDoctorProfile(doctorId, { ...data, onboardingStep: 'PAYMENT_INFO_COMPLETE' }); 
    res.json({ success: true, data: updated });
}));

router.post('/onboarding/payment-info', authenticateJWT, validate(onboardingPaymentInfoSchema), asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const doctorId = onboardingDoctorId(req);
    const { doctorId: _ignored, consultationFee, ...bankData } = req.body;
    await rciService.assertRciVerified(doctorId);
    await assertAgreementAccepted(doctorId);
    const doctor = await doctorService.findDoctorById(doctorId);
    if (!doctor) throw new AppError('Doctor not found', NOT_FOUND);

    // Payout details are optional for now; without them no Razorpay linked account is created
    const { bankAccountNumber, bankIfsc, bankBeneficiaryName } = bankData;
    let payout: Record<string, any> = {};
    if (bankAccountNumber && bankIfsc && bankBeneficiaryName) {
        const { createLinkedAccount } = require('../payment-service/razorpay.service');
        const razorpayAccount = await createLinkedAccount({
            email: doctor.email,
            name: doctor.name || bankBeneficiaryName,
            phone: doctor.contactNumber || '', // Use contactNumber as phone
            bankAccountNumber,
            bankIfsc,
            bankBeneficiaryName
        });
        payout = { bankAccountNumber, bankIfsc, bankBeneficiaryName, razorpayAccountId: razorpayAccount.id };
    }

    const updated = await doctorService.updateDoctorProfile(doctorId, { 
        ...payout,
        consultationFee: consultationFee * 100, // Convert to paise
        onboardingStep: 'COMPLETE' 
    }); 
    res.json({ success: true, data: updated });
}));

// Auth Routes - Password Reset
router.post('/forgot-password', authLimiter, validate(forgotPasswordSchema), asyncHandler(async (req: Request, res: Response) => {
    const result = await doctorService.forgotPassword(req.body.email);
    res.json({ ...result });
}));

router.post('/verify-reset-otp', otpLimiter, validate(verifyOtpSchema), asyncHandler(async (req: Request, res: Response) => {
    const { email, otp } = req.body;
    const result = await doctorService.verifyResetOtp(email, otp);
    res.json({ success: true, data: result });
}));

router.post('/reset-password', otpLimiter, validate(resetPasswordSchema), asyncHandler(async (req: Request, res: Response) => {
    const { email, otp, newPassword } = req.body;
    const result = await doctorService.resetPassword(email, otp, newPassword);
    res.json({ ...result });
}));

const VALID_DOCTOR_SORT_OPTIONS = ['experience_desc', 'experience_asc'];

router.get('/', asyncHandler(async (req: Request, res: Response) => {
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit as string) || 10));
    const specialty = req.query.specialty as string | undefined;
    const sortByParam = req.query.sortBy as string | undefined;
    const sortBy = VALID_DOCTOR_SORT_OPTIONS.includes(sortByParam || '') ? sortByParam : undefined;
    const search = typeof req.query.search === 'string' ? req.query.search : undefined;
    const language = typeof req.query.lang === 'string' && req.query.lang.trim() ? req.query.lang.trim() : undefined;
    const viewer = await getOptionalUser(req);
    const result = await doctorService.getAllDoctors(page, limit, specialty, sortBy, search, req.query.verified === 'true', {
        language,
        savedOnly: req.query.saved === 'true',
        patientId: viewer?.type === 'patient' ? viewer.id : null,
    });
    res.json({ success: true, ...result });
}));
// Older doctors accept from their dashboard that their contact numbers are shown publicly
router.post('/me/contact-consent', authenticateJWT, asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const updated = await doctorService.updateDoctorProfile(onboardingDoctorId(req), { contactConsentAt: new Date() });
    res.json({ success: true, data: { contactConsentAt: updated.contactConsentAt } });
}));

// Account deletion: personal data is erased now; payment records are kept for the legal retention period
router.delete('/me', authenticateJWT, asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    await doctorService.deleteDoctorAccount(onboardingDoctorId(req));
    res.json({ success: true, message: 'Your account and personal data have been deleted.' });
}));

router.get('/:id/leads', authenticateJWT, asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
     if (req.user?.type !== 'doctor' || req.user.doctorId !== req.params.id) throw new AppError('Forbidden', FORBIDDEN);
     await rciService.assertCompliant(req.user.doctorId);
     const page = parseInt(req.query.page as string) || 1;
     const limit = parseInt(req.query.limit as string) || 10;
     const result = await leadService.getLeadsForDoctor(req.params.id as string, page, limit);
     res.json({ success: true, ...result });
}));

router.get('/:id',authenticateJWT, asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const doctor = await doctorService.findDoctorById(req.params.id as string);
    if (!doctor) throw new AppError('Doctor not found', NOT_FOUND);
    const viewerDoctorId = req.user?.type === 'doctor' ? req.user.doctorId : null;
    if (viewerDoctorId === doctor.id) await rciService.startComplianceGraceIfNeeded(doctor);
    const current = viewerDoctorId === doctor.id ? (await doctorService.findDoctorById(doctor.id)) || doctor : doctor;
    const data: Record<string, any> = presentDoctor(current, viewerDoctorId);
    if (viewerDoctorId === doctor.id) data.agreementAccepted = await hasAcceptedCurrent(doctor.id);
    res.json({ success: true, data });
}));

router.post('/:id/view', authenticateJWT, asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    // The viewer is whoever the token says: a patient id from the body is never trusted
    if (req.user?.type === 'patient') {
        await leadService.registerProfileView(req.params.id as string, req.user.id);
    }
    res.json({ success: true, message: 'View registered' });
}));

export default router;
