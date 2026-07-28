// Ronda 58c (2026-07-28): cierre de los retenidos por ratio y de los mislinks
// activos de r52, TRAS auditar cada uno contra la BD.
//
// ── RETENIDOS POR RATIO ────────────────────────────────────────────────────
// khemo/tips-silver (ratio 1.89) -> ACEPTADO, resuelto por URL sin foto:
//   GrowBarato /parafernalia/tips-silver-khemo.html
//   Kushbreak  /khemo-tips-silver
//   Mismo slug, mismo producto. El 1.89 es politica de precios (GB $450 es
//   barato en articulos chicos, Kushbreak $850), no identidad distinta.
//
// Weecke unidad enfriamiento Fenix Mini+ (ratio 1.82) -> ACEPTADO POR FOTO.
//   Ambas muestran el mismo cuerpo negro con ventana ovalada y el mismo aro de
//   silicona AZUL con malla metalica; Fumetas lo fotografia despiezado y FG
//   armado. Ademas las dos URLs son /boquilla[-de]-enfriamiento[-herbal]-fenix-mini
//   y los nombres de archivo de imagen dicen lo mismo.
//
// khemo/organico-long (ratio 1.38) -> RECHAZADO. La URL desempata y son TALLAS
//   distintas: GrowBarato /papel-organico-largo.html ("Orgánico Long, gran
//   tamaño") vs Kushbreak /khemo-hemp-1-14-papelillos ("1 1/4"). El propio
//   ejecutor lo habia marcado CANDIDATO DEBIL y tenia razon.
//
// ── MISLINKS r52: 2 de 6 propuestas eran FALSOS POSITIVOS ─────────────────
// El ejecutor propuso mover ofertas que ya estan donde corresponde:
//   BLAB-DIF-14N: of12854 y of34005 estan AMBAS en P10260. No hay mislink; la
//     propuesta era mandar la "Negro" al producto MORADO (P10359).
//   CLIPP-MDEGO:  of34112 y of19294 estan AMBAS en P10721 "Demon Gradient". La
//     propuesta era mandar la "Demon" al producto "Green" (P10481).
// En los dos casos el par de SKU compartido esta dentro del MISMO producto, que
// es exactamente lo contrario de un mislink.
//
// APLICADO aqui: BGGRHOOKCO. of23150 "Gravity Hookah -Stundenglass" $424.990 y
// of31801 "Gravity Hookah -Stundenglass - COOKIES" $499.990 son la MISMA ficha
// de Astro (mismo sku) repartida en dos productos. La edicion Cookies manda:
// of23150 va a P10659. P10722 conserva sus 2 tiendas (le queda la Astro "Negro"
// $449.990 + Fumetas) y P10659 ya tenia Astro, asi que NADIE cambia de nivel.
//
// ── NO SE TOCAN, EXIGEN DECISION DEL USUARIO ──────────────────────────────
// AYPRAWMQERA11U4BLK (RAW enroladora): la ficha de Astro /maquina-enroladora-raw
//   es un WILDCARD de 3 variantes ("Negra 1 1/4 ajustable", "King Size
//   Ecoplastic", "Automatica 1 1/4"). Ninguna es la "1 1/4 ecoplastic" de P5799.
//   Sacar of2613 deja a P5799 en 3t y es CONGELADO (4t). Cobertura falsa pero
//   cobertura: mismo dilema que of34355 en r54.
// 67992374748205 (Tiny Bell): of3498 en P5532 (3t) y of846 en P5778 (4t),
//   mismo barcode de Piranha, precios distintos. Ambos congelados. Necesita foto.
// Puffco New Peak Bliss/Cloud/Sky -> Onyx: NO son movimientos sueltos. La ficha
//   de Astro es "New Peak (Color a eleccion)" y esta repartida en 4 productos,
//   con ofertas Astro de la MISMA ficha en varios de ellos. Mover solo 3 dejaria
//   las Astro del mismo color repartidas entre dos productos. Requiere una ronda
//   de FUSION propia, no parches.
//
// Dry-run por defecto; escribe solo con --apply.
import { prisma } from "../src/lib/prisma";

const APPLY = process.argv.includes("--apply");

type NewSpec = {
  offerIds: number[];
  name: string; brand: string; brandKey: string; modelSlug: string;
  category: string; esperaTiendas: number;
};

const NEW_PRODUCTS: NewSpec[] = [
  {
    offerIds: [71212, 69314],
    name: "Khemo Tips Silver",
    brand: "Khemo", brandKey: "khemo", modelSlug: "tips-silver",
    category: "Filtros y boquillas", esperaTiendas: 2,
  },
  {
    offerIds: [88230, 20070],
    name: "Weecke Unidad de Enfriamiento Fenix Mini Plus",
    brand: "Weecke", brandKey: "weecke", modelSlug: "unidad-enfriamiento-fenix-mini-plus",
    category: "Repuestos para bongs y vaporizadores", esperaTiendas: 2,
  },
];

