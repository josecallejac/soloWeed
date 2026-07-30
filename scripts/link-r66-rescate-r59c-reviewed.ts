// Ronda 66 (2026-07-30): lo aplicable de r61 tras auditarla.
//
// De los 4 entregables del ejecutor, esta ronda aplica lo que sobrevivio a la
// auditoria mecanica + revision caso por caso:
//   * Tarea C (rescate de r59-C): 26 productos nuevos de los 50 que proponia.
//   * Tarea C reinterpretada: 1 UPGRADE que el ejecutor habia propuesto como
//     producto nuevo y habria duplicado un hermano existente.
//   * Tarea B: 1 desvinculacion.
// La Tarea A no aporta nada aplicable (ver mas abajo) y la Tarea D quedo fuera
// porque su vector de correccion es equivocado (ver la nota al final).
//
// ── LO QUE SE RECHAZO DE LA TAREA C, Y POR QUE ───────────────────────────────
// * "glass-terp-slurper-marble-set-9" — DUPLICARIA P10446 calvo/marble-set, que ya
//   tiene 4 TIENDAS y agrupa LA MISMA FICHA de Astro (/marble-set-calvo-glass) con
//   los mismos SKU (BGCGMBSPRP, BGCGMBSCLR, BGCGMBSBLK, BGCGMBSPNK). Las 5 ofertas
//   de Astro son gemelas de un CONGELADO: prohibido sin OK del usuario. La 6a
//   (of36979 Fumetas "Terp Slurper Marble Set - 9") viene de OTRA ficha de Fumetas
//   que la de P10446, asi que tampoco pertenece ahi.
// * "quemador-honeycomb-macho-14mm-morado" — Astro aporta DOS fichas base
//   (/quemador-macho-14mm-bonglab y /quemador-de-14mm-bonglab) con 3 SKU distintos,
//   y una de las ofertas es la variante "GENERICO". La tienda misma dice que son
//   modelos distintos.
// * "bong-little-buchner-ks10-negro" y "bong-w06-fat-candy-25cm-azul" — LA MISMA
//   TRAMPA DOS VECES: la oferta de Astro es un PACK NAVIDENO (sku PACKKS10BLKMAS y
//   PACKW06BLUXMAS, URLs /pack-bong-...), no la unidad; y la unidad de Fumetas
//   pertenece a P5777 little-buchner y P5340 fat-candy, ambos de 4 TIENDAS y
//   CONGELADOS, que ya tienen Fumetas. Packs != unidad (precedente r33 y r64).
// * "estuche-roller-wallet-kamo" — las 2 ofertas son gemelas de P10447
//   ryot/roller-wallet: misma ficha en las dos tiendas y of31799 comparte el SKU
//   TXRTROWTBLACK con of18134/of77704, que YA estan en P10447. No es producto
//   nuevo; a lo sumo es higiene de gemelas y no suma tienda.
// * "platinium-x2-chocolate-1u" — gemelas de P8638 blunt-wrap/wrap-platinum-2u
//   (3t), que ya agrupa el resto de los sabores de la misma ficha de Fumetas
//   /blunt-wrap-platinum-x2. No suma tienda.
//
// ── EL HALLAZGO: UNA "PROPUESTA DE PRODUCTO NUEVO" ERA UN UPGRADE ────────────
// El ejecutor proponia crear "lion-rolling-circus/transparent-block-420" con
// of11594 (GrowBarato) + of69098 (Kushbreak). Pero **P10708
// lion-rolling-circus/celulosa-transparente-4-20-block YA EXISTE** con Fumetas y
// Piranha. Crear el producto habria fabricado exactamente el hermano duplicado que
// la Tarea A del mismo brief tenia que cazar. Vinculadas al producto existente,
// las 2 ofertas lo suben de **2 a 4 TIENDAS**, que vale mucho mas que un producto
// nuevo de 2. Ninguna de las 2 tiendas estaba presente: es "solo sumar" puro.
//
// ── TAREA A: NADA APLICABLE ──────────────────────────────────────────────────
// Sus 5 FUSIONAR se caen los 5. El que parecia mas claro (Zippo Cannabis Design,
// P10308+P10332, que ademas habria subido a 3 tiendas) se cae porque **Fumetas
// vende los dos bajo SKU Zippo distintos — ZIPP-49632CD y ZIPP-49185CD — y en dos
// fichas base distintas**. En Zippo el SKU ES el numero de modelo. Fusionarlos
// seria repetir el caso que obligo a borrar clipper/lighter-classic. Los otros 4:
// dos mezclan cantidades (6u con 50u, 3u con 50u, con precios de $2.990 contra
// $29.990 y la columna de ratio diciendo 1.00), uno mete un "Estuche Flat con
// Clave" con el estuche normal, y el ultimo (P10885+P10886) contradice la
// separacion Flat/Glass que se decidio a proposito en r61.
//
// ── TAREA B: SOLO 1 DE 3 ─────────────────────────────────────────────────────
// * SE APLICA: desvincular of12254 de P10246 bonglab/cleaner-250ml. Es el "Glass
//   Cleaner Brillo 30Ml" ($2.490, sku SPBLGCLBR30ML) colgando del limpiador de
//   250 ml (sku SPBLGCL250ML). Astro SIGUE en el producto via of77489 (250 ML), asi
//   que **no se pierde ninguna tienda**: P10246 se queda en 3. Ademas mata el
//   outlier de ratio 3.05x que la memoria arrastraba como causa conocida.
// * NO SE APLICA of12689 -> P10105: el destino tiene 4 TIENDAS y la oferta es de
//   Astro, que YA esta dentro. Meter una gemela en un congelado esta prohibido sin
//   OK explicito (precedente of33396-33398 en r61). Ademas la ficha de Astro
//   /flat-bucket-banger-calvo es un wildcard de 4 variantes con los SKU MAL puestos
//   (of32872 dice 90°14 siendo la variante 45°14), asi que el SKU no desempata.
// * NO SE APLICA el caso RAW: toca P5799, congelado de 4 tiendas. Va a decision.
//
// ── TAREA D: FUERA, Y NO POR SU CALIDAD ─────────────────────────────────────
// Sus veredictos son correctos —de hecho el `brand:backfill` de la higiene de r64
// ya arreglo 28 de sus 104 filas solo, confirmandolos—, pero corregir
// `Offer.brandKey` a mano NO ES DURABLE: el proximo backfill lo vuelve a derivar
// del titulo. Las 76 que quedan son justo las que el backfill no arregla (el caso
// gordo, `bonglab != re-stash` con 30 ofertas, sobrevive porque los titulos dicen
// literalmente "BongLab Contenedor Re:Stash"). El arreglo real es una regla de
// prioridad en matching-constants.ts, no escrituras a la BD.
//
// Nombres y slugs REESCRITOS respecto del CSV: se quitaron nombres de tienda
// ("| PIRANHA", "- Growbarato"), el simbolo ® con zero-width del caso Shine, y los
// 17 slugs que repetian la marca o la palabra de la categoria (invariante de URL).
//
// Dry-run por defecto; escribe solo con --apply.
import { prisma } from "../src/lib/prisma";

