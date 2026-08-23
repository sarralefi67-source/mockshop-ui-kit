import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { SlidersHorizontal } from "lucide-react";
import { StoreLayout } from "@/components/store/StoreLayout";
import { ProductCard, ProductCardSkeleton } from "@/components/store/ProductCard";
import {
  categoryPath,
  categoryWithDescendants,
  findCategoryBySlug,
} from "@/data/categories";
import { fetchActiveProducts, fetchCategories } from "@/lib/catalog";
import type { Category, Product } from "@/types";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Slider } from "@/components/ui/slider";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";

export const Route = createFileRoute("/categorie/$slug")({
  loader: async ({ params }) => {
    const categories = await fetchCategories();
    const category = findCategoryBySlug(params.slug, categories);
    if (!category) throw notFound();
    return { name: category.name, description: category.description ?? "", categories };
  },
  head: ({ loaderData }) => {
    if (!loaderData) {
      return { meta: [{ title: "Catégorie introuvable — Artisanat" }, { name: "robots", content: "noindex" }] };
    }
    const title = `${loaderData.name} — Artisanat`;
    const description =
      loaderData.description || `Tous nos produits ${loaderData.name} en Tunisie, paiement à la livraison.`;
    return {
      meta: [
        { title },
        { name: "description", content: description },
        { property: "og:title", content: title },
        { property: "og:description", content: description },
      ],
    };
  },
  component: CategoryPage,
});

const PAGE_SIZE = 6;

