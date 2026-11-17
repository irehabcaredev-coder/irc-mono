-- Countries are stored as ISO 3166-1 alpha-3 codes. Everything that existed before is Indian.
ALTER TABLE "City" ADD COLUMN "country" TEXT NOT NULL DEFAULT 'IND';
ALTER TABLE "Doctor" ADD COLUMN "country" TEXT NOT NULL DEFAULT 'IND';
ALTER TABLE "Patient" ADD COLUMN "country" TEXT NOT NULL DEFAULT 'IND';

DROP INDEX "City_name_state_key";
CREATE UNIQUE INDEX "City_name_state_country_key" ON "City"("name", "state", "country");
CREATE INDEX "City_country_idx" ON "City"("country");

-- Profiles that name a US city (found by reviewing the existing data)
UPDATE "Doctor" SET "country" = 'USA', "state" = 'Colorado' WHERE "city" = 'Aurora' AND "state" = 'CO';
