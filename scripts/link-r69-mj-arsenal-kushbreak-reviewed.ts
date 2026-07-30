// Ronda 69 (2026-07-30, 4a sesion): MJ ARSENAL, LA MARCA QUE NADIE HABIA MIRADO.
//
// Encargo: cubrir Kushbreak con las mismas 4 palancas que se le aplicaron a
// Friendly Grow. La que rindio fue el MAPA DE MARCAS (patron r64/r65): buscar
// marcas SIN ningun producto curado que igual existen en varias tiendas. El
// worklist oficial no las ve por diseño, porque solo mira "huerfana -> producto
// de esa marca" y aqui no habia producto que mirar.
//
// MJ Arsenal tenia **62 ofertas en el catalogo y CERO productos**: 59 en Fumetas
// y 8 en Kushbreak (3 de ellas escondidas por un bug de marca, ver abajo).
//
// ── LO ACEPTADO: 4 PRODUCTOS NUEVOS, 22 OFERTAS ──────────────────────────────
// La identidad la cierra el NOMBRE DE MODELO, que en una linea de marca es el
// identificador (mismo estandar que r64 Brass Knuckles y r65 Honeypuff), y la
// confirma el precio. No hace falta foto: los dos primeros pares tienen precio
// IDENTICO al peso.
//
//   Martian Blunt Bubbler   KB of69294 $17.990  =  FU of19318 $17.990  ratio 1,00
//   The Dubbler             KB of69012 $29.990  =  FU of1545  $29.990  ratio 1,00
//   Pioneer 9.5cm           KB of69270 $18.990  vs FU of8111  $19.990  ratio 1,05
//   Deco 9.5cm              KB of69259 $22.990  vs FU of8110  $24.990  ratio 1,09
//
// Pioneer y Deco absorben ademas las variantes de COLOR de Fumetas (8 y 6): el
// color fusiona, la talla y la edicion no. Kushbreak no declara color, asi que
// su oferta calza con la ficha base.
//
// ── LO RECHAZADO ─────────────────────────────────────────────────────────────
// Las otras 4 de Kushbreak no tienen contraparte en ninguna tienda, asi que no
// pueden formar producto (el proyecto no crea productos de 1 tienda, incidente
// r55): Bulb Mini $37.990 (Fumetas tiene "Vulkan Bubbler" al mismo precio, pero
// Bulb != Vulkan), Bong Mini Rig Ursa $65.990, Banger Terp Slurper $34.990 y
// Spinner Carb Cap $21.990. Quedan huerfanas legitimas.
//
// ── EL BUG DE MARCA QUE LAS ESCONDIA (arreglado en el mismo commit) ──────────
// 5 ofertas de Kushbreak cuyo titulo Y url dicen "mj arsenal" tenian
// brandKey=grav, porque Kushbreak declara brand="GRAV®" en el campo `brand` de
// su ficha y "grav" ganaba por orden. Es el TERCER caso del mismo patron en dos
// dias (r68: FG declara GALAXY en un Dazzleaf y PHOENIX STAR bajo un titulo con
// otra marca entre comillas). La leccion se consolida: **el campo `brand` que
// declara la tienda es la fuente MENOS fiable de las tres** (titulo, url,
// brand), y cuando contradice a las otras dos, se corrige por precedencia en
// BRAND_ALIASES, nunca con UPDATE a mano.
// Sin ese fix, 3 de los 4 productos de esta ronda no existirian: Martian,
// Pioneer y Deco venian de ofertas mal marcadas.
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
  kushbreak: number;
  fumetas: number[];
};

const SPECS: Spec[] = [
  {
    name: "MJ Arsenal The Martian Blunt Bubbler",
    modelSlug: "martian-blunt-bubbler",
    category: "Bongs",
    kushbreak: 69294,
    fumetas: [19318],
  },
  {
    name: "MJ Arsenal The Dubbler Blunt Bubbler",
    modelSlug: "dubbler-blunt-bubbler",
    category: "Bongs",
    kushbreak: 69012,
    fumetas: [1545],
  },
  {
    name: "MJ Arsenal Pioneer 9.5cm",
    modelSlug: "pioneer-9-5cm",
    category: "Pipas",
    kushbreak: 69270,
    fumetas: [8111, 34837, 34838, 34839, 34840, 34841, 34842, 34843, 34844],
  },
  {
    name: "MJ Arsenal Deco 9.5cm",
    modelSlug: "deco-9-5cm",
    category: "Pipas",
    kushbreak: 69259,
    fumetas: [8110, 34831, 34832, 34833, 34834, 34835, 34836],
  },
];

