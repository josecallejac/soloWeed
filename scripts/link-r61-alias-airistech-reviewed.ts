// Ronda 61 (2026-07-29): lo que el HUECO DE ALIAS airis/airistech tenia tapado.
//
// Contexto: hasta hoy Friendly Grow escribia "Airis" y las otras cinco tiendas
// "Airistech", y como ambas formas estaban en KNOWN_BRAND_PHRASES cada una resolvia
// a su propio brandKey (0 productos con airis, 8 con airistech). Toda herramienta que
// agrupa por marca era ciega al cruce. Cerrado el alias + brand:backfill, el universo
// airistech quedo unificado (217 ofertas) y aparecieron estos casos.
//
// LA NOTA DE MEMORIA SE QUEDO CORTA. Anotaba "2 upgrades a 4t + 2 productos nuevos
// (uno de 3t con FG y uno de 2t)". Medido sobre el universo unificado, el efecto real
// es mayor: el Vertex 2.0 tiene ofertas en LAS CINCO tiendas que lo venden, no en 3.
//
// ── PRODUCTOS NUEVOS ──────────────────────────────────────────────────────────
// 1) Airistech Bateria Vertex 2.0 — 5 TIENDAS, 25 ofertas, 21 con stock, ratio 1.50.
//    Seria el producto n.28 de 5 tiendas del catalogo. Identidad cerrada POR URL Y
//    DESCRIPCION, sin foto:
//      astro    /vaporizador-vertex-20-airistech   11 of $7.990-9.990  sku VPATVX<color>
//      fumetas  /vaporizador-vertex-20              6 of $11.990       "Bateria Vertex 2.0"
//      fg       /vaporizador-airis-vertex-20-para-cartridges-cargador-tipo-c  6 of $7.990
//      piranha  /bateria-vaporizador-vertex-cartridge-airis-v20.html  1 of $9.592
//      gb       /parafernalia/bateria-atmos.html                      1 of $9.900
//    "V2.0" == "Vertex 2.0": la URL de Piranha dice literalmente "vertex...airis-v20" y
//    su descripcion ("3 niveles de potencia variables, atornillar tu cartridge") es la
//    misma bateria 510. La URL de GB dice "bateria-atmos" — es una ficha RECICLADA de
//    PrestaShop, no una Atmos: titulo "Airis Battery V2 2.0 Black", brand='AIRIS' y
//    descripcion coherente. Se acepta por contenido, no por URL.
//    Ratio 1.50 (fumetas $11.990 vs astro/fg $7.990): alto pero dentro de la misma
//    linea; Fumetas es la mas cara del catalogo en esta marca de forma consistente.
//
// 2) Vaporizador Airis Quaser — 3 tiendas, 19 ofertas, 16 con stock, ratio 1.25.
//    astro /vaporizador-quaser-airistech 9 of $16.990 | fumetas /vaporizador-quaser-black
//    5 of $19.990 | fg /vaporizador-airis-quaser-rosca-510-airistech 5 of $15.990.
//    La memoria lo tenia como 2 tiendas (Fumetas+FG); Astro entra al cerrar el alias.
//
// 3) Airistech Bateria Mystica II — 2 tiendas, 11 ofertas, ratio 1.05.
//    fumetas /vaporizador-airis-mystica-ii 10 of $19.990 | astro of32795 $18.990
//    (sku VPATMCSILVER, "MYSTICA II SILVER"). SIN STOCK EN NINGUNA DE LAS DOS: se crea
//    igual, la regla del proyecto es marcar sin stock y nunca desvincular, porque
//    conserva el historial de precios. Precedente P10992 y los 5 productos de r58b.
//
// ── UPGRADES (ninguno era congelado antes; los tres suman exactamente 1 tienda) ──
//  P10681 bateria-mystica-max  3t -> 4t  + 6 of Fumetas $18.790 (/airis-bateria-cartridge-mystica-max)
//  P10720 bateria-mystica-ace  3t -> 4t  + of71225 GB $22.500 (/vape-shop/airistech-battery-mystica-ace.html)
//  P10882 dabble               2t -> 3t  + of33353 Astro $25.990 (sku VPATDABLACK)
//
// ── GEMELAS DE LA MISMA FICHA (no suman tienda; limpian huerfanas) ────────────
//  P10720 + of88199  (FG, misma ficha /vaporizador-airis-mystica-ace que sus 5 hermanas)
//  P10885 + of12919  (Fumetas, misma ficha /boquilla-herbva-5g que of35843)
//  P10887 + of18568  (Fumetas, misma ficha /boquilla-herbva-nokiva que of37320)
//  Los tres destinos tienen 2-3 tiendas, NO estan congelados: una 2a oferta de una
//  tienda ya presente esta permitida (precedente Life Pod r31, difusores Bonglab r36).
//  of12919 es la oferta BASE de una ficha wildcard ("Boquillas Herbva 5G (Flat/Glass)"):
//  se asigna a la Flat porque su precio ($4.990) es el de la Flat (of35843 $4.990) y no
//  el de la Glass (of35844 $8.990). El precio desempata el wildcard sin foto.
//
// ── RECHAZADO, con el motivo ──────────────────────────────────────────────────
// * of69156 Kushbreak "Airis bateria 350MAH" $12.990 — LA TENTACION DE LA RONDA:
//   llevaria el Vertex a 6 TIENDAS, y su descripcion coincide con la del Vertex de
//   Piranha (3 niveles de voltaje, 3,4V/3,7V/4,0V, rosca 510). PERO el titulo no nombra
//   ningun modelo y declara 350mAh, dato que no esta confirmado para el Vertex 2.0.
//   Airis vende varias baterias 510 genericas. NECESITA-FOTO/especificacion: la
//   pregunta concreta es "el Vertex 2.0 es de 350mAh y tiene ese cuerpo?".
//   NO se fuerza por la tentacion del sexto nivel.
// * FG /promo-10-x-vaporizador-airis-vertex-20-para-cartridges (7 of, hasta $59.990) —
//   PACKS MAYORISTAS DE 10 UNIDADES, no la unidad. Trampa ya anotada en memoria.
// * of37284 Fumetas "Repuesto Airis Quaser Qcell Coil" $19.990 — es el COIL de repuesto,
//   no el vaporizador, y cuesta lo mismo que el vaporizador de Fumetas ($19.990).
//   Ratio 1.00 tapando un mislink de TIPO: el patron exacto de of13676/of69003 en r59.
// * of87560 (FG, boquilla de enfriamiento Herbva 5G $11.990) y of87784 (FG, Nokiva
//   $24.990) contra P10885/P10887 (boquillas simples $4.990-5.990) — ratio 2.4 y 4.2.
//   Precedente directo: en r58c se SEPARO P10506 porque mezclaba boquillas simples de
//   $10.990 con una unidad de enfriamiento de $25.990. Son piezas distintas.
// * of33396, of33397, of33398 (Astro, misma ficha /vaporizador-nokiva-kit-airistech que
//   las 3 ya vinculadas) contra P10680 — P10680 TIENE 4 TIENDAS, esta CONGELADO.
//   Meter una 2a oferta de una tienda ya presente NO es "solo sumar": PROHIBIDO sin OK
//   explicito del usuario. Queda anotado como decision pendiente.
// * of37321 Fumetas "Boquillas Vaporizador Nokiva - GLASS" $5.990 contra P10887 — lo
//   atrape revisando el dry-run, no la medicion. La ficha de Fumetas
//   /boquilla-herbva-nokiva es un wildcard con variantes "Regular" y "Glass", y el
//   catalogo YA separa esas dos versiones en productos distintos para el modelo hermano:
//   P10885 boquilla-herbva-5g (Flat, of35843) y P10886 boquilla-herbva-5g-glass
//   (of35844). Meter la Glass de Nokiva en P10887, que agrupa la Regular, contradiria
//   ese precedente y crearia el mismo mislink que r33 tuvo que deshacer. Queda huerfana
//   como candidata a "boquilla-nokiva-glass" si aparece par en otra tienda; hoy Astro
//   solo tiene la Regular (of32853, ya en P10887).
// * Modelos con una sola tienda, sin par posible hoy: Mystica III (Fumetas 6), Mystica
//   Pro (Fumetas 4), Herbva X (Fumetas 3 + 2 accesorios Astro que NO son el vaporizador),
//   Herbva Viva (Fumetas 3), Airis Tick (Fumetas 3), Airis 8 Dip&Dab (Fumetas 4),
//   Bateria Cube (Astro 5), Bateria Vigor (Astro 5), Switch (GB 1), adaptador y boquilla
//   Airis-Focus V (Astro 2).
//
// Categorias: se siguen las de los hermanos ya curados — las baterias 510 van a
// "Repuestos para bongs y vaporizadores" (como P10681 bateria-mystica-max y P10720
// bateria-mystica-ace) y el Quaser a "Vaporizadores herbales" (como P10882 dabble).
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
};

