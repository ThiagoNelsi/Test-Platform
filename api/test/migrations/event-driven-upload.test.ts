import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const migrationsDirectory = resolve(__dirname, '../../prisma/migrations');

function migration(name: string): string {
  return readFileSync(resolve(migrationsDirectory, name, 'migration.sql'), 'utf8');
}

describe('event-driven upload migrations', () => {
  it('commits new ResourceStatus values before using them', () => {
    const enumMigration = migration('20260925120000_event_driven_upload');
    const schemaMigration = migration('20260925120100_event_driven_upload_schema');

    expect(enumMigration).toContain("ADD VALUE IF NOT EXISTS 'PENDING_UPLOAD'");
    expect(enumMigration).toContain("ADD VALUE IF NOT EXISTS 'EXPIRED'");
    expect(enumMigration).not.toContain('ALTER TABLE');
    expect(enumMigration).not.toContain('CREATE INDEX');

    expect(schemaMigration).not.toContain('ALTER TYPE');
    expect(schemaMigration).toContain("SET DEFAULT 'PENDING_UPLOAD'");
    expect(schemaMigration).toContain("status NOT IN ('FAILED', 'EXPIRED')");
  });
});
