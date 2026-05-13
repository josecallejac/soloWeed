PRAGMA foreign_keys=OFF;

CREATE TABLE "new_Product" (
  "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
  "name" TEXT NOT NULL,
  "normalizedName" TEXT NOT NULL,
  "brand" TEXT,
  "brandKey" TEXT,
  "modelKey" TEXT,
  "modelSlug" TEXT,
  "category" TEXT NOT NULL,
  "imageUrl" TEXT,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" DATETIME NOT NULL
);

INSERT INTO "new_Product" ("id", "name", "normalizedName", "brand", "brandKey", "modelKey", "modelSlug", "category", "imageUrl", "createdAt", "updatedAt")
SELECT "id", "name", "normalizedName", "brand", "brandKey", "modelKey", "modelSlug", "category", "imageUrl", "createdAt", "updatedAt"
FROM "Product";

DROP TABLE "Product";
ALTER TABLE "new_Product" RENAME TO "Product";

CREATE INDEX "Product_category_idx" ON "Product"("category");
CREATE INDEX "Product_brand_idx" ON "Product"("brand");
CREATE INDEX "Product_brandKey_idx" ON "Product"("brandKey");
CREATE INDEX "Product_modelKey_idx" ON "Product"("modelKey");
CREATE INDEX "Product_modelSlug_idx" ON "Product"("modelSlug");
CREATE UNIQUE INDEX "Product_brandKey_modelSlug_key" ON "Product"("brandKey", "modelSlug");

PRAGMA foreign_keys=ON;
