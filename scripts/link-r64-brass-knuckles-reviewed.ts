// Ronda 64 (2026-07-30): Brass Knuckles, la veta que sobrevivio al analisis de
// Friendly Grow del 30 jul.
//
// ── LA NOTA DE MEMORIA ESTABA EQUIVOCADA EN LA FORMA ──────────────────────────
// Anotaba: "brass-knuckles tiene la bateria 900mAh 510 en FG ($5.990-6.990),
// Piranha ($10.791/$13.491) y Kushbreak ($18.990) -> producto nuevo de 3 tiendas".
// Eso asumia UN producto con las tres tiendas dentro. Al abrir las fichas resulta
// que son TRES MODELOS distintos, y el reparto por tienda no es el que sugeria el
// rango de precios: son 3 productos de 2 tiendas cada uno, no 1 de 3 tiendas.
// El acierto de la nota fue que la marca NO estaba cerrada (la version vieja de la
// memoria decia "sin par posible, no volver a barrer"); el error fue contar tiendas
// sobre un rango de precios en vez de sobre las fichas.
//
// Universo: 41 ofertas con marca brass-knuckles en 3 tiendas (FG 38, Piranha 2,
// Kushbreak 1), LAS 41 HUERFANAS, 0 productos con brandKey=brass-knuckles.
// 11 fichas base + la 650mAh que el brandKey pesco por el typo "Knukles".
//
// ── EL DISCRIMINANTE ES EL METODO DE CARGA, Y LAS DOS TIENDAS LO MODELAN IGUAL ─
// Las tres versiones comparten el mismo blister dorado ("BRASS KNUCKLES / 900 mAh
// Adjustable Battery"), el mismo cuerpo tipo pen y la misma descripcion de FG
// (900mAh, 3 niveles de temperatura, precalentado con 2 clics, on/off con 5).
// Lo que las separa, verificado por foto:
//   a) CARGADOR DE ROSCA 510: la bateria no tiene puerto; se atornilla a un disco
//      USB negro con el logo de knuckle, que viene en la caja.
//   b) USB-C: puerto en el cuerpo, sin disco en la foto.
//   c) PANTALLA: otro molde — tapa plana sin collar metalico y panel LCD abajo
//      (voltaje + barras de bateria).
// Y FG vende cada version bajo UNA URL BASE DISTINTA, igual que Piranha. Por la
// regla "la URL zanja la identidad antes que la foto", son las tiendas mismas
// diciendo que son modelos distintos: NO se fusionan en un producto de 3 tiendas.
//
// ── PRODUCTOS NUEVOS ──────────────────────────────────────────────────────────
// 1) Bateria 900mAh con Cargador USB (rosca 510) — 2 tiendas, 8 ofertas, ratio 3.17
//      fg /vaporizador-brass-knuckles-900mah-rosca-510-original  7 of $5.990
//      kushbreak /brassknuckless-bateria-900mah                   of70321 $18.990
//    IDENTIDAD CERRADA POR FOTO: las dos fotos muestran la misma terna —
//    blister dorado + bateria + EL MISMO DISCO CARGADOR USB de rosca 510. La de
//    Kushbreak es tornasol/rainbow (su imagen se llama "...rainbow7728.jpg") y FG
//    tiene justo la variante "Tornasol"; el color fusiona. Su descripcion tambien
//    coincide (900mAh, rosca 510, voltaje ajustable, precalentado 10s, LED que
//    cambia de color por voltaje) y no menciona ni USB-C ni pantalla.
//    OJO — RATIO 3.17 ($5.990 FG vs $18.990 Kushbreak), sobre el umbral de outlier
//    (>2x): NACE CON BADGE "Revisar" en /interno/inteligencia-precios. El precio de
//    Kushbreak se verifico EN VIVO contra su ficha (JSON-LD: 18990.0, InStock), asi
//    que no es un precio rancio; es la diferencia real y es justo lo que el
//    comparador existe para mostrar. Kushbreak es la mas cara de forma sistematica.
//
// 2) Bateria 900mAh USB-C — 2 tiendas, 8 ofertas, ratio 1.54. El caso mas limpio.
//      fg /vaporizador-brass-knuckles-900mah-cargador-tipo-c  7 of $6.990
//      piranha /8855/...usb-c-con-cable...html                of80734 $10.791
//    Mismo blister y mismo cuerpo que la anterior, sin disco cargador; la ficha de
//    FG agrega la linea "Cargador Tipo C" a la misma descripcion y el titulo de
//    Piranha dice "USB-C con Cable". Misma spec de carga en las dos tiendas.
//
// 3) Bateria 900mAh con Pantalla — 2 tiendas, 7 ofertas, ratio 1.93.
//      fg /vaporizador-premium-led-brass-knuckles-900mah-para-cartridge  6 of $6.990
//      piranha /8854/...pantalla-y-usb-c...html                          of80728 $13.491
//    Molde distinto a 1 y 2, y el mismo en las dos tiendas: tapa plana sin collar
//    metalico, boton ovalado y panel oscuro en la base. En la foto de Piranha la
//    pantalla esta ENCENDIDA (digitos de voltaje + barras); en las de FG esta
//    apagada, y por eso FG la llama "Led"/"Smart" en vez de "pantalla". Confirmado
//    con la 2a imagen de FG (su pack de 10, los 6 colores): mismo molde y mismo
//    panel en la base. Ratio 1.93: alto pero bajo el umbral de outlier de 2x.
//
// ── RECHAZADO, con el motivo ──────────────────────────────────────────────────
// * 6 fichas de PACKS MAYORISTAS de FG (10x $40.000/$55.000, 50x $185.000, 100x
//   $350.000, y el 10x de la Smart Pro $65.000). Packs != unidad; ninguna otra
//   tienda vende packs, asi que no hay par. Misma trampa que r61 con los packs de
//   10 del Vertex y que r33 con packs vs unidad.
// * FG /brassknukles-smart-pro-650mah — 6 of $8.490 + su pack de 10. Es 650mAh, NO
//   900mAh, y se vende como "Edicion Friendly", exclusiva de la tienda. La talla no
//   fusiona (regla del proyecto: 55mm != 63mm). Huerfana legitima, sin par en
//   ninguna otra tienda. Nota: el brandKey la pesco pese al typo "Knukles" del
//   titulo — merito del backfill de marca, no del texto.
// * Fusionar los productos 1 y 2 en uno de 3 tiendas (la lectura de la memoria).
//   Seria la tentacion de la ronda: daria un producto de 3 tiendas en vez de dos de
//   2. Se rechaza porque mezclaria dos metodos de carga que AMBAS tiendas separan en
//   fichas distintas, pondria dos precios de FG ($5.990 y $6.990) en la misma pagina
//   —el patron de mislink que el filtro de outliers de r33 tuvo que deshacer— y el
//   ratio quedaria en 3.17 igual, por Kushbreak.
//
// Categoria: "Repuestos para bongs y vaporizadores", la de los hermanos ya curados
// (P10681 bateria-mystica-max, P11004 bateria-vertex-2-0) y la que ya tienen 3 de
// las 6 fichas. Las otras 3 estan en "Vaporizadores herbales" / "Otros parafernalia"
// por como el clasificador lee cada titulo; se unifican al vincular.
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
  // Techo de ratio declarado A PROPOSITO por caso. El default del resto de las
  // rondas es 1.8; subirlo exige justificarlo en la cabecera.
  ratioMax: number;
};

