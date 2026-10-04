import express from 'express';
import asyncHandler from '../utils/asyncHandler';
import * as meetingService from './meeting.service';
import { getOptionalUser } from '../middlewares/optionalAuth';

const router = express.Router();

router.get('/:meetingId', asyncHandler(async (req, res) => {
    const data = await meetingService.getMeetingDetails(req.params.meetingId as string);
    res.json({ success: true, data });
}));

router.post('/:meetingId/token', asyncHandler(async (req, res) => {
    try {
        const data = await meetingService.createMeetingToken(req.params.meetingId as string, getOptionalUser(req), req.body?.name);
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
