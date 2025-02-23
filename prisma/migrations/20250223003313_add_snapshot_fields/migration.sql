-- AlterTable
ALTER TABLE "Question" ADD COLUMN     "originalQuestionId" INTEGER,
ADD COLUMN     "version" INTEGER NOT NULL DEFAULT 1;

-- AddForeignKey
ALTER TABLE "Question" ADD CONSTRAINT "Question_originalQuestionId_fkey" FOREIGN KEY ("originalQuestionId") REFERENCES "Question"("id") ON DELETE SET NULL ON UPDATE CASCADE;
