ALTER TABLE "Product" ADD COLUMN "modelSlug" TEXT;

CREATE INDEX "Product_modelSlug_idx" ON "Product"("modelSlug");
