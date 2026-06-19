import Link from "next/link";
import { ThemeToggle } from "./theme-toggle";

type SiteHeaderProps = {
  subtitle: string;
  trailing?: React.ReactNode;
};

export function SiteHeader({ subtitle, trailing }: SiteHeaderProps) {
  return (
    <header className="flex items-center justify-between gap-4">
      <Link className="flex items-center gap-3" href="/">
        <span className="grid size-11 place-items-center rounded bg-[#C0FF00] font-black text-[#09090b] shadow-[0_0_15px_rgba(192,255,0,0.5)] font-mono">
          SW
        </span>
        <span>
          <span className="block text-xl font-black tracking-tight text-zinc-900 dark:text-white">SoloWeed</span>
          <span className="block text-xs uppercase tracking-[0.35em] text-[#C0FF00] font-mono">
            {subtitle}
          </span>
        </span>
      </Link>
      <div className="flex items-center gap-3">
        {trailing ?? (
          <span className="rounded border border-black/20 dark:border-white/20 bg-black/5 dark:bg-white/5 px-3 py-1 text-xs font-bold uppercase tracking-[0.22em] text-zinc-600 dark:text-white/75 font-mono">
            +18
          </span>
        )}
        <ThemeToggle />
      </div>
    </header>
  );
}

export function BackLink() {
  return (
    <Link
      className="rounded border border-black/20 dark:border-white/20 bg-black/5 dark:bg-white/5 px-4 py-2 text-xs font-black uppercase tracking-[0.2em] text-zinc-700 dark:text-white/80 transition hover:border-[#C0FF00] hover:text-[#C0FF00] hover:bg-[#C0FF00]/10 font-mono"
      href="/"
    >
      Volver
    </Link>
  );
}
