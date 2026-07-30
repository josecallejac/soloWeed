// Ronda 59 (2026-07-29): cobertura por marca. Universo generado por
// scripts/diagnose-brand-coverage-gap.ts, juzgado por la IA ejecutora y REVALIDADO
// mecanicamente contra la BD por el orquestador el 29 jul, despues de r61.
//
// ── REVALIDACION (scratch/validar-r59.ts) ─────────────────────────────────────
// Tarea A + los 9 que su parser se comio: 98 filas, 42 con veredicto VINCULAR sobre
// 25 destinos -> +25 TIENDAS REALES. 0 ofertas fuera de alcance, 0 ya vinculadas,
// 0 inexistentes, 0 destinos congelados tocados. El efecto se midio AGREGADO por
// destino contra el estado previo, no fila por fila.
//   OJO: su CSV declaraba "36 sumaTienda"; el efecto real medido son 25. La diferencia
//   son filas hermanas del mismo lote que se "veian" entre ellas (P10845 aporta 10
//   ofertas y suma UNA tienda; P10491 aporta 4 y suma UNA).
//   Las 9 filas que su parser descarto en silencio (tenian `&amp;` -> un `;` que le
//   desplazo las columnas) rindieron: of20125 -> P10486 (2t->3t, upgrade real), el
//   producto nuevo de la bolsa Volcano y el mislink P10281 de mas abajo.
//
// ── ALCANCE (el CSV es anterior al fix c73d75c) ────────────────────────────────
// Revalidado con classifyProduct ACTUAL: las 42 ofertas de la Tarea A y las 28 de la
// Tarea B estan DENTRO. Revisados a mano los 6 titulos con senal de "sabor/vape":
// los LRC Blunt Hemp Wrap (Strawberry/Grape) y el Soulblime Chocomint son PAPEL de
// canamo con sabor, no vaporizadores; el Puffco New Peak Pro y el Proxy Core son de
// CONCENTRADOS. Ninguno es un desechable de esencia ni un pod de e-liquido.
// Los 5 productos Airis Neo P8000 que el ejecutor propuso estaban en su Tarea C, que
// NO se aplica aca.
//
// ── SLUGS CORREGIDOS (11 de 14 venian sucios; modelSlug es URL publica) ────────
// filtro-personal-pro-ii-sploofy            -> personal-pro-ii
// papel-para-rosin-tradicional-             -> papel-rosin-tradicional   (guion final)
// calvo-terp-balls-luminosas-4mm            -> terp-balls-luminosas-4mm
// vaporizador-dynavap-kit-g3                -> kit-g3
// moledor-galaxy-aluminio-63mm-oro-rosa     -> aluminio-63mm-oro-rosa
// ocb-virgin-rolled-tips-boquillas-preen... -> virgin-rolled-tips
// accesorio-core-para-new-proxy-puffco      -> new-proxy-core
// bolsa-raw-tote-bag                        -> tote-bag
// llavero-raw-bandeja-miniatura             -> llavero-bandeja-miniatura
// blunt-hemp-wraps-sabores-soulblime-choco. -> hemp-wrap-chocomint
//
// ── RECHAZADOS de la Tarea B ──────────────────────────────────────────────────
// * Enroladora OCB (of19750 Fumetas $12.990 + of11244 Piranha $6.490, ratio 2.00):
//   la de Fumetas es la "Automatica" y la de Piranha la "Nº1". Modelos distintos con
//   el precio al doble; es el modo de fallo de emparejar por FUNCION y no por MODELO.
// * Polera RAW Beige (of37085 Fumetas "Beige M" $23.990 + of15965 Piranha
//   "Beige (S/M/L/XL)" $14.993, ratio 1.60): DECISION DEL USUARIO el 29 jul —
//   "no es parafernalia, no tomar en cuenta". La ropa sale del catalogo. Medido
//   aparte: hay 180 ofertas de prendas, 27 de ellas curadas en 10 productos; sacarlas
//   del alcance es un cambio de classifyProduct que va en su propio turno.
//
// ── SPLIT DE P10281 (aprobado por el usuario el 29 jul) ───────────────────────
// P10281 storz-bickel/capsule-caddy mezcla DOS versiones. El SKU de Fumetas lo prueba
// solo: STB-LCCAD (normal) contra STB-LCCADC (Concentrados).
//   ESTADO HOY (3 tiendas):
//     of12966 [fumetas]  $7.990 STB-LCCAD    <- normal
//     of12615 [astro]    $7.990 VPSZBLLACAP  <- normal
//     of16056 [piranha]  $9.990 "Capsule Caddy Mighty/Crafty (Concentrados)" <- INTRUSA
//   Y las dos parejas correctas estaban HUERFANAS:
//     of16095 [piranha]  $7.591 "Capsule Caddy"                       <- la normal
//     of19533 [fumetas]  $9.990 STB-LCCADC "Capsule Caddy Concentrados"
//   RESULTADO: P10281 cede of16056 y recibe of16095, asi que CONSERVA SUS 3 TIENDAS
//   (fumetas, astro, piranha) — no pierde cobertura, cambia una oferta de Piranha por
//   la correcta de la misma tienda. Y nace el producto de Concentrados con 2 tiendas.
//   Precedente identico: el split de P10506 en r58c.
//
// Dry-run por defecto; escribe solo con --apply.
import { prisma } from "../src/lib/prisma";

