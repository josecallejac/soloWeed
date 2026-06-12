-- AlterTable
ALTER TABLE "Offer" ADD COLUMN "ean" TEXT;
ALTER TABLE "Offer" ADD COLUMN "sku" TEXT;

-- CreateIndex
CREATE INDEX "Offer_ean_idx" ON "Offer"("ean");
