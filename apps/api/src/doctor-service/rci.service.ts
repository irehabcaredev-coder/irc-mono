import { Prisma, OnboardingStep } from '@prisma/client';
import prisma from '../config/prisma';
import { AppError } from '../utils/AppError';
import { BAD_REQUEST, CONFLICT, FORBIDDEN, NOT_FOUND } from '../utils/httpStatusCodes';
import { hashRegistrationNo, normalizeRegistrationNo } from '../utils/rciCrypto';
import { hasAcceptedCurrent } from '../agreements/agreement.service';
import { fileMatchesType } from '../ai-service/file-validation';

const REGISTRATION_NO_FORMAT = /^[A-Z0-9/-]{3,20}$/;

// Registration numbers are public-ish and short, so cap guesses per doctor to stop someone walking the register.
const MAX_ATTEMPTS = 10;
const WINDOW_MS = 15 * 60 * 1000;
const attempts = new Map<string, number[]>();

const checkRateLimit = (doctorId: string) => {
    const now = Date.now();
    const recent = (attempts.get(doctorId) || []).filter((t) => now - t < WINDOW_MS);
    if (recent.length >= MAX_ATTEMPTS) {
        throw new AppError('Too many verification attempts. Please try again in a few minutes.', 429);
    }
    recent.push(now);
    attempts.set(doctorId, recent);
};

/**
 * Links a doctor to an RCI registration. The match is strictly 1:1: the doctor side is a single column and the
 * registration side is unique on Doctor.rciRegistrationId, so the database refuses a second account.
 */
export const verifyRegistration = async (doctorId: string, rawRegistrationNo: string) => {
    const registrationNo = normalizeRegistrationNo(rawRegistrationNo || '');
    if (!REGISTRATION_NO_FORMAT.test(registrationNo)) {
        throw new AppError('Enter a valid RCI registration number.', BAD_REQUEST);
    }
    checkRateLimit(doctorId);

    const doctor = await prisma.doctor.findUnique({ where: { id: doctorId }, select: { rciRegistrationId: true } });
    if (!doctor) throw new AppError('Doctor not found', NOT_FOUND);

    const registration = await prisma.rciRegistration.findUnique({
        where: { registrationNoHash: hashRegistrationNo(registrationNo) },
        select: { id: true, isActive: true },
    });
    if (!registration) throw new AppError('This RCI registration number was not found in the RCI register.', NOT_FOUND);
    if (!registration.isActive) throw new AppError('This RCI registration is not active.', FORBIDDEN);

    if (doctor.rciRegistrationId) {
        if (doctor.rciRegistrationId === registration.id) return { verified: true };
        throw new AppError('Your account is already verified with a different RCI registration number.', CONFLICT);
    }

    try {
        await prisma.doctor.update({ where: { id: doctorId }, data: { rciRegistrationId: registration.id } });
    } catch (error) {
        if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
            throw new AppError('This RCI registration number is already linked to another account.', CONFLICT);
        }
        throw error;
    }
    return { verified: true };
};

/** Verified either by a register match or by an admin approving an uploaded card. */
export const isRciVerified = (doctor: { rciRegistrationId?: string | null; rciCardVerifiedAt?: Date | null }) =>
    !!doctor.rciRegistrationId || !!doctor.rciCardVerifiedAt;

export const assertRciVerified = async (doctorId: string) => {
    const doctor = await prisma.doctor.findUnique({ where: { id: doctorId }, select: { rciRegistrationId: true, rciCardVerifiedAt: true } });
    if (!doctor) throw new AppError('Doctor not found', NOT_FOUND);
    if (!isRciVerified(doctor)) throw new AppError('Verify your RCI registration number before continuing.', FORBIDDEN);
};

export const GRACE_MS = 2 * 24 * 60 * 60 * 1000;

const isCompliant = async (doctor: { id: string; rciRegistrationId: string | null; rciCardVerifiedAt?: Date | null }) =>
    isRciVerified(doctor) && (await hasAcceptedCurrent(doctor.id));

