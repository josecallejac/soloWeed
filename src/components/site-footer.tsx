export function SiteFooter() {
  return (
    <footer className="relative border-t border-black/10 dark:border-white/10 bg-zinc-50 dark:bg-[#09090b] px-5 py-12 transition-colors duration-300 overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(192,255,0,0.05),transparent_50%)] pointer-events-none" />
      <div className="relative mx-auto max-w-7xl flex flex-col items-center gap-6">
        <div className="flex items-center gap-3">
          <span className="grid size-8 place-items-center rounded bg-accent/20 text-xs font-black text-accent-text font-mono">SW</span>
          <span className="text-sm font-black tracking-tight text-zinc-400 dark:text-white/30">SoloWeed</span>
        </div>
        <div className="h-px w-16 bg-black/10 dark:bg-white/10" />
        <p className="max-w-lg text-center text-xs leading-5 text-zinc-400 dark:text-white/30 font-mono">
          SoloWeed no vende productos. Te ayudamos a comparar alternativas disponibles en tiendas externas para mayores de edad.
        </p>
        <p className="text-[10px] uppercase tracking-[0.3em] text-zinc-300 dark:text-white/15 font-mono font-bold">
          Comparador independiente · Chile
        </p>
      </div>
    </footer>
  );
}
