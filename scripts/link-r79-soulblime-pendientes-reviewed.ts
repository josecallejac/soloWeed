// Ronda 79 (2026-07-30, 5a sesion): LOS DOS CASOS QUE r75 DEJO MARCADOS COMO
// "NECESITA FOTO".
//
// ── 1) CONTENEDOR CON TAPA BISAGRA GRANDE -- resuelto SIN foto ──────────────
//   of19422 [fumetas] $3.590 "Contenedor con Tapa Grande - Diseños"
//   of16135 [piranha] $2.490 "Caja Soulblime Grande con Bisagra"
//
// En r75 esto se diferio porque los dos decian "grande" y habia tres productos
// "contenedor" parecidos en el catalogo. Lo que lo resuelve no es una foto sino
// la ESTRUCTURA DEL SURTIDO, que quedo visible justo despues de aplicar r75:
//
//   cada una de las dos tiendas vende EXACTAMENTE DOS cajas con bisagra, una
//   pequeña y una grande, y las PEQUEÑAS ya emparejaron en r75 a precio
//   IDENTICO ($1.990 las dos) formando P11069.
//
// Con las pequeñas ya asignadas, el emparejamiento de las grandes queda forzado
// por eliminacion: no hay ninguna otra caja con bisagra con que confundirlas.
// Y las dos tiendas lo dicen en su URL: "contenedor-con-tapa-GRANDE-disenos" en
// Fumetas y "caja-soulblime-GRANDE-con-bisagra" en Piranha.
// Corrobora la ficha de Fumetas: "Fabricado en metal... Su tapa con BISAGRA
// evita que se separe... diseño compacto de 10 x 6 x 2 cm". Ratio 1,44.
// El color (Fumetas los vende Amarilla/Roja/Verde) y el diseño aleatorio de
// Piranha no separan: el color fusiona y el aleatorio es wildcard.
//
// ── 2) LOS TIPS DE CARTON -- aqui la foto SI hacia falta, y desmintio ───────
// El caso parecia el clasico "pack contra unidad" y se iba a rechazar:
//   of12332/of12333 [astro] $490 "Tips Filtro De Carton (Amarillo/Celeste)
//                                 UNIDAD-Soulblime", descripcion en SINGULAR
//                                 ("ESTE filtro de carton en color amarillo")
//   of19452 [fumetas] $390    "Boquillas Pre-picadas Soulblime 50 UDS."
//   of16108 [piranha] $590    "Filtro Tips Soulblime", sin cantidad
//
// LA FOTO DE ASTRO DESMIENTE A SU PROPIO TEXTO. No es un filtro suelto de carton
// amarillo: es un LIBRILLO cuya portada dice "50 tips", con el logo Soulblime
// sobre arte de monstruos, y el bloque de tips es BLANCO. O sea:
//   - "Amarillo"/"Celeste" es el COLOR DE LA PORTADA, no del carton. Fusiona.
//   - "Unidad" es un librillo de 50, igual que en los conos (precedente de r75:
//     P10384 ya juntaba el "Conos King Size Unidad" de Astro con el pack de 6 de
//     Fumetas). La descripcion en singular de Astro es solo su copy.
// Fumetas y Piranha publican LA MISMA foto de fabricante entre si (librillo
// ROJO, mismo arte de monstruos, mismo "50 tips"), lo que ata las tres tiendas.
//
//   LECCION: la descripcion de la tienda puede contradecir a su propia foto, y
//   no siempre gana el texto. Aqui el texto decia "unidad / este filtro" y la
//   foto decia "50 tips" impreso en el producto. Cuando la evidencia esta EN EL
//   PRODUCTO FOTOGRAFIADO (una etiqueta, un serigrafiado), le gana al copy.
//   Mismo criterio que el numero de serie del papel Honeypuff en r65 y que la
//   etiqueta "4 GRAM" del sachet Boveda en r74.
//
// Ratio 590/390 = 1,51, sin outlier. Nace con 3 TIENDAS.
//
// ── FILTRO OBLIGATORIO ─────────────────────────────────────────────────────
// Los dos productos nacen con >=2 tiendas distintas. No se crean productos de 1
// tienda (incidente r55).
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
  // Semillas: de cada una se expande su ficha completa por URL base exacta.
  semillas: number[];
  evidencia: string;
};

const SPECS: Spec[] = [
  {
    name: "Soulblime Contenedor con Tapa Bisagra Grande",
    modelSlug: "tapa-bisagra-grande",
    category: "Contenedores y estuches",
    semillas: [19422, 16135],
    evidencia: "por eliminacion: las cajas pequeñas de ambas tiendas ya formaron P11069",
  },
  {
    name: "Soulblime Boquillas Tips de Cartón 50u",
    modelSlug: "tips-carton-50u",
    category: "Filtros y boquillas",
    semillas: [12332, 12333, 19452, 16108],
    evidencia: "la portada del librillo dice '50 tips'; el color es de la tapa, no del carton",
  },
];

