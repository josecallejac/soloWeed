"use client";

import { useLayoutEffect, useRef, useState } from "react";

type ProductDescriptionProps = {
  description: string;
};

export function ProductDescription({ description }: ProductDescriptionProps) {
  const [expanded, setExpanded] = useState(false);
  const [isOverflowing, setIsOverflowing] = useState(false);
  const textRef = useRef<HTMLParagraphElement>(null);

  // Solo mostramos "Ver mas" cuando el texto realmente se desborda del clamp;
  // se recalcula en cada render por si cambia la variante/descripcion.
  useLayoutEffect(() => {
    const el = textRef.current;
    if (!el) return;
    setIsOverflowing(el.scrollHeight > el.clientHeight + 1);
  }, [description]);

  return (
    <div className="mt-5 max-w-2xl">
      <p
        ref={textRef}
        className={`text-base leading-7 text-zinc-600 dark:text-white/70 sm:text-lg transition-colors ${
          expanded ? "" : "line-clamp-3"
        }`}
      >
        {description}
      </p>
      {(isOverflowing || expanded) && (
        <button
          type="button"
          onClick={() => setExpanded((prev) => !prev)}
          className="mt-2 text-sm font-bold uppercase tracking-[0.14em] text-zinc-500 hover:text-black dark:text-white/50 dark:hover:text-white font-mono transition-colors"
        >
          {expanded ? "Ver menos" : "Ver mas"}
        </button>
      )}
    </div>
  );
}
