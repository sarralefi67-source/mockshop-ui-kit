import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { StoreLayout } from "@/components/store/StoreLayout";
import { ProductCard, ProductCardSkeleton } from "@/components/store/ProductCard";
import { fetchBannerById, fetchBannerProducts, type Banner } from "@/lib/catalog";
import type { Product } from "@/types";

export const Route = createFileRoute("/banniere/$id")({
  loader: async ({ params }) => {
    const banner = await fetchBannerById(params.id);
    if (!banner) throw notFound();
    return { banner };
  },
  head: ({ loaderData }) => {
    if (!loaderData) {
      return { meta: [{ title: "Bannière introuvable — Artisanat" }, { name: "robots", content: "noindex" }] };
    }
    const title = `${loaderData.banner.title || "Sélection"} — Artisanat`;
    const description =
      loaderData.banner.subtitle || `Découvrez la sélection ${loaderData.banner.title || "du moment"}.`;
    return {
      meta: [
        { title },
        { name: "description", content: description },
        { property: "og:title", content: title },
        { property: "og:description", content: description },
        { property: "og:image", content: loaderData.banner.image_url },
      ],
    };
  },
  component: BannerPage,
});

function BannerPage() {
  const { id } = Route.useParams();
  const { banner } = Route.useLoaderData() as { banner: Banner };
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    fetchBannerProducts(id)
      .then((data) => {
        if (mounted) setProducts(data);
      })
      .catch((err) => console.error("load banner products", err))
      .finally(() => {
        if (mounted) setLoading(false);
      });
    return () => {
      mounted = false;
    };
  }, [id]);

  return (
    <StoreLayout>
      {/* Visuel de la bannière, repris tel quel depuis l'accueil */}
      
          <div className="text-center px-4 py-10 sm:px-6 lg:px-8">
              {banner.title && (
                <h1 className="font-display text-2xl font-semibold tracking-tight  sm:text-4xl">{banner.title}</h1>
              )}
              {banner.subtitle && (
                <p className="mx-auto mt-2 max-w-md text-sm sm:text-base">{banner.subtitle}</p>
              )}
            </div>

     

      <div className="container-page">
      
        <div className="mt-2">
          {loading ? (
            <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
              {Array.from({ length: 4 }).map((_, i) => <ProductCardSkeleton key={i} />)}
            </div>
          ) : products.length === 0 ? (
            <div className="rounded-xl border border-dashed border-border py-20 text-center">
              <p className="font-semibold">Aucun produit associé à cette bannière</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Parcourez plutôt{" "}
                <Link to="/promotions" className="font-semibold text-accent-strong hover:underline">
                  nos promotions
                </Link>{" "}
                ou{" "}
                <Link to="/" className="font-semibold text-accent-strong hover:underline">
                  tous nos produits
                </Link>
                .
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
              {products.map((p) => <ProductCard key={p.id} product={p} />)}
            </div>
          )}
        </div>
      </div>
    </StoreLayout>
  );
}