function CategoryPage() {
  const { slug } = Route.useParams();
  const { categories } = Route.useLoaderData();
  const category = findCategoryBySlug(slug, categories)!;
  const ids = useMemo(() => categoryWithDescendants(category.id, categories), [category.id, categories]);
  const path = categoryPath(category.id, categories);
  const subCategories = categories.filter((c) => c.parent_id === category.id);

  const [allProducts, setAllProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    setPage(1);
    fetchActiveProducts()
      .then((data) => {
        if (mounted) setAllProducts(data);
      })
      .catch((err) => {
        console.error("load category products", err);
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });
    return () => {
      mounted = false;
    };
  }, [slug]);

  const base = useMemo(
    () => allProducts.filter((p) => p.category_id && ids.includes(p.category_id)),
    [allProducts, ids],
  );
  const maxPrice = Math.max(1000, ...base.map((p) => p.price));

  const [priceRange, setPriceRange] = useState<number[]>([0, maxPrice]);
  const [brands, setBrands] = useState<string[]>([]);
  const [inStockOnly, setInStockOnly] = useState(false);
  const [onSaleOnly, setOnSaleOnly] = useState(false);
  const [sort, setSort] = useState("popularite");
  const [page, setPage] = useState(1);

  useEffect(() => {
    setPriceRange([0, maxPrice]);
    setBrands([]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slug, maxPrice]);

  const availableBrands = [...new Set(base.map((p) => p.brand))];

  const filtered = useMemo(() => {
    const list = base.filter((p) => {
      if (p.price < (priceRange[0] ?? 0) || p.price > (priceRange[1] ?? maxPrice)) return false;
      if (brands.length > 0 && !brands.includes(p.brand)) return false;
      if (inStockOnly && p.stock === 0) return false;
      if (onSaleOnly && !(p.compare_at_price && p.compare_at_price > p.price)) return false;
      return true;
    });
    switch (sort) {
      case "prix-asc": return [...list].sort((a, b) => a.price - b.price);
      case "prix-desc": return [...list].sort((a, b) => b.price - a.price);
      case "nouveaute": return [...list].sort((a, b) => b.created_at.localeCompare(a.created_at));
      case "note": return [...list].sort((a, b) => b.rating - a.rating);
      default: return [...list].sort((a, b) => b.reviews_count - a.reviews_count);
    }
  }, [base, priceRange, brands, inStockOnly, onSaleOnly, sort, maxPrice]);

  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const visible = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const toggleBrand = (brand: string) =>
    setBrands((prev) => (prev.includes(brand) ? prev.filter((b) => b !== brand) : [...prev, brand]));

  const filtersPanel = (
    <div className="space-y-7">
      <div>
        <h3 className="text-sm font-bold uppercase tracking-wide">Prix</h3>
        <Slider
          className="mt-4"
          min={0}
          max={maxPrice}
          step={10}
          value={priceRange}
          onValueChange={(v) => { setPriceRange(v); setPage(1); }}
        />
        <p className="mt-2 text-sm text-muted-foreground">
          {priceRange[0]} DT — {priceRange[1]} DT
        </p>
      </div>

      <div>
        <h3 className="text-sm font-bold uppercase tracking-wide">Marque</h3>
        <ul className="mt-3 space-y-2">
          {availableBrands.map((b) => (
            <li key={b} className="flex items-center gap-2">
              <Checkbox id={`brand-${b}`} checked={brands.includes(b)} onCheckedChange={() => { toggleBrand(b); setPage(1); }} />
              <Label htmlFor={`brand-${b}`} className="text-sm font-normal">{b}</Label>
            </li>
          ))}
          {availableBrands.length === 0 && <li className="text-sm text-muted-foreground">—</li>}
        </ul>
      </div>

      <div>
        <h3 className="text-sm font-bold uppercase tracking-wide">Disponibilité</h3>
        <div className="mt-3 space-y-2">
          <div className="flex items-center gap-2">
            <Checkbox id="stock" checked={inStockOnly} onCheckedChange={(v) => { setInStockOnly(Boolean(v)); setPage(1); }} />
            <Label htmlFor="stock" className="text-sm font-normal">En stock uniquement</Label>
          </div>
          <div className="flex items-center gap-2">
            <Checkbox id="sale" checked={onSaleOnly} onCheckedChange={(v) => { setOnSaleOnly(Boolean(v)); setPage(1); }} />
            <Label htmlFor="sale" className="text-sm font-normal">En promotion</Label>
          </div>
        </div>
      </div>

      <Button
        variant="outline"
        className="w-full"
        onClick={() => {
          setPriceRange([0, maxPrice]); setBrands([]); setInStockOnly(false); setOnSaleOnly(false); setPage(1);
        }}
      >
        Réinitialiser les filtres
      </Button>
    </div>
  );

  return (
    <StoreLayout>
      <div className="container-page py-6">
        <nav className="flex flex-wrap items-center gap-1 text-xs text-muted-foreground">
          <Link to="/" className="hover:text-accent-strong">Accueil</Link>
          {path.map((c) => (
            <span key={c.id} className="flex items-center gap-1">
              <span>/</span>
              <Link to="/categorie/$slug" params={{ slug: c.slug }} className="hover:text-accent-strong">
                {c.name}
              </Link>
            </span>
          ))}
        </nav>

        <div className="mt-4 flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="page-title text-3xl">{category.name}</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              {filtered.length} produit{filtered.length > 1 ? "s" : ""} disponible
              {filtered.length > 1 ? "s" : ""}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Sheet>
              <SheetTrigger asChild>
                <Button variant="outline" className="lg:hidden">
                  <SlidersHorizontal className="h-4 w-4" /> Filtres
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="w-80 overflow-y-auto">
                <SheetHeader><SheetTitle>Filtres</SheetTitle></SheetHeader>
                <div className="mt-6">{filtersPanel}</div>
              </SheetContent>
            </Sheet>
            <Select value={sort} onValueChange={setSort}>
              <SelectTrigger className="w-48"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="popularite">Popularité</SelectItem>
                <SelectItem value="nouveaute">Nouveautés</SelectItem>
                <SelectItem value="prix-asc">Prix croissant</SelectItem>
                <SelectItem value="prix-desc">Prix décroissant</SelectItem>
                <SelectItem value="note">Meilleures notes</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {subCategories.length > 0 && (
          <div className="mt-5 flex flex-wrap gap-2">
            {subCategories.map((s) => (
              <Link
                key={s.id}
                to="/categorie/$slug"
                params={{ slug: s.slug }}
                className="rounded-full border border-border bg-card px-4 py-1.5 text-sm hover:border-accent-strong hover:text-accent-strong"
              >
                {s.name}
              </Link>
            ))}
          </div>
        )}

        <div className="mt-8 grid gap-8 lg:grid-cols-[240px_1fr]">
          <aside className="hidden lg:block">{filtersPanel}</aside>

          <div>
            {loading ? (
              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                {Array.from({ length: 6 }).map((_, i) => <ProductCardSkeleton key={i} />)}
              </div>
            ) : visible.length === 0 ? (
              <div className="rounded-xl border border-dashed border-border py-20 text-center">
                <p className="font-semibold">Aucun produit ne correspond à ces filtres</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  Essayez d'élargir la fourchette de prix ou de retirer des marques.
                </p>
              </div>
            ) : (
              <>
                <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                  {visible.map((p) => <ProductCard key={p.id} product={p} />)}
                </div>
                {pageCount > 1 && (
                  <div className="mt-10 flex items-center justify-center gap-2">
                    <Button variant="outline" size="sm" disabled={page === 1} onClick={() => setPage((p) => p - 1)}>
                      Précédent
                    </Button>
                    {Array.from({ length: pageCount }).map((_, i) => (
                      <Button
                        key={i}
                        size="sm"
                        variant={page === i + 1 ? "accent" : "outline"}
                        onClick={() => setPage(i + 1)}
                      >
                        {i + 1}
                      </Button>
                    ))}
                    <Button variant="outline" size="sm" disabled={page === pageCount} onClick={() => setPage((p) => p + 1)}>
                      Suivant
                    </Button>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </StoreLayout>
  );
}
