import { PrismaClient as PrismaPostgresClient } from "@/prisma/generated/postgres";

const globalForPostgres = global as unknown as { prismaPostgres: PrismaPostgresClient };

export const prisma =
  globalForPostgres.prismaPostgres || new PrismaPostgresClient();

if (process.env.NODE_ENV !== "production") {
  globalForPostgres.prismaPostgres = prisma;
}