const APPLY = process.argv.includes("--apply");

// ── TAREA A: 42 ofertas -> 25 destinos ───────────────────────────────────────
const UPGRADES: Array<{ productId: number; offerIds: number[] }> = [
  { productId: 5521, offerIds: [33136] },
  { productId: 5526, offerIds: [33138] },
  { productId: 10194, offerIds: [13213] },
  { productId: 10196, offerIds: [449] },
  { productId: 10224, offerIds: [18059] },
  { productId: 10400, offerIds: [8140, 8155] },
  { productId: 10414, offerIds: [12971] },
  { productId: 10460, offerIds: [19753] },
  { productId: 10486, offerIds: [20125] },   // rescatada de las 9 del parser roto
  { productId: 10488, offerIds: [22981] },
  { productId: 10489, offerIds: [22982] },
  { productId: 10491, offerIds: [23561, 32289, 32290, 78257] },
  { productId: 10525, offerIds: [20149] },
  { productId: 10536, offerIds: [23565] },
  { productId: 10541, offerIds: [18103, 32911, 92466] },
  { productId: 10567, offerIds: [37209] },
  { productId: 10595, offerIds: [19924] },
  { productId: 10622, offerIds: [12174, 12221] },
  { productId: 10645, offerIds: [18165] },
  { productId: 10646, offerIds: [12273, 12274] },
  { productId: 10649, offerIds: [17204] },
  { productId: 10654, offerIds: [37204] },
  { productId: 10686, offerIds: [19342] },
  { productId: 10736, offerIds: [78744] },
  // 10 disenos de la misma linea Naar One (8 del ejecutor + of20028/of20029 que yo
  // rescate de las 9: dejar 2 de 9 fuera seria arbitrario). Suman UNA tienda: fumetas.
  { productId: 10845, offerIds: [13592, 19509, 20025, 20026, 20027, 20030, 20031, 20106, 20028, 20029] },
];

// ── TAREA B: 12 productos nuevos (14 menos enroladora y polera) ──────────────
type NewSpec = {
  offerIds: number[];
  name: string; brand: string; brandKey: string; modelSlug: string;
  category: string; esperaTiendas: number;
  desdeProducto?: Record<number, number>;
};

