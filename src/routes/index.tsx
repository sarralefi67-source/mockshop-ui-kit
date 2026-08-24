import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { ArrowRight, Truck, ShieldCheck, Headphones } from "lucide-react";
import { StoreLayout } from "@/components/store/StoreLayout";
import { ProductCard, ProductCardSkeleton } from "@/components/store/ProductCard";
import { isOnSale } from "@/data/products";
import { buildCategoryTree } from "@/data/categories";
import { fetchActiveBanners, fetchActiveProducts, fetchCategories, type Banner } from "@/lib/catalog";
import type { CategoryNode, Product } from "@/types";
import {
  Carousel, CarouselContent, CarouselItem, CarouselPrevious, CarouselNext,
  type CarouselApi,
} from "@/components/ui/carousel";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Artisanat : Boutique tunisienne" },
      {
        name: "description",
        content:
          "Découvrez l'artisanat tunisien : décoration, poterie, textile et créations locales. Paiement à la livraison partout en Tunisie.",
      },
      { property: "og:title", content: "Artisanat : Boutique tunisienne" },
      {
        property: "og:description",
        content: "Décoration, poterie, textile et créations locales. Paiement à la livraison.",
      },
    ],
  }),
  component: HomePage,
});

function HomePage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [categoryTree, setCategoryTree] = useState<CategoryNode[]>([]);
  const [banners, setBanners] = useState<Banner[]>([]);
  const [loading, setLoading] = useState(true);
  const [carouselApi, setCarouselApi] = useState<CarouselApi>();

  useEffect(() => {
    let mounted = true;
    fetchActiveProducts()
      .then((data) => {
        if (mounted) setProducts(data);
      })
      .catch((err) => {
        console.error("load home products", err);
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });
    fetchCategories()
      .then((data) => {
        if (mounted) setCategoryTree(buildCategoryTree(data));
      })
      .catch((err) => console.error("load home categories", err));
    fetchActiveBanners()
      .then((data) => {
        if (mounted) setBanners(data);
      })
      .catch((err) => console.error("load home banners", err));
    return () => {
      mounted = false;
    };
  }, []);

  // auto-advance the hero carousel every 6s
  useEffect(() => {
    if (!carouselApi || banners.length <= 1) return;
    const id = setInterval(() => {
      carouselApi.scrollNext();
    }, 6000);
    return () => clearInterval(id);
  }, [carouselApi, banners.length]);

  const promos = products.filter(isOnSale).slice(0, 4);
  const nouveautes = products
    .filter((p) => p.is_new)
    .sort((a, b) => b.created_at.localeCompare(a.created_at))
    .slice(0, 4);

  return (
    <StoreLayout>
      {/* Hero */}
      {banners.length > 0 && (
        <section className="border-b border-surface bg-surface">
          <Carousel setApi={setCarouselApi} opts={{ loop: true }}>
            <CarouselContent>
              {banners.map((banner) => {
                const slide = (
                  <div className="relative aspect-[21/9] w-full overflow-hidden bg-surface sm:aspect-[3/1]">
                    <img
                      src={banner.image_url}
                      alt={banner.title ?? ""}
                      className="h-full w-full object-cover"
                    />
                    {(banner.title || banner.subtitle) && (
                      <div className="absolute inset-0 flex flex-col justify-end bg-gradient-to-t from-foreground/60 via-foreground/10 to-transparent p-6 sm:p-10">
                        {banner.title && (
                          <h2 className="font-display text-2xl font-semibold tracking-tight text-background sm:text-4xl">{banner.title}</h2>
                        )}
                        {banner.subtitle && (
                          <p className="mt-2 max-w-md text-sm text-background/90 sm:text-base">{banner.subtitle}</p>
                        )}
                      </div>
                    )}
                  </div>
                );
                return (
                  <CarouselItem key={banner.id}>
                    {banner.products_count > 0 ? (
                      // Produits associés en admin -> page dédiée listant cette sélection
                      <Link to="/banniere/$id" params={{ id: banner.id }} className="block">
                        {slide}
                      </Link>
                    ) : (
                      <a href={banner.link_url || "/promotions"} className="block">{slide}</a>
                    )}
                  </CarouselItem>
                );
              })}
            </CarouselContent>
            {banners.length > 1 && (
              <>
                <CarouselPrevious className="left-4" />
                <CarouselNext className="right-4" />
              </>
            )}
          </Carousel>
        </section>
      )}

      {/* Catégories */}
      {/* {categoryTree.length > 0 && (
        <section className="container-page py-12">
          <div className="flex items-end justify-between">
            <h2 className="section-title">Catégories phares</h2>
          </div>
          <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {categoryTree.map((cat) => (
              <Link
                key={cat.id}
                to="/categorie/$slug"
                params={{ slug: cat.slug }}
                className="group rounded-xl border border-border bg-card p-5 transition-shadow hover:shadow-card"
              >
                <h3 className="text-base font-semibold group-hover:text-accent-strong">{cat.name}</h3>
                <p className="mt-1 text-sm text-muted-foreground">{cat.description}</p>
                <ul className="mt-3 space-y-1">
                  {cat.children.slice(0, 3).map((s) => (
                    <li key={s.id} className="text-xs text-muted-foreground">— {s.name}</li>
                  ))}
                </ul>
                <span className="mt-4 inline-flex items-center gap-1 text-sm font-semibold text-accent-strong">
                  Découvrir <ArrowRight className="h-3.5 w-3.5" />
                </span>
              </Link>
            ))}
          </div>
        </section>
      )} */}

      {/* Promos */}
      {(loading || promos.length > 0) && (
        <section className="border-y border-border/60 bg-surface py-14">
          <div className="container-page">
            <div className="flex items-end justify-between">
              <div>
                <h2 className="page-title text-2xl">En promotion</h2>
                {/* <p className="text-sm text-muted-foreground">Offres valables jusqu'à fin du mois.</p> */}
              </div>
              <Link to="/promotions" className="shrink-0 text-sm font-semibold text-accent-strong hover:underline">
                Tout voir
              </Link>
            </div>
            <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {loading
                ? Array.from({ length: 4 }).map((_, i) => <ProductCardSkeleton key={i} />)
                : promos.map((p) => <ProductCard key={p.id} product={p} />)}
            </div>
          </div>
        </section>
      )}

      {/* Nouveautés */}
      {!loading && nouveautes.length > 0 && (
        <section className="container-page py-14">
          <h2 className="section-title">Nouveautés</h2>
          <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {nouveautes.map((p) => <ProductCard key={p.id} product={p} />)}
          </div>
        </section>
      )}

      {/* Tous les produits */}
      {(loading || products.length > 0) && (
        <section className="border-t border-border/60 py-14">
          <div className="container-page">
            <h2 className="section-title">Tous nos produits</h2>
            <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {loading
                ? Array.from({ length: 8 }).map((_, i) => <ProductCardSkeleton key={i} />)
                : products.map((p) => <ProductCard key={p.id} product={p} />)}
            </div>
          </div>
        </section>
      )}
    </StoreLayout>
  );
}
