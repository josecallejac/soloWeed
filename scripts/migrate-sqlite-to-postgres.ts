import { DatabaseSync } from "node:sqlite";
import path from "node:path";
import { prisma } from "../src/lib/prisma";

// Migración histórica one-shot SQLite -> PostgreSQL (2026-07-12).
// Lee la BD legada en modo SOLO LECTURA y copia todas las tablas al Postgres
// apuntado por DATABASE_URL, preservando IDs, y resetea las secuencias al final.
//
// Uso:
//   npx tsx scripts/migrate-sqlite-to-postgres.ts            # aborta si Postgres tiene datos
//   npx tsx scripts/migrate-sqlite-to-postgres.ts --force-truncate  # vacía Postgres primero
//
// La SQLite de origen (SQLITE_PATH, default prisma/dev_recovered.db) tiene
// fechas en formato MIXTO: filas escritas por Prisma son epoch-ms INTEGER;
// filas escritas por raw SQL con CURRENT_TIMESTAMP son TEXT "YYYY-MM-DD
// HH:MM:SS" en UTC (User, MatchDecision). toDate() normaliza ambos.

const SQLITE_PATH = process.env.SQLITE_PATH ?? path.join("prisma", "dev_recovered.db");
const FORCE_TRUNCATE = process.argv.includes("--force-truncate");
const BATCH_SIZE = 1000;

type TableSpec = {
  table: string;
  model: "store" | "product" | "user" | "offer" | "priceHistory" | "matchDecision" | "outboundClick" | "session";
  dateColumns: string[];
  boolColumns: string[];
};

// Orden de inserción respetando FKs: Store/Product/User primero, luego Offer
// (FK store + product opcional), luego PriceHistory (FK offer) y el resto.
const TABLES: TableSpec[] = [
  { table: "Store", model: "store", dateColumns: ["createdAt", "updatedAt"], boolColumns: ["enabled"] },
  { table: "Product", model: "product", dateColumns: ["createdAt", "updatedAt"], boolColumns: [] },
  { table: "User", model: "user", dateColumns: ["createdAt", "updatedAt"], boolColumns: [] },
  { table: "Offer", model: "offer", dateColumns: ["lastSeenAt", "createdAt", "updatedAt"], boolColumns: ["inStock"] },
  { table: "PriceHistory", model: "priceHistory", dateColumns: ["recordedAt"], boolColumns: ["inStock"] },
  { table: "MatchDecision", model: "matchDecision", dateColumns: ["createdAt", "updatedAt"], boolColumns: [] },
  { table: "OutboundClick", model: "outboundClick", dateColumns: ["createdAt"], boolColumns: [] },
  { table: "Session", model: "session", dateColumns: ["expiresAt", "createdAt"], boolColumns: [] },
];

function toDate(value: unknown): Date {
  if (typeof value === "number" || typeof value === "bigint") return new Date(Number(value)); // epoch ms
  return new Date(`${String(value).replace(" ", "T")}Z`); // "YYYY-MM-DD HH:MM:SS" es UTC
}

function transformRow(row: Record<string, unknown>, spec: TableSpec) {
  const out: Record<string, unknown> = { ...row };
  for (const col of spec.dateColumns) {
    if (out[col] !== null && out[col] !== undefined) out[col] = toDate(out[col]);
  }
  for (const col of spec.boolColumns) {
    if (out[col] !== null && out[col] !== undefined) out[col] = Boolean(Number(out[col]));
  }
  return out;
}

async function main() {
  const sqlite = new DatabaseSync(SQLITE_PATH, { readOnly: true });
  console.log(`origen: ${SQLITE_PATH} (solo lectura)`);
  console.log(`destino: Postgres via DATABASE_URL`);

  // Guard: no pisar datos existentes sin pedirlo explícitamente.
  const existing: Array<{ table: string; count: number }> = [];
  for (const spec of TABLES) {
    const rows = await prisma.$queryRawUnsafe<Array<{ cnt: bigint }>>(`SELECT COUNT(*) as "cnt" FROM "${spec.table}"`);
    const count = Number(rows[0].cnt);
    if (count > 0) existing.push({ table: spec.table, count });
  }
  if (existing.length > 0) {
    if (!FORCE_TRUNCATE) {
      console.error("Postgres NO está vacío. Tablas con datos:");
      for (const e of existing) console.error(`  ${e.table}: ${e.count}`);
      console.error("Usa --force-truncate para vaciarlas primero.");
      process.exitCode = 1;
      return;
    }
    const allTables = TABLES.map((s) => `"${s.table}"`).join(", ");
    console.log(`--force-truncate: TRUNCATE ${allTables} RESTART IDENTITY CASCADE`);
    await prisma.$executeRawUnsafe(`TRUNCATE ${allTables} RESTART IDENTITY CASCADE`);
  }

  const counts: Array<{ table: string; sqlite: number; postgres: number }> = [];

  for (const spec of TABLES) {
    const rows = sqlite.prepare(`SELECT * FROM "${spec.table}"`).all() as Record<string, unknown>[];
    let inserted = 0;
    for (let i = 0; i < rows.length; i += BATCH_SIZE) {
      const batch = rows.slice(i, i + BATCH_SIZE).map((row) => transformRow(row, spec));
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const result = await (prisma[spec.model] as any).createMany({ data: batch });
      inserted += result.count;
    }
    const pgRows = await prisma.$queryRawUnsafe<Array<{ cnt: bigint }>>(`SELECT COUNT(*) as "cnt" FROM "${spec.table}"`);
    counts.push({ table: spec.table, sqlite: rows.length, postgres: Number(pgRows[0].cnt) });
    console.log(`${spec.table}: ${rows.length} filas SQLite -> ${inserted} insertadas`);
  }

  // Las inserciones con id explícito no avanzan las secuencias: resetearlas.
  for (const spec of TABLES) {
    await prisma.$executeRawUnsafe(
      `SELECT setval(pg_get_serial_sequence('"${spec.table}"','id'), COALESCE((SELECT MAX("id") FROM "${spec.table}"), 0) + 1, false)`
    );
  }
  console.log("secuencias reseteadas");

  console.log("\n=== VERIFICACIÓN DE CONTEOS ===");
  let ok = true;
  for (const c of counts) {
    const match = c.sqlite === c.postgres;
    if (!match) ok = false;
    console.log(`  ${match ? "OK " : "MAL"} ${c.table}: sqlite=${c.sqlite} postgres=${c.postgres}`);
  }
  if (!ok) {
    console.error("\nLOS CONTEOS NO CUADRAN — revisar antes de seguir.");
    process.exitCode = 1;
  } else {
    console.log("\nMigración completa: todos los conteos cuadran.");
  }

  sqlite.close();
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