const NEW_PRODUCTS: NewSpec[] = [
  { offerIds: [18024, 36571, 36572], name: "Sploofy Filtro Personal Pro II",
    brand: "Sploofy", brandKey: "sploofy", modelSlug: "personal-pro-ii",
    category: "Filtros y boquillas", esperaTiendas: 2 },
  { offerIds: [12621, 70529], name: "Bonglab Papel Para Rosin Tradicional",
    brand: "Bonglab", brandKey: "bonglab", modelSlug: "papel-rosin-tradicional",
    category: "Accesorios de extraccion", esperaTiendas: 2 },
  { offerIds: [33997, 31409], name: "Bonglab Quemador Perlas Macho 18mm Turquesa",
    brand: "Bonglab", brandKey: "bonglab", modelSlug: "quemador-perlas-macho-18mm-turquesa",
    category: "Repuestos para bongs y vaporizadores", esperaTiendas: 2 },
  { offerIds: [34959, 31726], name: "Bonglab The Sheikh 42cm Azul",
    brand: "Bonglab", brandKey: "bonglab", modelSlug: "the-sheikh-42cm-azul",
    category: "Bongs", esperaTiendas: 2 },
  { offerIds: [19283, 70870], name: "Calvo Terp Balls Luminosas 4mm",
    brand: "Calvo", brandKey: "calvo", modelSlug: "terp-balls-luminosas-4mm",
    category: "Accesorios de extraccion", esperaTiendas: 2 },
  { offerIds: [35561, 78694], name: "DynaVap Kit G3",
    brand: "DynaVap", brandKey: "dynavap", modelSlug: "kit-g3",
    category: "Vaporizadores herbales", esperaTiendas: 2 },
  { offerIds: [33554, 31203], name: "Galaxy Moledor Aluminio 63mm Oro Rosa",
    brand: "Galaxy", brandKey: "galaxy", modelSlug: "aluminio-63mm-oro-rosa",
    category: "Moledores", esperaTiendas: 2 },
  { offerIds: [20108, 69946], name: "OCB Virgin Rolled Tips",
    brand: "OCB", brandKey: "ocb", modelSlug: "virgin-rolled-tips",
    category: "Filtros y boquillas", esperaTiendas: 2 },
  { offerIds: [18194, 16170], name: "Puffco Accesorio Core New Proxy",
    brand: "Puffco", brandKey: "puffco", modelSlug: "new-proxy-core",
    category: "Accesorios de extraccion", esperaTiendas: 2 },
  { offerIds: [19563, 93353], name: "RAW Bolsa Tote Bag",
    brand: "RAW", brandKey: "raw", modelSlug: "tote-bag",
    category: "Otros parafernalia", esperaTiendas: 2 },
  { offerIds: [19769, 93721], name: "RAW Llavero Bandeja Miniatura",
    brand: "RAW", brandKey: "raw", modelSlug: "llavero-bandeja-miniatura",
    category: "Bandejas y ceniceros", esperaTiendas: 2 },
  { offerIds: [31785, 79859], name: "Soulblime Blunt Hemp Wraps Chocomint",
    brand: "Soulblime", brandKey: "soulblime", modelSlug: "hemp-wrap-chocomint",
    category: "Conos y blunts", esperaTiendas: 2 },
  // SPLIT de P10281: la version de Concentrados sale a producto propio.
  { offerIds: [16056, 19533], name: "Storz & Bickel Llavero Capsule Caddy Concentrados",
    brand: "Storz & Bickel", brandKey: "storz-bickel", modelSlug: "capsule-caddy-concentrados",
    category: "Repuestos para bongs y vaporizadores", esperaTiendas: 2,
    desdeProducto: { 16056: 10281 } },
];

// La normal de Piranha entra a P10281 para que NO pierda la tienda que cede.
const RESCATES: Array<{ productId: number; offerIds: number[] }> = [
  { productId: 10281, offerIds: [16095] },
];

function normalizeName(value: string) {
  return value.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]+/g, " ").trim();
}

async function storeIdsOf(productId: number, excluir: number[] = []) {
  const rows = await prisma.offer.findMany({
    where: { productId, id: { notIn: excluir.length ? excluir : [-1] } },
    select: { storeId: true }, distinct: ["storeId"],
  });
  return new Set(rows.map((r) => r.storeId));
}

