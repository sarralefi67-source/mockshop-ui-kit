import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Check, Heart, Minus, Plus, ShieldCheck, ShoppingCart, Truck } from "lucide-react";
import { toast } from "sonner";
import { StoreLayout } from "@/components/store/StoreLayout";
import { ProductCard } from "@/components/store/ProductCard";
import { Stars } from "@/components/store/Stars";
import { getProductBySlug, products } from "@/data/products";
import { reviewsForProduct } from "@/data/reviews";
import { categoryPath } from "@/data/categories";
import { formatPrice } from "@/lib/placeholder";
import { useStore } from "@/context/StoreContext";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/produit/$slug")({
  loader: ({ params }) => {
    const product = getProductBySlug(params.slug);
    if (!product) throw notFound();
    return { name: product.name, description: product.short_description };
  },
  head: ({ loaderData }) => {
    if (!loaderData) {
      return { meta: [{ title: "Produit indisponible — NexaStore" }, { name: "robots", content: "noindex" }] };
    }
    const title = `${loaderData.name} — NexaStore`;
    return {
      meta: [
        { title },
        { name: "description", content: loaderData.description },
        { property: "og:title", content: title },
        { property: "og:description", content: loaderData.description },
      ],
    };
  },
  component: ProductPage,
});

function ProductPage() {
  const { slug } = Route.useParams();
  const product = getProductBySlug(slug)!;
  const { addItem, toggleWishlist, isWishlisted } = useStore();

  const [selection, setSelection] = useState<Record<string, string>>(() => {
    const initial: Record<string, string> = {};
    product.attributes.forEach((attr) => {
      const first = attr.values[0];
      if (first) initial[attr.code] = first.id;
    });
    return initial;
  });
  const [quantity, setQuantity] = useState(1);
  const [activeImage, setActiveImage] = useState(0);

  const gallery = product.images;

  const variant = useMemo(() => {
    if (product.variants.length === 0) return null;
    return (
      product.variants.find((v) =>
        Object.entries(selection).every(([code, value]) => v.options[code] === value),
      ) ?? null
    );
  }, [product.variants, selection]);

  const price = variant?.price ?? product.price;
  const compareAt = variant?.compare_at_price ?? product.compare_at_price;
  const stock = variant ? variant.stock : product.stock;
  const onSale = compareAt !== null && compareAt > price;

  const variantLabel = product.attributes
    .map((attr) => attr.values.find((v) => v.id === selection[attr.code])?.label)
    .filter(Boolean)
    .join(" / ");

  const path = categoryPath(product.category_id);
  const productReviews = reviewsForProduct(product.id);
  const related = products
    .filter((p) => p.id !== product.id && p.category_id.startsWith(path[0]?.id ?? ""))
    .slice(0, 4);
  const liked = isWishlisted(product.id);
  const currentImage = gallery[Math.min(activeImage, gallery.length - 1)];

  const handleAdd = () => {
    if (stock === 0) return;
    addItem(
      {
        product_id: product.id,
        variant_id: variant?.id ?? null,
        slug: product.slug,
        name: product.name,
        variant_label: variantLabel || null,
        image: currentImage?.url ?? "",
        unit_price: price,
        compare_at_price: compareAt,
        max_stock: stock,
      },
      quantity,
    );
    toast.success("Produit ajouté au panier");
  };

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
          <span>/</span>
          <span className="text-foreground">{product.name}</span>
        </nav>

        <div className="mt-6 grid gap-10 lg:grid-cols-2">
          {/* Galerie */}
          <div>
            <div className="overflow-hidden rounded-xl border border-border bg-surface">
              <img
                src={currentImage?.url}
                alt={currentImage?.alt ?? product.name}
                className="aspect-square w-full object-cover"
              />
            </div>
            <div className="mt-3 flex gap-3">
              {gallery.map((img, i) => (
                <button
                  key={img.id}
                  onClick={() => setActiveImage(i)}
                  aria-label={`Image ${i + 1}`}
                  className={cn(
                    "h-20 w-20 overflow-hidden rounded-lg border-2 bg-surface",
                    i === Math.min(activeImage, gallery.length - 1)
                      ? "border-accent-strong"
                      : "border-border",
                  )}
                >
                  <img src={img.url} alt="" className="h-full w-full object-cover" />
                </button>
              ))}
            </div>
          </div>

          {/* Infos */}
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              {product.brand} · Réf. {variant?.sku ?? product.sku}
            </p>
            <h1 className="mt-2 text-3xl font-extrabold leading-tight">{product.name}</h1>

            <div className="mt-3 flex items-center gap-2">
              <Stars value={product.rating} />
              <span className="text-sm text-muted-foreground">
                {product.rating.toFixed(1)} · {product.reviews_count} avis
              </span>
            </div>

            <p className="mt-4 text-muted-foreground">{product.short_description}</p>

            <div className="mt-6 flex items-baseline gap-3">
              <span className={cn("text-3xl font-extrabold", onSale ? "text-accent-strong" : "")}>
                {formatPrice(price)}
              </span>
              {onSale && (
                <>
                  <span className="text-lg text-muted-foreground line-through">
                    {formatPrice(compareAt!)}
                  </span>
                  <span className="rounded bg-accent-strong/10 px-2 py-0.5 text-sm font-bold text-accent-strong">
                    -{Math.round(((compareAt! - price) / compareAt!) * 100)}%
                  </span>
                </>
              )}
            </div>

            {/* Variantes */}
            {product.attributes.map((attr) => (
              <div key={attr.id} className="mt-6">
                <p className="text-sm font-semibold">
                  {attr.name}:{" "}
                  <span className="font-normal text-muted-foreground">
                    {attr.values.find((v) => v.id === selection[attr.code])?.label}
                  </span>
                </p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {attr.values.map((value) => {
                    const active = selection[attr.code] === value.id;
                    if (attr.type === "swatch") {
                      return (
                        <button
                          key={value.id}
                          aria-label={value.label}
                          onClick={() => {
                            setSelection((s) => ({ ...s, [attr.code]: value.id }));
                            setActiveImage(0);
                          }}
                          className={cn(
                            "grid h-10 w-10 place-items-center rounded-full border-2 transition",
                            active ? "border-accent-strong" : "border-border hover:border-muted-foreground",
                          )}
                        >
                          <span
                            className="h-7 w-7 rounded-full border border-border"
                            style={{ backgroundColor: value.hex }}
                          />
                        </button>
                      );
                    }
                    return (
                      <button
                        key={value.id}
                        onClick={() => setSelection((s) => ({ ...s, [attr.code]: value.id }))}
                        className={cn(
                          "min-w-16 rounded-md border px-4 py-2 text-sm font-medium transition",
                          active
                            ? "border-accent-strong bg-accent-strong/10 text-accent-strong"
                            : "border-border hover:border-muted-foreground",
                        )}
                      >
                        {value.label}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}

            <div className="mt-6 flex items-center gap-2 text-sm">
              {stock > 0 ? (
                <>
                  <Check className="h-4 w-4 text-success" />
                  <span className="font-medium text-success">En stock</span>
                  <span className="text-muted-foreground">({stock} disponibles)</span>
                </>
              ) : (
                <span className="font-medium text-destructive">Rupture de stock</span>
              )}
            </div>

            <div className="mt-5 flex flex-wrap items-center gap-3">
              <div className="flex items-center rounded-md border border-border">
                <button
                  className="grid h-11 w-11 place-items-center text-muted-foreground hover:text-foreground"
                  onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                  aria-label="Diminuer"
                >
                  <Minus className="h-4 w-4" />
                </button>
                <span className="w-10 text-center font-semibold">{quantity}</span>
                <button
                  className="grid h-11 w-11 place-items-center text-muted-foreground hover:text-foreground disabled:opacity-40"
                  disabled={quantity >= stock}
                  onClick={() => setQuantity((q) => q + 1)}
                  aria-label="Augmenter"
                >
                  <Plus className="h-4 w-4" />
                </button>
              </div>
              <Button variant="accent" size="xl" className="flex-1" disabled={stock === 0} onClick={handleAdd}>
                <ShoppingCart className="h-5 w-5" />
                Ajouter au panier
              </Button>
              <Button
                variant="outline"
                size="icon"
                aria-label="Ajouter aux favoris"
                className="h-12 w-12"
                onClick={() => toggleWishlist(product.id)}
              >
                <Heart className={cn("h-5 w-5", liked && "fill-accent-strong text-accent-strong")} />
              </Button>
            </div>

            <div className="mt-6 space-y-2 rounded-lg bg-surface p-4 text-sm">
              <p className="flex items-center gap-2"><Truck className="h-4 w-4 text-accent-strong" /> Livraison 24/48h — 7 DT</p>
              <p className="flex items-center gap-2"><ShieldCheck className="h-4 w-4 text-accent-strong" /> Paiement à la livraison uniquement</p>
            </div>
          </div>
        </div>

        {/* Onglets */}
        <Tabs defaultValue="description" className="mt-12">
          <TabsList>
            <TabsTrigger value="description">Description</TabsTrigger>
            <TabsTrigger value="specs">Caractéristiques</TabsTrigger>
            <TabsTrigger value="avis">Avis ({productReviews.length})</TabsTrigger>
          </TabsList>

          <TabsContent value="description" className="max-w-3xl pt-6 text-muted-foreground">
            <p>{product.description}</p>
          </TabsContent>

          <TabsContent value="specs" className="max-w-3xl pt-6">
            <dl className="divide-y divide-border rounded-lg border border-border">
              {[
                ["Marque", product.brand],
                ["Référence", variant?.sku ?? product.sku],
                ["Garantie", "12 mois"],
                ...product.attributes.map(
                  (a) => [a.name, a.values.map((v) => v.label).join(", ")] as [string, string],
                ),
              ].map(([label, value]) => (
                <div key={label} className="flex justify-between gap-4 px-4 py-3 text-sm">
                  <dt className="text-muted-foreground">{label}</dt>
                  <dd className="font-medium">{value}</dd>
                </div>
              ))}
            </dl>
          </TabsContent>

          <TabsContent value="avis" className="max-w-3xl pt-6">
            {productReviews.length === 0 ? (
              <div className="rounded-xl border border-dashed border-border py-16 text-center">
                <p className="font-semibold">Aucun avis pour ce produit</p>
                <p className="mt-1 text-sm text-muted-foreground">Soyez le premier à donner votre avis.</p>
              </div>
            ) : (
              <ul className="space-y-5">
                {productReviews.map((r) => (
                  <li key={r.id} className="rounded-lg border border-border p-4">
                    <div className="flex flex-wrap items-center gap-2">
                      <Stars value={r.rating} />
                      <span className="text-sm font-semibold">{r.title}</span>
                      {r.verified && (
                        <span className="rounded bg-success/10 px-2 py-0.5 text-[11px] font-semibold text-success">
                          Achat vérifié
                        </span>
                      )}
                    </div>
                    <p className="mt-2 text-sm text-muted-foreground">{r.body}</p>
                    <p className="mt-2 text-xs text-muted-foreground">
                      {r.author} — {new Date(r.created_at).toLocaleDateString("fr-FR")}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </TabsContent>
        </Tabs>

        {related.length > 0 && (
          <section className="mt-14">
            <Separator className="mb-8" />
            <h2 className="text-2xl font-bold">Produits liés</h2>
            <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {related.map((p) => <ProductCard key={p.id} product={p} />)}
            </div>
          </section>
        )}
      </div>
    </StoreLayout>
  );
}
