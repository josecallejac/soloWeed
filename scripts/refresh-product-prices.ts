import { pathToFileURL } from "node:url";
import { load } from "cheerio";
import { prisma } from "../src/lib/prisma";
import {
  basePageUrl,
  extractOffer,
  fetchText,
  mapWithConcurrency,
  markOffersOutOfStock,
  SAVE_BATCH_SIZE,
  saveOffers,
  STORE_CONCURRENCY,
  type ScrapedOffer,
} from "./scrape";

// Refresco de precio/stock SOLO para ofertas vinculadas a un Product curado.
// No descubre candidatos nuevos ni crea ofertas: visita cada URL ya vinculada,
// re-extrae y guarda via saveOffers (que registra PriceHistory solo si cambia
// precio, precio original o stock). Las paginas que responden 404/410 se marcan
// sin stock (nunca se eliminan ni desvinculan, ver reglas del proyecto).
//
// Env:
//   REFRESH_STORES="astrogrowshop,fumetas"  filtra por slug de tienda
//   REFRESH_LIMIT="20"                       limita paginas por tienda (validacion)
//   REFRESH_STALE_HOURS="2"                  solo ofertas sin refrescar hace N horas (reanudar)
//   SCRAPE_DELAY_MS="350"                    pausa entre requests

const DELAY_MS = Number(process.env.SCRAPE_DELAY_MS ?? 350);
const LIMIT_PER_STORE = Number(process.env.REFRESH_LIMIT ?? 0);
const STORE_FILTER = new Set(
  (process.env.REFRESH_STORES ?? "")
    .split(",")
    .map((value) => value.trim().toLowerCase())
    .filter(Boolean),
);

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

type RefreshPage = {
  storeId: number;
  storeSlug: string;
  offerIds: number[];
  offerUrls: Set<string>;
  pageUrl: string;
};

type RefreshStats = {
  pages: number;
  saved: number;
  batches: number;
  gone: number;
  skipped: number;
  errors: number;
};

function isSoftRedirect(html: string, pageUrl: string) {
  const canonical = load(html)("link[rel='canonical']").attr("href");
  if (!canonical) {
    return false;
  }
  try {
    return new URL(canonical, pageUrl).pathname.replace(/\/$/, "") !== new URL(pageUrl).pathname.replace(/\/$/, "");
  } catch {
    return false;
  }
}

