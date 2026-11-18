
import passport from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import { handleGoogleAuth } from './auth.service';

const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;
const GOOGLE_CALLBACK_URL = process.env.GOOGLE_CALLBACK_URL || 'http://localhost:3000/api/auth/google/callback';

if (GOOGLE_CLIENT_ID && GOOGLE_CLIENT_SECRET) {
    passport.use(new GoogleStrategy({
        clientID: GOOGLE_CLIENT_ID,
        clientSecret: GOOGLE_CLIENT_SECRET,
        callbackURL: GOOGLE_CALLBACK_URL,
        scope: ['profile', 'email'],
        state: true, // random state kept in the session and checked on the callback (CSRF protection)
        passReqToCallback: true 
    }, async (req: any, accessToken, refreshToken, profile, done) => {
        try {
            const oauth = req.session?.oauth;
            if (!oauth) return done(new Error('Sign-in session expired. Please try again.'));
            const userType = oauth.type;
            
            const googleId = profile.id;
            const email = profile.emails?.[0]?.value;
            const name = profile.displayName;

            if (!email) {
                return done(new Error('No email found in Google profile'));
            }
            // Never link or create an account from an email Google has not verified
            if ((profile as any)._json?.email_verified === false) {
                return done(new Error('Your Google email is not verified'));
            }

            // Delegate to service to find/create user
            const result = await handleGoogleAuth(googleId, email, name, userType, { consent: !!oauth.consent });
            
            return done(null, result);

        } catch (error: any) {
            // A new patient who did not accept the Privacy Policy is not an error: send them back to tick it
            if (error?.message?.includes('Privacy Policy')) return done(null, { success: false, reason: 'consent_required' });
            return done(error);
        }
    }));
}

passport.serializeUser((user, done) => {
    done(null, user);
});

passport.deserializeUser((user: any, done) => {
    done(null, user);
});

export default passport;
