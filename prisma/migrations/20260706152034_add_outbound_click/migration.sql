-- CreateTable
CREATE TABLE "OutboundClick" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "offerId" INTEGER NOT NULL,
    "storeId" INTEGER NOT NULL,
    "productId" INTEGER,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateIndex
CREATE INDEX "OutboundClick_storeId_createdAt_idx" ON "OutboundClick"("storeId", "createdAt");

-- CreateIndex
CREATE INDEX "OutboundClick_productId_createdAt_idx" ON "OutboundClick"("productId", "createdAt");

-- CreateIndex
CREATE INDEX "OutboundClick_offerId_idx" ON "OutboundClick"("offerId");
