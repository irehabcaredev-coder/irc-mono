-- The plaintext register table is replaced by an encrypted one (rows are re-imported with scripts/import-rci.ts).
DROP TABLE "RciRegistration";

CREATE TABLE "RciRegistration" (
    "id" TEXT NOT NULL,
    "registrationNoHash" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL,
    "data" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RciRegistration_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "RciRegistration_registrationNoHash_key" ON "RciRegistration"("registrationNoHash");

ALTER TABLE "Doctor" ADD COLUMN "rciRegistrationId" TEXT;

CREATE UNIQUE INDEX "Doctor_rciRegistrationId_key" ON "Doctor"("rciRegistrationId");

ALTER TABLE "Doctor" ADD CONSTRAINT "Doctor_rciRegistrationId_fkey" FOREIGN KEY ("rciRegistrationId") REFERENCES "RciRegistration"("id") ON DELETE SET NULL ON UPDATE CASCADE;
