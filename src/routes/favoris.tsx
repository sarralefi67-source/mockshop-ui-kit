import { createFileRoute, Link } from "@tanstack/react-router";
import { Heart } from "lucide-react";
import { StoreLayout } from "@/components/store/StoreLayout";
import { ProductCard } from "@/components/store/ProductCard";
import { products } from "@/data/products";
import { useStore } from "@/context/StoreContext";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/favoris")({
  head: () => ({
    meta: [
      { title: "Mes favoris — NexaStore" },
      { name: "description", content: "Retrouvez les produits que vous avez enregistrés dans votre liste d'envies." },
      { property: "og:title", content: "Mes favoris — NexaStore" },
      { property: "og:description", content: "Votre liste d'envies NexaStore." },
    ],
  }),
  component: FavorisPage,
});

function FavorisPage() {
  const { wishlist } = useStore();
  const liked = products.filter((p) => wishlist.includes(p.id));

  return (
    <StoreLayout>
      <div className="container-page py-10">
        <h1 className="text-3xl font-extrabold">Mes favoris</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          {liked.length} produit{liked.length > 1 ? "s" : ""} enregistré{liked.length > 1 ? "s" : ""}
        </p>

        {liked.length === 0 ? (
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
