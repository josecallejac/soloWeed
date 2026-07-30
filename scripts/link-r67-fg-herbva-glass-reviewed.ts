// Ronda 67 (2026-07-30, 4a sesion): FRIENDLY GROW, EL FRENTE EXPRIMIDO HASTA EL FONDO.
//
// Encargo del usuario: priorizar la integracion de Friendly Grow para poder mandarle
// sus metricas como primer cliente B2B. El informe de FG (/precios/<token>) tenia
// 20 filas comparables y 0 alertas, contra 424 de Piranha, 409 de Fumetas y 324 de
// Astro. Este script aplica TODO lo que sobrevivio al barrido: **un solo vinculo**.
//
// ── LO ACEPTADO: of87560 -> P10886 ───────────────────────────────────────────
//   of87560 [friendlygrow] $11.990 "Boquilla de Enfriamiento Vaporizador Herbal
//            Airis Herbva 5g"  https://www.friendlygrow.cl/boquilla-de-enfriamiento-herbal-airis-herbva-5g
//   P10886 "Airistech Boquilla Glass Herbva 5G" [2t] = of35844 Fumetas $8.990 (variante
//            "Glass") + of32177 Astro $5.990 "Boquilla Glass Herbva 5G-Airistech"
//
// IDENTIDAD CERRADA POR DESCRIPCION, NO POR FOTO. La imagen de FG es INSERVIBLE como
// evidencia: su filename es "ChatGPT_20Image_2013_20jul_202026...png", o sea una
// imagen GENERADA POR IA, no una foto del producto. (Dato nuevo sobre FG que conviene
// recordar: su catalogo mezcla fotos propias con render de IA, lo que explica en parte
// por que el matching por imagen tiene 14% de recall contra esta tienda.)
//
// La desambiguacion real era contra su producto HERMANO, P10885 "Airistech Boquilla
// Herbva 5G" (la Flat), que es justo la trampa del modelKey generico que el proyecto
// tiene documentada. Lo que decide es el texto:
//   - FG: "...incorpora una **boquilla de vidrio** que ayuda a conservar el sabor".
//   - P10886/Astro of32177: "La Boquilla **de Vidrio** para Herbva 5G ... fabricada en
//     **vidrio de borosilicato**".
//   - P10885/Astro of32256: "Boquilla de Repuesto ... materiales resistentes al calor",
//     sin una sola mencion a vidrio.
// El Herbva 5G tiene exactamente dos boquillas de fabrica, Flat y Glass, y Fumetas las
// vende como las dos variantes de una misma ficha wildcard. La de FG es la Glass.
//
// ¿SUMA TIENDA? SI: P10886 tiene Fumetas + Astro, y FG esta AUSENTE. 2t -> 3t.
//
// RATIO 2,00 ($11.990 contra $5.990 de Astro). Queda justo en el umbral OUTLIER_RATIO
// del panel (que marca >2, no >=2), asi que NO cae en "Revisar". Es coherente con el
// resto de la marca: FG es la mas cara en accesorios Airistech y la mas barata en los
// vaporizadores. No se acepto por precio sino por descripcion; el precio solo no
// contradice.
//
// ── LO RECHAZADO, QUE ES EL RESULTADO PRINCIPAL DE LA RONDA ───────────────────
// Se barrio el frente completo de FG con 3 metodos nuevos, ademas de los 3 que ya
// estaban medidos (texto/imagen/marca->producto, 30 jul 2a sesion). De 651 huerfanas
// EN ALCANCE con stock, sobrevivio 1. El detalle importa para no repetir el barrido:
//
// 1) TEXTO HUERFANA<->HUERFANA SIN LA REJA DE CATEGORIA (palanca que estaba anotada
//    como pendiente desde el 30 jul: `Offer.category` se queda stale y escondia el 67%
//    de los pares de FG). Se solto por env en diagnose-orphan-pairs.ts y se barrio
//    Jaccard >= 0,40: **101 pares, cero validos**. Los 48 sin marca son ruido puro
//    ("Pipa Silicona Clon" contra "Contenedor silicona"; "Pipa Darth Vader" contra
//    "Moledor Darth Vader"): el token compartido es la palabra "silicona". Los 23 de
//    yocan son modelos distintos (Hit vs Hit 2 -- ya rechazado en r61 por URL --, Go vs
//    Vane, iCan vs Vane, QBC Coil vs Falcone QTC Coil). Los 17 de "pulsar" son baterias
//    **Doteco** de FG cruzadas contra Pulsar de Fumetas: marcas distintas, la similitud
//    es solo "bateria cartridges 510". LA PALANCA QUEDA MEDIDA Y CERRADA.
//
// 2) MAPA COMPLETO DE MARCAS DE FG. El worklist existente solo mira la direccion
//    "huerfana -> producto curado de esa marca"; por diseño NO ve las marcas SIN
//    producto curado, que es justo como aparecieron r64 (Brass Knuckles) y r65
//    (Honeypuff). Se cruzo cada marca de FG contra TODAS las ofertas de otras tiendas,
//    vinculadas o no, con o sin stock. Resultado marca por marca:
//      - phoenix-star (73 huerfanas FG): Fumetas tiene 2 bongs, Classic Beaker 26cm y
//        Straight Tube 23cm, ambos SIN STOCK. FG vende Ice Catcher Beaker 40cm y Beaker
//        con percolador 30cm. **La talla nunca fusiona** -> NO.
//      - baked-bunny (46): GrowBarato tiene 1 sola oferta, papelillos de celulosa
//        1 1/4. Lo unico papel-adyacente de FG es un "Smoking Set 4 Piezas" $9.500,
//        que es un kit -> NO. La marca queda CERRADA de verdad, como decia la memoria.
//      - cookies (13): FG vende pipas Spoon, un set de 9 piezas y una pesa MAXIM-500.
//        Los 3 productos cookies sin FG son bandeja metalica y los dos Stundenglass.
//        Cero solape -> NO.
//      - galaxy (5): "Moledor Lightning Colors Metal 55mm". El unico Lightning del
//        catalogo es P10671 a **63mm** (4t, $18.991-23.990 en las 5 tiendas). 55 != 63
//        y el precio es 3x -> NO. Ya estaba rechazado el 30 jul; se reconfirma.
//      - yocan (42), airistech (9), smoking (2), clipper (1): ver punto 3 y abajo.
//    Se recalculo ademas el solape de tokens no genericos de las 410 filas del worklist
//    oficial: **solo 3 filas con solape >= 2**, y las 3 son el mismo caso Herbva mas el
//    Yocan Phaser Max vs Falcon Glass (lineas distintas, ya rechazado el 30 jul).
//
// 3) MINERO DE MARCAS AUSENTES sobre las 353 huerfanas de FG SIN brandKey (54% de su
//    inventario en alcance). La hipotesis era la que rindio r61 entera: que fueran
//    marcas reales ausentes de KNOWN_BRAND_PHRASES y por eso invisibles. **FALSADA**:
//    de 74 tokens candidatos (frecuentes en FG y presentes en otras tiendas), ni uno
//    es una marca. Son tallas (50mm, 14mm, 63mm, 14cm), materiales (acero, aluminio,
//    cuarzo), colores, y **nombres de diseño** de pipas de silicona genericas (monster,
//    alien, mushroom, devil, zombie, cobra, donut, oso). Las 353 son mercaderia
//    generica de importacion, no marcas sin registrar. NO REHACER ESTE MINERO.
//
// CONCLUSION ESTRUCTURAL, que vale mas que el vinculo: el catalogo tiene **0 productos
// sin marca** en las 16 categorias (medido: los 850 tienen brandKey). Nunca se ha
// curado un producto generico, porque no hay identidad cruzada entre tiendas para un
// molde de importacion sin marca. FG es la tienda mas castigada por esa propiedad
// estructural del pipeline (54% de su surtido cae ahi), y por eso su informe no se
// puede engordar por curacion. El techo esta medido: 20 -> 21 filas.
//
// ── FALSOS POSITIVOS DE brandKey DETECTADOS (no se tocan aca) ─────────────────
// El barrido destapo 5 ofertas de FG con brandKey equivocado. NO se arreglan con
// UPDATE a mano -- esa fue la leccion de la Tarea D de r61; van por precedencia en
// matching-constants.ts, en su propio commit:
//   of87769 aku      <- 'Bong Beaker de Pyrex Phoenix "AKU Tribal" 45cms' (sku PHX433,
//                       la marca real es phoenix-star; "AKU Tribal" es el diseño)
//   of87645 smoking  <- "Pack Fumeta Set Stoner Days - Kit Premium 11 Piezas"
//   of87644 smoking  <- "Full Smoking Set Mr. Joint Pink Edition"  (ambas: "smoking
//                       set" generico, no la marca de papelillos Smoking)
//   of87819 clipper  <- "Funda Multifuncion para Encendedor 3-en-1" (no dice Clipper en
//                       el titulo: viene del fallback por description)
//   of88381 galaxy   <- "Vaporizador Discreto Dazzleaf Spaceman 550mah" (marca real
//                       dazzleaf; tambien fallback por description)
//
// Dry-run por defecto; escribe solo con --apply.
import { prisma } from "../src/lib/prisma";
import { classifyProduct } from "./scrape";

