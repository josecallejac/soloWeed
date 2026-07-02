import { load } from "cheerio";
import { prisma } from "../src/lib/prisma";
import { extractOffer, fetchText, saveOffer } from "./scrape";

// Refresco de precio/stock SOLO para ofertas vinculadas a un Product curado.
// No descubre candidatos nuevos ni crea ofertas: visita cada URL ya vinculada,
// re-extrae y guarda via saveOffer (que registra PriceHistory solo si cambia
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

function basePageUrl(offerUrl: string) {
  // Las variantes Jumpseller se persisten como <url>?variant=<nombre>; todas
  // comparten la misma pagina fisica.
  return offerUrl.split("?variant=")[0];
}

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function markOutOfStock(offerIds: number[]) {
  for (const offerId of offerIds) {
    const latest = await prisma.priceHistory.findFirst({
      where: { offerId },
      orderBy: { recordedAt: "desc" },
    });
    const offer = await prisma.offer.findUnique({ where: { id: offerId } });
    if (!offer || !offer.inStock) {
      continue;
    }
    await prisma.offer.update({ where: { id: offerId }, data: { inStock: false } });
    if (!latest || latest.inStock) {
      await prisma.priceHistory.create({
        data: {
          offerId,
          price: offer.price,
          originalPrice: offer.originalPrice,
          inStock: false,
        },
      });
    }
  }
}

async function main() {
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
  const pages = new Map<string, { storeId: number; storeSlug: string; offerIds: number[]; offerUrls: Set<string> }>();
  for (const offer of filtered) {
    const pageUrl = basePageUrl(offer.url);
    const entry = pages.get(pageUrl) ?? {
      storeId: offer.storeId,
      storeSlug: offer.store.slug,
      offerIds: [],
      offerUrls: new Set<string>(),
    };
    entry.offerIds.push(offer.id);
    entry.offerUrls.add(offer.url);
    pages.set(pageUrl, entry);
  }

  const perStoreCount = new Map<string, number>();
  const stats = { pages: 0, saved: 0, gone: 0, skipped: 0, errors: 0 };

  console.log(`Ofertas vinculadas: ${filtered.length} en ${pages.size} paginas`);

  for (const [pageUrl, entry] of pages) {
    if (LIMIT_PER_STORE > 0) {
      const count = perStoreCount.get(entry.storeSlug) ?? 0;
      if (count >= LIMIT_PER_STORE) {
        continue;
      }
      perStoreCount.set(entry.storeSlug, count + 1);
    }

    stats.pages += 1;
    try {
      const html = await fetchText(pageUrl);
      const scraped = extractOffer(html, pageUrl);
      if (!scraped || scraped.length === 0) {
        // PrestaShop (Piranha/GrowBarato) responde 200 con la portada cuando el
        // producto fue eliminado: el canonical deja de apuntar a la URL pedida.
        const canonical = load(html)("link[rel='canonical']").attr("href");
        const isSoftRedirect = canonical ? new URL(canonical).pathname.replace(/\/$/, "") !== new URL(pageUrl).pathname.replace(/\/$/, "") : false;
        if (isSoftRedirect) {
          await markOutOfStock(entry.offerIds);
          stats.gone += 1;
          console.warn(`[gone] soft-redirect a ${canonical}: ${pageUrl}`);
        } else {
          stats.skipped += 1;
          console.warn(`[skip] sin oferta extraible: ${pageUrl}`);
        }
        continue;
      }
      for (const offer of scraped) {
        // Solo actualizar ofertas ya vinculadas; no crear variantes/ofertas nuevas.
        if (!entry.offerUrls.has(offer.url)) {
          continue;
        }
        await saveOffer(entry.storeId, offer);
        stats.saved += 1;
      }

      // Ofertas pre-variantes: la oferta vinculada usa la URL base pero la
      // pagina ahora expone variantes (?variant=...). Se refresca la oferta
      // base con el precio/stock a nivel de pagina (JSON-LD), sin crear nuevas.
      if (entry.offerUrls.has(pageUrl) && !scraped.some((offer) => offer.url === pageUrl)) {
        const baseOnly = extractOffer(html, pageUrl, { includeVariants: false });
        if (baseOnly && baseOnly.length === 1) {
          await saveOffer(entry.storeId, baseOnly[0]);
          stats.saved += 1;
        }
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      if (/HTTP (404|410)/.test(message)) {
        await markOutOfStock(entry.offerIds);
        stats.gone += 1;
        console.warn(`[gone] marcada sin stock (${message}): ${pageUrl}`);
      } else {
        stats.errors += 1;
        console.warn(`[error] ${message}: ${pageUrl}`);
      }
    }

    await delay(DELAY_MS);
  }

  console.log(
    `Listo. paginas=${stats.pages} ofertas actualizadas=${stats.saved} ` +
      `desaparecidas=${stats.gone} sin-extraccion=${stats.skipped} errores=${stats.errors}`,
  );
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
