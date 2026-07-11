"use client";

import { useEffect, useState } from "react";

type FiltersPanelProps = {
  activeCount: number;
  children: React.ReactNode;
};

// En desktop (lg+) los filtros se ven como barra lateral normal; en móvil se
// esconden tras un botón flotante que abre un bottom sheet, para que el
// catálogo quede arriba en vez de bajo una pila de filtros.
export function FiltersPanel({ activeCount, children }: FiltersPanelProps) {
  const [open, setOpen] = useState(false);
  // Oculto al inicio: en el tope de la página el botón tapa la barra de
  // orden/precio; aparece recién cuando el usuario scrollea.
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 120);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    if (!open) return;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  return (
    <>
      {/* Desktop */}
      <div className="hidden space-y-5 lg:block">{children}</div>

      {/* Móvil: botón flotante */}
      <button
        className={`fixed bottom-5 left-1/2 z-40 flex -translate-x-1/2 items-center gap-2 rounded-full bg-accent px-6 py-3.5 text-sm font-black uppercase tracking-[0.15em] text-[#09090b] shadow-[0_10px_30px_rgba(192,255,0,0.4)] transition-[transform,opacity] duration-300 active:scale-95 font-mono lg:hidden ${
          scrolled ? "translate-y-0 opacity-100" : "pointer-events-none translate-y-24 opacity-0"
        }`}
        onClick={() => setOpen(true)}
        type="button"
        aria-hidden={!scrolled}
        tabIndex={scrolled ? 0 : -1}
      >
        Filtros
        {activeCount > 0 ? (
          <span className="grid size-6 place-items-center rounded-full bg-black text-xs font-black text-accent-text">
            {activeCount}
          </span>
        ) : null}
      </button>

      {/* Móvil: bottom sheet */}
      {open ? (
        <div className="fixed inset-0 z-50 lg:hidden" role="dialog" aria-modal="true" aria-label="Filtros">
          <button
            aria-label="Cerrar filtros"
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => setOpen(false)}
            type="button"
          />
          <div className="absolute inset-x-0 bottom-0 flex max-h-[85vh] flex-col rounded-t-3xl border-t border-black/10 dark:border-white/10 bg-white/95 dark:bg-[#121214]/95 backdrop-blur-xl shadow-[0_-20px_60px_rgba(0,0,0,0.4)]">
            <div className="flex items-center justify-between px-5 pb-2 pt-4">
              <span className="mx-auto h-1.5 w-12 rounded-full bg-black/15 dark:bg-white/15" aria-hidden />
            </div>
            <div className="flex items-center justify-between px-5 pb-3">
              <h2 className="text-lg font-black uppercase tracking-widest font-mono text-zinc-900 dark:text-white/90">Filtros</h2>
              <button
                aria-label="Cerrar"
                className="grid size-9 place-items-center rounded-full bg-black/5 dark:bg-white/10 text-lg font-black text-zinc-700 dark:text-white/80 transition-colors hover:bg-black/10 dark:hover:bg-white/20"
                onClick={() => setOpen(false)}
                type="button"
              >
                ✕
              </button>
            </div>
            <div className="min-h-0 flex-1 space-y-5 overflow-y-auto px-5 pb-5">{children}</div>
            <div className="border-t border-black/10 dark:border-white/10 p-4">
              <button
                className="w-full rounded-xl bg-accent px-6 py-3.5 text-sm font-black uppercase tracking-[0.15em] text-[#09090b] transition-transform active:scale-[0.98] font-mono"
                onClick={() => setOpen(false)}
                type="button"
              >
                Ver resultados
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
