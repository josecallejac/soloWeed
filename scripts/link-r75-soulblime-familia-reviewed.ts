// Ronda 75 (2026-07-30, 5a sesion): LA FAMILIA SOULBLIME, Y EL K30 RESUELTO
// COMO RECHAZO.
//
// Soulblime tenia 63 huerfanas en 5 tiendas contra 13 productos curados. Estaba
// anotada como "revisar la familia entera antes de tocarla" desde r73, porque el
// unico gancho visible eran los 11 sabores de hemp wrap de Fumetas contra
// P11018 (Chocomint). Ese gancho resulto ser el MENOS interesante y ademas
// inutil para cobertura: P10388 "Hemp Blunt Wrap Sabores" ya existe con 5
// TIENDAS, y tanto Fumetas como Astro ya estan dentro, asi que colgar mas
// sabores no suma ninguna tienda. El valor estaba en otra parte.
//
// ── LO QUE DESBLOQUEO TODO: QUE SIGNIFICA "UNIDAD" EN ASTRO ─────────────────
// Astro titula sus conos "Conos 1 1/4 (1UD)-Soulblime" y su descripcion habla en
// SINGULAR ("Este cono pre-enrolado..."), mientras Fumetas vende "6 Conos
// Pre-enrolados" AL MISMO PRECIO. Leido literal, es el rechazo de smokers-choice
// ("un pack nunca es la unidad") y habia que descartar los 3 pares.
//
// El test que lo zanja no fue una foto sino el PROPIO CATALOGO: P10384
// "Soulblime (6) Conos Pre-enrolados White King Size" ya contiene, de una ronda
// anterior, la oferta of12296 de Astro titulada "Conos King Size (Unidad)" a
// $2.390, exactamente el precio del pack de 6 de Fumetas (of2910). O sea que en
// Astro "Unidad"/"1UD" es UNA UNIDAD DE VENTA -- la cajita de 6 --, no un cono
// suelto, y el precedente ya estaba aceptado. Con eso los pares de 1 1/4 son
// validos y el paralelismo de precios deja de ser sospechoso: $1.790 el 1 1/4 y
// $2.390 el King Size, en las dos tiendas.
//
// ── EL HALLAZGO GRANDE: UN PRODUCTO DE 5 TIENDAS QUE NO EXISTIA ─────────────
// El tubo guarda-caños de Soulblime lo venden LAS CINCO tiendas y no tenia
// producto, porque cada una lo llama distinto y ninguna herramienta con reja de
// categoria lo cruzaba (el clasificador lo manda a 3 categorias diferentes:
// "Contenedores y estuches" en Fumetas/Astro/GB, "Otros parafernalia" en Piranha
// y "Filtros y boquillas" en Kushbreak):
//
//   Fumetas    "Tubo Plastico Guarda Caños"            $1.190
//   Astro      "Tubos Contenedores Diseños Mix 1Und"   $1.190
//   Kushbreak  "Contenedor para caños tipo Tubo"       $1.290
//   Piranha    "Tubo Soulblime"                        $1.490
//   GrowBarato "Tubos Guarda Pitos SoulBlime"          $1.000
//
// IDENTIDAD DURA POR TEXTO COMPARTIDO: Fumetas y Kushbreak publican la MISMA
// frase, palabra por palabra -- "mide 11,5 cm de alto, por lo que podras guardar
// en el caños normales, king size o blunts. Para abrirlo debes presionar en la
// parte superior". Astro describe el mismo mecanismo ("su apertura superior
// funciona a traves de presion") al mismo precio que Fumetas, y la URL de
// Piranha es "tubo-soulblime-porta-joint-diseno-aleatorio". Ratio 1,49 entre el
// mas caro y el mas barato, sin outlier.
// El diseño es ALEATORIO en todas ("diseño aleatorio", "diseños mix"), o sea es
// un wildcard y no una edicion: no separa (precedente Naar One, r31).
//
// ── LOS FILTROS: EL CONTEO ESTABA ESCONDIDO EN EL SKU ───────────────────────
// Piranha declara las unidades en el titulo y Fumetas NO. Pero el sku de Fumetas
// las lleva: SLB-(150)F-BEM, SLB-(150)F-CH, SLB-(150)F-MEN. Cuadra 1:1 con los
// "(150u)" de Piranha, sabor por sabor, y los cuatro pares valen $1.290 EXACTOS
// en las dos tiendas.
//   Berrymint  of13390 <-> of27263    150u
//   Chocolate  of73251 <-> of80502    150u  (Fumetas lo repite en su texto)
//   Menthol    of13391 <-> of80503    150u
//   Neutros    of13392 <-> of11266    200u  <-- OJO
// En los Neutros el sku de Fumetas dice 150 pero su DESCRIPCION dice "Cada bolsa
// trae 200 filtros", y Piranha dice "(200u)". Dos señales contra una: son de
// 200. El sku quedo rancio. Se registra el nombre con 200u.
// Queda huerfana LEGITIMA of19389 "Slim Fresh Mint Click" ($1.990): es un filtro
// con capsula, otro producto, y Piranha no lo vende.
//
// ── UN MISLINK DESTAPADO DE PASO ────────────────────────────────────────────
// P10384 se llama "...White King Size" pero tenia colgada of78218 de Astro,
// "Conos King Size Unidad-Soulblime - (PINK)". El color rosa no es el blanco:
// esa oferta pertenece al producto Pink que nace en esta ronda, y moverla lo
// deja en 3 TIENDAS en vez de 2.
// VERIFICADO QUE P10384 NO PIERDE NADA: le queda of12296 (Astro, blanco) +
// of2910 (Fumetas), o sea sigue con sus 2 tiendas. No esta protegido (2t). El
// script lo comprueba antes y despues.
//
// ── EL K30 DE ASTRO: RECHAZADO, Y ACOTA UNA REGLA DE r73 ────────────────────
// Venia DIFERIDO de r73. La evidencia dura de r73 fue que Astro y Fumetas
// codifican la referencia de fabricante de Bonglab en su propio sku, y ahi el
// K30 la tenia igual (Astro BGBL(K30)BLACK / Fumetas BLAB-(K30)B). Pero:
//   1. Astro dice 30 cm y lo repite en su FICHA TECNICA estructurada
//      ("Modelo/Variante: K30 / Medidas: Altura 30 cm"); Fumetas y GrowBarato
//      dicen 42 cm en el titulo.
//   2. LA FOTO LOS SEPARA SIN AMBIGUEDAD. El de Astro es un bong AZUL corto, con
//      la boquilla integrada al tubo y una camara RECTANGULAR con percolador.
//      El de Fumetas y el de GrowBarato son el MISMO bong entre si: tubo recto
//      alto, cuello con puntos de vidrio, muesca atrapa-hielo en X, percolador
//      tree y CAZOLETA LATERAL EXTRAIBLE con sticker BONGLAB "SMOKE-LIFE"
//      (Fumetas negro, GrowBarato morado: mismo molde, otro color).
// Son dos bongs distintos. La sospecha inicial era que Astro habia deducido "30
// cm" del codigo K30 -- y era razonable, porque en r74 se probo que Astro publica
// una descripcion que dice "moledor mediano" sobre un producto Grande. Pero aca
// el copy no era el problema.
//
//   LECCION QUE ACOTA r73: la referencia de fabricante compartida en el sku es
//   evidencia fuerte, NO infalible. Cuando contradice a la vez a la talla
//   declarada y a la foto, gana la foto. En r73 K293/K306/KE9 acertaron las tres;
//   K30 es el contraejemplo que le pone borde a la regla.
//
// ── TAMBIEN REVISADO Y NO INCLUIDO ──────────────────────────────────────────
// - Fumetas of19422 "Contenedor con Tapa Grande" $3.590 <-> Piranha of16135
//   "Caja Soulblime Grande con Bisagra" $2.490. Los dos dicen "grande" y el ratio
//   (1,44) pasaria, pero Fumetas lo vende por COLOR (Amarilla/Roja/Verde) y
//   Piranha por diseño aleatorio, y ya hay tres productos "contenedor" parecidos
//   en el catalogo (P10236 deslizable, P10546 tapa-bandeja, P10736 desmontable).
//   Necesita foto. DIFERIDO.
// - Los tips de carton (Astro of12332/of12333 $490 por color, Piranha of16108
//   $590, Fumetas of19452 "50 uds." $390). Aqui "Unidad" NO se puede resolver con
//   el precedente de arriba porque ninguna de las tres declara el conteo del
//   librillo. DIFERIDO.
// - GB of16757 "Moledor Tarjeta Soulblime portatil" es una SEGUNDA oferta de
//   GrowBarato para P6003, que ya tiene GrowBarato. Es un duplicado legitimo de
//   ficha, no suma tienda; se deja para una pasada de higiene.
//
// Dry-run por defecto; escribe solo con --apply.
import { prisma } from "../src/lib/prisma";
import { normalizeForSearch } from "../src/lib/tokenize";
import { classifyProduct } from "./scrape";

