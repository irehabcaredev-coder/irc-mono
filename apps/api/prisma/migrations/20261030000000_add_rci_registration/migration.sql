-- CreateTable
CREATE TABLE "RciRegistration" (
    "id" TEXT NOT NULL,
    "registrationNo" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "address" TEXT,
    "state" TEXT,
    "contactMasked" TEXT,
    "isActive" BOOLEAN NOT NULL,
    "qualification" TEXT,
    "registeredAs" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RciRegistration_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "RciRegistration_registrationNo_key" ON "RciRegistration"("registrationNo");

-- CreateIndex
CREATE INDEX "RciRegistration_state_idx" ON "RciRegistration"("state");
