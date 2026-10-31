import { Prisma, OnboardingStep } from '@prisma/client';
import prisma from '../config/prisma';
import { AppError } from '../utils/AppError';
import { BAD_REQUEST, CONFLICT, FORBIDDEN, NOT_FOUND } from '../utils/httpStatusCodes';
import { hashRegistrationNo, normalizeRegistrationNo } from '../utils/rciCrypto';

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

export const assertRciVerified = async (doctorId: string) => {
    const doctor = await prisma.doctor.findUnique({ where: { id: doctorId }, select: { rciRegistrationId: true } });
    if (!doctor) throw new AppError('Doctor not found', NOT_FOUND);
    if (!doctor.rciRegistrationId) throw new AppError('Verify your RCI registration number before continuing.', FORBIDDEN);
};

export const RCI_GRACE_MS = 2 * 24 * 60 * 60 * 1000;

/**
 * Doctors who finished onboarding before RCI verification existed get RCI_GRACE_MS from their first login to
 * add it. The deadline is set once and never extended.
 */
export const startRciGraceIfNeeded = async (doctor: { id: string; onboardingStep: OnboardingStep; rciRegistrationId: string | null; rciDeadline: Date | null }) => {
    if (doctor.onboardingStep !== OnboardingStep.COMPLETE || doctor.rciRegistrationId || doctor.rciDeadline) return;
    await prisma.doctor.updateMany({
        where: { id: doctor.id, rciDeadline: null, rciRegistrationId: null },
        data: { rciDeadline: new Date(Date.now() + RCI_GRACE_MS) },
    });
};

/** Blocks a finished doctor who still has no RCI verification once their grace period is over. */
export const assertRciCompliant = async (doctorId: string) => {
    const doctor = await prisma.doctor.findUnique({
        where: { id: doctorId },
        select: { onboardingStep: true, rciRegistrationId: true, rciDeadline: true },
    });
    if (!doctor || doctor.rciRegistrationId || doctor.onboardingStep !== OnboardingStep.COMPLETE) return;
    if (doctor.rciDeadline && doctor.rciDeadline.getTime() <= Date.now()) {
        throw new AppError('Your RCI verification deadline has passed. Add your RCI registration number to continue.', FORBIDDEN);
    }
};