const CATEGORIA = "Repuestos para bongs y vaporizadores";

const NEW_PRODUCTS: NewSpec[] = [
  {
    offerIds: [
      87578, 87579, 87580, 87581, 87582, 87583, 87584, // friendlygrow, 7 colores
      70321,                                            // kushbreak, tornasol
    ],
    name: "Brass Knuckles Batería 900mAh con Cargador USB",
    brand: "Brass Knuckles",
    brandKey: "brass-knuckles",
    modelSlug: "bateria-900mah-cargador-usb",
    category: CATEGORIA,
    esperaTiendas: 2,
    ratioMax: 3.2, // $5.990 vs $18.990: outlier real y verificado en vivo, ver cabecera
  },
  {
    offerIds: [
      87571, 87572, 87573, 87574, 87575, 87576, 87577, // friendlygrow, 7 colores
      80734,                                            // piranha
    ],
    name: "Brass Knuckles Batería 900mAh USB-C",
    brand: "Brass Knuckles",
    brandKey: "brass-knuckles",
    modelSlug: "bateria-900mah-usb-c",
    category: CATEGORIA,
    esperaTiendas: 2,
    ratioMax: 1.8,
  },
  {
    offerIds: [
      87998, 88000, 88001, 88002, 88004, 88006, // friendlygrow, 6 colores
      80728,                                     // piranha
    ],
    name: "Brass Knuckles Batería 900mAh con Pantalla",
    brand: "Brass Knuckles",
    brandKey: "brass-knuckles",
    modelSlug: "bateria-900mah-pantalla",
    category: CATEGORIA,
    esperaTiendas: 2,
    ratioMax: 2.0, // 1.93: bajo el umbral de outlier, sobre el default de 1.8
  },
];

