import { PrismaClient } from "@prisma/client";
import * as fs from "fs";
import * as path from "path";

interface CheckDbResult {
  success: boolean;
  totalProducts?: number;
  totalOffers?: number;
  totalStores?: number;
  distribution?: Record<number, number>;
  error?: string;
}

async function checkDb(dbPath: string): Promise<CheckDbResult> {
  const absolutePath = path.resolve(dbPath);
  const prisma = new PrismaClient({
    datasources: {
      db: {
        url: `file:${absolutePath}`,
      },
    },
  });

  try {
    const all = await prisma.product.findMany({
      include: {
        offers: true,
      },
    });

    const distribution: Record<number, number> = {};
    for (const p of all) {
      const stores = new Set(p.offers.map((o) => o.storeId));
      const cnt = stores.size;
      distribution[cnt] = (distribution[cnt] || 0) + 1;
    }

    const totalOffers = await prisma.offer.count();
    const totalStores = await prisma.store.count();

    await prisma.$disconnect();

    return {
      success: true,
      totalProducts: all.length,
      totalOffers,
      totalStores,
      distribution,
    };
  } catch (error: unknown) {
    await prisma.$disconnect();
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

async function main() {
  const dirs = [
    { dir: "./prisma", files: ["dev.db", "dev_recovered.db", "dev.db.bak", "dev.db.before-docs", "dev.db.checkpoint"] },
    { dir: "./backups", filter: "*.db" }
  ];

  const dbFiles: string[] = [];

  // Add prisma files
  for (const file of dirs[0].files!) {
    const p = path.join(dirs[0].dir, file);
    if (fs.existsSync(p)) {
      dbFiles.push(p);
    }
  }

  // Add backup files
  if (fs.existsSync("./backups")) {
    const backups = fs.readdirSync("./backups").filter(f => f.endsWith(".db"));
    for (const file of backups) {
      dbFiles.push(path.join("./backups", file));
    }
  }

  console.log("Analyzing all SQLite databases...");
  console.log("=================================================================================");
  console.log(
    String("Database").padEnd(45) +
    " | " +
    String("Products").padEnd(8) +
    " | " +
    String("Offers").padEnd(8) +
    " | " +
    String("Stores").padEnd(6) +
    " | " +
    "Distribution (1, 2, 3, 4 stores)"
  );
  console.log("=================================================================================");

  for (const dbFile of dbFiles) {
    const res = await checkDb(dbFile);
    if (res.success) {
      const distStr = `1s:${res.distribution?.[1] || 0}, 2s:${res.distribution?.[2] || 0}, 3s:${res.distribution?.[3] || 0}, 4s:${res.distribution?.[4] || 0}`;
      console.log(
        `${dbFile.padEnd(45)} | ${String(res.totalProducts).padEnd(8)} | ${String(res.totalOffers).padEnd(8)} | ${String(res.totalStores).padEnd(6)} | ${distStr}`
      );
    } else {
      console.log(`${dbFile.padEnd(45)} | Error: ${res.error?.substring(0, 40)}`);
    }
  }
}

main().catch(console.error);
