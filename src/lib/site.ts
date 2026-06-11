// URL canonica del sitio para sitemap/robots/metadata. En produccion se
// define NEXT_PUBLIC_SITE_URL (sin slash final); el fallback solo cubre dev.
export const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000").replace(/\/$/, "");

export const SITE_NAME = "SoloWeed";
export const SITE_DESCRIPTION =
  "Compara precios de bongs, moledores, papelillos y vaporizadores herbales en growshops de Chile.";

export function productPath(brandKey: string, modelSlug: string): string {
  return `/productos/${brandKey}/${modelSlug}`;
}
