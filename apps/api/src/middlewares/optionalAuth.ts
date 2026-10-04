import { Request } from 'express';
import jwt from 'jsonwebtoken';

export type OptionalUser = { id: string; type: 'doctor' | 'patient' } | null;

/**
 * For endpoints open to signed-in users and guests alike: returns the doctor/patient
 * behind a valid JWT, or null. A missing, bad or expired token is treated as a guest.
 */
export const getOptionalUser = (req: Request): OptionalUser => {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) return null;
    try {
        const payload: any = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key-change-in-production');
        return payload?.id && (payload.type === 'doctor' || payload.type === 'patient')
            ? { id: payload.id, type: payload.type }
            : null;
    } catch {
        return null;
    }
};
