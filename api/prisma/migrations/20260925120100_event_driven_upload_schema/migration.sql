-- Add the upload lifecycle without replacing legacy Resource primary keys.
-- The enum values used below were committed by the preceding migration.
ALTER TABLE "Resource"
  ADD COLUMN "documentId" UUID,
  ADD COLUMN "fileSize" INTEGER,
  ADD COLUMN "fileHash" TEXT,
  ADD COLUMN "updatedAt" TIMESTAMPTZ(0) NOT NULL DEFAULT CURRENT_TIMESTAMP;

UPDATE "Resource" SET "documentId" = gen_random_uuid() WHERE "documentId" IS NULL;

ALTER TABLE "Resource"
  ALTER COLUMN "documentId" SET NOT NULL,
  ALTER COLUMN "updatedAt" DROP DEFAULT,
  ALTER COLUMN status SET DEFAULT 'PENDING_UPLOAD';

CREATE UNIQUE INDEX "Resource_documentId_key" ON "Resource"("documentId");
CREATE UNIQUE INDEX "Resource_objectKey_key" ON "Resource"("objectKey");
CREATE INDEX "Resource_ownerId_fileHash_idx" ON "Resource"("ownerId", "fileHash");
CREATE UNIQUE INDEX "Resource_ownerId_fileHash_active_key"
ON "Resource"("ownerId", "fileHash")
WHERE "fileHash" IS NOT NULL AND "deletedAt" IS NULL
  AND status NOT IN ('FAILED', 'EXPIRED');