const APPLY = process.argv.includes("--apply");

type Nuevo = {
  name: string;
  modelSlug: string;
  category: string;
  offerIds: number[];
  evidencia: string;
};

const NUEVOS: Nuevo[] = [
  {
    name: "Soulblime Tubo Guarda Caños",
    modelSlug: "tubo-guarda-canos",
    category: "Contenedores y estuches",
    offerIds: [19957, 1172, 16139, 69131, 22143],
    evidencia: "Fumetas y Kushbreak publican la misma frase literal (11,5 cm, apertura por presion)",
  },
  {
    name: "Soulblime 6 Conos Pre-enrolados Pink King Size",
    modelSlug: "conos-king-size-pink-x6",
    category: "Conos y blunts",
    offerIds: [2914, 53604, 78218],
    evidencia: "ambas dicen Pink King Size 6u a $2.390; of78218 sale de P10384 (que es el White)",
  },
  {
    name: "Soulblime 6 Conos Pre-enrolados Pink 1 1/4",
    modelSlug: "conos-1-1-4-pink-x6",
    category: "Conos y blunts",
    offerIds: [2913, 77811, 31902],
    evidencia: "$1.790 en ambas; PINK y Rosa de Astro comparten sku AYPSOUCO114PIUND",
  },
  {
    name: "Soulblime 6 Conos Pre-enrolados Orgánicos 1 1/4",
    modelSlug: "conos-1-1-4-organicos-x6",
    category: "Conos y blunts",
    offerIds: [2911, 31903],
    evidencia: "$1.790 en ambas, variante ORGANICOS de la misma ficha de Astro",
  },
  {
    name: "Soulblime Filtros Slim Berrymint 6mm 150u",
    modelSlug: "slim-berrymint-6mm-150u",
    category: "Filtros y boquillas",
    offerIds: [13390, 27263],
    evidencia: "sku SLB-150F-BEM contra '(150u)' de Piranha; $1.290 exactos en ambas",
  },
  {
    name: "Soulblime Filtros Slim Chocolate 6mm 150u",
    modelSlug: "slim-chocolate-6mm-150u",
    category: "Filtros y boquillas",
    offerIds: [73251, 80502],
    evidencia: "sku SLB-150F-CH + '150 unidades por bolsa' en el texto; $1.290 exactos",
  },
  {
    name: "Soulblime Filtros Slim Menthol 6mm 150u",
    modelSlug: "slim-menthol-6mm-150u",
    category: "Filtros y boquillas",
    offerIds: [13391, 80503],
    evidencia: "sku SLB-150F-MEN contra '(150u)' de Piranha; $1.290 exactos",
  },
  {
    name: "Soulblime Filtros Slim Neutros 6mm 200u",
    modelSlug: "slim-neutros-6mm-200u",
    category: "Filtros y boquillas",
    offerIds: [13392, 11266],
    evidencia: "'cada bolsa trae 200 filtros' + '(200u)' de Piranha; el sku de Fumetas quedo rancio",
  },
  {
    name: "Soulblime Contenedor con Tapa Bisagra",
    modelSlug: "tapa-bisagra",
    category: "Contenedores y estuches",
    offerIds: [2878, 34196, 34197, 34198, 34199, 16129],
    evidencia: "$1.990 en ambas; la URL de Piranha dice 'caja-soulblime-pequena-con-bisagra'",
  },
];

