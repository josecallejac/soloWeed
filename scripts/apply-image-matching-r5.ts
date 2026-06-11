import { prisma } from "../src/lib/prisma";

// Quinta ronda de matching por imagen (2026-06-11): cosecha del re-barrido
// tras reparar el CDN de Piranha (newpiranha.cl NXDOMAIN -> piranha.cl).
// Lote completo aprobado por el usuario; cada par verificado por
// titulo/medida/precio y, en los casos dudosos, por revision visual de las
// fotos lado a lado (gas Ronson: mismo envase 227g pese a titulos 300/400ml;
// Capsule Caddy identico; difusores Piranha con logo CALVO grabado).
// Descartados con evidencia: Fenix 2 Max (dispositivos distintos en foto),
// Soulblime Largo (formato distinto), bandeja Tyson Grande vs Medium,
// Blunt Wrap (sabores), Zengaz Space, piedras Zippo, difusores multiopcion
// de Astro, y todo lo que tocara el 5768 protegido o el Venty (ya con t3).

const APPROVED_LINKS: Array<[offerId: number, productId: number]> = [
  // 3 -> 4 TIENDAS
  [16061, 5523], // Bong Nevis Rig (Piranha $27.541 vs Astro $27.990)
  [14030, 10203], // Quemador Abeja Calvo 14mm
  // 2 -> 3 TIENDAS
  [16016, 10163], // Bong Glycerin Green Avalanche
  [16039, 5531], // Bong Space Oddity
  [15990, 5526], // Bong Glycerin The Yeti
  [15822, 10165], // Bong KM3 (colores se ignoran en Bongs)
  [14201, 10218], // Bong Handy Rig
  [15920, 10191], // Bong Kraken KC47
  [16084, 10219], // Bong KM1 Prisma
  [15715, 10214], // Yocan Hit 2
  [16167, 5759], // Juego de Mallas Venty
  [16102, 10262], // Unidad de Enfriamiento Venty
  [15757, 5779], // Crossbag 5x5 Ozeta (titulo literal, d=11)
  [1191, 10239], // Gas Ronson (foto: mismo envase 227g)
  [16056, 10281], // Capsule Caddy (foto identica)
  [15624, 10309], // Atrapaceniza Panal Triple 14mm -> triple-honeycomb-14mm
];

