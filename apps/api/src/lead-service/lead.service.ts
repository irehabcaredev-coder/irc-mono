
import prisma from '../config/prisma';
import { AppError } from '../utils/AppError';
import { NOT_FOUND, INTERNAL_SERVER_ERROR } from '../utils/httpStatusCodes';
import * as emailService from '../email-service/email.service';
import * as aiService from '../ai-service/ai.service';

const escapeHtml = (v: string) => v.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);

export const registerProfileView = async (doctorId: string, patientId: string) => {
    try {
        const doctor = await prisma.doctor.findUnique({ where: { id: doctorId } });
        if (!doctor) throw new AppError('Doctor not found', NOT_FOUND);

        await prisma.doctor.update({
            where: { id: doctorId },
            data: { viewCount: { increment: 1 } }
        });

        const patient = await prisma.patient.findUnique({ where: { id: patientId } });
        if (!patient) return; 
        
        const existingLead = await prisma.lead.findUnique({
            where: { doctorId_patientId: { doctorId, patientId } }
        });

        const now = new Date();
        let shouldSendEmail = false;

        if (!existingLead) {
            const newLead = await prisma.lead.create({
                data: { doctorId, patientId, viewedAt: now }
            });
            // Score the lead in the background; failures are logged inside and never affect the request
            void aiService.qualifyLead(newLead.id);
            shouldSendEmail = true;
        } else {
            // A returning viewer only triggers another email after a day
            const hoursSinceLastView = (now.getTime() - existingLead.viewedAt.getTime()) / (1000 * 60 * 60);
            if (hoursSinceLastView >= 24) shouldSendEmail = true;

            await prisma.lead.update({
                where: { id: existingLead.id },
                data: { viewedAt: now }
            });
        }

        if (shouldSendEmail) {
            // The email carries no patient details: the doctor sees who it was inside their dashboard, after signing in
            const subject = existingLead ? 'A patient viewed your profile again' : 'A patient viewed your profile';
            const html = `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e0e0e0; border-radius: 8px; overflow: hidden;">
                    <div style="background-color: #2D3748; padding: 20px; text-align: center;">
                        <h2 style="color: #ffffff; margin: 0;">New profile view</h2>
                    </div>
                    <div style="padding: 20px; background-color: #f9fafb;">
                        <p style="font-size: 16px; color: #4a5568;">Hello ${escapeHtml(doctor.name ?? 'Doctor')},</p>
                        <p style="font-size: 16px; color: #4a5568;">A patient has just viewed your profile on iRehabCare. Sign in to see the details.</p>
                        <div style="margin-top: 25px; text-align: center;">
                            <a href="${escapeHtml(process.env.FRONTEND_URL || '#')}/dashboard/leads" style="background-color: #4299e1; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; font-weight: bold;">View in dashboard</a>
                        </div>
                    </div>
                    <div style="background-color: #edf2f7; padding: 15px; text-align: center; font-size: 12px; color: #718096;">
                        &copy; ${new Date().getFullYear()} iRehabCare. All rights reserved.
                    </div>
                </div>
            `;
            await emailService.sendEmail(doctor.email, subject, html);
        }
    } catch (error: any) {
        if (error instanceof AppError) throw error;
        throw new AppError('Error processing profile view: ' + error.message, INTERNAL_SERVER_ERROR);
    }
};

export const getLeadsForDoctor = async (doctorId: string, page: number = 1, limit: number = 10) => {
    try {
        const skip = (page - 1) * limit;
        const [leads, total] = await Promise.all([
            prisma.lead.findMany({
                where: { doctorId },
                // Only what a doctor needs to follow up; never credentials or OTP state
                include: { patient: { select: { id: true, name: true, phone: true, city: true, state: true, age: true, gender: true, issues: true, shareContactWithDoctors: true } } },
                orderBy: { viewedAt: 'desc' },
                skip,
                take: limit
            }),
            prisma.lead.count({ where: { doctorId } })
        ]);

        // Name, phone and health concerns are shown only when the patient explicitly agreed to share them
        const data = leads.map((lead) => {
            const { shareContactWithDoctors, ...patient } = lead.patient;
            const shared = shareContactWithDoctors === true;
            return {
                ...lead,
                patient: shared
                    ? { ...patient, contactShared: true }
                    : { id: patient.id, name: null, phone: null, city: null, state: null, age: null, gender: null, issues: [], contactShared: false },
            };
        });

        return {
            data,
            meta: {
                total,
                page,
                limit,
                totalPages: Math.ceil(total / limit)
            }
        };
    } catch (error: any) {
        throw new AppError('Error fetching leads: ' + error.message, INTERNAL_SERVER_ERROR);
    }
};
