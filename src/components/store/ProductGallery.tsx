import React from "react";
import { cn } from "@/lib/utils";
import type { ProductImage } from "@/types";

export function ProductGallery({
  images,
  activeIndex,
  setActiveIndex,
  className,
}: {
  images: ProductImage[];
  activeIndex: number;
  setActiveIndex: (i: number) => void;
  className?: string;
}) {
  const current = images[Math.min(activeIndex, images.length - 1)];
  return (
    <div className={cn("space-y-3", className)}>
      <div className="flex items-center justify-center">
        <div className="overflow-hidden rounded-xl border border-border bg-surface max-w-[640px] w-full">
          <img
            src={current?.url}
            alt={current?.alt}
            className="mx-auto h-[480px] w-full object-contain"
          />
        </div>
      </div>

      <div className="mt-2 flex items-center justify-center gap-3">
        {images.map((img, i) => (
          <button
            key={img.id}
            onClick={() => setActiveIndex(i)}
            aria-label={`Image ${i + 1}`}
            className={cn(
              "h-20 w-20 overflow-hidden rounded-lg border-2 bg-surface",
              i === Math.min(activeIndex, images.length - 1) ? "border-accent-strong" : "border-border",
            )}
          >
            <img src={img.url} alt={img.alt} className="h-full w-full object-cover" />
          </button>
        ))}
      </div>
    </div>
  );
}
