import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ImagePlus, Package, Edit2, Plus, Trash2, X, Eye } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/lib/supabaseClient";
import { uploadToBucket, deleteFromBucket } from "@/lib/storage";
import type { Product, ProductAttribute, ProductVariant, ProductImage } from "@/types";
import { formatPrice } from "@/lib/placeholder";
import { Button } from "@/components/ui/button";
import Spinner from "@/components/ui/spinner";
import SortArrow from "@/components/ui/sort-arrow";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import ProductGeneral from "@/components/admin/ProductGeneral";
import ProductImages from "@/components/admin/ProductImages";
import { cn } from "@/lib/utils";
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
import { genId } from "@/lib/uid";
import { RichText } from "@/components/ui/rich-text";
import { takeAdminFocus } from "@/lib/admin-focus";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";

export const Route = createFileRoute("/admin/produits")({
  // Liens profonds depuis les alertes de stock : `?produit=<uuid>`, ou
  // `?nom=<nom>` pour les alertes antérieures dont le lien n'avait pas d'id.
  validateSearch: (search: Record<string, unknown>): { produit?: string; nom?: string } => ({
    ...(typeof search["produit"] === "string" ? { produit: search["produit"] } : {}),
    ...(typeof search["nom"] === "string" ? { nom: search["nom"] } : {}),
  }),
  component: AdminProducts,
});

const emptyProduct: Product = {
  id: "", name: "", slug: "", brand: "", category_id: "",
  short_description: "", description: "", price: 0, cost_price: null, compare_at_price: null, stock: 0,
  sku: "", is_active: true, is_new: false, rating: 0, reviews_count: 0,
  created_at: new Date().toISOString().slice(0, 10),
  images: [], attributes: [], variants: [], tags: [],
};

function applyPromotion(price: number, promotion?: { discount_type: string | null; discount_value: number }) {
  if (!promotion) return null;
  if (promotion.discount_type === "percentage") return Math.max(0, price * (1 - promotion.discount_value / 100));
  if (promotion.discount_type === "fixed") return Math.max(0, price - promotion.discount_value);
  return null;
}

