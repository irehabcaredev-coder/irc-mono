import dotenv from 'dotenv';
dotenv.config();

import prisma from '../config/prisma';
import { OTHER_DATA_RETENTION_DAYS } from '../config/retention';

// Run daily (cron). Removes what no longer has a reason to exist; payments are never touched here.
//   pnpm --filter ./apps/api exec ts-node src/scripts/purge-retention.ts
const main = async () => {
    const cutoff = new Date(Date.now() - OTHER_DATA_RETENTION_DAYS * 24 * 60 * 60 * 1000);

    // Guest chats have no owner to ask for deletion, so they expire
    const sessions = await prisma.aiSession.deleteMany({ where: { userId: null, createdAt: { lt: cutoff } } });

    // Unfinished sign-ups: the account never got past email verification
    const patients = await prisma.patient.deleteMany({ where: { onboardingStep: 'EMAIL_VERIFIED', createdAt: { lt: cutoff }, appointments: { none: {} } } });
    const doctors = await prisma.doctor.deleteMany({
        where: { onboardingStep: 'EMAIL_VERIFIED', createdAt: { lt: cutoff }, email: { not: { endsWith: '@deleted.invalid' } }, appointments: { none: {} } },
    });

    // Reviewed RCI card images are not needed once a decision is recorded
    const cards = await prisma.rciCardSubmission.updateMany({
        where: { status: { in: ['APPROVED', 'REJECTED'] }, reviewedAt: { lt: cutoff }, data: { not: '' } },
        data: { data: '' },
    });

    console.log(`Purged: ${sessions.count} guest chats, ${patients.count} unverified patients, ${doctors.count} unverified doctors, ${cards.count} reviewed card images`);
};

main().catch((e) => { console.error(e); process.exit(1); }).finally(() => prisma.$disconnect());
