import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ImagePlus, Package, Pencil, Plus, Trash2, X } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/lib/supabaseClient";
import { uploadToBucket } from "@/lib/storage";
import type { Product, ProductAttribute, ProductVariant, ProductImage } from "@/types";
import { formatPrice } from "@/lib/placeholder";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
  id: "", name: "", slug: "", brand: "", category_id: "c-info-pc-portable",
  short_description: "", description: "", price: 0, compare_at_price: null, stock: 0,
  sku: "", is_active: true, is_new: false, rating: 0, reviews_count: 0,
  created_at: new Date().toISOString().slice(0, 10),
  images: [], attributes: [], variants: [], tags: [],
};

function AdminProducts() {
  const [list, setList] = useState<Product[]>([]);
  const [loading, setLoading] = useState(false);
  const [categoriesMap, setCategoriesMap] = useState<Record<string, string>>({});
  useEffect(() => { fetchProducts(); }, []);
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<Product>(emptyProduct);

  const filtered = list.filter(
    (p) =>
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.brand.toLowerCase().includes(search.toLowerCase()),
  );

  const fetchProducts = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("products")
      .select("*, product_images(*), product_variants(*)")
      .order("created_at", { ascending: false });
    setLoading(false);
    if (error) {
      console.error(error);
      toast.error("Erreur lors du chargement des produits.");
      return;
    }
    // fetch categories names map
    try {
      const { data: cats } = await supabase.from("categories").select("id,name");
      setCategoriesMap((cats ?? []).reduce((acc: any, c: any) => ({ ...acc, [c.id]: c.name }), {}));
    } catch (e) {
      console.warn("could not load categories map", e);
    }
    const mapped = (data ?? []).map((d: any) => ({
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
      images: (d.product_images ?? []).map((img: any) : ProductImage => ({ id: img.id, product_id: d.id, url: img.url, alt: "", position: img.position ?? 0, variant_value: null })),
      attributes: [],
      variants: (d.product_variants ?? []).map((v: any) : ProductVariant => ({ id: v.id, product_id: d.id, sku: v.sku ?? "", options: {}, price: Number(v.price), compare_at_price: v.compare_at_price ? Number(v.compare_at_price) : null, stock: v.stock_quantity ?? 0, is_active: v.is_active ?? true })),
      tags: [],
    }));
    setList(mapped);
  };

  const save = async () => {
    if (!draft.name.trim()) {
      toast.error("Le nom du produit est obligatoire.");
      return;
    }
    const slug = draft.slug.trim() || draft.name.toLowerCase().replace(/[^a-z0-9]+/g, "-");

    try {
      if (!draft.id) {
        const insert = {
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
        const { data, error } = await supabase.from("products").insert(insert).select().single();
        if (error) throw error;
        setDraft({ ...draft, id: data.id });
        toast.success("Produit créé.");
      } else {
        const upd = {
          name: draft.name,
          slug,
          brand: draft.brand || null,
          category_id: draft.category_id || null,
          short_description: draft.short_description || null,
          description: draft.description || null,
          base_price: draft.price || 0,
          sku: draft.sku || null,
          has_variants: draft.variants.length > 0,
          stock_quantity: draft.stock,
          is_active: draft.is_active,
        };
        const { error } = await supabase.from("products").update(upd).eq("id", draft.id);
        if (error) throw error;
        toast.success("Produit mis à jour.");
      }
      await fetchProducts();
      setOpen(false);
    } catch (err) {
      console.error(err);
      const msg = (err as any)?.message ?? String(err);
      if (msg.includes("violates row-level security") || msg.includes("row-level security")) {
        toast.error("Insertion refusée par les policies RLS — vérifiez les policies DB ou connectez-vous en tant qu'admin.");
      } else {
        toast.error("Erreur lors de l'enregistrement.");
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
    };
    setDraft({ ...draft, variants: [...draft.variants, variant] });
  };

  const updateVariant = (id: string, patch: Partial<ProductVariant>) =>
    setDraft({
      ...draft,
      variants: draft.variants.map((v: ProductVariant) => (v.id === id ? { ...v, ...patch } : v)),
    });

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Produits</h1>
          <p className="text-sm text-muted-foreground">{list.length} produits au catalogue.</p>
        </div>
        <div className="flex gap-2">
          <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Rechercher…" className="w-48" />
          <Button variant="accent" onClick={() => { setDraft(emptyProduct); setOpen(true); }}>
            <Plus className="h-4 w-4" /> Nouveau produit
          </Button>
        </div>
      </div>

      <div className="overflow-x-auto rounded-xl border border-border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-16"></TableHead>
              <TableHead>Produit</TableHead>
              <TableHead>Catégorie</TableHead>
              <TableHead>Prix</TableHead>
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
                    <img src={p.images[0]?.url} alt="" className="h-10 w-10 rounded-md bg-surface object-cover" />
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
                      aria-label="Supprimer"
                      className="rounded p-1.5 text-muted-foreground hover:bg-surface hover:text-destructive"
                      onClick={() => { setList((prev) => prev.filter((x) => x.id !== p.id)); toast.success("Produit supprimé."); }}
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

            <TabsContent value="general" className="grid gap-4 pt-5 sm:grid-cols-2">
              <div className="space-y-2 sm:col-span-2">
                <Label>Nom</Label>
                <Input value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>Marque</Label>
                <Input value={draft.brand} onChange={(e) => setDraft({ ...draft, brand: e.target.value })} />
              </div>
                <div className="space-y-2">
                <Label>Catégorie</Label>
                <Select value={(draft.category_id ?? "") as string} onValueChange={(v) => setDraft({ ...draft, category_id: v || null })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent className="max-h-72">
                    {Object.entries(categoriesMap).map(([id, name]) => (
                      <SelectItem key={id} value={id}>{name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Prix (DT)</Label>
                <Input type="number" value={draft.price} onChange={(e) => setDraft({ ...draft, price: Number(e.target.value) })} />
              </div>
              <div className="space-y-2">
                <Label>Prix barré (DT)</Label>
                <Input
                  type="number"
                  value={draft.compare_at_price ?? ""}
                  onChange={(e) => setDraft({ ...draft, compare_at_price: e.target.value ? Number(e.target.value) : null })}
                />
              </div>
              <div className="space-y-2">
                <Label>Stock</Label>
                <Input type="number" value={draft.stock} onChange={(e) => setDraft({ ...draft, stock: Number(e.target.value) })} />
              </div>
              <div className="space-y-2">
                <Label>Slug</Label>
                <Input value={draft.slug} onChange={(e) => setDraft({ ...draft, slug: e.target.value })} placeholder="auto" />
              </div>
              <div className="space-y-2 sm:col-span-2">
                <Label>Description courte</Label>
                <Input value={draft.short_description} onChange={(e) => setDraft({ ...draft, short_description: e.target.value })} />
              </div>
              <div className="space-y-2 sm:col-span-2">
                <Label>Description</Label>
                <Textarea rows={4} value={draft.description} onChange={(e) => setDraft({ ...draft, description: e.target.value })} />
              </div>
              <div className="flex items-center gap-3">
                <Switch checked={draft.is_active} onCheckedChange={(v) => setDraft({ ...draft, is_active: v })} />
                <Label className="font-normal">Produit actif</Label>
              </div>
              <div className="flex items-center gap-3">
                <Switch checked={draft.is_new} onCheckedChange={(v) => setDraft({ ...draft, is_new: v })} />
                <Label className="font-normal">Badge « Nouveau »</Label>
              </div>
            </TabsContent>

            <TabsContent value="images" className="pt-5">
              <div className="flex flex-wrap gap-3">
                {draft.images.map((img) => (
                  <div key={img.id} className="relative">
                    <img src={img.url} alt="" className="h-24 w-24 rounded-lg border border-border object-cover" />
                    <button
                      aria-label="Supprimer l'image"
                      className="absolute -right-2 -top-2 grid h-6 w-6 place-items-center rounded-full bg-card shadow-card"
                      onClick={async () => {
                        if (!draft.id) {
                          setDraft({ ...draft, images: draft.images.filter((i) => i.id !== img.id) });
                          return;
                        }
                        try {
                          await supabase.from("product_images").delete().eq("id", img.id);
                          setDraft({ ...draft, images: draft.images.filter((i) => i.id !== img.id) });
                          toast.success("Image supprimée.");
                        } catch (e) {
                          console.error(e);
                          toast.error("Impossible de supprimer l'image.");
                        }
                      }}
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                    {img.variant_value && (
                      <span className="mt-1 block max-w-24 truncate text-[10px] text-muted-foreground">
                        {img.variant_value}
                      </span>
                    )}
                  </div>
                ))}

                <label className="grid h-24 w-24 place-items-center rounded-lg border-2 border-dashed border-border text-muted-foreground hover:border-accent-strong hover:text-accent-strong cursor-pointer">
                  <input
                    type="file"
                    className="hidden"
                    accept="image/*"
                    onChange={async (e) => {
                        const file = e.target.files?.[0];
                        if (!file) return;
                        try {
                          // Ensure product exists first and capture its id immediately
                          let productId = draft.id;
                          if (!productId) {
                            const { data, error } = await supabase.from("products").insert({
                              name: draft.name || "Untitled",
                              slug: draft.slug || `prod-${Date.now()}`,
                              base_price: draft.price || 0,
                            }).select().single();
                            if (error) throw error;
                            productId = data.id;
                            setDraft((d) => ({ ...d, id: productId }));
                          }

                          // sanitize filename: keep letters, numbers, dash, underscore and dot
                          const rawName = file.name.replace(/\s+/g, "_");
                          const safeName = rawName.replace(/[^a-zA-Z0-9._-]/g, "");

                          // Use productId as first path segment (don't repeat the bucket name)
                          const path = `${productId}/${Date.now()}-${safeName}`;
                          const publicUrl = await uploadToBucket("products", path, file);

                          const { error } = await supabase.from("product_images").insert({ product_id: productId, url: publicUrl }).select();
                          if (error) throw error;

                          // refresh images
                          const { data: refreshed } = await supabase.from("product_images").select("*").eq("product_id", productId).order("position");
                          setDraft((d) => ({ ...d, images: (refreshed ?? []).map((img: any) => ({ id: img.id, product_id: img.product_id, url: img.url, alt: "", position: img.position ?? 0, variant_value: null })) }));
                          toast.success("Image uploadée.");
                        } catch (err) {
                          console.error(err);
                          const msg = (err as any)?.message ?? String(err);
                          if (msg.includes("violates row-level security") || msg.includes("row-level security")) {
                            toast.error("Upload refusé par les policies RLS — vérifiez que l'utilisateur est admin ou ajustez les policies DB.");
                          } else {
                            toast.error("Échec de l'upload.");
                          }
                        }
                      }}
                  />
                  <ImagePlus className="h-6 w-6" />
                </label>
              </div>
              <p className="mt-3 text-xs text-muted-foreground">
                Rattachez une image à une valeur d'attribut (couleur) pour que la galerie change avec la variante.
              </p>
            </TabsContent>

            <TabsContent value="variantes" className="space-y-6 pt-5">
              <section>
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold uppercase tracking-wide">Attributs</h3>
                  <Button size="sm" variant="outline" onClick={addAttribute}>
                    <Plus className="h-4 w-4" /> Attribut
                  </Button>
                </div>
                {draft.attributes.length === 0 ? (
                  <p className="mt-3 rounded-lg border border-dashed border-border py-8 text-center text-sm text-muted-foreground">
                    Aucun attribut. Ajoutez « Couleur » ou « Taille » pour créer des variantes.
                  </p>
                ) : (
                  <div className="mt-3 space-y-4">
                    {draft.attributes.map((attr) => (
                      <div key={attr.id} className="rounded-lg border border-border p-4">
                        <div className="grid gap-3 sm:grid-cols-3">
                          <div className="space-y-1">
                            <Label className="text-xs">Nom</Label>
                            <Input value={attr.name} onChange={(e) => updateAttribute(attr.id, { name: e.target.value })} />
                          </div>
                          <div className="space-y-1">
                            <Label className="text-xs">Code</Label>
                            <Input value={attr.code} onChange={(e) => updateAttribute(attr.id, { code: e.target.value })} />
                          </div>
                          <div className="space-y-1">
                            <Label className="text-xs">Affichage</Label>
                            <Select value={attr.type} onValueChange={(v) => updateAttribute(attr.id, { type: v as ProductAttribute["type"] })}>
                              <SelectTrigger><SelectValue /></SelectTrigger>
                              <SelectContent>
                                <SelectItem value="swatch">Pastille couleur</SelectItem>
                                <SelectItem value="button">Bouton</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        </div>

                        <div className="mt-3 space-y-2">
                          {attr.values.map((val) => (
                            <div key={val.id} className="flex items-center gap-2">
                              <Input
                                className="flex-1"
                                value={val.label}
                                onChange={(e) =>
                                  updateAttribute(attr.id, {
                                    values: attr.values.map((v) => (v.id === val.id ? { ...v, label: e.target.value } : v)),
                                  })
                                }
                              />
                              {attr.type === "swatch" && (
                                <input
                                  type="color"
                                  aria-label="Couleur"
                                  value={val.hex ?? "#cccccc"}
                                  onChange={(e) =>
                                    updateAttribute(attr.id, {
                                      values: attr.values.map((v) => (v.id === val.id ? { ...v, hex: e.target.value } : v)),
                                    })
                                  }
                                  className="h-9 w-12 cursor-pointer rounded border border-border bg-card"
                                />
                              )}
                              <button
                                aria-label="Supprimer la valeur"
                                className="rounded p-2 text-muted-foreground hover:text-destructive"
                                onClick={() => updateAttribute(attr.id, { values: attr.values.filter((v) => v.id !== val.id) })}
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            </div>
                          ))}
                          <Button size="sm" variant="ghost" onClick={() => addValue(attr.id)}>
                            <Plus className="h-4 w-4" /> Ajouter une valeur
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </section>

              <section>
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold uppercase tracking-wide">Variantes</h3>
                  <Button size="sm" variant="outline" onClick={addVariant}>
                    <Plus className="h-4 w-4" /> Variante
                  </Button>
                </div>
                {draft.variants.length === 0 ? (
                  <p className="mt-3 rounded-lg border border-dashed border-border py-8 text-center text-sm text-muted-foreground">
                    Aucune variante — le produit sera vendu en version unique.
                  </p>
                ) : (
                  <div className="mt-3 overflow-x-auto rounded-lg border border-border">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>SKU</TableHead>
                          <TableHead>Options</TableHead>
                          <TableHead className="w-28">Prix</TableHead>
                          <TableHead className="w-24">Stock</TableHead>
                          <TableHead className="w-12"></TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {draft.variants.map((v) => (
                          <TableRow key={v.id}>
                            <TableCell>
                              <Input value={v.sku} onChange={(e) => updateVariant(v.id, { sku: e.target.value })} />
                            </TableCell>
                            <TableCell className="text-xs text-muted-foreground">
                              {Object.entries(v.options)
                                .map(([code, valueId]) => {
                                  const attr = draft.attributes.find((a) => a.code === code);
                                  return attr?.values.find((x) => x.id === valueId)?.label ?? valueId;
                                })
                                .join(" / ") || "—"}
                            </TableCell>
                            <TableCell>
                              <Input type="number" value={v.price} onChange={(e) => updateVariant(v.id, { price: Number(e.target.value) })} />
                            </TableCell>
                            <TableCell>
                              <Input type="number" value={v.stock} onChange={(e) => updateVariant(v.id, { stock: Number(e.target.value) })} />
                            </TableCell>
                            <TableCell>
                              <button
                                aria-label="Supprimer la variante"
                                className="rounded p-1.5 text-muted-foreground hover:text-destructive"
                                onClick={() => setDraft({ ...draft, variants: draft.variants.filter((x) => x.id !== v.id) })}
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </section>
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
