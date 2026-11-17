import { randomBytes } from 'crypto';

// After Google sign-in the browser is redirected back to the site. The login token must not ride in that URL
// (it would end up in logs, history and Referer headers), so the redirect carries a one-time code instead and the
// page swaps it for the token with a POST. A code works once and expires after a minute.
// Held in memory: fine for a single API instance; with several, move this to Redis or the database.
const TTL_MS = 60_000;
const codes = new Map<string, { token: string; expiresAt: number }>();

const sweep = () => {
    const now = Date.now();
    for (const [code, v] of codes) if (v.expiresAt <= now) codes.delete(code);
};

export const issueAuthCode = (token: string): string => {
    sweep();
    const code = randomBytes(32).toString('base64url');
    codes.set(code, { token, expiresAt: Date.now() + TTL_MS });
    return code;
};

/** Returns the token once; a second try, or an unknown or expired code, returns null. */
export const redeemAuthCode = (code: unknown): string | null => {
    if (typeof code !== 'string') return null;
    const entry = codes.get(code);
    codes.delete(code);
    return entry && entry.expiresAt > Date.now() ? entry.token : null;
};
