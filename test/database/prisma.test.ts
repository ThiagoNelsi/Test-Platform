import { describe, expect, it } from 'vitest';
import { PrismaNeon } from '@prisma/adapter-neon';
import { createEmbeddingsClient } from '../../src/database/embeddings';
import { createPrismaAdapter, createPrismaClient } from '../../src/database/prisma';

describe('database helpers', () => {
  it('creates a Neon Prisma adapter', () => {
    const adapter = createPrismaAdapter('postgresql://localhost/test');

    expect(adapter).toBeInstanceOf(PrismaNeon);
  });

  it('creates a Prisma client', () => {
    const prisma = createPrismaClient('postgresql://localhost/test');

    expect(prisma).toHaveProperty('$disconnect');
  });

  it('creates a postgres SQL client', () => {
    const sql = createEmbeddingsClient('postgresql://localhost/test');

    expect(typeof sql).toBe('function');
  });
});
