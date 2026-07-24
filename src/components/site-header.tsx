import Link from "next/link";
import { ThemeToggle } from "./theme-toggle";

type SiteHeaderProps = {
  subtitle: string;
  trailing?: React.ReactNode;
};



export function SiteHeader({ subtitle, trailing }: SiteHeaderProps) {
  return (
    <header className="sticky top-0 z-50 w-full border-b border-black/10 dark:border-white/10 bg-white/80 dark:bg-[#050507]/80 backdrop-blur-md shadow-lg dark:shadow-[0_10px_30px_rgba(0,0,0,0.8)] transition-all">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <Link className="flex items-center gap-3.5 group" href="/">
          <span className="grid size-10 place-items-center rounded-xl bg-[#C0FF00] font-mono text-base font-black text-[#050507] shadow-[0_0_20px_rgba(192,255,0,0.4)] transition-transform group-hover:scale-105">
            SW
          </span>
          <span>
            <span className="block text-xl font-black tracking-tight text-[#050507] dark:text-white font-display">SoloWeed</span>
            <span className="block text-xs uppercase tracking-[0.35em] text-[#a3e635] font-mono font-bold">
              {subtitle}
            </span>
          </span>
        </Link>

        <div className="flex items-center gap-3">
          {trailing ?? (
            <span className="glass-badge rounded-full border border-black/15 dark:border-white/15 bg-black/5 dark:bg-white/5 px-3.5 py-1 text-xs font-bold uppercase tracking-[0.22em] text-slate-700 dark:text-white/80 font-mono shadow-sm">
              +18
            </span>
          )}
          <ThemeToggle />
        </div>
      </div>
    </header>
  );
}

export function BackLink() {
  return (
    <Link
      className="glass-badge rounded-xl border border-black/20 dark:border-white/20 bg-black/5 dark:bg-white/5 px-4 py-2 text-xs font-black uppercase tracking-[0.2em] text-zinc-700 dark:text-white/80 transition hover:border-accent hover:text-accent-text hover:bg-accent/10 font-mono"
      href="/"
    >
      Volver
    </Link>
  );
}
