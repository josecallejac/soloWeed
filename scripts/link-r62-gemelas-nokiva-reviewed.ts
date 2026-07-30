// Ronda 62 (2026-07-29): las 3 gemelas huerfanas de Astro sobre P10680.
//
// EXCEPCION EXPLICITA APROBADA POR EL USUARIO el 29 jul 2026.
//
// P10680 airistech/herbva-nokiva tiene 4 TIENDAS, o sea esta CONGELADO, y la regla
// "solo sumar" dice que un congelado puede recibir la oferta de una tienda que le
// FALTA, jamas una segunda oferta de una tienda que ya tiene. Esto es exactamente lo
// segundo, asi que sin el OK del usuario estaria prohibido.
//
// Por que es seguro en este caso concreto:
//   - Las 3 huerfanas salen de la MISMA ficha de Astro que las 3 ya vinculadas:
//     https://astrogrowshop.cl/vaporizador-nokiva-kit-airistech
//     (ya vinculadas: of92896 WHITE, of92897 BLACK, of92898 RED)
//   - Astro YA esta en el producto, asi que el nivel NO cambia: sigue en 4 tiendas.
//     No puede perder ni cambiar ninguna oferta existente; solo suma variantes de
//     color de una ficha que ya esta representada.
//   - El color fusiona (regla del proyecto); la talla y la edicion no. Aca solo hay
//     color.
//   - Precedentes de segunda oferta de la misma tienda en un producto ya curado:
//     bateria Life Pod Eco Pro (r31) y difusores Bonglab 14cm (r36).
//
// Efecto: 3 huerfanas menos, P10680 sigue en 4 tiendas. No mueve nada existente.
//
// Dry-run por defecto; escribe solo con --apply.
import { prisma } from "../src/lib/prisma";

const APPLY = process.argv.includes("--apply");
const PRODUCT_ID = 10680;
const OFFER_IDS = [33396, 33397, 33398];
const FICHA = "https://astrogrowshop.cl/vaporizador-nokiva-kit-airistech";

async function main() {
  console.log(APPLY ? "APLICANDO r62" : "DRY-RUN r62");

  const p = await prisma.product.findUnique({
    where: { id: PRODUCT_ID },
    include: { offers: { select: { id: true, url: true, storeId: true, title: true, store: { select: { slug: true } } } } },
  });
  if (!p) throw new Error(`P${PRODUCT_ID} no existe`);

  const tiendasAntes = new Set(p.offers.map((o) => o.storeId));
  console.log(`\nP${p.id} ${p.brandKey}/${p.modelSlug} | ${tiendasAntes.size} tiendas | ${p.offers.length} ofertas`);
  if (tiendasAntes.size !== 4) {
    throw new Error(`se esperaban 4 tiendas (congelado), tiene ${tiendasAntes.size}: revisar antes de seguir`);
  }

  const offers = await prisma.offer.findMany({
    where: { id: { in: OFFER_IDS } },
    select: { id: true, productId: true, storeId: true, url: true, title: true, price: true,
              inStock: true, store: { select: { slug: true } } },
  });
  const faltan = OFFER_IDS.filter((id) => !offers.some((o) => o.id === id));
  if (faltan.length) throw new Error(`ofertas inexistentes: ${faltan.join(",")}`);
  const ocupadas = offers.filter((o) => o.productId !== null);
  if (ocupadas.length) throw new Error(`ya vinculadas: ${ocupadas.map((o) => `of${o.id}->P${o.productId}`).join(",")}`);

  // GUARDA CLAVE de esta excepcion: cada gemela tiene que venir de la MISMA ficha que
  // una oferta ya vinculada de la misma tienda. Si no, no es una gemela y no entra.
  const base = (u: string) => u.split("?")[0].replace(/\/$/, "");
  const fichasVinculadas = new Set(p.offers.map((o) => `${o.storeId}::${base(o.url)}`));
  for (const o of offers) {
    const clave = `${o.storeId}::${base(o.url)}`;
    if (!fichasVinculadas.has(clave)) {
      throw new Error(`of${o.id} NO viene de una ficha ya representada (${base(o.url)}): no es gemela`);
    }
    if (base(o.url) !== FICHA) {
      throw new Error(`of${o.id} no es de la ficha esperada: ${base(o.url)}`);
    }
    console.log(`   + [${o.store.slug}] of${o.id} $${o.price} stock=${o.inStock} ${o.title.slice(0, 50)}`);
  }

  // El nivel NO puede cambiar: todas son de una tienda ya presente.
  const despues = new Set([...tiendasAntes, ...offers.map((o) => o.storeId)]);
  if (despues.size !== tiendasAntes.size) {
    throw new Error(`el nivel cambiaria de ${tiendasAntes.size} a ${despues.size}: esta ronda solo absorbe gemelas`);
  }
  console.log(`   -> ${tiendasAntes.size}t -> ${despues.size}t (sin cambio de nivel, como debe ser)`);

  if (!APPLY) { console.log("\n(dry-run: no se escribió nada)"); return; }

  for (const o of offers) {
    await prisma.offer.update({ where: { id: o.id }, data: { productId: p.id, category: p.category } });
  }
  const final = await prisma.offer.findMany({ where: { productId: p.id }, select: { storeId: true }, distinct: ["storeId"] });
  console.log(`   aplicado | P${p.id} queda con ${final.length} tiendas y ${(await prisma.offer.count({ where: { productId: p.id } }))} ofertas`);
}

main().finally(() => prisma.$disconnect());
