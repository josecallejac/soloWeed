import type { Metadata } from "next";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { FavoriteList } from "./favorite-list";

export const metadata: Metadata = {
  title: "Mi lista",
  description: "Tus productos guardados en SoloWeed, almacenados localmente en este navegador.",
  alternates: { canonical: "/lista" },
  robots: { index: false, follow: true },
};

export default function FavoriteListPage() {
  return (
    <main className="min-h-screen overflow-hidden bg-white text-zinc-900 dark:bg-[#070709] dark:text-[#fafafa]">
      <SiteHeader subtitle="Mi lista" />
      <section className="mx-auto w-full max-w-7xl px-5 py-10 sm:px-8 lg:px-10 lg:py-16">
        <div className="mb-8 max-w-2xl"><p className="font-mono text-xs font-black uppercase tracking-[0.24em] text-accent-text">Sin cuenta</p><h1 className="mt-3 text-4xl font-black tracking-[-0.05em] sm:text-5xl">Mi lista</h1><p className="mt-4 text-base leading-7 text-slate-600 dark:text-white/60">Guarda comparaciones para revisarlas después. La lista vive en este navegador y SoloWeed no almacena tus preferencias.</p></div>
        <FavoriteList />
      </section>
      <SiteFooter />
    </main>
  );
}
