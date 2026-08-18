import { SITE_NAME } from "./site";

export function buildHomeJsonLd(siteUrl: string) {
  const normalizedSiteUrl = siteUrl.replace(/\/$/, "");

  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: SITE_NAME,
    url: normalizedSiteUrl,
    inLanguage: "es-CL",
    potentialAction: {
      "@type": "SearchAction",
      target: `${normalizedSiteUrl}/?q={search_term_string}`,
      "query-input": "required name=search_term_string",
    },
  };
}
