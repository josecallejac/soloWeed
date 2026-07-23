"use client";

import { useState } from "react";
import Image from "next/image";

type ImageItem = {
  url: string;
  source: string;
};

type ProductImageGalleryProps = {
  images: ImageItem[];
  productName: string;
};

export function ProductImageGallery({ images, productName }: ProductImageGalleryProps) {
  const [selectedIndex, setSelectedIndex] = useState(0);

  const currentImage = images[selectedIndex] ?? images[0];

  if (!images || images.length === 0) {
    return (
      <div className="rounded-2xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#0c0c10]/80 p-4 text-slate-900 dark:text-white shadow-xl dark:shadow-2xl backdrop-blur-md transition-colors duration-300">
        <div className="grid min-h-80 place-items-center overflow-hidden rounded-xl bg-slate-100 dark:bg-white/5 relative">
          <div className="grid size-full min-h-80 place-items-center bg-[radial-gradient(circle,#C0FF00,transparent_65%)] text-6xl font-black text-slate-900 dark:text-black opacity-40 font-mono">
            SW
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#0c0c10]/80 p-5 text-slate-900 dark:text-white shadow-xl dark:shadow-2xl backdrop-blur-md transition-all duration-300">
      {/* Primary Image Viewport */}
      <div className="relative grid min-h-80 sm:min-h-96 place-items-center overflow-hidden rounded-xl bg-slate-100 dark:bg-white/5 group border border-slate-200/80 dark:border-white/10">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(192,255,0,0.15),transparent_70%)] pointer-events-none" />
        
        {currentImage?.url ? (
          <Image
            alt={productName}
            className="object-contain p-6 transition-transform duration-500 group-hover:scale-105"
            src={currentImage.url}
            fill
            sizes="(max-width: 1024px) 100vw, 45vw"
            priority
            unoptimized
          />
        ) : (
          <div className="grid size-full min-h-80 place-items-center text-6xl font-black opacity-40 font-mono">
            SW
          </div>
        )}

        {/* Source Badge */}
        {currentImage?.source ? (
          <div className="absolute bottom-3 left-3 z-10 rounded-md bg-slate-900/80 dark:bg-[#050507]/80 px-2.5 py-1 text-[11px] font-mono font-bold text-white backdrop-blur-md border border-white/20">
            {currentImage.source}
          </div>
        ) : null}
      </div>

      {/* Thumbnail Selector Row */}
      {images.length > 1 && (
        <div className="mt-4 flex items-center gap-3 overflow-x-auto pb-1">
          {images.map((img, idx) => {
            const isSelected = idx === selectedIndex;
            return (
              <button
                key={`${img.url}-${idx}`}
                type="button"
                onClick={() => setSelectedIndex(idx)}
                className={`relative size-16 shrink-0 overflow-hidden rounded-xl border transition-all ${
                  isSelected
                    ? "border-accent ring-2 ring-accent/50 scale-105 shadow-md dark:shadow-[0_0_15px_rgba(192,255,0,0.35)] bg-slate-100 dark:bg-white/10"
                    : "border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/5 opacity-70 hover:opacity-100 hover:border-slate-300 dark:hover:border-white/30"
                }`}
              >
                <Image
                  alt={`${productName} thumbnail ${idx + 1}`}
                  className="object-contain p-1.5"
                  src={img.url}
                  fill
                  sizes="64px"
                  unoptimized
                />
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