function normalizeName(value: string) {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

async function storeIdsOf(productId: number) {
  const rows = await prisma.offer.findMany({
    where: { productId },
    select: { storeId: true },
    distinct: ["storeId"],
  });
  return new Set(rows.map((r) => r.storeId));
}

async function main() {
  console.log(APPLY ? "APLICANDO" : "DRY-RUN");

  // Ninguna oferta puede aparecer en dos especificaciones a la vez.
  const todas = NEW_PRODUCTS.flatMap((s) => s.offerIds);
  const repetidas = todas.filter((id, i) => todas.indexOf(id) !== i);
  if (repetidas.length) {
    throw new Error(`ofertas repetidas entre productos: ${[...new Set(repetidas)].join(",")}`);
  }

  for (const spec of NEW_PRODUCTS) {
    console.log(`\n=== NUEVO: ${spec.name} (${spec.brandKey}/${spec.modelSlug}) ===`);

    if (!/^[a-z0-9-]+$/.test(spec.modelSlug) || spec.modelSlug.endsWith("-")) {
      throw new Error(`modelSlug invalido '${spec.modelSlug}' (es URL publica)`);
    }
    if (spec.modelSlug.includes(spec.brandKey)) {
      throw new Error(`modelSlug '${spec.modelSlug}' repite la marca`);
    }
    const existing = await prisma.product.findUnique({
      where: { brandKey_modelSlug: { brandKey: spec.brandKey, modelSlug: spec.modelSlug } },
    });
    if (existing) throw new Error(`ya existe P${existing.id} con ese brandKey/modelSlug`);

    const offers = await prisma.offer.findMany({
      where: { id: { in: spec.offerIds } },
      select: {
        id: true,
        productId: true,
        storeId: true,
        title: true,
        url: true,
        price: true,
        inStock: true,
        imageUrl: true,
        store: { select: { slug: true } },
      },
    });
    const faltan = spec.offerIds.filter((id) => !offers.some((o) => o.id === id));
    if (faltan.length) throw new Error(`ofertas inexistentes: ${faltan.join(",")}`);
    const ocupadas = offers.filter((o) => o.productId !== null);
    if (ocupadas.length) {
      throw new Error(
        `ya vinculadas: ${ocupadas.map((o) => `of${o.id}->P${o.productId}`).join(",")}`,
      );
    }

    const tiendas = new Set(offers.map((o) => o.storeId));
    if (tiendas.size !== spec.esperaTiendas) {
      throw new Error(`daria ${tiendas.size} tiendas, se esperaban ${spec.esperaTiendas}`);
    }
    if (tiendas.size < 2) throw new Error(`un producto nuevo exige >=2 tiendas distintas`);

    // Una sola ficha base por tienda: si una tienda aporta dos URLs base distintas,
    // son dos modelos segun esa misma tienda (regla "la URL zanja la identidad").
    const fichasPorTienda = new Map<string, Set<string>>();
    for (const o of offers) {
      const base = o.url.split("?")[0];
      const set = fichasPorTienda.get(o.store.slug) ?? new Set<string>();
      set.add(base);
      fichasPorTienda.set(o.store.slug, set);
    }
    for (const [slug, fichas] of fichasPorTienda) {
      if (fichas.size > 1) {
        throw new Error(`${slug} aporta ${fichas.size} fichas base distintas: ${[...fichas].join(" | ")}`);
      }
    }

    const porTienda = new Map<string, { n: number; min: number; max: number; stock: number }>();
    for (const o of offers) {
      const e = porTienda.get(o.store.slug) ?? { n: 0, min: o.price, max: o.price, stock: 0 };
      e.n += 1;
      e.min = Math.min(e.min, o.price);
      e.max = Math.max(e.max, o.price);
      if (o.inStock) e.stock += 1;
      porTienda.set(o.store.slug, e);
    }
    for (const [s, e] of porTienda) {
      console.log(
        `   [${s.padEnd(14)}] ${e.n} of, ${e.stock} c/stock, $${e.min}${e.min === e.max ? "" : `-${e.max}`}`,
      );
    }
    const precios = [...porTienda.values()].map((e) => e.min);
    const ratio = Math.max(...precios) / Math.min(...precios);
    const conStock = offers.filter((o) => o.inStock).length;
    console.log(
      `   -> ${tiendas.size} tiendas | ${conStock}/${offers.length} con stock | ratio ${ratio.toFixed(2)} (techo ${spec.ratioMax})`,
    );
    if (ratio > spec.ratioMax) {
      throw new Error(`ratio ${ratio.toFixed(2)} > ${spec.ratioMax} declarado: revisar antes de crear`);
    }
    if (ratio > 2) {
      console.log(`   AVISO: ratio >2x — nacera con badge "Revisar" en inteligencia-precios`);
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
      await prisma.offer.update({
        where: { id: o.id },
        data: { productId: product.id, category: spec.category },
      });
    }
    console.log(`   creado P${product.id} | tiendas: ${(await storeIdsOf(product.id)).size}`);
  }

  if (!APPLY) console.log("\n(dry-run: no se escribió nada)");
}

main().finally(() => prisma.$disconnect());
