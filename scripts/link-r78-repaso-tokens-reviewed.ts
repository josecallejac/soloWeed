// Ronda 78 (2026-07-30, 5a sesion): EL REPASO DE LOS PARES DE TOKENS QUE QUEDARON
// SIN REVISAR EN r73.
//
// En r73 solo se trabajo la CABEZA de cada lista (los ~22 pares de mayor score
// por tienda) y quedaron ~180 pares misma-marca sin mirar. Aqui se cierra ese
// pendiente.
//
// El barrido se RE-CORRIO en vez de reusar los CSV de r73, porque entre medio se
// aplicaron r73-r77 (~200 ofertas vinculadas y 26 productos nuevos) y los CSV
// viejos proponian pares que ya estaban resueltos. Un diagnostico caducado hace
// perder mas tiempo del que ahorra.
//
// ── EL HALLAZGO QUE JUSTIFICA HABER RE-CORRIDO ─────────────────────────────
// of69137 "Focus V Aeris" contra P10435 "Focus V Vaporizador Aeris" NO APARECIA
// en el barrido de r73. No porque el algoritmo fallara, sino porque la oferta
// tenia brandKey="pulsar" (Kushbreak declara brand="Pulsar" en un producto cuyo
// titulo y URL dicen Focus V) y el filtro de misma-marca la mandaba a comparar
// contra el catalogo de Pulsar. Al arreglar la precedencia en r76, el par salio
// solo, en el puesto 11 de Kushbreak.
//
//   Un bug de marca no solo esconde ofertas: DESVIA la busqueda hacia el
//   catalogo equivocado. Por eso el paso 0 del estandar (arreglar marcas ANTES
//   de barrer) no es burocracia.
//
// ── LOS 5 VINCULOS ─────────────────────────────────────────────────────────
//
// 1) of69137 [kushbreak] $249.990 -> P10435 "Focus V Vaporizador Aeris"  3t->4t
//    Nombre de producto identico. Ratio 1,26 contra el minimo ($199.192 de
//    Piranha); Kushbreak esta por encima del mercado en la mayoria de sus
//    comparables, asi que no es anomalo.
//
// 2) of17984 [astro] $62.990 -> P10408 "BongLab Bong K99 Octopus 30cm"   3t->4t
//    IDENTIDAD DURA por referencia de fabricante, la misma palanca de r73:
//    Astro sku BGBL(K99)BLACK, Fumetas sku BLAB-(K99). Ademas GrowBarato lo
//    titula "Bong Bonglab Octopus Black 30 cm K99" -- el codigo aparece en el
//    titulo de una tercera tienda -- y el precio de Astro es EXACTAMENTE el de
//    Piranha ($62.990).
//    CONTRASTE DELIBERADO CON EL K30 (rechazado en r75): alli la referencia
//    compartida tambien existia, pero la talla declarada y la foto la
//    contradecian. Aqui las tres señales apuntan al mismo lado. La regla que
//    quedo escrita en r75 se aplica tal cual.
//
// 3) of71107 [growbarato] $51.900 -> P10787 "Humidificador Kasvi 8L"     2t->3t
//    Los 8 litros estan en los titulos de las tres tiendas. Ratio 1,39.
//
// 4) of15843 [piranha] $74.791 -> P10590 "Mochila Smellproof Blazy Susan" 2t->3t
//    Parecia un caso de "Logos" contra "Negra", que habria que mirar con foto.
//    NO HACE FALTA: el producto YA contiene las dos variantes -- la oferta de
//    Astro que cuelga de el se llama "Mochila Smellproof (Logos) Black-Blazy
//    Susan" y la de Fumetas "Mochila Smell-Proof (Negra)". O sea que el catalogo
//    ya trata Logos y Negra como el mismo modelo, y la de Piranha ("Logos")
//    calza con la que ya esta dentro. Ratio 1,00 contra Fumetas.
//
// 5) of150 [growbarato] $3.600 -> P10874 "Ronson Soplete Pequeño"        2t->3t
//    El titulo de GrowBarato no dice el tamaño y el producto se llama "Pequeño",
//    asi que se comprobo el universo entero de la marca antes de aceptar:
//    Ronson tiene 3 productos (gas 18ml, gas 300ml y este soplete) y UN SOLO
//    soplete; GrowBarato tiene UNA SOLA oferta de soplete. Sus otros encendedores
//    Ronson son de cocina o de bolsillo a $700-$1.000, otra banda. No hay con que
//    confundirlo. Ratio 1,11.
//
// ── RECHAZOS CONFIRMADOS EN EL REPASO (ya no volver a mirarlos) ────────────
// El resto de los ~180 pares misma-marca son los mismos falsos positivos que
// r73 ya habia documentado, y el re-barrido los volvio a emitir intactos:
// - Los pins HighTrip cruzados entre si en todas las combinaciones (mismo precio,
//   misma marca, DISEÑO distinto = edicion).
// - Los Zippo por diseño (Purple->Green, Filigree->Flame, Leaf->Fire Heart).
// - S&B mallas FINAS contra NORMALES; anillos del Venty contra los del Solid
//   Valve; cierres de tapa Mighty+ contra el llavero Capsule Caddy.
// - Los filtros Sploofy Pro II contra el CARTUCHO DE REPUESTO Sploofy.
// - "Bandeja de Cultivo Kasvi" contra el humidificador (ademas cultivo esta
//   fuera de alcance).
// - Yocan ZIVA contra Yocan Kodo Pro (precio identico, modelos distintos);
//   Gizeh 8mm contra 6mm; LRC Silver 1 1/4 contra King Size; "RAW caja metalica"
//   contra las bandejas RAW.
// - K30 de Astro contra P10344, ya rechazado con fotos en r75.
// - Volcano "Classic y Digital" de GrowBarato contra P10302 "Classic GOLD 24K",
//   que es edicion especial y ademas producto congelado de 4 tiendas.
//
// Dry-run por defecto; escribe solo con --apply.
import { prisma } from "../src/lib/prisma";
import { classifyProduct } from "./scrape";