// [offerId, desde, hacia]
const MOVES: [number, number, number][] = [[23150, 10722, 10659]];

function normalizeName(v: string) {
  return v.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]+/g, " ").trim();
}
async function storeIdsOf(productId: number) {
  const rows = await prisma.offer.findMany({ where: { productId }, select: { storeId: true }, distinct: ["storeId"] });
  return new Set(rows.map((r) => r.storeId));
}

async function main() {
  console.log(APPLY ? "APLICANDO" : "DRY-RUN");

  for (const spec of NEW_PRODUCTS) {
    console.log(`\n=== ${spec.name} (${spec.brandKey}/${spec.modelSlug}) ===`);
    const existing = await prisma.product.findUnique({
      where: { brandKey_modelSlug: { brandKey: spec.brandKey, modelSlug: spec.modelSlug } },
    });
    if (existing) throw new Error(`ya existe P${existing.id}`);

    const offers = await prisma.offer.findMany({
      where: { id: { in: spec.offerIds } },
      select: { id: true, productId: true, storeId: true, title: true, price: true, inStock: true, imageUrl: true, store: { select: { slug: true } } },
    });
    if (offers.length !== spec.offerIds.length) throw new Error("faltan ofertas");
    const vinc = offers.filter((o) => o.productId !== null);
    if (vinc.length) throw new Error(`ya vinculadas: ${vinc.map((o) => `of${o.id}->P${o.productId}`).join(", ")}`);
    const tiendas = new Set(offers.map((o) => o.storeId));
    if (tiendas.size !== spec.esperaTiendas) throw new Error(`daria ${tiendas.size} tiendas`);

    for (const o of offers) console.log(`   + [${o.store.slug}] of${o.id} $${o.price} stock=${o.inStock} ${o.title.slice(0, 48)}`);
    console.log(`   -> ${tiendas.size} tiendas | ${offers.filter((o) => o.inStock).length}/${offers.length} con stock`);

    if (!APPLY) continue;
    const portada = offers.find((o) => o.inStock && o.imageUrl) ?? offers.find((o) => o.imageUrl);
    const product = await prisma.product.create({
      data: {
        name: spec.name, normalizedName: normalizeName(spec.name),
        brand: spec.brand, brandKey: spec.brandKey,
        modelKey: spec.modelSlug, modelSlug: spec.modelSlug,
        category: spec.category, imageUrl: portada?.imageUrl ?? null,
      },
    });
    for (const o of offers) {
      await prisma.offer.update({ where: { id: o.id }, data: { productId: product.id, category: spec.category } });
    }
    console.log(`   producto creado P${product.id} | tiendas: ${(await storeIdsOf(product.id)).size}`);
  }

  for (const [offerId, desde, hacia] of MOVES) {
    console.log(`\n=== MOVER of${offerId}: P${desde} -> P${hacia} ===`);
    const o = await prisma.offer.findUnique({ where: { id: offerId }, select: { productId: true, storeId: true, title: true, price: true } });
    if (!o) throw new Error(`of${offerId} no existe`);
    if (o.productId !== desde) throw new Error(`of${offerId} cuelga de P${o.productId}, no de P${desde}`);

    const antesDesde = await storeIdsOf(desde);
    const antesHacia = await storeIdsOf(hacia);
    const quedan = await prisma.offer.findMany({ where: { productId: desde, id: { not: offerId } }, select: { storeId: true }, distinct: ["storeId"] });
    const despuesDesde = new Set(quedan.map((r) => r.storeId));
    if (despuesDesde.size < antesDesde.size) throw new Error(`P${desde} perderia tienda (${antesDesde.size} -> ${despuesDesde.size})`);

    console.log(`   of${offerId} $${o.price} ${o.title.slice(0, 52)}`);
    console.log(`   P${desde}: ${antesDesde.size}t -> ${despuesDesde.size}t | P${hacia}: ${antesHacia.size}t -> ${new Set([...antesHacia, o.storeId]).size}t`);
    if (APPLY) {
      const cat = await prisma.product.findUnique({ where: { id: hacia }, select: { category: true } });
      await prisma.offer.update({ where: { id: offerId }, data: { productId: hacia, ...(cat ? { category: cat.category } : {}) } });
      console.log(`   movida.`);
    }
  }

  if (!APPLY) console.log("\n(dry-run: no se escribió nada)");
}

main().finally(() => prisma.$disconnect());
