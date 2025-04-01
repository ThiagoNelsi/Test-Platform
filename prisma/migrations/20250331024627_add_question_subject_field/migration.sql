/*
  Warnings:

  - Made the column `startTime` on table `Submission` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterTable
ALTER TABLE "Question" ADD COLUMN     "subjects" TEXT[];

-- AlterTable
ALTER TABLE "Submission" ALTER COLUMN "startTime" SET NOT NULL;
