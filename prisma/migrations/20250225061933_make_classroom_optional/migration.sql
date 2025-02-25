/*
  Warnings:

  - A unique constraint covering the columns `[id,version]` on the table `Question` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[originalQuestionId,version]` on the table `Question` will be added. If there are existing duplicate values, this will fail.

*/
-- DropForeignKey
ALTER TABLE "Test" DROP CONSTRAINT "Test_classroomId_fkey";

-- AlterTable
ALTER TABLE "Test" ALTER COLUMN "classroomId" DROP NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "Question_id_version_key" ON "Question"("id", "version");

-- CreateIndex
CREATE UNIQUE INDEX "Question_originalQuestionId_version_key" ON "Question"("originalQuestionId", "version");

-- AddForeignKey
ALTER TABLE "Test" ADD CONSTRAINT "Test_classroomId_fkey" FOREIGN KEY ("classroomId") REFERENCES "Classroom"("id") ON DELETE SET NULL ON UPDATE CASCADE;
