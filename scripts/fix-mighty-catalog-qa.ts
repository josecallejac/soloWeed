// Correccion dirigida del grupo P10287 detectado por la auditoria 2026-08-26.
//
// La curacion habia mezclado dos vaporizadores Mighty completos con seis
// accesorios/repuestos de Mighty. Este script no borra ofertas: mueve solo las
// dos coincidencias con identidad comprobada, deja huerfanas las cuatro que no
// tienen un destino seguro y corrige la identidad del producto padre.
//
// Dry-run por defecto. Ejecutar con --apply despues de guardar el respaldo de
// vinculos protegidos y un backup de PostgreSQL.
import { prisma } from "../src/lib/prisma";
import { classifyProduct } from "./scrape";

const APPLY = process.argv.includes("--apply");
const PRODUCT_ID = 10287;
const KEEP_OFFER_IDS = [1265, 12640];

const MOVE_TO_EXISTING = [
  {
    offerId: 16092,
    productId: 10516,
    note: "estuche rigido Mighty/Mighty+ -> producto de estuche Mighty Plus",
  },
  {
    offerId: 19929,
    productId: 10275,
    note: "juego de piezas de desgaste Mighty -> producto de piezas de desgaste",
  },
] as const;

const UNLINK_WITH_CATEGORY = [
  { offerId: 13690, category: "Pipas", note: "Anomaly Mighty Hitter 17mm: pipa, no vaporizador" },
  { offerId: 16030, category: "Repuestos para bongs y vaporizadores", note: "Mighty Adaptador de Corriente: repuesto, sin destino equivalente seguro" },
  { offerId: 16186, category: "Repuestos para bongs y vaporizadores", note: "Mighty/Crafty Kit de Accesorios: kit ambiguo, queda pendiente" },
  { offerId: 18125, category: "Repuestos para bongs y vaporizadores", note: "SIDE KIT VENTY/VEAZY/MIGHTY/CRAFTY: kit ambiguo, queda pendiente" },
] as const;

// Variantes huerfanas del mismo error de clasificacion. No tienen productId,
// por lo que solo se corrige la categoria para que futuras curaciones las vean
// en la familia correcta.
const ORPHAN_CATEGORY_FIXES = [
  { offerId: 16029, category: "Repuestos para bongs y vaporizadores", note: "Crafty Adaptador de Corriente" },
  { offerId: 35664, category: "Pipas", note: "Anomaly Mighty Hitter 17mm - Blanco" },
] as const;

const ALL_GROUP_OFFER_IDS = [
  ...KEEP_OFFER_IDS,
  ...MOVE_TO_EXISTING.map((item) => item.offerId),
  ...UNLINK_WITH_CATEGORY.map((item) => item.offerId),
];

async function distinctStoreIds(productId: number, client = prisma) {
  const rows = await client.offer.findMany({ where: { productId }, select: { storeId: true }, distinct: ["storeId"] });
  return new Set(rows.map((row) => row.storeId));
}

