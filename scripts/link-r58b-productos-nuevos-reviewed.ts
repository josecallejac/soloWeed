// Ronda 58b (2026-07-28): productos nuevos salidos de las tareas B y E del
// ejecutor, ya auditados contra la BD por el orquestador.
//
// AUDITORIA: los 7 pares de la tarea B validan limpio (2 tiendas cada uno,
// ninguna oferta ya vinculada, todos los offerId existen). Entran aqui los 5 con
// ratio <= 1.19. Se retienen los 2 de ratio alto (ver abajo).
//
// RECHAZADO — el hallazgo mas importante de la auditoria: el ejecutor propuso
// "Yocan Blade" como PRODUCTO-NUEVO-CANDIDATO con sumaTienda=si sobre 5 ofertas
// (of87657-87661). LAS CINCO SON DE FRIENDLY GROW. El producto tendria UNA sola
// tienda: invisible en el sitio (exige storeCount>1) pero presente en sitemap y
// generateStaticParams. Es exactamente el patron del incidente r55. La unica otra
// oferta con "blade" en el catalogo es una "Pipa Pyrex Nitroblade" de Astro, sin
// relacion. NO se crea.
//
// RETENIDOS por ratio, necesitan foto:
//   khemo/tips-silver    of71212 $450 (GB) vs of69314 $850 (Kushbreak) — ratio 1.89
//   khemo/organico-long  of11595 (GB) vs of69064 (Kushbreak) — ratio 1.38, el
//                        propio ejecutor lo marco CANDIDATO DEBIL
//   Fenix Mini+ cooling  of88230 $19.990 (FG) vs of20070 $10.990 (Fumetas) — 1.82
//
// SIN STOCK: los 5 primeros productos tienen 0 ofertas con stock (Shine y la
// bandeja Khemo estan descatalogados en ambas tiendas). Se crean igual: la regla
// del proyecto es que una oferta descatalogada se marca sin stock y nunca se
// desvincula, porque conserva su historial de precios. Precedente P10992.
//
// ── SPLIT DE P10506 ────────────────────────────────────────────────────────
// P10506 weecke/boquilla-fenix-neo mezcla dos piezas distintas:
//   of19829 "Boquilla Fenix Neo"            $10.990 (Fumetas)  <- boquilla simple
//   of17768 "Mouthpiece Stem Fenix Neo"     $10.990 (Astro)    <- boquilla simple
//   of19201 "Unidad de Enfriamiento Fenix Neo" $25.990 (Fumetas) <- OTRA PIEZA
// Ratio interno 2.36. Se saca of19201 y se junta con la de FG (of88232 $24.990,
// ratio 1.04) en producto propio. P10506 queda con sus 2 boquillas simples y
// SIGUE con 2 tiendas (Fumetas + Astro): no pierde cobertura.
//
// Dry-run por defecto; escribe solo con --apply.
import { prisma } from "../src/lib/prisma";

const APPLY = process.argv.includes("--apply");

type NewSpec = {
  offerIds: number[];
  name: string;
  brand: string;
  brandKey: string;
  modelSlug: string;
  category: string;
  esperaTiendas: number;
  // Ofertas que hay que DESVINCULAR de su producto actual antes de mover.
  desdeProducto?: Record<number, number>;
};

