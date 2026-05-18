SELECT "productId", COUNT(DISTINCT "storeId") AS cnt, COUNT(*) AS offerCount FROM "Offer" WHERE "productId" IS NOT NULL GROUP BY "productId" ORDER BY cnt DESC
