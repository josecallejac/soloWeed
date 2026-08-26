"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { useStoredCollection } from "@/hooks/use-stored-collection";
import { BASKET_COLLECTION } from "@/lib/basket";
import { FAVORITES_COLLECTION } from "@/lib/favorites";
import { PRICE_ALERTS_COLLECTION } from "@/lib/price-alerts";

const HIDDEN_PREFIXES = ["/interno", "/precios"];

export function MobileNavigation() {
  const pathname = usePathname();
  const { items: favorites } = useStoredCollection(FAVORITES_COLLECTION);
  const { items: basket } = useStoredCollection(BASKET_COLLECTION);
  const { items: alerts } = useStoredCollection(PRICE_ALERTS_COLLECTION);

  if (HIDDEN_PREFIXES.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`))) {
    return null;
  }

  return (
    <>
      <div aria-hidden="true" className="h-[calc(5rem+env(safe-area-inset-bottom))] sm:hidden" />
      <nav aria-label="Navegación móvil" className="fixed inset-x-0 bottom-0 z-50 border-t border-slate-200/90 bg-white/95 px-2 pb-[env(safe-area-inset-bottom)] shadow-[0_-12px_35px_rgba(15,23,42,0.12)] backdrop-blur-xl dark:border-white/10 dark:bg-[#08080c]/95 dark:shadow-[0_-12px_35px_rgba(0,0,0,0.55)] sm:hidden">
        <div className="mx-auto grid min-h-20 max-w-lg grid-cols-5">
          <MobileNavItem active={pathname === "/" || pathname.startsWith("/productos/")} href="/" icon={<HomeIcon />} label="Inicio" />
          <MobileNavItem active={pathname.startsWith("/oportunidades")} href="/oportunidades" icon={<RadarIcon />} label="Radar" />
          <MobileNavItem active={pathname.startsWith("/lista")} count={favorites.length} href="/lista" icon={<HeartIcon />} label="Lista" />
          <MobileNavItem active={pathname.startsWith("/canasta")} count={basket.length} href="/canasta" icon={<BasketIcon />} label="Canasta" />
          <MobileNavItem active={pathname.startsWith("/alertas")} count={alerts.length} href="/alertas" icon={<BellIcon />} label="Alertas" />
        </div>
      </nav>
    </>
  );
}

function MobileNavItem({
  active,
  count,
  href,
  icon,
  label,
}: {
  active: boolean;
  count?: number;
  href: string;
  icon: ReactNode;
  label: string;
}) {
  return (
    <Link
      aria-label={count ? `${label}: ${count}` : label}
      aria-current={active ? "page" : undefined}
      className={`relative flex min-w-0 flex-col items-center justify-center gap-1 rounded-xl px-1 py-2 text-[9px] font-black uppercase tracking-wider transition ${active ? "text-slate-950 dark:text-accent" : "text-slate-500 hover:text-slate-900 dark:text-white/50 dark:hover:text-white"}`}
      href={href}
    >
      <span className={`relative grid size-8 place-items-center rounded-xl transition ${active ? "bg-accent/25" : ""}`}>
        {icon}
        {count ? <span aria-hidden="true" className="absolute -right-1.5 -top-1 min-w-4 rounded-full bg-slate-900 px-1 text-center font-mono text-[8px] leading-4 text-white dark:bg-accent dark:text-[#070709]">{count > 99 ? "99+" : count}</span> : null}
      </span>
      <span className="truncate">{label}</span>
    </Link>
  );
}

function HomeIcon() {
  return <svg aria-hidden="true" className="size-5" fill="none" viewBox="0 0 24 24"><path d="m3 11 9-8 9 8v9a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1v-9Z" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" /></svg>;
}

function RadarIcon() {
  return <svg aria-hidden="true" className="size-5" fill="none" viewBox="0 0 24 24"><path d="M4 19V9m5 10V5m5 14v-7m5 7V3" stroke="currentColor" strokeLinecap="round" strokeWidth="1.8" /></svg>;
}

function HeartIcon() {
  return <svg aria-hidden="true" className="size-5" fill="none" viewBox="0 0 24 24"><path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1.1-1.1a5.5 5.5 0 0 0-7.8 7.8l8.9 8.8 8.8-8.8a5.5 5.5 0 0 0 0-7.8Z" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" /></svg>;
}

function BasketIcon() {
  return <svg aria-hidden="true" className="size-5" fill="none" viewBox="0 0 24 24"><path d="M3 5h2l1.6 10.2a2 2 0 0 0 2 1.7h7.8a2 2 0 0 0 1.9-1.4L20 8H6m4 13h.01M17 21h.01" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" /></svg>;
}

function BellIcon() {
  return <svg aria-hidden="true" className="size-5" fill="none" viewBox="0 0 24 24"><path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9ZM10 21h4" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" /></svg>;
}
