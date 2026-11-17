import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { isTokenCurrent } from '../utils/tokenCutoff';
import { jwtSecret } from '../config/secrets';
import { isAccountActive } from '../utils/accountStatus';

export interface AuthenticatedRequest extends Request {
    user?: any;
}
export type AuthRequest = AuthenticatedRequest; // Backward compatibility if needed

const reject = (res: Response, status: number, message: string, error: string) =>
    res.status(status).json({ success: false, message, error });

export const authenticateJWT = (req: AuthRequest, res: Response, next: NextFunction) => {
    const authHeader = req.headers.authorization;

    if (!authHeader) {
        return reject(res, 401, 'Authorization token required', 'UNAUTHORIZED');
    }

    const token = authHeader.split(' ')[1]; // Bearer <token>

    jwt.verify(token, jwtSecret(), async (err, user: any) => {
        if (err || !isTokenCurrent(user)) {
            return reject(res, 403, 'Your session has expired. Please sign in again.', 'INVALID_TOKEN');
        }
        try {
            if (!(await isAccountActive(user.type, user.id))) {
                return reject(res, 403, 'This account no longer exists.', 'INVALID_TOKEN');
            }
        } catch (e) {
            return next(e);
        }
        req.user = user;
        next();
    });
};
