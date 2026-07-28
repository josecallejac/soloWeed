import { prisma } from "../src/lib/prisma";
import { classifyProduct } from "./scrape";
import { writeFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";

// Diagnóstico (NUNCA escribe en la BD): pares de ofertas huérfanas entre tiendas
// distintas con similitud Jaccard de título dentro de [PAIR_MIN_SIM, PAIR_MAX_SIM).
// Salida: consola + reports/catalog-audit/orphan-pairs-<min>-<max>.csv.
// Aplicar solo via script revisado estilo apply-orphan-pairs-r*.ts.
//
// Uso: $env:PAIR_MIN_SIM="0.45"; $env:PAIR_MAX_SIM="0.55"; npx tsx scripts/diagnose-orphan-pairs.ts

const MIN_SIM = Number(process.env.PAIR_MIN_SIM ?? 0.45);
const MAX_SIM = Number(process.env.PAIR_MAX_SIM ?? 0.55);
const MAX_PRICE_RATIO = Number(process.env.PAIR_MAX_PRICE_RATIO ?? 3);

const GENERIC_WORDS = new Set([
  "pipa", "pipas", "pipe", "moledor", "grinder", "bong", "bongs", "rig",
  "papelillo", "papelillos", "filtro", "filtros", "boquilla", "boquillas",
  "bandeja", "cenicero", "encendedor", "soplete", "contenedor", "estuche",
  "accesorio", "accesorios", "vaporizador", "vaporizadores",
  "el", "la", "de", "del", "en", "para", "con", "und", "the",
]);

function tokenize(text: string): Set<string> {
  return new Set(
    text
      .toLowerCase()
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "")
      .replace(/&amp;/g, "&")
      .replace(/[^a-z0-9\s]/g, " ")
      .split(/\s+/)
      .filter((t) => t.length > 1 && !GENERIC_WORDS.has(t))
  );
}

function jaccard(a: Set<string>, b: Set<string>): number {
  const inter = [...a].filter((x) => b.has(x)).length;
  const union = new Set([...a, ...b]).size;
  return union === 0 ? 0 : inter / union;
}

async function main() {
  console.log(`=== Pares huérfano-huérfano Jaccard [${MIN_SIM}, ${MAX_SIM}) ===\n`);

  const allOrphans = await prisma.offer.findMany({
    where: { productId: null },
    include: { store: true },
  });
  // Las ofertas fuera de alcance (desechables de sabores, cultivo, comestibles)
  // siguen en la BD a proposito: despublicar es reversible y nunca se borra una
  // Offer. Pero como grupo son casi identicas entre si, generan pares de
  // similitud altisima y valor cero -- 653 al 27 jul 2026. Se filtran aqui con
  // el MISMO clasificador del scraper, no con una lista aparte que se desincronice.
  const orphans = allOrphans.filter(
    (o) => classifyProduct(o.title, o.url, o.sourceCategory ?? undefined) !== null,
  );
  const fueraDeAlcance = allOrphans.length - orphans.length;
  console.log(`${orphans.length} ofertas huérfanas (${fueraDeAlcance} descartadas por estar fuera de alcance)\n`);

  const withTokens = orphans.map((o) => ({ o, tokens: tokenize(o.title) }));

  type Pair = {
    sim: number;
    a: (typeof orphans)[number];
    b: (typeof orphans)[number];
    priceRatio: number;
  };
  const pairs: Pair[] = [];

  for (let i = 0; i < withTokens.length; i++) {
    for (let j = i + 1; j < withTokens.length; j++) {
      const A = withTokens[i], B = withTokens[j];
      if (A.o.storeId === B.o.storeId) continue;
      if (A.o.category !== B.o.category) continue;
      if (A.o.brandKey && B.o.brandKey && A.o.brandKey !== B.o.brandKey) continue;
      const sim = jaccard(A.tokens, B.tokens);
      if (sim < MIN_SIM || sim >= MAX_SIM) continue;
      const priceRatio =
        Math.max(A.o.price, B.o.price) / Math.max(1, Math.min(A.o.price, B.o.price));
      if (priceRatio > MAX_PRICE_RATIO) continue;
      pairs.push({ sim, a: A.o, b: B.o, priceRatio });
    }
  }

  pairs.sort((x, y) => y.sim - x.sim);
  console.log(`${pairs.length} pares candidatos\n`);

  for (const p of pairs) {
    console.log(
      `sim=${p.sim.toFixed(2)} ratio=${p.priceRatio.toFixed(2)} [${p.a.category}] bk=${p.a.brandKey ?? "?"}/${p.b.brandKey ?? "?"}`
    );
    console.log(`   ${p.a.id.toString().padStart(6)} ${p.a.store.name.padEnd(15)} $${p.a.price} ${p.a.title}`);
    console.log(`        img: ${p.a.imageUrl ?? "-"}`);
    console.log(`   ${p.b.id.toString().padStart(6)} ${p.b.store.name.padEnd(15)} $${p.b.price} ${p.b.title}`);
    console.log(`        img: ${p.b.imageUrl ?? "-"}\n`);
  }

  const dir = join(process.cwd(), "reports", "catalog-audit");
  mkdirSync(dir, { recursive: true });
  const file = join(dir, `orphan-pairs-${MIN_SIM}-${MAX_SIM}.csv`);
  const esc = (s: string) => `"${s.replace(/"/g, '""')}"`;
  const rows = pairs.map((p) =>
    [
      p.sim.toFixed(2), p.a.category, p.a.brandKey ?? "", p.b.brandKey ?? "",
      p.a.id, esc(p.a.store.name), p.a.price, esc(p.a.title), esc(p.a.imageUrl ?? ""),
      p.b.id, esc(p.b.store.name), p.b.price, esc(p.b.title), esc(p.b.imageUrl ?? ""),
      p.priceRatio.toFixed(2),
    ].join(",")
  );
  writeFileSync(
    file,
    ["sim,category,brandKeyA,brandKeyB,idA,storeA,priceA,titleA,imgA,idB,storeB,priceB,titleB,imgB,priceRatio", ...rows].join("\n"),
    "utf-8"
  );
  console.log(`CSV: ${file}`);
  await prisma.$disconnect();
}

main().catch((err) => { console.error(err); process.exit(1); });
