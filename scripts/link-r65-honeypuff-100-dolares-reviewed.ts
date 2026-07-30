// Ronda 65 (2026-07-30): Honeypuff, la segunda veta del analisis de Friendly Grow
// del 30 jul. Hermana de r64 (Brass Knuckles), aplicada aparte porque r64 ya estaba
// escrita en la BD cuando se cerro este caso.
//
// ── CONTEXTO: LA MEMORIA DECIA "HONEYPUFF NO TIENE PAR" Y ERA FALSO ───────────
// La nota vieja listaba honeypuff entre las marcas exclusivas de FG ("83 ofertas,
// sin par posible, no volver a barrer"). El 30 jul se verifico marca por marca y
// aparecio la contraparte en GrowBarato. Universo: 85 ofertas honeypuff en 23
// fichas (FG 83 en 21 fichas, GrowBarato 2), LAS 85 HUERFANAS, 0 productos con
// brandKey=honeypuff.
//
// ── PRODUCTO NUEVO: 1, de 2 tiendas ──────────────────────────────────────────
// Honeypuff Papelillos 100 Dolares King Size — 2 ofertas, ratio 1.01
//   fg /papelillos-honeypuff-100-bill-holographic-king-size  of87843 $990
//   gb /papelillos/papel-de-liar-billete-100.html            of3131  $1.000
//
// EVIDENCIA DE IDENTIDAD (arte de fabricante + spec, sin ambiguedad de linea):
//   * La foto de GB es el papel suelto con el numero de serie "LB 88620988 X"; el
//     papel que se ve dentro del librillo de FG lleva EL MISMO SERIAL. Es el arte
//     del fabricante compartido entre las dos tiendas.
//   * GB declara en su tabla: "Tamano: King Size. Pack: 24 hojas. Material: fibra
//     de papel 100% organica" — coincide con el librillo King Size de FG.
//   * Ratio 1.01 ($990 vs $1.000).
//
// ── POR QUE of3131 VA A LA VERSION SIN FILTRO Y NO A LA OTRA ─────────────────
// FG parte el "100 Dolares" en DOS fichas base, o sea son dos modelos segun FG:
//   of87843 $990 "100 Dolares - King Size"          (librillo solo)
//   of87662 $890 "100 Dolares - King Size + Filtro" (el mismo librillo, pero la
//                 foto muestra los tips de carton DENTRO de la tapa)
// Las dos usan el mismo papel, asi que la foto NO desempata sola. Desempatan dos
// cosas: la tabla de GB lista solo "Pack: 24 hojas" y no menciona tips ni filtros
// en ninguna parte de la ficha, y el precio ($1.000) cae en $990 (ratio 1.01) y no
// en $890 (1.12). of87662 queda huerfana legitima: es de UNA sola tienda.
//
// ── of3131 ES LA OFERTA BASE DE UNA FICHA WILDCARD, Y ESO ESTA CONTEMPLADO ────
// La ficha de GB tiene un selector "Modelo" con DOS opciones: "King Size 24 uds."
// y "Cono King Size 24 uds." — una sola ficha que vende el papel Y el cono del
// mismo diseno. El scraper guarda una sola fila a $1.000. Se asigna al PAPEL
// porque el precio es el del papel: el cono equivalente de FG
// (/conos-pre-rolados-honeypuff-100-dollar-bill-king-size, of87655) cuesta $1.990,
// el doble. Precedente exacto y reciente: of12919 en r61, la oferta base del
// wildcard "Boquillas Herbva 5G (Flat/Glass)", se asigno a la Flat porque su
// precio era el de la Flat. El precio desempata el wildcard sin foto.
//
// ── RECHAZADO, con el motivo ─────────────────────────────────────────────────
// * of11609 GB "Conos HoneyPuff - GB The Green Brand" $1.000 — NO-VINCULAR. Su
//   ficha es delgada y doblemente generica: no nombra diseno, ni tamano, ni
//   cantidad por pack, y su descripcion dice "conos de celulosa (...) Disponible en
//   sabores", o sea es un wildcard sobre sabores. Ademas el MATERIAL no cuadra con
//   el unico cono saborizado de FG (/cono-de-canamo-pre-enrollado-...-saborizado
//   $990, que es de CANAMO y trae boquilla de madera). Un generico sin diseno
//   contra 6 fichas de cono distintas de FG es el patron que la memoria de rechazo
//   de pares manda descartar. Queda huerfana.
// * of87655 FG "Conos Pre-enrolados 100 Dolares (Pack 3)" $1.990 — mismo diseno que
//   el producto nuevo pero es CONO, no papelillo, y de una sola tienda. Su unico
//   par posible seria la variante "Cono" del wildcard de GB, que no existe como
//   fila propia. Huerfana legitima.
// * Las otras 19 fichas de FG (blunts/hemp wraps de sabores, conos rose petal,
//   conos brown y pink KS slim, sets 4-en-1, lata Reggae, bandejas, rejillas,
//   papelillos Ultra Thin y KS Slim, y el pack MAYORISTA de $31.990): ninguna tiene
//   contraparte en las otras 5 tiendas. GrowBarato solo trae 2 ofertas honeypuff en
//   total, y la otra es la de conos ya rechazada.
//
// Categoria: "Papelillos", la que ya tienen las dos ofertas.
// modelSlug: "100-dolares-king-size" — NO lleva la palabra "papelillos" porque es
// la palabra de la categoria (invariante de URL publica), ni la marca.
//
// Dry-run por defecto; escribe solo con --apply.
import { prisma } from "../src/lib/prisma";

