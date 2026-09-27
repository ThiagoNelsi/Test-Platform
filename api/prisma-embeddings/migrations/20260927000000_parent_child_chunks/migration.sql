-- Existing embeddings remain readable: their parent_id and chunk_id stay NULL.
BEGIN;
CREATE TABLE IF NOT EXISTS embedding_parents (
  id text PRIMARY KEY,
  document text NOT NULL,
  content text NOT NULL,
  pages integer[] NOT NULL,
  heading text NOT NULL DEFAULT '',
  block_ids text[] NOT NULL DEFAULT '{}',
  chunking_version integer NOT NULL
);

CREATE INDEX IF NOT EXISTS embedding_parents_document_idx ON embedding_parents (document);

ALTER TABLE embeddings ADD COLUMN IF NOT EXISTS chunk_id text;
ALTER TABLE embeddings ADD COLUMN IF NOT EXISTS parent_id text;
ALTER TABLE embeddings ADD COLUMN IF NOT EXISTS heading text;
ALTER TABLE embeddings ADD COLUMN IF NOT EXISTS block_ids text[];
ALTER TABLE embeddings ADD COLUMN IF NOT EXISTS chunking_version integer;

CREATE UNIQUE INDEX IF NOT EXISTS embeddings_document_chunk_id_idx
  ON embeddings (document, chunk_id) WHERE chunk_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS embeddings_parent_id_idx ON embeddings (parent_id)
  WHERE parent_id IS NOT NULL;
COMMIT;
