import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getAssortmentGap, getPriceIntelligence } from "../../interno/inteligencia-precios/data";
import { PricingReport } from "./pricing-report";

export const dynamic = "force-dynamic";

// Link privado que se le comparte a una tienda: no debe indexarse.
export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

type PublicPricingPageProps = {
  params: Promise<{ token: string }>;
};

async function getStoreByToken(token: string) {
  if (!token) return null;
  return prisma.store.findFirst({ where: { shareToken: token, enabled: true } });
}

export default async function PublicPricingPage({ params }: PublicPricingPageProps) {
  const { token } = await params;
  const configuredPreviewToken = process.env.PRICING_DEMO_TOKEN?.trim();
  const previewToken = configuredPreviewToken || (process.env.NODE_ENV === "development" ? "friendlygrow-preview" : null);

  // Vista simulada y aislada de PostgreSQL. En desarrollo conserva el token
  // conocido; en Docker productivo solo existe si se configura explícitamente
  // un token largo en PRICING_DEMO_TOKEN.
  if (previewToken && token === previewToken) {
    const { friendlyGrowPreview } = await import("./preview-data");
    return <PricingReport storeName="Friendly Grow" data={friendlyGrowPreview.data} gap={friendlyGrowPreview.gap} />;
  }

  const store = await getStoreByToken(token);
  if (!store) notFound();

  const [data, gap] = await Promise.all([getPriceIntelligence(store.id), getAssortmentGap(store.id)]);
  return <PricingReport storeName={store.name} data={data} gap={gap} />;
}
