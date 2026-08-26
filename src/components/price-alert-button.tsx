"use client";

import { useId, useState } from "react";
import { useStoredCollection } from "@/hooks/use-stored-collection";
import { trackAnalytics } from "@/lib/analytics";
import { MAX_PRICE_ALERTS, PRICE_ALERTS_COLLECTION, type PriceAlert } from "@/lib/price-alerts";

type PriceAlertButtonProps = {
  item: Omit<PriceAlert, "createdAt">;
  compact?: boolean;
};

export function PriceAlertButton({ item, compact = false }: PriceAlertButtonProps) {
  const { items: alerts, storageError, update } = useStoredCollection(PRICE_ALERTS_COLLECTION);
  const [isEditing, setIsEditing] = useState(false);
  const [target, setTarget] = useState("");
  const [message, setMessage] = useState("");
  const editorId = useId();
  const alert = alerts.find((entry) => entry.productId === item.productId) ?? null;

  function openEditor() {
    setTarget(alert ? String(alert.targetPrice) : item.currentPrice > 0 ? String(Math.round(item.currentPrice * 0.9)) : "");
    setMessage("");
    setIsEditing(true);
  }

  function removeAlert() {
    const result = update((current) => current.filter((entry) => entry.productId !== item.productId));
    if (!result.ok) return;
    setIsEditing(false);
    setMessage("Alerta eliminada.");
    trackAnalytics("alerta-eliminada", { categoria: item.category, producto_id: item.productId });
  }

  function saveAlert(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const targetPrice = Number(target);
    if (!Number.isInteger(targetPrice) || targetPrice <= 0) {
      setMessage("Ingresa un precio objetivo válido.");
      return;
    }
    if (!alert && alerts.length >= MAX_PRICE_ALERTS) {
      setMessage(`Puedes guardar hasta ${MAX_PRICE_ALERTS} alertas.`);
      return;
    }

    const nextAlert: PriceAlert = {
      ...item,
      targetPrice,
      createdAt: alert?.createdAt ?? new Date().toISOString(),
    };
    const result = update((current) => [nextAlert, ...current.filter((entry) => entry.productId !== item.productId)]);
    if (!result.ok) return;

    setIsEditing(false);
    setMessage("Alerta guardada en este navegador.");
    trackAnalytics(alert ? "alerta-editada" : "alerta-creada", {
      categoria: item.category,
      producto_id: item.productId,
    });
  }

  const feedback = storageError || message;

  return (
    <div className="relative">
      <button
        aria-controls={editorId}
        aria-expanded={isEditing}
        aria-label={alert ? `Editar alerta de precio para ${item.title}` : `Crear alerta de precio para ${item.title}`}
        className={compact
          ? "inline-flex items-center gap-2 rounded-xl border border-slate-300 bg-white/80 px-3 py-2 text-xs font-black uppercase tracking-wider text-slate-700 transition hover:border-accent hover:text-slate-950 dark:border-white/15 dark:bg-white/5 dark:text-white/75 dark:hover:text-accent-text"
          : "rounded-xl border border-slate-300 px-3 py-2 text-xs font-black uppercase tracking-wider text-slate-700 dark:border-white/15 dark:text-white/75"}
        onClick={openEditor}
        type="button"
      >
        <svg aria-hidden="true" className="size-4" fill={alert ? "currentColor" : "none"} viewBox="0 0 24 24">
          <path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9ZM10 21h4" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" />
        </svg>
        {alert ? "Alerta activa" : "Avisarme"}
      </button>
      {isEditing ? (
        <form
          aria-label={`Configurar alerta para ${item.title}`}
          className="absolute right-0 top-[calc(100%+0.5rem)] z-40 w-64 rounded-2xl border border-slate-200 bg-white p-4 shadow-2xl dark:border-white/10 dark:bg-[#101016]"
          id={editorId}
          onKeyDown={(event) => {
            if (event.key === "Escape") {
              event.preventDefault();
              setIsEditing(false);
            }
          }}
          onSubmit={saveAlert}
          role="dialog"
        >
          <p className="text-xs font-black uppercase tracking-wider text-slate-700 dark:text-white/75">Avisarme bajo</p>
          <label className="mt-3 block">
            <span className="sr-only">Precio objetivo</span>
            <input autoFocus className="w-full rounded-xl border border-slate-300 bg-slate-50 px-3 py-2 font-mono text-sm font-black outline-none focus:border-accent dark:border-white/15 dark:bg-white/5 dark:text-white" min="1" onChange={(event) => setTarget(event.target.value)} placeholder="Ej. 19.990" step="1" type="number" value={target} />
          </label>
          <p className="mt-2 text-[11px] leading-4 text-slate-500 dark:text-white/45">Es una alerta local: se revisa cuando vuelves a abrir SoloWeed.</p>
          <div className="mt-3 flex justify-end gap-2">
            {alert ? <button className="mr-auto rounded-lg px-2.5 py-1.5 text-[10px] font-black uppercase tracking-wider text-red-600 dark:text-red-300" onClick={removeAlert} type="button">Eliminar</button> : null}
            <button className="rounded-lg px-2.5 py-1.5 text-[10px] font-black uppercase tracking-wider text-slate-500" onClick={() => setIsEditing(false)} type="button">Cancelar</button>
            <button className="rounded-lg bg-accent px-2.5 py-1.5 text-[10px] font-black uppercase tracking-wider text-[#070709]" type="submit">Guardar</button>
          </div>
          {feedback ? <p aria-live="polite" className="mt-2 text-[11px] font-bold text-red-600 dark:text-red-300">{feedback}</p> : null}
        </form>
      ) : feedback ? <p aria-live="polite" className="absolute right-0 top-[calc(100%+0.5rem)] z-30 whitespace-nowrap rounded-lg bg-slate-900 px-3 py-2 text-[11px] font-bold text-white shadow-lg dark:bg-white dark:text-slate-900">{feedback}</p> : null}
    </div>
  );
}
