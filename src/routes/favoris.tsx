import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Heart } from "lucide-react";
import { StoreLayout } from "@/components/store/StoreLayout";
import { ProductCard, ProductCardSkeleton } from "@/components/store/ProductCard";
import { fetchActiveProducts } from "@/lib/catalog";
import type { Product } from "@/types";
import { useStore } from "@/context/StoreContext";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/favoris")({
  head: () => ({
    meta: [
      { title: "Mes favoris : Artisanat" },
      { name: "description", content: "Retrouvez les produits que vous avez enregistrés dans votre liste d'envies." },
      { property: "og:title", content: "Mes favoris : Artisanat" },
      { property: "og:description", content: "Votre liste d'envies Artisanat." },
    ],
  }),
  component: FavorisPage,
});

function FavorisPage() {
  const { wishlist } = useStore();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    fetchActiveProducts()
      .then((data) => {
        if (mounted) setProducts(data);
      })
      .catch((err) => console.error("load favoris products", err))
      .finally(() => {
        if (mounted) setLoading(false);
      });
    return () => {
      mounted = false;
    };
  }, []);

  const liked = products.filter((p) => wishlist.includes(p.id));

  return (
    <StoreLayout>
      <div className="container-page py-10">
        <h1 className="page-title text-3xl">Mes favoris</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          {liked.length} produit{liked.length > 1 ? "s" : ""} enregistré{liked.length > 1 ? "s" : ""}
        </p>

        {loading ? (
          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {Array.from({ length: 4 }).map((_, i) => <ProductCardSkeleton key={i} />)}
          </div>
        ) : liked.length === 0 ? (
          <div className="mt-10 rounded-xl border border-dashed border-border py-20 text-center">
            <Heart className="mx-auto h-10 w-10 text-muted-foreground" />
            <p className="mt-3 font-semibold">Votre liste d'envies est vide</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Cliquez sur le cœur d'un produit pour l'ajouter ici.
            </p>
            <Button variant="accent" className="mt-5" asChild>
              <Link to="/">Découvrir la boutique</Link>
            </Button>
          </div>
        ) : (
          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {liked.map((p) => <ProductCard key={p.id} product={p} />)}
          </div>
        )}
      </div>
    </StoreLayout>
  );
}
