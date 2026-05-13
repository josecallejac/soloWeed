-- AlterTable
ALTER TABLE "Product" ADD COLUMN "modelKey" TEXT;

-- AlterTable
ALTER TABLE "Offer" ADD COLUMN "modelKey" TEXT;

-- CreateIndex
CREATE INDEX "Product_modelKey_idx" ON "Product"("modelKey");

-- CreateIndex
CREATE INDEX "Offer_modelKey_idx" ON "Offer"("modelKey");
