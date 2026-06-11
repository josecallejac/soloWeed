import { prisma } from "../src/lib/prisma";

// Ronda 4b (2026-06-10): vinculos aprobados tras revision manual.
// Mighty+ : las ofertas nuevas de Astro y Fumetas son el mismo Mighty+ que el
// producto 9245 (Piranha + GrowBarato). Pre-vincularlas antes de curar evita
// que la curacion cree un producto duplicado y deja 9245 con 4 tiendas.
const APPROVED_LINKS: Array<[offerId: number, productId: number]> = [
  [12585, 9245], // Vaporizador Mighty + Negro (Astro)
  [12967, 9245], // Vaporizador Mighty+ Plus (Fumetas)
  // Vinculos aprobados del dry-run de expand post-curacion (los rechazados:
  // bolsos Ozeta -> crossbag 5x5, accesorios/Mighty original -> Mighty+,
  // capsulas con tampon, quemador cuerno, MIQRO sin C, pipa silicona ->
  // pyrex, X4 Dream Rig -> Dream Rig, mentolado -> ECO, etc.)
  [13665, 5418], // Papelillos RAW Artesanos King Size Slim (Fumetas)
  [13285, 5530], // Bonglab The Sheikh 42cm (Fumetas)
  [13165, 5533], // Bonglab K598 Splash Water 50cm (Fumetas)
  [12229, 5705], // Conos Blazy Susan Pink 1 1/4 6u (Astro)
  [12232, 5707], // Conos Blazy Susan Unbleached 1 1/4 6u (Astro) -> producto unbleached, no pink
  [12929, 5726], // Clipper Metalico Gold (Fumetas)
  [12931, 5726], // Clipper Metalico Safari (Fumetas)
  [12555, 5726], // Clipper Metalico Gold (Astro)
  [12556, 5726], // Clipper Metalico Safari (Astro)
  [12557, 5726], // Clipper Metalico Turqueosie (Astro)
  [12683, 5726], // Clipper Metalico Jungle Leafs (Astro)
  [12908, 5726], // Clipper Metalico All Patterns (Fumetas)
  [12486, 5726], // Clipper Metalico All Patterns (Astro)
  [13640, 5726], // Clipper Metalico Dark Rose Gold (Fumetas)
  [12481, 5731], // Cenicero Deluxe Silicona Blazy Susan (Astro)
  [12636, 5741], // Crafty Plus (Astro): 3a tienda
  [13209, 5748], // Calvo Quemador Perlas Macho 18mm (Fumetas)
  [13311, 5751], // Calvo Quemador Macho 14mm (Fumetas)
  [12276, 10203], // Calvo Quemador Abeja 14mm (Astro) -> producto abeja, no bowl generico
  [13172, 5760], // Bonglab Contenedor Extracto 4ml (Fumetas)
  [12181, 5760], // Bonglab Contenedor Extractos 4ml (Astro)
  [13173, 5772], // Bonglab K288 Classic Ice Pro 35cm (Fumetas)
  [13168, 5773], // Bonglab KS11 Classic Ice 26cm (Fumetas)
  [13164, 5774], // Bonglab K42 Heavy Trash 53cm (Fumetas)
  [12985, 5781], // Ozeta Muslera XL con clave (Fumetas): 3a tienda
  [12277, 6020], // Bonglab Quemador Macho 14mm (Astro)
  [12326, 6020], // Bonglab Quemador Macho 14mm (Astro)
  [12819, 6020], // Bonglab Quemador Macho 14mm Rainbow (Fumetas)
  [13130, 6576], // Papelillos Vibes Canamo 1 1/4 (Fumetas)
  [12960, 8647], // Focus V Saber Tip (Fumetas)
  [12342, 10107], // Calvo Banger Regular Full Weld 14mm (Astro)
  [13596, 10140], // OCB Premium Slim King Size sabanas (Fumetas)
  [11485, 10222], // Cabo Heavy Beaker (GrowBarato): 3a tienda
  // Aprobados del dry-run link-3store (rechazados: Alien->Space Opera,
  // Space Horn->Space Opera rig, gas 400ml->300ml, llavero->4 partes,
  // kit dab->nectar, piezas desgaste->boquillas, difusor 12cm/18mm,
  // Zippo Green->Teal, Big Eye 26->24, flat bucket multi-medida)
  [13463, 10166], // Bonglab K47 Medusa 35cm (Fumetas) -> K47 Medusa: 3a tienda
  [13589, 5515], // Moledor Lion Rolling Circus Metalico 50mm (Fumetas)
  [13456, 10164], // Bonglab K18 HeadShot 40cm (Fumetas)
  [12876, 5749], // Bonglab Quemador Hembra 14mm (Fumetas)
  [13197, 10192], // Calvo Bee Rig Recycler 24cm (Fumetas): 3a tienda
  [12320, 5471], // Papelillo + Tips Canamo 1 1/4 (Astro)
  [13167, 5778], // Bonglab KM4 Tiny Bell 10cm (Fumetas)
  [11919, 10179], // Lonchera Con Clave Ozeta (Astro)
  [12984, 10197], // Ozeta Estuche tela antiolor (Fumetas): 3a tienda
  [12417, 10263], // Camara de relleno capsulas Volcano (Astro): 3a tienda
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
