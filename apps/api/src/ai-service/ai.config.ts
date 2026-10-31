// All AI settings in one place. Values are read lazily so dotenv has run before they are used.
// Models are Z.ai GLM ids (GET https://api.z.ai/api/paas/v4/models lists what the key can use); override per task with AI_MODEL_*.

// glm-4.5-air (~$0.20/$1.10 per M tokens, ~1.3s on a short turn) runs everything: it handles parallel requests
// reliably, unlike the free glm-4.7-flash (throttles with 429s). For better answers set AI_MODEL_* to glm-5.1
// (~$1.40/$4.40 per M tokens).
const CHEAP = 'glm-4.5-air';
const STRONG = 'glm-4.5-air';

/** A request that gets a 429/5xx is retried once on this model. Equal to the main model by default, i.e. no retry. */
export const fallbackModel = (): string => process.env.AI_MODEL_FALLBACK || '';

/** Task -> model. Cheap/fast for background extraction, stronger for anything a person reads and relies on. */
export const modelFor = (task: 'leadQualification' | 'doctorChat' | 'patientChat' | 'fileAnalysis'): string => {
    switch (task) {
        case 'leadQualification': return process.env.AI_MODEL_LEAD || CHEAP;
        case 'doctorChat': return process.env.AI_MODEL_DOCTOR_CHAT || STRONG;
        case 'patientChat': return process.env.AI_MODEL_PATIENT_CHAT || STRONG;
        case 'fileAnalysis': return process.env.AI_MODEL_FILE || STRONG;
    }
};

const int = (v: string | undefined, fallback: number) => {
    const n = parseInt(v ?? '', 10);
    return Number.isFinite(n) && n > 0 ? n : fallback;
};

/**
 * Image and PDF analysis is switched off: the text-only GLM models can't read them. The upload code is kept;
 * set AI_ATTACHMENTS_ENABLED=true (with a vision-capable model in AI_MODEL_FILE) to bring it back.
 */
export const attachmentsEnabled = () => process.env.AI_ATTACHMENTS_ENABLED === 'true';

export const limits = () => ({
    maxPromptChars: 10_000,
    contextMessages: 30,
    maxOutputTokens: int(process.env.AI_MAX_OUTPUT_TOKENS, 2048),
    // Cost guards: guests get a small allowance; analyses of images/PDFs are capped per user (or per guest session)
    anonMessageLimit: int(process.env.AI_ANON_MESSAGE_LIMIT, 20),
    fileAnalysisLimit: int(process.env.AI_FILE_LIMIT, 100),
    maxFileBytes: int(process.env.AI_MAX_FILE_BYTES, 5 * 1024 * 1024),
});

export const ALLOWED_FILE_TYPES = ['image/jpeg', 'image/png', 'application/pdf'];