const APPLY = process.argv.includes("--apply");

const EXTRACCION = "Accesorios de extraccion";
const REPUESTOS = "Repuestos para bongs y vaporizadores";
const OTROS = "Otros parafernalia";
const HERBALES = "Vaporizadores herbales";

type NewSpec = {
  offerIds: number[];
  name: string;
  brand: string;
  brandKey: string;
  modelSlug: string;
  category: string;
  ratioMax?: number;
};

const NEW_PRODUCTS: NewSpec[] = [
  { offerIds: [13315, 35039, 35040, 35041, 35042, 69052], name: "Vaporizador DaVinci IQ2",
    brand: "DaVinci", brandKey: "davinci", modelSlug: "iq2", category: HERBALES },
  { offerIds: [19561, 36214, 36215, 36216, 69011], name: "Blazer Big Buddy Soplete",
    brand: "Blazer", brandKey: "blazer", modelSlug: "big-buddy", category: "Encendedores y sopletes" },
  { offerIds: [19798, 69008], name: "Vaporizador Pulsar APX Pro",
    brand: "Pulsar", brandKey: "pulsar", modelSlug: "apx-pro", category: HERBALES },
  { offerIds: [8126, 69242], name: "Pulsar Chillum Hitter",
    brand: "Pulsar", brandKey: "pulsar", modelSlug: "chillum-hitter", category: "Pipas" },
  { offerIds: [19512, 71013], name: "Ozeta Bolso Cilíndrico con Clave Anti-Olor",
    brand: "Ozeta", brandKey: "ozeta", modelSlug: "bolso-cilindrico-con-clave",
    category: "Contenedores y estuches" },
  { offerIds: [1205, 69015], name: "Futurola x Mike Tyson 1 1/4 + Tips",
    brand: "Futurola", brandKey: "futurola", modelSlug: "mike-tyson-1-1-4-tips", category: "Papelillos" },
  { offerIds: [32075, 33856], name: "Bonglab Quemador con Rejilla Macho 14mm Verde",
    brand: "Bonglab", brandKey: "bonglab", modelSlug: "quemador-con-rejilla-macho-14mm-verde",
    category: REPUESTOS },
  { offerIds: [2001, 31274], name: "Bonglab Banger Cuarzo Simple 45° Macho 10mm",
    brand: "Bonglab", brandKey: "bonglab", modelSlug: "banger-cuarzo-simple-45-10mm", category: EXTRACCION },
  { offerIds: [33935, 71166], name: "Bonglab Bong Pocket Twister 23cm Negro",
    brand: "Bonglab", brandKey: "bonglab", modelSlug: "pocket-twister-23cm-negro", category: "Bongs" },
  { offerIds: [18157, 69333], name: "Puffco Peak",
    brand: "Puffco", brandKey: "puffco", modelSlug: "peak", category: EXTRACCION },
  { offerIds: [77687, 80305], name: "Puffco New Peak Pro 3DXL Plasma Edition Chamber",
    brand: "Puffco", brandKey: "puffco", modelSlug: "new-peak-pro-3dxl-plasma-chamber", category: EXTRACCION },
  { offerIds: [16172, 79564], name: "Puffco New Hot Knife Plasma",
    brand: "Puffco", brandKey: "puffco", modelSlug: "new-hot-knife-plasma", category: EXTRACCION },
  { offerIds: [19952, 69026], name: "Ryot 420 Kit Todo en 1",
    brand: "Ryot", brandKey: "ryot", modelSlug: "420-kit-todo-en-1", category: OTROS },
  { offerIds: [8159, 69010], name: "Ryot Hitter de Aluminio Anodizado 6mm",
    brand: "Ryot", brandKey: "ryot", modelSlug: "hitter-aluminio-anodizado-6mm", category: "Pipas" },
  { offerIds: [77848, 80584], name: "Focus V Boquilla Swivel para Carta 2, Carta Sport y Aeris",
    brand: "Focus V", brandKey: "focus-v", modelSlug: "boquilla-swivel-carta-2-sport-aeris",
    category: REPUESTOS },
  { offerIds: [4659, 68961], name: "Pulsar King Kut Moledor Eléctrico 40mm",
    brand: "Pulsar", brandKey: "pulsar", modelSlug: "king-kut-electrico-40mm", category: "Moledores" },
  { offerIds: [4635, 69327], name: "Pulsar Moledor Contenedor Wax/Hierba 61mm",
    brand: "Pulsar", brandKey: "pulsar", modelSlug: "contenedor-wax-hierba-61mm", category: "Moledores" },
  { offerIds: [20300, 69337], name: "Pulsar Adaptador de Silicona para Cartridges",
    brand: "Pulsar", brandKey: "pulsar", modelSlug: "adaptador-silicona-cartridges", category: REPUESTOS },
  { offerIds: [19947, 69146], name: "Vaporizador Pulsar Proshift",
    brand: "Pulsar", brandKey: "pulsar", modelSlug: "proshift", category: HERBALES },
  { offerIds: [2150, 78984], name: "Calvo Glass Flat Bucket Banger 90° Macho 10mm",
    brand: "Calvo Glass", brandKey: "calvo", modelSlug: "banger-flat-bucket-90-macho-10mm",
    category: EXTRACCION },
  { offerIds: [24006, 25993], name: "G Pen Silicone Mouthpiece Roam Black",
    brand: "G Pen", brandKey: "g-pen", modelSlug: "silicone-mouthpiece-roam-black", category: OTROS },
  { offerIds: [13136, 69003], name: "Shine 24K Cono de Oro King Size",
    brand: "Shine", brandKey: "shine", modelSlug: "pre-roll-24k-oro-king-size", category: "Conos y blunts" },
  { offerIds: [12899, 69136], name: "OCB Boquillas Filtro de Carbón Activado 50 uds.",
    brand: "OCB", brandKey: "ocb", modelSlug: "carbon-activado-50-uds", category: "Filtros y boquillas" },
  { offerIds: [25412, 33408], name: "Stündenglass V2 Wall Mount",
    brand: "Stündenglass", brandKey: "stundenglass", modelSlug: "v2-wall-mount", category: OTROS },
  { offerIds: [788, 2291], name: "Vibes Papelillos Organic Hemp 1 1/4",
    brand: "Vibes", brandKey: "vibes", modelSlug: "organic-hemp-1-1-4", category: "Papelillos" },
  { offerIds: [78373, 79898], name: "Integra Boost Humedad 55%",
    brand: "Integra Boost", brandKey: "integra-boost", modelSlug: "humedad-55", category: OTROS },
];

