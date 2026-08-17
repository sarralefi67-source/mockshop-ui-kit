import { createFileRoute } from "@tanstack/react-router";
import { StoreLayout } from "@/components/store/StoreLayout";
import { ProductCard } from "@/components/store/ProductCard";
import { isOnSale, products } from "@/data/products";

export const Route = createFileRoute("/promotions")({
  head: () => ({
    meta: [
      { title: "Promotions en cours — NexaStore" },
      { name: "description", content: "Toutes nos offres du moment sur l'informatique, la téléphonie et la maison." },
      { property: "og:title", content: "Promotions en cours — NexaStore" },
      { property: "og:description", content: "Jusqu'à -40% sur une sélection de produits, paiement à la livraison." },
    ],
  }),
  component: PromotionsPage,
});

function PromotionsPage() {
  const promos = products.filter(isOnSale);
  return (
    <StoreLayout>
      <div className="border-b border-border bg-surface">
        <div className="container-page py-10">
          <h1 className="text-3xl font-extrabold">Promotions</h1>
          <p className="mt-2 text-muted-foreground">
            {promos.length} produits en réduction — offres limitées dans le temps.
          </p>
        </div>
      </div>
      <div className="container-page py-10">
        {promos.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border py-20 text-center">
            <p className="font-semibold">Aucune promotion en cours</p>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {promos.map((p) => <ProductCard key={p.id} product={p} />)}
          </div>
        )}
      </div>
    </StoreLayout>
  );
}
