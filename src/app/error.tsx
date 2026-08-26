"use client";

import Link from "next/link";

export default function ErrorPage({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <main className="grid min-h-[75vh] place-items-center px-5 py-16">
      <section className="w-full max-w-xl rounded-3xl border border-slate-200 bg-white/90 p-8 text-center shadow-xl dark:border-white/10 dark:bg-[#0c0c10]/90 sm:p-10" role="alert">
        <p className="font-mono text-[11px] font-black uppercase tracking-[0.24em] text-accent-text">Interrupción temporal</p>
        <h1 className="mt-4 text-3xl font-black tracking-tight text-slate-950 dark:text-white">No pudimos cargar esta vista</h1>
        <p className="mx-auto mt-4 max-w-md text-sm leading-6 text-slate-600 dark:text-white/55">Tus datos guardados en este navegador siguen intactos. Puedes reintentar ahora o volver al catálogo.</p>
        <div className="mt-7 flex flex-wrap justify-center gap-3">
          <button className="rounded-xl bg-accent px-5 py-3 text-xs font-black uppercase tracking-wider text-[#070709]" onClick={reset} type="button">Reintentar</button>
          <Link className="rounded-xl border border-slate-300 px-5 py-3 text-xs font-black uppercase tracking-wider text-slate-700 hover:border-accent dark:border-white/15 dark:text-white/75" href="/">Volver al inicio</Link>
        </div>
      </section>
    </main>
  );
}
