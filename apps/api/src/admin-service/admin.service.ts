import jwt from 'jsonwebtoken';
import { randomBytes } from 'crypto';
import { RciCardStatus } from '@prisma/client';
import prisma from '../config/prisma';
import { AppError } from '../utils/AppError';
import { BAD_REQUEST, CONFLICT, NOT_FOUND, UNAUTHORIZED } from '../utils/httpStatusCodes';
import { comparePassword, hashPassword } from '../google-auth-service/auth.service';
import { isRciVerified } from '../doctor-service/rci.service';
import * as emailService from '../email-service/email.service';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';

// Compared against when the email is unknown, so a miss takes as long as a wrong password
const dummyHash = hashPassword(randomBytes(16).toString('hex'));

export const loginAdmin = async (email: string, password: string) => {
    const admin = await prisma.admin.findUnique({ where: { email: email.trim().toLowerCase() } });
    const ok = await comparePassword(password, admin?.passwordHash ?? (await dummyHash));
    if (!admin || !ok) throw new AppError('Invalid email or password', UNAUTHORIZED);
    const token = jwt.sign({ id: admin.id, email: admin.email, type: 'admin' }, JWT_SECRET, { expiresIn: '12h' });
    return { token, email: admin.email };
};

export const createAdmin = async (email: string, password: string) => {
    const normalized = email.trim().toLowerCase();
    return prisma.admin.upsert({
        where: { email: normalized },
        update: { passwordHash: await hashPassword(password) },
        create: { email: normalized, passwordHash: await hashPassword(password) },
        select: { id: true, email: true },
    });
};

export const adminExists = async (id: string) => !!(await prisma.admin.findUnique({ where: { id }, select: { id: true } }));

const isStatus = (v: unknown): v is RciCardStatus => v === 'PENDING' || v === 'APPROVED' || v === 'REJECTED';

export const listCardSubmissions = async (status: unknown, page = 1, limit = 20) => {
    const where = isStatus(status) ? { status } : {};
    const [rows, total] = await Promise.all([
        prisma.rciCardSubmission.findMany({
            where,
            orderBy: { createdAt: status === 'PENDING' || !isStatus(status) ? 'asc' : 'desc' },
            skip: (page - 1) * limit,
            take: limit,
            select: {
                id: true, status: true, registrationNo: true, fileName: true, mimeType: true, size: true,
                reviewNote: true, reviewedBy: true, reviewedAt: true, createdAt: true,
                doctor: { select: { id: true, name: true, email: true, contactNumber: true, city: true, state: true, specialty: true, rciRegistrationId: true, rciCardVerifiedAt: true } },
            },
        }),
        prisma.rciCardSubmission.count({ where }),
    ]);
    // Never hand the registration link itself to the browser; a flag is enough
    const data = rows.map(({ doctor, ...r }) => {
        const { rciRegistrationId, rciCardVerifiedAt, ...d } = doctor;
        return { ...r, doctor: { ...d, alreadyVerified: isRciVerified({ rciRegistrationId, rciCardVerifiedAt }) } };
    });
    return { data, meta: { total, page, limit, totalPages: Math.ceil(total / limit) } };
};

export const getCardFile = async (id: string) => {
    const submission = await prisma.rciCardSubmission.findUnique({ where: { id }, select: { data: true, mimeType: true, fileName: true } });
    if (!submission) throw new AppError('Submission not found', NOT_FOUND);
    return submission;
};

export const reviewCard = async (id: string, adminEmail: string, decision: 'APPROVED' | 'REJECTED', note?: string) => {
    const submission = await prisma.rciCardSubmission.findUnique({
        where: { id },
        select: { id: true, status: true, doctor: { select: { id: true, email: true, name: true } } },
    });
    if (!submission) throw new AppError('Submission not found', NOT_FOUND);
    if (submission.status !== 'PENDING') throw new AppError('This submission has already been reviewed.', CONFLICT);
    if (decision === 'REJECTED' && !note?.trim()) throw new AppError('Add a reason so the doctor knows what to fix.', BAD_REQUEST);

    const now = new Date();
    const review = prisma.rciCardSubmission.updateMany({
        // The status guard makes a double click (or two admins) approve once
        where: { id, status: 'PENDING' },
        data: { status: decision, reviewNote: note?.trim() || null, reviewedBy: adminEmail, reviewedAt: now },
    });
    if (decision === 'APPROVED') {
        const [result] = await prisma.$transaction([review, prisma.doctor.update({ where: { id: submission.doctor.id }, data: { rciCardVerifiedAt: now } })]);
        if (result.count === 0) throw new AppError('This submission has already been reviewed.', CONFLICT);
    } else {
        const result = await review;
        if (result.count === 0) throw new AppError('This submission has already been reviewed.', CONFLICT);
    }

    // Best effort: the decision stands even if the email cannot be sent
    const approved = decision === 'APPROVED';
    void emailService.sendEmail(
        submission.doctor.email,
        approved ? 'Your RCI card has been verified' : 'We could not verify your RCI card',
        `<p>Hello ${submission.doctor.name ?? 'Doctor'},</p>` +
            (approved
                ? '<p>Your RCI card was reviewed and approved. You can now continue on ECare+.</p>'
                : `<p>We could not verify the RCI card you uploaded.</p><p><b>Reason:</b> ${escapeHtml(note ?? '')}</p><p>Please sign in and upload a clearer photo of your card.</p>`),
    ).catch(() => undefined);

    return { id, status: decision };
};

const escapeHtml = (v: string) => v.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);
