CREATE TABLE "Agreement" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "version" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "contentHash" TEXT NOT NULL,
    "attestations" TEXT[],
    "effectiveAt" TIMESTAMP(3),
    "isCurrent" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Agreement_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "AgreementAcceptance" (
    "id" TEXT NOT NULL,
    "doctorId" TEXT NOT NULL,
    "agreementId" TEXT NOT NULL,
    "contentHash" TEXT NOT NULL,
    "attestations" BOOLEAN[],
    "signatureName" TEXT NOT NULL,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "acceptedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AgreementAcceptance_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Agreement_key_version_key" ON "Agreement"("key", "version");
CREATE INDEX "Agreement_key_isCurrent_idx" ON "Agreement"("key", "isCurrent");
CREATE UNIQUE INDEX "AgreementAcceptance_doctorId_agreementId_key" ON "AgreementAcceptance"("doctorId", "agreementId");
CREATE INDEX "AgreementAcceptance_agreementId_idx" ON "AgreementAcceptance"("agreementId");

ALTER TABLE "AgreementAcceptance" ADD CONSTRAINT "AgreementAcceptance_doctorId_fkey" FOREIGN KEY ("doctorId") REFERENCES "Doctor"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "AgreementAcceptance" ADD CONSTRAINT "AgreementAcceptance_agreementId_fkey" FOREIGN KEY ("agreementId") REFERENCES "Agreement"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
