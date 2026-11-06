
import { z } from 'zod';
import { isValidInternationalPhone, PHONE_ERROR } from '../utils/phone';
import { Gender } from '@prisma/client';

export const patientPersonalInfoSchema = z.object({
    body: z.object({
        patientId: z.string().uuid(),
        name: z.string().min(2),
        phone: z.string().refine(isValidInternationalPhone, PHONE_ERROR),
        gender: z.nativeEnum(Gender),
        age: z.number().min(1).max(120),
        city: z.string().min(2),
        state: z.string().min(2).optional(),
        issues: z.array(z.string()).optional(),
    }),
});
