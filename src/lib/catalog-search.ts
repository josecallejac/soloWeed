export type CatalogSearchRecord = {
  brand: string | null;
  category: string;
  normalizedTitle: string;
};

export function getSearchTerms(normalizedQuery: string) {
  return normalizedQuery.split(" ").filter(Boolean);
}

export function matchesCatalogSearch(record: CatalogSearchRecord, normalizedQuery: string) {
  const terms = getSearchTerms(normalizedQuery);
  if (terms.length === 0) return true;

  const searchableFields = [
    record.normalizedTitle.toLowerCase(),
    record.brand?.toLowerCase() ?? "",
    record.category.toLowerCase(),
  ];

  return terms.every((term) => searchableFields.some((field) => field.includes(term)));
}
