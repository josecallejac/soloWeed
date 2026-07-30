// Ronda 74 (2026-07-30, 5a sesion): EL MAPA DE MARCAS, CORRIDO SOBRE EL CATALOGO
// COMPLETO POR PRIMERA VEZ.
//
// El paso 1 de `docs/NUEVA_TIENDA.md` ("el que mas rinde") se armaba a mano y
// SIEMPRE se corria como "tienda nueva contra el resto". Esta vez se escribio
// como script commiteado (`scripts/diagnose-brand-map.ts`, que el propio doc
// pedia) y se corrio GLOBAL. La diferencia importa: una marca sin producto
// curado es un hueco del CATALOGO, no de una tienda, asi que puede vivir entre
// dos tiendas VIEJAS y no aparecer nunca mientras solo se barran las nuevas. Es
// el mismo error que r73 destapo con los tokens IDF.
//
// Y en efecto: de los 4 productos que nacen aca, 2 son Astro+Kushbreak y 1 es
// GrowBarato+Fumetas -- ninguno involucra a Friendly Grow, que era la tienda por
// la que se barria.
//
// ── RESULTADO DEL BARRIDO: 7 MARCAS SIN NINGUN PRODUCTO CURADO ──────────────
// De las 7, 4 mueren con evidencia y 3 rinden:
//
//   santa-cruz-shredder  10 huerf  Astro+Kushbreak   -> 2 productos (abajo)
//   actitube              6 huerf  GB+Fumetas        -> 1 producto  (abajo)
//   boveda                6 huerf  Fum+GB+Kushbreak  -> 1 producto  (abajo, y
//                                                       ojo: 4 de esas 6 eran
//                                                       un BUG DE MARCA)
//   baked-bunny          47 huerf  FG+GB             -> CERRADA
//   grav                  4 huerf  Piranha+Fumetas   -> CERRADA
//   dark-horse            3 huerf  GB+Astro          -> CERRADA
//   smokers-choice        2 huerf  Fumetas+Astro     -> CERRADA
//
// ── POR QUE LAS 4 CERRADAS ESTAN CERRADAS (para no volver a barrerlas) ───────
// - baked-bunny (la mas grande, 47 huerfanas): NO HAY SOLAPE DE TIPO. Las 46 de
//   Friendly Grow son bandejas, contenedores y moledores, todas "Diseño N" (o
//   sea ediciones, que ademas nunca fusionan entre si); la unica de GrowBarato
//   es un papelillo ("Celulosa 1 1/4 + Tips"). No hay un solo par posible.
//   Esto CONFIRMA por otra via lo que r67 ya habia concluido para FG.
// - dark-horse: GB vende papel (Silver 1 1/4, Bio de cañamo) y Astro vende una
//   maquina de liar. Cero solape.
// - grav: las 4 huerfanas son 4 productos DISTINTOS (moledor 3 partes y mini
//   beaker bong en Piranha; hitter taster y filling system en Fumetas).
// - smokers-choice: RECHAZO POR REGLA. Fumetas of203 $2.490 es un pack de 34
//   papelillos + 34 boquillas regulares + 34 conicas; Astro of18093 $3.990 es
//   "un librito" suelto (su propio sku dice UND = unidad). "Un pack nunca es la
//   unidad". El ratio 1,60 encima apunta al lado contrario del sentido comun.
//
// ── PRODUCTO 1 y 2: SANTA CRUZ SHREDDER, DESEMPATADOS POR NUMERO DE PIEZAS ──
// Astro tiene 7 huerfanas y Kushbreak 3, y a primera vista no se podian cruzar:
// Astro nombra las tallas en español (Mediano/Grande) y Kushbreak en ingles
// (Small/Medium/Large), y los precios se entrecruzan -- el "Grande" de Astro
// ($54.990) vale EXACTAMENTE lo mismo que el "Small" de Kushbreak ($54.990),
// que es justo el par equivocado.
//
// Lo que desempata es el NUMERO DE PIEZAS, y esta en las dos tiendas:
//   - Astro lo pone en el SKU y en el titulo: MLSCALM(BLK) 2 piezas contra
//     MLSCALM(4P)BLK 4 piezas. Su descripcion lo confirma ("Al ser de 2 piezas,
//     hay menos partes que limpiar" / "malla T304 filtra el polen").
//   - Kushbreak NO lo pone en el titulo pero SI en la descripcion, y ademas da
//     el diametro: Small 3,9cm / Medium 5,3cm / Large 6,8cm, "4 Piezas" las tres.
//
// Con eso el cruce es unico:
//   Astro Mediano 4P  <-> Kushbreak Medium (5,3cm, 4 piezas)   ratio 1,33
//   Astro Grande  4P  <-> Kushbreak Large  (6,8cm, 4 piezas)   ratio 1,22
// Y quedan huerfanas LEGITIMAS, que es la prueba de que el cruce no es goloso:
//   - los 2 de Astro de 2 PIEZAS (Mediano y Grande): Kushbreak no vende 2 piezas.
//   - el Small de Kushbreak: Astro no vende talla pequeña.
// Las tallas NO se fusionan entre si (Medium != Large), pero el COLOR si:
//   - P.nuevo Medium recibe of2683 (base/negro) + of31060 (azul, sku ...4PBLU).
//   - P.nuevo Large  recibe of2682 (base) + of31053 (Negro): comparten el sku
//     MLSCALG4PBLK y la misma imagen, o sea la base ES la negra.
// OJO, desliz de Astro registrado: la descripcion de of31053 dice "moledor
// MEDIANO de 4 piezas", pero su titulo, su sku (...(G)4PBLK) y su URL dicen
// Grande. Manda el titulo/URL, como ya esta establecido.
//
// ── PRODUCTO 3: ACTITUBE SLIM 7MM 10U, CERRADO CONTRA LA TIENDA EN VIVO ─────
//   of13686 [Fumetas] $3.490 "actiTube Boquillas carbon activado Slim 7mm - 10
//                             Unidades" (sku ACT-BS7MM10)
//   of11404 [GrowBarato] $3.700 "Boquillas de Carbon Activo SLIM 7mm ActiTube"
// Misma marca y mismo calibre, ratio 1,06. El problema era que GB NO declara la
// cantidad en ningun campo scrapeado, y la cantidad es FORMATO, o sea talla, que
// no fusiona. No se acepto por parecido: se fue a la ficha en vivo, y su propio
// data-layer lo dice, `"item_variant":"10 unidades","value":"3700"` -- la ficha
// es un WILDCARD con selector 10u/50u y el precio scrapeado es el de 10
// unidades. Mismo precedente que el Honeypuff de r65 (wildcard asignado por el
// precio). Corroboracion: su foto muestra ~10 filtros sueltos, y el pack de 40u
// Regular de Fumetas cuesta $12.490, asi que un 50u no podria valer $3.700.
//
// ── PRODUCTO 4: BOVEDA 62% 4GR, Y EL BUG DE MARCA QUE LO TAPABA ─────────────
//   of70955 [GrowBarato] $1.600 "Boveda 62% para mantener humedad perfecta"
//   of70209 [Kushbreak]  $1.500 "Boveda 4gr 62% controlador de humedad"
// Ratio 1,07. GB tampoco declaraba el gramaje; lo zanja la FOTO: la etiqueta del
// sachet de GB se lee "2-WAY HUMIDITY CONTROL / 62% / 4 GRAM". Mismo formato.
//
// El mapa decia que boveda tenia 6 huerfanas en 3 tiendas. Era MENTIRA y de las
// buenas, porque inflaba justo la marca que estaba mirando: 4 de esas 6 no son
// Boveda. Se arreglo por precedencia en matching-constants (nunca por UPDATE), y
// son DOS bugs de mecanismo distinto, ninguno visto antes:
//   1. of74000/74001/74002 "Integra Boost 320gr": el titulo dice Integra Boost y
//      el campo `brand` de la tienda TAMBIEN. La que miente es la URL, porque
//      Fumetas les puso el slug de la marca competidora:
//      "fumetas.cl/boveda-size-320g-55". Es el INVERSO del patron r68/r69, donde
//      la fuente mentirosa era el campo `brand` de la tienda. -> alias de
//      prioridad ["integra boost", "integra-boost"].
//   2. of20194 "TOQI Blunt Box": ni titulo, ni URL, ni campo `brand` dicen
//      boveda -- los tres dicen TOQI. Entraba por el FALLBACK POR DESCRIPTION,
//      que solo actua cuando ninguna marca conocida calza: al no estar "toqi"
//      registrada, el humidificador heredaba la marca de los sachets que su
//      propio texto menciona. -> "toqi" a KNOWN_BRAND_PHRASES.
// Verificado con `brand:backfill --dry-run`: cambian 7 ofertas y solo esas 7
// (las 3 Integra, la Blunt Box, y de yapa 3 kits TOQi que estaban SIN marca).
//
// ── EL FILTRO OBLIGATORIO ───────────────────────────────────────────────────
// Aca no aplica "¿suma tienda?" sino su equivalente para productos nuevos: cada
// producto nace con ofertas de EXACTAMENTE 2 tiendas distintas. No se crean
// productos de 1 tienda (incidente r55).
//
// Dry-run por defecto; escribe solo con --apply.
import { prisma } from "../src/lib/prisma";
import { normalizeForSearch } from "../src/lib/tokenize";
import { classifyProduct } from "./scrape";

