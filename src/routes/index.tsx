import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ArrowRight, Truck, ShieldCheck, Headphones } from "lucide-react";
import { StoreLayout } from "@/components/store/StoreLayout";
import { ProductCard, ProductCardSkeleton } from "@/components/store/ProductCard";
import { products, isOnSale } from "@/data/products";
import { buildCategoryTree } from "@/data/categories";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "NexaStore — High-tech, maison & accessoires en Tunisie" },
      {
        name: "description",
        content:
          "Découvrez nos PC, smartphones, audio et électroménager. Livraison 24/48h et paiement à la livraison partout en Tunisie.",
      },
      { property: "og:title", content: "NexaStore — High-tech & maison en Tunisie" },
      {
        property: "og:description",
        content: "PC, smartphones, audio, électroménager. Paiement à la livraison.",
      },
    ],
  }),
  component: HomePage,
});

const tree = buildCategoryTree();

function HomePage() {
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    const t = setTimeout(() => setLoading(false), 450);
    return () => clearTimeout(t);
  }, []);

  const promos = products.filter(isOnSale).slice(0, 4);
  const nouveautes = [...products]
    .sort((a, b) => b.created_at.localeCompare(a.created_at))
    .slice(0, 4);

  return (
    <StoreLayout>
      {/* Hero */}
      <section className="border-b border-border bg-surface">
        <div className="container-page grid items-center gap-8 py-12 md:grid-cols-2 md:py-20">
          <div>
            <span className="inline-block rounded-full bg-accent-strong/10 px-3 py-1 text-xs font-bold uppercase tracking-wide text-accent-strong">
              Soldes d'été — jusqu'à -40%
            </span>
            <h1 className="mt-4 text-4xl font-extrabold leading-tight md:text-5xl">
              La high-tech livrée chez vous,
              <span className="text-accent-strong"> payée à la livraison</span>
            </h1>
            <p className="mt-4 max-w-md text-muted-foreground">
              Plus de 2 000 références en informatique, téléphonie, maison et accessoires.
              Livraison 24/48h dans les 24 gouvernorats.
            </p>
            <div className="mt-7 flex flex-wrap gap-3">
              <Button variant="accent" size="lg" asChild>
                <Link to="/promotions">
                  Voir les promos <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
              <Button variant="outline" size="lg" asChild>
                <Link to="/categorie/$slug" params={{ slug: "informatique" }}>
                  Explorer l'informatique
                </Link>
              </Button>
            </div>
            <ul className="mt-8 flex flex-wrap gap-x-6 gap-y-2 text-sm text-muted-foreground">
              <li className="flex items-center gap-2"><Truck className="h-4 w-4 text-accent-strong" /> Livraison 24/48h</li>
              <li className="flex items-center gap-2"><ShieldCheck className="h-4 w-4 text-accent-strong" /> Garantie 12 mois</li>
              <li className="flex items-center gap-2"><Headphones className="h-4 w-4 text-accent-strong" /> Support 6j/7</li>
            </ul>
          </div>
          <div className="grid grid-cols-2 gap-3">
            {products.slice(0, 4).map((p) => (
              <Link
                key={p.id}
                to="/produit/$slug"
                params={{ slug: p.slug }}
                className="overflow-hidden rounded-xl border border-border bg-card"
              >
                <img src={p.images[0]?.url} alt={p.name} className="aspect-square w-full object-cover" />
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Catégories */}
      <section className="container-page py-12">
        <div className="flex items-end justify-between">
          <h2 className="text-2xl font-bold">Catégories phares</h2>
        </div>
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {tree.map((cat) => (
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

      {/* Promos */}
      <section className="border-y border-border bg-surface py-12">
        <div className="container-page">
          <div className="flex items-end justify-between">
            <div>
              <h2 className="text-2xl font-bold">En promotion</h2>
              <p className="text-sm text-muted-foreground">Offres valables jusqu'à fin du mois.</p>
            </div>
            <Link to="/promotions" className="text-sm font-semibold text-accent-strong hover:underline">
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

      {/* Nouveautés */}
      <section className="container-page py-12">
        <h2 className="text-2xl font-bold">Nouveautés</h2>
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {loading
            ? Array.from({ length: 4 }).map((_, i) => <ProductCardSkeleton key={i} />)
            : nouveautes.map((p) => <ProductCard key={p.id} product={p} />)}
        </div>
      </section>
    </StoreLayout>
  );
}
