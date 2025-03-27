/*
  Warnings:

  - You are about to drop the `TestInstance` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "TestInstance" DROP CONSTRAINT "TestInstance_testId_fkey";

-- DropForeignKey
ALTER TABLE "TestInstance" DROP CONSTRAINT "TestInstance_userId_fkey";

-- AlterTable
ALTER TABLE "Test" ALTER COLUMN "name" SET DEFAULT 'Sem título';

-- DropTable
DROP TABLE "TestInstance";

-- CreateTable
CREATE TABLE "Submission" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "testId" INTEGER NOT NULL,
    "startTime" TIMESTAMPTZ(0) DEFAULT CURRENT_TIMESTAMP,
    "finishTime" TIMESTAMPTZ(0),
    "score" DOUBLE PRECISION,
    "answers" JSONB NOT NULL DEFAULT '{}',
    "sections" JSONB NOT NULL,

    CONSTRAINT "Submission_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "Submission" ADD CONSTRAINT "Submission_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Submission" ADD CONSTRAINT "Submission_testId_fkey" FOREIGN KEY ("testId") REFERENCES "Test"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
