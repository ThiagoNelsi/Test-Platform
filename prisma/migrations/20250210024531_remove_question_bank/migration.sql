/*
  Warnings:

  - You are about to drop the `QuestionBank` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `_QuestionToQuestionBank` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "QuestionBank" DROP CONSTRAINT "QuestionBank_ownerId_fkey";

-- DropForeignKey
ALTER TABLE "_QuestionToQuestionBank" DROP CONSTRAINT "_QuestionToQuestionBank_A_fkey";

-- DropForeignKey
ALTER TABLE "_QuestionToQuestionBank" DROP CONSTRAINT "_QuestionToQuestionBank_B_fkey";

-- DropTable
DROP TABLE "QuestionBank";

-- DropTable
DROP TABLE "_QuestionToQuestionBank";
