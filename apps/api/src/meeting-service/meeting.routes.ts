import express, { Request } from 'express';
import jwt from 'jsonwebtoken';
import asyncHandler from '../utils/asyncHandler';
import * as meetingService from './meeting.service';
import { MeetingUser } from './meeting.service';

const router = express.Router();

// Logged-in doctors/patients send their JWT; guests send none. A bad or expired token is treated as a guest.
const optionalUser = (req: Request): MeetingUser => {
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

router.get('/:meetingId', asyncHandler(async (req, res) => {
    const data = await meetingService.getMeetingDetails(req.params.meetingId as string);
    res.json({ success: true, data });
}));

router.post('/:meetingId/token', asyncHandler(async (req, res) => {
    try {
        const data = await meetingService.createMeetingToken(req.params.meetingId as string, optionalUser(req), req.body?.name);
        res.json({ success: true, data });
    } catch (err) {
        if (err instanceof meetingService.MeetingWindowError) {
            return res.status(403).json({
                success: false,
                message: err.message,
                error: err.code,
                data: { scheduledAt: err.scheduledAt, scheduledEnd: err.scheduledEnd },
            });
        }
        throw err;
    }
}));

export default router;