const APPLY = process.argv.includes("--apply");

const LINKS: { offerId: number; productId: number; tiendasAntes: number; tienda: string; nota: string }[] = [
  { offerId: 69137, productId: 10435, tiendasAntes: 3, tienda: "kushbreak", nota: "Focus V Aeris: nombre identico; el par estaba oculto por el brandKey pulsar" },
  { offerId: 17984, productId: 10408, tiendasAntes: 3, tienda: "astrogrowshop", nota: "Bonglab Octopus: referencia K99 compartida en los sku + precio identico a Piranha" },
  { offerId: 71107, productId: 10787, tiendasAntes: 2, tienda: "growbarato", nota: "Kasvi: los 8 litros estan en los titulos de las tres tiendas" },
  { offerId: 15843, productId: 10590, tiendasAntes: 2, tienda: "piranha", nota: "Blazy Susan: el producto ya contiene una oferta 'Logos' y otra 'Negra'" },
  { offerId: 150, productId: 10874, tiendasAntes: 2, tienda: "growbarato", nota: "Ronson: unico soplete de la marca y unico soplete de GrowBarato" },
];

async function main() {
  console.log(APPLY ? "APLICANDO r78\n" : "DRY-RUN r78\n");

  const plan: typeof LINKS = [];
  for (const l of LINKS) {
    const p = await prisma.product.findUnique({
      where: { id: l.productId },
      select: { id: true, name: true, brandKey: true, modelSlug: true, category: true },
    });
    if (!p) throw new Error(`P${l.productId} no existe`);

    // Estado PREVIO, que es contra lo que se mide "¿suma tienda?".
    const antes = await prisma.offer.findMany({
      where: { productId: p.id },
      select: { storeId: true, store: { select: { slug: true } } },
      distinct: ["storeId"],
    });
    if (antes.length !== l.tiendasAntes) {
      throw new Error(`P${p.id} tiene ${antes.length} tiendas, se esperaban ${l.tiendasAntes}`);
    }
    if (antes.some((a) => a.store.slug === l.tienda)) {
      throw new Error(`P${p.id} ya tiene ${l.tienda}: no sumaria tienda`);
    }

    const o = await prisma.offer.findUnique({
      where: { id: l.offerId },
      select: {
        id: true, productId: true, title: true, url: true, price: true, inStock: true,
        sourceCategory: true, store: { select: { slug: true } },
      },
    });
    if (!o) throw new Error(`of${l.offerId} no existe`);
    if (o.productId !== null) throw new Error(`of${o.id} ya cuelga de P${o.productId}`);
    if (o.store.slug !== l.tienda) throw new Error(`of${o.id} es de ${o.store.slug}`);
    if (classifyProduct(o.title, o.url, o.sourceCategory ?? undefined) === null) {
      throw new Error(`of${o.id} esta FUERA de alcance`);
    }

    plan.push(l);
    console.log(`P${p.id} [${l.tiendasAntes}t -> ${l.tiendasAntes + 1}t] ${p.brandKey}/${p.modelSlug}`);
    console.log(`   "${p.name}"`);
    console.log(`   antes: ${antes.map((a) => a.store.slug).sort().join(", ")}   +TIENDA NUEVA: ${l.tienda}`);
    console.log(`   ${l.nota}`);
    console.log(`   + of${o.id} $${o.price} ${o.inStock ? "stock" : "SIN STOCK"} | ${o.title}\n`);
  }

  const suben4 = plan.filter((l) => l.tiendasAntes + 1 >= 4).length;
  console.log(`RESUMEN: ${plan.length} ofertas -> ${plan.length} productos | ${suben4} suben a 4 tiendas`);

  if (!APPLY) { console.log("\n(dry-run: no se escribió nada)"); return; }

  console.log("\n=== APLICANDO ===");
  for (const l of plan) {
    const p = await prisma.product.findUnique({ where: { id: l.productId }, select: { category: true } });
    await prisma.offer.update({ where: { id: l.offerId }, data: { productId: l.productId, category: p!.category } });
    const despues = await prisma.offer.findMany({
      where: { productId: l.productId }, select: { storeId: true, store: { select: { slug: true } } }, distinct: ["storeId"],
    });
    const ok = despues.length === l.tiendasAntes + 1;
    console.log(`${ok ? "OK " : "!! "} P${l.productId}: ${despues.length}t (${despues.map((d) => d.store.slug).sort().join(", ")})`);
    if (!ok) throw new Error(`P${l.productId} quedo con ${despues.length} tiendas`);
  }
  console.log("\nAPLICADO r78.");
}

main().finally(() => prisma.$disconnect());
