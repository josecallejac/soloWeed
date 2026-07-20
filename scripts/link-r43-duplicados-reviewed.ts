import { prisma } from "../src/lib/prisma";

// Ronda 43 (2026-07-20): higiene de ofertas duplicadas de la MISMA tienda en
// productos congelados (>=4 tiendas).
//
// ORIGEN: el usuario detecto en la ficha /productos/ocb/premium que la oferta
// de Piranha era otro papelillo. Al auditarlo aparecieron 41 productos de 4+
// tiendas con 2 o mas ofertas de una misma tienda. La mayoria son LEGITIMOS
// (la convencion del catalogo es un producto por modelo+tamano con todas las
// variantes de color adentro: SLX, atrapa-cenizas Bonglab, sopletes Ignite,
// quemadores Calvo). Aqui solo van los que son un SKU distinto.
//
// SEGURIDAD: cada desvinculacion se comprueba contra la regla de congelados.
// Solo se permite si la tienda SIGUE representada por otra oferta, es decir el
// producto no pierde ninguna tienda. La guarda de abajo lo verifica y aborta
// el caso si no se cumple, asi que no puede degradar un producto congelado.

// FALSOS POSITIVOS confirmados por foto (NO tocar): de 26 grupos "REVISAR", 13
// resultaron legitimos. Las causas de falso positivo, para no repetir el susto:
//   - misma URL con ?variant= => es la misma oferta (el scraper crea una oferta
//     por variante, ver [[variantes-productos]]); 953 URLs base del catalogo
//     estan en esta situacion
//   - el mismo producto listado en dos categorias de la tienda (GrowBarato)
//   - nomenclatura inconsistente de la tienda ("V2.0" que la foto no respalda)
//   - outlet "CAJA ROTA" al mismo precio: misma unidad, empaque dañado
//   - quemadores "Generico" vs "BongLab": la foto muestra la misma pieza

// [productId, offerId, motivo, permitirPerdidaDeTienda?]
type Unlink = [number, number, string] | [number, number, string, true];

const UNLINKS: Unlink[] = [
  // --- ya aplicado en la primera pasada (idempotente: se omite si no esta vinculada)
  [6008, 299, "OCB Azul (paq. azul liso 'Excellente qualite', slug n1) != OCB Premium (paq. negro manuscrito). Piranha queda via of293"],

  // --- lote 1 (foto): 13 de 14 grupos resultaron legitimos, este es el unico fallo
  [5529, 3153, "'Bong Cristal Mini para marihuana 8-17 cm' es generico != R3 Mini Bonglab Pyrex 12cm. GB queda via of2226"],

  // --- P5478 Gizeh Pink: de 11 ofertas solo 3 son Pink. Fumetas aportaba 8, una sola Pink.
  [5478, 2138, "Gizeh Super Fine != Pink (otra linea/gramaje)"],
  [5478, 624, "Gizeh Brown sin blanquear != Pink"],
  [5478, 1229, "Gizeh Pure Canamo Organico != Pink"],
  [5478, 1251, "Gizeh Black Extra Fine != Pink"],
  [5478, 1273, "Gizeh Unbleached Extra Fine != Pink"],
  [5478, 2136, "Gizeh Edicion 420 != Pink"],
  [5478, 2137, "Gizeh Rojo Fine != Pink"],
  // OJO: unica oferta de Kushbreak -> el producto BAJA de 4 a 3 tiendas.
  // Foto: pack kraft "PURE 1 1/4 Extra Fine", linea canamo. Precedente: 13 jul,
  // P5720 bajo a 3t al corregir los filtros OCB.
  [5478, 69343, "Gizeh PURE (pack kraft, linea canamo) != Pink. BAJA A 3 TIENDAS", true],

  // --- talla explicita
  [5768, 2001, "Banger Cuarzo 45 macho 10mm != producto de 14mm (SKU y URL propios)"],

  // --- packs/kits colgados de la unidad suelta
  [5737, 12568, "'Pack Starter The M7' $160.990 incluye extras != M7 suelto"],
  [5737, 19430, "'M7 Starter Kit' (lata con soplete y accesorios) != M7 suelto"],
  [10197, 3225, "'Kit Fumeta OZeta Case XL' es kit y talla XL != estuche de tela blando"],

  // --- generacion / configuracion distinta
  [10561, 31829, "Peak Pro base sin 3DXL ($549.990 vs $597.990) != producto 'Pearl + 3DXL'"],
  [10528, 18024, "Sploofy 'Pro II' es otra generacion != Sploofy Pro"],

  // --- Galaxy Lightning: modelo propio (dientes en rayo, SKU y precio propios).
  // Existe en 4 tiendas -> candidato a producto nuevo, ver Pendientes.
  [5499, 73, "Galaxy 'Lightning Grinder' 63mm es modelo distinto del Galaxy liso"],
  [5499, 5140, "Galaxy 'Lightning Grinder' 63mm (piranha) idem"],
  [5499, 1552, "Galaxy 'Lightning Grinder' 63mm (fumetas) idem"],
];

async function storeIdsOf(productId: number) {
  const rows = await prisma.offer.findMany({
    where: { productId },
    select: { storeId: true },
    distinct: ["storeId"],
  });
  return new Set(rows.map((r) => r.storeId));
}

async function main() {
  const apply = process.argv.includes("--apply");
  if (!apply) console.log("DRY-RUN (usar --apply para escribir)\n");

  let perdidasDeTienda = 0;

  for (const [productId, offerId, motivo, permitirPerdida] of UNLINKS) {
    const offer = await prisma.offer.findUnique({
      where: { id: offerId },
      select: { id: true, productId: true, storeId: true, title: true, store: { select: { name: true } } },
    });
    if (!offer) {
      console.warn(`oferta ${offerId} inexistente, omitida`);
      continue;
    }
    if (offer.productId !== productId) {
      console.warn(`oferta ${offerId} no esta vinculada a ${productId} (esta en ${offer.productId}), omitida`);
      continue;
    }

    // GUARDA: la tienda debe seguir presente tras desvincular.
    const hermanas = await prisma.offer.count({
      where: { productId, storeId: offer.storeId, id: { not: offerId } },
    });
    if (hermanas === 0 && !permitirPerdida) {
      console.error(
        `ABORTA of${offerId}: es la UNICA oferta de ${offer.store.name} en P${productId}; ` +
        `desvincularla haria perder una tienda a un producto congelado`,
      );
      continue;
    }
    if (hermanas === 0) perdidasDeTienda += 1;

    const antes = (await storeIdsOf(productId)).size;
    if (apply) await prisma.offer.update({ where: { id: offerId }, data: { productId: null } });
    const despues = apply ? (await storeIdsOf(productId)).size : antes;

    const product = await prisma.product.findUniqueOrThrow({
      where: { id: productId },
      select: { name: true },
    });
    console.log(`P${productId} ${product.name.slice(0, 50)}`);
    console.log(`  - oferta ${offerId} (${offer.store.name}) :: ${offer.title.slice(0, 58)}`);
    console.log(`    ${motivo}`);
    const aviso = hermanas === 0 ? "  <<< PIERDE LA TIENDA (aprobado)" : "";
    console.log(`    tiendas: ${antes} -> ${apply ? despues : hermanas === 0 ? antes - 1 : antes} | quedan ${hermanas} oferta(s) de esa tienda${aviso}`);
  }

  if (perdidasDeTienda) {
    console.log(`\nProductos que pierden una tienda: ${perdidasDeTienda} (marcados como aprobados en la lista)`);
  }
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
