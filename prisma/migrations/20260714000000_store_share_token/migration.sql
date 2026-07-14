-- AlterTable
ALTER TABLE "Store" ADD COLUMN     "shareToken" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "Store_shareToken_key" ON "Store"("shareToken");