const baseUrl = (u: string) => u.split("?")[0];

async function main() {
  console.log(APPLY ? "APLICANDO r79\n" : "DRY-RUN r79\n");

  const plan: { spec: Spec; offerIds: number[]; tiendas: string[] }[] = [];
  const vistos = new Set<number>();

  for (const spec of SPECS) {
    const choque = await prisma.product.findFirst({
      where: { brandKey: "soulblime", modelSlug: spec.modelSlug }, select: { id: true },
    });
    if (choque) throw new Error(`P${choque.id} ya usa soulblime/${spec.modelSlug}`);

    const ids = new Set<number>();
    const tiendas = new Set<string>();

    for (const sid of spec.semillas) {
      const s = await prisma.offer.findUnique({
        where: { id: sid },
        select: { id: true, productId: true, url: true, storeId: true, store: { select: { slug: true } } },
      });
      if (!s) throw new Error(`of${sid} no existe`);
      if (s.productId !== null) throw new Error(`of${s.id} ya cuelga de P${s.productId}`);

      // Expansion por IGUALDAD EXACTA de URL base, nunca por prefijo.
      const base = baseUrl(s.url);
      const candidatas = await prisma.offer.findMany({
        where: { storeId: s.storeId, productId: null },
        select: { id: true, url: true, title: true, price: true, sourceCategory: true, store: { select: { slug: true } } },
      });
      const familia = candidatas.filter((o) => baseUrl(o.url) === base);
      if (!familia.some((o) => o.id === s.id)) throw new Error(`la semilla of${s.id} no quedo en su familia`);

      for (const o of familia) {
        if (classifyProduct(o.title, o.url, o.sourceCategory ?? undefined) === null) {
          throw new Error(`of${o.id} esta FUERA de alcance`);
        }
        if (vistos.has(o.id)) throw new Error(`of${o.id} aparece en dos grupos`);
        ids.add(o.id);
        tiendas.add(o.store.slug);
      }
    }
    for (const id of ids) vistos.add(id);

    if (tiendas.size < 2) throw new Error(`${spec.name} tendria ${tiendas.size} tienda(s)`);

    const offerIds = [...ids];
    const detalle = await prisma.offer.findMany({
      where: { id: { in: offerIds } },
      select: { id: true, price: true, title: true, store: { select: { slug: true } } },
      orderBy: { price: "asc" },
    });
    const precios = detalle.map((d) => d.price).filter((p) => p > 0);
    const ratio = precios.length ? Math.max(...precios) / Math.min(...precios) : 0;
    if (ratio > 2) throw new Error(`${spec.name}: ratio ${ratio.toFixed(2)} > 2`);

    const orden = [...tiendas].sort();
    plan.push({ spec, offerIds, tiendas: orden });

    console.log(`NUEVO  soulblime/${spec.modelSlug}  [${orden.length}t: ${orden.join(", ")}]  ${offerIds.length} ofertas  ratio ${ratio.toFixed(2)}`);
    console.log(`   "${spec.name}" (${spec.category})`);
    console.log(`   ${spec.evidencia}`);
    for (const d of detalle) console.log(`     + of${d.id} [${d.store.slug}] $${d.price} | ${d.title}`);
    console.log();
  }

  console.log(`RESUMEN: ${plan.length} productos nuevos, ${plan.reduce((s, p) => s + p.offerIds.length, 0)} ofertas`);

  if (!APPLY) { console.log("\n(dry-run: no se escribió nada)"); return; }

  console.log("\n=== APLICANDO ===");
  for (const { spec, offerIds, tiendas } of plan) {
    const portada = await prisma.offer.findFirst({
      where: { id: { in: offerIds }, imageUrl: { not: null } }, select: { imageUrl: true },
    });
    const product = await prisma.product.create({
      data: {
        name: spec.name,
        normalizedName: normalizeForSearch(spec.name),
        brand: "Soulblime",
        brandKey: "soulblime",
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
    const ok = despues.length === tiendas.length;
    console.log(`${ok ? "OK " : "!! "} P${product.id} soulblime/${spec.modelSlug} -> ${despues.length}t, ${offerIds.length} ofertas`);
    if (!ok) throw new Error(`P${product.id} quedo con ${despues.length} tiendas`);
  }
  console.log("\nAPLICADO r79. Recordar: los productos nuevos nacen con shortDescription null.");
}

main().finally(() => prisma.$disconnect());
