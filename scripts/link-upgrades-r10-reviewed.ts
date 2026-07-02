import { prisma } from "../src/lib/prisma";

// Ronda 10 (2026-07-02): productos nuevos desde diagnose-orphan-pairs (banda
// alta 0.55+) con verificacion visual de cada par. Rechazados en el triage:
// sabores LRC distintos entre si, Cookies vs estandar (Wall Mount), packs vs
// unidades (piedras Clipper), enroladora manual N1 vs automatica, disenos
// Zippo distintos, pipas Top Smoke "diseno aleatorio" vs disenos con nombre,
// quemadores genericos sin marca y papelillos Vibes sin variante identificable.
//
// Notas de verificacion:
// - El "Strawberry" de Astro (17943) es en realidad Strawberry Shortcake
//   Terpenes segun su imagen: se empareja con 15867 y no con 16021.
// - La foto del Gravity de GrowBarato (11562) muestra la edicion Cookies:
//   se empareja con Fumetas (20127); el estandar de Astro queda sin par.
// - New Peak Pro (11109+17207): imagen de Astro muerta, pero titulos
//   explicitos y precio identico ($467.492 vs $467.490).

const NEW_PRODUCTS: Array<{
  offerIds: number[];
  name: string;
  brand: string;
  brandKey: string;
  modelSlug: string;
  category: string;
  imageUrl: string;
}> = [
  {
    offerIds: [2263, 2481], // growbarato + fumetas
    name: "Puffco Peak Pro",
    brand: "Puffco",
    brandKey: "puffco",
    modelSlug: "peak-pro",
    category: "Accesorios de extraccion",
    imageUrl: "https://www.growbaratochile.cl/5811-large_default/puffco-peak-pro.jpg",
  },
  {
    offerIds: [18540, 27399], // fumetas + piranha
    name: "Storz & Bickel Veazy",
    brand: "Storz & Bickel",
    brandKey: "storz-bickel",
    modelSlug: "veazy",
    category: "Vaporizadores herbales",
    imageUrl: "https://cdnx.jumpseller.com/fumetas-store/image/69114560/Vaporizador-Herbal-Veazy-Storz-_26-Bickel-Fumetas-Store.jpg?1761599241",
  },
  {
    offerIds: [12490, 12965, 15970], // astro + fumetas + piranha (3 tiendas)
    name: "Storz & Bickel Easy Valve Globo Volcano con Adaptador",
    brand: "Storz & Bickel",
    brandKey: "storz-bickel",
    modelSlug: "easy-valve-globo-adaptador",
    category: "Repuestos para bongs y vaporizadores",
    imageUrl: "https://piranha.cl/20240-thickbox_default/volcano-easy-valve-globo-con-adaptador.jpg",
  },
  {
    offerIds: [16160, 18583, 17200], // piranha + fumetas + astro (3 tiendas)
    name: "Puffco Peak Pro Joystick Cap",
    brand: "Puffco",
    brandKey: "puffco",
    modelSlug: "peak-pro-joystick-cap",
    category: "Accesorios de extraccion",
    imageUrl: "https://piranha.cl/17857-thickbox_default/puffco-peak-pro-joystick-cap-color-a-eleccion.jpg",
  },
  {
    offerIds: [11109, 17207], // piranha + astro
    name: "Puffco New Peak Pro",
    brand: "Puffco",
    brandKey: "puffco",
    modelSlug: "new-peak-pro",
    category: "Accesorios de extraccion",
    imageUrl: "https://piranha.cl/14449-thickbox_default/vaporizador-puffco-new-peak-pro-color-a-eleccion.jpg",
  },
  {
    offerIds: [15867, 17943], // piranha + astro
    name: "Lion Rolling Circus Hemp Wraps Terpenes Strawberry Shortcake x2",
    brand: "Lion Rolling Circus",
    brandKey: "lion-rolling-circus",
    modelSlug: "terpenes-strawberry-shortcake",
    category: "Conos y blunts",
    imageUrl: "https://cdnx.jumpseller.com/astrogrowshop/image/70609200/imagen_1_28876.webp?1765566477",
  },
  {
    offerIds: [304, 11587], // piranha + growbarato
    name: "Lion Rolling Circus Papelillo Silver Big Smoke King Size",
    brand: "Lion Rolling Circus",
    brandKey: "lion-rolling-circus",
    modelSlug: "silver-big-smoke",
    category: "Papelillos",
    imageUrl: "https://piranha.cl/10095-thickbox_default/papelillo-silver-big-smoke-lion-rolling-circus.jpg",
  },
  {
    offerIds: [24092, 24539], // astro + fumetas
    name: "Octave Terp Timer",
    brand: "Octave",
    brandKey: "octave",
    modelSlug: "terp-timer",
    category: "Otros parafernalia",
    imageUrl: "https://cdnx.jumpseller.com/astrogrowshop/image/70331332/imagen_1_21923.webp?1764697279",
  },
  {
    offerIds: [12256, 15999], // astro + piranha
    name: "OZeta Mochila Slim Anti-Olor",
    brand: "OZeta",
    brandKey: "ozeta",
    modelSlug: "mochila-slim",
    category: "Otros parafernalia",
    imageUrl: "https://piranha.cl/16317-thickbox_default/mochila-slim-anti-olor-ozeta.jpg",
  },
  {
    offerIds: [16140, 17232], // piranha + astro
    name: "Puffco Proxy Travel Pack",
    brand: "Puffco",
    brandKey: "puffco",
    modelSlug: "proxy-travel-pack",
    category: "Accesorios de extraccion",
    imageUrl: "https://piranha.cl/17876-thickbox_default/puffco-proxy-travel-pack-color-a-eleccion.jpg",
  },
  {
    offerIds: [20127, 11562], // fumetas + growbarato
    name: "Stündenglass x Cookies Gravity Hookah",
    brand: "Cookies",
    brandKey: "cookies",
    modelSlug: "stundenglass-gravity-hookah",
    category: "Bongs",
    imageUrl: "https://cdnx.jumpseller.com/fumetas-store/image/16492762/Cookies_web_Stundenglass_Front-darkerglasscopy-1_540x.png?1638734658",
  },
];

function normalizeName(value: string) {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

async function main() {
  for (const spec of NEW_PRODUCTS) {
    const existing = await prisma.product.findUnique({
      where: { brandKey_modelSlug: { brandKey: spec.brandKey, modelSlug: spec.modelSlug } },
    });
    const product =
      existing ??
      (await prisma.product.create({
        data: {
          name: spec.name,
          normalizedName: normalizeName(spec.name),
          brand: spec.brand,
          brandKey: spec.brandKey,
          modelKey: spec.modelSlug,
          modelSlug: spec.modelSlug,
          category: spec.category,
          imageUrl: spec.imageUrl,
        },
      }));
    console.log(`${existing ? "producto existente" : "producto creado"} ${product.id} | ${product.name}`);
    for (const offerId of spec.offerIds) {
      const offer = await prisma.offer.findUnique({ where: { id: offerId }, select: { productId: true } });
      if (!offer) {
        console.warn(`  oferta ${offerId} no existe; omitida`);
        continue;
      }
      if (offer.productId && offer.productId !== product.id) {
        console.warn(`  oferta ${offerId} ya vinculada a producto ${offer.productId}; omitida`);
        continue;
      }
      await prisma.offer.update({
        where: { id: offerId },
        data: { productId: product.id, category: spec.category },
      });
      console.log(`  oferta ${offerId} -> producto ${product.id}`);
    }
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