// Huerfana -> producto EXISTENTE al que le falta esa tienda.
const UPGRADES: { productId: number; offerIds: number[]; tiendasAntes: number; tienda: string; nota: string }[] = [
  {
    productId: 10527,
    offerIds: [16059],
    tiendasAntes: 2,
    tienda: "piranha",
    nota: "Bolsita Hermetica Antiolor Soulblime: $790 contra $700 (GB) y $990 (Fumetas)",
  },
];

// La oferta que se MUEVE de un producto a otro, y el producto que no debe perder tiendas.
const MOVER = { offerId: 78218, desde: 10384, tiendasMinimasDesde: 2 };

async function main() {
  console.log(APPLY ? "APLICANDO r75\n" : "DRY-RUN r75\n");

  // ── Estado PREVIO del producto del que sale la oferta movida ──────────────
  const desdeAntes = await prisma.offer.findMany({
    where: { productId: MOVER.desde },
    select: { id: true, storeId: true, store: { select: { slug: true } } },
  });
  const desdeTiendasAntes = new Set(desdeAntes.map((o) => o.storeId));
  const desdeQuedan = desdeAntes.filter((o) => o.id !== MOVER.offerId);
  const desdeTiendasDespues = new Set(desdeQuedan.map((o) => o.storeId));
  console.log(`MOVER of${MOVER.offerId}: sale de P${MOVER.desde} (${desdeTiendasAntes.size}t) -> le quedan ${desdeTiendasDespues.size}t`);
  if (desdeTiendasDespues.size < MOVER.tiendasMinimasDesde) {
    throw new Error(`P${MOVER.desde} bajaria a ${desdeTiendasDespues.size} tiendas`);
  }
  if (desdeTiendasDespues.size !== desdeTiendasAntes.size) {
    throw new Error(`P${MOVER.desde} PERDERIA una tienda`);
  }
  console.log(`   OK: P${MOVER.desde} conserva sus ${desdeTiendasDespues.size} tiendas\n`);

  const plan: { n: Nuevo; tiendas: string[] }[] = [];

  for (const n of NUEVOS) {
    const choque = await prisma.product.findFirst({
      where: { brandKey: "soulblime", modelSlug: n.modelSlug },
      select: { id: true },
    });
    if (choque) throw new Error(`P${choque.id} ya usa soulblime/${n.modelSlug}`);

    const tiendas = new Set<string>();
    for (const oid of n.offerIds) {
      const o = await prisma.offer.findUnique({
        where: { id: oid },
        select: {
          id: true, productId: true, title: true, url: true, price: true, inStock: true,
          sourceCategory: true, store: { select: { slug: true } },
        },
      });
      if (!o) throw new Error(`of${oid} no existe`);
      // La unica oferta que puede venir enganchada es la que se mueve a proposito.
      if (o.productId !== null && o.id !== MOVER.offerId) {
        throw new Error(`of${o.id} ya cuelga de P${o.productId}`);
      }
      if (o.productId !== null && o.productId !== MOVER.desde) {
        throw new Error(`of${o.id} cuelga de P${o.productId}, no de P${MOVER.desde}`);
      }
      if (classifyProduct(o.title, o.url, o.sourceCategory ?? undefined) === null) {
        throw new Error(`of${o.id} esta FUERA de alcance`);
      }
      tiendas.add(o.store.slug);
    }
    // No se crean productos de 1 tienda (incidente r55).
    if (tiendas.size < 2) throw new Error(`${n.name} tendria ${tiendas.size} tienda(s)`);

    const orden = [...tiendas].sort();
    plan.push({ n, tiendas: orden });
    console.log(`NUEVO  soulblime/${n.modelSlug}  [${orden.length}t: ${orden.join(", ")}]  ${n.offerIds.length} ofertas`);
    console.log(`   "${n.name}" (${n.category})`);
    console.log(`   ${n.evidencia}\n`);
  }

  for (const u of UPGRADES) {
    const antes = await prisma.offer.findMany({
      where: { productId: u.productId },
      select: { storeId: true, store: { select: { slug: true } } },
      distinct: ["storeId"],
    });
    if (antes.length !== u.tiendasAntes) {
      throw new Error(`P${u.productId} tiene ${antes.length} tiendas, se esperaban ${u.tiendasAntes}`);
    }
    if (antes.some((a) => a.store.slug === u.tienda)) {
      throw new Error(`P${u.productId} ya tiene ${u.tienda}: no sumaria tienda`);
    }
    for (const oid of u.offerIds) {
      const o = await prisma.offer.findUnique({
        where: { id: oid },
        select: { id: true, productId: true, title: true, url: true, sourceCategory: true, store: { select: { slug: true } } },
      });
      if (!o) throw new Error(`of${oid} no existe`);
      if (o.productId !== null) throw new Error(`of${o.id} ya cuelga de P${o.productId}`);
      if (o.store.slug !== u.tienda) throw new Error(`of${o.id} es de ${o.store.slug}`);
      if (classifyProduct(o.title, o.url, o.sourceCategory ?? undefined) === null) {
        throw new Error(`of${o.id} esta FUERA de alcance`);
      }
    }
    console.log(`UPGRADE P${u.productId} [${u.tiendasAntes}t -> ${u.tiendasAntes + 1}t] +${u.tienda}`);
    console.log(`   ${u.nota}\n`);
  }

  const totalOfertas = NUEVOS.reduce((s, n) => s + n.offerIds.length, 0) + UPGRADES.reduce((s, u) => s + u.offerIds.length, 0);
  console.log(`RESUMEN: ${NUEVOS.length} productos nuevos + ${UPGRADES.length} upgrade | ${totalOfertas} ofertas`);
  console.log(`         el mayor nace con ${Math.max(...plan.map((p) => p.tiendas.length))} tiendas`);

  if (!APPLY) {
    console.log("\n(dry-run: no se escribió nada)");
    return;
  }

  console.log("\n=== APLICANDO ===");
  for (const { n, tiendas } of plan) {
    const portada = await prisma.offer.findFirst({
      where: { id: { in: n.offerIds }, imageUrl: { not: null } },
      select: { imageUrl: true },
    });
    const product = await prisma.product.create({
      data: {
        name: n.name,
        normalizedName: normalizeForSearch(n.name),
        brand: "Soulblime",
        brandKey: "soulblime",
        modelKey: n.modelSlug,
        modelSlug: n.modelSlug,
        category: n.category,
        imageUrl: portada?.imageUrl ?? null,
      },
    });
    await prisma.offer.updateMany({
      where: { id: { in: n.offerIds } },
      data: { productId: product.id, category: n.category },
    });
    const despues = await prisma.offer.findMany({
      where: { productId: product.id },
      select: { storeId: true }, distinct: ["storeId"],
    });
    const ok = despues.length === tiendas.length;
    console.log(`${ok ? "OK " : "!! "} P${product.id} soulblime/${n.modelSlug} -> ${despues.length}t`);
    if (!ok) throw new Error(`P${product.id} quedo con ${despues.length} tiendas`);
  }

  for (const u of UPGRADES) {
    const p = await prisma.product.findUnique({ where: { id: u.productId }, select: { category: true } });
    await prisma.offer.updateMany({ where: { id: { in: u.offerIds } }, data: { productId: u.productId, category: p!.category } });
    const despues = await prisma.offer.findMany({
      where: { productId: u.productId }, select: { storeId: true }, distinct: ["storeId"],
    });
    console.log(`OK  P${u.productId} -> ${despues.length}t`);
    if (despues.length !== u.tiendasAntes + 1) throw new Error(`P${u.productId} quedo con ${despues.length} tiendas`);
  }

  // Comprobacion final del producto del que salio la oferta movida.
  const desdeFinal = await prisma.offer.findMany({
    where: { productId: MOVER.desde }, select: { storeId: true }, distinct: ["storeId"],
  });
  console.log(`OK  P${MOVER.desde} conserva ${desdeFinal.length}t tras perder of${MOVER.offerId}`);
  if (desdeFinal.length !== desdeTiendasAntes.size) throw new Error(`P${MOVER.desde} perdio una tienda`);

  console.log("\nAPLICADO r75. Recordar: los productos nuevos nacen con shortDescription null.");
}

main().finally(() => prisma.$disconnect());
