// BACKFILL: decodifica las entidades HTML que quedaron LITERALES en la BD.
//
// El bug era visible en produccion: la ficha de los 20 productos Storz & Bickel
// titulaba "Storz &amp; Bickel", porque el valor entra escapado desde el JSON-LD
// de la tienda, se guarda tal cual y el render lo vuelve a escapar. Y no era solo
// cosmetico: el mismo `&amp;` le rompio el parser de CSV al ejecutor en r59
// (`&amp;` lleva un `;`, que era el separador), y contamina cualquier consumidor
// que no sea el render -- matching, exports, prompts de la IA.
//
// La causa raiz se cerro en `cleanText` de scripts/scrape.ts (decodifica al
// guardar, dos veces, para deshacer los doble-escapes tipo "Wake &amp;amp;
// Bake"). Este script repara lo que ya estaba dentro. Es idempotente: correrlo
// dos veces no cambia nada la segunda vez.
//
// NO toca URLs ni slugs: `brandKey`/`modelSlug`/`modelKey` son URL publica y
// ninguno traia entidades (medido: 0 filas). Solo campos de texto visible.
//
// ALCANCE POR DEFECTO = el bug visible: `Product.name` y `Offer.title` (mas su
// normalizado y `brand`). El dry-run destapo dos problemas MAS GRANDES que son
// otra cosa, asi que van tras su propio flag en vez de colarse:
//   --descriptions  4.595 `Offer.description` con entidades. HOY NO SE VE: el
//                   render ya pasa `cleanDescription`. Serian 4.595 escrituras a
//                   la BD viva por cero cambio visible.
//   --renormalize   133 `Product.normalizedName` desincronizados de su `name` SIN
//                   tener entidades: los escribieron scripts de curacion viejos
//                   con un normalizador ad-hoc (`toLowerCase().replace(...)`) en
//                   vez de `normalizeForSearch`. Toca la busqueda del home, es un
//                   bug aparte y merece su propia verificacion.
//
// Uso:
//   npx tsx scripts/fix-html-entities.ts            # dry-run, imprime el diff
//   npx tsx scripts/fix-html-entities.ts --apply
//   npx tsx scripts/fix-html-entities.ts --descriptions --renormalize --apply

import { decodeHtmlEntities } from "../src/lib/format";
import { prisma } from "../src/lib/prisma";
import { normalizeForSearch } from "./scrape";

const APPLY = process.argv.includes("--apply");
const WITH_DESCRIPTIONS = process.argv.includes("--descriptions");
const WITH_RENORMALIZE = process.argv.includes("--renormalize");

/** Solo cuenta como cambio si decodificar altera el texto. */
function decoded(value: string | null): string | null {
  if (value === null) return null;
  const out = decodeHtmlEntities(value);
  return out === value ? null : out;
}