async function main() {
  console.log(APPLY ? "APLICANDO QA Mighty\n" : "DRY-RUN QA Mighty\n");

  const product = await prisma.product.findUnique({
    where: { id: PRODUCT_ID },
    select: { id: true, name: true, normalizedName: true, brand: true, brandKey: true, modelKey: true, modelSlug: true, category: true },
  });
  if (!product) throw new Error(`P${PRODUCT_ID} no existe`);
  if (product.name !== "Juego De Anillos Sellado Mighty-Storz & Bickel") {
    throw new Error(`P${PRODUCT_ID} cambio de nombre inesperadamente: ${product.name}`);
  }
  if (product.brandKey !== "storz-bickel" || product.modelSlug !== "mighty") {
    throw new Error(`P${PRODUCT_ID} no conserva la URL esperada storz-bickel/mighty`);
  }

  const groupOffers = await prisma.offer.findMany({
    where: { id: { in: ALL_GROUP_OFFER_IDS } },
    select: { id: true, productId: true, storeId: true, title: true, category: true, url: true, sourceCategory: true, store: { select: { name: true } } },
    orderBy: { id: "asc" },
  });
  if (groupOffers.length !== ALL_GROUP_OFFER_IDS.length) {
    throw new Error(`Se esperaban ${ALL_GROUP_OFFER_IDS.length} ofertas del grupo y hay ${groupOffers.length}`);
  }
  const byId = new Map(groupOffers.map((offer) => [offer.id, offer]));

  for (const offerId of ALL_GROUP_OFFER_IDS) {
    const offer = byId.get(offerId)!;
    if (offer.productId !== PRODUCT_ID) throw new Error(`of${offerId} no cuelga de P${PRODUCT_ID} (actual: ${offer.productId})`);
  }
  for (const offerId of KEEP_OFFER_IDS) {
    const offer = byId.get(offerId)!;
    if (!/^Vaporizador Mighty\b/i.test(offer.title)) throw new Error(`of${offerId} no parece el vaporizador Mighty: ${offer.title}`);
    if (classifyProduct(offer.title, offer.url, offer.sourceCategory ?? undefined) !== "Vaporizadores herbales") {
      throw new Error(`of${offerId} no clasifica como vaporizador herbal`);
    }
  }

  for (const move of MOVE_TO_EXISTING) {
    const offer = byId.get(move.offerId)!;
    const target = await prisma.product.findUnique({ where: { id: move.productId }, select: { id: true, name: true, category: true, brandKey: true, modelSlug: true } });
    if (!target) throw new Error(`P${move.productId} no existe para of${move.offerId}`);
    if (target.category !== "Repuestos para bongs y vaporizadores") throw new Error(`P${target.id} no es un producto de repuestos`);
    if (target.brandKey !== "storz-bickel") throw new Error(`P${target.id} no es Storz & Bickel`);
    const targetStores = await distinctStoreIds(target.id);
    if (targetStores.has(offer.storeId)) throw new Error(`P${target.id} ya tiene la tienda de of${move.offerId}; se rechazaria duplicado`);
    if (classifyProduct(offer.title, offer.url, offer.sourceCategory ?? undefined) !== target.category) {
      throw new Error(`of${move.offerId} no clasifica como ${target.category}`);
    }
    console.log(`MOVER of${offer.id} [${offer.store.name}] -> P${target.id} (${target.modelSlug}) | ${move.note}`);
  }

  for (const unlink of UNLINK_WITH_CATEGORY) {
    const offer = byId.get(unlink.offerId)!;
    const inferred = classifyProduct(offer.title, offer.url, offer.sourceCategory ?? undefined);
    if (inferred !== unlink.category) throw new Error(`of${unlink.offerId} clasifica como ${inferred}, se esperaba ${unlink.category}`);
    console.log(`DESVINCULAR of${offer.id} [${offer.store.name}] -> ${unlink.category} | ${unlink.note}`);
  }

  for (const fix of ORPHAN_CATEGORY_FIXES) {
    const offer = await prisma.offer.findUnique({ where: { id: fix.offerId }, select: { id: true, productId: true, title: true, url: true, category: true, sourceCategory: true, store: { select: { name: true } } } });
    if (!offer) throw new Error(`of${fix.offerId} no existe`);
    if (offer.productId !== null) throw new Error(`of${fix.offerId} dejo de ser huerfana (P${offer.productId})`);
    const inferred = classifyProduct(offer.title, offer.url, offer.sourceCategory ?? undefined);
    if (inferred !== fix.category) throw new Error(`of${fix.offerId} clasifica como ${inferred}, se esperaba ${fix.category}`);
    console.log(`RECLASIFICAR of${offer.id} [${offer.store.name}] ${offer.category} -> ${fix.category} | ${fix.note}`);
  }

  console.log(`\nP${PRODUCT_ID}: ${KEEP_OFFER_IDS.length} ofertas completas se conservan; la identidad pasara a "Storz & Bickel Mighty".`);
  if (!APPLY) {
    console.log("\n(dry-run: no se escribio nada)");
    return;
  }

  await prisma.$transaction(async (tx) => {
    await tx.product.update({
      where: { id: PRODUCT_ID },
      data: {
        name: "Storz & Bickel Mighty",
        normalizedName: "storz bickel mighty",
        brand: "Storz & Bickel",
        category: "Vaporizadores herbales",
      },
    });

    for (const move of MOVE_TO_EXISTING) {
      await tx.offer.update({ where: { id: move.offerId }, data: { productId: move.productId, category: "Repuestos para bongs y vaporizadores" } });
    }
    for (const unlink of UNLINK_WITH_CATEGORY) {
      await tx.offer.update({ where: { id: unlink.offerId }, data: { productId: null, category: unlink.category } });
    }
    for (const fix of ORPHAN_CATEGORY_FIXES) {
      await tx.offer.update({ where: { id: fix.offerId }, data: { category: fix.category } });
    }
  });

  const after = await prisma.product.findUnique({ where: { id: PRODUCT_ID }, select: { name: true, category: true, offers: { select: { id: true, title: true, category: true } } } });
  if (!after || after.name !== "Storz & Bickel Mighty" || after.category !== "Vaporizadores herbales") throw new Error("P10287 no quedo con identidad de Mighty");
  const afterIds = after.offers.map((offer) => offer.id).sort((a, b) => a - b);
  if (afterIds.join(",") !== KEEP_OFFER_IDS.slice().sort((a, b) => a - b).join(",")) throw new Error(`P10287 conserva ofertas inesperadas: ${afterIds.join(",")}`);
  for (const move of MOVE_TO_EXISTING) {
    const targetStores = await distinctStoreIds(move.productId);
    if (targetStores.size < 2) throw new Error(`P${move.productId} quedo con menos de 2 tiendas`);
  }
  console.log(`\nAPLICADO: P${PRODUCT_ID} queda con 2 ofertas de vaporizador; ${MOVE_TO_EXISTING.length} ofertas sumadas a repuestos; ${UNLINK_WITH_CATEGORY.length} ofertas huerfanas corregidas.`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
