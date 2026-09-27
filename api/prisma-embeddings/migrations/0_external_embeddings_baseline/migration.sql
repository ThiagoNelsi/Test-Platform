-- The legacy embeddings table predates Prisma Migrate and is provisioned
-- outside this repository. Mark this migration as applied once on existing
-- databases before running migrate deploy. It intentionally does not create
-- the legacy table because its original DDL is not recorded here.
DO $$
BEGIN
  IF to_regclass('public.embeddings') IS NULL THEN
    RAISE EXCEPTION 'The pre-existing public.embeddings table is required before applying embeddings migrations';
  END IF;
END
$$;