const NEW_PRODUCTS: NewSpec[] = [
  {
    offerIds: [
      91783, 91787, 32304, 91785, 32307, 32306, 91786, 32302, 32303, 32305, 91782, // astro
      35980, 35982, 35978, 35981, 35979, 35983,                                     // fumetas
      87985, 87989, 87986, 87988, 87993, 87991,                                     // friendlygrow
      39077,                                                                         // piranha
      39805,                                                                         // growbarato
    ],
    name: "Airistech Batería Vertex 2.0",
    brand: "Airistech", brandKey: "airistech", modelSlug: "bateria-vertex-2-0",
    category: "Repuestos para bongs y vaporizadores", esperaTiendas: 5,
  },
  {
    offerIds: [
      33080, 33079, 33078, 33081, 33082, 92617, 92618, 92620, 92621, // astro
      37502, 37499, 37498, 37501, 37500,                             // fumetas
      87603, 87601, 87602, 87604, 87605,                             // friendlygrow
    ],
    name: "Vaporizador Airis Quaser",
    brand: "Airistech", brandKey: "airistech", modelSlug: "quaser",
    category: "Vaporizadores herbales", esperaTiendas: 3,
  },
  {
    offerIds: [
      36580, 36582, 36578, 36584, 36581, 36583, 36587, 36579, 36586, 36585, // fumetas
      32795,                                                                 // astro
    ],
    name: "Airistech Batería Mystica II",
    brand: "Airistech", brandKey: "airistech", modelSlug: "bateria-mystica-ii",
    category: "Repuestos para bongs y vaporizadores", esperaTiendas: 2,
  },
];

