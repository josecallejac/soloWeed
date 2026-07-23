"use client";

import { useLayoutEffect, useRef, useState } from "react";

type ProductDescriptionProps = {
  // Resumen breve generado (1 frase). Si existe, se muestra por defecto.
  short?: string | null;
  // Descripcion completa (copy de la oferta). Se revela con "Ver mas".
  full: string;
};

export function ProductDescription({ short, full }: ProductDescriptionProps) {
  const [expanded, setExpanded] = useState(false);
  const [isOverflowing, setIsOverflowing] = useState(false);
  const textRef = useRef<HTMLParagraphElement>(null);

  const hasShort = Boolean(short && short.trim());
  const hasFull = full.trim().length > 0;

  // En modo fallback (sin resumen) medimos si el clamp de 3 lineas desborda,
  // para mostrar el boton solo cuando hay texto oculto.
  useLayoutEffect(() => {
    if (hasShort) return;
    const el = textRef.current;
    if (!el) return;
    setIsOverflowing(el.scrollHeight > el.clientHeight + 1);
  }, [hasShort, full]);

  // Con resumen: se ve la frase corta; "Ver mas" revela el texto completo.
  // Sin resumen: comportamiento previo, clamp del texto completo a 3 lineas.
  const visibleText = hasShort ? (expanded ? full : (short as string)) : full;
  const clampFallback = !hasShort && !expanded;
  const showButton = hasShort ? hasFull : isOverflowing || expanded;

  return (
    <div className="mt-5 max-w-2xl">
      <p
        ref={textRef}
        className={`text-base sm:text-lg leading-relaxed font-sans text-slate-700 dark:text-white/75 transition-colors ${
          clampFallback ? "line-clamp-3" : ""
        }`}
      >
        {visibleText}
      </p>
      {showButton && (
        <button
          type="button"
          onClick={() => setExpanded((prev) => !prev)}
          className="mt-2 text-xs font-bold uppercase tracking-wider text-slate-500 hover:text-slate-950 dark:text-white/50 dark:hover:text-accent font-mono transition-colors"
        >
          {expanded ? "Ver menos" : "Ver mas"}
        </button>
      )}
    </div>
  );
}
