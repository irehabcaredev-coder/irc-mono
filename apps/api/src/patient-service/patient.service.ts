
import { PrismaClient, Patient, PatientOnboardingStep, Gender } from '@prisma/client';
import prisma from '../config/prisma';
import { presentDoctor } from '../doctor-service/doctorPrivacy';
import bcrypt from 'bcrypt';
import { AppError } from '../utils/AppError';
import { BAD_REQUEST, NOT_FOUND, UNAUTHORIZED, CONFLICT, INTERNAL_SERVER_ERROR } from '../utils/httpStatusCodes';
import * as emailService from '../email-service/email.service';
import { PRIVACY_POLICY_VERSION } from '../config/retention';
import { generateToken } from '../google-auth-service/auth.service';
import { generateOTP, hashOtp, otpMatches } from '../utils/otp';

export const createPatient = async (data: any) => {
    try {
        const { email, password } = data;
        const consent = { privacyConsentAt: new Date(), privacyConsentVersion: PRIVACY_POLICY_VERSION };
        const existingPatient = await prisma.patient.findUnique({ where: { email } });

        if (existingPatient) {
            if (existingPatient.onboardingStep !== PatientOnboardingStep.PERSONAL_INFO_COMPLETE) {
                 const otp = generateOTP();
                 const otpExpiry = new Date(Date.now() + 10 * 60 * 1000);
                 const hashedPassword = await bcrypt.hash(password, 10);
                const updated = await prisma.patient.update({
                    where: { email },
                    data: { password: hashedPassword, otp: hashOtp(otp), otpExpiry, onboardingStep: PatientOnboardingStep.EMAIL_VERIFIED, ...consent }
                });
                await emailService.sendEmail(email, 'Your Verification Code', `<p>Your OTP is ${otp}</p>`);
                return { patient: updated, otp };
            }
            throw new AppError('Email already exists', CONFLICT);
        }

        const otp = generateOTP();
        const otpExpiry = new Date(Date.now() + 10 * 60 * 1000);
        const hashedPassword = await bcrypt.hash(password, 10);

        const patient = await prisma.patient.create({
            data: {
                email,
                password: hashedPassword,
                otp: hashOtp(otp),
                otpExpiry,
                onboardingStep: PatientOnboardingStep.EMAIL_VERIFIED,
                ...consent
            }
        });

        await emailService.sendEmail(email, 'Your Verification Code', `<p>Your OTP is ${otp}</p>`);

        return { patient, otp };
    } catch (error: any) {
        if (error instanceof AppError) throw error;
        throw new AppError('Error creating patient: ' + error.message, INTERNAL_SERVER_ERROR);
    }
};

export const verifyOtp = async (email: string, otp: string) => {
    try {
        const patient = await prisma.patient.findUnique({ where: { email } });
        if (!patient) throw new AppError('Invalid OTP', BAD_REQUEST);
        if (!otpMatches(patient.otp, otp)) throw new AppError('Invalid OTP', BAD_REQUEST);
        if (patient.otpExpiry && new Date() > patient.otpExpiry) throw new AppError('OTP Expired', BAD_REQUEST);

        const updated = await prisma.patient.update({
            where: { email },
            data: { otp: null, otpExpiry: null, onboardingStep: PatientOnboardingStep.PERSONAL_INFO_COMPLETE }
        });

        const token = generateToken(patient.id, patient.email, 'patient');
        return { patient: updated, token };
    } catch (error: any) {
        if (error instanceof AppError) throw error;
        throw new AppError('Error verifying OTP: ' + error.message, INTERNAL_SERVER_ERROR);
    }
};

export const loginPatient = async (data: any) => {
    try {
        const { email, password } = data;
        const patient = await prisma.patient.findUnique({ where: { email } });
        if (!patient || !patient.password) throw new AppError('Invalid credentials', UNAUTHORIZED);

        const isValid = await bcrypt.compare(password, patient.password);
        if (!isValid) throw new AppError('Invalid credentials', UNAUTHORIZED);

        const token = generateToken(patient.id, patient.email, 'patient');
        return { patient, token };
    } catch (error: any) {
        if (error instanceof AppError) throw error;
        throw new AppError('Error logging in: ' + error.message, INTERNAL_SERVER_ERROR);
    }
};


export const updatePatientProfile = async (id: string, data: any) => {
    try {
        return await prisma.patient.update({
            where: { id },
            data
        });
    } catch (error: any) {
        throw new AppError('Error updating patient profile: ' + error.message, INTERNAL_SERVER_ERROR);
    }
};

// What a patient may see of their own record: never the password hash, OTP state or Google id
export const presentPatient = <T extends Record<string, any>>(patient: T) => {
    const { password, otp, otpExpiry, googleId, ...safe } = patient;
    return safe;
};

export const findPatientByEmail = async (email: string) => {
    try {
        return await prisma.patient.findUnique({ where: { email } });
    } catch (error: any) {
        throw new AppError('Error finding patient by email: ' + error.message, INTERNAL_SERVER_ERROR);
    }
};

export const findPatientById = async (id: string) => {
    try {
        return await prisma.patient.findUnique({ where: { id } });
    } catch (error: any) {
        throw new AppError('Error finding patient by ID: ' + error.message, INTERNAL_SERVER_ERROR);
    }
};