async function main() {
  console.log(APPLY ? "APLICANDO r59" : "DRY-RUN r59");
  let ofertasVinculadas = 0;
  let tiendasSumadas = 0;

  // ─── TAREA A + rescates ───
  for (const spec of [...UPGRADES, ...RESCATES]) {
    const p = await prisma.product.findUnique({
      where: { id: spec.productId },
      select: { id: true, brandKey: true, modelSlug: true, category: true },
    });
    if (!p) throw new Error(`P${spec.productId} no existe`);

    const antes = await storeIdsOf(p.id);
    const offers = await prisma.offer.findMany({
      where: { id: { in: spec.offerIds } },
      select: { id: true, productId: true, storeId: true, title: true, price: true,
                inStock: true, store: { select: { slug: true } } },
    });
    const faltan = spec.offerIds.filter((id) => !offers.some((o) => o.id === id));
    if (faltan.length) throw new Error(`P${p.id}: ofertas inexistentes ${faltan.join(",")}`);
    const ocupadas = offers.filter((o) => o.productId !== null);
    if (ocupadas.length) throw new Error(`P${p.id}: ya vinculadas ${ocupadas.map((o) => `of${o.id}->P${o.productId}`).join(",")}`);

    // Un producto de 4+ tiendas solo puede SUMAR una tienda ausente.
    const mismas = offers.filter((o) => antes.has(o.storeId));
    if (antes.size >= 4 && mismas.length) {
      throw new Error(`P${p.id} CONGELADO (${antes.size}t) y ${mismas.map((o) => `of${o.id}`).join(",")} son de tienda ya presente`);
    }

    const despues = new Set([...antes, ...offers.map((o) => o.storeId)]);
    const nuevas = [...new Set(offers.filter((o) => !antes.has(o.storeId)).map((o) => o.store.slug))];
    console.log(`\nP${p.id} ${p.brandKey}/${p.modelSlug}: ${antes.size}t -> ${despues.size}t (+${despues.size - antes.size}) | ${offers.length} ofertas${nuevas.length ? ` | suma: ${nuevas.join(",")}` : ""}`);
    for (const o of offers) {
      console.log(`   + [${o.store.slug}] of${o.id} $${o.price} stock=${o.inStock} ${o.title.slice(0, 46)}`);
    }
    tiendasSumadas += despues.size - antes.size;
    ofertasVinculadas += offers.length;

    if (!APPLY) continue;
    for (const o of offers) {
      await prisma.offer.update({ where: { id: o.id }, data: { productId: p.id, category: p.category } });
    }
  }

  // ─── TAREA B ───
  for (const spec of NEW_PRODUCTS) {
    console.log(`\n=== NUEVO: ${spec.name} (${spec.brandKey}/${spec.modelSlug}) ===`);
    if (!/^[a-z0-9-]+$/.test(spec.modelSlug) || spec.modelSlug.endsWith("-")) {
      throw new Error(`modelSlug invalido '${spec.modelSlug}'`);
    }
    if (spec.modelSlug.includes(spec.brandKey)) throw new Error(`el slug repite la marca: ${spec.modelSlug}`);

    const existing = await prisma.product.findUnique({
      where: { brandKey_modelSlug: { brandKey: spec.brandKey, modelSlug: spec.modelSlug } },
    });
    if (existing) throw new Error(`ya existe P${existing.id}`);

    const offers = await prisma.offer.findMany({
      where: { id: { in: spec.offerIds } },
      select: { id: true, productId: true, storeId: true, title: true, price: true,
                inStock: true, imageUrl: true, store: { select: { slug: true } } },
    });
    const faltan = spec.offerIds.filter((id) => !offers.some((o) => o.id === id));
    if (faltan.length) throw new Error(`ofertas inexistentes ${faltan.join(",")}`);
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
    const precios = offers.map((o) => o.price);
    const ratio = Math.max(...precios) / Math.min(...precios);
    for (const o of offers) {
      const mov = spec.desdeProducto?.[o.id] ? ` (sale de P${spec.desdeProducto[o.id]})` : "";
      console.log(`   + [${o.store.slug}] of${o.id} $${o.price} stock=${o.inStock}${mov} ${o.title.slice(0, 44)}`);
    }
    console.log(`   -> ${tiendas.size} tiendas | ${offers.filter((o) => o.inStock).length}/${offers.length} con stock | ratio ${ratio.toFixed(2)}`);
    if (ratio > 1.8) throw new Error(`ratio ${ratio.toFixed(2)} > 1.8`);

    // El producto de origen del split no puede perder tiendas.
    if (spec.desdeProducto) {
      for (const origen of new Set(Object.values(spec.desdeProducto))) {
        const antes = await storeIdsOf(origen);
        const despues = await storeIdsOf(origen, spec.offerIds);
        // los rescates ya aplicados (o por aplicar) reponen la tienda cedida
        const repuestas = RESCATES.filter((r) => r.productId === origen).flatMap((r) => r.offerIds);
        const reps = await prisma.offer.findMany({ where: { id: { in: repuestas.length ? repuestas : [-1] } }, select: { storeId: true } });
        const final = new Set([...despues, ...reps.map((r) => r.storeId)]);
        console.log(`   P${origen}: ${antes.size}t -> ${final.size}t tras el split (reponiendo of${repuestas.join(",")})`);
        if (final.size < antes.size) throw new Error(`el split haria perder tiendas a P${origen}`);
      }
    }

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
    console.log(`   creado P${product.id} | tiendas: ${(await storeIdsOf(product.id)).size}`);
    ofertasVinculadas += offers.length;
  }

  console.log(`\n${APPLY ? "APLICADO" : "DRY-RUN"}: ${ofertasVinculadas} ofertas, +${tiendasSumadas} tiendas en productos existentes, ${NEW_PRODUCTS.length} productos nuevos`);
  if (!APPLY) console.log("(no se escribió nada)");
}

main().finally(() => prisma.$disconnect());
