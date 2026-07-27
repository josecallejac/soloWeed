// Higiene r51: una sola oferta viva por (tienda, SKU) dentro de cada producto.
//
// EL PROBLEMA
// Cuando una tienda Jumpseller renombra los valores de sus variantes (Astro tradujo
// Azul->BLUE el 27 jul), la URL sintetica "<base>?variant=<nombre>" cambia. Como
// Offer.url es nuestra clave unica, la variante renombrada entra como oferta NUEVA y
// la vieja queda de fantasma. dedupe-astro-variant-offers.ts arreglo los pares donde
// la fantasma conservaba el productId, pero no los pares donde AMBAS quedaron
// huerfanas ni aquellos donde el link se quedo del lado muerto.
//
// LA REGLA
// Por cada grupo (tienda, sku, producto) el link lo conserva UNA oferta que la tienda
// todavia publica. Las fantasmas se marcan SIN STOCK. Nunca se borra nada y el
// producto nunca pierde la tienda.
//
// COMO SE SABE CUAL SIGUE VIVA: `Offer.lastSeenAt`, que el scraper escribe SOLO al
// hacer upsert de una oferta que efectivamente encontro en la tienda (scrape.ts).
// Descartados por medicion:
//   - `updatedAt` NO sirve: la reclasificacion post-scrape reescribe en masa las
//     ofertas existentes, asi que fantasma y viva terminan con el MISMO updatedAt al
//     milisegundo (of78044 "WHITE" y of32124 "TAPA BLANCA", 2026-07-27T06:54:06.706Z)
//     y el desempate salia al azar.
//   - un chequeo HTTP tampoco: la URL "?variant=X" siempre responde 200 porque es la
//     pagina base con un query param que la tienda ignora (a diferencia de las fichas
//     404 que trata mark-dead-offers-r50.ts).
// Con lastSeenAt la separacion es limpia: 2.963 ofertas de Astro vistas el 27 jul
// contra 222 que se quedaron en el 10 jul.
//
// Dry-run por defecto; escribe solo con --apply.
//
//   npx tsx scripts/dedupe-variant-sku-collisions.ts
//   $env:VARIANT_STORE="fumetas"; npx tsx scripts/dedupe-variant-sku-collisions.ts
//   npx tsx scripts/dedupe-variant-sku-collisions.ts --apply
import { prisma } from "../src/lib/prisma";

const APPLY = process.argv.includes("--apply");
const STORE_SLUG = process.env.VARIANT_STORE ?? "astrogrowshop";
// Margen bajo el ultimo scrape de la tienda: una corrida completa dura horas y las
// ofertas se van viendo en momentos distintos, asi que el corte no puede ser el
// instante exacto del maximo.
const MARGEN_HORAS = Number(process.env.VARIANT_FRESH_HOURS ?? 24);

const baseOf = (url: string) => url.split("?variant=")[0];
const variantOf = (url: string) => decodeURIComponent(url.split("?variant=")[1] ?? "(base)");

type Offer = {
  id: number; url: string; sku: string | null; price: number; originalPrice: number | null;
  inStock: boolean; productId: number | null; lastSeenAt: Date; title: string;
};

async function storeCountOf(productId: number) {
  const rows = await prisma.offer.findMany({ where: { productId }, select: { storeId: true }, distinct: ["storeId"] });
  return rows.length;
}

