// Ronda 77 (2026-07-30, 5a sesion): PIECEMAKER, y el cierre documentado de
// G-Rollz y Honeypuff.
//
// Continua el paso 2 del estandar sobre las marcas con muchas huerfanas y pocos
// productos que quedaban del recon: piecemaker (55 huerfanas / 9 productos),
// g-rollz (62/4) y honeypuff (83/1). Solo una de las tres rinde.
//
// Misma tecnica que r76: se declara la oferta de la tienda que falta + UNA
// semilla de Fumetas, y la familia de colores se expande por IGUALDAD EXACTA de
// URL base, que es la ficha de la tienda. Asi el agrupamiento es estructural y
// no un juicio.
//
// ── LOS 4 PRODUCTOS ─────────────────────────────────────────────────────────
//
// 1) PMG Kontainer (clasico)  <- GrowBarato of71153 $3.200 / Fumetas $3.590
//    Ratio 1,12. LO QUE DESEMPATA CONTRA EL "LARGE" ES LA PROPIA FICHA DE
//    FUMETAS, que los contrasta en texto: "Con Kontainer Large de PMG podras
//    guardar una gran cantidad de extraccion, mucho mas que lo que podias
//    guardar en Kontainer CLASICO". O sea: existen dos tamaños, y el de GB, que
//    no lleva apellido y vale menos, es el clasico.
//
// 2) PMG Kontainer Large      <- Piranha of15746 $5.490 / Fumetas $5.490
//    Precio IDENTICO y las dos lo llaman "Large". Es el par gemelo del anterior;
//    tenerlos juntos en la misma ronda es lo que hace segura la asignacion,
//    porque el riesgo real aqui era cruzar el clasico con el large.
//
// 3) PMG Bong Klutch          <- GrowBarato of3168 $22.900 / Fumetas $25.990
//    Ratio 1,13. Las dos descripciones dicen lo mismo: bong PEQUEÑO de silicona
//    con filtro de agua, portatil. Fumetas precisa "tipo Bubbler" y 18cm.
//
// 4) PMG Bong K9              <- Piranha of15759 $35.994 / Fumetas $49.990
//    Ratio 1,39, el mas alto de la ronda pero lejos del umbral de 2. Identidad
//    por modelo y coleccion: Piranha dice "modelo K9 de la coleccion KANNIMALS
//    de PieceMaker", Fumetas lo titula "Bong Perro Globo K9". Kannimals es la
//    linea de animales de PMG y K9 es el perro. Los dos son de silicona.
//
// ── G-ROLLZ: CERRADA, Y NO POR FALTA DE CANDIDATOS ─────────────────────────
// 62 huerfanas en 3 tiendas y aun asi ni un par limpio. Todos los cruces
// plausibles se caen por CANTIDAD o TAMAÑO, que nunca fusionan:
// - Conos Pink Banksy: Piranha vende (3u) $2.490, el producto P10195 que ya
//   existe es (20u), y Fumetas tiene un (6u) "Lightly Dyed Pink" $3.590. Tres
//   formatos distintos del mismo cono.
// - Bolsas hermeticas: Astro vende PACKS ($6.990, y sus variantes dicen "8U" y
//   "10U"), Piranha una unidad a $990. Ademas las medidas no coinciden entre si
//   (65x85mm contra 100x125mm) y Fumetas tiene tres bolsas distintas (Banksy
//   $990, Panda $690, Pets Rasta Mediana $1.290): el precio no discrimina cual.
// - Cono Blunt de Piranha ($3.990) viene "+ Tubo de Vidrio"; el x2 de Fumetas
//   ($3.290) no. Es otro contenido.
// - El "Tubo Plastico G-Rollz Porta Joint" de Piranha NO tiene contraparte:
//   Fumetas no vende tubo de esa marca (se reviso la lista entera).
// No volver a barrer G-Rollz sin ofertas nuevas.
//
// ── HONEYPUFF: DIFERIDA A PROPOSITO, CON EL MOTIVO ─────────────────────────
// 83 huerfanas pero 82 son de Friendly Grow y solo UNA de GrowBarato, asi que el
// techo de la marca es 1 producto. Esa unica oferta es of11609 "Conos HoneyPuff"
// $1.000, y Friendly Grow tiene TRES familias de conos:
//   $990   "Cono de Cañamo Pre-enrollado 98mm con Boquilla de Madera"
//   $1.790 "Cono de Cañamo con Boquilla de Madera"
//   $1.990 "Cono de Petalos Rosa y Boquilla Pyrex"
// El precio apunta clarisimo a la primera (ratio 1,01 contra 1,81 y 2,01), PERO
// esa seria la unica evidencia, y el precio es la señal mas debil del proyecto
// (leccion de r72, donde apuntaba al lado contrario). Peor: hay una
// CONTRADICCION DE MATERIAL sin resolver -- GrowBarato dice "conos de CELULOSA"
// y Friendly Grow dice "cono de CAÑAMO". Puede ser que a GB se le haya colado el
// nombre de su propia categoria ("papel-de-celulosa" esta en la URL), pero eso
// hay que comprobarlo, no suponerlo. NECESITA FOTO. Diferida.
//
// Dry-run por defecto; escribe solo con --apply.
import { prisma } from "../src/lib/prisma";
import { normalizeForSearch } from "../src/lib/tokenize";
import { classifyProduct } from "./scrape";

const APPLY = process.argv.includes("--apply");

type Spec = {
  name: string;
  modelSlug: string;
  category: string;
  otra: number;        // la oferta de la tienda que le falta al catalogo
  fumetasSeed: number; // semilla; su ficha completa se expande por URL base
};

