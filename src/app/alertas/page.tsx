import type { Metadata } from "next";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { PriceAlertsWorkspace } from "./price-alerts-workspace";

export const metadata: Metadata = {
  title: "Alertas de precio",
  description: "Revisa tus objetivos de precio guardados localmente en SoloWeed.",
  alternates: { canonical: "/alertas" },
  robots: { index: false, follow: true },
};

export default function PriceAlertsPage() {
  return (
    <main className="min-h-screen overflow-hidden bg-white text-zinc-900 dark:bg-[#070709] dark:text-[#fafafa]">
      <SiteHeader subtitle="Alertas de precio" />
      <section className="mx-auto w-full max-w-5xl px-5 py-10 sm:px-8 lg:px-10 lg:py-16">
        <div className="mb-8 max-w-3xl"><p className="font-mono text-xs font-black uppercase tracking-[0.24em] text-accent-text">Seguimiento local</p><h1 className="mt-3 text-4xl font-black tracking-[-0.05em] sm:text-6xl">Alertas de precio</h1><p className="mt-5 text-base leading-7 text-slate-600 dark:text-white/60">Define un precio objetivo desde cualquier ficha. Al volver a abrir esta página consultamos el catálogo y te mostramos si ya se alcanzó.</p></div>
        <PriceAlertsWorkspace />
      </section>
      <SiteFooter />
    </main>
  );
}