const APPLY = process.argv.includes("--apply");

type Spec = {
  name: string;
  brand: string;
  brandKey: string;
  modelSlug: string;
  category: string;
  offerIds: number[];
  evidencia: string;
};

const SPECS: Spec[] = [
  {
    name: "Santa Cruz Shredder Medium 4 Piezas",
    brand: "Santa Cruz Shredder",
    brandKey: "santa-cruz-shredder",
    modelSlug: "medium-4-piezas",
    category: "Moledores",
    offerIds: [2683, 31060, 68962],
    evidencia: "4 piezas en ambas + 5,3cm en Kushbreak; azul es color",
  },
  {
    name: "Santa Cruz Shredder Large 4 Piezas",
    brand: "Santa Cruz Shredder",
    brandKey: "santa-cruz-shredder",
    modelSlug: "large-4-piezas",
    category: "Moledores",
    offerIds: [2682, 31053, 68966],
    evidencia: "4 piezas en ambas + 6,8cm en Kushbreak; of31053 comparte sku con la base",
  },
  {
    name: "ActiTube Boquillas Carbón Activado Slim 7mm 10u",
    brand: "ActiTube",
    brandKey: "actitube",
    modelSlug: "carbon-activado-slim-7mm-10u",
    category: "Filtros y boquillas",
    offerIds: [11404, 13686],
    evidencia: "data-layer de GB: item_variant='10 unidades' al precio scrapeado",
  },
  {
    name: "Boveda Control de Humedad 62% 4gr",
    brand: "Boveda",
    brandKey: "boveda",
    modelSlug: "humedad-62-4gr",
    category: "Otros parafernalia",
    offerIds: [70955, 70209],
    evidencia: "la etiqueta del sachet de GB se lee '62% / 4 GRAM'",
  },
];