async function main() {
  console.log(APPLY ? "APLICANDO r69" : "DRY-RUN r69");

  for (const spec of SPECS) {
    console.log(`\n=== ${spec.name}  (mj-arsenal/${spec.modelSlug}) [${spec.category}] ===`);

    // modelSlug es URL publica: ni marca ni categoria dentro.
    if (!/^[a-z0-9-]+$/.test(spec.modelSlug) || spec.modelSlug.endsWith("-")) {
      throw new Error(`modelSlug invalido '${spec.modelSlug}'`);
    }
    for (const prohibido of ["mj", "arsenal", "pipa", "bong"]) {
      if (spec.modelSlug.includes(prohibido)) throw new Error(`modelSlug '${spec.modelSlug}' repite marca o categoria ('${prohibido}')`);
    }
    const choque = await prisma.product.findFirst({ where: { brandKey: "mj-arsenal", modelSlug: spec.modelSlug } });
    if (choque) throw new Error(`ya existe P${choque.id} en mj-arsenal/${spec.modelSlug}`);

    const ids = [spec.kushbreak, ...spec.fumetas];
    const offers = await prisma.offer.findMany({
      where: { id: { in: ids } },
      select: {
        id: true, productId: true, storeId: true, title: true, url: true, price: true,
        inStock: true, imageUrl: true, sourceCategory: true, store: { select: { slug: true } },
      },
      orderBy: { id: "asc" },
    });
    if (offers.length !== ids.length) throw new Error(`esperaba ${ids.length} ofertas, encontre ${offers.length}`);

    for (const o of offers) {
      if (o.productId !== null) throw new Error(`of${o.id} ya cuelga de P${o.productId}`);
      if (classifyProduct(o.title, o.url, o.sourceCategory ?? undefined) === null) {
        throw new Error(`of${o.id} esta FUERA de alcance`);
      }
    }

    const tiendas = new Set(offers.map((o) => o.storeId));
    if (tiendas.size !== 2) throw new Error(`esperaba 2 tiendas, hay ${tiendas.size}`);
    // "¿suma tienda?": Kushbreak tiene que estar, y ser exactamente una oferta.
    const deKb = offers.filter((o) => o.store.slug === "kushbreak");
    if (deKb.length !== 1) throw new Error(`esperaba 1 oferta de kushbreak, hay ${deKb.length}`);

    const conStock = offers.filter((o) => o.inStock);
    const precios = conStock.map((o) => o.price).filter((p) => p > 0);
    const ratio = precios.length > 1 ? Math.max(...precios) / Math.min(...precios) : 1;
    if (ratio > 1.5) throw new Error(`ratio ${ratio.toFixed(2)} demasiado alto para un par de modelo`);

    for (const o of offers) {
      console.log(`   [${o.store.slug.padEnd(9)}] of${String(o.id).padStart(6)} $${String(o.price).padStart(7)} ${o.inStock ? "  " : "SS"} | ${o.title}`);
    }
    console.log(`   -> ${offers.length} ofertas, 2 tiendas, ratio ${ratio.toFixed(2)}`);

    if (!APPLY) continue;

    const portada = offers.find((o) => o.inStock && o.imageUrl) ?? offers.find((o) => o.imageUrl);
    const product = await prisma.product.create({
      data: {
        name: spec.name,
        normalizedName: normalizeForSearch(spec.name),
        brand: "MJ Arsenal",
        brandKey: "mj-arsenal",
        modelKey: spec.modelSlug,
        modelSlug: spec.modelSlug,
        category: spec.category,
        imageUrl: portada?.imageUrl ?? null,
      },
    });
    for (const o of offers) {
      await prisma.offer.update({ where: { id: o.id }, data: { productId: product.id, category: spec.category } });
    }
    console.log(`   CREADO P${product.id} con ${offers.length} ofertas`);
  }

  if (!APPLY) console.log("\n(dry-run: no se escribió nada)");
}

main().finally(() => prisma.$disconnect());