async function refreshStorePages(storeSlug: string, pages: RefreshPage[]) {
  const stats: RefreshStats = { pages: 0, saved: 0, batches: 0, gone: 0, skipped: 0, errors: 0 };
  const selectedPages = LIMIT_PER_STORE > 0 ? pages.slice(0, LIMIT_PER_STORE) : pages;
  const pendingOffers: ScrapedOffer[] = [];

  const flushPendingOffers = async () => {
    if (pendingOffers.length === 0) {
      return;
    }

    const batch = pendingOffers.splice(0, pendingOffers.length);
    const storeId = pages[0]?.storeId;
    if (storeId === undefined) {
      return;
    }
    await saveOffers(storeId, batch);
    stats.batches += 1;
    stats.saved += batch.length;
  };

  for (const entry of selectedPages) {
    stats.pages += 1;
    try {
      const html = await fetchText(entry.pageUrl);
      const scraped = extractOffer(html, entry.pageUrl);
      if (!scraped || scraped.length === 0) {
        if (isSoftRedirect(html, entry.pageUrl)) {
          await markOffersOutOfStock(entry.offerIds);
          stats.gone += 1;
          console.warn(`[gone] soft-redirect: ${entry.pageUrl}`);
        } else {
          stats.skipped += 1;
          console.warn(`[skip] sin oferta extraible: ${entry.pageUrl}`);
        }
        continue;
      }

      let selectedOffers = scraped.filter((offer) => entry.offerUrls.has(offer.url));
      if (entry.offerUrls.has(entry.pageUrl) && !scraped.some((offer) => offer.url === entry.pageUrl)) {
        const baseOnly = extractOffer(html, entry.pageUrl, { includeVariants: false });
        if (baseOnly) {
          selectedOffers = selectedOffers.concat(baseOnly.filter((offer) => entry.offerUrls.has(offer.url)));
        }
      }
      if (selectedOffers.length > 0) {
        pendingOffers.push(...selectedOffers);
      } else {
        stats.skipped += 1;
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      if (/HTTP (404|410)/.test(message)) {
        await markOffersOutOfStock(entry.offerIds);
        stats.gone += 1;
        console.warn(`[gone] marcada sin stock (${message}): ${entry.pageUrl}`);
      } else {
        stats.errors += 1;
        console.warn(`[error] ${message}: ${entry.pageUrl}`);
      }
    }

    if (pendingOffers.length >= SAVE_BATCH_SIZE) {
      await flushPendingOffers();
    }

    await delay(DELAY_MS);
  }

  await flushPendingOffers();

  console.log(
    `${storeSlug}: paginas=${stats.pages} ofertas actualizadas=${stats.saved} ` +
      `lotes=${stats.batches} desaparecidas=${stats.gone} ` +
      `sin-extraccion=${stats.skipped} errores=${stats.errors}`,
  );
  return stats;
}

export async function runPriceRefresh() {
  const staleHours = Number(process.env.REFRESH_STALE_HOURS ?? 0);
  const offers = await prisma.offer.findMany({
    where: {
      productId: { not: null },
      ...(staleHours > 0
        ? { lastSeenAt: { lt: new Date(Date.now() - staleHours * 3600_000) } }
        : {}),
    },
    include: { store: true },
    orderBy: { url: "asc" },
  });

  const filtered = STORE_FILTER.size
    ? offers.filter((offer) => STORE_FILTER.has(offer.store.slug.toLowerCase()))
    : offers;

  // Agrupar por pagina fisica y por tienda para respetar limites y reportes.
  const pages = new Map<string, RefreshPage>();
  for (const offer of filtered) {
    const pageUrl = basePageUrl(offer.url);
    const key = `${offer.storeId}:${pageUrl}`;
    const entry = pages.get(key) ?? {
      storeId: offer.storeId,
      storeSlug: offer.store.slug,
      offerIds: [],
      offerUrls: new Set<string>(),
      pageUrl,
    };
    entry.offerIds.push(offer.id);
    entry.offerUrls.add(offer.url);
    pages.set(key, entry);
  }

  console.log(`Ofertas vinculadas: ${filtered.length} en ${pages.size} paginas`);
  const byStore = new Map<string, RefreshPage[]>();
  for (const page of pages.values()) {
    const storePages = byStore.get(page.storeSlug) ?? [];
    storePages.push(page);
    byStore.set(page.storeSlug, storePages);
  }
  const results = await mapWithConcurrency([...byStore.entries()], STORE_CONCURRENCY, async ([storeSlug, storePages]) => {
    try {
      return await refreshStorePages(storeSlug, storePages);
    } catch (error) {
      console.error(`${storeSlug}: fatal refresh error - ${error instanceof Error ? error.message : String(error)}`);
      return { pages: 0, saved: 0, batches: 0, gone: 0, skipped: 0, errors: 1 } satisfies RefreshStats;
    }
  });
  const stats = results.reduce(
    (total, current) => ({
      pages: total.pages + current.pages,
      saved: total.saved + current.saved,
      batches: total.batches + current.batches,
      gone: total.gone + current.gone,
      skipped: total.skipped + current.skipped,
      errors: total.errors + current.errors,
    }),
    { pages: 0, saved: 0, batches: 0, gone: 0, skipped: 0, errors: 0 },
  );

  console.log(
    `Listo. paginas=${stats.pages} ofertas actualizadas=${stats.saved} ` +
      `lotes=${stats.batches} desaparecidas=${stats.gone} ` +
      `sin-extraccion=${stats.skipped} errores=${stats.errors}`,
  );
}

const isDirectRun = process.argv[1]
  ? import.meta.url === pathToFileURL(process.argv[1]).href
  : false;

if (isDirectRun) {
  runPriceRefresh()
    .catch((error) => {
      console.error(error);
      process.exitCode = 1;
    })
    .finally(async () => {
      await prisma.$disconnect();
    });
}