function AdminProducts() {
  const [list, setList] = useState<Product[]>([]);
  const [loading, setLoading] = useState(false);
  const [categoriesMap, setCategoriesMap] = useState<Record<string, string>>({});
  const [categoriesList, setCategoriesList] = useState<{ id: string; parent_id: string | null; name: string }[]>([]);
  const [stockFilter, setStockFilter] = useState<"all" | "in" | "low" | "out">("all");
  const [categoryFilter, setCategoryFilter] = useState<string | "all">("all");
  const [priceSort, setPriceSort] = useState<"asc" | "desc" | null>(null);
  const [stockSort, setStockSort] = useState<"asc" | "desc" | null>(null);
  const [viewProduct, setViewProduct] = useState<Product | null>(null);
  const { produit: focusProductId, nom: focusProductName } = Route.useSearch();
  // Cible transmise par la boîte de réception (cf. lib/admin-focus).
  const [relayFocus, setRelayFocus] = useState<Record<string, string> | null>(null);
  useEffect(() => {
    setRelayFocus(takeAdminFocus("/admin/produits"));
  }, []);
  const focusNavigate = useNavigate();
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  // Sélection de variante par ATTRIBUT (ex: { attrCouleurId: valRougeId, attrTailleId: valMId })
  // plutôt que par id de variante directement — reproduit le comportement de la fiche
  // produit boutique où l'on choisit des options une par une jusqu'à résoudre la variante.
  const [selectedOptions, setSelectedOptions] = useState<Record<string, string>>({});
  const [selectedImageId, setSelectedImageId] = useState<string | null>(null);

  const [toggleConfirm, setToggleConfirm] = useState<{ id: string; next: boolean } | null>(null);
  const [isToggling, setIsToggling] = useState(false);
  const [togglingNewId, setTogglingNewId] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  useEffect(() => { fetchProducts(); }, []);
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);
  const [showRequiredErrors, setShowRequiredErrors] = useState(false);
  const [draft, setDraft] = useState<Product>(emptyProduct);
  const [removedAttributeIds, setRemovedAttributeIds] = useState<string[]>([]);
  const [currentPage, setCurrentPage] = useState(1);

  // client-side filtering + sorting
  let filtered = list.filter((p) => {
    const query = search.toLowerCase();
    return p.name.toLowerCase().includes(query)
      || p.brand.toLowerCase().includes(query)
      || p.sku.toLowerCase().includes(query)
      || p.variants.some((variant) => variant.sku.toLowerCase().includes(query));
  });
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
  const togglePriceSort = () => {
    setPriceSort((prev) => {
      const next = prev === "asc" ? "desc" : prev === "desc" ? null : "asc";
      if (next !== null) setStockSort(null);
      return next;
    });
  };

  const toggleStockSort = () => {
    setStockSort((prev) => {
      const next = prev === "asc" ? "desc" : prev === "desc" ? null : "asc";
      if (next !== null) setPriceSort(null);
      return next;
    });
  };

  // price sort
  if (priceSort) {
    filtered = [...filtered].sort((a, b) => (priceSort === "asc" ? a.price - b.price : b.price - a.price));
  } else if (stockSort) {
    filtered = [...filtered].sort((a, b) => (stockSort === "asc" ? a.stock - b.stock : b.stock - a.stock));
  }

  const pageSize = 10;
  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const paginatedProducts = filtered.slice((currentPage - 1) * pageSize, currentPage * pageSize);
  const pageStart = (currentPage - 1) * pageSize + 1;
  const pageEnd = Math.min(currentPage * pageSize, filtered.length);

  useEffect(() => {
    setCurrentPage(1);
  }, [search, stockFilter, categoryFilter, priceSort, stockSort]);

  useEffect(() => {
    if (currentPage > totalPages) setCurrentPage(totalPages);
  }, [currentPage, totalPages]);

  const looksLikeImageValue = (value: unknown) => {
    const stringValue = String(value ?? "");
    return /^(https?:\/\/|data:image\/|\/)/i.test(stringValue) || /\.(png|jpe?g|webp|gif|svg)(\?.*)?$/i.test(stringValue);
  };

  const fetchProducts = async () => {
    setLoading(true);
    const { data, error } = await supabase.from("products").select(`
        *,
        product_images(*),
        product_variants(*, variant_attribute_values(attribute_value_id)),
        product_attributes(attribute_id, attributes(id, name, display_type, attribute_values(*)))
      `).order("created_at", { ascending: false }).order("position", {
      referencedTable: "product_images",
      ascending: true,
    }).order("position", {
      referencedTable: "product_variants",
      ascending: true,
    });
    setLoading(false);
    if (error) {
      console.error(error);
      toast.error("Erreur lors du chargement des produits.");
      return;
    }
    try {
      const { data: cats } = await supabase.from("categories").select("id,name,parent_id");
      const catsArr = (cats ?? []).map((c: any) => ({
        id: c.id,
        name: c.name,
        // Une catégorie racine se référence elle-même (cf.
        // database/categories-parent-id.sql) : sans ce retour à null, les
        // remontées d'ancêtres plus bas bouclent indéfiniment.
        parent_id: c.parent_id && c.parent_id !== c.id ? c.parent_id : null,
      }));
      setCategoriesList(catsArr);
      setCategoriesMap(catsArr.reduce((acc: Record<string, string>, c: any) => ({ ...acc, [c.id]: c.name }), {}));
    } catch (e) {
      console.warn("could not load categories map", e);
    }
    const mapped = (data ?? []).map((d: any) => {
      const attributes = (d.product_attributes ?? []).map((pa: any) => pa.attributes).filter(Boolean).map((a: any) => {
        const values = (a.attribute_values ?? []).slice().sort((x: any, y: any) => (x.position ?? 0) - (y.position ?? 0));
        const isImageAttribute = a.display_type === "image_swatch" || values.some((v: any) => looksLikeImageValue(v.value));
        return {
          id: a.id,
          name: a.name,
          code: a.id,
          type: a.display_type === "color_swatch" ? "swatch" : isImageAttribute ? "image" : "button",
          values: values.map((v: any) => ({
            id: v.id,
            label: v.value,
            image_url: isImageAttribute ? v.value : undefined,
            hex: v.color_hex ?? undefined,
          })),
        };
      });
      return {
        id: d.id,
        name: d.name,
        slug: d.slug,
        brand: d.brand ?? "",
        category_id: d.category_id,
        short_description: d.short_description ?? "",
        description: d.description ?? "",
        price: Number(d.base_price ?? 0),
        cost_price: d.cost_price == null ? null : Number(d.cost_price),
        compare_at_price: d.compare_at_price ? Number(d.compare_at_price) : null,
        stock: d.stock_quantity ?? 0,
        sku: d.sku ?? "",
        is_active: d.is_active ?? true,
        is_new: d.is_new ?? false,
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
          options: (v.variant_attribute_values ?? []).reduce((acc: Record<string, string>, link: any) => {
            const val = link.attribute_value_id as string;
            const attr = attributes.find((a) => a.values.some((x) => x.id === val));
            if (attr) acc[attr.id] = val;
            return acc;
          }, {}),
          price: Number(v.price),
          compare_at_price: v.compare_at_price ? Number(v.compare_at_price) : null,
          cost_price: v.cost_price == null ? null : Number(v.cost_price),
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

  useEffect(() => {
    const wantedId = focusProductId ?? relayFocus?.["produit"];
    const wantedName = focusProductName ?? relayFocus?.["nom"];
    if (!wantedId && !wantedName) return;
    const target = list.find(
      (p) =>
        (wantedId && p.id === wantedId) ||
        (wantedName && p.name.trim() === wantedName.trim()),
    );
    if (!target) return;
    setViewProduct(target);
    setRelayFocus(null);
    setSelectedOptions({});
    setSelectedImageId(null);
    focusNavigate({ to: "/admin/produits", search: {}, replace: true });
  }, [focusProductId, focusProductName, relayFocus, list, focusNavigate]);

  // Badge « Nouveau » : simple mise en avant en boutique, pas de confirmation.
  const toggleIsNew = async (id: string, next: boolean) => {
    setTogglingNewId(id);
    setList((prev) => prev.map((x) => (x.id === id ? { ...x, is_new: next } : x)));
    try {
      const { error } = await supabase.from("products").update({ is_new: next }).eq("id", id);
      if (error) throw error;
      toast.success(next ? "Badge « Nouveau » activé." : "Badge « Nouveau » retiré.");
    } catch (err) {
      console.error("toggle is_new", err);
      setList((prev) => prev.map((x) => (x.id === id ? { ...x, is_new: !next } : x)));
      toast.error("Impossible de mettre à jour le badge « Nouveau ».");
    } finally {
      setTogglingNewId(null);
    }
  };

  // image à afficher en priorité: celle marquée is_main, sinon la première par position
  const mainImage = (images: ProductImage[]) =>
    images.find((i) => i.is_main) ?? [...images].sort((a, b) => a.position - b.position)[0];

  const priceRangeForProduct = (product: Product) => {
    if (product.variants.length === 0) return { min: Number(product.price ?? 0), max: Number(product.price ?? 0) };
    const prices = product.variants.map((variant) => Number(variant.price ?? 0));
    return { min: Math.min(...prices), max: Math.max(...prices) };
  };

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
    if (isSaving) return;
    setShowRequiredErrors(true);
    if (!draft.name.trim()) {
      toast.error("Le nom du produit est obligatoire.");
      document.querySelector<HTMLInputElement>("input[autoFocus]")?.focus();
      return;
    }
    if (!draft.short_description.trim()) {
      toast.error("La description courte est obligatoire.");
      document.getElementById("product-short-description")?.focus();
      return;
    }
    if (!draft.category_id) {
      toast.error("La catégorie est obligatoire.");
      document.getElementById("product-category")?.focus();
      return;
    }
    const slug = draft.slug.trim() || draft.name.toLowerCase().replace(/[^a-z0-9]+/g, "-");
    setIsSaving(true);

    try {
      // ---- 1) produit ----
      let productId = draft.id;
      let activePromotions: Array<{
        variant_id: string | null;
        discount_type: string | null;
        discount_value: number;
        starts_at: string | null;
        ends_at: string | null;
      }> = [];
      if (productId) {
        const { data: promotionRows, error: promotionError } = await supabase
          .from("promotions")
          .select("variant_id,discount_type,discount_value,starts_at,ends_at")
          .eq("product_id", productId)
          .eq("is_active", true);
        if (promotionError) throw promotionError;
        const now = Date.now();
        activePromotions = (promotionRows ?? []).filter((promotion: any) => {
          const startsAt = promotion.starts_at ? new Date(promotion.starts_at).getTime() : -Infinity;
          const endsAt = promotion.ends_at ? new Date(promotion.ends_at).getTime() : Infinity;
          return startsAt <= now && endsAt >= now;
        }).map((promotion: any) => ({
          variant_id: promotion.variant_id ?? null,
          discount_type: promotion.discount_type ?? null,
          discount_value: Number(promotion.discount_value ?? 0),
          starts_at: promotion.starts_at ?? null,
          ends_at: promotion.ends_at ?? null,
        }));
      }
      const computedGlobalStock = draft.variants.length > 0
        ? draft.variants.reduce((sum, v) => sum + Number(v.stock ?? 0), 0)
        : Number(draft.stock ?? 0);
      const computedBasePrice = draft.variants.length > 0
        ? draft.variants.reduce((min, v) => Math.min(min, Number(v.price ?? 0)), Number(draft.price ?? 0))
        : Number(draft.price ?? 0);
      const globalPromotion = activePromotions.find((promotion) => promotion.variant_id === null);
      const globalSellPrice = applyPromotion(computedBasePrice, globalPromotion);
      const productPayload = {
        name: draft.name,
        slug,
        brand: draft.brand || null,
        category_id: draft.category_id,
        short_description: draft.short_description.trim(),
        description: draft.description || null,
        base_price: computedBasePrice,
        cost_price: globalSellPrice != null && globalSellPrice < computedBasePrice ? globalSellPrice : null,
        sku: draft.sku || `SKU-${Date.now()}`,
        has_variants: draft.variants.length > 0,
        stock_quantity: computedGlobalStock,
        is_active: draft.is_active,
        is_new: draft.is_new ?? false,
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
          display_type: attr.type === "swatch" ? "color_swatch" : attr.type === "image" ? "image_swatch" : "select",
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

        // ---- Valeurs de cet attribut : on gère aussi la SUPPRESSION ----
        // Avant, on ne faisait qu'insert/update sur les valeurs présentes dans
        // draft.attributes — si l'utilisateur retirait une valeur côté UI (bouton
        // "supprimer" sur une couleur/taille), rien ne la supprimait jamais en
        // base : elle réapparaissait après rechargement. On calcule ici la
        // différence entre les valeurs existantes en base et celles gardées
        // dans le draft pour supprimer le reste.
        const { data: existingValueRows, error: existingValuesError } = await supabase
          .from("attribute_values")
          .select("id")
          .eq("attribute_id", attr.id);
        if (existingValuesError) throw existingValuesError;
        const keptValueIds: string[] = [];

        for (const [i, val] of attr.values.entries()) {
          const oldId = val.id;
          const valPayload = {
            attribute_id: attr.id,
            value: attr.type === "image" ? (val.image_url || val.label) : val.label,
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
          keptValueIds.push(val.id);
        }

        const valueIdsToDelete = (existingValueRows ?? [])
          .map((row: any) => row.id as string)
          .filter((id: string) => !keptValueIds.includes(id));
        if (valueIdsToDelete.length) {
          const { error: delValuesErr } = await supabase
            .from("attribute_values")
            .delete()
            .in("id", valueIdsToDelete);
          if (delValuesErr) throw delValuesErr;
        }
      }

      // supprimer les attributs retirés du produit (juste le lien produit<->attribut, on ne
      // touche pas à la table `attributes` qui pourrait être référencée ailleurs)
      if (productId) {
        const { data: existingLinks, error: existingLinksError } = await supabase
          .from("product_attributes")
          .select("attribute_id")
          .eq("product_id", productId);
        if (existingLinksError) throw existingLinksError;
        const keepAttrIds = workingAttributes.map((a) => a.id);
        const removedByDiff = (existingLinks ?? [])
          .map((l: any) => l.attribute_id)
          .filter((id: string) => !keepAttrIds.includes(id));
        const toUnlink = [...new Set([...removedByDiff, ...removedAttributeIds])];
        if (toUnlink.length) {
          const { error } = await supabase.from("product_attributes").delete().eq("product_id", productId).in("attribute_id", toUnlink);
          if (error) throw error;

          // Les attributs créés pour ce produit ne doivent pas rester visibles
          // après leur retrait. On conserve ceux encore utilisés ailleurs.
          for (const attributeId of toUnlink) {
            const { data: remainingLinks, error: remainingLinksError } = await supabase
              .from("product_attributes")
              .select("product_id")
              .eq("attribute_id", attributeId)
              .limit(1);
            if (remainingLinksError) throw remainingLinksError;
            if (!remainingLinks?.length) {
              const { error: deleteAttributeError } = await supabase.from("attributes").delete().eq("id", attributeId);
              if (deleteAttributeError) throw deleteAttributeError;
            }
          }
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
          sku: v.sku?.trim() || null,
          price: v.price ?? 0,
          cost_price: (() => {
            const promotion = activePromotions.find(
              (item) => item.variant_id === v.id || item.variant_id === null,
            );
            const sellPrice = applyPromotion(Number(v.price ?? 0), promotion);
            return sellPrice != null && sellPrice < Number(v.price ?? 0) ? sellPrice : null;
          })(),
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

      // ---- 4) images : upload et associations au clic sur Enregistrer ----
      const { data: existingImageRows, error: existingImagesError } = await supabase
        .from("product_images")
        .select("id,url")
        .eq("product_id", productId);
      if (existingImagesError) throw existingImagesError;

      const keptImageIds: string[] = [];
      for (const [i, image] of draft.images.entries()) {
        const mappedVariantValue = image.variant_value
          ? (oldValueIdToNewValueId[image.variant_value] ?? image.variant_value)
          : null;
        const imagePayload = {
          product_id: productId,
          url: image.url,
          position: i,
          is_main: image.is_main ?? i === 0,
          variant_value: mappedVariantValue,
        };

        const isPendingImage = Boolean(image.file) || image.id.startsWith("img-");
        if (isPendingImage) {
          if (!image.file) {
            throw new Error("Cette image locale doit être sélectionnée à nouveau avant l'enregistrement.");
          }
          const rawName = image.file.name.replace(/\s+/g, "_");
          const safeName = rawName.replace(/[^a-zA-Z0-9._-]/g, "");
          const path = `${productId}/${Date.now()}-${safeName}`;
          const publicUrl = await uploadToBucket("products", path, image.file);
          const { data: insertedImage, error: insertImageError } = await supabase
            .from("product_images")
            .insert({ ...imagePayload, url: publicUrl } as any)
            .select("id")
            .single();
          if (insertImageError) throw insertImageError;
          keptImageIds.push(insertedImage.id);
          URL.revokeObjectURL(image.url);
        } else if (!image.id.startsWith("img-")) {
          const { error: updateImageError } = await supabase
            .from("product_images")
            .update({ position: i, is_main: imagePayload.is_main, variant_value: mappedVariantValue } as any)
            .eq("id", image.id)
            .eq("product_id", productId);
          if (updateImageError) throw updateImageError;
          keptImageIds.push(image.id);
        } else {
          throw new Error("Une image sélectionnée est introuvable. Veuillez la sélectionner à nouveau.");
        }
      }

      const removedImageRows = (existingImageRows ?? []).filter((row: any) => !keptImageIds.includes(row.id));
      for (const image of removedImageRows) {
        const { error: deleteImageError } = await supabase.from("product_images").delete().eq("id", image.id);
        if (deleteImageError) throw deleteImageError;
        const match = String(image.url ?? "").match(/\/storage\/v1\/object\/public\/([^/]+)\/(.+)$/);
        if (match) {
          try {
            await deleteFromBucket(match[1]!, decodeURIComponent(match[2]!));
          } catch (storageError) {
            console.warn("failed to delete removed product image", storageError);
          }
        }
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
    } finally {
      setIsSaving(false);
    }
  };

  /* ---- gestion des attributs / variantes dans le formulaire ---- */
  const addAttribute = () => {
    const attr: ProductAttribute = {
      id: genId("attr"),
      name: "Couleur",
      code: `attr_${draft.attributes.length + 1}`,
      type: "swatch",
      values: [{ id: genId("val"), label: "Aspen Black", hex: "#111827" }],
    };
    setDraft({ ...draft, attributes: [...draft.attributes, attr] });
  };

  const updateAttribute = (id: string, patch: Partial<ProductAttribute>) =>
    setDraft({
      ...draft,
      attributes: draft.attributes.map((a: ProductAttribute) => (a.id === id ? { ...a, ...patch } : a)),
    });

  const removeAttribute = (id: string) => {
    if (!id.startsWith("attr-")) {
      setRemovedAttributeIds((current) => (current.includes(id) ? current : [...current, id]));
    }
    setDraft({
      ...draft,
      attributes: draft.attributes.filter((a) => a.id !== id),
      // on retire aussi ce choix de toutes les variantes qui l'utilisaient
      variants: draft.variants.map((v) => {
        const { [id]: _removed, ...rest } = v.options;
        return { ...v, options: rest };
      }),
    });
  };

  const addValue = (attrId: string) =>
    updateAttribute(attrId, {
      values: [
        ...(draft.attributes.find((a) => a.id === attrId)?.values ?? []),
        { id: genId("val"), label: "Aspen Black", hex: "#111827" },
      ],
    });

  // Supprime une valeur (ex: une couleur ou une taille) d'un attribut.
  // C'était la pièce manquante : addValue existait pour ajouter, mais aucune
  // fonction équivalente n'existait pour retirer une valeur, et rien n'était
  // passé en prop à AttributesVariants pour ça — donc le bouton "supprimer"
  // dans l'onglet Attributs n'avait aucun handler à appeler.
  // On retire aussi cette valeur de toutes les variantes qui l'utilisaient,
  // sinon une variante garderait une référence à un value_id qui n'existe
  // plus dans draft.attributes (incohérence silencieuse au moment du save).
  const removeValue = (attrId: string, valueId: string) => {
    setDraft({
      ...draft,
      attributes: draft.attributes.map((a) =>
        a.id === attrId ? { ...a, values: a.values.filter((v) => v.id !== valueId) } : a
      ),
      variants: draft.variants.map((v) => {
        if (v.options[attrId] !== valueId) return v;
        const { [attrId]: _removed, ...rest } = v.options;
        return { ...v, options: rest };
      }),
    });
  };

  const addVariant = () => {
    const defaultVariantPrice = draft.variants.length > 0 ? draft.variants[0]?.price ?? draft.price : draft.price;
    const variant: ProductVariant = {
      id: genId("v"),
      product_id: draft.id || "new",
      // sku will be generated by the DB trigger; keep empty here
      sku: "",
      options: {},
      price: defaultVariantPrice,
      compare_at_price: draft.compare_at_price,
      stock: 0,
      is_active: true,
      position: draft.variants.length,
    };
    const nextVariants = [...draft.variants, variant];
    setDraft({
      ...draft,
      variants: nextVariants,
      stock: nextVariants.length > 0 ? nextVariants.reduce((sum, v) => sum + Number(v.stock ?? 0), 0) : draft.stock,
    });
  };

  const updateVariant = (id: string, patch: Partial<ProductVariant>) => {
    const nextVariants = draft.variants.map((v: ProductVariant) => (v.id === id ? { ...v, ...patch } : v));
    setDraft({
      ...draft,
      variants: nextVariants,
      stock: nextVariants.length > 0 ? nextVariants.reduce((sum, v) => sum + Number(v.stock ?? 0), 0) : draft.stock,
    });
  };

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
            <Button variant="ghost" onClick={refresh} title="Rafraîchir" style={{ border: "1px solid", borderColor: "hsl(240, 3.7%, 15.9%)" }}>
              ↻
            </Button>
              <Button variant="accent" onClick={() => { setDraft(emptyProduct); setRemovedAttributeIds([]); setShowRequiredErrors(false); setOpen(true); }}>
              <Plus className="h-4 w-4" /> Nouveau produit
            </Button>
          </div>
        </div>
      </div>

      <div className="max-h-[100vh] overflow-auto rounded-xl border border-border bg-card">
        <Table className="min-w-[900px]">
          <TableHeader className="sticky top-0 z-10 bg-card">
            <TableRow>
              <TableHead className="w-16"></TableHead>
              <TableHead>Produit</TableHead>
              <TableHead>
                <button type="button" className="flex items-center gap-2" onClick={togglePriceSort}>
                  <span>Prix</span>
                  <SortArrow dir={priceSort} ariaLabel="Trier par prix" />
                </button>
              </TableHead>
              <TableHead>
                <button type="button" className="flex items-center gap-2" onClick={toggleStockSort}>
                  <span>Stock</span>
                  <SortArrow dir={stockSort} ariaLabel="Trier par stock" />
                </button>
              </TableHead>
              <TableHead>Variantes</TableHead>
              <TableHead>Nouveau</TableHead>
              <TableHead>Actif</TableHead>
              <TableHead className="text-center">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={8} className="py-16 text-center text-muted-foreground">
                  <div className="flex items-center justify-center">
                    <Spinner showLabel />
                  </div>
                </TableCell>
              </TableRow>
            ) : filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="py-16 text-center">
                  <Package className="mx-auto h-8 w-8 text-muted-foreground" />
                  <p className="mt-2 text-muted-foreground">Aucun produit trouvé.</p>
                </TableCell>
              </TableRow>
            ) : (
              paginatedProducts.map((p) => (
                <TableRow key={p.id}>
                  <TableCell>
                    <Avatar className="h-10 w-10 rounded-md">
                      {mainImage(p.images)?.url ? (
                        <AvatarImage src={mainImage(p.images)!.url} alt={p.name} className="h-full w-full rounded-md object-cover" />
                      ) : (
                        <AvatarFallback className="rounded-md">{p.name.slice(0, 1)}</AvatarFallback>
                      )}
                    </Avatar>
                  </TableCell>
                  <TableCell>
                    <p className="font-medium">{p.name}</p>
                    <p className="text-xs text-muted-foreground">{p.sku}</p>
                  </TableCell>
                 
                 

                 <TableCell className="font-semibold">
                    {p.variants.length > 0 ? (() => {
                      const { min, max } = priceRangeForProduct(p);
                      return min === max ? (
                        <span>{formatPrice(min)}</span>
                      ) : (
                        <span className="text-sm">
                          {formatPrice(min)} – {formatPrice(max)}
                        </span>
                      );
                    })() : (
                      formatPrice(p.price)
                    )}
                  </TableCell>
                  <TableCell className={p.stock === 0 ? "font-semibold text-destructive" : ""}>{p.stock}</TableCell>
                  <TableCell className="text-muted-foreground">{p.variants.length}</TableCell>
                  <TableCell>
                    <Switch
                      checked={!!p.is_new}
                      disabled={togglingNewId === p.id}
                      onCheckedChange={(next) => toggleIsNew(p.id, next)}
                      aria-label={p.is_new ? "Retirer le badge Nouveau" : "Afficher le badge Nouveau"}
                      className="data-[state=checked]:bg-accent-strong"
                    />
                  </TableCell>
                  <TableCell>
                        <Switch
                          checked={!!p.is_active}
                          onCheckedChange={() => setToggleConfirm({ id: p.id, next: !p.is_active })}
                          className="data-[state=checked]:bg-emerald-600 data-[state=unchecked]:bg-destructive"
                        />
                  </TableCell>
                  <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">

                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => { setViewProduct(p); setSelectedOptions({}); setSelectedImageId(null); }}
                          aria-label="Voir"
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                          <Button size="sm" variant="ghost" onClick={() => { setDraft(p); setRemovedAttributeIds([]); setShowRequiredErrors(false); setOpen(true); }}>
                          <Edit2 className="h-4 w-4" />
                        </Button>
                        <Button size="sm" variant="ghost" className="text-destructive" onClick={() => setConfirmDeleteId(p.id)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {filtered.length > 0 && (
        <div className="flex items-center justify-between gap-4">
          <span className="text-sm text-foreground">
            {pageStart}–{pageEnd} sur {filtered.length}
          </span>
          <Pagination className="mx-0 w-auto justify-end text-foreground">
            <PaginationContent>
              <PaginationItem>
                <PaginationPrevious
                  href="#"
                  onClick={(event) => {
                    event.preventDefault();
                    setCurrentPage((page) => Math.max(1, page - 1));
                  }}
                  aria-disabled={currentPage === 1}
                  className={currentPage === 1 ? "pointer-events-none opacity-50" : undefined}
                />
              </PaginationItem>
              {Array.from({ length: totalPages }, (_, index) => index + 1).map((page) => (
                <PaginationItem key={page}>
                  <PaginationLink
                    href="#"
                    isActive={currentPage === page}
                    onClick={(event) => {
                      event.preventDefault();
                      setCurrentPage(page);
                    }}
                  >
                    {page}
                  </PaginationLink>
                </PaginationItem>
              ))}
              <PaginationItem>
                <PaginationNext
                  href="#"
                  onClick={(event) => {
                    event.preventDefault();
                    setCurrentPage((page) => Math.min(totalPages, page + 1));
                  }}
                  aria-disabled={currentPage === totalPages}
                  className={currentPage === totalPages ? "pointer-events-none opacity-50" : undefined}
                />
              </PaginationItem>
            </PaginationContent>
          </Pagination>
        </div>
      )}

    {/* View product dialog */}
    <Dialog
      open={Boolean(viewProduct)}
      onOpenChange={(v) => {
        if (!v) {
          setViewProduct(null);
          setSelectedOptions({});
          setSelectedImageId(null);
        }
      }}
    >
      <DialogContent className="max-h-[90vh] max-w-3xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{viewProduct ? viewProduct.name : ""}</DialogTitle>
        </DialogHeader>

        {viewProduct && (() => {
          const sorted = [...viewProduct.images].sort(
            (a, b) => Number(b.is_main) - Number(a.is_main) || a.position - b.position
          );

          const hasVariants = viewProduct.variants.length > 0;

          const defaultSelectedOptions = hasVariants
            ? viewProduct.attributes.reduce<Record<string, string>>((acc, attr) => {
                const firstVariantValue = viewProduct.variants[0]?.options?.[attr.id];
                if (firstVariantValue) acc[attr.id] = firstVariantValue;
                return acc;
              }, {})
            : {};

          const effectiveSelectedOptions = Object.keys(selectedOptions).length > 0 ? selectedOptions : defaultSelectedOptions;

          // La sélection n'est "complète" que si une valeur est choisie pour CHAQUE attribut
          const isSelectionComplete =
            viewProduct.attributes.length > 0 &&
            viewProduct.attributes.every((attr) => Boolean(effectiveSelectedOptions[attr.id]));

          // Variante correspondant exactement à la combinaison choisie (comme côté boutique)
          const selectedVariant = isSelectionComplete
            ? viewProduct.variants.find((v) =>
                viewProduct.attributes.every((attr) => v.options[attr.id] === effectiveSelectedOptions[attr.id])
              ) ?? null
            : null;

          // Image liée à la combinaison choisie. product_images.variant_value stocke l'ID
          // de la valeur d'attribut (attribute_values.id) — donc on compare aux VALEURS
          // sélectionnées (ids), pas aux labels. C'est ce qui empêchait l'image de
          // s'afficher : avant on comparait à des labels ("Rouge") alors que la colonne
          // contient des ids.
          const chosenValueIds = Object.values(effectiveSelectedOptions);
          const variantImage = chosenValueIds.length
            ? sorted.find((img) => img.variant_value && chosenValueIds.includes(img.variant_value))
            : null;

          const activeImage = selectedImageId
            ? sorted.find((img) => img.id === selectedImageId) ?? variantImage ?? sorted[0]
            : variantImage ?? sorted[0];

          const resolveAttributeImage = (valueId: string) => {
            const value = viewProduct.attributes
              .flatMap((attr) => attr.values)
              .find((item) => item.id === valueId);
            if (value?.image_url && looksLikeImageValue(value.image_url)) return value.image_url;
            if (value?.label && looksLikeImageValue(value.label)) return value.label;
            return viewProduct.images.find((img) => img.variant_value === valueId)?.url;
          };

          const displayPrice = selectedVariant ? selectedVariant.price : viewProduct.price;
          const displayComparePrice = selectedVariant ? selectedVariant.compare_at_price : viewProduct.compare_at_price;
          const displayStock = selectedVariant ? selectedVariant.stock : viewProduct.stock;
          const variantPrices = viewProduct.variants.map((variant) => variant.price);
          const variantPromoPrices = viewProduct.variants.map((variant) => variant.cost_price ?? variant.price);
          const hasOneGlobalPrice =
            !hasVariants ||
            (variantPrices.every((price) => price === variantPrices[0]) &&
              variantPromoPrices.every((price) => price === variantPromoPrices[0]));
          const globalOriginalPrice = hasVariants ? viewProduct.variants[0]?.price ?? viewProduct.price : viewProduct.price;
          const globalPromoPrice = hasVariants
            ? viewProduct.variants[0]?.cost_price ?? globalOriginalPrice
            : viewProduct.cost_price ?? viewProduct.price;
          const globalDiscountPercent = globalOriginalPrice && globalPromoPrice !== globalOriginalPrice
            ? Math.round(((globalOriginalPrice - globalPromoPrice) / globalOriginalPrice) * 100)
            : null;

          const chooseOption = (attributeId: string, valueId: string) => {
            setSelectedOptions((prev) => ({ ...prev, [attributeId]: valueId }));
            // laisse l'image suivre automatiquement la nouvelle combinaison
            setSelectedImageId(null);
          };

          return (
            <div className="grid gap-5 lg:grid-cols-[1.2fr_0.8fr]">
              <div className="space-y-3">
               

                <div className="flex min-h-[320px] items-center justify-center overflow-hidden rounded-xl border border-blue-500 bg-surface">
                  {activeImage?.url ? (
                    <img src={activeImage.url} alt={viewProduct.name} className="h-full max-h-[320px] w-full object-contain" />
                  ) : (
                    <div className="flex h-[320px] w-full items-center justify-center text-muted-foreground">
                      Aucune image
                    </div>
                  )}
                </div>

                {sorted.length > 1 && (
                  <div className="flex gap-2 overflow-x-auto pb-1">
                    {sorted.map((img) => (
                      <button
                        key={img.id}
                        type="button"
                        onClick={() => setSelectedImageId(img.id)}
                        className={cn(
                          "shrink-0 overflow-hidden rounded-md border-2 transition-colors",
                          activeImage?.id === img.id
                            ? "border-blue-500"
                            : "border-transparent hover:border-border",
                        )}
                      >
                        <Avatar className="h-14 w-14 rounded-none">
                          <AvatarImage src={img.url} alt={viewProduct.name} className="object-cover" />
                        </Avatar>
                      </button>
                    ))}
                  </div>
                )}

             
              </div>

              <div className="space-y-4 pt-1">
                <div className="space-y-3 text-sm">
                  <div className="text-muted-foreground">
                    <span className="font-bold text-foreground">Marque :</span> {viewProduct.brand || "—"}
                  </div>
               
                  <div className="text-muted-foreground">
                    <span className="font-bold text-foreground">SKU :</span> {viewProduct.sku || "—"}
                  </div>
                  {hasVariants && hasOneGlobalPrice && (
                    <div className="my-3 pt-1">
                      <div className="font-bold text-foreground">Prix global :</div>
                      <div className="mt-3 flex items-baseline gap-2 font-semibold">
                        <span className="text-xl">{formatPrice(globalPromoPrice)}</span>
                        {globalDiscountPercent !== null && (
                          <span className="text-md text-muted-foreground line-through">{formatPrice(globalOriginalPrice)}</span>
                        )}
                        {globalDiscountPercent !== null && (
                          <span className="text-md font-bold text-destructive">
                            -{Math.abs(globalDiscountPercent)}%
                          </span>
                        )}
                      </div>
                      <div className={viewProduct.stock === 0 ? "mt-3 font-semibold text-destructive" : "mt-3 text-muted-foreground"}>
                        <span className="font-bold text-foreground">Stock global :</span> {viewProduct.stock}
                      </div>
                    </div>
                  )}
                     <div className="text-muted-foreground">
                    <span className="font-bold text-foreground">Catégorie :</span> {categoriesMap[viewProduct.category_id ?? ""] ?? "—"}
                  </div>
                  <div className="text-muted-foreground">
                    <span className="font-bold text-foreground">Statut :</span> {viewProduct.is_active ? "Actif" : "Inactif"}
                  </div>
                </div>

                {hasVariants ? (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <h4 className="text-sm font-bold">Variantes :</h4>

                    </div>

                    <div className="space-y-2">
                      {viewProduct.attributes.map((attribute) => {
                        const selectedValueId = effectiveSelectedOptions[attribute.id];
                        const selectedValueLabel = attribute.values.find((v) => v.id === selectedValueId)?.label;

                        return (
                          <div key={attribute.id} className="space-y-2">
                            <p className="text-sm font-medium">
                              {attribute.name}
                          
                            </p>
                            <div className="flex flex-wrap gap-2">
                              {attribute.values.map((value) => {
                                const isSelected = effectiveSelectedOptions[attribute.id] === value.id;

                                if (attribute.type === "swatch") {
                                  return (
                                    <button
                                      key={value.id}
                                      type="button"
                                      title={value.label}
                                      onClick={() => chooseOption(attribute.id, value.id)}
                                      className={cn(
                                        "h-8 w-8 rounded-full border-2 transition",
                                        isSelected
                                          ? "border-blue-500 ring-2 ring-blue-200"
                                          : "border-border hover:border-muted-foreground",
                                      )}
                                      style={{ backgroundColor: value.hex || "#e5e7eb" }}
                                    />
                                  );
                                }

                                if (attribute.type === "image" || looksLikeImageValue(value.label) || looksLikeImageValue(value.image_url)) {
                                  const previewUrl = resolveAttributeImage(value.id);
                                  return (
                                    <button
                                      key={value.id}
                                      type="button"
                                      title={value.label}
                                      onClick={() => chooseOption(attribute.id, value.id)}
                                      className={cn(
                                        "grid h-9 w-9 place-items-center overflow-hidden rounded-full border-2 transition",
                                        isSelected
                                          ? "border-blue-500 ring-2 ring-blue-200"
                                          : "border-border hover:border-muted-foreground",
                                      )}
                                    >
                                      {previewUrl ? (
                                        <img
                                          src={previewUrl}
                                          alt={value.label}
                                          className="h-full w-full rounded-full object-cover"
                                        />
                                      ) : (
                                        <span className="grid h-full w-full place-items-center rounded-full border border-dashed border-border bg-muted text-[7px] text-muted-foreground">
                                          IMG
                                        </span>
                                      )}
                                    </button>
                                  );
                                }

                                return (
                                  <button
                                    key={value.id}
                                    type="button"
                                    onClick={() => chooseOption(attribute.id, value.id)}
                                    className={cn(
                                      "rounded-full border px-3 py-1.5 text-xs transition",
                                      isSelected
                                        ? "border-blue-500 bg-blue-50 text-blue-600 dark:bg-blue-950/20"
                                        : "border-border hover:bg-surface",
                                    )}
                                  >
                                    {value.label}
                                  </button>
                                );
                              })}
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    {selectedVariant ? (
                      <div className="space-y-2 rounded-lg border border-border bg-accent/5 p-3 text-sm">
                        <div className="font-semibold">
                          {Object.entries(selectedVariant.options || {}).map(([attrId, valId], index) => {
                            const attr = viewProduct.attributes.find((a) => a.id === attrId);
                            const val = attr?.values.find((x) => x.id === valId);
                            if (!attr || !val) return null;
                            return (
                              <span key={attrId}>
                                {index > 0 && " / "}
                                {attr.name}: <span className="text-muted-foreground">{val.label}</span>
                              </span>
                            );
                          })}
                        </div>
                        <div className="text-muted-foreground">
                          <span className="font-semibold text-foreground">SKU : </span>
                          {selectedVariant.sku || "—"}
                        </div>
                        <div className="mt-5 flex items-baseline gap-2 font-semibold">
                          <span className="text-lg">{formatPrice(selectedVariant.cost_price ?? selectedVariant.price)}</span>
                          {selectedVariant.cost_price != null && selectedVariant.cost_price !== selectedVariant.price && (
                            <>
                              <span className="text-md text-muted-foreground line-through">{formatPrice(selectedVariant.price)}</span>
                              <span className="text-md font-bold text-destructive">
                                -{Math.round(((selectedVariant.price - selectedVariant.cost_price) / selectedVariant.price) * 100)}%
                              </span>
                            </>
                          )}
                        </div>
                        <div className={selectedVariant.stock === 0 ? "font-semibold text-destructive" : ""}>
                          <div className="font-semibold">Stock :  <span className="text-muted-foreground">{selectedVariant.stock}</span></div>
                        </div>
                      </div>
                    ) : isSelectionComplete ? (
                      <div className="rounded-lg border border-destructive/40 bg-destructive/5 p-3 text-sm text-destructive">
                        Cette combinaison n'existe pas pour ce produit.
                      </div>
                    ) : null}
                  </div>
                ) : (
                  <div className="space-y-2 rounded-lg border border-border bg-accent/5 p-3 text-sm">
                    <div><span className="text-muted-foreground">Prix global : </span><span className="font-semibold">{formatPrice(displayPrice)}</span></div>
                    {globalDiscountPercent !== null && (
                      <div>
                        <span className="text-muted-foreground">Après promotion : </span>
                        <span className="font-semibold text-accent-strong">{formatPrice(globalPromoPrice)}</span>
                        <span className="ml-2 rounded bg-accent-strong/10 px-2 py-0.5 text-xs font-bold text-accent-strong">
                          {globalDiscountPercent > 0 ? `-${globalDiscountPercent}%` : `+${Math.abs(globalDiscountPercent)}%`}
                        </span>
                      </div>
                    )}
                    {displayComparePrice && (
                      <div>
                        <span className="text-muted-foreground">Avant : </span>
                        <span className="text-muted-foreground line-through">{formatPrice(displayComparePrice)}</span>
                      </div>
                    )}
                    <div className={displayStock === 0 ? "font-semibold text-destructive" : ""}>
                      <span className="text-muted-foreground">Stock : </span>{displayStock}
                    </div>
                  </div>
                )}

                {viewProduct.tags?.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {viewProduct.tags.map((t) => (
                      <span key={t} className="rounded-full bg-secondary px-2 py-0.5 text-xs">{t}</span>
                    ))}
                  </div>
                )}

                
              </div>

              {(viewProduct.short_description || viewProduct.description) && (
                <div className="space-y-4 text-sm lg:col-span-2">
                  <h4 className="font-bold text-foreground">Description</h4>
                  {viewProduct.short_description && (
                    <p className="text-muted-foreground">{viewProduct.short_description}</p>
                  )}
                  {viewProduct.description && <RichText value={viewProduct.description} className="text-foreground" />}
                </div>
              )}

              <div className="flex justify-end gap-2 pt-2 lg:col-span-2">
                <Button variant="outline" onClick={() => setViewProduct(null)}>Fermer</Button>
                <Button
                  variant="accent"
                  onClick={() => { setDraft(viewProduct); setRemovedAttributeIds([]); setShowRequiredErrors(false); setOpen(true); setViewProduct(null); setSelectedOptions({}); }}
                >
                  Éditer
                </Button>
              </div>
            </div>
          );
        })()}
      </DialogContent>
    </Dialog>

    {/* Confirm toggle dialog (activer / désactiver) */}
    <Dialog open={Boolean(toggleConfirm)} onOpenChange={(v) => { if (!v) setToggleConfirm(null); }}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Confirmer</DialogTitle>
        </DialogHeader>
        <p>Voulez-vous vraiment {toggleConfirm?.next ? "activer" : "désactiver"} ce produit ?</p>
        <DialogFooter>
          <Button variant="outline" onClick={() => setToggleConfirm(null)} disabled={isToggling}>Annuler</Button>
          <Button
            variant="accent"
            onClick={async () => {
              if (!toggleConfirm) return;
              setIsToggling(true);
              const { id, next } = toggleConfirm;
              // optimistic
              setList((prev) => prev.map((x) => (x.id === id ? { ...x, is_active: next } : x)));
              try {
                const { error } = await supabase.from("products").update({ is_active: next }).eq("id", id);
                if (error) throw error;
                toast.success(next ? "Produit activé." : "Produit désactivé.");
                setToggleConfirm(null);
              } catch (err) {
                console.error(err);
                // rollback
                setList((prev) => prev.map((x) => (x.id === id ? { ...x, is_active: !next } : x)));
                toast.error("Impossible de mettre à jour l'état du produit.");
              } finally {
                setIsToggling(false);
              }
            }}
            disabled={isToggling}
          >
            {isToggling ? (
              <div className="flex items-center gap-2">
                <Spinner className="h-4 w-4" />
                <span>Chargement...</span>
              </div>
            ) : toggleConfirm?.next ? "Activer" : "Désactiver"}
          </Button>
        </DialogFooter>
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
            <Button variant="outline" onClick={() => setConfirmDeleteId(null)} disabled={isDeleting}>Annuler</Button>
            <Button
              variant="accent"
              className="bg-destructive hover:bg-destructive/90"
              onClick={async () => {
                const id = confirmDeleteId;
                if (!id || isDeleting) return;
                setIsDeleting(true);
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
                  setIsDeleting(false);
                  setConfirmDeleteId(null);
                }
              }}
              disabled={isDeleting}
            >
              {isDeleting ? (
                <span className="inline-flex items-center gap-2">
                  <Spinner className="h-4 w-4" />
                  Suppression...
                </span>
              ) : (
                "Supprimer"
              )}
            </Button>
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
            <TabsTrigger value="variantes">Attributs</TabsTrigger>
            <TabsTrigger value="images">Images</TabsTrigger>
          </TabsList>

          <TabsContent value="general">
            <ProductGeneral
              draft={draft}
              setDraft={(p) => setDraft(p)}
              categories={categoriesList}
              showRequiredErrors={showRequiredErrors}
            />
          </TabsContent>

          <TabsContent value="variantes">
            <AttributesVariants
              draft={draft}
              setDraft={(p) => setDraft(p)}
              addAttribute={addAttribute}
              addValue={addValue}
              removeValue={removeValue}
              addVariant={addVariant}
              updateAttribute={updateAttribute}
              removeAttribute={removeAttribute}
              updateVariant={updateVariant}
              setVariantOption={setVariantOption}
              moveVariant={moveVariant}
            />
          </TabsContent>

          <TabsContent value="images">
            <ProductImages draft={draft} setDraft={(p) => setDraft(p)} />
          </TabsContent>
        </Tabs>

          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)} disabled={isSaving}>Annuler</Button>
            <Button variant="accent" onClick={save} disabled={isSaving}>
              {isSaving ? (
                <span className="inline-flex items-center gap-2">
                  <Spinner className="h-4 w-4" />
                  Modification...
                </span>
              ) : (
                draft.id ? "Modifier" : "Enregistrer"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}