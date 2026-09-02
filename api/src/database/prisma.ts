import { PrismaClient } from '@prisma/client';
import { PrismaNeon } from '@prisma/adapter-neon';
import { neonConfig } from '@neondatabase/serverless';
import ws from 'ws';
import { getRequiredEnv } from '../config/env';

let neonConfigured = false;

function configureNeonTransport(): void {
  if (neonConfigured) {
    return;
  }

  neonConfig.webSocketConstructor = ws;
  neonConfig.poolQueryViaFetch = true;
  neonConfigured = true;
}

export function createPrismaAdapter(connectionString: string): PrismaNeon {
  configureNeonTransport();
  return new PrismaNeon({ connectionString });
}

export function createPrismaClient(connectionString: string = getRequiredEnv('DATABASE_URL_POSTGRES')): PrismaClient {
  return new PrismaClient({
    adapter: createPrismaAdapter(connectionString),
    log: ['error', 'warn', 'info', 'query'],
  });
}
