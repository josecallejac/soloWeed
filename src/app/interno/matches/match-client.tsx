"use client";

/* eslint-disable @next/next/no-img-element */
import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { approveMatch, batchApproveMatches, batchRejectMatches, rejectMatch, resetMatch } from "./actions";

type OfferInfo = {
  brand: string | null;
  brandKey: string | null;
  id: number;
  imageUrl: string | null;
  modelSlug: string | null;
  price: number;
  productBrandKey: string | null;
  productId: number | null;
  storeName: string;
  title: string;
  url: string;
};

type SuggestionRow = {
  candidate: OfferInfo;
  reasons: string[];
  score: number;
  seed: OfferInfo;
};

type Props = {
  page: number;
  pageSize: number;
  selectedStatus: string;
  suggestions: SuggestionRow[];
  totalCount: number;
};

export function MatchSuggestionsClient({ page, pageSize, selectedStatus, suggestions, totalCount }: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [checked, setChecked] = useState<Set<string>>(new Set());
  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));
  const isPending = selectedStatus === "pending";
  const allCurrentChecked = suggestions.length > 0 && suggestions.every((s) => checked.has(key(s)));

  function toggle(keyStr: string) {
    setChecked((prev) => {
      const next = new Set(prev);

      if (next.has(keyStr)) {
        next.delete(keyStr);
      } else {
        next.add(keyStr);
      }

      return next;
    });
  }

  function toggleAllCurrent() {
    setChecked((prev) => {
      const next = new Set(prev);

      if (allCurrentChecked) {
        for (const s of suggestions) next.delete(key(s));
      } else {
        for (const s of suggestions) next.add(key(s));
      }

      return next;
    });
  }

  function navigate(newPage: number) {
    const params = new URLSearchParams(searchParams.toString());

    params.set("page", String(newPage));
    router.push(`/interno/matches?${params.toString()}`);
  }

  return (
    <>
      <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm font-bold text-black/45">
          Página {page} de {totalPages} · {totalCount} sugerencias en total
        </p>
        <div className="flex flex-wrap items-center gap-2">
          <label className="flex cursor-pointer items-center gap-2 rounded-2xl border border-black/10 px-4 py-2 text-xs font-black uppercase tracking-[0.14em] text-black/55">
            <input checked={allCurrentChecked} className="size-4 accent-[#bddf57]" onChange={toggleAllCurrent} type="checkbox" />
            Todas ({suggestions.length})
          </label>
          {checked.size > 0 ? (
            <div className="flex flex-wrap items-center gap-2">
              {isPending ? (
                <>
                  <form action={batchApproveMatches}>
                    <input name="pairs" type="hidden" value={[...checked].join(",")} />
                    <button className="rounded-2xl bg-[#bddf57] px-4 py-2 text-xs font-black uppercase tracking-[0.14em] text-[#17150f]">
                      Aprobar {checked.size}
                    </button>
                  </form>
                  <form action={batchRejectMatches}>
                    <input name="pairs" type="hidden" value={[...checked].join(",")} />
                    <button className="rounded-2xl bg-[#17150f] px-4 py-2 text-xs font-black uppercase tracking-[0.14em] text-[#f8f4df]">
                      Rechazar {checked.size}
                    </button>
                  </form>
                </>
              ) : (
                <form action={batchRejectMatches}>
                  <input name="pairs" type="hidden" value={[...checked].join(",")} />
                  <button className="rounded-2xl bg-[#17150f] px-4 py-2 text-xs font-black uppercase tracking-[0.14em] text-[#f8f4df]">
                    Rechazar {checked.size}
                  </button>
                </form>
              )}
            </div>
          ) : null}
        </div>
      </div>

      {suggestions.length > 0 ? (
        <section className="mt-3 grid gap-4">
          {suggestions.map((suggestion) => {
            const suggestionKey = key(suggestion);
            const isChecked = checked.has(suggestionKey);

            return (
              <article className="grid gap-4 rounded-[2rem] border border-black/10 bg-white p-5 shadow-sm lg:grid-cols-[auto_1fr_1fr_220px]" key={suggestionKey}>
                <div className="flex items-start pt-1">
                  <input
                    checked={isChecked}
                    className="size-5 accent-[#bddf57]"
                    onChange={() => toggle(suggestionKey)}
                    type="checkbox"
                  />
                </div>
                <OfferBlockClient label="Producto base" offer={suggestion.seed} />
                <OfferBlockClient label="Candidato" offer={suggestion.candidate} />
                <div className="flex flex-col justify-between gap-4 rounded-[1.5rem] bg-[#f4f1e8] p-4">
                  <div>
                    <p className="text-xs font-black uppercase tracking-[0.18em] text-black/45">Score</p>
                    <p className="mt-1 text-4xl font-black tracking-[-0.06em]">{Math.round(suggestion.score * 100)}%</p>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {suggestion.reasons.map((reason) => (
                        <span className="rounded-full bg-black/5 px-3 py-1 text-xs font-bold text-black/60" key={reason}>
                          {reason}
                        </span>
                      ))}
                    </div>
                  </div>
                  {isPending ? (
                    <div className="grid gap-2">
                      <SingleActionButton action="approve" seedId={suggestion.seed.id} candidateId={suggestion.candidate.id} />
                      <SingleActionButton action="reject" seedId={suggestion.seed.id} candidateId={suggestion.candidate.id} />
                    </div>
                  ) : (
                    <SingleActionButton action="reset" seedId={suggestion.seed.id} candidateId={suggestion.candidate.id} />
                  )}
                </div>
              </article>
            );
          })}
        </section>
      ) : (
        <div className="mt-8 rounded-[2rem] border border-dashed border-black/20 bg-white p-10 text-center">
          <h2 className="text-2xl font-black">No hay matches para revisar</h2>
          <p className="mt-3 text-sm text-black/55">Cambia filtros o vuelve a correr el reporte despues de actualizar datos.</p>
        </div>
      )}

      {totalPages > 1 ? (
        <nav className="mt-6 flex flex-wrap items-center justify-center gap-2">
          {page > 1 ? (
            <button className="rounded-2xl border border-black/10 px-4 py-2 text-sm font-black" onClick={() => navigate(page - 1)}>
              &larr; Anterior
            </button>
          ) : null}
          {getPageNumbers(page, totalPages).map((pageNum) =>
            pageNum === "..." ? (
              <span className="px-2 text-sm text-black/30" key={`ellipsis-${pageNum}`}>
                ...
              </span>
            ) : (
              <button
                className={`min-w-10 rounded-2xl px-3 py-2 text-sm font-black ${pageNum === page ? "bg-[#bddf57] text-[#17150f]" : "border border-black/10"}`}
                key={pageNum}
                onClick={() => navigate(pageNum)}
              >
                {pageNum}
              </button>
            ),
          )}
          {page < totalPages ? (
            <button className="rounded-2xl border border-black/10 px-4 py-2 text-sm font-black" onClick={() => navigate(page + 1)}>
              Siguiente &rarr;
            </button>
          ) : null}
        </nav>
      ) : null}
    </>
  );
}