async function main() {
  const store = await prisma.store.findFirst({ where: { slug: STORE_SLUG }, select: { id: true, name: true } });
  if (!store) throw new Error(`Tienda desconocida: ${STORE_SLUG}`);

  const offers: Offer[] = await prisma.offer.findMany({
    where: { storeId: store.id, sku: { not: null } },
    select: {
      id: true, url: true, sku: true, price: true, originalPrice: true,
      inStock: true, productId: true, lastSeenAt: true, title: true,
    },
  });

  const ultimoScrape = new Date(Math.max(...offers.map((o) => o.lastSeenAt.getTime())));
  const corte = new Date(ultimoScrape.getTime() - MARGEN_HORAS * 3600_000);
  const viva = (o: Offer) => o.lastSeenAt >= corte;
  console.log(`${APPLY ? "APLICANDO" : "DRY-RUN"} sobre ${store.name}`);
  console.log(`Último scrape: ${ultimoScrape.toISOString()} | se considera viva si lastSeenAt >= ${corte.toISOString()}`);
  console.log(`Ofertas vivas: ${offers.filter(viva).length} / ${offers.length}`);

  // Grupo = (sku, producto) con >=2 ofertas de la MISMA ficha base, al menos una
  // vinculada. Exigir la misma ficha evita arrastrar homonimos de SKU de otra pagina.
  const grupos = new Map<string, { productId: number; miembros: Offer[] }>();
  for (const linked of offers) {
    if (linked.productId === null) continue;
    const hermanas = offers.filter((o) => o.sku === linked.sku && baseOf(o.url) === baseOf(linked.url) && o.id !== linked.id);
    if (hermanas.length === 0) continue;
    const key = `${linked.sku}|${linked.productId}`;
    if (!grupos.has(key)) grupos.set(key, { productId: linked.productId, miembros: [] });
    const g = grupos.get(key)!;
    for (const m of [linked, ...hermanas]) if (!g.miembros.some((x) => x.id === m.id)) g.miembros.push(m);
  }

  type Accion = {
    offerId: number; productId: number; titularId: number;
    desvincula: boolean; apagaStock: boolean;
    clase: "apaga-fantasma" | "mueve-link-a-la-viva"; nota: string;
  };
  const acciones: Accion[] = [];
  const sinViva: string[] = [];
  const conflictos: string[] = [];

  for (const g of grupos.values()) {
    // Una hermana por SKU puede colgar de OTRO producto (dos productos curados que se
    // reparten la misma ficha). Tocarla la desvincularia de un producto que este script
    // ni siquiera esta evaluando, y el guard de cobertura de abajo -- que solo mira los
    // productos de las acciones -- no lo detectaria. Se reporta y se deja quieto.
    const ajenas = g.miembros.filter((m) => m.productId !== null && m.productId !== g.productId);
    if (ajenas.length > 0) {
      conflictos.push(`P${g.productId} sku=${g.miembros[0].sku}: ${ajenas.map((a) => `of${a.id} cuelga de P${a.productId}`).join(", ")}`);
      continue;
    }
    const vivas = g.miembros.filter(viva);
    if (vivas.length === 0) {
      // Ninguna sigue publicada: no es un duplicado que resolver sino una variante
      // descontinuada. La trata la higiene de ofertas muertas, no este script.
      sinViva.push(`P${g.productId} sku=${g.miembros[0].sku} (${g.miembros.length} ofertas, ninguna vista en el último scrape)`);
      continue;
    }
    // Titular por criterio explicito y determinista (habia casos con DOS ofertas del
    // mismo SKU vinculadas al mismo producto, y elegir "la primera que devuelve la
    // query" dejaba unas veces la base y otras la variante, sin razon):
    //   1. la vista mas recientemente por el scraper;
    //   2. a igual dia, la que tiene stock;
    //   3. a igual todo, la oferta BASE — su URL no cambia cuando la tienda renombra
    //      las variantes, que es justo lo que provoco este desastre.
    const rank = (o: Offer) => [
      Math.floor(o.lastSeenAt.getTime() / 86400_000),
      o.inStock ? 1 : 0,
      o.url.includes("?variant=") ? 0 : 1,
    ];
    const titular = [...vivas].sort((a, b) => {
      const [ra, rb] = [rank(a), rank(b)];
      return rb[0] - ra[0] || rb[1] - ra[1] || rb[2] - ra[2];
    })[0];

    for (const m of g.miembros) {
      if (m.id === titular.id) continue;
      const esFantasma = !viva(m);
      const desvincula = m.productId !== null;
      const apagaStock = esFantasma && m.inStock;
      if (!desvincula && !apagaStock) continue;
      acciones.push({
        offerId: m.id, productId: g.productId, titularId: titular.id, desvincula, apagaStock,
        clase: desvincula ? "mueve-link-a-la-viva" : "apaga-fantasma",
        nota: `"${variantOf(m.url)}" $${m.price} ${esFantasma ? `fantasma (vista ${m.lastSeenAt.toISOString().slice(0, 10)})` : "viva"} -> titular of${titular.id} "${variantOf(titular.url)}"`,
      });
    }
  }

  const apagados = acciones.filter((a) => a.clase === "apaga-fantasma");
  const movidos = acciones.filter((a) => a.clase === "mueve-link-a-la-viva");
  const productos = [...new Set(acciones.map((a) => a.productId))];
  console.log(`\nGrupos (sku, producto) con duplicado: ${grupos.size}`);
  console.log(`Ofertas a corregir: ${acciones.length} sobre ${productos.length} productos`);
  console.log(`  - fantasmas huérfanas que solo se apagan: ${apagados.length}`);
  console.log(`  - el link pasa de una fantasma a la oferta viva: ${movidos.length}`);
  if (sinViva.length) {
    console.log(`\nGrupos sin ninguna oferta viva (los ve la higiene de ofertas muertas): ${sinViva.length}`);
    for (const s of sinViva.slice(0, 10)) console.log(`   ${s}`);
  }
  if (conflictos.length) {
    console.log(`\nGrupos NO tocados porque una hermana cuelga de otro producto: ${conflictos.length}`);
    for (const c of conflictos.slice(0, 12)) console.log(`   ${c}`);
  }

  const antes = new Map<number, number>();
  for (const pid of productos) antes.set(pid, await storeCountOf(pid));
  const congelados = productos.filter((p) => (antes.get(p) ?? 0) >= 4);
  console.log(`\nProductos congelados (>=4 tiendas) tocados: ${congelados.length}${congelados.length ? ` -> ${congelados.map((p) => `P${p}`).join(", ")}` : ""}`);
  console.log("  (ninguno cambia de cobertura: el titular sigue siendo una oferta de la misma tienda)");

  console.log("");
  for (const a of acciones.slice(0, 30)) {
    console.log(`  of${a.offerId} P${a.productId} ${a.desvincula ? "[desvincula]" : ""}${a.apagaStock ? "[sin stock]" : ""} ${a.nota}`);
  }
  if (acciones.length > 30) console.log(`  ... y ${acciones.length - 30} más`);

  if (!APPLY) {
    console.log("\n(dry-run: no se escribió nada)");
    return;
  }

  let hechas = 0;
  for (const a of acciones) {
    const o = offers.find((x) => x.id === a.offerId)!;
    const data = { ...(a.desvincula ? { productId: null } : {}), ...(a.apagaStock ? { inStock: false } : {}) };
    if (a.apagaStock) {
      // El historial registra el cambio real de estado; la desvinculacion no es un
      // evento de precio y no va al grafico.
      await prisma.$transaction([
        prisma.offer.update({ where: { id: a.offerId }, data }),
        prisma.priceHistory.create({ data: { offerId: a.offerId, price: o.price, originalPrice: o.originalPrice, inStock: false } }),
      ]);
    } else {
      await prisma.offer.update({ where: { id: a.offerId }, data });
    }
    hechas++;
  }
  console.log(`\n${hechas} ofertas corregidas.`);

  let regresiones = 0;
  for (const pid of productos) {
    const after = await storeCountOf(pid);
    if (after !== antes.get(pid)) {
      console.log(`  !! P${pid}: ${antes.get(pid)} -> ${after} tiendas`);
      regresiones++;
    }
  }
  console.log(regresiones === 0 ? `Cobertura intacta en los ${productos.length} productos.` : `ATENCIÓN: ${regresiones} productos cambiaron de cobertura.`);
}

main().finally(() => prisma.$disconnect());
