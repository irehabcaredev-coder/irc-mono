
import { Router, Response } from 'express';
import asyncHandler from '../utils/asyncHandler';
import { AppError } from '../utils/AppError';
import { NOT_FOUND, BAD_REQUEST, FORBIDDEN, CONFLICT, INTERNAL_SERVER_ERROR } from '../utils/httpStatusCodes';
import prisma from '../config/prisma';
import * as razorpayService from './razorpay.service';
import { authenticateJWT, AuthenticatedRequest } from '../middlewares/auth.middleware';

const router = Router();

// Create Razorpay Order for an appointment
router.post('/create-order', authenticateJWT, asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { appointmentId } = req.body;
    if (req.user?.type !== 'patient') throw new AppError('Only the patient can pay for an appointment', FORBIDDEN);

    const appointment = await prisma.appointment.findUnique({
        where: { id: appointmentId },
        include: { doctor: true }
    });

    if (!appointment || appointment.patientId !== req.user.id) throw new AppError('Appointment not found', NOT_FOUND);
    const existing = await prisma.payment.findUnique({ where: { appointmentId: appointment.id }, select: { id: true, status: true } });
    if (existing?.status === 'SUCCESS') throw new AppError('This appointment is already paid', CONFLICT);
    if (!appointment.doctor.razorpayAccountId || !appointment.doctor.consultationFee) {
        throw new AppError('Doctor has not completed payment setup', BAD_REQUEST);
    }

    const order = await razorpayService.createOrder(
        appointment.doctor.consultationFee,
        appointment.doctor.razorpayAccountId
    );

    if (!order.id) {
        throw new AppError('Failed to create Razorpay order', INTERNAL_SERVER_ERROR);
    }

    // An abandoned checkout leaves a pending row; a retry replaces it
    if (existing) await prisma.payment.delete({ where: { id: existing.id } });

    // Track payment in DB
    await prisma.payment.create({
        data: {
            appointmentId: appointment.id,
            razorpayOrderId: order.id,
            amount: appointment.doctor.consultationFee,
            status: 'PENDING'
        }
    });

    res.json({ success: true, order });
}));

// Verify Razorpay Payment
router.post('/verify-payment', authenticateJWT, asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;

    const isValid = razorpayService.verifyPaymentSignature(
        razorpay_order_id,
        razorpay_payment_id,
        razorpay_signature
    );

    if (!isValid) throw new AppError('Invalid payment signature', BAD_REQUEST);

    // Find the payment to get the appointment ID
    const payment = await prisma.payment.findUnique({
        where: { razorpayOrderId: razorpay_order_id },
        include: { appointment: { select: { patientId: true } } }
    });

    if (!payment || payment.appointment.patientId !== req.user?.id) throw new AppError('Payment record not found', NOT_FOUND);

    // Update payment and appointment status
    await prisma.$transaction([
        prisma.payment.update({
            where: { razorpayOrderId: razorpay_order_id },
            data: {
                razorpayPaymentId: razorpay_payment_id,
                razorpaySignature: razorpay_signature,
                status: 'SUCCESS'
            }
        }),
        prisma.appointment.update({
            where: { id: payment.appointmentId },
            data: { status: 'CONFIRMED' }
        })
    ]);

    res.json({ success: true, message: 'Payment verified and appointment confirmed' });
}));

export default router;
