import Link from "next/link";

type SiteHeaderProps = {
  subtitle: string;
  trailing?: React.ReactNode;
};

export function SiteHeader({ subtitle, trailing }: SiteHeaderProps) {
  return (
    <header className="flex items-center justify-between gap-4">
      <Link className="flex items-center gap-3" href="/">
        <span className="grid size-11 place-items-center rounded-2xl bg-[#bddf57] font-black text-[#17150f] shadow-[5px_5px_0_#000]">
          SW
        </span>
        <span>
          <span className="block text-xl font-black tracking-tight">SoloWeed</span>
          <span className="block text-xs uppercase tracking-[0.35em] text-[#bddf57]">
            {subtitle}
          </span>
        </span>
      </Link>
      {trailing ?? (
        <span className="rounded-full border border-[#f8f4df]/25 px-3 py-1 text-xs font-bold uppercase tracking-[0.22em] text-[#f8f4df]/75">
          +18
        </span>
      )}
    </header>
  );
}

export function BackLink() {
  return (
    <Link
      className="rounded-full border border-[#f8f4df]/20 px-4 py-2 text-xs font-black uppercase tracking-[0.2em] text-[#f8f4df]/80 transition hover:border-[#bddf57] hover:text-[#bddf57]"
      href="/"
    >
      Volver
    </Link>
  );
}