function OfferBlockClient({ label, offer }: { label: string; offer: OfferInfo }) {
  const productUrl = offer.productBrandKey && offer.modelSlug
    ? `/productos/${offer.productBrandKey}/${offer.modelSlug}`
    : null;

  return (
    <div className="grid gap-4 sm:grid-cols-[100px_1fr]">
      <div className="min-h-28 overflow-hidden rounded-[1.5rem] bg-[#eee6d0]">
        {offer.imageUrl ? <img alt={offer.title} className="h-full w-full object-contain p-2" src={offer.imageUrl} /> : null}
      </div>
      <div className="min-w-0">
        <p className="text-xs font-black uppercase tracking-[0.18em] text-black/40">{label}</p>
        <h2 className="mt-2 text-lg font-black leading-tight">{offer.title}</h2>
        <p className="mt-2 text-sm text-black/55">{offer.storeName} · {offer.brand ?? "Sin marca"} · {formatNum(offer.price)}</p>
        <p className="mt-1 text-xs font-bold text-black/40">brandKey: {offer.brandKey ?? "sin marca detectada"}</p>
        <p className="mt-2 text-xs text-black/40">Producto #{offer.productId ?? "sin producto"}</p>
        <div className="mt-3 flex flex-wrap items-center gap-3">
          <a className="inline-flex text-xs font-black uppercase tracking-[0.16em] text-[#7f5af0]" href={offer.url} rel="noreferrer" target="_blank">
            Ver tienda &rarr;
          </a>
          {productUrl ? (
            <a className="inline-flex text-xs font-black uppercase tracking-[0.16em] text-[#17150f]" href={productUrl}>
              Ver comparador &rarr;
            </a>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function SingleActionButton({ action, seedId, candidateId }: { action: string; seedId: number; candidateId: number }) {
  const label = action === "approve" ? "Aprobar" : action === "reject" ? "Rechazar" : "Deshacer decision";
  const bg = action === "approve" ? "bg-[#bddf57]" : action === "reject" ? "bg-[#17150f] text-[#f8f4df]" : "bg-[#7f5af0] text-white";
  const serverAction = action === "approve" ? approveMatch : action === "reject" ? rejectMatch : resetMatch;

  return (
    <form action={serverAction}>
      <input name="seedOfferId" type="hidden" value={seedId} />
      <input name="candidateOfferId" type="hidden" value={candidateId} />
      <button className={`w-full rounded-2xl px-4 py-3 text-sm font-black ${bg}`}>{label}</button>
    </form>
  );
}

function key(s: SuggestionRow) {
  return `${s.seed.id}:${s.candidate.id}`;
}

function formatNum(value: number) {
  return new Intl.NumberFormat("es-CL", { currency: "CLP", maximumFractionDigits: 0, style: "currency" }).format(value);
}

function getPageNumbers(current: number, total: number): Array<number | "..."> {
  const pages: Array<number | "..."> = [];

  if (total <= 7) {
    for (let i = 1; i <= total; i += 1) pages.push(i);
    return pages;
  }

  pages.push(1);
  if (current > 3) pages.push("...");

  for (let i = Math.max(2, current - 1); i <= Math.min(total - 1, current + 1); i += 1) {
    pages.push(i);
  }

  if (current < total - 2) pages.push("...");
  pages.push(total);

  return pages;
}
