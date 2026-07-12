import { gzipSync, gunzipSync } from "node:zlib";
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import path from "node:path";
import { prisma } from "../src/lib/prisma";

// Dump/restore lógico de la BD Postgres viva a backups/<name>.json.gz vía
// Prisma (sin depender de pg_dump, que no está instalado en Windows).
// Lo invocan snapshot-save.ps1 / snapshot-restore.ps1 cuando DATABASE_URL es
// postgres. Restaura con TRUNCATE + insert preservando IDs + reset de
// secuencias (mismo patrón que migrate-sqlite-to-postgres.ts).
//
// Uso:
//   npx tsx scripts/pg-snapshot.ts dump <name>
//   npx tsx scripts/pg-snapshot.ts restore <name>

type TableSpec = {
  table: string;
  model: "store" | "product" | "user" | "offer" | "priceHistory" | "matchDecision" | "outboundClick" | "session";
  dateColumns: string[];
};

// Orden de inserción respetando FKs (el dump usa el mismo orden).
const TABLES: TableSpec[] = [
  { table: "Store", model: "store", dateColumns: ["createdAt", "updatedAt"] },
  { table: "Product", model: "product", dateColumns: ["createdAt", "updatedAt"] },
  { table: "User", model: "user", dateColumns: ["createdAt", "updatedAt"] },
  { table: "Offer", model: "offer", dateColumns: ["lastSeenAt", "createdAt", "updatedAt"] },
  { table: "PriceHistory", model: "priceHistory", dateColumns: ["recordedAt"] },
  { table: "MatchDecision", model: "matchDecision", dateColumns: ["createdAt", "updatedAt"] },
  { table: "OutboundClick", model: "outboundClick", dateColumns: ["createdAt"] },
  { table: "Session", model: "session", dateColumns: ["expiresAt", "createdAt"] },
];

const BATCH_SIZE = 1000;

function backupPath(name: string) {
  return path.join("backups", `${name}.json.gz`);
}

async function dump(name: string) {
  mkdirSync("backups", { recursive: true });
  const payload: Record<string, unknown[]> = {};
  for (const spec of TABLES) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    payload[spec.table] = await (prisma[spec.model] as any).findMany({ orderBy: { id: "asc" } });
  }
  const file = backupPath(name);
  writeFileSync(file, gzipSync(Buffer.from(JSON.stringify(payload))));
  const metrics = {
    checkpoint: name,
    date: new Date().toISOString(),
    offers: payload.Offer.length,
    products: payload.Product.length,
    stores: payload.Store.length,
    curatedOffers: (payload.Offer as Array<{ productId: number | null }>).filter((o) => o.productId !== null).length,
  };
  console.log(JSON.stringify(metrics));
}

async function restore(name: string) {
  const file = backupPath(name);
  const payload = JSON.parse(gunzipSync(readFileSync(file)).toString()) as Record<string, Record<string, unknown>[]>;

  const allTables = TABLES.map((s) => `"${s.table}"`).join(", ");
  await prisma.$executeRawUnsafe(`TRUNCATE ${allTables} RESTART IDENTITY CASCADE`);

  for (const spec of TABLES) {
    const rows = (payload[spec.table] ?? []).map((row) => {
      const out: Record<string, unknown> = { ...row };
      for (const col of spec.dateColumns) {
        if (out[col] !== null && out[col] !== undefined) out[col] = new Date(String(out[col]));
      }
      return out;
    });
    for (let i = 0; i < rows.length; i += BATCH_SIZE) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (prisma[spec.model] as any).createMany({ data: rows.slice(i, i + BATCH_SIZE) });
    }
    console.log(`${spec.table}: ${rows.length} filas restauradas`);
  }

  for (const spec of TABLES) {
    await prisma.$executeRawUnsafe(
      `SELECT setval(pg_get_serial_sequence('"${spec.table}"','id'), COALESCE((SELECT MAX("id") FROM "${spec.table}"), 0) + 1, false)`
    );
  }
  console.log("secuencias reseteadas");
}

async function main() {
  const [mode, name] = process.argv.slice(2);
  if (!name || (mode !== "dump" && mode !== "restore")) {
    console.error("uso: npx tsx scripts/pg-snapshot.ts <dump|restore> <name>");
    process.exitCode = 1;
    return;
  }
  if (mode === "dump") await dump(name);
  else await restore(name);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
