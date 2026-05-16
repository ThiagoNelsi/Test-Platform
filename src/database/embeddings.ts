import postgres, { type Sql } from 'postgres';

export function createEmbeddingsClient(connectionString: string): Sql {
  return postgres(connectionString);
}
