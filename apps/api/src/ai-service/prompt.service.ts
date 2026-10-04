import { AiPromptRole } from '@prisma/client';
import prisma from '../config/prisma';
import { DOCTOR_MASTER_PROMPT } from './prompts/doctor';
import { PATIENT_MASTER_PROMPT } from './prompts/patient';

export type PromptRole = 'doctor' | 'patient';

const DEFAULTS: Record<PromptRole, string> = { doctor: DOCTOR_MASTER_PROMPT, patient: PATIENT_MASTER_PROMPT };
const toDb = (role: PromptRole): AiPromptRole => (role === 'doctor' ? AiPromptRole.DOCTOR : AiPromptRole.PATIENT);

// Chat reads the prompt on every turn, so keep it in memory briefly instead of hitting the database each time.
// Writes through this process update the cache immediately; other instances catch up within the TTL.
const TTL_MS = 60_000;
const cache = new Map<PromptRole, { text: string; at: number }>();

/** The master prompt for this audience: the admin override if one exists, otherwise the built-in default. */
export const getMasterPrompt = async (role: PromptRole): Promise<string> => {
    const hit = cache.get(role);
    if (hit && Date.now() - hit.at < TTL_MS) return hit.text;

    let text = DEFAULTS[role];
    try {
        const row = await prisma.aiPrompt.findUnique({ where: { role: toDb(role) } });
        if (row) text = row.content;
    } catch (err: any) {
        // Chat must keep working if the lookup fails; fall back to the default and retry next turn
        console.error(`[ai] Could not load ${role} prompt override: ${err?.message}`);
        return text;
    }
    cache.set(role, { text, at: Date.now() });
    return text;
};

export const setMasterPrompt = async (role: PromptRole, content: string) => {
    await prisma.aiPrompt.upsert({
        where: { role: toDb(role) },
        create: { role: toDb(role), content },
        update: { content },
    });
    cache.set(role, { text: content, at: Date.now() });
};

/** Delete the override so the built-in default applies again. */
export const resetMasterPrompt = async (role: PromptRole) => {
    await prisma.aiPrompt.deleteMany({ where: { role: toDb(role) } });
    cache.set(role, { text: DEFAULTS[role], at: Date.now() });
};

export const describePrompts = async () => {
    const rows = await prisma.aiPrompt.findMany();
    return (['doctor', 'patient'] as PromptRole[]).map((role) => {
        const row = rows.find((r) => r.role === toDb(role));
        return {
            role,
            overridden: !!row,
            updated_at: row?.updatedAt ?? null,
            content: row?.content ?? DEFAULTS[role],
        };
    });
};