const SPECS: Spec[] = [
  { name: "PieceMaker Kontainer Silicona", modelSlug: "kontainer", category: "Contenedores y estuches", otra: 71153, fumetasSeed: 631 },
  { name: "PieceMaker Kontainer Large Silicona", modelSlug: "kontainer-large", category: "Contenedores y estuches", otra: 15746, fumetasSeed: 20236 },
  { name: "PieceMaker Bong Klutch Silicona 18cm", modelSlug: "klutch-18cm", category: "Bongs", otra: 3168, fumetasSeed: 20309 },
  { name: "PieceMaker Bong K9 Kannimals Silicona", modelSlug: "k9-kannimals", category: "Bongs", otra: 15759, fumetasSeed: 13420 },
];

const baseUrl = (u: string) => u.split("?")[0];

async function main() {
  console.log(APPLY ? "APLICANDO r77\n" : "DRY-RUN r77\n");

  const plan: { spec: Spec; offerIds: number[]; tiendas: string[] }[] = [];
  const vistos = new Set<number>();

  for (const spec of SPECS) {
    const choque = await prisma.product.findFirst({
      where: { brandKey: "piecemaker", modelSlug: spec.modelSlug }, select: { id: true },
    });
    if (choque) throw new Error(`P${choque.id} ya usa piecemaker/${spec.modelSlug}`);

    const otra = await prisma.offer.findUnique({
      where: { id: spec.otra },
      select: { id: true, productId: true, title: true, url: true, price: true, sourceCategory: true, store: { select: { slug: true } } },
    });
    if (!otra) throw new Error(`of${spec.otra} no existe`);
    if (otra.productId !== null) throw new Error(`of${otra.id} ya cuelga de P${otra.productId}`);

    const semilla = await prisma.offer.findUnique({
      where: { id: spec.fumetasSeed },
      select: { id: true, productId: true, url: true, storeId: true, store: { select: { slug: true } } },
    });
    if (!semilla) throw new Error(`of${spec.fumetasSeed} no existe`);
    if (semilla.store.slug !== "fumetas") throw new Error(`of${semilla.id} no es de fumetas`);
    if (semilla.productId !== null) throw new Error(`of${semilla.id} ya cuelga de P${semilla.productId}`);

    const base = baseUrl(semilla.url);
    const candidatas = await prisma.offer.findMany({
      where: { storeId: semilla.storeId, productId: null },
      select: { id: true, url: true, title: true, price: true, inStock: true, sourceCategory: true },
    });
    const familia = candidatas.filter((o) => baseUrl(o.url) === base);
    if (!familia.some((o) => o.id === semilla.id)) throw new Error(`la semilla of${semilla.id} no quedo en su familia`);

    const ids = [otra.id, ...familia.map((o) => o.id)];
    for (const id of ids) {
      if (vistos.has(id)) throw new Error(`of${id} aparece en dos grupos`);
      vistos.add(id);
    }
    for (const o of [...familia, { id: otra.id, title: otra.title, url: otra.url, sourceCategory: otra.sourceCategory }]) {
      if (classifyProduct(o.title, o.url, o.sourceCategory ?? undefined) === null) {
        throw new Error(`of${o.id} esta FUERA de alcance`);
      }
    }

    const pf = familia.map((o) => o.price).filter((p) => p > 0);
    const ratio = pf.length && otra.price > 0
      ? Math.max(otra.price, Math.min(...pf)) / Math.min(otra.price, Math.min(...pf)) : 0;
    if (ratio > 2) throw new Error(`${spec.name}: ratio ${ratio.toFixed(2)} > 2`);

    const tiendas = ["fumetas", otra.store.slug].sort();
    if (new Set(tiendas).size !== 2) throw new Error(`${spec.name}: no son 2 tiendas distintas`);
    plan.push({ spec, offerIds: ids, tiendas });

    console.log(`NUEVO  piecemaker/${spec.modelSlug}  [2t: ${tiendas.join(", ")}]  ${ids.length} ofertas`);
    console.log(`   "${spec.name}" (${spec.category})  ratio ${ratio.toFixed(2)}`);
    console.log(`   + of${otra.id} [${otra.store.slug}] $${otra.price} | ${otra.title}`);
    console.log(`   + ${familia.length} de fumetas (ficha ${base})`);
    console.log();
  }

  const total = plan.reduce((s, p) => s + p.offerIds.length, 0);
  console.log(`RESUMEN: ${plan.length} productos nuevos, ${total} ofertas`);

  if (!APPLY) { console.log("\n(dry-run: no se escribió nada)"); return; }

  console.log("\n=== APLICANDO ===");
  for (const { spec, offerIds } of plan) {
    const portada = await prisma.offer.findFirst({
      where: { id: { in: offerIds }, imageUrl: { not: null } }, select: { imageUrl: true },
    });
    const product = await prisma.product.create({
      data: {
        name: spec.name,
        normalizedName: normalizeForSearch(spec.name),
        brand: "PieceMaker",
        brandKey: "piecemaker",
        modelKey: spec.modelSlug,
        modelSlug: spec.modelSlug,
        category: spec.category,
        imageUrl: portada?.imageUrl ?? null,
      },
    });
    await prisma.offer.updateMany({
      where: { id: { in: offerIds } }, data: { productId: product.id, category: spec.category },
    });
    const despues = await prisma.offer.findMany({
      where: { productId: product.id }, select: { storeId: true }, distinct: ["storeId"],
    });
    console.log(`${despues.length === 2 ? "OK " : "!! "} P${product.id} piecemaker/${spec.modelSlug} -> ${despues.length}t, ${offerIds.length} ofertas`);
    if (despues.length !== 2) throw new Error(`P${product.id} quedo con ${despues.length} tiendas`);
  }
  console.log("\nAPLICADO r77. Recordar: los productos nuevos nacen con shortDescription null.");
}

main().finally(() => prisma.$disconnect());
