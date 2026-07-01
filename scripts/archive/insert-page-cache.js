const fs = require('fs');

function insertCache() {
  const file = 'E:/soloWeed/src/app/page.tsx';
  let content = fs.readFileSync(file, 'utf-8');

  // Insert cache map definition before getCatalogData
  const cacheCode = `
const PAGE_CACHE = new Map<string, any>();
const PAGE_CACHE_TTL_MS = 60 * 1000 * 5; // 5 mins

async function getCatalogData(`;

  content = content.replace(/async function getCatalogData\(/, cacheCode);

  // Insert cache read
  const cacheReadCode = `
    const normalizedQuery = normalizeForSearch(query);
    const queryWhere = buildSearchWhere(normalizedQuery);
    const page = options?.page ?? 1;

    const cacheKey = \`\${normalizedQuery}|\${selectedCategory}|\${options?.storeFilter?.join(",")}|\${options?.minPrice}|\${options?.maxPrice}|\${options?.sort}\`;
    const cached = PAGE_CACHE.get(cacheKey);
    if (cached && cached.expiresAt > Date.now()) {
      const { items: pageItems, totalItems } = selectCatalogPageItems(cached.catalogItems, selectedCategory, options?.sort, page);
      const totalPages = Math.max(1, Math.ceil(totalItems / CATALOG_PAGE_LIMIT));

      return {
        dbReady: true,
        stores: cached.stores,
        offers: pageItems,
        categories: cached.categories,
        page,
        totalPages,
        coverage: cached.coverage,
        stats: cached.stats,
      };
    }

    const categoryFilterSql`;

  content = content.replace(
    /const normalizedQuery = normalizeForSearch\(query\);\s*const queryWhere = buildSearchWhere\(normalizedQuery\);\s*const page = options\?\.page \?\? 1;\s*const categoryFilterSql/,
    cacheReadCode
  );

  // Insert cache write
  const cacheWriteCode = `
    PAGE_CACHE.set(cacheKey, {
      stores,
      categories,
      catalogItems,
      coverage,
      stats: {
        offerCount,
        productCount,
        historyCount,
        storeCount: stores.length,
      },
      expiresAt: Date.now() + PAGE_CACHE_TTL_MS,
    });

    const { items: pageItems, totalItems } = selectCatalogPageItems(catalogItems, selectedCategory, options?.sort, page);`;

  content = content.replace(
    /const { items: pageItems, totalItems } = selectCatalogPageItems\(catalogItems, selectedCategory, options\?\.sort, page\);/,
    cacheWriteCode
  );

  fs.writeFileSync(file, content);
}

insertCache();
console.log("Cache inserted");
