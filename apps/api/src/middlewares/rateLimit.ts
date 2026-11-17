import rateLimit, { ipKeyGenerator } from 'express-rate-limit';
import { Request } from 'express';

const message = { success: false, status: 'fail', message: 'Too many attempts. Please try again later.' };
const base = { standardHeaders: 'draft-7' as const, legacyHeaders: false, message };

/** Sign-up, login and "forgot password" requests, per IP. */
export const authLimiter = rateLimit({ ...base, windowMs: 15 * 60_000, limit: 20 });

/** OTP checks and password resets: few guesses per email and IP, so a 6-digit code can't be brute-forced. */
export const otpLimiter = rateLimit({
    ...base,
    windowMs: 10 * 60_000,
    limit: 5,
    keyGenerator: (req: Request) => `${ipKeyGenerator(req.ip ?? '')}:${String(req.body?.email ?? '').toLowerCase()}`,
});
