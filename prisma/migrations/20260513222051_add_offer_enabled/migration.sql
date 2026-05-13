-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Offer" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "storeId" INTEGER NOT NULL,
    "productId" INTEGER,
    "url" TEXT NOT NULL,
    "sourceId" TEXT,
    "title" TEXT NOT NULL,
    "normalizedTitle" TEXT NOT NULL,
    "brand" TEXT,
    "brandKey" TEXT,
    "modelKey" TEXT,
    "category" TEXT NOT NULL,
    "sourceCategory" TEXT,
    "description" TEXT,
    "imageUrl" TEXT,
    "price" INTEGER NOT NULL,
    "originalPrice" INTEGER,
    "currency" TEXT NOT NULL DEFAULT 'CLP',
    "inStock" BOOLEAN NOT NULL DEFAULT true,
    "availability" TEXT,
    "enabled" INTEGER NOT NULL DEFAULT 0,
    "lastSeenAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Offer_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "Store" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Offer_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Offer" ("availability", "brand", "brandKey", "category", "createdAt", "currency", "description", "id", "imageUrl", "inStock", "lastSeenAt", "modelKey", "normalizedTitle", "originalPrice", "price", "productId", "sourceCategory", "sourceId", "storeId", "title", "updatedAt", "url") SELECT "availability", "brand", "brandKey", "category", "createdAt", "currency", "description", "id", "imageUrl", "inStock", "lastSeenAt", "modelKey", "normalizedTitle", "originalPrice", "price", "productId", "sourceCategory", "sourceId", "storeId", "title", "updatedAt", "url" FROM "Offer";
DROP TABLE "Offer";
ALTER TABLE "new_Offer" RENAME TO "Offer";
CREATE UNIQUE INDEX "Offer_url_key" ON "Offer"("url");
CREATE INDEX "Offer_storeId_idx" ON "Offer"("storeId");
CREATE INDEX "Offer_productId_idx" ON "Offer"("productId");
CREATE INDEX "Offer_category_idx" ON "Offer"("category");
CREATE INDEX "Offer_brand_idx" ON "Offer"("brand");
CREATE INDEX "Offer_brandKey_idx" ON "Offer"("brandKey");
CREATE INDEX "Offer_modelKey_idx" ON "Offer"("modelKey");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
