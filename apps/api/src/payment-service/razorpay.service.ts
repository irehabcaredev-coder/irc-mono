
import Razorpay from 'razorpay';
import { AppError } from '../utils/AppError';
import { INTERNAL_SERVER_ERROR } from '../utils/httpStatusCodes';

let razorpayInstance: Razorpay | null = null;

const isPlaceholderKey = (key?: string) => {
    if (!key) return true;
    const trimmed = key.trim().toLowerCase();
    return (
        trimmed === '' ||
        trimmed.startsWith('your-') ||
        trimmed.includes('change-me') ||
        trimmed === 'your-razorpay-key-id' ||
        trimmed === 'your-razorpay-key-secret'
    );
};

const getRazorpayInstance = () => {
    const key_id = process.env.RAZORPAY_KEY_ID;
    const key_secret = process.env.RAZORPAY_KEY_SECRET;

    if (!key_id || !key_secret || isPlaceholderKey(key_id) || isPlaceholderKey(key_secret)) {
        console.warn('Razorpay keys are missing or set to placeholder values in environment variables. Skipping Razorpay operations.');
        return null;
    }

    if (!razorpayInstance) {
        razorpayInstance = new Razorpay({
            key_id,
            key_secret,
        });
    }
    return razorpayInstance;
};

export const createLinkedAccount = async (doctor: { email: string, name: string, phone: string, bankAccountNumber: string, bankIfsc: string, bankBeneficiaryName: string }) => {
    try {
        const razorpay = getRazorpayInstance();
        if (!razorpay) return { id: null, status: 'skipped' };

        const account = await (razorpay.accounts as any).create({
            email: doctor.email,
            phone: doctor.phone,
            type: 'route',
            legal_business_name: doctor.name,
            profile: {
                category: 'healthcare',
                subcategory: 'doctor_and_other_healthcare_professionals',
            },
            requested_products: ['settlements'],
            product_config: {
                settlements: {
                    features: ['parent_settlement'],
                    settlement_details: {
                        account_number: doctor.bankAccountNumber,
                        ifsc_code: doctor.bankIfsc,
                        beneficiary_name: doctor.bankBeneficiaryName,
                    }
                }
            }
        });
        return account;
    } catch (error: any) {
        const errorMsg = error?.error?.description || error?.message || (typeof error === 'object' ? JSON.stringify(error) : String(error));
        console.error('Razorpay Account Creation Error:', errorMsg, error);

        // In non-production, don't block doctor onboarding if Razorpay Route fails (e.g. invalid test keys)
        if (process.env.NODE_ENV !== 'production') {
            console.warn('Non-production mode: Skipping Razorpay linked account error to allow doctor onboarding.');
            return { id: null, status: 'failed_dev_skipped', error: errorMsg };
        }

        throw new AppError('Error creating Razorpay linked account: ' + errorMsg, INTERNAL_SERVER_ERROR);
    }
};

export const createOrder = async (amount: number, doctorRazorpayId: string, commissionPercent: number = 10) => {
    try {
        const razorpay = getRazorpayInstance();
        if (!razorpay) return { id: null, status: 'skipped' };

        const commission = Math.round(amount * (commissionPercent / 100));
        const amountToTransfer = amount - commission;

        const order = await razorpay.orders.create({
            amount: amount, // Total amount in paise
            currency: 'INR',
            transfers: [
                {
                    account: doctorRazorpayId,
                    amount: amountToTransfer,
                    currency: 'INR',
                    on_hold: false,
                }
            ]
        });
        return order;
    } catch (error: any) {
        const errorMsg = error?.error?.description || error?.message || (typeof error === 'object' ? JSON.stringify(error) : String(error));
        console.error('Razorpay Order Creation Error:', errorMsg, error);
        throw new AppError('Error creating Razorpay order: ' + errorMsg, INTERNAL_SERVER_ERROR);
    }
};

export const verifyPaymentSignature = (orderId: string, paymentId: string, signature: string) => {
    const crypto = require('crypto');
    const hmac = crypto.createHmac('sha256', process.env.RAZORPAY_KEY_SECRET);
    hmac.update(orderId + "|" + paymentId);
    const expectedSignature = hmac.digest('hex');
    return expectedSignature === signature;
};
