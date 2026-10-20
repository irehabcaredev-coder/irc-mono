import jwt from 'jsonwebtoken';
import { randomUUID, createHmac } from 'crypto';
import { AppointmentStatus } from '@prisma/client';
import prisma from '../config/prisma';
import { OptionalUser } from '../middlewares/optionalAuth';
import { AppError } from '../utils/AppError';
import { BAD_REQUEST, FORBIDDEN, NOT_FOUND } from '../utils/httpStatusCodes';

const EARLY_JOIN_MS = 10 * 60 * 1000;
const LATE_JOIN_MS = 30 * 60 * 1000;
const TOKEN_TTL_SECONDS = 2 * 60 * 60; // meeting token and TURN credentials live 2h

type MeetingUser = OptionalUser;

type IceServer = { urls: string | string[]; username?: string; credential?: string };

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

/**
 * STUN alone fails for many real networks (symmetric NAT, mobile data, corporate firewalls):
 * signaling works but no audio/video flows. A TURN server relays media in those cases.
 *
 * Configure with env vars (see .env.example):
 *   TURN_URLS          comma separated, e.g. turn:turn.example.com:3478?transport=udp,turns:turn.example.com:443?transport=tcp
 *   TURN_SHARED_SECRET coturn "static-auth-secret": short-lived credentials are generated per join (recommended)
 *   or
 *   TURN_USERNAME / TURN_CREDENTIAL: static credentials (hosted TURN providers)
 */
const buildIceServers = (identity: string): IceServer[] => {
    const servers: IceServer[] = [
        { urls: ['stun:stun.l.google.com:19302', 'stun:stun1.l.google.com:19302'] },
    ];

    const turnUrls = (process.env.TURN_URLS || '')
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean);

    if (turnUrls.length === 0) {
        console.warn('[meeting] TURN_URLS is not set. Calls will fail for peers behind strict NATs.');
        return servers;
    }

    const sharedSecret = process.env.TURN_SHARED_SECRET;
    if (sharedSecret) {
        // coturn REST-style ephemeral credentials: username = "<expiry>:<id>", password = HMAC-SHA1
        const username = `${Math.floor(Date.now() / 1000) + TOKEN_TTL_SECONDS}:${identity}`;
        const credential = createHmac('sha1', sharedSecret).update(username).digest('base64');
        servers.push({ urls: turnUrls, username, credential });
    } else if (process.env.TURN_USERNAME && process.env.TURN_CREDENTIAL) {
        servers.push({
            urls: turnUrls,
            username: process.env.TURN_USERNAME,
            credential: process.env.TURN_CREDENTIAL,
        });
    } else {
        console.warn('[meeting] TURN_URLS is set but no TURN credentials were provided.');
    }

    return servers;
};

export const getMeetingDetails = async (meetingId: string) => {
    const a = await findAppointment(meetingId);
    return { id: a.id, meetingName: a.meetingName, scheduledAt: a.scheduledAt, scheduledEnd: a.scheduledEnd, status: a.status };
};

export const createMeetingToken = async (meetingId: string, user: MeetingUser, guestName?: string) => {
    const jwtSecret = process.env.JWT_SECRET || 'your-jwt-secret-key-change-in-production';

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
        // Guests may join with a name; the meeting id acts as the invite
        const trimmed = guestName?.trim();
        if (!trimmed) throw new AppError('Name is required to join as a guest', BAD_REQUEST);
        identity = `guest:${randomUUID()}`;
        name = trimmed.slice(0, 60);
    }

    const token = jwt.sign(
        {
            meetingId: a.id,
            identity,
            name,
            userType: user?.type || 'guest',
        },
        jwtSecret,
        { expiresIn: TOKEN_TTL_SECONDS }
    );

    return {
        token,
        roomName: a.id,
        identity,
        name,
        meetingName: a.meetingName,
        iceServers: buildIceServers(identity),
    };
};