import React from "react";
import { Stars } from "./Stars";
import { formatPrice } from "@/lib/placeholder";
import type { Product, ProductAttribute } from "@/types";
import { isOnSale, discountPercent } from "@/data/products";
import { cn } from "@/lib/utils";

export function ProductDetails({
  product,
  sku,
  variantLabel,
  attributes,
  onSelectAttribute,
}: {
  product: Product;
  sku?: string | null;
  variantLabel: string;
  attributes: ProductAttribute[];
  onSelectAttribute?: (attrCode: string, valueId: string) => void;
}) {
  return (
    <div>
      <div className="relative">
        <div className="absolute left-0 -top-6 z-10 flex flex-col gap-1">
          {isOnSale(product) && (
            <span className="rounded bg-destructive px-2 py-0.5 text-[11px] font-bold text-destructive-foreground">
              -{discountPercent(product)}%
            </span>
          )}
          {product.is_new && (
            <span className="rounded bg-foreground px-2 py-0.5 text-[11px] font-bold text-background">
              Nouveau
            </span>
          )}
          {product.stock === 0 && (
            <span className="rounded bg-muted px-2 py-0.5 text-[11px] font-bold text-muted-foreground">
              Rupture
            </span>
          )}
        </div>
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{product.brand}</p>
        {sku && <p className="text-xs text-muted-foreground">Réf. {sku}</p>}
        <h1 className="mt-2 text-3xl font-extrabold leading-tight">{product.name}</h1>
      </div>

      <div className="mt-3 flex items-center gap-2">
        <Stars value={product.rating} />
        <span className="text-sm text-muted-foreground">{product.rating.toFixed(1)} · {product.reviews_count} avis</span>
      </div>

      <p className="mt-4 text-muted-foreground">{product.short_description}</p>

      <div className="mt-6 flex items-baseline gap-3">
        <span className={"text-3xl font-extrabold " + (isOnSale(product) ? "text-destructive" : "")}>{formatPrice(product.price)}</span>
        {product.compare_at_price && (
          <span className="text-lg text-muted-foreground line-through">{formatPrice(product.compare_at_price)}</span>
        )}
      </div>

      <div className="mt-6">
        {attributes.map((attr) => (
          <div key={attr.id} className="mt-4">
            <p className="text-sm font-semibold">{attr.name}:</p>
            <div className="mt-2 flex flex-wrap gap-2">
              {attr.values.map((value) => (
                <button
                  key={value.id}
                  onClick={() => onSelectAttribute?.(attr.code, value.id)}
                  className={cn(
                    "rounded-md border transition hover:border-muted-foreground",
                    attr.type === "image" ? "grid h-11 w-11 place-items-center p-0" : "min-w-16 px-4 py-2 text-sm font-medium"
                  )}
                >
                  {attr.type === "swatch" ? (
                    <span className="inline-flex items-center gap-2">
                      <span className="h-5 w-5 rounded-full border" style={{ backgroundColor: value.hex }} />
                      <span>{value.label}</span>
                    </span>
                  ) : attr.type === "image" ? (
                    <img
                      src={value.image_url || value.label}
                      alt={value.label}
                      className="h-8 w-8 rounded-full border border-border object-cover"
                    />
                  ) : (
                    <span>{value.label}</span>
                  )}
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>

      {variantLabel && (
        <div className="mt-4 text-sm text-muted-foreground">Sélection: {variantLabel}</div>
      )}
    </div>
  );
}
