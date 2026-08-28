import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { StoreLayout } from "@/components/store/StoreLayout";
import { ProductCard, ProductCardSkeleton } from "@/components/store/ProductCard";
import { isOnSale } from "@/data/products";
import { fetchActiveProducts } from "@/lib/catalog";
import type { Product } from "@/types";

export const Route = createFileRoute("/promotions")({
  head: () => ({
    meta: [
      { title: "Promotions en cours : Artisanat" },
      { name: "description", content: "Toutes nos offres du moment sur l'informatique, la téléphonie et la maison." },
      { property: "og:title", content: "Promotions en cours : Artisanat" },
      { property: "og:description", content: "Jusqu'à -40% sur une sélection de produits, paiement à la livraison." },
    ],
  }),
  component: PromotionsPage,
});

function PromotionsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    fetchActiveProducts()
      .then((data) => {
        if (mounted) setProducts(data);
      })
      .catch((err) => console.error("load promotions products", err))
      .finally(() => {
        if (mounted) setLoading(false);
      });
    return () => {
      mounted = false;
    };
  }, []);

  const promos = products.filter(isOnSale);
  return (
    <StoreLayout>
      <div className="border-b border-border bg-surface">
        <div className="container-page py-10">
          <h1 className="page-title text-3xl">Promotions</h1>
          <p className="mt-2 text-muted-foreground">
            {promos.length} produits en réduction 
          </p>
        </div>
      </div>
      <div className="container-page py-10">
        {loading ? (
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            {Array.from({ length: 4 }).map((_, i) => <ProductCardSkeleton key={i} />)}
          </div>
        ) : promos.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border py-20 text-center">
            <p className="font-semibold">Aucune promotion en cours</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            {promos.map((p) => <ProductCard key={p.id} product={p} />)}
          </div>
        )}
      </div>
    </StoreLayout>
  );
}
