import dotenv from 'dotenv';
dotenv.config();

import http from 'http';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { assertSecretsConfigured, sessionSecret } from './config/secrets';
import session from 'express-session';
import passport from 'passport';
import authRoutes from './google-auth-service/auth.routes';
import doctorRoutes from './doctor-service/doctor.routes';
import adminRoutes from './admin-service/admin.routes';
import agreementRoutes from './agreements/agreement.routes';
import patientRoutes from './patient-service/patient.routes';
import cityRoutes from './city-service/city.routes';
import countryRoutes from './country-service/country.routes';
import leadRoutes from './lead-service/lead.routes';
import './google-auth-service/google.auth';
import globalErrorHandler from './middlewares/globalErrorHandler';
import { AppError } from './utils/AppError';
import appointmentRoutes from './appointment-service/appointment.routes';
import paymentRoutes from './payment-service/payment.routes';
import meetingRoutes from './meeting-service/meeting.routes';
import aiRoutes from './ai-service/ai.routes';
import aiAdminRoutes from './ai-service/ai.admin.routes';
import { setupSignalingServer } from './meeting-service/signaling.server';

// Refuse to boot in production without real secrets
assertSecretsConfigured();

const app = express();
const PORT = process.env.PORT || 5000;

// Behind Caddy: trust X-Forwarded-* so secure session cookies work over TLS
app.set('trust proxy', 1);

app.use(helmet());

// Session: only holds the short-lived Google sign-in state
app.use(session({
    secret: sessionSecret(),
    resave: false,
    saveUninitialized: false,
    cookie: {
        httpOnly: true,
        sameSite: 'lax', // the Google callback is a top-level GET, which Lax still allows
        secure: process.env.NODE_ENV === 'production', // Use secure cookies in production
        maxAge: 15 * 60 * 1000 // 15 minutes: enough to finish signing in
    }
}));

app.use(passport.initialize());

// CORS: only our own sites may call the API with credentials. Add more with CORS_ORIGINS (comma separated).
const allowedOrigins = new Set(
    [process.env.FRONTEND_URL, process.env.DOCTORS_FRONTEND_URL, ...(process.env.CORS_ORIGINS || '').split(',')]
        .map((o) => (o || '').trim().replace(/\/$/, ''))
        .filter(Boolean)
);
const isLocalOrigin = (origin: string) => /^https?:\/\/(localhost|127\.0\.0\.1|[a-z0-9-]+\.localhost)(:\d+)?$/.test(origin);
app.use(cors({
    // No Origin header = not a browser (curl, server to server): allowed. Browsers must come from an allowed site.
    origin: (origin, callback) => callback(null, !origin || allowedOrigins.has(origin) || (process.env.NODE_ENV !== 'production' && isLocalOrigin(origin))),
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'x-session-id', 'patient_token', 'doctor_token'],
    exposedHeaders: ['X-Chat-Id']
}));

// Image chat sends base64 in the JSON body, so /ai gets a larger limit (mounted first; the default parser then skips it)
app.use('/ai', express.json({ limit: '8mb' }));
app.use(express.json());

// Routes
app.use('/auth', authRoutes);
app.use('/doctors', doctorRoutes);
app.use('/admin', adminRoutes);
app.use('/agreements', agreementRoutes);
app.use('/patients', patientRoutes);
app.use('/cities', cityRoutes);
app.use('/countries', countryRoutes);
app.use('/leads', leadRoutes);
app.use('/appointments', appointmentRoutes);
app.use('/payments', paymentRoutes);
app.use('/meetings', meetingRoutes);
app.use('/ai/admin', aiAdminRoutes);
app.use('/ai', aiRoutes);

app.get('/', (req, res) => {
    res.send('ECare+ API is running');
});

// Handle undefined routes
app.all(/.*/, (req, res, next) => {
    next(new AppError(`Can't find ${req.originalUrl} on this server!`, 404));
});

// Global Error Handler
app.use(globalErrorHandler);

const server = http.createServer(app);
setupSignalingServer(server);

server.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
