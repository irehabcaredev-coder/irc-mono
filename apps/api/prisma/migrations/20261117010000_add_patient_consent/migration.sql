-- Records when each patient accepted the privacy notice, and which version of it
ALTER TABLE "Patient" ADD COLUMN "privacyConsentAt" TIMESTAMP(3);
ALTER TABLE "Patient" ADD COLUMN "privacyConsentVersion" TEXT;