const NEW_PRODUCTS: Array<{
  representativeOfferId: number;
  offerIds: number[];
  brandKey: string;
  modelKey: string;
  modelSlug: string;
  category: string;
}> = [
  {
    // 3 TIENDAS de una: Astro $84.990 + Fumetas $79.990 + Piranha $76.491.
    representativeOfferId: 13000,
    offerIds: [11948, 13000, 14387],
    brandKey: "puffco",
    modelKey: "dabber-hot-knife",
    modelSlug: "hot-knife",
    category: "Accesorios de extraccion",
  },
  {
    representativeOfferId: 2119,
    offerIds: [2119, 15573],
    brandKey: "calvo",
    modelKey: "banger-thin-slurper-full-weld-14mm",
    modelSlug: "banger-thin-slurper-full-weld-14mm",
    category: "Accesorios de extraccion",
  },
  {
    representativeOfferId: 2118,
    offerIds: [2118, 14170],
    brandKey: "calvo",
    modelKey: "banger-big-slurper-full-weld-14mm",
    modelSlug: "banger-big-slurper-full-weld-14mm",
    category: "Accesorios de extraccion",
  },
  {
    // Fumetas "6 brazos 45" = tree perc; Piranha "Tree 18mm 45"; $29.990 ambos.
    representativeOfferId: 13275,
    offerIds: [13275, 15756],
    brandKey: "bonglab",
    modelKey: "ash-catcher-tree-18mm-45",
    modelSlug: "atrapa-cenizas-tree-18mm-45",
    category: "Repuestos para bongs y vaporizadores",
  },
  {
    // La variante 18mm; la 14mm es el producto 10309.
    representativeOfferId: 13156,
    offerIds: [465, 15627],
    brandKey: "bonglab",
    modelKey: "ash-catcher-triple-honeycomb-18mm",
    modelSlug: "atrapa-cenizas-triple-honeycomb-18mm",
    category: "Repuestos para bongs y vaporizadores",
  },
  {
    // Contenedor hermetico + armador de conos; mismo precio $9.990.
    representativeOfferId: 14286,
    offerIds: [12452, 14286],
    brandKey: "raw",
    modelKey: "container-reserva",
    modelSlug: "reserva",
    category: "Contenedores y estuches",
  },
  {
    representativeOfferId: 14329,
    offerIds: [12280, 14329],
    brandKey: "clipper",
    modelKey: "flint-pedernal-3u",
    modelSlug: "pedernal-3u",
    category: "Encendedores y sopletes",
  },
  {
    representativeOfferId: 16063,
    offerIds: [12623, 16063],
    brandKey: "dynavap",
    modelKey: "tip-helix-titanium",
    modelSlug: "helix-titanium-tip",
    category: "Repuestos para bongs y vaporizadores",
  },
  {
    representativeOfferId: 15970,
    offerIds: [12965, 15970],
    brandKey: "storz-bickel",
    modelKey: "easy-valve-globo-adaptador",
    modelSlug: "easy-valve-globo-adaptador",
    category: "Repuestos para bongs y vaporizadores",
  },
  {
    representativeOfferId: 14221,
    offerIds: [12634, 14221],
    brandKey: "focus-v",
    modelKey: "vaporizer-carta-sport",
    modelSlug: "carta-sport",
    category: "Vaporizadores herbales",
  },
  {
    // Fotos de Piranha con logo CALVO grabado aunque el titulo no diga marca.
    representativeOfferId: 1581,
    offerIds: [1581, 15594],
    brandKey: "calvo",
    modelKey: "diffuser-classic-10cm",
    modelSlug: "difusor-classic-10cm",
    category: "Repuestos para bongs y vaporizadores",
  },
  {
    representativeOfferId: 13220,
    offerIds: [13220, 15603],
    brandKey: "calvo",
    modelKey: "diffuser-classic-14cm",
    modelSlug: "difusor-classic-14cm",
    category: "Repuestos para bongs y vaporizadores",
  },
  {
    // "7th Gen" es el eslogan oficial del Fenix Pro (weecke.com); "V2" de
    // Astro es revision menor. Precedente: Mighty V2 = Mighty original.
    representativeOfferId: 467,
    offerIds: [467, 12458],
    brandKey: "weecke",
    modelKey: "vaporizer-fenix-pro",
    modelSlug: "fenix-pro",
    category: "Vaporizadores herbales",
  },
];

async function main() {
  for (const [offerId, productId] of APPROVED_LINKS) {
    const offer = await prisma.offer.findUnique({
      where: { id: offerId },
      select: { productId: true, title: true },
    });
    if (!offer) {
      console.warn(`oferta ${offerId} no existe; omitida`);
      continue;
    }
    if (offer.productId === productId) {
      console.log(`oferta ${offerId} ya vinculada a ${productId}`);
      continue;
    }
    if (offer.productId !== null) {
      console.warn(`OMITIDA oferta ${offerId}: ya pertenece al producto ${offer.productId}`);
      continue;
    }
    await prisma.offer.update({ where: { id: offerId }, data: { productId } });
    console.log(`oferta ${offerId} -> producto ${productId} | ${offer.title.slice(0, 60)}`);
  }

  for (const spec of NEW_PRODUCTS) {
    const existing = await prisma.product.findFirst({
      where: { brandKey: spec.brandKey, modelSlug: spec.modelSlug },
    });
    if (existing) {
      console.log(`producto ${spec.brandKey}/${spec.modelSlug} ya existe (id ${existing.id})`);
      continue;
    }
    const linked = await prisma.offer.findMany({
      where: { id: { in: spec.offerIds }, productId: { not: null } },
      select: { id: true, productId: true },
    });
    if (linked.length > 0) {
      console.warn(`OMITIDO ${spec.brandKey}/${spec.modelSlug}: ofertas ya vinculadas ${JSON.stringify(linked)}`);
      continue;
    }
    const representative = await prisma.offer.findUniqueOrThrow({ where: { id: spec.representativeOfferId } });
    const product = await prisma.product.create({
      data: {
        name: representative.title,
        normalizedName: representative.normalizedTitle,
        brand: representative.brand,
        brandKey: spec.brandKey,
        modelKey: spec.modelKey,
        modelSlug: spec.modelSlug,
        category: spec.category,
        imageUrl: representative.imageUrl,
      },
    });
    await prisma.offer.updateMany({
      where: { id: { in: spec.offerIds } },
      data: { productId: product.id, category: spec.category },
    });
    console.log(`creado ${product.id} /productos/${spec.brandKey}/${spec.modelSlug} (${spec.offerIds.length} ofertas)`);
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
