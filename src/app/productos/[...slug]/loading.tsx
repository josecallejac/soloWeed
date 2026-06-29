import { SiteHeader, BackLink } from "@/components/site-header";
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
    <main className="min-h-screen bg-white dark:bg-[#09090b] text-zinc-900 dark:text-[#fafafa] transition-colors duration-300">
      <style>{`@keyframes shimmer { 100% { transform: translateX(100%); } }`}</style>
      <section className="relative overflow-hidden border-b border-black/10 dark:border-white/10 bg-white dark:bg-[#09090b] text-zinc-900 dark:text-white transition-colors duration-300">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_12%_12%,#C0FF00_0,transparent_20%),radial-gradient(circle_at_78%_18%,#39FF14_0,transparent_20%)] opacity-20 pointer-events-none" />
        <div className="relative mx-auto w-full max-w-7xl px-5 py-6 sm:px-8 lg:px-10">
          <SiteHeader subtitle="Comparador" trailing={<BackLink />} />

          <div className="grid gap-8 py-12 lg:grid-cols-[0.85fr_1.15fr] lg:items-end">
            <div className="rounded-xl border border-black/10 dark:border-white/10 bg-zinc-50 dark:bg-[#18181b] p-4 text-zinc-900 dark:text-white shadow-xl dark:shadow-[0_0_30px_rgba(192,255,0,0.1)] transition-colors duration-300">
              <Shimmer className="min-h-80 rounded-lg bg-black/5 dark:bg-white/5" />
            </div>

            <div>
              <div className="flex flex-wrap gap-2">
                <Shimmer className="h-8 w-24 rounded bg-zinc-100 dark:bg-white/10" />
                <Shimmer className="h-8 w-32 rounded bg-zinc-100 dark:bg-white/10" />
              </div>

              <Shimmer className="mt-5 h-20 w-3/4 rounded bg-zinc-100 dark:bg-white/10" />

              <div className="mt-5 space-y-2">
                <Shimmer className="h-6 w-full rounded bg-zinc-100 dark:bg-white/10" />
                <Shimmer className="h-6 w-2/3 rounded bg-zinc-100 dark:bg-white/10" />
              </div>

              <div className="mt-8 grid gap-3 sm:grid-cols-3">
                <Shimmer className="h-24 w-full rounded-xl bg-zinc-100 dark:bg-white/10" />
                <Shimmer className="h-24 w-full rounded-xl bg-zinc-100 dark:bg-white/10" />
                <Shimmer className="h-24 w-full rounded-xl bg-zinc-100 dark:bg-white/10" />
              </div>
            </div>
          </div>
        </div>
      </section>
      
      <section className="mx-auto grid w-full max-w-7xl gap-8 px-5 py-10 sm:px-8 lg:grid-cols-[320px_1fr] lg:px-10">
        <aside className="space-y-5 lg:sticky lg:top-6 lg:self-start">
            <div className="rounded-xl border border-black/10 dark:border-white/10 bg-zinc-50 dark:bg-[#18181b] p-5">
              <Shimmer className="h-6 w-48 bg-zinc-100 dark:bg-white/10 rounded mb-4" />
              <div className="space-y-3">
                {[0, 1, 2, 3].map((i) => (
                  <Shimmer key={i} className="h-16 rounded-lg bg-zinc-100 dark:bg-white/5" />
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
            {Array.from({ length: 4 }).map((_, i) => (
              <Shimmer key={i} className="min-h-48 rounded-2xl bg-zinc-100 dark:bg-white/5" />
            ))}
          </div>
        </section>
      </section>

      <SiteFooter />
    </main>
  );
}
