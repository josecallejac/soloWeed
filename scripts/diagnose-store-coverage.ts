/**
 * COBERTURA DE UNA TIENDA: que hay en su sitemap que NO esta en la BD, y por
 * que motivo el scraper no lo guarda.
 *
 * SOLO LECTURA: no escribe en la BD. Reutiliza los filtros REALES del scraper
 * (no una replica), que es la unica forma de tener un diagnostico fiable: una
 * replica manual da falsos positivos porque las keywords se comparan con
 * `includes` sobre la URL entera (el dominio "kushbreak" contiene "kush") pero
 * las marcas se comparan por TOKENS exactos (getCandidateBrandKey).
 *
 * Motivos que distingue, en el mismo orden en que el scraper descarta:
 *   1 url-no-producto  isAllowedUrl / isLikelyProductUrl (categorias, blog, legales)
 *   2 sin-senal        isPotentialCandidate: ni CANDIDATE_KEYWORDS ni marca conocida
 *   3 excluida         pasa los filtros pero classifyProduct devuelve null
 *   4 deberia-estar    pasa todo -> hay otro bug (p.ej. corte de candidatos)
 *
 * El motivo 2 es el agujero de cobertura: esas URLs ni siquiera se visitan.
 *
 * Uso:
 *   npx tsx scripts/diagnose-store-coverage.ts
 *   $env:COVERAGE_STORE="fumetas"; npx tsx scripts/diagnose-store-coverage.ts
 *   $env:COVERAGE_TITLES="0"; npx tsx scripts/diagnose-store-coverage.ts   # sin red
 *
 * Env:
 *   COVERAGE_STORE   slug de la tienda            (default "kushbreak")
 *   COVERAGE_TITLES  bajar titulo de las que pasan (default "1")
 *   COVERAGE_DELAY_MS pausa entre fetches          (default 700)
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { load } from "cheerio";

import { prisma } from "../src/lib/prisma";
import {
  STORES,
  classifyProduct,
  fetchSitemapUrls,
  fetchText,
  isAllowedUrl,
  isLikelyProductUrl,
  isPotentialCandidate,
} from "./scrape";

const STORE_SLUG = process.env.COVERAGE_STORE ?? "kushbreak";
const FETCH_TITLES = (process.env.COVERAGE_TITLES ?? "1") !== "0";
const DELAY_MS = Number(process.env.COVERAGE_DELAY_MS ?? "700");

type Reason = "url-no-producto" | "sin-senal" | "excluida" | "deberia-estar";

type Row = { url: string; reason: Reason; title: string; category: string };

function normalizeUrlForCompare(url: string): string {
  return url.split("?")[0].replace(/\/$/, "").toLowerCase();
}

async function main() {
  const store = STORES.find((s) => s.slug === STORE_SLUG);
  if (!store) throw new Error(`tienda desconocida en STORES: ${STORE_SLUG}`);
  const storeRow = await prisma.store.findFirst({ where: { slug: STORE_SLUG } });
  if (!storeRow) throw new Error(`tienda sin fila en la BD: ${STORE_SLUG}`);

  const known = new Set(
    (await prisma.offer.findMany({ where: { storeId: storeRow.id }, select: { url: true } })).map((o) =>
      normalizeUrlForCompare(o.url),
    ),
  );

  const sitemapUrls = new Set<string>();
  for (const sitemapUrl of store.sitemapUrls) {
    for (const url of await fetchSitemapUrls(sitemapUrl)) sitemapUrls.add(url);
  }

  const missing = [...sitemapUrls].filter((url) => !known.has(normalizeUrlForCompare(url)));
  console.log(
    `${store.name}: ${sitemapUrls.size} URLs en el sitemap | ${known.size} ofertas en la BD | ${missing.length} ausentes\n`,
  );

  const rows: Row[] = [];
  const pending: string[] = [];

  for (const url of missing) {
    if (!isAllowedUrl(url, store.baseUrl) || !isLikelyProductUrl(url)) {
      rows.push({ url, reason: "url-no-producto", title: "", category: "" });
      continue;
    }
    if (!isPotentialCandidate(url)) {
      rows.push({ url, reason: "sin-senal", title: "", category: "" });
      continue;
    }
    pending.push(url);
  }

  // Las que pasan los filtros de URL: hace falta el titulo real para saber si
  // classifyProduct las aceptaria (el scraper visita la pagina en este punto).
  for (const url of pending) {
    let title = "";
    if (FETCH_TITLES) {
      try {
        const html = await fetchText(url);
        const $ = load(html);
        title = ($("meta[property='og:title']").attr("content") ?? $("h1").first().text() ?? "").trim();
      } catch {
        title = "";
      }
      await new Promise((r) => setTimeout(r, DELAY_MS));
    }
    const category = title ? classifyProduct(title, url) : null;
    rows.push({
      url,
      reason: title && !category ? "excluida" : "deberia-estar",
      title,
      category: category ?? "",
    });
  }

  const byReason = new Map<Reason, Row[]>();
  for (const row of rows) {
    if (!byReason.has(row.reason)) byReason.set(row.reason, []);
    byReason.get(row.reason)!.push(row);
  }

  const order: Reason[] = ["sin-senal", "excluida", "deberia-estar", "url-no-producto"];
  for (const reason of order) {
    const list = byReason.get(reason) ?? [];
    console.log(`=== ${reason}: ${list.length} ===`);
    // url-no-producto es ruido esperado (categorias/blog/legales): solo el conteo.
    if (reason === "url-no-producto") continue;
    for (const row of list) {
      const path = row.url.replace(store.baseUrl, "");
      console.log(`  ${path}${row.title ? `  | ${row.title.slice(0, 50)}` : ""}${row.category ? ` -> ${row.category}` : ""}`);
    }
    console.log();
  }

  mkdirSync("reports", { recursive: true });
  writeFileSync(
    `reports/store-coverage-${STORE_SLUG}.csv`,
    [
      "reason,url,title,category",
      ...rows.map((r) => [r.reason, r.url, `"${r.title.replace(/"/g, "'")}"`, r.category].join(",")),
    ].join("\n"),
  );
  console.log(`Reporte: reports/store-coverage-${STORE_SLUG}.csv`);
  await prisma.$disconnect();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
