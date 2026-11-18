
import { Router } from 'express';
import passport from 'passport';
import { authLimiter } from '../middlewares/rateLimit';
import { issueAuthCode, redeemAuthCode } from './authCode';

const router = Router();
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5173';
// Doctors live on their own domain; fall back to the main site until DOCTORS_FRONTEND_URL is set
const DOCTORS_FRONTEND_URL = process.env.DOCTORS_FRONTEND_URL || FRONTEND_URL;

// Google OAuth Routes. The account type (and a patient's consent) lives in the server session, and passport's
// `state: true` ties the callback to the browser that started it, so a forged callback is rejected.
declare module 'express-session' {
    interface SessionData { oauth?: { type: 'doctor' | 'patient'; consent: boolean } }
}

const startGoogle = (type: 'doctor' | 'patient') => (req: any, res: any, next: any) => {
    req.session.oauth = { type, consent: type === 'patient' && req.query.consent === 'true' };
    passport.authenticate('google', { scope: ['profile', 'email'] })(req, res, next);
};
router.get('/google/doctor', startGoogle('doctor'));
router.get('/google/patient', startGoogle('patient'));

// Callback
router.get('/google/callback', 
    passport.authenticate('google', { session: false, failureRedirect: `${FRONTEND_URL}/patients?auth_error=google_failed` }),
    (req: any, res) => {
        delete req.session.oauth;
        const result = req.user;
        if (result && result.success) {
            const { token, redirectTo, user } = result;
            const userType = user.specialty ? 'doctor' : 'patient';
            
              const redirectUrl = `${userType === 'doctor' ? DOCTORS_FRONTEND_URL : FRONTEND_URL}${redirectTo}?code=${issueAuthCode(token)}&userType=${userType}&isNewUser=${result.isNewUser}&isReturningIncompleteUser=${result.isReturningIncompleteUser || false}`;
            
            res.redirect(redirectUrl);
        } else {
            res.redirect(`${FRONTEND_URL}/patients?auth_error=${result?.reason || 'google_failed'}`);
        }
    }
);

// The page swaps the one-time code from the redirect for the login token
router.post('/exchange', authLimiter, (req, res) => {
    const token = redeemAuthCode(req.body?.code);
    if (!token) return res.status(400).json({ success: false, message: 'This sign-in link has expired. Please sign in again.' });
    res.setHeader('Cache-Control', 'no-store');
    res.json({ success: true, data: { token } });
});

export default router;
