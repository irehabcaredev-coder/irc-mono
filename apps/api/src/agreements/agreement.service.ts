import crypto from 'crypto';
import prisma from '../config/prisma';
import { AppError } from '../utils/AppError';
import { BAD_REQUEST, CONFLICT, NOT_FOUND } from '../utils/httpStatusCodes';
import { AGREEMENT_ATTESTATIONS, AGREEMENT_KEY, AGREEMENT_SECTIONS, AGREEMENT_TITLE, AGREEMENT_VERSION } from './provider-v1.0';

/** The agreement as one markdown document, which is what is stored, hashed and shown. */
export const renderAgreement = (sections = AGREEMENT_SECTIONS): string =>
    sections.map((s) => `## ${s.title}\n\n${s.body.join('\n\n')}`).join('\n\n');

export const hashAgreement = (content: string, attestations: string[]): string =>
    crypto.createHash('sha256').update(JSON.stringify({ content, attestations })).digest('hex');

/** Inserts the bundled version if absent. Published text is immutable: a changed text under the same version is refused. */
export const seedProviderAgreement = async () => {
    const content = renderAgreement();
    const contentHash = hashAgreement(content, AGREEMENT_ATTESTATIONS);
    const existing = await prisma.agreement.findUnique({ where: { key_version: { key: AGREEMENT_KEY, version: AGREEMENT_VERSION } } });
    if (existing) {
        if (existing.contentHash !== contentHash) {
            throw new Error(`Agreement ${AGREEMENT_KEY} v${AGREEMENT_VERSION} already exists with different text. Add a new version instead of editing it.`);
        }
        return { created: false, contentHash };
    }
    await prisma.$transaction([
        prisma.agreement.updateMany({ where: { key: AGREEMENT_KEY, isCurrent: true }, data: { isCurrent: false } }),
        prisma.agreement.create({
            data: { key: AGREEMENT_KEY, version: AGREEMENT_VERSION, title: AGREEMENT_TITLE, content, contentHash, attestations: AGREEMENT_ATTESTATIONS, isCurrent: true },
        }),
    ]);
    return { created: true, contentHash };
};

export const getCurrentAgreement = async (key = AGREEMENT_KEY) => {
    const agreement = await prisma.agreement.findFirst({ where: { key, isCurrent: true } });
    if (!agreement) throw new AppError('Agreement not found', NOT_FOUND);
    return agreement;
};

export const presentAgreement = (a: Awaited<ReturnType<typeof getCurrentAgreement>>) => ({
    version: a.version,
    title: a.title,
    content: a.content,
    attestations: a.attestations,
    contentHash: a.contentHash,
    effectiveAt: a.effectiveAt,
});

export const hasAcceptedCurrent = async (doctorId: string, key = AGREEMENT_KEY): Promise<boolean> => {
    const current = await prisma.agreement.findFirst({ where: { key, isCurrent: true }, select: { id: true } });
    if (!current) return true; // nothing published yet, nothing to accept
    return !!(await prisma.agreementAcceptance.findUnique({
        where: { doctorId_agreementId: { doctorId, agreementId: current.id } },
        select: { id: true },
    }));
};

export const assertAgreementAccepted = async (doctorId: string) => {
    if (!(await hasAcceptedCurrent(doctorId))) {
        throw new AppError('Read and accept the Provider Registration & Compliance Agreement before continuing.', 403);
    }
};

type AcceptInput = { version: string; contentHash: string; attestations: boolean[]; signatureName: string };

export const acceptAgreement = async (doctorId: string, input: AcceptInput, meta: { ipAddress?: string; userAgent?: string }) => {
    const agreement = await getCurrentAgreement();
    // The doctor must be accepting the text that is current right now, not one they loaded earlier
    if (input.version !== agreement.version || input.contentHash !== agreement.contentHash) {
        throw new AppError('The agreement has changed. Please reload and read the latest version.', CONFLICT);
    }
    if (input.attestations.length !== agreement.attestations.length || !input.attestations.every((v) => v === true)) {
        throw new AppError('Every statement must be accepted to continue.', BAD_REQUEST);
    }
    const signatureName = input.signatureName.replace(/\s+/g, ' ').trim();
    if (signatureName.length < 2) throw new AppError('Enter your full legal name as your signature.', BAD_REQUEST);

    const existing = await prisma.agreementAcceptance.findUnique({ where: { doctorId_agreementId: { doctorId, agreementId: agreement.id } } });
    if (existing) return { acceptedAt: existing.acceptedAt, version: agreement.version };

    const accepted = await prisma.agreementAcceptance.create({
        data: {
            doctorId,
            agreementId: agreement.id,
            contentHash: agreement.contentHash,
            attestations: input.attestations,
            signatureName,
            ipAddress: meta.ipAddress?.slice(0, 64),
            userAgent: meta.userAgent?.slice(0, 300),
        },
    });
    return { acceptedAt: accepted.acceptedAt, version: agreement.version };
};
