import { Link } from "@tanstack/react-router";
import { Eye, Heart, ShoppingCart } from "lucide-react";
import type { Product } from "@/types";
import { discountPercent, isOnSale } from "@/data/products";
import { formatPrice } from "@/lib/placeholder";
import { useStore } from "@/context/StoreContext";
import { cn } from "@/lib/utils";
import { Stars } from "./Stars";

export function ProductCard({ product }: { product: Product }) {
  const { addItem, toggleWishlist, isWishlisted } = useStore();
  const liked = isWishlisted(product.id);
  const outOfStock = product.stock === 0;
  const hasVariants = product.variants.length > 0;
  const mainImage = product.images.find((img) => img.is_main) ?? product.images[0];
  // Le thème fait apparaître la 2e photo au survol de la vignette.
  const hoverImage = product.images.find((img) => img.id !== mainImage?.id);

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
    <article className="group relative flex flex-col overflow-hidden rounded-xl border border-border/70 bg-card transition-shadow duration-300 hover:shadow-card">
      <div className="relative overflow-hidden bg-surface">
        <div className="absolute left-2.5 top-2.5 z-10 flex flex-col items-start gap-1.5">
          {isOnSale(product) && (
            <span className="craft-label craft-label-sale">-{discountPercent(product)}%</span>
          )}
          {product.is_new && <span className="craft-label craft-label-new">Nouveau</span>}
          {outOfStock && <span className="craft-label craft-label-muted">Rupture</span>}
        </div>

        <Link
          to="/produit/$slug"
          params={{ slug: product.slug }}
          className="relative block aspect-square"
          aria-label={product.name}
        >
          <img
            src={mainImage?.url}
            alt={mainImage?.alt ?? product.name}
            loading="lazy"
            className={cn(
              "h-full w-full object-cover transition-opacity duration-500",
              hoverImage && "group-hover:opacity-0",
            )}
          />
          {hoverImage && (
            <img
              src={hoverImage.url}
              alt=""
              aria-hidden="true"
              loading="lazy"
              className="absolute inset-0 h-full w-full object-cover opacity-0 transition-opacity duration-500 group-hover:opacity-100"
            />
          )}
        </Link>

        {/* Colonne d'actions rondes, qui glisse depuis la droite au survol */}
        <div className="absolute right-2.5 top-2.5 z-10 flex flex-col gap-2">
          <button
            type="button"
            aria-label={liked ? "Retirer des favoris" : "Ajouter aux favoris"}
            onClick={() => toggleWishlist(product.id)}
            className={cn(
              "grid h-9 w-9 place-items-center rounded-full border border-border bg-card/90 text-foreground shadow-sm transition-all duration-300 hover:border-accent-strong hover:bg-accent-strong hover:text-accent-strong-foreground",
              liked && "border-accent-strong bg-accent-strong text-accent-strong-foreground",
            )}
          >
            <Heart className={cn("h-4 w-4", liked && "fill-current")} />
          </button>
          <Link
            to="/produit/$slug"
            params={{ slug: product.slug }}
            aria-label="Voir le produit"
            className="grid h-9 w-9 translate-x-2 place-items-center rounded-full border border-border bg-card/90 text-foreground shadow-sm opacity-0 transition-all duration-300 hover:border-accent-strong hover:bg-accent-strong hover:text-accent-strong-foreground group-hover:translate-x-0 group-hover:opacity-100"
          >
            <Eye className="h-4 w-4" />
          </Link>
        </div>
      </div>

      <div className="flex flex-1 flex-col p-4">
        <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-muted-foreground">
          {product.brand}
        </p>
        <Link
          to="/produit/$slug"
          params={{ slug: product.slug }}
          className="mt-1.5 line-clamp-2 font-display text-base font-semibold leading-6 text-foreground transition-colors hover:text-accent-strong"
        >
          {product.name}
        </Link>

        <div className="mt-2 flex items-center gap-1.5">
          <Stars value={product.rating} />
          <span className="text-xs text-muted-foreground">({product.reviews_count})</span>
        </div>

        <div className="mt-2 flex items-baseline gap-2">
          <span className="font-display text-lg font-semibold text-accent-strong">
            {formatPrice(product.price)}
          </span>
          {isOnSale(product) && (
            <span className="text-sm text-muted-foreground line-through">
              {formatPrice(product.compare_at_price!)}
            </span>
          )}
        </div>

        <div className="mt-4">
          {hasVariants && !outOfStock ? (
            <Link
              to="/produit/$slug"
              params={{ slug: product.slug }}
              className="flex h-10 w-full items-center justify-center gap-2 rounded-md bg-accent text-xs font-bold uppercase tracking-[0.1em] text-accent-foreground transition-colors hover:bg-accent-strong hover:text-accent-strong-foreground"
            >
              <ShoppingCart className="h-4 w-4" />
              Choisir
            </Link>
          ) : (
            <button
              type="button"
              disabled={outOfStock}
              onClick={quickAdd}
              className="flex h-10 w-full items-center justify-center gap-2 rounded-md bg-accent text-xs font-bold uppercase tracking-[0.1em] text-accent-foreground transition-colors hover:bg-accent-strong hover:text-accent-strong-foreground disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:bg-accent disabled:hover:text-accent-foreground"
            >
              <ShoppingCart className="h-4 w-4" />
              {outOfStock ? "Indisponible" : "Ajouter"}
            </button>
          )}
        </div>
      </div>
    </article>
  );
}

export function ProductCardSkeleton() {
  return (
    <div className="overflow-hidden rounded-xl border border-border/70 bg-card">
      <div className="aspect-square animate-pulse bg-surface" />
      <div className="space-y-3 p-4">
        <div className="h-3 w-16 animate-pulse rounded bg-surface" />
        <div className="h-4 w-full animate-pulse rounded bg-surface" />
        <div className="h-4 w-2/3 animate-pulse rounded bg-surface" />
        <div className="h-10 w-full animate-pulse rounded-md bg-surface" />
      </div>
    </div>
  );
}