type UpSpec = {
  productId: number;
  offerIds: number[];
  tiendasAntes: number;
  tiendasDespues: number;
  // true = el lote incluye a proposito ofertas de una tienda YA presente (gemelas de
  // la misma ficha). Prohibido si el producto esta congelado.
  permiteMismaTienda?: boolean;
  nota: string;
};

const UPGRADES: UpSpec[] = [
  { productId: 10681, offerIds: [37835, 37834, 37836, 37832, 37833, 37837], tiendasAntes: 3, tiendasDespues: 4,
    nota: "+ Fumetas (6 variantes de color, /airis-bateria-cartridge-mystica-max)" },
  { productId: 10720, offerIds: [71225, 88199], tiendasAntes: 3, tiendasDespues: 4, permiteMismaTienda: true,
    nota: "+ GrowBarato of71225; of88199 es gemela FG de la misma ficha" },
  { productId: 10882, offerIds: [33353], tiendasAntes: 2, tiendasDespues: 3,
    nota: "+ Astro of33353 Dabble Black (sku VPATDABLACK)" },
  { productId: 10885, offerIds: [12919], tiendasAntes: 2, tiendasDespues: 2, permiteMismaTienda: true,
    nota: "gemela Fumetas de la misma ficha /boquilla-herbva-5g" },
  // of37321 (variante GLASS de la misma ficha) queda FUERA a proposito: ver cabecera.
  { productId: 10887, offerIds: [18568], tiendasAntes: 2, tiendasDespues: 2, permiteMismaTienda: true,
    nota: "gemela Fumetas de la misma ficha /boquilla-herbva-nokiva (solo la Regular)" },
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

  // ─────────────── PRODUCTOS NUEVOS ───────────────
  for (const spec of NEW_PRODUCTS) {
    console.log(`\n=== NUEVO: ${spec.name} (${spec.brandKey}/${spec.modelSlug}) ===`);

    if (!/^[a-z0-9-]+$/.test(spec.modelSlug) || spec.modelSlug.endsWith("-")) {
      throw new Error(`modelSlug invalido '${spec.modelSlug}' (es URL publica)`);
    }
    const existing = await prisma.product.findUnique({
      where: { brandKey_modelSlug: { brandKey: spec.brandKey, modelSlug: spec.modelSlug } },
    });
    if (existing) throw new Error(`ya existe P${existing.id} con ese brandKey/modelSlug`);

    const offers = await prisma.offer.findMany({
      where: { id: { in: spec.offerIds } },
      select: { id: true, productId: true, storeId: true, title: true, price: true, inStock: true,
                imageUrl: true, store: { select: { slug: true } } },
    });
    const faltan = spec.offerIds.filter((id) => !offers.some((o) => o.id === id));
    if (faltan.length) throw new Error(`ofertas inexistentes: ${faltan.join(",")}`);
    const ocupadas = offers.filter((o) => o.productId !== null);
    if (ocupadas.length) throw new Error(`ya vinculadas: ${ocupadas.map((o) => `of${o.id}->P${o.productId}`).join(",")}`);

    const tiendas = new Set(offers.map((o) => o.storeId));
    if (tiendas.size !== spec.esperaTiendas) {
      throw new Error(`daria ${tiendas.size} tiendas, se esperaban ${spec.esperaTiendas}`);
    }

    const porTienda = new Map<string, { n: number; min: number; max: number; stock: number }>();
    for (const o of offers) {
      const e = porTienda.get(o.store.slug) ?? { n: 0, min: o.price, max: o.price, stock: 0 };
      e.n += 1; e.min = Math.min(e.min, o.price); e.max = Math.max(e.max, o.price);
      if (o.inStock) e.stock += 1;
      porTienda.set(o.store.slug, e);
    }
    for (const [s, e] of porTienda) {
      console.log(`   [${s.padEnd(14)}] ${e.n} of, ${e.stock} c/stock, $${e.min}${e.min === e.max ? "" : `-${e.max}`}`);
    }
    const precios = [...porTienda.values()].map((e) => e.min);
    const ratio = Math.max(...precios) / Math.min(...precios);
    const conStock = offers.filter((o) => o.inStock).length;
    console.log(`   -> ${tiendas.size} tiendas | ${conStock}/${offers.length} con stock | ratio ${ratio.toFixed(2)}`);
    if (ratio > 1.8) throw new Error(`ratio ${ratio.toFixed(2)} > 1.8: revisar antes de crear`);

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
    console.log(`   creado P${product.id} | tiendas: ${(await storeIdsOf(product.id)).size}`);
  }

  // ─────────────── UPGRADES Y GEMELAS ───────────────
  for (const spec of UPGRADES) {
    const p = await prisma.product.findUnique({
      where: { id: spec.productId },
      select: { id: true, brandKey: true, modelSlug: true, category: true, name: true },
    });
    if (!p) throw new Error(`P${spec.productId} no existe`);
    console.log(`\n=== UPGRADE P${p.id} ${p.brandKey}/${p.modelSlug} — ${spec.nota} ===`);

    const antes = await storeIdsOf(p.id);
    if (antes.size !== spec.tiendasAntes) {
      throw new Error(`P${p.id} tiene ${antes.size} tiendas, se esperaban ${spec.tiendasAntes}`);
    }

    const offers = await prisma.offer.findMany({
      where: { id: { in: spec.offerIds } },
      select: { id: true, productId: true, storeId: true, title: true, price: true, inStock: true,
                store: { select: { slug: true } } },
    });
    const faltan = spec.offerIds.filter((id) => !offers.some((o) => o.id === id));
    if (faltan.length) throw new Error(`ofertas inexistentes: ${faltan.join(",")}`);
    const ocupadas = offers.filter((o) => o.productId !== null);
    if (ocupadas.length) throw new Error(`ya vinculadas: ${ocupadas.map((o) => `of${o.id}->P${o.productId}`).join(",")}`);

    // REGLA DURA: un producto de 4+ tiendas solo puede SUMAR una tienda ausente.
    const mismas = offers.filter((o) => antes.has(o.storeId));
    if (antes.size >= 4 && mismas.length) {
      throw new Error(`P${p.id} esta CONGELADO (${antes.size}t) y ${mismas.map((o) => `of${o.id}`).join(",")} son de una tienda ya presente: prohibido sin OK del usuario`);
    }
    if (mismas.length && !spec.permiteMismaTienda) {
      throw new Error(`${mismas.map((o) => `of${o.id}`).join(",")} son de una tienda ya presente y no se declaro permiteMismaTienda`);
    }

    for (const o of offers) {
      const nueva = antes.has(o.storeId) ? "gemela" : "TIENDA NUEVA";
      console.log(`   + [${o.store.slug}] of${o.id} $${o.price} stock=${o.inStock} (${nueva}) ${o.title.slice(0, 45)}`);
    }
    const despues = new Set([...antes, ...offers.map((o) => o.storeId)]);
    console.log(`   -> ${antes.size}t -> ${despues.size}t (suma ${despues.size - antes.size})`);
    if (despues.size !== spec.tiendasDespues) {
      throw new Error(`quedaria en ${despues.size} tiendas, se esperaban ${spec.tiendasDespues}`);
    }

    if (!APPLY) continue;
    for (const o of offers) {
      await prisma.offer.update({ where: { id: o.id }, data: { productId: p.id, category: p.category } });
    }
    console.log(`   aplicado | tiendas ahora: ${(await storeIdsOf(p.id)).size}`);
  }

  if (!APPLY) console.log("\n(dry-run: no se escribió nada)");
}

main().finally(() => prisma.$disconnect());