const NEW_PRODUCTS: NewSpec[] = [
  {
    offerIds: [73973, 69246],
    name: "Shine x Wu-Tang 3 Papeles King Size de Oro 24K",
    brand: "Shine", brandKey: "shine", modelSlug: "wu-tang-3p-24k",
    category: "Papelillos", esperaTiendas: 2,
  },
  {
    offerIds: [73951, 69005],
    name: "Shine 6 Papeles King Size de Oro 24K",
    brand: "Shine", brandKey: "shine", modelSlug: "6p-king-size-24k",
    category: "Papelillos", esperaTiendas: 2,
  },
  {
    offerIds: [19421, 69094],
    name: "Shine 2 Blunt Wraps de Oro 24K",
    brand: "Shine", brandKey: "shine", modelSlug: "2-blunt-wraps-24k",
    category: "Conos y blunts", esperaTiendas: 2,
  },
  // CORREGIDO EN LA AUDITORIA. El ejecutor propuso of13676 + of69003 con ratio
  // 1.07, pero of13676 es SKU SHI-PAC114 = PAPELILLO y of69003 es un CONO. Tipos
  // distintos; el ratio bueno tapaba el error. Los pares reales son estos dos, y
  // el segundo desmiente que of69173 "no tenga par":
  {
    offerIds: [75352, 69173],
    name: "Shine 2 Papelillos de Oro 24K 1 1/4",
    brand: "Shine", brandKey: "shine", modelSlug: "2p-24k-1-1-4",
    category: "Papelillos", esperaTiendas: 2,
  },
  {
    offerIds: [75164, 69140],
    name: "Shine 2 Papelillos de Oro Blanco 1 1/4",
    brand: "Shine", brandKey: "shine", modelSlug: "white-gold-2p-1-1-4",
    category: "Papelillos", esperaTiendas: 2,
  },
  {
    offerIds: [12408, 69306],
    name: "Khemo Bandeja Metalica 16x28cm",
    brand: "Khemo", brandKey: "khemo", modelSlug: "bandeja-metalica-16x28",
    category: "Bandejas y ceniceros", esperaTiendas: 2,
  },
  {
    offerIds: [88236, 13540],
    name: "Weecke Camara de Enfriamiento Fenix Pro",
    brand: "Weecke", brandKey: "weecke", modelSlug: "camara-enfriamiento-fenix-pro",
    category: "Repuestos para bongs y vaporizadores", esperaTiendas: 2,
  },
  {
    offerIds: [19201, 88232],
    name: "Weecke Unidad de Enfriamiento Fenix Neo",
    brand: "Weecke", brandKey: "weecke", modelSlug: "unidad-enfriamiento-fenix-neo",
    category: "Repuestos para bongs y vaporizadores", esperaTiendas: 2,
    desdeProducto: { 19201: 10506 },
  },
];

function normalizeName(value: string) {
  return value.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]+/g, " ").trim();
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
    if (existing) throw new Error(`ya existe P${existing.id} con ese brandKey/modelSlug`);

    const offers = await prisma.offer.findMany({
      where: { id: { in: spec.offerIds } },
      select: { id: true, productId: true, storeId: true, title: true, price: true, inStock: true, imageUrl: true, store: { select: { slug: true } } },
    });
    const faltan = spec.offerIds.filter((id) => !offers.some((o) => o.id === id));
    if (faltan.length) throw new Error(`ofertas inexistentes: ${faltan.join(",")}`);

    for (const o of offers) {
      const origen = spec.desdeProducto?.[o.id];
      if (o.productId !== null && o.productId !== origen) {
        throw new Error(`of${o.id} cuelga de P${o.productId}, no de P${origen ?? "null"}`);
      }
    }
    const tiendas = new Set(offers.map((o) => o.storeId));
    if (tiendas.size !== spec.esperaTiendas) {
      throw new Error(`daria ${tiendas.size} tiendas, se esperaban ${spec.esperaTiendas}`);
    }

    for (const o of offers) {
      const mov = spec.desdeProducto?.[o.id] ? ` (sale de P${spec.desdeProducto[o.id]})` : "";
      console.log(`   + [${o.store.slug}] of${o.id} $${o.price} stock=${o.inStock}${mov} ${o.title.slice(0, 48)}`);
    }
    const conStock = offers.filter((o) => o.inStock).length;
    console.log(`   -> ${tiendas.size} tiendas | ${conStock}/${offers.length} con stock`);

    // Guarda: el producto de origen no puede perder tiendas por el split.
    if (spec.desdeProducto) {
      for (const origen of new Set(Object.values(spec.desdeProducto))) {
        const antes = await storeIdsOf(origen);
        const quedan = await prisma.offer.findMany({
          where: { productId: origen, id: { notIn: spec.offerIds } },
          select: { storeId: true }, distinct: ["storeId"],
        });
        const despues = new Set(quedan.map((r) => r.storeId));
        console.log(`   P${origen} quedaria con ${despues.size} tiendas (antes ${antes.size})`);
        if (despues.size < antes.size) throw new Error(`el split haria perder tiendas a P${origen}`);
      }
    }

    if (!APPLY) continue;

    const portada = offers.find((o) => o.inStock && o.imageUrl) ?? offers.find((o) => o.imageUrl);
    const product = await prisma.product.create({
      data: {
        name: spec.name,
        normalizedName: normalizeName(spec.name),
        brand: spec.brand,
        brandKey: spec.brandKey,
        modelKey: spec.modelSlug,
        modelSlug: spec.modelSlug,
        category: spec.category,
        imageUrl: portada?.imageUrl ?? null,
      },
    });
    for (const o of offers) {
      await prisma.offer.update({ where: { id: o.id }, data: { productId: product.id, category: spec.category } });
    }
    console.log(`   producto creado P${product.id} | tiendas: ${(await storeIdsOf(product.id)).size}`);
  }

  if (!APPLY) console.log("\n(dry-run: no se escribió nada)");
}

main().finally(() => prisma.$disconnect());