async function main() {
  console.log(APPLY ? "APLICANDO r74\n" : "DRY-RUN r74\n");

  const plan: { spec: Spec; tiendas: string[]; ofertas: { id: number; store: string; price: number; title: string; imageUrl: string | null }[] }[] = [];

  for (const spec of SPECS) {
    // Nunca pisar una URL publica ya emitida.
    const choque = await prisma.product.findFirst({
      where: { brandKey: spec.brandKey, modelSlug: spec.modelSlug },
      select: { id: true, name: true },
    });
    if (choque) throw new Error(`P${choque.id} ya usa ${spec.brandKey}/${spec.modelSlug}`);

    const ofertas: { id: number; store: string; price: number; title: string; imageUrl: string | null }[] = [];
    for (const oid of spec.offerIds) {
      const o = await prisma.offer.findUnique({
        where: { id: oid },
        select: {
          id: true, productId: true, title: true, url: true, price: true, inStock: true,
          sourceCategory: true, imageUrl: true, store: { select: { slug: true } },
        },
      });
      if (!o) throw new Error(`of${oid} no existe`);
      if (o.productId !== null) throw new Error(`of${o.id} ya cuelga de P${o.productId}`);
      if (classifyProduct(o.title, o.url, o.sourceCategory ?? undefined) === null) {
        throw new Error(`of${o.id} esta FUERA de alcance`);
      }
      ofertas.push({ id: o.id, store: o.store.slug, price: o.price, title: o.title, imageUrl: o.imageUrl });
    }

    const tiendas = [...new Set(ofertas.map((o) => o.store))].sort();
    // No se crean productos de 1 tienda (incidente r55).
    if (tiendas.length < 2) throw new Error(`${spec.name} tendria ${tiendas.length} tienda(s)`);

    plan.push({ spec, tiendas, ofertas });

    console.log(`NUEVO  ${spec.brandKey}/${spec.modelSlug}  [${tiendas.length}t: ${tiendas.join(", ")}]`);
    console.log(`   "${spec.name}"  (${spec.category})`);
    console.log(`   ${spec.evidencia}`);
    for (const o of ofertas) console.log(`     + of${o.id} [${o.store}] $${o.price} | ${o.title}`);
    console.log();
  }

  const totalOfertas = plan.reduce((s, p) => s + p.ofertas.length, 0);
  console.log(`RESUMEN: ${plan.length} productos nuevos, ${totalOfertas} ofertas`);

  if (!APPLY) {
    console.log("\n(dry-run: no se escribió nada)");
    return;
  }

  console.log("\n=== APLICANDO ===");
  for (const { spec, ofertas, tiendas } of plan) {
    const portada = ofertas.find((o) => o.imageUrl) ?? null;
    const product = await prisma.product.create({
      data: {
        name: spec.name,
        normalizedName: normalizeForSearch(spec.name),
        brand: spec.brand,
        brandKey: spec.brandKey,
        modelKey: spec.modelSlug,
        modelSlug: spec.modelSlug,
        category: spec.category,
        imageUrl: portada?.imageUrl ?? null,
      },
    });
    await prisma.offer.updateMany({
      where: { id: { in: spec.offerIds } },
      data: { productId: product.id, category: spec.category },
    });

    const despues = await prisma.offer.findMany({
      where: { productId: product.id },
      select: { storeId: true, store: { select: { slug: true } } },
      distinct: ["storeId"],
    });
    const ok = despues.length === tiendas.length;
    console.log(`${ok ? "OK " : "!! "} P${product.id} ${spec.brandKey}/${spec.modelSlug} -> ${despues.length}t (${despues.map((d) => d.store.slug).sort().join(", ")})`);
    if (!ok) throw new Error(`P${product.id} quedo con ${despues.length} tiendas, se esperaban ${tiendas.length}`);
  }
  console.log("\nAPLICADO r74. Recordar: los productos nuevos nacen con shortDescription null.");
}

main().finally(() => prisma.$disconnect());
