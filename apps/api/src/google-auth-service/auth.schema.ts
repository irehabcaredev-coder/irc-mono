
import { z } from 'zod';

export const loginSchema = z.object({
    body: z.object({
        email: z.string().email(),
        password: z.string().min(1),
    }),
});

export const signupSchema = z.object({
    body: z.object({
        email: z.string().email(),
        password: z.string().min(8).regex(/[A-Z]/, "Must contain uppercase").regex(/[a-z]/, "Must contain lowercase").regex(/[0-9]/, "Must contain number"),
    }),
});

// Patients must tick the privacy notice; the server records when, and which version
export const patientSignupSchema = z.object({
    body: signupSchema.shape.body.extend({
        consent: z.literal(true, { message: 'Please accept the Privacy Policy to continue' }),
    }),
});

export const verifyOtpSchema = z.object({
    body: z.object({
        email: z.string().email(),
        otp: z.string().length(6),
    }),
});

export const forgotPasswordSchema = z.object({
    body: z.object({
        email: z.string().email(),
    }),
});

export const resetPasswordSchema = z.object({
    body: z.object({
        email: z.string().email(),
        otp: z.string().length(6),
        newPassword: z.string().min(8),
    }),
});