// Palabra(s) de categoria que el modelSlug no puede repetir (invariante de URL).
const CATWORDS: Record<string, string[]> = {
  Bongs: ["bong"], Papelillos: ["papelillo"], Moledores: ["moledor"], Pipas: ["pipa"],
  [HERBALES]: ["vaporizador"], "Encendedores y sopletes": ["encendedor", "soplete"],
  "Contenedores y estuches": ["contenedor", "estuche"], "Conos y blunts": ["cono", "blunt"],
  "Filtros y boquillas": ["filtro", "boquilla"], [EXTRACCION]: [], [REPUESTOS]: [], [OTROS]: [],
};

const UPGRADES = [
  { productId: 10708, offerIds: [11594, 69098], tiendasAntes: 2, tiendasDespues: 4,
    nota: "+ GrowBarato of11594 y Kushbreak of69098 (el ejecutor lo proponia como producto nuevo duplicado)" },
];

const DESVINCULAR = [
  { offerId: 12254, productId: 10246, tiendasQuedan: 3,
    nota: "Glass Cleaner Brillo 30Ml (sku SPBLGCLBR30ML) fuera del limpiador de 250 ml; Astro sigue via of77489" },
];

function normalizeName(value: string) {
  return value.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, " ").trim();
}

async function storeIdsOf(productId: number) {
  const rows = await prisma.offer.findMany({
    where: { productId }, select: { storeId: true }, distinct: ["storeId"],
  });
  return new Set(rows.map((r) => r.storeId));
}

