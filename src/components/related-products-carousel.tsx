"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { formatPrice } from "@/lib/format";
import { productPath } from "@/lib/site";

export type RelatedProductItem = {
  brandKey: string;
  id: number;
  imageUrl: string | null;
  maxPrice: number;
  minPrice: number;
  modelSlug: string;
  name: string;
  storeCount: number;
};

type RelatedProductsCarouselProps = {
  category: string;
  products: RelatedProductItem[];
};

export function RelatedProductsCarousel({ category, products }: RelatedProductsCarouselProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [activeFilter, setActiveFilter] = useState<"all" | "high_coverage">("all");
  const [scrollProgress, setScrollProgress] = useState(0);

  const handleScroll = () => {
    if (!scrollRef.current) return;
    const { scrollLeft, scrollWidth, clientWidth } = scrollRef.current;
    const maxScroll = scrollWidth - clientWidth;
    if (maxScroll > 0) {
      setScrollProgress((scrollLeft / maxScroll) * 100);
    }
  };

  const scroll = (direction: "left" | "right") => {
    if (!scrollRef.current) return;
    const scrollAmount = 340;
    scrollRef.current.scrollBy({
      behavior: "smooth",
      left: direction === "left" ? -scrollAmount : scrollAmount,
    });
  };

  const filteredProducts = products.filter((p) => {
    if (activeFilter === "high_coverage") return p.storeCount >= 3;
    return true;
  });

  if (products.length === 0) return null;

  return (
    <section className="mx-auto w-full max-w-7xl px-5 pt-12 pb-20 sm:px-8 lg:px-10 border-t border-slate-200 dark:border-white/10 mt-14">
      {/* Header with Title, Filter Tabs & Navigation Arrows */}
      <div className="mb-6 flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="size-2 rounded-full bg-accent animate-pulse" />
            <p className="text-xs font-mono font-black uppercase tracking-[0.25em] text-slate-500 dark:text-accent-text">
              Comparaciones Interactivas
            </p>
          </div>
          <h2 className="text-2xl sm:text-4xl font-black font-display tracking-tight text-slate-900 dark:text-white">
            Otras comparaciones en {category}
          </h2>
        </div>

        {/* Interactive Filter Pills + Carousel Navigation */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-1.5 rounded-xl bg-slate-100 dark:bg-[#0c0c10]/80 p-1 border border-slate-200 dark:border-white/10 backdrop-blur-md font-mono text-xs">
            <button
              className={`rounded-lg px-3.5 py-2 font-bold uppercase transition-all ${
                activeFilter === "all"
                  ? "bg-slate-900 text-white dark:bg-white dark:text-slate-950 shadow-sm"
                  : "text-slate-600 dark:text-white/60 hover:text-slate-900 dark:hover:text-white"
              }`}
              onClick={() => setActiveFilter("all")}
              type="button"
            >
              Todos ({products.length})
            </button>
            <button
              className={`rounded-lg px-3.5 py-2 font-bold uppercase transition-all ${
                activeFilter === "high_coverage"
                  ? "bg-accent text-black shadow-sm font-black"
                  : "text-slate-600 dark:text-white/60 hover:text-slate-900 dark:hover:text-white"
              }`}
              onClick={() => setActiveFilter("high_coverage")}
              type="button"
            >
              🏆 +3 Tiendas
            </button>
          </div>

          {/* Scroll Nav Buttons */}
          <div className="flex items-center gap-2">
            <button
              aria-label="Desplazar a la izquierda"
              className="grid size-10 place-items-center rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#0c0c10]/80 text-slate-700 dark:text-white hover:border-accent hover:text-slate-950 dark:hover:text-accent transition-all shadow-sm active:scale-95"
              onClick={() => scroll("left")}
              type="button"
            >
              ←
            </button>
            <button
              aria-label="Desplazar a la derecha"
              className="grid size-10 place-items-center rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#0c0c10]/80 text-slate-700 dark:text-white hover:border-accent hover:text-slate-950 dark:hover:text-accent transition-all shadow-sm active:scale-95"
              onClick={() => scroll("right")}
              type="button"
            >
              →
            </button>
          </div>
        </div>
      </div>

      {/* Live Scroll Progress Bar */}
      <div className="mb-6 h-1.5 w-full rounded-full bg-slate-200 dark:bg-white/10 overflow-hidden">
        <div
          className="h-full bg-accent dark:bg-accent transition-all duration-300 rounded-full"
          style={{ width: `${Math.max(15, scrollProgress || 25)}%` }}
        />
      </div>

      {/* Carousel Track */}
      <div
        className="flex items-stretch gap-5 overflow-x-auto pb-4 pt-1 scrollbar-none snap-x snap-mandatory"
        onScroll={handleScroll}
        ref={scrollRef}
        style={{ msOverflowStyle: "none", scrollbarWidth: "none" }}
      >
        {filteredProducts.map((related) => {
          const savings = related.maxPrice > related.minPrice ? related.maxPrice - related.minPrice : 0;
          return (
            <Link
              className="group relative flex w-[280px] sm:w-[320px] shrink-0 snap-start flex-col justify-between rounded-2xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#0c0c10]/90 p-5 shadow-lg dark:shadow-none backdrop-blur-xl transition-all duration-300 hover:-translate-y-2 hover:border-slate-300 dark:hover:border-accent/60 hover:shadow-2xl dark:hover:shadow-[0_20px_45px_rgba(0,0,0,0.8),0_0_25px_rgba(192,255,0,0.2)]"
              href={productPath(related.brandKey, related.modelSlug)}
              key={related.id}
            >
              {/* Radial Hover Glow Background */}
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(192,255,0,0.12),transparent_60%)] opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none rounded-2xl" />

              <div>
                {/* Image Stage */}
                <div className="relative grid h-48 w-full place-items-center overflow-hidden rounded-xl bg-slate-100 dark:bg-white/[0.04] p-2 border border-slate-200/60 dark:border-white/10 transition-colors group-hover:bg-slate-200/50 dark:group-hover:bg-white/[0.08] mb-4">
                  <div className="relative size-full rounded-lg bg-white dark:bg-white/[0.95] overflow-hidden p-2 flex items-center justify-center shadow-inner">
                    {related.imageUrl ? (
                      <Image
                        alt={related.name}
                        className="object-contain p-2 transition-transform duration-500 group-hover:scale-110 mix-blend-multiply"
                        fill
                        sizes="320px"
                        src={related.imageUrl}
                        unoptimized
                      />
                    ) : (
                      <div className="grid size-full place-items-center bg-[radial-gradient(circle,#C0FF00,transparent_62%)] text-4xl font-black text-slate-900 dark:text-black opacity-40 font-mono">
                        SW
                      </div>
                    )}
                  </div>

                  {/* Floating Coverage Pill */}
                  <div className="absolute top-3 left-3 z-10 rounded-lg bg-slate-900/90 dark:bg-black/90 px-2.5 py-1 text-[10px] font-mono font-black text-white border border-white/20 backdrop-blur-md shadow-sm">
                    🏆 {related.storeCount} tiendas
                  </div>

                  {/* Savings Tag */}
                  {savings > 0 ? (
                    <div className="absolute bottom-3 right-3 z-10 rounded-lg bg-accent px-2 py-0.5 text-[10px] font-mono font-black text-black shadow-md">
                      -{Math.round((savings / related.maxPrice) * 100)}%
                    </div>
                  ) : null}
                </div>

                {/* Product Title */}
                <h3 className="text-base font-black font-display leading-snug tracking-tight text-slate-900 dark:text-white group-hover:text-slate-950 dark:group-hover:text-[#C0FF00] transition-colors line-clamp-2">
                  {related.name}
                </h3>
              </div>

              {/* Footer Price & Interactive Compare Trigger */}
              <div className="mt-5 pt-3.5 border-t border-slate-200/80 dark:border-white/5 flex items-center justify-between gap-2">
                <div>
                  <span className="block text-[10px] font-mono font-bold uppercase tracking-widest text-slate-500 dark:text-white/40">
                    Desde
                  </span>
                  <span className="text-lg font-black font-mono tracking-tight text-slate-900 dark:text-white">
                    {related.minPrice > 0 ? formatPrice(related.minPrice) : "Sin precio"}
                  </span>
                </div>

                <div className="flex items-center gap-1.5 text-xs font-mono font-black uppercase text-slate-900 dark:text-accent-text group-hover:translate-x-1 transition-transform">
                  <span>Comparar</span>
                  <span className="grid size-7 place-items-center rounded-lg bg-accent text-black font-bold shadow-sm group-hover:bg-accent-hover transition-colors">
                    →
                  </span>
                </div>
              </div>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
