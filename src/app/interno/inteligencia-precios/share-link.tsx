"use client";

import { useState } from "react";

export function ShareLink({ url }: { url: string }) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <input
        className="min-w-0 flex-1 rounded-2xl border border-black/10 bg-[#f4f1e8] px-4 py-3 text-sm font-bold text-black/70"
        readOnly
        value={url}
        onFocus={(event) => event.currentTarget.select()}
      />
      <button
        className="rounded-2xl bg-[#17150f] px-5 py-3 text-xs font-black uppercase tracking-[0.16em] text-[#bddf57] transition hover:bg-black"
        onClick={copy}
        type="button"
      >
        {copied ? "Copiado" : "Copiar"}
      </button>
    </div>
  );
}
