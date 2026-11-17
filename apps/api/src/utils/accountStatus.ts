import prisma from '../config/prisma';

/**
 * A login token outlives the account it was issued for, so every request checks the account still exists and was
 * not deleted. Admin tokens are checked by the admin routes themselves.
 */
export const isAccountActive = async (type: unknown, id: unknown): Promise<boolean> => {
    if (typeof id !== 'string') return false;
    if (type === 'doctor') {
        const row = await prisma.doctor.findUnique({ where: { id }, select: { deletedAt: true } });
        return !!row && !row.deletedAt;
    }
    if (type === 'patient') {
        const row = await prisma.patient.findUnique({ where: { id }, select: { deletedAt: true } });
        return !!row && !row.deletedAt;
    }
    return true;
};
