import * as fs from "node:fs";
import * as path from "node:path";
import { prisma } from "../src/lib/prisma";

// Protege los productos multi-tienda existentes durante una ronda de curacion:
//   --save     guarda el mapeo producto -> ofertas de productos con >= MIN_STORES tiendas
//   --verify   compara el estado actual contra el respaldo y reporta diferencias
//   --restore  re-vincula las ofertas que la curacion haya desvinculado o movido
// Regla del proyecto: los productos que ya tienen 4 tiendas no deben cambiar;
// solo se agregan productos nuevos a ese grupo.

const MIN_STORES = Number(process.env.PROTECT_MIN_STORES ?? 3);
const SNAPSHOT_PATH = path.join("reports", "protected-links.json");

type ProtectedProduct = {
  id: number;
  name: string;
  brandKey: string | null;
  modelKey: string | null;
  modelSlug: string | null;
  category: string;
  storeCount: number;
  offerIds: number[];
};

async function collect(): Promise<ProtectedProduct[]> {
  const products = await prisma.product.findMany({
    select: {
      id: true,
      name: true,
      brandKey: true,
      modelKey: true,
      modelSlug: true,
      category: true,
      offers: { select: { id: true, storeId: true } },
    },
  });

  return products
    .map((product) => ({
      id: product.id,
      name: product.name,
      brandKey: product.brandKey,
      modelKey: product.modelKey,
      modelSlug: product.modelSlug,
      category: product.category,
      storeCount: new Set(product.offers.map((offer) => offer.storeId)).size,
      offerIds: product.offers.map((offer) => offer.id).sort((a, b) => a - b),
    }))
    .filter((product) => product.storeCount >= MIN_STORES)
    .sort((a, b) => b.storeCount - a.storeCount || a.id - b.id);
}

function loadSnapshot(): ProtectedProduct[] {
  if (!fs.existsSync(SNAPSHOT_PATH)) {
    console.error(`No existe ${SNAPSHOT_PATH}; corre primero con --save.`);
    process.exit(1);
  }
  return JSON.parse(fs.readFileSync(SNAPSHOT_PATH, "utf8")) as ProtectedProduct[];
}

async function diffAgainstSnapshot(snapshot: ProtectedProduct[]) {
  const issues: Array<{ product: ProtectedProduct; missingOfferIds: number[]; productGone: boolean }> = [];

  for (const expected of snapshot) {
    const product = await prisma.product.findUnique({
      where: { id: expected.id },
      select: { id: true, modelSlug: true, brandKey: true, offers: { select: { id: true } } },
    });

    if (!product) {
      issues.push({ product: expected, missingOfferIds: expected.offerIds, productGone: true });
      continue;
    }

    const currentOfferIds = new Set(product.offers.map((offer) => offer.id));
    const missingOfferIds = expected.offerIds.filter((id) => !currentOfferIds.has(id));

    if (missingOfferIds.length > 0) {
      issues.push({ product: expected, missingOfferIds, productGone: false });
    }

    if (product.brandKey !== expected.brandKey || product.modelSlug !== expected.modelSlug) {
      console.warn(
        `AVISO producto ${expected.id} cambio de slug: ${expected.brandKey}/${expected.modelSlug} -> ${product.brandKey}/${product.modelSlug}`,
      );
    }
  }

  return issues;
}

async function main() {
  const mode = process.argv.find((arg) => ["--save", "--verify", "--restore"].includes(arg));

  if (mode === "--save") {
    const products = await collect();
    fs.mkdirSync(path.dirname(SNAPSHOT_PATH), { recursive: true });
    fs.writeFileSync(SNAPSHOT_PATH, JSON.stringify(products, null, 2));
    const byStores = new Map<number, number>();
    for (const product of products) byStores.set(product.storeCount, (byStores.get(product.storeCount) ?? 0) + 1);
    console.log(`Guardados ${products.length} productos con >=${MIN_STORES} tiendas en ${SNAPSHOT_PATH}`);
    for (const [stores, count] of [...byStores.entries()].sort((a, b) => b[0] - a[0])) {
      console.log(`  ${stores} tiendas: ${count} productos`);
    }
    return;
  }

  if (mode === "--verify" || mode === "--restore") {
    const snapshot = loadSnapshot();
    const issues = await diffAgainstSnapshot(snapshot);

    if (issues.length === 0) {
      console.log(`OK: los ${snapshot.length} productos protegidos conservan todas sus ofertas.`);
      return;
    }

    for (const issue of issues) {
      const label = `producto ${issue.product.id} (${issue.product.brandKey}/${issue.product.modelSlug}, ${issue.product.storeCount} tiendas)`;
      if (issue.productGone) {
        console.log(`PERDIDO ${label}: el producto ya no existe; ofertas ${issue.product.offerIds.join(", ")}`);
        continue;
      }
      console.log(`ROTO ${label}: faltan ofertas ${issue.missingOfferIds.join(", ")}`);

      if (mode === "--restore") {
        for (const offerId of issue.missingOfferIds) {
          await prisma.offer.update({ where: { id: offerId }, data: { productId: issue.product.id } });
        }
        console.log(`  restauradas ${issue.missingOfferIds.length} ofertas -> producto ${issue.product.id}`);
      }
    }

    if (mode === "--verify") {
      console.log(`\n${issues.length} productos con diferencias. Usa --restore para re-vincular.`);
      process.exitCode = 1;
    }
    return;
  }

  console.log("Uso: npx tsx scripts/protect-multistore-links.ts --save | --verify | --restore");
  console.log(`Env: PROTECT_MIN_STORES (default 3) controla que productos se protegen.`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
