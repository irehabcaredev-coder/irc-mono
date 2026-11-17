import { createHmac, randomInt, timingSafeEqual } from 'crypto';
import { jwtSecret } from '../config/secrets';

export const generateOTP = () => randomInt(100000, 1000000).toString();

// Only a keyed hash of the code is stored, so a database leak does not expose live OTPs.
export const hashOtp = (otp: string) => createHmac('sha256', jwtSecret()).update(`otp:${otp}`).digest('hex');

export const otpMatches = (stored: string | null | undefined, candidate: string) => {
    if (!stored) return false;
    const a = Buffer.from(stored);
    const b = Buffer.from(hashOtp(candidate));
    return a.length === b.length && timingSafeEqual(a, b);
};
