import { z } from 'zod';
import { limits } from './ai.config';

export const chatBodySchema = z.object({
    prompt: z.string().trim().min(1, 'prompt is required').max(limits().maxPromptChars, 'prompt is too long'),
    mode: z.enum(['chat', 'image_analysis']).default('chat'),
    chat_id: z.string().uuid().optional(),
    // base64 or data URL; the cap keeps a single request bounded (base64 is ~4/3 of the bytes)
    image_data: z.string().max(Math.ceil(limits().maxFileBytes * 1.4) + 200).optional(),
});

export const fileBodySchema = z.object({
    prompt: z.string().trim().min(1, 'prompt is required').max(limits().maxPromptChars, 'prompt is too long'),
    chat_id: z.string().uuid().optional(),
});

export const pagingSchema = z.object({
    page: z.coerce.number().int().min(1).default(1),
    page_size: z.coerce.number().int().min(1).max(100).default(50),
});

export const leadQualificationSchema = z.object({
    score: z.coerce.number().int().min(1).max(10),
    summary: z.string().trim().min(1).max(500),
});