async function main() {
  console.log(APPLY ? "=== MODO APPLY (escribe en la BD viva) ===" : "=== DRY-RUN (no escribe) ===");

  const products = await prisma.product.findMany({
    select: { id: true, name: true, normalizedName: true, brand: true, shortDescription: true },
    orderBy: { id: "asc" },
  });
  const offers = await prisma.offer.findMany({
    select: { id: true, storeId: true, productId: true, title: true, normalizedTitle: true, brand: true, description: true },
    orderBy: { id: "asc" },
  });

  type Change = { table: string; id: number; field: string; before: string; after: string };
  const changes: Change[] = [];
  let desincronizados = 0;
  let descripcionesSucias = 0;

  const productUpdates = new Map<number, { name?: string; normalizedName?: string; brand?: string; shortDescription?: string }>();
  for (const p of products) {
    const update: { name?: string; normalizedName?: string; brand?: string; shortDescription?: string } = {};
    const name = decoded(p.name);
    if (name !== null) {
      update.name = name;
      // El normalizado se recalcula con la MISMA funcion del scraper, no a mano.
      update.normalizedName = normalizeForSearch(name);
      changes.push({ table: "Product", id: p.id, field: "name", before: p.name, after: name });
    }
    const brand = decoded(p.brand);
    if (brand !== null) {
      update.brand = brand;
      changes.push({ table: "Product", id: p.id, field: "brand", before: p.brand!, after: brand });
    }
    const short = decoded(p.shortDescription);
    if (short !== null) {
      update.shortDescription = short;
      changes.push({ table: "Product", id: p.id, field: "shortDescription", before: p.shortDescription!, after: short });
    }
    // Desincronizacion preexistente, sin entidades de por medio: solo bajo flag.
    if (!update.name) {
      const expected = normalizeForSearch(p.name);
      if (expected !== p.normalizedName) {
        desincronizados++;
        if (WITH_RENORMALIZE) {
          update.normalizedName = expected;
          changes.push({ table: "Product", id: p.id, field: "normalizedName", before: p.normalizedName, after: expected });
        }
      }
    }
    if (Object.keys(update).length) productUpdates.set(p.id, update);
  }

  const offerUpdates = new Map<number, { title?: string; normalizedTitle?: string; brand?: string; description?: string }>();
  for (const o of offers) {
    const update: { title?: string; normalizedTitle?: string; brand?: string; description?: string } = {};
    const title = decoded(o.title);
    if (title !== null) {
      update.title = title;
      update.normalizedTitle = normalizeForSearch(title);
      changes.push({ table: "Offer", id: o.id, field: "title", before: o.title, after: title });
    }
    const brand = decoded(o.brand);
    if (brand !== null) {
      update.brand = brand;
      changes.push({ table: "Offer", id: o.id, field: "brand", before: o.brand!, after: brand });
    }
    const description = decoded(o.description);
    if (description !== null) {
      descripcionesSucias++;
      if (WITH_DESCRIPTIONS) {
        update.description = description;
        changes.push({ table: "Offer", id: o.id, field: "description", before: "(descripcion)", after: "(decodificada)" });
      }
    }
    if (Object.keys(update).length) offerUpdates.set(o.id, update);
  }

  const byField = new Map<string, number>();
  for (const c of changes) byField.set(`${c.table}.${c.field}`, (byField.get(`${c.table}.${c.field}`) ?? 0) + 1);
  console.log(`\n${changes.length} cambios sobre ${productUpdates.size} productos y ${offerUpdates.size} ofertas:`);
  for (const [field, n] of [...byField.entries()].sort()) console.log(`  ${field}: ${n}`);
  if (!WITH_DESCRIPTIONS && descripcionesSucias) {
    console.log(`  [fuera de alcance] Offer.description con entidades: ${descripcionesSucias} (--descriptions)`);
  }
  if (!WITH_RENORMALIZE && desincronizados) {
    console.log(`  [fuera de alcance] Product.normalizedName desincronizado sin entidades: ${desincronizados} (--renormalize)`);
  }

  const visibles = changes.filter((c) => c.field === "name" || c.field === "title");
  console.log(`\nDiff de los ${visibles.length} campos visibles:`);
  for (const c of visibles) {
    console.log(`  ${c.table} ${c.id}`);
    console.log(`    - ${c.before.slice(0, 100)}`);
    console.log(`    + ${c.after.slice(0, 100)}`);
  }

  if (!APPLY) {
    console.log("\nDry-run: nada escrito. Re-correr con --apply.");
    await prisma.$disconnect();
    return;
  }

  let written = 0;
  for (const [id, data] of productUpdates) {
    await prisma.product.update({ where: { id }, data });
    written++;
  }
  for (const [id, data] of offerUpdates) {
    await prisma.offer.update({ where: { id }, data });
    written++;
  }
  console.log(`\n${written} filas escritas.`);

  // Verificacion en la misma corrida: releer y confirmar que no queda ninguna.
  const stillProducts = await prisma.product.count({
    where: { OR: [{ name: { contains: "&amp;" } }, { name: { contains: "&quot;" } }, { name: { contains: "&#39;" } }] },
  });
  const stillOffers = await prisma.offer.count({
    where: { OR: [{ title: { contains: "&amp;" } }, { title: { contains: "&quot;" } }, { title: { contains: "&#39;" } }] },
  });
  console.log(`Verificacion: quedan ${stillProducts} productos y ${stillOffers} ofertas con entidades en el campo visible.`);
  await prisma.$disconnect();
}

main().catch(async (error) => {
  console.error(error);
  await prisma.$disconnect();
  process.exit(1);
});
