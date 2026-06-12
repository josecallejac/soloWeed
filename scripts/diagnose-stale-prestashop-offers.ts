// Diagnostico de ofertas obsoletas en tiendas PrestaShop (Piranha, GrowBarato).
// Un producto eliminado en PrestaShop responde 301 hacia su categoria padre
// (URL sin ".html"), en vez de 404. Este script detecta esos casos.
//
// Dry-run por defecto. Con --apply marca las ofertas detectadas como
// inStock=false y agrega una fila a PriceHistory (no elimina ni desvincula nada).
//
// Uso:
//   npx tsx scripts/diagnose-stale-prestashop-offers.ts
//   npx tsx scripts/diagnose-stale-prestashop-offers.ts --apply
//   $env:STALE_STORES="piranha"; npx tsx scripts/diagnose-stale-prestashop-offers.ts

import { prisma } from "../src/lib/prisma";

const APPLY = process.argv.includes("--apply");
const STORES = (process.env.STALE_STORES ?? "piranha,growbarato")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);
const DELAY_MS = Number(process.env.STALE_DELAY_MS ?? "300");
const CONCURRENCY = 4;

type Verdict = {
  offerId: number;
  store: string;
  title: string;
  url: string;
  productId: number | null;
  inStock: boolean;
  status: "ok" | "stale" | "error";
  detail: string;
};

function isProductUrl(url: string): boolean {
  try {
    return new URL(url).pathname.endsWith(".html");
  } catch {
    return false;
  }
}

async function checkUrl(url: string): Promise<{ status: Verdict["status"]; detail: string }> {
  try {
    const res = await fetch(url, {
      redirect: "manual",
      headers: { "User-Agent": "Mozilla/5.0 (compatible; SoloWeedBot/1.0)" },
    });
    if (res.status >= 300 && res.status < 400) {
      const loc = res.headers.get("location") ?? "";
      const target = new URL(loc, url).toString();
      if (!isProductUrl(target)) {
        return { status: "stale", detail: `${res.status} -> ${target}` };
      }
      return { status: "ok", detail: `${res.status} -> ${target} (sigue siendo producto)` };
    }
    if (res.status === 404 || res.status === 410) {
      return { status: "stale", detail: `HTTP ${res.status}` };
    }
    if (res.status === 200) return { status: "ok", detail: "200" };
    return { status: "error", detail: `HTTP ${res.status}` };
  } catch (e) {
    return { status: "error", detail: String(e) };
  }
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function main() {
  const offers = await prisma.offer.findMany({
    where: { store: { slug: { in: STORES } } },
    include: { store: true },
    orderBy: { id: "asc" },
  });
  console.log(`Revisando ${offers.length} ofertas de [${STORES.join(", ")}]${APPLY ? " (APPLY)" : " (dry-run)"}`);

  const results: Verdict[] = [];
  let done = 0;
  const queue = [...offers];
  await Promise.all(
    Array.from({ length: CONCURRENCY }, async () => {
      for (;;) {
        const offer = queue.shift();
        if (!offer) return;
        const { status, detail } = await checkUrl(offer.url);
        results.push({
          offerId: offer.id,
          store: offer.store.slug,
          title: offer.title,
          url: offer.url,
          productId: offer.productId,
          inStock: offer.inStock,
          status,
          detail,
        });
        done++;
        if (done % 50 === 0) console.log(`  ${done}/${offers.length}...`);
        await sleep(DELAY_MS);
      }
    })
  );

  const stale = results.filter((r) => r.status === "stale");
  const errors = results.filter((r) => r.status === "error");

  console.log(`\n=== Obsoletas (${stale.length}) ===`);
  for (const r of stale) {
    console.log(
      `[${r.store}] offer ${r.offerId}${r.productId ? ` (product ${r.productId})` : ""} inStock=${r.inStock} | ${r.title}\n  ${r.url}\n  ${r.detail}`
    );
  }
  if (errors.length) {
    console.log(`\n=== Errores (${errors.length}) — revisar manualmente ===`);
    for (const r of errors) console.log(`[${r.store}] offer ${r.offerId} | ${r.url} | ${r.detail}`);
  }

  const reportPath = "reports/stale-prestashop-offers.json";
  const { writeFileSync, mkdirSync } = await import("node:fs");
  mkdirSync("reports", { recursive: true });
  writeFileSync(reportPath, JSON.stringify({ generatedAt: new Date().toISOString(), stale, errors }, null, 2));
  console.log(`\nReporte: ${reportPath}`);

  if (!APPLY) {
    console.log("Dry-run: no se modifico nada. Corre con --apply para marcar sin stock.");
    return;
  }

  const toUpdate = stale.filter((r) => r.inStock);
  console.log(`\nMarcando ${toUpdate.length} ofertas como sin stock (${stale.length - toUpdate.length} ya estaban sin stock)...`);
  for (const r of toUpdate) {
    const offer = await prisma.offer.findUnique({ where: { id: r.offerId } });
    if (!offer || !offer.inStock) continue;
    await prisma.offer.update({
      where: { id: offer.id },
      data: { inStock: false, availability: "discontinued" },
    });
    await prisma.priceHistory.create({
      data: { offerId: offer.id, price: offer.price, originalPrice: offer.originalPrice, inStock: false },
    });
    console.log(`  offer ${offer.id} -> inStock=false`);
  }
  console.log("Listo.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
