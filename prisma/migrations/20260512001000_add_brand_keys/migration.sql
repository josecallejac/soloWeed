-- AlterTable
ALTER TABLE "Product" ADD COLUMN "brandKey" TEXT;

-- AlterTable
ALTER TABLE "Offer" ADD COLUMN "brandKey" TEXT;

-- CreateIndex
CREATE INDEX "Product_brandKey_idx" ON "Product"("brandKey");

-- CreateIndex
CREATE INDEX "Offer_brandKey_idx" ON "Offer"("brandKey");
