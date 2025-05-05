-- CreateTable
CREATE TABLE "RepositoryQuestion" (
    "id" SERIAL NOT NULL,
    "createdAt" TIMESTAMPTZ(0) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deletedAt" TIMESTAMPTZ(0),
    "type" TEXT NOT NULL,
    "level" INTEGER,
    "content" JSONB NOT NULL DEFAULT '{}',
    "subjects" TEXT[],
    "tags" TEXT[],
    "source" TEXT,

    CONSTRAINT "RepositoryQuestion_pkey" PRIMARY KEY ("id")
);
