import { PrismaClient } from "@/generated/prisma/client/client";
import { PrismaPg } from "@prisma/adapter-pg";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

function createPrismaClient() {
  const connectionUrl = new URL(process.env.DATABASE_URL!);
  connectionUrl.searchParams.set("sslmode", "no-verify");

  const adapter = new PrismaPg({
    connectionString: connectionUrl.toString(),
    ssl: { rejectUnauthorized: false },
  });
  return new PrismaClient({ adapter });
}

export const prisma = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
