// A doctor who has not verified with the RCI is not shown by name to anyone but themselves.
export const HIDDEN_NAME = 'Verification pending';

const SECRET_FIELDS = ['password', 'otp', 'otpExpiry', 'googleId'];
const PRIVATE_FIELDS = ['razorpayAccountId', 'bankAccountNumber', 'bankIfsc', 'bankBeneficiaryName'];

/**
 * Shapes a doctor record for a reader. Secrets never leave the server; payout details and
 * unverified names are only visible to the doctor themselves.
 */
export const presentDoctor = <T extends Record<string, any>>(doctor: T, viewerDoctorId?: string | null) => {
    const isOwner = !!viewerDoctorId && viewerDoctorId === doctor.id;
    const out: Record<string, any> = { ...doctor };
    for (const f of SECRET_FIELDS) delete out[f];
    if (!isOwner) for (const f of PRIVATE_FIELDS) delete out[f];

    if ('rciRegistrationId' in doctor) {
        const verified = !!doctor.rciRegistrationId;
        out.rciVerified = verified;
        if (!isOwner) {
            delete out.rciRegistrationId;
            delete out.rciDeadline;
            if (!verified) out.name = HIDDEN_NAME;
        }
    }
    return out as Omit<T, 'password' | 'otp' | 'otpExpiry' | 'googleId'> & Record<string, any>;
};
