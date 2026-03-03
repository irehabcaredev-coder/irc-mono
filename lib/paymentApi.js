import { apiPost, ApiError } from './apiClient'

/**
 * Payment API Functions
 * All functions follow the API spec from apis.md
 */

/**
 * Create Payment Order
 * Creates a Razorpay order for appointment payment
 * @param {string} appointmentId - Appointment UUID
 * @returns {Promise<{success: boolean, order: object}>}
 */
export async function createPaymentOrder(appointmentId) {
    try {
        const response = await apiPost(
            '/payments/create-order',
            { appointmentId },
            {
                skipAuth: false,
                usePatientToken: true, // Requires patient auth token
            }
        )
        return response
    } catch (error) {
        if (error instanceof ApiError) {
            throw error
        }
        throw new ApiError('Failed to create payment order', 0, 'UNKNOWN_ERROR')
    }
}

/**
 * Verify Payment
 * Verifies Razorpay payment signature and confirms payment
 * @param {object} paymentData - Payment data from Razorpay
 * @param {string} paymentData.razorpay_order_id - Order ID
 * @param {string} paymentData.razorpay_payment_id - Payment ID
 * @param {string} paymentData.razorpay_signature - Signature
 * @returns {Promise<{success: boolean, message: string}>}
 */
export async function verifyPayment(paymentData) {
    try {
        const response = await apiPost(
            '/payments/verify-payment',
            paymentData,
            {
                skipAuth: false,
                usePatientToken: true, // Requires patient auth token
            }
        )
        return response
    } catch (error) {
        if (error instanceof ApiError) {
            throw error
        }
        throw new ApiError('Failed to verify payment', 0, 'UNKNOWN_ERROR')
    }
}
