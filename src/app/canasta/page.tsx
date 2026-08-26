import type { Metadata } from "next";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { BasketWorkspace } from "./basket-workspace";

export const metadata: Metadata = {
  title: "Comparador de canasta",
  description: "Compara cuánto cuesta comprar varios productos en una sola tienda o dividir la compra entre growshops.",
  alternates: { canonical: "/canasta" },
  robots: { index: false, follow: true },
};

export default function BasketPage() {
  return (
    <main className="min-h-screen overflow-hidden bg-white text-zinc-900 dark:bg-[#070709] dark:text-[#fafafa]">
      <SiteHeader subtitle="Comparador de canasta" />
      <section className="mx-auto w-full max-w-7xl px-5 py-10 sm:px-8 lg:px-10 lg:py-16">
        <div className="mb-8 max-w-3xl">
          <p className="font-mono text-xs font-black uppercase tracking-[0.24em] text-accent-text">Decisión de compra</p>
          <h1 className="mt-3 text-4xl font-black tracking-[-0.05em] sm:text-6xl">Comparador de canasta</h1>
          <p className="mt-5 text-base leading-7 text-slate-600 dark:text-white/60">Agrega productos comparables y revisa si conviene comprar todo en una tienda o repartirlo para conseguir el menor precio publicado.</p>
        </div>
        <BasketWorkspace />
      </section>
      <SiteFooter />
    </main>
  );
}
