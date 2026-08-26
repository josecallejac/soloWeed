"use client";

import { useState } from "react";
import Image from "next/image";
import { shouldOptimizeImage } from "@/lib/image";

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
  const [failedImageUrls, setFailedImageUrls] = useState<Set<string>>(() => new Set());
  const visibleImages = images.filter((image) => !failedImageUrls.has(image.url));

  const markImageFailed = (url: string) => {
    setFailedImageUrls((current) => {
      if (current.has(url)) return current;
      const next = new Set(current);
      next.add(url);
      return next;
    });
  };

  const safeSelectedIndex = Math.min(selectedIndex, Math.max(visibleImages.length - 1, 0));
  const currentImage = visibleImages[safeSelectedIndex] ?? visibleImages[0];

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
      <div className="relative grid min-h-80 sm:min-h-96 place-items-center overflow-hidden rounded-xl bg-slate-100 dark:bg-white/[0.04] p-3 sm:p-4 group border border-slate-200/80 dark:border-white/10">
        <div className="relative size-full min-h-80 sm:min-h-96 rounded-xl bg-white dark:bg-white/[0.95] overflow-hidden p-4 flex items-center justify-center shadow-inner">
          {currentImage?.url ? (
            <Image
              alt={productName}
              className="object-contain p-4 sm:p-6 transition-transform duration-500 group-hover:scale-105 mix-blend-multiply"
              fill
              priority
              sizes="(max-width: 1024px) 100vw, 45vw"
              src={currentImage.url}
              unoptimized={!shouldOptimizeImage(currentImage.url)}
              onError={() => markImageFailed(currentImage.url)}
            />
          ) : (
            <div className="grid size-full min-h-80 place-items-center text-6xl font-black opacity-40 font-mono">
              SW
            </div>
          )}
        </div>

        {/* Source Badge */}
        {currentImage?.source ? (
          <div className="absolute bottom-5 left-5 z-10 rounded-md bg-slate-900/90 dark:bg-black/90 px-2.5 py-1 text-[11px] font-mono font-bold text-white backdrop-blur-md border border-white/20 shadow-sm">
            {currentImage.source}
          </div>
        ) : null}
      </div>

      {/* Thumbnail Selector Row */}
      {visibleImages.length > 1 && (
        <div className="mt-4 flex items-center gap-3 overflow-x-auto pb-1">
          {visibleImages.map((img, idx) => {
            const isSelected = idx === safeSelectedIndex;
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
                  unoptimized={!shouldOptimizeImage(img.url)}
                  onError={() => markImageFailed(img.url)}
                />
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
