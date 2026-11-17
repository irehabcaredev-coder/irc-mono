import { createHmac, randomBytes } from 'crypto';

// Secrets are read lazily so dotenv has run first. Production refuses to start without them; elsewhere a random
// per-process value is used, so there is never a guessable default that could be used to forge tokens.
const PLACEHOLDER = /change-in-production|your-.*secret/i;
const devFallbacks = new Map<string, string>();

const required = (name: string): string => {
    const value = process.env[name];
    if (value && !PLACEHOLDER.test(value)) return value;
    if (process.env.NODE_ENV === 'production') throw new Error(`${name} must be set to a strong random value in production`);
    if (!devFallbacks.has(name)) devFallbacks.set(name, randomBytes(32).toString('hex'));
    return devFallbacks.get(name)!;
};

export const jwtSecret = () => required('JWT_SECRET');
// Meeting tokens use their own derived key, so a meeting token can never double as a login token
export const meetingSecret = () => createHmac('sha256', jwtSecret()).update('meeting-token').digest('hex');
export const sessionSecret = () => required('SESSION_SECRET');

/** Fails fast at boot instead of on the first request that needs a secret. */
export const assertSecretsConfigured = () => {
    jwtSecret();
    sessionSecret();
};
