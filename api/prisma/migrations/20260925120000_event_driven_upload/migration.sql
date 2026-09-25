-- PostgreSQL requires newly-added enum values to be committed before they
-- can be used by defaults, indexes, or data changes in another transaction.
ALTER TYPE "ResourceStatus" ADD VALUE IF NOT EXISTS 'PENDING_UPLOAD' BEFORE 'UPLOADED';
ALTER TYPE "ResourceStatus" ADD VALUE IF NOT EXISTS 'EXPIRED' AFTER 'FAILED';
