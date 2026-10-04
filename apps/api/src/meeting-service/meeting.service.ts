import { AccessToken } from 'livekit-server-sdk';
import { randomUUID } from 'crypto';
import { AppointmentStatus } from '@prisma/client';
import prisma from '../config/prisma';
import { OptionalUser } from '../middlewares/optionalAuth';
import { AppError } from '../utils/AppError';
import { BAD_REQUEST, FORBIDDEN, NOT_FOUND, SERVICE_UNAVAILABLE } from '../utils/httpStatusCodes';

const EARLY_JOIN_MS = 10 * 60 * 1000;
const LATE_JOIN_MS = 30 * 60 * 1000;
const TOKEN_TTL = '2h';

type MeetingUser = OptionalUser;

export class MeetingWindowError extends AppError {
    constructor(message: string, public code: 'MEETING_NOT_STARTED' | 'MEETING_ENDED', public scheduledAt: Date, public scheduledEnd: Date) {
        super(message, FORBIDDEN);
    }
}

const findAppointment = async (meetingId: string) => {
    // Appointment ids are UUIDs; anything else cannot match and would only hit the DB for nothing
    if (!/^[0-9a-f-]{36}$/i.test(meetingId)) throw new AppError('Meeting not found', NOT_FOUND);
    const appointment = await prisma.appointment.findUnique({
        where: { id: meetingId },
        include: { doctor: { select: { name: true } }, patient: { select: { name: true } } },
    });
    if (!appointment) throw new AppError('Meeting not found', NOT_FOUND);
    return appointment;
};

export const getMeetingDetails = async (meetingId: string) => {
    const a = await findAppointment(meetingId);
    return { id: a.id, meetingName: a.meetingName, scheduledAt: a.scheduledAt, scheduledEnd: a.scheduledEnd, status: a.status };
};

export const createMeetingToken = async (meetingId: string, user: MeetingUser, guestName?: string) => {
    const { LIVEKIT_URL, LIVEKIT_API_KEY, LIVEKIT_API_SECRET } = process.env;
    if (!LIVEKIT_URL || !LIVEKIT_API_KEY || !LIVEKIT_API_SECRET) {
        throw new AppError('Video service is not configured', SERVICE_UNAVAILABLE);
    }

    const a = await findAppointment(meetingId);
    if (a.status === AppointmentStatus.CANCELLED) throw new AppError('This appointment was cancelled', FORBIDDEN);

    const now = Date.now();
    if (now < a.scheduledAt.getTime() - EARLY_JOIN_MS) {
        throw new MeetingWindowError('You can join 10 minutes before the scheduled time', 'MEETING_NOT_STARTED', a.scheduledAt, a.scheduledEnd);
    }
    if (now > a.scheduledEnd.getTime() + LATE_JOIN_MS) {
        throw new MeetingWindowError('This meeting has ended', 'MEETING_ENDED', a.scheduledAt, a.scheduledEnd);
    }

    let identity: string;
    let name: string;
    if (user?.type === 'doctor') {
        if (user.id !== a.doctorId) throw new AppError('You are not a participant of this meeting', FORBIDDEN);
        identity = `doctor:${user.id}`;
        name = a.doctor.name ?? 'Doctor';
    } else if (user?.type === 'patient') {
        if (user.id !== a.patientId) throw new AppError('You are not a participant of this meeting', FORBIDDEN);
        identity = `patient:${user.id}`;
        name = a.patient.name ?? 'Patient';
    } else {
        // Guests may join with a name, as before; the unguessable meeting id acts as the invite
        const trimmed = guestName?.trim();
        if (!trimmed) throw new AppError('Name is required to join as a guest', BAD_REQUEST);
        identity = `guest:${randomUUID()}`;
        name = trimmed.slice(0, 60);
    }

    const at = new AccessToken(LIVEKIT_API_KEY, LIVEKIT_API_SECRET, { identity, name, ttl: TOKEN_TTL });
    at.addGrant({ roomJoin: true, room: a.id, canPublish: true, canSubscribe: true });

    return { token: await at.toJwt(), url: LIVEKIT_URL, roomName: a.id, identity, name };
};
