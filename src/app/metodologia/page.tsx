import type { Metadata } from "next";
import Link from "next/link";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { mailtoUrl } from "@/lib/contact";

export const metadata: Metadata = {
  title: "Metodología y confianza",
  description: "Cómo recopila, compara y actualiza SoloWeed los precios y la disponibilidad del catálogo.",
  alternates: { canonical: "/metodologia" },
};

export default function MethodologyPage() {
  return (
    <main className="min-h-screen overflow-hidden bg-white text-zinc-900 dark:bg-[#070709] dark:text-[#fafafa]">
      <SiteHeader subtitle="Metodología" />
      <section className="mx-auto w-full max-w-4xl px-5 py-10 sm:px-8 lg:py-16">
        <p className="font-mono text-xs font-black uppercase tracking-[0.24em] text-accent-text">Transparencia</p>
        <h1 className="mt-3 text-4xl font-black tracking-[-0.05em] sm:text-6xl">Cómo funciona SoloWeed</h1>
        <p className="mt-5 max-w-2xl text-base leading-7 text-slate-600 dark:text-white/60">Somos un comparador independiente. No vendemos productos, no procesamos pagos y cada compra termina en la tienda externa que mantiene la oferta.</p>

        <div className="mt-10 space-y-4">
          <MethodologyCard title="De dónde salen los datos" text="Revisamos las páginas públicas de growshops participantes y guardamos el precio, stock, tienda y fecha de observación. La disponibilidad puede cambiar entre una revisión y otra." />
          <MethodologyCard title="Cómo agrupamos productos" text="Las comparaciones públicas usan productos curados con identidad de marca, modelo y variante. Las asociaciones protegidas de varias tiendas no se reevalúan automáticamente; priorizamos precisión sobre cantidad." />
          <MethodologyCard title="Qué significa “verificado”" text="Cada tarjeta muestra cuándo vimos por última vez esa oferta. Una señal fresca indica que la observación está dentro de la ventana operativa del catálogo; no es una garantía de inventario en tiempo real." />
          <MethodologyCard title="Cómo interpretar el ahorro" text="El ahorro compara precios publicados en las tiendas y no incluye despacho, promociones personalizadas, medios de pago ni costos de envío. Confirma siempre las condiciones en la tienda original." />
          <MethodologyCard title="Cómo corregir un dato" text="Si ves un precio, stock, imagen o agrupación incorrecta, envíanos el enlace y una breve explicación. Revisamos las correcciones antes de actualizar el catálogo." action={<a className="mt-4 inline-flex rounded-xl border border-slate-300 px-4 py-2 text-xs font-black uppercase tracking-wider text-slate-700 transition hover:border-accent dark:border-white/15 dark:text-white/75" href={mailtoUrl("Corrección de catálogo SoloWeed")}>Reportar un dato</a>} />
        </div>

        <div className="mt-8 flex flex-wrap gap-3"><Link className="rounded-xl bg-accent px-5 py-3 text-xs font-black uppercase tracking-wider text-[#070709]" href="/">Ver catálogo</Link><Link className="rounded-xl border border-slate-300 px-5 py-3 text-xs font-black uppercase tracking-wider text-slate-700 dark:border-white/15 dark:text-white/75" href="/oportunidades">Ir al radar</Link></div>
      </section>
      <SiteFooter />
    </main>
  );
}

function MethodologyCard({ title, text, action }: { title: string; text: string; action?: React.ReactNode }) {
  return <article className="rounded-3xl border border-slate-200 bg-white/85 p-6 shadow-sm dark:border-white/10 dark:bg-[#0c0c10]/85"><h2 className="text-xl font-black tracking-tight">{title}</h2><p className="mt-3 text-sm leading-7 text-slate-600 dark:text-white/55">{text}</p>{action}</article>;
}
