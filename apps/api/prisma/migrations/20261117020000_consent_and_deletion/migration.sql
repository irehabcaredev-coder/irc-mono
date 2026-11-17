-- Doctors: consent to show contact numbers publicly; deletion marker
ALTER TABLE "Doctor" ADD COLUMN "contactConsentAt" TIMESTAMP(3);
ALTER TABLE "Doctor" ADD COLUMN "deletedAt" TIMESTAMP(3);

-- Patients: explicit choice to share details with doctors; deletion marker
ALTER TABLE "Patient" ADD COLUMN "shareContactWithDoctors" BOOLEAN;
ALTER TABLE "Patient" ADD COLUMN "shareContactAt" TIMESTAMP(3);
ALTER TABLE "Patient" ADD COLUMN "deletedAt" TIMESTAMP(3);

-- Accounts deleted before this column existed were anonymised to this address
UPDATE "Doctor" SET "deletedAt" = NOW() WHERE "email" LIKE 'deleted-%@deleted.invalid';
UPDATE "Patient" SET "deletedAt" = NOW() WHERE "email" LIKE 'deleted-%@deleted.invalid';
