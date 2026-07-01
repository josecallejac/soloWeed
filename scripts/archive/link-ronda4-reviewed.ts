import { prisma } from "../../src/lib/prisma";

// Ronda 4 (2026-06-10): vinculos del dry-run de expand-curated-product-offers
// (umbral 0.80) aprobados tras revision manual uno a uno. Se aplican de forma
// dirigida porque el dry-run tambien proponia 7 falsos positivos con modelKey
// generico (capsulas con tampon -> normales, bolso 4x4 -> crossbag 5x5,
// thin slurper -> banger regular, etc.) que NO deben vincularse.
const APPROVED_LINKS: Array<[offerId: number, productId: number]> = [
  [1067, 5464], // Papelillo RAW Organico 1 1/4 (Piranha)
  [5140, 5499], // Lightning Grinder Aluminio 63mm (Piranha) -> Galaxy Lightning: 4 tiendas
  [11374, 5525], // Dream Rig Bonglab (GrowBarato)
  [11386, 5527], // KM8 Viper Rig (GrowBarato)
  [3330, 5706], // Conos Blazy Susan King Size 3u (Piranha)
  [3328, 5707], // Conos Blazy Susan 1 1/4 6u (Piranha)
  [11191, 5726], // Encendedor Clipper Metalico (Piranha)
  [11168, 5760], // Contenedor extracciones 4mL Bonglab (Piranha)
  [4427, 5784], // Grinder Cleaner 250ml (Astro)
  [10612, 5999], // Moledor SLX 50mm (GrowBarato)
  [4322, 6567], // Moledor Bulldog 4 partes (Piranha)
  [11340, 6574], // RAW Artesano 1 1/4 (GrowBarato)
  // [11524, 8651] REVERTIDO: la oferta es el MIQRO original (sin C) y el
  // producto 8651 es el MIQRO-C; son variantes distintas y no se mezclan.
  [11033, 10145], // Maquina enroladora RAW King Size Slim (Piranha)
  [10791, 6003], // Grindercard Tarjeta Moledor Soulblime (Piranha): unico LINK valido del dry-run 2->3
];

async function main() {
  for (const [offerId, productId] of APPROVED_LINKS) {
    const offer = await prisma.offer.findUnique({
      where: { id: offerId },
      select: { id: true, title: true, productId: true },
    });

    if (!offer) {
      console.warn(`oferta ${offerId} no existe; omitida`);
      continue;
    }

    if (offer.productId === productId) {
      console.log(`oferta ${offerId} ya vinculada a producto ${productId}`);
      continue;
    }

    await prisma.offer.update({ where: { id: offerId }, data: { productId } });
    console.log(`oferta ${offerId} -> producto ${productId} | ${offer.title.slice(0, 70)}`);
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
