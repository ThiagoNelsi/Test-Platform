import { PrismaClient as PrismaPostgresClient } from "@/prisma/generated/postgres";
import { PrismaClient as PrismaMongoClient } from "@/prisma/generated/mongodb";  // Cliente para MongoDB (presumindo que você configurou o MongoDB no seu schema)

const globalForPostgres = global as unknown as { prismaPostgres: PrismaPostgresClient };
const globalForMongo = global as unknown as { prismaMongo: PrismaMongoClient };

export const prisma =
  globalForPostgres.prismaPostgres || new PrismaPostgresClient();

export const prismaMongo =
  globalForMongo.prismaMongo || new PrismaMongoClient();

if (process.env.NODE_ENV !== "production") {
  globalForPostgres.prismaPostgres = prisma;
  globalForMongo.prismaMongo = prismaMongo;
}