/**
 * Doctors who finished onboarding before RCI verification and the provider agreement existed get GRACE_MS from their
 * first login to complete both. One shared deadline, set once and never extended.
 */
export const startComplianceGraceIfNeeded = async (doctor: { id: string; onboardingStep: OnboardingStep; rciRegistrationId: string | null; rciCardVerifiedAt?: Date | null; complianceDeadline: Date | null }) => {
    if (doctor.onboardingStep !== OnboardingStep.COMPLETE || doctor.complianceDeadline || (await isCompliant(doctor))) return;
    await prisma.doctor.updateMany({
        where: { id: doctor.id, complianceDeadline: null },
        data: { complianceDeadline: new Date(Date.now() + GRACE_MS) },
    });
};

/** Blocks a finished doctor who is still missing RCI verification or the agreement once their grace period is over. */
export const assertCompliant = async (doctorId: string) => {
    const doctor = await prisma.doctor.findUnique({
        where: { id: doctorId },
        select: { id: true, onboardingStep: true, rciRegistrationId: true, rciCardVerifiedAt: true, complianceDeadline: true },
    });
    if (!doctor || doctor.onboardingStep !== OnboardingStep.COMPLETE || (await isCompliant(doctor))) return;
    if (doctor.complianceDeadline && doctor.complianceDeadline.getTime() <= Date.now()) {
        throw new AppError('Your deadline has passed. Add your RCI registration number and accept the provider agreement to continue.', FORBIDDEN);
    }
};

// --- RCI card upload, for doctors whose registration is not in the imported register (older cards) ---

export const MAX_CARD_BYTES = 5 * 1024 * 1024;
export const CARD_MIME_TYPES = ['image/jpeg', 'image/png', 'application/pdf'];

export const submitCard = async (doctorId: string, file: { originalname: string; mimetype: string; buffer: Buffer } | undefined, rawRegistrationNo?: string) => {
    if (!file) throw new AppError('Choose a photo or PDF of your RCI card.', BAD_REQUEST);
    if (file.buffer.length > MAX_CARD_BYTES) throw new AppError('The file is too large. The limit is 5 MB.', BAD_REQUEST);
    // The declared type is client-controlled: the bytes must match
    if (!CARD_MIME_TYPES.includes(file.mimetype) || !fileMatchesType(file.mimetype, file.buffer)) {
        throw new AppError('Upload a JPG, PNG or PDF file.', BAD_REQUEST);
    }
    const registrationNo = rawRegistrationNo ? normalizeRegistrationNo(rawRegistrationNo).slice(0, 30) : null;

    const doctor = await prisma.doctor.findUnique({ where: { id: doctorId }, select: { rciRegistrationId: true, rciCardVerifiedAt: true } });
    if (!doctor) throw new AppError('Doctor not found', NOT_FOUND);
    if (isRciVerified(doctor)) throw new AppError('Your RCI registration is already verified.', CONFLICT);

    // One open request per doctor: a new upload replaces a pending one. Reviewed ones stay as a record.
    const [, created] = await prisma.$transaction([
        prisma.rciCardSubmission.deleteMany({ where: { doctorId, status: 'PENDING' } }),
        prisma.rciCardSubmission.create({
            data: {
                doctorId,
                registrationNo,
                fileName: file.originalname.slice(0, 200),
                mimeType: file.mimetype,
                size: file.buffer.length,
                data: file.buffer.toString('base64'),
            },
            select: { id: true, status: true, createdAt: true },
        }),
    ]);
    return created;
};

/** The doctor's latest upload (never the file itself), so the UI can show "under review" or the rejection reason. */
export const getCardStatus = async (doctorId: string) => {
    return prisma.rciCardSubmission.findFirst({
        where: { doctorId },
        orderBy: { createdAt: 'desc' },
        select: { id: true, status: true, reviewNote: true, createdAt: true, reviewedAt: true },
    });
};
