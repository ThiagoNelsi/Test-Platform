import { PrismaClient } from "@prisma/client";
import { PrismaNeon } from "@prisma/adapter-neon";
import { Pool, neonConfig } from "@neondatabase/serverless";
import ws from "ws";

neonConfig.webSocketConstructor = ws;
neonConfig.poolQueryViaFetch = true;

const connectionString = process.env.DATABASE_URL_POSTGRES;
if (!connectionString) {
  throw new Error("DATABASE_URL_POSTGRES não definida no .env");
}

const pool = new Pool({ connectionString });
const adapter = new PrismaNeon(pool);

declare global {
  // eslint-disable-next-line no-var
  var prisma: PrismaClient | undefined;
}

const prisma = global.prisma ?? new PrismaClient({ 
  adapter,
  log: ["error", "warn", "info", "query"],
 });

if (process.env.NODE_ENV === "development") {
  global.prisma = prisma;
}

export default prisma;
