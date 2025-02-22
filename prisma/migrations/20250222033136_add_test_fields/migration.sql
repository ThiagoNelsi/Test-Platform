-- AlterTable
ALTER TABLE "Test" ADD COLUMN     "description" TEXT,
ADD COLUMN     "publishDate" TIMESTAMPTZ(0),
ADD COLUMN     "sections" JSONB[],
ADD COLUMN     "status" TEXT NOT NULL DEFAULT 'draft';
