import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ImagePlus, Package, Pencil, Plus, Trash2, X, Eye } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/lib/supabaseClient";
import { uploadToBucket, deleteFromBucket } from "@/lib/storage";
import type { Product, ProductAttribute, ProductVariant, ProductImage } from "@/types";
import { formatPrice } from "@/lib/placeholder";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import ProductGeneral from "@/components/admin/ProductGeneral";
import ProductImages from "@/components/admin/ProductImages";
import AttributesVariants from "@/components/admin/AttributesVariants";
import { ProductGallery } from "@/components/store/ProductGallery";
import { ProductDetails } from "@/components/store/ProductDetails";
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";

export const Route = createFileRoute("/admin/produits")({
  component: AdminProducts,
});

const emptyProduct: Product = {
  id: "", name: "", slug: "", brand: "", category_id: "",
  short_description: "", description: "", price: 0, compare_at_price: null, stock: 0,
  sku: "", is_active: true, is_new: false, rating: 0, reviews_count: 0,
  created_at: new Date().toISOString().slice(0, 10),
  images: [], attributes: [], variants: [], tags: [],
};

function AdminProducts() {
  const [list, setList] = useState<Product[]>([]);
  const [loading, setLoading] = useState(false);
  const [categoriesMap, setCategoriesMap] = useState<Record<string, string>>({});
  const [categoriesList, setCategoriesList] = useState<{ id: string; parent_id: string | null; name: string }[]>([]);
  const [stockFilter, setStockFilter] = useState<"all" | "in" | "low" | "out">("all");
  const [categoryFilter, setCategoryFilter] = useState<string | "all">("all");
  const [priceSort, setPriceSort] = useState<"asc" | "desc" | null>(null);
  const [viewProduct, setViewProduct] = useState<Product | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  useEffect(() => { fetchProducts(); }, []);
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<Product>(emptyProduct);

  // client-side filtering + sorting
  let filtered = list.filter((p) => p.name.toLowerCase().includes(search.toLowerCase()) || p.brand.toLowerCase().includes(search.toLowerCase()));
  // apply stock filter
  filtered = filtered.filter((p) => {
    if (stockFilter === "all") return true;
    if (stockFilter === "in") return p.stock > 5;
    if (stockFilter === "low") return p.stock > 0 && p.stock <= 5;
    return p.stock === 0;
  });
  // category filter (includes parent matching)
  filtered = filtered.filter((p) => {
    if (categoryFilter === "all") return true;
    if (!p.category_id) return false;
    if (p.category_id === categoryFilter) return true;
    let cur = categoriesList.find((c) => c.id === p.category_id);
    while (cur) {
      if (!cur.parent_id) break;
      if (cur.parent_id === categoryFilter) return true;
      cur = categoriesList.find((c) => c.id === cur?.parent_id);
    }
    return false;
  });
  // price sort
  if (priceSort) {
    filtered = [...filtered].sort((a, b) => (priceSort === "asc" ? a.price - b.price : b.price - a.price));
  }

  const fetchProducts = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("products")
      .select(`
        *,
        product_images(*),
        product_variants(*, variant_attribute_values(attribute_value_id)),
        product_attributes(attribute_id, attributes(id, name, display_type, attribute_values(*)))
      `)
      .order("created_at", { ascending: false })
      .order("position", { referencedTable: "product_images", ascending: true })
      .order("position", { referencedTable: "product_variants", ascending: true });
    setLoading(false);
    if (error) {
      console.error(error);
      toast.error("Erreur lors du chargement des produits.");
      return;
    }
    // fetch categories names map (include parent_id for hierarchical filters)
    try {
      const { data: cats } = await supabase.from("categories").select("id,name,parent_id");
      const catsArr = (cats ?? []).map((c: any) => ({ id: c.id, name: c.name, parent_id: c.parent_id ?? null }));
      setCategoriesList(catsArr);
      setCategoriesMap(catsArr.reduce((acc: any, c: any) => ({ ...acc, [c.id]: c.name }), {}));
    } catch (e) {
      console.warn("could not load categories map", e);
    }
    const mapped = (data ?? []).map((d: any) => {
      // build this product's attribute list (id/name/type/values) from product_attributes -> attributes
      const attributes: ProductAttribute[] = (d.product_attributes ?? [])
        .map((pa: any) => pa.attributes)
        .filter(Boolean)
        .map((a: any): ProductAttribute => ({
          id: a.id,
          name: a.name,
          code: a.id, // the real attribute id doubles as the stable key used in variant.options
          type: a.display_type === "color_swatch" ? "swatch" : "button",
          values: (a.attribute_values ?? [])
            .slice()
            .sort((x: any, y: any) => (x.position ?? 0) - (y.position ?? 0))
            .map((v: any) => ({ id: v.id, label: v.value, hex: v.color_hex ?? undefined })),
        }));

      return {
        id: d.id,
        name: d.name,
        slug: d.slug,
        brand: d.brand ?? "",
        category_id: d.category_id,
        short_description: d.short_description ?? "",
        description: d.description ?? "",
        price: Number(d.base_price ?? 0),
        compare_at_price: d.compare_at_price ? Number(d.compare_at_price) : null,
        stock: d.stock_quantity ?? 0,
        sku: d.sku ?? "",
        is_active: d.is_active ?? true,
        is_new: false,
        rating: 0,
        reviews_count: 0,
        created_at: d.created_at ? d.created_at.slice(0, 10) : new Date().toISOString().slice(0, 10),
        images: (d.product_images ?? []).map((img: any): ProductImage => ({
          id: img.id, product_id: d.id, url: img.url, alt: "",
          position: img.position ?? 0, is_main: img.is_main ?? false, variant_value: img.variant_value ?? null,
        })),
        attributes,
        variants: (d.product_variants ?? []).map((v: any): ProductVariant => ({
          id: v.id,
          product_id: d.id,
          sku: v.sku ?? "",
          // rebuild {attribute_id: attribute_value_id} from the join table
          options: (v.variant_attribute_values ?? []).reduce((acc: Record<string, string>, link: any) => {
            const val = link.attribute_value_id as string;
            const attr = attributes.find((a) => a.values.some((x) => x.id === val));
            if (attr) acc[attr.id] = val;
            return acc;
          }, {}),
          price: Number(v.price),
          compare_at_price: v.compare_at_price ? Number(v.compare_at_price) : null,
          stock: v.stock_quantity ?? 0,
          is_active: v.is_active ?? true,
          position: v.position ?? 0,
        })),
        tags: [],
      };
    });
    setList(mapped);
  };

  const refresh = async () => { await fetchProducts(); };

  // image à afficher en priorité: celle marquée is_main, sinon la première par position
  const mainImage = (images: ProductImage[]) =>
    images.find((i) => i.is_main) ?? [...images].sort((a, b) => a.position - b.position)[0];

  const categoryMatches = (productCategoryId: string | null) => {
    if (categoryFilter === "all") return true;
    if (!productCategoryId) return false;
    const target = categoryFilter as string;
    if (productCategoryId === target) return true;
    let cur = categoriesList.find((c) => c.id === productCategoryId);
    while (cur) {
      if (!cur.parent_id) break;
      if (cur.parent_id === target) return true;
      cur = categoriesList.find((c) => c.id === cur?.parent_id);
    }
    return false;
  };

  const save = async () => {
    if (!draft.name.trim()) {
      toast.error("Le nom du produit est obligatoire.");
      return;
    }
    const slug = draft.slug.trim() || draft.name.toLowerCase().replace(/[^a-z0-9]+/g, "-");

    try {
      // ---- 1) produit ----
      let productId = draft.id;
      const productPayload = {
        name: draft.name,
        slug,
        brand: draft.brand || null,
        category_id: draft.category_id || null,
        short_description: draft.short_description || null,
        description: draft.description || null,
        base_price: draft.price || 0,
        sku: draft.sku || `SKU-${Date.now()}`,
        has_variants: draft.variants.length > 0,
        stock_quantity: draft.stock,
        is_active: draft.is_active,
      };
      if (!productId) {
        const { data, error } = await supabase.from("products").insert(productPayload).select().single();
        if (error) throw error;
        productId = data.id;
        // update draft with DB-generated fields so the UI shows them immediately
        setDraft((d) => ({ ...d, id: productId, sku: data.sku ?? d.sku, created_at: data.created_at ? data.created_at.slice(0, 10) : d.created_at }));
      } else {
        const { error } = await supabase.from("products").update(productPayload).eq("id", productId);
        if (error) throw error;
      }

      // ---- 2) attributs + valeurs (couleur, taille…) ----
      // On travaille sur une copie locale pour résoudre les ids réels tout de suite
      // (setDraft est asynchrone, on ne peut pas compter dessus dans la même fonction).
      const workingAttributes = draft.attributes.map((a) => ({ ...a, values: a.values.map((v) => ({ ...v })) }));
      const oldValueIdToNewValueId: Record<string, string> = {};

      for (const attr of workingAttributes) {
        const attrPayload = {
          name: attr.name,
          display_type: attr.type === "swatch" ? "color_swatch" : "select",
        };
        const isNewAttr = attr.id.startsWith("attr-");
        if (isNewAttr) {
          const { data, error } = await supabase.from("attributes").insert(attrPayload).select().single();
          if (error) throw error;
          attr.id = data.id;
        } else {
          const { error } = await supabase.from("attributes").update(attrPayload).eq("id", attr.id);
          if (error) throw error;
        }
        // lien produit <-> attribut (idempotent)
        const { error: linkErr } = await supabase
          .from("product_attributes")
          .upsert({ product_id: productId, attribute_id: attr.id }, { onConflict: "product_id,attribute_id" });
        if (linkErr) throw linkErr;

        for (const [i, val] of attr.values.entries()) {
          const oldId = val.id;
          const valPayload = {
            attribute_id: attr.id,
            value: val.label,
            color_hex: attr.type === "swatch" ? (val.hex ?? null) : null,
            position: i,
          };
          if (oldId.startsWith("val-")) {
            const { data, error } = await supabase.from("attribute_values").insert(valPayload).select().single();
            if (error) throw error;
            val.id = data.id;
          } else {
            const { error } = await supabase.from("attribute_values").update(valPayload).eq("id", val.id);
            if (error) throw error;
          }
          oldValueIdToNewValueId[oldId] = val.id;
        }
      }

      // supprimer les attributs retirés du produit (juste le lien produit<->attribut, on ne
      // touche pas à la table `attributes` qui pourrait être référencée ailleurs)
      if (draft.id) {
        const { data: existingLinks } = await supabase.from("product_attributes").select("attribute_id").eq("product_id", productId);
        const keepAttrIds = workingAttributes.map((a) => a.id);
        const toUnlink = (existingLinks ?? []).map((l: any) => l.attribute_id).filter((id: string) => !keepAttrIds.includes(id));
        if (toUnlink.length) {
          const { error } = await supabase.from("product_attributes").delete().eq("product_id", productId).in("attribute_id", toUnlink);
          if (error) throw error;
        }
      }

      // ---- 3) variantes ----
      const { data: existingVariantsRows } = await supabase.from("product_variants").select("id").eq("product_id", productId);
      const existingVariantIds = (existingVariantsRows ?? []).map((e: any) => e.id);
      const keptVariantIds: string[] = [];

      for (const [i, v] of draft.variants.entries()) {
        const isNewVariant = !existingVariantIds.includes(v.id);
        const payload = {
          product_id: productId,
          // un SKU vide ou dupliqué fait échouer l'insert (colonne UNIQUE) : on force un SKU
          // unique par défaut plutôt que de laisser Postgres rejeter silencieusement la ligne.
          sku: v.sku?.trim() || `${slug.toUpperCase()}-VAR-${Date.now()}-${i}`,
          price: v.price ?? 0,
          compare_at_price: v.compare_at_price ?? null,
          stock_quantity: v.stock ?? 0,
          is_active: v.is_active ?? true,
          position: i,
        };
        let variantId = v.id;
        if (isNewVariant) {
          const { data, error } = await supabase.from("product_variants").insert(payload).select().single();
          if (error) throw error;
          variantId = data.id;
          // replace temporary variant id in draft with DB id so generated fields appear
          setDraft((d) => ({ ...d, variants: d.variants.map((vv) => (vv.id === v.id ? { ...vv, id: variantId } : vv)) }));
        } else {
          const { error } = await supabase.from("product_variants").update(payload).eq("id", variantId);
          if (error) throw error;
        }
        keptVariantIds.push(variantId);

        // lien variante <-> valeurs d'attribut choisies (couleur/taille…)
        const resolvedValueIds = Object.values(v.options || {}).map((valId) => oldValueIdToNewValueId[valId] ?? valId);
        const { error: delLinksErr } = await supabase.from("variant_attribute_values").delete().eq("variant_id", variantId);
        if (delLinksErr) throw delLinksErr;
        if (resolvedValueIds.length) {
          const { error: insLinksErr } = await supabase
            .from("variant_attribute_values")
            .insert(resolvedValueIds.map((attribute_value_id) => ({ variant_id: variantId, attribute_value_id })));
          if (insLinksErr) throw insLinksErr;
        }
      }

      // supprimer les variantes retirées du produit (cascade sur variant_attribute_values / variant_images)
      const toDeleteVariants = existingVariantIds.filter((id: string) => !keptVariantIds.includes(id));
      if (toDeleteVariants.length) {
        const { error } = await supabase.from("product_variants").delete().in("id", toDeleteVariants);
        if (error) throw error;
      }

      toast.success(draft.id ? "Produit mis à jour." : "Produit créé.");
      await fetchProducts();
      setOpen(false);
    } catch (err) {
      console.error(err);
      const msg = (err as any)?.message ?? String(err);
      if (msg.includes("violates row-level security") || msg.includes("row-level security")) {
        toast.error("Insertion refusée par les policies RLS — vérifiez les policies DB ou connectez-vous en tant qu'admin.");
      } else if (msg.includes("duplicate key") || msg.includes("already exists")) {
        toast.error("Un SKU identique existe déjà — changez le SKU de la variante en conflit.");
      } else {
        toast.error(`Erreur lors de l'enregistrement : ${msg}`);
      }
    }
  };

  /* ---- gestion des attributs / variantes dans le formulaire ---- */
  const addAttribute = () => {
    const attr: ProductAttribute = {
      id: `attr-${Date.now()}`,
      name: "Couleur",
      code: `attr_${draft.attributes.length + 1}`,
      type: "swatch",
      values: [],
    };
    setDraft({ ...draft, attributes: [...draft.attributes, attr] });
  };

  const updateAttribute = (id: string, patch: Partial<ProductAttribute>) =>
    setDraft({
      ...draft,
      attributes: draft.attributes.map((a: ProductAttribute) => (a.id === id ? { ...a, ...patch } : a)),
    });

  const removeAttribute = (id: string) =>
    setDraft({
      ...draft,
      attributes: draft.attributes.filter((a) => a.id !== id),
      // on retire aussi ce choix de toutes les variantes qui l'utilisaient
      variants: draft.variants.map((v) => {
        const { [id]: _removed, ...rest } = v.options;
        return { ...v, options: rest };
      }),
    });

  const addValue = (attrId: string) =>
    updateAttribute(attrId, {
      values: [
        ...(draft.attributes.find((a) => a.id === attrId)?.values ?? []),
        { id: `val-${Date.now()}`, label: "Nouvelle valeur", hex: "#cccccc" },
      ],
    });

  const addVariant = () => {
    const variant: ProductVariant = {
      id: `v-${Date.now()}`,
      product_id: draft.id || "new",
      sku: `SKU-${draft.variants.length + 1}`,
      options: {},
      price: draft.price,
      compare_at_price: draft.compare_at_price,
      stock: 0,
      is_active: true,
      position: draft.variants.length,
    };
    setDraft({ ...draft, variants: [...draft.variants, variant] });
  };

  const updateVariant = (id: string, patch: Partial<ProductVariant>) =>
    setDraft({
      ...draft,
      variants: draft.variants.map((v: ProductVariant) => (v.id === id ? { ...v, ...patch } : v)),
    });

  // fixe la valeur choisie pour un attribut donné (ex: Couleur -> Rouge) sur une variante
  const setVariantOption = (variantId: string, attributeId: string, valueId: string) =>
    setDraft({
      ...draft,
      variants: draft.variants.map((v) =>
        v.id === variantId ? { ...v, options: { ...v.options, [attributeId]: valueId } } : v
      ),
    });

  const moveVariant = (id: string, dir: -1 | 1) => {
    const idx = draft.variants.findIndex((v) => v.id === id);
    const swapIdx = idx + dir;
    if (idx < 0 || swapIdx < 0 || swapIdx >= draft.variants.length) return;
    const next = [...draft.variants];
    const a = next[idx];
    const b = next[swapIdx];
    if (!a || !b) return;
    next[idx] = b;
    next[swapIdx] = a;
    setDraft({ ...draft, variants: next.map((v, i) => ({ ...v, position: i })) });
  };

  return (
    <div className="space-y-6">
      <div className="space-y-3">
        <div>
          <h1 className="text-2xl font-bold">Produits</h1>
          <p className="text-sm text-muted-foreground">{list.length} produits au catalogue.</p>
        </div>

        <div className="mt-8 flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-wrap items-center gap-2">
            <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Rechercher…" className="w-80 sm:w-96" />
            <Select value={stockFilter} onValueChange={(v) => setStockFilter(v as any)}>
              <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous les stocks</SelectItem>
                <SelectItem value="in">En stock (&gt;5)</SelectItem>
                <SelectItem value="low">Faible (&le;5)</SelectItem>
                <SelectItem value="out">Rupture</SelectItem>
              </SelectContent>
            </Select>
            <Select value={categoryFilter} onValueChange={(v) => setCategoryFilter(v as any)}>
              <SelectTrigger className="w-48"><SelectValue /></SelectTrigger>
              <SelectContent className="max-h-72">
                <SelectItem value="all">Toutes catégories</SelectItem>
                {Object.entries(categoriesMap).map(([id, name]) => (<SelectItem key={id} value={id}>{name}</SelectItem>))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center gap-2">
            <Button variant="ghost" onClick={refresh} title="Rafraîchir">↻</Button>
            <Button variant="accent" onClick={() => { setDraft(emptyProduct); setOpen(true); }}>
              <Plus className="h-4 w-4" /> Nouveau produit
            </Button>
          </div>
        </div>
      </div>

      <div className="max-h-[70vh] overflow-auto rounded-xl border border-border bg-card">
        <Table className="min-w-[900px]">
          <TableHeader className="sticky top-0 z-10 bg-card">
            <TableRow>
              <TableHead className="w-16"></TableHead>
              <TableHead>Produit</TableHead>
              <TableHead>Catégorie</TableHead>
              <TableHead>
                <button type="button" className="flex items-center gap-2" onClick={() => setPriceSort(priceSort === "asc" ? "desc" : "asc") }>
                  Prix
                  {priceSort === "asc" ? "▲" : priceSort === "desc" ? "▼" : null}
                </button>
              </TableHead>
              <TableHead>Stock</TableHead>
              <TableHead>Variantes</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="py-16 text-center">
                  <Package className="mx-auto h-8 w-8 text-muted-foreground" />
                  <p className="mt-2 text-muted-foreground">Aucun produit trouvé.</p>
                </TableCell>
              </TableRow>
            ) : (
              filtered.map((p) => (
                <TableRow key={p.id}>
                  <TableCell>
                    <Avatar>
                      {mainImage(p.images)?.url ? (
                        <AvatarImage src={mainImage(p.images)!.url} alt={p.name} />
                      ) : (
                        <AvatarFallback>{p.name.slice(0, 1)}</AvatarFallback>
                      )}
                    </Avatar>
                  </TableCell>
                  <TableCell>
                    <p className="font-medium">{p.name}</p>
                    <p className="text-xs text-muted-foreground">{p.brand}</p>
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {categoriesMap[p.category_id ?? ""] ?? "—"}
                  </TableCell>
                  <TableCell className="font-semibold">{formatPrice(p.price)}</TableCell>
                  <TableCell className={p.stock === 0 ? "font-semibold text-destructive" : ""}>{p.stock}</TableCell>
                  <TableCell className="text-muted-foreground">{p.variants.length}</TableCell>
                  <TableCell className="text-right">
                    <button
                      aria-label="Modifier"
                      className="mr-1 rounded p-1.5 text-muted-foreground hover:bg-surface"
                      onClick={() => { setDraft(p); setOpen(true); }}
                    >
                      <Pencil className="h-4 w-4" />
                    </button>
                    <button
                      aria-label="Voir"
                      className="mr-1 rounded p-1.5 text-muted-foreground hover:bg-surface"
                      onClick={() => setViewProduct(p)}
                    >
                      <Eye className="h-4 w-4" />
                    </button>
                    <button
                      aria-label="Supprimer"
                      className="rounded p-1.5 text-muted-foreground hover:bg-surface hover:text-destructive"
                      onClick={() => setConfirmDeleteId(p.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* View product dialog */}
      <Dialog open={Boolean(viewProduct)} onOpenChange={(v) => { if (!v) setViewProduct(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{viewProduct ? viewProduct.name : ""}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="flex gap-3">
              {[...(viewProduct?.images ?? [])].sort((a, b) => Number(b.is_main) - Number(a.is_main) || a.position - b.position).map((img) => (
                <Avatar key={img.id} className={img.is_main ? "ring-2 ring-accent-strong" : undefined}>
                  <AvatarImage src={img.url} alt={viewProduct?.name} />
                </Avatar>
              ))}
            </div>
            <p className="text-sm text-muted-foreground">{viewProduct?.short_description}</p>
            <p className="font-semibold">{formatPrice(viewProduct?.price ?? 0)}</p>
            <p className={viewProduct?.stock === 0 ? "font-semibold text-destructive" : ""}>Stock: {viewProduct?.stock}</p>

            {viewProduct?.variants && viewProduct.variants.length > 0 && (
              <div className="mt-4">
                <h4 className="text-sm font-bold">Variantes</h4>
                <div className="mt-2 space-y-2">
                  {[...viewProduct.variants].sort((a, b) => (a.position ?? 0) - (b.position ?? 0)).map((v) => (
                    <div key={v.id} className="flex items-center justify-between rounded-md border border-border p-2">
                      <div className="text-xs">
                        <div className="font-medium">{v.sku || "—"}</div>
                        <div className="text-muted-foreground">
                          {Object.entries(v.options || {})
                            .map(([attrId, valId]) => {
                              const attr = viewProduct.attributes.find((a) => a.id === attrId);
                              const val = attr?.values.find((x) => x.id === valId);
                              return attr && val ? `${attr.name}: ${val.label}` : null;
                            })
                            .filter(Boolean)
                            .join(" / ") || "—"}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-semibold">{formatPrice(v.price)}</div>
                        <div className={v.stock === 0 ? "font-semibold text-destructive text-sm" : "text-sm"}>Stock: {v.stock}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setViewProduct(null)}>Fermer</Button>
              <Button variant="accent" onClick={() => { if (viewProduct) { setDraft(viewProduct); setOpen(true); setViewProduct(null); } }}>Éditer</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Confirm delete dialog */}
      <Dialog open={Boolean(confirmDeleteId)} onOpenChange={(v) => { if (!v) setConfirmDeleteId(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirmer la suppression</DialogTitle>
          </DialogHeader>
          <p>Voulez-vous vraiment supprimer ce produit ? Cette action est irréversible.</p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmDeleteId(null)}>Annuler</Button>
            <Button variant="accent" className="bg-destructive hover:bg-destructive/90" onClick={async () => {
              const id = confirmDeleteId;
              if (!id) return;
              try {
                // fetch product images
                const { data: imgs, error: imgErr } = await supabase.from("product_images").select("url").eq("product_id", id);
                if (imgErr) throw imgErr;
                for (const img of (imgs ?? []) as any[]) {
                  const url = img?.url as string | undefined;
                  if (!url) continue;
                  const m = url.match(/\/storage\/v1\/object\/public\/([^/]+)\/(.+)$/);
                  if (m) {
                    const bucket = m[1]!;
                    const path = decodeURIComponent(m[2]!);
                    try {
                      await deleteFromBucket(bucket, path);
                    } catch (e) {
                      console.warn("failed to delete storage object", path, e);
                    }
                  }
                }
                // delete image rows
                const { error: delImgsErr } = await supabase.from("product_images").delete().eq("product_id", id);
                if (delImgsErr) throw delImgsErr;
                // delete product
                const { error } = await supabase.from("products").delete().eq("id", id);
                if (error) throw error;
                setList((p) => p.filter((x) => x.id !== id));
                toast.success("Produit supprimé.");
              } catch (err) {
                console.error(err);
                toast.error("Impossible de supprimer le produit.");
              } finally {
                setConfirmDeleteId(null);
              }
            }}>Supprimer</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[90vh] max-w-3xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{draft.id ? "Modifier le produit" : "Nouveau produit"}</DialogTitle>
          </DialogHeader>

          <Tabs defaultValue="general">
            <TabsList>
              <TabsTrigger value="general">Général</TabsTrigger>
              <TabsTrigger value="images">Images</TabsTrigger>
              <TabsTrigger value="variantes">Variantes</TabsTrigger>
            </TabsList>

            <TabsContent value="general">
              <ProductGeneral draft={draft} setDraft={(p) => setDraft(p)} categoriesMap={categoriesMap} />
            </TabsContent>

            <TabsContent value="images">
              <ProductImages draft={draft} setDraft={(p) => setDraft(p)} />
            </TabsContent>

            <TabsContent value="variantes">
              <AttributesVariants
                draft={draft}
                setDraft={(p) => setDraft(p)}
                addAttribute={addAttribute}
                addValue={addValue}
                addVariant={addVariant}
                updateAttribute={updateAttribute}
                removeAttribute={removeAttribute}
                updateVariant={updateVariant}
                setVariantOption={setVariantOption}
                moveVariant={moveVariant}
              />
            </TabsContent>
          </Tabs>

          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Annuler</Button>
            <Button variant="accent" onClick={save}>Enregistrer</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}