async function main() {
  console.log(APPLY ? "APLICANDO" : "DRY-RUN");

  const todas = [
    ...NEW_PRODUCTS.flatMap((s) => s.offerIds),
    ...UPGRADES.flatMap((s) => s.offerIds),
  ];
  const rep = todas.filter((id, i) => todas.indexOf(id) !== i);
  if (rep.length) throw new Error(`ofertas repetidas entre especificaciones: ${[...new Set(rep)].join(",")}`);

  let creados = 0;
  for (const spec of NEW_PRODUCTS) {
    if (!/^[a-z0-9-]+$/.test(spec.modelSlug) || spec.modelSlug.endsWith("-")) {
      throw new Error(`modelSlug invalido '${spec.modelSlug}'`);
    }
    if (spec.modelSlug.includes(spec.brandKey)) {
      throw new Error(`modelSlug '${spec.modelSlug}' repite la marca`);
    }
    for (const w of CATWORDS[spec.category] ?? []) {
      if (spec.modelSlug.includes(w)) {
        throw new Error(`modelSlug '${spec.modelSlug}' repite la categoria '${spec.category}' ("${w}")`);
      }
    }
    const existing = await prisma.product.findUnique({
      where: { brandKey_modelSlug: { brandKey: spec.brandKey, modelSlug: spec.modelSlug } },
    });
    if (existing) throw new Error(`ya existe P${existing.id} en ${spec.brandKey}/${spec.modelSlug}`);

    const offers = await prisma.offer.findMany({
      where: { id: { in: spec.offerIds } },
      select: { id: true, productId: true, storeId: true, url: true, price: true, inStock: true,
                imageUrl: true, store: { select: { slug: true } } },
    });
    const faltan = spec.offerIds.filter((id) => !offers.some((o) => o.id === id));
    if (faltan.length) throw new Error(`${spec.modelSlug}: ofertas inexistentes ${faltan.join(",")}`);
    const ocupadas = offers.filter((o) => o.productId !== null);
    if (ocupadas.length) {
      throw new Error(`${spec.modelSlug}: ya vinculadas ${ocupadas.map((o) => `of${o.id}->P${o.productId}`).join(",")}`);
    }
    const tiendas = new Set(offers.map((o) => o.storeId));
    if (tiendas.size < 2) throw new Error(`${spec.modelSlug}: solo ${tiendas.size} tienda`);

    // Una sola ficha base por tienda: si una tienda aporta dos, son dos modelos.
    const fichas = new Map<string, Set<string>>();
    for (const o of offers) {
      const s = fichas.get(o.store.slug) ?? new Set<string>();
      s.add(o.url.split("?")[0]);
      fichas.set(o.store.slug, s);
    }
    for (const [t, f] of fichas) {
      if (f.size > 1) throw new Error(`${spec.modelSlug}: ${t} aporta ${f.size} fichas base distintas`);
    }

    const precios = offers.map((o) => o.price);
    const ratio = Math.max(...precios) / Math.min(...precios);
    const techo = spec.ratioMax ?? 1.8;
    if (ratio > techo) throw new Error(`${spec.modelSlug}: ratio ${ratio.toFixed(2)} > ${techo}`);

    console.log(
      `\n${spec.brandKey}/${spec.modelSlug} | ${tiendas.size}t | ${offers.length} of | ` +
      `${offers.filter((o) => o.inStock).length} c/stock | $${Math.min(...precios)}-${Math.max(...precios)} r=${ratio.toFixed(2)}`,
    );
    console.log(`   "${spec.name}" [${spec.category}]`);

    if (!APPLY) continue;
    const portada = offers.find((o) => o.inStock && o.imageUrl) ?? offers.find((o) => o.imageUrl);
    const product = await prisma.product.create({
      data: {
        name: spec.name, normalizedName: normalizeName(spec.name), brand: spec.brand,
        brandKey: spec.brandKey, modelKey: spec.modelSlug, modelSlug: spec.modelSlug,
        category: spec.category, imageUrl: portada?.imageUrl ?? null,
      },
    });
    for (const o of offers) {
      await prisma.offer.update({ where: { id: o.id }, data: { productId: product.id, category: spec.category } });
    }
    console.log(`   -> creado P${product.id}`);
    creados++;
  }

  for (const spec of UPGRADES) {
    const p = await prisma.product.findUnique({
      where: { id: spec.productId },
      select: { id: true, brandKey: true, modelSlug: true, category: true },
    });
    if (!p) throw new Error(`P${spec.productId} no existe`);
    const antes = await storeIdsOf(p.id);
    if (antes.size !== spec.tiendasAntes) {
      throw new Error(`P${p.id} tiene ${antes.size} tiendas, se esperaban ${spec.tiendasAntes}`);
    }
    const offers = await prisma.offer.findMany({
      where: { id: { in: spec.offerIds } },
      select: { id: true, productId: true, storeId: true, price: true, inStock: true,
                store: { select: { slug: true } } },
    });
    if (offers.length !== spec.offerIds.length) throw new Error(`P${p.id}: ofertas inexistentes`);
    const ocupadas = offers.filter((o) => o.productId !== null);
    if (ocupadas.length) throw new Error(`P${p.id}: ya vinculadas ${ocupadas.map((o) => `of${o.id}`).join(",")}`);
    const mismas = offers.filter((o) => antes.has(o.storeId));
    if (mismas.length) {
      throw new Error(`P${p.id}: ${mismas.map((o) => `of${o.id}`).join(",")} son de una tienda ya presente`);
    }
    const despues = new Set([...antes, ...offers.map((o) => o.storeId)]);
    if (despues.size !== spec.tiendasDespues) {
      throw new Error(`P${p.id} quedaria en ${despues.size} tiendas, se esperaban ${spec.tiendasDespues}`);
    }
    console.log(`\nUPGRADE P${p.id} ${p.brandKey}/${p.modelSlug}: ${antes.size}t -> ${despues.size}t`);
    for (const o of offers) console.log(`   + [${o.store.slug}] of${o.id} $${o.price} stock=${o.inStock ? "si" : "NO"}`);
    console.log(`   ${spec.nota}`);
    if (!APPLY) continue;
    for (const o of offers) {
      await prisma.offer.update({ where: { id: o.id }, data: { productId: p.id, category: p.category } });
    }
    console.log(`   -> aplicado, tiendas ahora ${(await storeIdsOf(p.id)).size}`);
  }

  for (const spec of DESVINCULAR) {
    const o = await prisma.offer.findUnique({
      where: { id: spec.offerId },
      select: { id: true, productId: true, storeId: true, title: true, price: true },
    });
    if (!o) throw new Error(`of${spec.offerId} no existe`);
    if (o.productId !== spec.productId) {
      throw new Error(`of${spec.offerId} cuelga de ${o.productId}, se esperaba P${spec.productId}`);
    }
    const antes = await storeIdsOf(spec.productId);
    const restantes = await prisma.offer.findMany({
      where: { productId: spec.productId, id: { not: spec.offerId } },
      select: { storeId: true }, distinct: ["storeId"],
    });
    const despues = new Set(restantes.map((r) => r.storeId));
    console.log(`\nDESVINCULAR of${o.id} ($${o.price}) de P${spec.productId}: ${antes.size}t -> ${despues.size}t`);
    console.log(`   ${o.title}`);
    console.log(`   ${spec.nota}`);
    if (despues.size !== spec.tiendasQuedan) {
      throw new Error(`P${spec.productId} quedaria en ${despues.size} tiendas, se esperaban ${spec.tiendasQuedan}`);
    }
    if (!APPLY) continue;
    await prisma.offer.update({ where: { id: spec.offerId }, data: { productId: null } });
    console.log(`   -> desvinculada`);
  }

  console.log(`\n${APPLY ? `LISTO: ${creados} productos nuevos` : "(dry-run: no se escribió nada)"}`);
}

main().finally(() => prisma.$disconnect());
