CREATE TYPE "RciCardStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

ALTER TABLE "Doctor" ADD COLUMN "rciCardVerifiedAt" TIMESTAMP(3);

CREATE TABLE "RciCardSubmission" (
    "id" TEXT NOT NULL,
    "doctorId" TEXT NOT NULL,
    "registrationNo" TEXT,
    "fileName" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "size" INTEGER NOT NULL,
    "data" TEXT NOT NULL,
    "status" "RciCardStatus" NOT NULL DEFAULT 'PENDING',
    "reviewNote" TEXT,
    "reviewedBy" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RciCardSubmission_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Admin" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Admin_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "RciCardSubmission_doctorId_idx" ON "RciCardSubmission"("doctorId");
CREATE INDEX "RciCardSubmission_status_createdAt_idx" ON "RciCardSubmission"("status", "createdAt");
CREATE UNIQUE INDEX "Admin_email_key" ON "Admin"("email");

ALTER TABLE "RciCardSubmission" ADD CONSTRAINT "RciCardSubmission_doctorId_fkey" FOREIGN KEY ("doctorId") REFERENCES "Doctor"("id") ON DELETE CASCADE ON UPDATE CASCADE;