const APPLY = process.argv.includes("--apply");
const PRODUCT_ID = 10886;
const OFFER_ID = 87560;
const HERMANO_ID = 10885; // la Flat: el producto contra el que hubo que desambiguar

async function main() {
  console.log(APPLY ? "APLICANDO r67" : "DRY-RUN r67");

  const p = await prisma.product.findUnique({
    where: { id: PRODUCT_ID },
    select: { id: true, brandKey: true, modelSlug: true, category: true, name: true },
  });
  if (!p) throw new Error(`P${PRODUCT_ID} no existe`);

  const antes = await prisma.offer.findMany({
    where: { productId: p.id },
    select: { storeId: true, store: { select: { slug: true } } },
    distinct: ["storeId"],
  });
  const tiendasAntes = new Set(antes.map((o) => o.storeId));
  console.log(`\nP${p.id} ${p.brandKey}/${p.modelSlug} "${p.name}"`);
  console.log(`   ${tiendasAntes.size} tiendas: ${antes.map((o) => o.store.slug).join(", ")}`);
  if (tiendasAntes.size !== 2) throw new Error(`se esperaban 2 tiendas, tiene ${tiendasAntes.size}`);

  // El hermano Flat tiene que seguir intacto: esta ronda no lo toca.
  const hermano = await prisma.offer.count({ where: { productId: HERMANO_ID } });
  console.log(`   (hermano P${HERMANO_ID} "la Flat" conserva sus ${hermano} ofertas, no se toca)`);

  const o = await prisma.offer.findUnique({
    where: { id: OFFER_ID },
    select: {
      id: true, productId: true, storeId: true, title: true, url: true, price: true,
      inStock: true, sourceCategory: true, store: { select: { slug: true } },
    },
  });
  if (!o) throw new Error(`of${OFFER_ID} no existe`);
  if (o.productId !== null) throw new Error(`of${o.id} ya cuelga de P${o.productId}`);

  // El alcance lo define el clasificador, siempre.
  const cat = classifyProduct(o.title, o.url, o.sourceCategory ?? undefined);
  if (cat === null) throw new Error(`of${o.id} esta FUERA de alcance`);

  // "¿Suma tienda?" -- el filtro obligatorio, medido contra el estado PREVIO.
  if (tiendasAntes.has(o.storeId)) {
    throw new Error(`P${p.id} ya tiene ${o.store.slug}: no sumaria tienda`);
  }

  console.log(`\n   + [${o.store.slug}] of${o.id} $${o.price} stock=${o.inStock}`);
  console.log(`     ${o.title}`);
  console.log(`   -> ${tiendasAntes.size}t -> ${tiendasAntes.size + 1}t  (TIENDA NUEVA: ${o.store.slug})`);

  if (!APPLY) {
    console.log("\n(dry-run: no se escribió nada)");
    return;
  }

  await prisma.offer.update({ where: { id: o.id }, data: { productId: p.id, category: p.category } });
  const despues = await prisma.offer.findMany({
    where: { productId: p.id },
    select: { storeId: true, store: { select: { slug: true } } },
    distinct: ["storeId"],
  });
  console.log(`\n   APLICADO. P${p.id} queda con ${despues.length} tiendas: ${despues.map((r) => r.store.slug).join(", ")}`);
}

main().finally(() => prisma.$disconnect());
