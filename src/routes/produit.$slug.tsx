import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { Check, Heart, Maximize2, Minus, Plus, ShieldCheck, ShoppingCart, Star, Truck } from "lucide-react";
import { toast } from "sonner";
import { StoreLayout } from "@/components/store/StoreLayout";
import { ProductCard } from "@/components/store/ProductCard";
import { Stars } from "@/components/store/Stars";
import { categoryPath } from "@/data/categories";
import { fetchActiveProducts, fetchCategories, fetchProductBySlug } from "@/lib/catalog";
import { supabase } from "@/lib/supabaseClient";
import { useAuth } from "@/context/AuthContext";
import type { Product } from "@/types";
import { formatPrice } from "@/lib/placeholder";
import { useStore } from "@/context/StoreContext";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

type LiveReview = { id: string; rating: number; comment: string | null; created_at: string | null; user_id: string | null; is_approved: boolean | null };

function StarPicker({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  return (
    <div className="flex items-center gap-1">
      {[1, 2, 3, 4, 5].map((i) => (
        <button
          key={i}
          type="button"
          aria-label={`${i} étoile${i > 1 ? "s" : ""}`}
          onClick={() => onChange(i)}
          className="p-0.5"
        >
          <Star className={cn("h-6 w-6", i <= value ? "fill-warning text-warning" : "text-muted-foreground/40")} />
        </button>
      ))}
    </div>
  );
}

export const Route = createFileRoute("/produit/$slug")({
  loader: async ({ params }) => {
    const product = await fetchProductBySlug(params.slug);
    if (!product) throw notFound();
    return { product };
  },
  head: ({ loaderData }) => {
    if (!loaderData) {
      return { meta: [{ title: "Produit indisponible — Yadawi" }, { name: "robots", content: "noindex" }] };
    }
    const { product } = loaderData;
    const title = `${product.name} — Yadawi`;
    return {
      meta: [
        { title },
        { name: "description", content: product.short_description },
        { property: "og:title", content: title },
        { property: "og:description", content: product.short_description },
      ],
    };
  },
  component: ProductPage,
});

function ProductPage() {
  const { product } = Route.useLoaderData();
  const { addItem, toggleWishlist, isWishlisted } = useStore();
  const { user } = useAuth();

  const [selection, setSelection] = useState<Record<string, string>>(() => {
    const initial: Record<string, string> = {};
    product.attributes.forEach((attr) => {
      const first = attr.values[0];
      if (first) initial[attr.code] = first.id;
    });
    return initial;
  });
  const [quantity, setQuantity] = useState(1);
  const [zoomOpen, setZoomOpen] = useState(false);

  // All images stay visible as thumbnails; picking an attribute value just
  // moves the focused/main image to the one tagged with that value
  // (product_images.variant_value), whatever attribute type triggered it.
  const gallery = product.images;

  const mainImageIndex = () => {
    const idx = gallery.findIndex((img) => img.is_main);
    return idx >= 0 ? idx : 0;
  };

  // Default focus is always the product's main image on load — only an
  // explicit selection change (not the initial mount) should move it.
  const [activeImage, setActiveImage] = useState(mainImageIndex);
  const didMount = useRef(false);

  useEffect(() => {
    if (!didMount.current) {
      didMount.current = true;
      return;
    }
    const selectedValueIds = Object.values(selection);
    const matchIndex = gallery.findIndex((img) => img.variant_value && selectedValueIds.includes(img.variant_value));
    setActiveImage(matchIndex >= 0 ? matchIndex : mainImageIndex());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selection, gallery]);

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

  const [categories, setCategories] = useState<Awaited<ReturnType<typeof fetchCategories>>>([]);
  const [related, setRelated] = useState<Product[]>([]);
  const [productReviews, setProductReviews] = useState<LiveReview[]>([]);

  useEffect(() => {
    let mounted = true;
    fetchCategories()
      .then((data) => {
        if (mounted) setCategories(data);
      })
      .catch((err) => console.error("load categories", err));
    return () => {
      mounted = false;
    };
  }, []);

  const path = useMemo(
    () => (product.category_id ? categoryPath(product.category_id, categories) : []),
    [product.category_id, categories],
  );

  useEffect(() => {
    let mounted = true;
    const rootId = path[0]?.id;
    if (!rootId) {
      setRelated([]);
      return;
    }
    fetchActiveProducts()
      .then((data) => {
        if (!mounted) return;
        setRelated(data.filter((p) => p.id !== product.id && p.category_id === product.category_id).slice(0, 4));
      })
      .catch((err) => console.error("load related products", err));
    return () => {
      mounted = false;
    };
  }, [path, product.id, product.category_id]);

  const [myRating, setMyRating] = useState(0);
  const [myComment, setMyComment] = useState("");
  const [submittingReview, setSubmittingReview] = useState(false);

  const loadReviews = () => {
    // include the viewer's own review even if still pending moderation
    // (RLS: "users read own reviews" has no is_approved condition)
    let query = supabase
      .from("reviews")
      .select("id, rating, comment, created_at, user_id, is_approved")
      .eq("product_id", product.id);
    query = user
      ? query.or(`is_approved.eq.true,user_id.eq.${user.id}`)
      : query.eq("is_approved", true);
    return query.order("created_at", { ascending: false }).then(({ data, error }) => {
      if (error) {
        console.error("load reviews", error);
        return;
      }
      setProductReviews((data ?? []) as LiveReview[]);
    });
  };

  useEffect(() => {
    let mounted = true;
    if (mounted) loadReviews();
    return () => {
      mounted = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [product.id, user?.id]);

  const myReview = productReviews.find((r) => r.user_id === user?.id) ?? null;

  const submitReview = async () => {
    if (!user) return;
    if (myRating < 1) {
      toast.error("Choisissez une note.");
      return;
    }
    setSubmittingReview(true);
    try {
      const { error } = await supabase.from("reviews").insert({
        product_id: product.id,
        user_id: user.id,
        rating: myRating,
        comment: myComment.trim() || null,
      });
      if (error) throw error;
      toast.success("Merci pour votre avis ! Il sera visible après modération.");
      setMyRating(0);
      setMyComment("");
      await loadReviews();
    } catch (err) {
      console.error("submit review", err);
      toast.error("Impossible d'enregistrer votre avis.");
    } finally {
      setSubmittingReview(false);
    }
  };

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
            <div className="relative overflow-hidden rounded-xl border border-border bg-surface">
              <img
                src={currentImage?.url}
                alt={currentImage?.alt ?? product.name}
                className="aspect-square w-full object-cover"
              />
              {currentImage && (
                <button
                  type="button"
                  aria-label="Agrandir l'image"
                  onClick={() => setZoomOpen(true)}
                  className="absolute left-3 top-3 grid h-9 w-9 place-items-center rounded-full bg-card/90 text-foreground shadow-card hover:text-accent-strong"
                >
                  <Maximize2 className="h-4 w-4" />
                </button>
              )}
            </div>
            <div className="mt-3 flex flex-wrap gap-3">
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

          <Dialog open={zoomOpen} onOpenChange={setZoomOpen}>
            <DialogContent className="max-w-3xl border-none bg-transparent p-0 shadow-none [&>button]:bg-card [&>button]:rounded-full [&>button]:p-1.5 [&>button]:opacity-100">
              {currentImage && (
                <img
                  src={currentImage.url}
                  alt={currentImage.alt ?? product.name}
                  className="max-h-[85vh] w-full rounded-xl object-contain"
                />
              )}
            </DialogContent>
          </Dialog>

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
                          onClick={() => setSelection((s) => ({ ...s, [attr.code]: value.id }))}
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
            {!user ? (
              <div className="mb-6 rounded-xl border border-border bg-surface p-4 text-sm">
                <Link to="/connexion" search={{ redirect: `/produit/${product.slug}` }} className="font-semibold text-accent-strong hover:underline">
                  Connectez-vous
                </Link>{" "}
                pour laisser un avis sur ce produit.
              </div>
            ) : myReview ? (
              <div className="mb-6 rounded-xl border border-border bg-surface p-4">
                <p className="text-sm font-semibold">Votre avis</p>
                <div className="mt-2 flex items-center gap-2">
                  <Stars value={myReview.rating} />
                  {myReview.is_approved === null && (
                    <span className="rounded bg-warning/15 px-2 py-0.5 text-[11px] font-semibold text-warning">
                      En attente de modération
                    </span>
                  )}
                </div>
                {myReview.comment && <p className="mt-2 text-sm text-muted-foreground">{myReview.comment}</p>}
              </div>
            ) : (
              <div className="mb-6 space-y-3 rounded-xl border border-border bg-surface p-4">
                <p className="text-sm font-semibold">Laisser un avis</p>
                <StarPicker value={myRating} onChange={setMyRating} />
                <Textarea
                  value={myComment}
                  onChange={(e) => setMyComment(e.target.value)}
                  placeholder="Votre expérience avec ce produit (optionnel)"
                  rows={3}
                />
                <Button variant="accent" size="sm" onClick={submitReview} disabled={submittingReview}>
                  {submittingReview ? "Envoi…" : "Publier mon avis"}
                </Button>
              </div>
            )}

            {productReviews.filter((r) => r.id !== myReview?.id).length === 0 ? (
              myReview === null && (
                <div className="rounded-xl border border-dashed border-border py-16 text-center">
                  <p className="font-semibold">Aucun avis pour ce produit</p>
                  <p className="mt-1 text-sm text-muted-foreground">Soyez le premier à donner votre avis.</p>
                </div>
              )
            ) : (
              <ul className="space-y-5">
                {productReviews.filter((r) => r.id !== myReview?.id).map((r) => (
                  <li key={r.id} className="rounded-lg border border-border p-4">
                    <div className="flex flex-wrap items-center gap-2">
                      <Stars value={r.rating} />
                    </div>
                    {r.comment && <p className="mt-2 text-sm text-muted-foreground">{r.comment}</p>}
                    <p className="mt-2 text-xs text-muted-foreground">
                      Client{r.created_at ? ` — ${new Date(r.created_at).toLocaleDateString("fr-FR")}` : ""}
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
