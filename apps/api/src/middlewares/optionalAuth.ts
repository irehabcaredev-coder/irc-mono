import { Request } from 'express';
import jwt from 'jsonwebtoken';
import { isTokenCurrent } from '../utils/tokenCutoff';
import { jwtSecret } from '../config/secrets';
import { isAccountActive } from '../utils/accountStatus';

export type OptionalUser = { id: string; type: 'doctor' | 'patient' } | null;

/**
 * For endpoints open to signed-in users and guests alike: returns the doctor/patient
 * behind a valid JWT, or null. A missing, bad, expired or deleted-account token is treated as a guest.
 */
export const getOptionalUser = async (req: Request): Promise<OptionalUser> => {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) return null;
    try {
        const payload: any = jwt.verify(token, jwtSecret());
        if (!isTokenCurrent(payload) || !payload?.id || (payload.type !== 'doctor' && payload.type !== 'patient')) return null;
        return (await isAccountActive(payload.type, payload.id)) ? { id: payload.id, type: payload.type } : null;
    } catch {
        return null;
    }
};
