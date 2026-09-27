import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';
import postgres from 'postgres';

const envFile = fileURLToPath(new URL('../.env', import.meta.url));
if (existsSync(envFile)) dotenv.config({ path: envFile });

const databaseUrl = process.env.EMBEDDINGS_DATABASE_URL;
if (!databaseUrl) throw new Error('EMBEDDINGS_DATABASE_URL is required');

const sql = postgres(databaseUrl, { max: 1 });
try {
  const rows = await sql`
    SELECT column_name
    FROM information_schema.columns
    WHERE table_schema = current_schema() AND table_name = 'embeddings'
  `;
  const columns = new Set(rows.map((row) => row.column_name));
  const missing = ['id', 'content', 'embedding', 'pages', 'document']
    .filter((column) => !columns.has(column));
  if (missing.length > 0) {
    throw new Error(`Existing embeddings table is missing required columns: ${missing.join(', ')}`);
  }
  console.info('Existing embeddings table confirmed; ready to mark its Prisma baseline as applied.');
} finally {
  await sql.end();
}