export const forgotPassword = async (email: string) => {
    try {
        const patient = await prisma.patient.findUnique({ where: { email } });
        // Same answer whether or not the account exists, so this can't be used to find out who is registered
        if (!patient) return { message: 'If this email is registered, an OTP has been sent.' };

        const otp = generateOTP();
        const otpExpiry = new Date(Date.now() + 10 * 60 * 1000);

        await prisma.patient.update({
            where: { email },
            data: { otp: hashOtp(otp), otpExpiry }
        });

        await emailService.sendEmail(email, 'Reset Password OTP', `<p>Your OTP for password reset is ${otp}</p>`);
        
        return { message: 'If this email is registered, an OTP has been sent.' };
    } catch (error: any) {
        if (error instanceof AppError) throw error;
        throw new AppError('Error initiating password reset: ' + error.message, INTERNAL_SERVER_ERROR);
    }
};

export const verifyResetOtp = async (email: string, otp: string) => {
    try {
        const patient = await prisma.patient.findUnique({ where: { email } });
        if (!patient) throw new AppError('Invalid OTP', BAD_REQUEST);
        if (!otpMatches(patient.otp, otp)) throw new AppError('Invalid OTP', BAD_REQUEST);
        if (patient.otpExpiry && new Date() > patient.otpExpiry) throw new AppError('OTP Expired', BAD_REQUEST);

        return { success: true };
    } catch (error: any) {
        if (error instanceof AppError) throw error;
        throw new AppError('Error verifying reset OTP: ' + error.message, INTERNAL_SERVER_ERROR);
    }
};

export const resetPassword = async (email: string, otp: string, newPassword: string) => {
    try {
        const patient = await prisma.patient.findUnique({ where: { email } });
        if (!patient) throw new AppError('Invalid OTP', BAD_REQUEST);
        if (!otpMatches(patient.otp, otp)) throw new AppError('Invalid OTP', BAD_REQUEST);
        if (patient.otpExpiry && new Date() > patient.otpExpiry) throw new AppError('OTP Expired', BAD_REQUEST);

        const hashedPassword = await bcrypt.hash(newPassword, 10);
        
        await prisma.patient.update({
            where: { email },
            data: { password: hashedPassword, otp: null, otpExpiry: null }
        });

        return { success: true, message: 'Password reset successfully' };
    } catch (error: any) {
        if (error instanceof AppError) throw error;
        throw new AppError('Error resetting password: ' + error.message, INTERNAL_SERVER_ERROR);
    }
};

export const saveDoctor = async (patientId: string, doctorId: string) => {
    try {
        const patient = await prisma.patient.findUnique({ where: { id: patientId } });
        const doctor = await prisma.doctor.findUnique({ where: { id: doctorId } });
        
        if (!patient || !doctor) throw new AppError('Patient or Doctor not found', NOT_FOUND);

        return await prisma.patient.update({
            where: { id: patientId },
            data: {
                savedDoctors: {
                    connect: { id: doctorId }
                }
            }
        });
    } catch (error: any) {
        if (error instanceof AppError) throw error;
        throw new AppError('Error saving doctor: ' + error.message, INTERNAL_SERVER_ERROR);
    }
};

export const unsaveDoctor = async (patientId: string, doctorId: string) => {
    try {
        return await prisma.patient.update({
            where: { id: patientId },
            data: {
                savedDoctors: {
                    disconnect: { id: doctorId }
                }
            }
        });
    } catch (error: any) {
        throw new AppError('Error unsaving doctor: ' + error.message, INTERNAL_SERVER_ERROR);
    }
};

export const getSavedDoctors = async (patientId: string) => {
    try {
        const patient = await prisma.patient.findUnique({
            where: { id: patientId },
            include: {
                savedDoctors: true 
            }
        });
        
        if (!patient) throw new AppError('Patient not found', NOT_FOUND);
        return patient.savedDoctors.map((d) => presentDoctor(d));
    } catch (error: any) {
        if (error instanceof AppError) throw error;
        throw new AppError('Error fetching saved doctors: ' + error.message, INTERNAL_SERVER_ERROR);
    }
};

/**
 * Erases a patient's personal data now. Appointments and payments stay, tied to an anonymous row, for the
 * financial retention period (PAYMENT_RETENTION_YEARS). Everything else is removed immediately, which is inside
 * the OTHER_DATA_RETENTION_DAYS window.
 */
export const deletePatientAccount = async (patientId: string) => {
    const patient = await prisma.patient.findUnique({ where: { id: patientId }, select: { id: true } });
    if (!patient) throw new AppError('Patient not found', NOT_FOUND);

    const upcoming = await prisma.appointment.count({
        where: { patientId, status: { in: ['PENDING', 'CONFIRMED'] }, scheduledEnd: { gt: new Date() } },
    });
    if (upcoming > 0) throw new AppError('You have upcoming appointments. Cancel them before deleting your account.', CONFLICT);

    await prisma.$transaction([
        prisma.lead.deleteMany({ where: { patientId } }),
        prisma.aiChat.deleteMany({ where: { userType: 'patient', userId: patientId } }),
        prisma.aiSession.deleteMany({ where: { userType: 'patient', userId: patientId } }),
        prisma.patient.update({
            where: { id: patientId },
            data: {
                email: `deleted-${patientId}@deleted.invalid`,
                password: null,
                googleId: null,
                name: null,
                phone: null,
                gender: null,
                age: null,
                city: null,
                state: null,
                issues: [],
                otp: null,
                otpExpiry: null,
                privacyConsentAt: null,
                privacyConsentVersion: null,
                shareContactWithDoctors: null,
                shareContactAt: null,
                deletedAt: new Date(),
                savedDoctors: { set: [] },
            },
        }),
    ]);
};
