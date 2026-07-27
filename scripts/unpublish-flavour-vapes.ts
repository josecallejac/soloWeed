// Despublica del catalogo los vaporizadores desechables de sabores (nicotina /
// e-liquido). Decision del usuario del 27 jul 2026: SoloWeed solo lleva vaporizadores
// HERBALES y de concentrados de cannabis.
//
// Que hace: borra la fila Product y deja sus ofertas HUERFANAS (productId = null).
// No borra ninguna Offer ni su historial de precios -- si algun dia se revierte la
// decision, las ofertas siguen ahi y se pueden volver a curar.
//
// OJO con el filtro: "puff" matchea dentro de "Puffco", que vaporiza concentrados de
// cannabis y SI pertenece al catalogo (son ~40 productos). Igual pasa con Focus V,
// DynaVap, Storz & Bickel, DaVinci, Yocan y Airistech: todos herbales, todos dentro.
// Por eso el criterio principal es la lista cerrada de brandKey y el texto solo actua
// como red secundaria, nunca sobre marcas de la lista blanca.
//
// Dry-run por defecto; escribe solo con --apply.
//
//   npx tsx scripts/unpublish-flavour-vapes.ts
//   npx tsx scripts/unpublish-flavour-vapes.ts --apply
import { prisma } from "../src/lib/prisma";

const APPLY = process.argv.includes("--apply");

// Marcas que en este catalogo son SOLO desechables de nicotina. Verificado contra la
// BD: "naar" queda fuera de la lista a proposito (son sopletes).
const MARCAS_FUERA = ["oxbar", "nasty", "fume", "life-pod"];
// Marcas herbales / de concentrados que jamas deben caer por la red de texto.
const LISTA_BLANCA = ["puffco", "focus-v", "dynavap", "storz-bickel", "davinci", "yocan", "airistech", "naar"];
const SENALES = /\b(\d{4,5}\s*puffs?\b|nicotina|\d+\s*mg\/ml|e-?liquid|esencia\s+salt)/i;

async function main() {
  const productos = await prisma.product.findMany({
    select: { id: true, brandKey: true, modelSlug: true, name: true },
  });

  const fuera: { id: number; slug: string; stores: number; offers: number; motivo: string }[] = [];
  for (const p of productos) {
    const marca = p.brandKey ?? "";
    if (LISTA_BLANCA.includes(marca)) continue;
    const porMarca = MARCAS_FUERA.includes(marca);
    const porTexto = SENALES.test(p.name);
    if (!porMarca && !porTexto) continue;
    const offers = await prisma.offer.findMany({ where: { productId: p.id }, select: { storeId: true } });
    fuera.push({
      id: p.id,
      slug: `${marca || "?"}/${p.modelSlug}`,
      stores: new Set(offers.map((o) => o.storeId)).size,
      offers: offers.length,
      motivo: porMarca ? `marca ${marca}` : "texto (puffs/nicotina/mg-ml)",
    });
  }

  const porTiendas = new Map<number, number>();
  for (const f of fuera) porTiendas.set(f.stores, (porTiendas.get(f.stores) ?? 0) + 1);
  console.log(`${APPLY ? "APLICANDO" : "DRY-RUN"}`);
  console.log(`Productos a despublicar: ${fuera.length} de ${productos.length}`);
  console.log(`  por nº de tiendas: ${[5, 4, 3, 2, 1].map((n) => `${n}t=${porTiendas.get(n) ?? 0}`).join(" ")}`);
  console.log(`  ofertas que quedarán huérfanas: ${fuera.reduce((a, b) => a + b.offers, 0)}`);
  const porTexto = fuera.filter((f) => f.motivo.startsWith("texto"));
  console.log(`  detectados solo por texto (revisar que no sean herbales): ${porTexto.length}`);
  for (const f of porTexto) console.log(`     P${f.id} ${f.slug} (${f.stores}t)`);

  if (!APPLY) {
    console.log("\n(dry-run: no se escribió nada)");
    return;
  }

  const ids = fuera.map((f) => f.id);
  const [desvinculadas, borrados] = await prisma.$transaction([
    prisma.offer.updateMany({ where: { productId: { in: ids } }, data: { productId: null } }),
    prisma.product.deleteMany({ where: { id: { in: ids } } }),
  ]);
  console.log(`\n${borrados.count} productos despublicados, ${desvinculadas.count} ofertas quedaron huérfanas (ninguna borrada).`);
  console.log(`Catálogo: ${productos.length} -> ${await prisma.product.count()} productos.`);
}

main().finally(() => prisma.$disconnect());