const APPLY = process.argv.includes("--apply");

const SPEC = {
  offerIds: [87843, 3131],
  name: "Honeypuff Papelillos 100 Dólares King Size",
  brand: "Honeypuff",
  brandKey: "honeypuff",
  modelSlug: "100-dolares-king-size",
  category: "Papelillos",
  esperaTiendas: 2,
  ratioMax: 1.2,
};

function normalizeName(value: string) {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

async function main() {
  console.log(APPLY ? "APLICANDO" : "DRY-RUN");
  console.log(`\n=== NUEVO: ${SPEC.name} (${SPEC.brandKey}/${SPEC.modelSlug}) ===`);

  if (!/^[a-z0-9-]+$/.test(SPEC.modelSlug) || SPEC.modelSlug.endsWith("-")) {
    throw new Error(`modelSlug invalido '${SPEC.modelSlug}' (es URL publica)`);
  }
  if (SPEC.modelSlug.includes(SPEC.brandKey) || SPEC.modelSlug.includes("papelillo")) {
    throw new Error(`modelSlug '${SPEC.modelSlug}' repite la marca o la categoria`);
  }
  const existing = await prisma.product.findUnique({
    where: { brandKey_modelSlug: { brandKey: SPEC.brandKey, modelSlug: SPEC.modelSlug } },
  });
  if (existing) throw new Error(`ya existe P${existing.id} con ese brandKey/modelSlug`);

  const offers = await prisma.offer.findMany({
    where: { id: { in: SPEC.offerIds } },
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
  const faltan = SPEC.offerIds.filter((id) => !offers.some((o) => o.id === id));
  if (faltan.length) throw new Error(`ofertas inexistentes: ${faltan.join(",")}`);
  const ocupadas = offers.filter((o) => o.productId !== null);
  if (ocupadas.length) {
    throw new Error(`ya vinculadas: ${ocupadas.map((o) => `of${o.id}->P${o.productId}`).join(",")}`);
  }

  const tiendas = new Set(offers.map((o) => o.storeId));
  if (tiendas.size !== SPEC.esperaTiendas) {
    throw new Error(`daria ${tiendas.size} tiendas, se esperaban ${SPEC.esperaTiendas}`);
  }

  for (const o of offers) {
    console.log(
      `   [${o.store.slug.padEnd(12)}] of${o.id} $${o.price} stock=${o.inStock ? "si" : "NO"} — ${o.title}`,
    );
  }
  const precios = offers.map((o) => o.price);
  const ratio = Math.max(...precios) / Math.min(...precios);
  console.log(
    `   -> ${tiendas.size} tiendas | ${offers.filter((o) => o.inStock).length}/${offers.length} con stock | ratio ${ratio.toFixed(2)}`,
  );
  if (ratio > SPEC.ratioMax) {
    throw new Error(`ratio ${ratio.toFixed(2)} > ${SPEC.ratioMax}: revisar antes de crear`);
  }

  if (!APPLY) {
    console.log("\n(dry-run: no se escribió nada)");
    return;
  }

  const portada = offers.find((o) => o.inStock && o.imageUrl) ?? offers.find((o) => o.imageUrl);
  const product = await prisma.product.create({
    data: {
      name: SPEC.name,
      normalizedName: normalizeName(SPEC.name),
      brand: SPEC.brand,
      brandKey: SPEC.brandKey,
      modelKey: SPEC.modelSlug,
      modelSlug: SPEC.modelSlug,
      category: SPEC.category,
      imageUrl: portada?.imageUrl ?? null,
    },
  });
  for (const o of offers) {
    await prisma.offer.update({
      where: { id: o.id },
      data: { productId: product.id, category: SPEC.category },
    });
  }
  console.log(`   creado P${product.id}`);
}

main().finally(() => prisma.$disconnect());
