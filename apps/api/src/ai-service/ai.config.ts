// All AI settings in one place. Values are read lazily so dotenv has run before they are used.
// Verify model ids at https://openrouter.ai/models; override per task with the AI_MODEL_* env vars.

const CHEAP = 'anthropic/claude-haiku-4.5';
const STRONG = 'anthropic/claude-sonnet-4.5';

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
