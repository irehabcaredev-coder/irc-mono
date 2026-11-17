
import { z } from 'zod';
import { SUPPORTED_COUNTRY_CODES } from '../country-service/country.codes';
import { isValidInternationalPhone, PHONE_ERROR } from '../utils/phone';
import { Gender } from '@prisma/client';

export const patientPersonalInfoSchema = z.object({
    body: z.object({
        patientId: z.string().uuid(),
        name: z.string().min(2),
        phone: z.string().refine(isValidInternationalPhone, PHONE_ERROR),
        gender: z.nativeEnum(Gender),
        age: z.number().min(18, 'You must be 18 or older. Book for a child through your own account.').max(120),
        city: z.string().min(2),
        state: z.string().min(2).optional(),
        country: z.enum(SUPPORTED_COUNTRY_CODES).optional(),
        issues: z.array(z.string()).optional(),
        // Explicit choice: may doctors whose profile I view see my name, phone and health concerns?
        shareContactWithDoctors: z.boolean().optional(),
    }),
});

export const patientPreferencesSchema = z.object({
    body: z.object({
        shareContactWithDoctors: z.boolean(),
    }),
});
