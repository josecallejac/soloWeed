import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";

function Shimmer({ className }: { className?: string }) {
  return (
    <div className={`relative overflow-hidden ${className ?? ""}`}>
      <div className="absolute inset-0 -translate-x-full animate-[shimmer_2s_infinite] bg-gradient-to-r from-transparent via-white/20 dark:via-white/5 to-transparent" />
    </div>
  );
}

export default function Loading() {
  return (
    <main className="min-h-screen overflow-hidden bg-white dark:bg-[#09090b] text-zinc-900 dark:text-[#fafafa] transition-colors duration-300">
      <style>{`@keyframes shimmer { 100% { transform: translateX(100%); } }`}</style>
      <section className="relative border-b border-black/10 dark:border-white/10 bg-white dark:bg-[#09090b] text-zinc-900 dark:text-white transition-colors duration-300">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,#C0FF00_0,transparent_20%),radial-gradient(circle_at_80%_20%,#39FF14_0,transparent_20%)] opacity-20 pointer-events-none" />
        <div className="relative mx-auto flex min-h-[520px] w-full max-w-7xl flex-col px-5 py-6 sm:px-8 lg:px-10">
          <SiteHeader subtitle="Compara parafernalia" />

          <div className="flex flex-col items-center justify-center py-24 w-full max-w-4xl mx-auto text-center gap-16">
            <div className="w-full">
              <div className="grid gap-3 rounded-3xl border border-black/10 dark:border-white/10 bg-white/60 dark:bg-[#18181b]/60 p-4 shadow-2xl dark:shadow-[0_20px_50px_rgba(0,0,0,0.5)] backdrop-blur-xl md:grid-cols-[1fr_auto]">
                <Shimmer className="min-h-[72px] rounded-2xl border border-black/5 dark:border-white/5 bg-zinc-100 dark:bg-[#09090b]" />
                <Shimmer className="min-h-[72px] w-48 rounded-2xl bg-accent/30" />
              </div>
            </div>

            <div className="w-full">
              <div className="grid grid-cols-3 divide-x divide-black/10 dark:divide-white/10 border-y border-black/10 dark:border-white/10 py-10">
                {[0, 1, 2].map((i) => (
                  <div key={i} className="flex flex-col items-center justify-center px-2 sm:px-6 gap-3">
                    <Shimmer className="h-14 w-20 bg-zinc-100 dark:bg-white/10 rounded-lg" />
                    <Shimmer className="h-3 w-16 bg-zinc-100 dark:bg-white/10 rounded" />
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto grid w-full max-w-7xl gap-8 px-5 py-10 sm:px-8 lg:grid-cols-[280px_1fr] lg:px-10">
        <aside className="space-y-5 lg:sticky lg:top-6 lg:self-start">
          <div className="rounded-xl border border-black/10 dark:border-white/10 bg-white dark:bg-[#18181b] p-5">
            <Shimmer className="h-5 w-28 bg-zinc-100 dark:bg-white/10 rounded mb-4" />
            <div className="space-y-2">
              {[0, 1, 2, 3, 4].map((i) => (
                <Shimmer key={i} className="h-11 rounded-lg bg-zinc-100 dark:bg-white/5" />
              ))}
            </div>
          </div>
          <div className="rounded-xl border border-black/10 dark:border-white/10 bg-white dark:bg-[#18181b] p-5">
            <Shimmer className="h-5 w-20 bg-zinc-100 dark:bg-white/10 rounded mb-4" />
            <div className="space-y-2">
              {[0, 1, 2, 3].map((i) => (
                <Shimmer key={i} className="h-11 rounded-lg bg-zinc-100 dark:bg-white/5" />
              ))}
            </div>
          </div>
        </aside>

        <section>
          <div className="mb-5 flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
            <div>
              <Shimmer className="h-4 w-40 rounded bg-zinc-100 dark:bg-white/10 mb-3" />
              <Shimmer className="h-12 w-80 rounded bg-zinc-100 dark:bg-white/10" />
            </div>
          </div>

          <div className="grid gap-4 xl:grid-cols-2">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="rounded-2xl border border-black/10 dark:border-white/10 bg-white dark:bg-[#18181b] p-4 grid sm:grid-cols-[180px_1fr] gap-5">
                <Shimmer className="min-h-48 rounded-xl bg-zinc-100 dark:bg-white/5" />
                <div className="flex flex-col gap-3 py-2">
                  <div className="flex gap-2">
                    <Shimmer className="h-4 w-20 rounded bg-zinc-100 dark:bg-white/10" />
                    <Shimmer className="h-4 w-14 rounded bg-zinc-100 dark:bg-white/10" />
                  </div>
                  <Shimmer className="h-6 w-3/4 rounded bg-zinc-100 dark:bg-white/10" />
                  <Shimmer className="h-5 w-1/2 rounded bg-zinc-100 dark:bg-white/10" />
                  <div className="mt-auto">
                    <Shimmer className="h-10 w-full rounded-lg bg-zinc-100 dark:bg-white/5" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>
      </section>
      <SiteFooter />
    </main>
  );
}
