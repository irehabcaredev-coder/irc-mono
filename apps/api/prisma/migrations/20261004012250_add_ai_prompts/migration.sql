-- CreateEnum
CREATE TYPE "AiPromptRole" AS ENUM ('DOCTOR', 'PATIENT');

-- CreateTable
CREATE TABLE "AiPrompt" (
    "role" "AiPromptRole" NOT NULL,
    "content" TEXT NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AiPrompt_pkey" PRIMARY KEY ("role")
);
