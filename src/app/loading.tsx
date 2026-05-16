export default function Loading() {
  return (
    <main className="min-h-screen bg-[#f4f1e8]">
      <section className="relative border-b border-black/10 bg-[#17150f] text-[#f8f4df]">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,#bddf57_0,transparent_34%),radial-gradient(circle_at_80%_20%,#7f5af0_0,transparent_26%)] opacity-35" />
        <div className="relative mx-auto flex min-h-[520px] w-full max-w-7xl flex-col px-5 py-6 sm:px-8 lg:px-10">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="grid size-11 animate-pulse place-items-center rounded-2xl bg-[#f8f4df]/20 shadow-[5px_5px_0_#000]" />
              <div className="h-6 w-32 animate-pulse rounded-xl bg-[#f8f4df]/15" />
            </div>
          </div>
          <div className="flex-1 py-16 lg:grid lg:grid-cols-[1.1fr_0.9fr]">
            <div>
              <div className="h-8 w-64 animate-pulse rounded-full bg-[#f8f4df]/15" />
              <div className="mt-8 h-24 w-full animate-pulse rounded-3xl bg-[#f8f4df]/10" />
              <div className="mt-6 h-16 w-3/4 animate-pulse rounded-2xl bg-[#f8f4df]/10" />
            </div>
            <div className="mt-10 h-48 animate-pulse rounded-[2.5rem] bg-[#f8f4df]/10 lg:mt-0" />
          </div>
        </div>
      </section>

      <section className="mx-auto grid w-full max-w-7xl gap-8 px-5 py-10 sm:px-8 lg:grid-cols-[280px_1fr] lg:px-10">
        <aside className="space-y-5 lg:sticky lg:top-6 lg:self-start">
          <div className="h-72 animate-pulse rounded-[2rem] bg-black/5" />
          <div className="h-56 animate-pulse rounded-[2rem] bg-black/5" />
          <div className="h-40 animate-pulse rounded-[2rem] bg-black/5" />
        </aside>
        <section>
          <div className="mb-5 h-10 w-48 animate-pulse rounded-2xl bg-black/5" />
          <div className="grid gap-4 xl:grid-cols-2">
            {Array.from({ length: 6 }).map((_, i) => (
              <div className="h-56 animate-pulse rounded-[2rem] bg-black/5" key={i} />
            ))}
          </div>
        </section>
      </section>
    </main>
  );
}
