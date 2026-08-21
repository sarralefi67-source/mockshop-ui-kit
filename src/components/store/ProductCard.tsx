import { Link } from "@tanstack/react-router";
import { Heart, ShoppingCart } from "lucide-react";
import type { Product } from "@/types";
import { discountPercent, isOnSale } from "@/data/products";
import { formatPrice } from "@/lib/placeholder";
import { useStore } from "@/context/StoreContext";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Stars } from "./Stars";

export function ProductCard({ product }: { product: Product }) {
  const { addItem, toggleWishlist, isWishlisted } = useStore();
  const liked = isWishlisted(product.id);
  const outOfStock = product.stock === 0;
  const hasVariants = product.variants.length > 0;
  const mainImage = product.images.find((img) => img.is_main) ?? product.images[0];

  const quickAdd = () => {
    if (outOfStock || hasVariants) return;
    addItem({
      product_id: product.id,
      variant_id: null,
      slug: product.slug,
      name: product.name,
      variant_label: null,
      image: mainImage?.url ?? "",
      unit_price: product.price,
      compare_at_price: product.compare_at_price,
      max_stock: product.stock,
    });
  };

  return (
    <article className="group relative flex flex-col overflow-hidden rounded-xl border border-border bg-card transition-shadow hover:shadow-card">
      <div className="absolute left-3 top-3 z-10 flex flex-col gap-1">
        {isOnSale(product) && (
          <span className="rounded bg-accent-strong px-2 py-0.5 text-[11px] font-bold text-accent-strong-foreground">
            -{discountPercent(product)}%
          </span>
        )}
        {product.is_new && (
          <span className="rounded bg-foreground px-2 py-0.5 text-[11px] font-bold text-background">
            Nouveau
          </span>
        )}
        {outOfStock && (
          <span className="rounded bg-muted px-2 py-0.5 text-[11px] font-bold text-muted-foreground">
            Rupture
          </span>
        )}
      </div>

      <button
        type="button"
        aria-label={liked ? "Retirer des favoris" : "Ajouter aux favoris"}
        onClick={() => toggleWishlist(product.id)}
        className="absolute right-3 top-3 z-10 grid h-8 w-8 place-items-center rounded-full bg-card/90 text-muted-foreground shadow-sm transition-colors hover:text-accent-strong"
      >
        <Heart className={cn("h-4 w-4", liked && "fill-accent-strong text-accent-strong")} />
      </button>

      <Link
        to="/produit/$slug"
        params={{ slug: product.slug }}
        className="block aspect-square overflow-hidden bg-surface"
      >
        <img
          src={mainImage?.url}
          alt={mainImage?.alt ?? product.name}
          loading="lazy"
          className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
        />
      </Link>

      <div className="flex flex-1 flex-col p-4">
        <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
          {product.brand}
        </p>
        <Link
          to="/produit/$slug"
          params={{ slug: product.slug }}
          className="mt-1 line-clamp-2 text-sm font-semibold leading-snug hover:text-accent-strong"
        >
          {product.name}
        </Link>

        <div className="mt-2 flex items-center gap-1.5">
          <Stars value={product.rating} />
          <span className="text-xs text-muted-foreground">({product.reviews_count})</span>
        </div>

        <div className="mt-3 flex items-baseline gap-2">
          <span
            className={cn(
              "text-lg font-bold",
              isOnSale(product) ? "text-accent-strong" : "text-foreground",
            )}
          >
            {formatPrice(product.price)}
          </span>
          {isOnSale(product) && (
            <span className="text-sm text-muted-foreground line-through">
              {formatPrice(product.compare_at_price!)}
            </span>
          )}
        </div>

        <div className="mt-4 flex gap-2">
          {hasVariants && !outOfStock ? (
            <Button variant="accent" className="flex-1" size="sm" asChild>
              <Link to="/produit/$slug" params={{ slug: product.slug }}>
                <ShoppingCart className="h-4 w-4" />
                Choisir
              </Link>
            </Button>
          ) : (
            <Button
              variant="accent"
              className="flex-1"
              size="sm"
              disabled={outOfStock}
              onClick={quickAdd}
            >
              <ShoppingCart className="h-4 w-4" />
              {outOfStock ? "Indisponible" : "Ajouter"}
            </Button>
          )}
        </div>
      </div>
    </article>
  );
}

export function ProductCardSkeleton() {
  return (
    <div className="overflow-hidden rounded-xl border border-border bg-card">
      <div className="aspect-square animate-pulse bg-surface" />
      <div className="space-y-3 p-4">
        <div className="h-3 w-16 animate-pulse rounded bg-surface" />
        <div className="h-4 w-full animate-pulse rounded bg-surface" />
        <div className="h-4 w-2/3 animate-pulse rounded bg-surface" />
        <div className="h-8 w-full animate-pulse rounded bg-surface" />
      </div>
    </div>
  );
}
