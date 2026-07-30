// Ronda 63 (2026-07-29): EL PRIMER PRODUCTO DE 6 TIENDAS DEL CATALOGO.
//
// P11004 airistech/bateria-vertex-2-0 nacio hoy en r61 con 5 tiendas (Astro, Fumetas,
// Friendly Grow, Piranha, GrowBarato). Le faltaba Kushbreak, y su oferta estaba ahi:
//   of69156 [kushbreak] $12.990 "Airis batería 350MAH"
//   https://www.kushbreak.cl/airis-bateria-vaporizador-catridge-wax
//
// ── POR QUE ESTO NO CONTRADICE EL "CERRADO CON 5 METODOS" DEL 28 JUL ──────────
// Esa conclusion era correcta y sigue siendolo: los 5 metodos buscaban una sexta
// tienda para los 27 productos de 5 tiendas QUE YA EXISTIAN, y a 26 de ellos les
// faltaba exactamente Friendly Grow, que no vende esas marcas. El Vertex 2.0 no
// aparecio en ninguno de esos barridos porque NO EXISTIA COMO PRODUCTO: el hueco de
// alias airis/airistech lo tenia partido en 5 pozos de huerfanas que ninguna
// herramienta cruzaba. Primero hubo que crear el producto (r61); su sexta tienda
// estaba despues a un solo caso de foto.
//
// ── IDENTIDAD: CERRADA POR PARTIDA DOBLE ──────────────────────────────────────
// El titulo de Kushbreak no nombra el modelo ("Airis batería 350MAH") y su URL es
// genérica, asi que hubo que ir a la evidencia:
//
// 1) LA ESPECIFICACION. Su descripcion declara 350 mAh y **tres niveles de voltaje con
//    los colores exactos de LED**: 3,4V verde / 3,7V azul / 4,2V rojo. La oferta de FG
//    del Vertex 2.0 (of87985) declara 350 mAh y 3,4/3,7/4,2 — coincidencia exacta,
//    incluidos los colores. (Astro y Fumetas escriben 4,0V en vez de 4,2V; es la unica
//    discrepancia y esta entre las propias tiendas del producto.)
// 2) LA FOTO, que es la que zanja: el blister de la imagen de Kushbreak dice
//    literalmente **"airis® 350mAh V2.0 Battery"**. Y el cuerpo es el mismo del Vertex
//    de FG: cilindro con tapa cromada, boton circular con anillo cromado, logo "airis"
//    abajo y base cromada. El de Kushbreak es negro y el de FG blanco: es COLOR, que
//    fusiona (la talla y la edicion no, el color si).
//    Ademas el filename de la imagen de FG es "airis_350mAh_V2.0_Battery.jpg", que
//    confirma por tercera via que el Vertex 2.0 ES el modelo de 350 mAh.
//
// ── EL DESCARTE QUE HABIA QUE HACER ───────────────────────────────────────────
// La spec sola NO bastaba, y por eso se abrio la foto: **la bateria Vigor de Astro
// cuesta exactamente $12.990**, el mismo precio que la candidata, y todas las baterias
// 510 de Airis comparten circuito (mismos voltajes, misma capacidad). Los candidatos
// reales eran Vertex 2.0, Vigor y Cube. El packaging de la foto los descarta.
//
// ── RATIO ─────────────────────────────────────────────────────────────────────
// $12.990 contra $7.990 (Astro/FG) = 1,63, bajo el umbral de 1,8. Contra Fumetas
// ($11.990) es 1,08. Kushbreak es consistentemente la mas cara de esta marca.
//
// ── REGLA ─────────────────────────────────────────────────────────────────────
// P11004 tiene 5 tiendas, o sea esta congelado, pero esto es exactamente el caso
// "SOLO SUMAR": recibe la oferta de la unica tienda que le FALTA y sube de nivel. No
// pierde ni cambia ninguna oferta existente. No requiere excepcion del usuario.
//
// Dry-run por defecto; escribe solo con --apply.
import { prisma } from "../src/lib/prisma";
import { classifyProduct } from "./scrape";

const APPLY = process.argv.includes("--apply");
const PRODUCT_ID = 11004;
const OFFER_ID = 69156;

async function main() {
  console.log(APPLY ? "APLICANDO r63" : "DRY-RUN r63");

  const p = await prisma.product.findUnique({
    where: { id: PRODUCT_ID },
    select: { id: true, brandKey: true, modelSlug: true, category: true, name: true },
  });
  if (!p) throw new Error(`P${PRODUCT_ID} no existe`);

  const antes = await prisma.offer.findMany({
    where: { productId: p.id }, select: { storeId: true, store: { select: { slug: true } } },
    distinct: ["storeId"],
  });
  const tiendasAntes = new Set(antes.map((o) => o.storeId));
  console.log(`\nP${p.id} ${p.brandKey}/${p.modelSlug} | ${tiendasAntes.size} tiendas: ${antes.map((o) => o.store.slug).join(", ")}`);
  if (tiendasAntes.size !== 5) throw new Error(`se esperaban 5 tiendas, tiene ${tiendasAntes.size}`);

  const o = await prisma.offer.findUnique({
    where: { id: OFFER_ID },
    select: { id: true, productId: true, storeId: true, title: true, url: true, price: true,
              inStock: true, sourceCategory: true, store: { select: { slug: true } } },
  });
  if (!o) throw new Error(`of${OFFER_ID} no existe`);
  if (o.productId !== null) throw new Error(`of${o.id} ya cuelga de P${o.productId}`);

  // El alcance lo define el clasificador, siempre.
  const cat = classifyProduct(o.title, o.url, o.sourceCategory ?? undefined);
  if (cat === null) throw new Error(`of${o.id} esta FUERA de alcance`);

  // SOLO SUMAR: la tienda tiene que estar AUSENTE del producto.
  if (tiendasAntes.has(o.storeId)) {
    throw new Error(`P${p.id} ya tiene ${o.store.slug}: seria una 2a oferta de tienda presente, prohibido en un congelado`);
  }

  console.log(`   + [${o.store.slug}] of${o.id} $${o.price} stock=${o.inStock} | ${o.title}`);
  console.log(`   -> ${tiendasAntes.size}t -> ${tiendasAntes.size + 1}t  (TIENDA NUEVA: ${o.store.slug})`);

  if (!APPLY) { console.log("\n(dry-run: no se escribió nada)"); return; }

  await prisma.offer.update({ where: { id: o.id }, data: { productId: p.id, category: p.category } });
  const despues = await prisma.offer.findMany({ where: { productId: p.id }, select: { storeId: true, store: { select: { slug: true } } }, distinct: ["storeId"] });
  console.log(`\n   APLICADO. P${p.id} queda con ${despues.length} TIENDAS: ${despues.map((r) => r.store.slug).join(", ")}`);
  if (despues.length === 6) console.log("   *** primer producto de 6 tiendas del catalogo ***");
}

main().finally(() => prisma.$disconnect());
