import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { Pencil, Plus, Trash2, Power } from "lucide-react";
import { toast } from "sonner";
import { categories } from "@/data/categories";
import type { Database } from "@/types";
import { supabase } from "@/lib/supabaseClient";
import SortArrow from "@/components/ui/sort-arrow";
import { Pagination, PaginationContent, PaginationItem, PaginationLink, PaginationNext, PaginationPrevious } from "@/components/ui/pagination";

type PromoRow = Database["public"]["Tables"]["promotions"]["Row"];
type CouponRow = Database["public"]["Tables"]["coupons"]["Row"];
type PromoWithScope = PromoRow & { applies_to_all?: boolean | null };
const ALL_PRODUCTS_VALUE = "__all_products__";
import { Button } from "@/components/ui/button";
import Spinner from "@/components/ui/spinner";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
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


export const Route = createFileRoute("/admin/promotions")({
  component: AdminPromotions,
});

const emptyPromo: Partial<PromoRow> = {
  discount_type: "percentage",
  discount_value: 10,
  product_id: "",
  variant_id: null,
  starts_at: "2026-09-01",
  ends_at: "2026-09-30",
  is_active: true,
};

const emptyCoupon: Partial<CouponRow> = {
  code: "",
  discount_type: "percentage",
  discount_value: 10,
  min_order_amount: 0,
  starts_at: "2026-09-01",
  expires_at: "2026-12-31",
  max_uses: 100,
  max_uses_per_user: 1,
  used_count: 0,
  is_active: true,
};

function AdminPromotions() {
  const [promos, setPromos] = useState<PromoRow[]>([]);
  const [couponList, setCouponList] = useState<CouponRow[]>([]);
  const [promoDraft, setPromoDraft] = useState<Partial<PromoRow> | null>(null);
  const [couponDraft, setCouponDraft] = useState<Partial<CouponRow> | null>(null);
  const [loading, setLoading] = useState(false);
  const [productsList, setProductsList] = useState<Array<{ id: string; name: string; sku?: string }>>([]);
  const [confirmDeletePromoId, setConfirmDeletePromoId] = useState<string | null>(null);
  const [confirmDeleteCouponId, setConfirmDeleteCouponId] = useState<string | null>(null);
  const [isDeletingPromo, setIsDeletingPromo] = useState(false);
  const [isSavingPromo, setIsSavingPromo] = useState(false);
  const [selectedPromoIds, setSelectedPromoIds] = useState<string[]>([]);
  const [confirmDeletePromoIds, setConfirmDeletePromoIds] = useState<string[]>([]);
  const [promoConflict, setPromoConflict] = useState<{
    existing: PromoRow;
    draft: Partial<PromoRow>;
    payload: any;
  } | null>(null);
  const [isReplacingPromo, setIsReplacingPromo] = useState(false);
  const [isDeletingCoupon, setIsDeletingCoupon] = useState(false);
  const [selectedCouponIds, setSelectedCouponIds] = useState<string[]>([]);
  const [confirmDeleteCouponIds, setConfirmDeleteCouponIds] = useState<string[]>([]);
  const [couponStatusConfirm, setCouponStatusConfirm] = useState<CouponRow | null>(null);
  const [isUpdatingCouponStatus, setIsUpdatingCouponStatus] = useState(false);
  const [couponStatusFilter, setCouponStatusFilter] = useState<"all" | "active" | "inactive">("all");
  const [couponDateFilter, setCouponDateFilter] = useState<"all" | "current" | "upcoming" | "ended" | "undated">("all");
  const [couponValidation, setCouponValidation] = useState<{ code?: string; type?: string; value?: string }>({});
  const couponCodeRef = useRef<HTMLInputElement>(null);
  const couponTypeRef = useRef<HTMLButtonElement>(null);
  const couponValueRef = useRef<HTMLInputElement>(null);
  const [couponSortKey, setCouponSortKey] = useState<"value" | "minimum" | "usage">("value");
  const [couponSortDirection, setCouponSortDirection] = useState<"asc" | "desc" | null>(null);
  const [couponPage, setCouponPage] = useState(1);
  const [promoStatusConfirm, setPromoStatusConfirm] = useState<PromoRow | null>(null);
  const [isUpdatingPromoStatus, setIsUpdatingPromoStatus] = useState(false);
  const [promoSearch, setPromoSearch] = useState("");
  const [promoProductSearch, setPromoProductSearch] = useState("");
  const [promoStatusFilter, setPromoStatusFilter] = useState<"all" | "active" | "inactive">("all");
  const [promoDateFilter, setPromoDateFilter] = useState<"all" | "current" | "upcoming" | "ended" | "undated">("all");
  const [promoSort, setPromoSort] = useState<"asc" | "desc" | null>(null);
  const [promoPage, setPromoPage] = useState(1);
  const [promoValidation, setPromoValidation] = useState<{
    type?: string;
    value?: string;
    product?: string;
  }>({});
  const promoTypeRef = useRef<HTMLButtonElement>(null);
  const promoValueRef = useRef<HTMLInputElement>(null);
  const promoProductRef = useRef<HTMLButtonElement>(null);
  const promoPageSize = 10;

  const filteredPromoProducts = productsList
    .filter((product) => {
      const query = promoProductSearch.trim().toLowerCase();
      return !query
        || product.name.toLowerCase().includes(query)
        || (product.sku ?? "").toLowerCase().includes(query);
    })
    .slice(0, 20);

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      setLoading(true);
      try {
        const [
          { data: pData, error: pErr },
          { data: cData, error: cErr },
          { data: prodData, error: prodErr },
        ] = await Promise.all([
          supabase.from("promotions").select("*").order("starts_at", { ascending: true }),
          supabase.from("coupons").select("*").order("starts_at", { ascending: true }),
          supabase.from("products").select("id,name,sku").order("created_at", { ascending: false }),
        ]);
        if (pErr) throw pErr;
        if (cErr) throw cErr;
        if (prodErr) throw prodErr;
        if (!mounted) return;
        const today = new Date().toISOString().slice(0, 10);
        const expiredPromoIds = (pData ?? [])
          .filter((promo: PromoRow) => promo.is_active && promo.ends_at && promo.ends_at.slice(0, 10) < today)
          .map((promo: PromoRow) => promo.id);
        if (expiredPromoIds.length > 0) {
          const { error: expiredUpdateError } = await supabase
            .from("promotions")
            .update({ is_active: false })
            .in("id", expiredPromoIds);
          if (expiredUpdateError) throw expiredUpdateError;
        }
        setPromos((pData ?? []).map((promo: PromoRow) => (
          expiredPromoIds.includes(promo.id) ? { ...promo, is_active: false } : promo
        )));
        setCouponList(cData ?? []);
        setProductsList((prodData ?? []).map((p: any) => ({ id: p.id, name: p.name ?? p.slug ?? p.id, sku: p.sku })));
      } catch (err) {
        console.error("load promotions/coupons", err);
        toast.error("Impossible de charger les promotions et coupons depuis la base.");
      } finally {
        if (mounted) setLoading(false);
      }
    };
    load();
    return () => { mounted = false; };
  }, []);

  const savePromo = async () => {
    if (!promoDraft) return;
    if (!promoDraft.discount_type) {
      setPromoValidation({ type: "Sélectionnez un type de remise." });
      promoTypeRef.current?.focus();
      return;
    }
    if (promoDraft.discount_value === undefined || promoDraft.discount_value === null || Number(promoDraft.discount_value) <= 0) {
      setPromoValidation({ value: "Saisissez une valeur supérieure à zéro." });
      promoValueRef.current?.focus();
      return;
    }
    const appliesToAllProducts = promoDraft.product_id === ALL_PRODUCTS_VALUE;
    const productId = appliesToAllProducts ? productsList[0]?.id : promoDraft.product_id;
    if (!productId) {
      setPromoValidation({ product: "Sélectionnez un produit." });
      promoProductRef.current?.focus();
      return;
    }
    setPromoValidation({});
    setIsSavingPromo(true);
    setLoading(true);
    try {
      // Map UI fields (if any) to DB columns. We support percentage/fixed types.
      const payload: any = {
        discount_type: promoDraft.discount_type ?? (promoDraft.discount_value !== undefined ? "percentage" : null),
        discount_value: promoDraft.discount_value ?? 0,
        product_id: productId,
        // Un produit ne peut avoir qu'une seule promotion à la fois (contrainte
        // UNIQUE(product_id) en base) — pas de ciblage par variante.
        variant_id: null,
        applies_to_all: appliesToAllProducts,
        starts_at: promoDraft.starts_at ?? null,
        ends_at: promoDraft.ends_at ?? null,
        is_active: promoDraft.is_active ?? true,
      };

      const targetProductIds = appliesToAllProducts ? productsList.map((product) => product.id) : [productId];
      const existingPromo = promos.find((promo) => (
        promo.id !== promoDraft.id
        && promo.product_id !== null
        && targetProductIds.includes(promo.product_id)
      ));
      const rowsPayload = targetProductIds.map((targetId) => ({
        ...payload,
        product_id: targetId,
        applies_to_all: appliesToAllProducts,
      }));
      if (existingPromo) {
        setPromoConflict({ existing: existingPromo, draft: promoDraft, payload: { ...payload, rowsPayload } });
        return;
      }

      if (promoDraft.id) {
        const { error } = await supabase.from("promotions").update(payload).eq("id", promoDraft.id);
        if (error) throw error;
        setPromos((prev) => prev.map((p) => (p.id === promoDraft.id ? { ...p, ...payload } as PromoRow : p)));
        toast.success("Promotion mise à jour.");
      } else {
        const { data, error } = await supabase.from("promotions").insert(rowsPayload).select();
        if (error) throw error;
        if (data?.length) setPromos((prev) => [...prev, ...(data as PromoRow[])]);
        toast.success(appliesToAllProducts ? "Promotion appliquée à tous les produits." : "Promotion créée.");
      }
      setPromoDraft(null);
    } catch (err) {
      console.error("savePromo", err);
      toast.error("Erreur lors de l'enregistrement de la promotion.");
    } finally {
      setIsSavingPromo(false);
      setLoading(false);
    }
  };

  const replaceConflictingPromo = async () => {
    if (!promoConflict) return;
    setIsReplacingPromo(true);
    setLoading(true);
    try {
      const rowsPayload = promoConflict.payload.rowsPayload ?? [promoConflict.payload];
      const targetProductIds = rowsPayload.map((row: any) => row.product_id);
      const existingIds = promos
        .filter((promo) => targetProductIds.includes(promo.product_id))
        .map((promo) => promo.id);
      const { error: deleteError } = await supabase.from("promotions").delete().in("id", existingIds);
      if (deleteError) throw deleteError;

      const { data, error } = await supabase.from("promotions").insert(rowsPayload).select();
      if (error) throw error;
      setPromos((prev) => [...prev.filter((promo) => !existingIds.includes(promo.id)), ...(data as PromoRow[] ?? [])]);
      setPromoConflict(null);
      setPromoDraft(null);
      toast.success("L'ancienne promotion a été remplacée par la nouvelle.");
    } catch (err) {
      console.error("replace promotion", err);
      toast.error("Impossible de remplacer l'ancienne promotion.");
    } finally {
      setIsReplacingPromo(false);
      setLoading(false);
    }
  };

  const handleDeletePromo = async (id: string) => {
    if (!id) return;
    setIsDeletingPromo(true);
    setLoading(true);
    try {
      const { error } = await supabase.from("promotions").delete().eq("id", id);
      if (error) throw error;
      setPromos((prev) => prev.filter((x) => x.id !== id));
      toast.success("Promotion supprimée.");
    } catch (err) {
      console.error("delete promo", err);
      toast.error("Impossible de supprimer la promotion.");
    } finally {
      setIsDeletingPromo(false);
      setLoading(false);
      setConfirmDeletePromoId(null);
    }
  };

  const handleDeleteSelectedPromos = async () => {
    if (confirmDeletePromoIds.length === 0) return;
    setIsDeletingPromo(true);
    setLoading(true);
    try {
      const { error } = await supabase.from("promotions").delete().in("id", confirmDeletePromoIds);
      if (error) throw error;
      const deletedIds = new Set(confirmDeletePromoIds);
      setPromos((prev) => prev.filter((promo) => !deletedIds.has(promo.id)));
      setSelectedPromoIds((prev) => prev.filter((id) => !deletedIds.has(id)));
      toast.success(`${confirmDeletePromoIds.length} promotion${confirmDeletePromoIds.length > 1 ? "s" : ""} supprimée${confirmDeletePromoIds.length > 1 ? "s" : ""}.`);
    } catch (err) {
      console.error("delete selected promos", err);
      toast.error("Impossible de supprimer les promotions sélectionnées.");
    } finally {
      setIsDeletingPromo(false);
      setLoading(false);
      setConfirmDeletePromoIds([]);
    }
  };

  const togglePromoStatus = async (promo: PromoRow) => {
    const nextStatus = !promo.is_active;
    setIsUpdatingPromoStatus(true);
    setPromos((prev) => prev.map((item) => item.id === promo.id ? { ...item, is_active: nextStatus } : item));
    try {
      const { error } = await supabase.from("promotions").update({ is_active: nextStatus }).eq("id", promo.id);
      if (error) throw error;
      toast.success(nextStatus ? "Promotion activée." : "Promotion désactivée.");
      return true;
    } catch (err) {
      console.error("toggle promo status", err);
      setPromos((prev) => prev.map((item) => item.id === promo.id ? { ...item, is_active: promo.is_active } : item));
      toast.error("Impossible de modifier le statut de la promotion.");
      return false;
    } finally {
      setIsUpdatingPromoStatus(false);
    }
  };

  const saveCoupon = async () => {
    if (!couponDraft) return;
    if (!couponDraft.code || !couponDraft.code.trim()) {
      setCouponValidation({ code: "Le code est obligatoire." });
      couponCodeRef.current?.focus();
      return;
    }
    if (!couponDraft.discount_type) {
      setCouponValidation({ type: "Le type est obligatoire." });
      couponTypeRef.current?.focus();
      return;
    }
    if (couponDraft.discount_value === undefined || couponDraft.discount_value === null || Number(couponDraft.discount_value) <= 0) {
      setCouponValidation({ value: "La valeur doit être supérieure à zéro." });
      couponValueRef.current?.focus();
      return;
    }
    setCouponValidation({});
    setLoading(true);
    try {
      const anyDraft = couponDraft as any;
      const payload: any = {
        code: (couponDraft.code ?? "").toUpperCase(),
        discount_type: couponDraft.discount_type ?? anyDraft.type ?? "percentage",
        discount_value: couponDraft.discount_value ?? anyDraft.value ?? 0,
        min_order_amount: couponDraft.min_order_amount ?? anyDraft.min_amount ?? 0,
        starts_at: couponDraft.starts_at ?? null,
        expires_at: couponDraft.expires_at ?? anyDraft.ends_at ?? null,
        max_uses: couponDraft.max_uses ?? anyDraft.usage_limit ?? null,
        max_uses_per_user: couponDraft.max_uses_per_user ?? anyDraft.max_uses_per_user ?? null,
        used_count: couponDraft.used_count ?? 0,
        is_active: couponDraft.is_active ?? true,
      };

      if (couponDraft.id) {
        const { error } = await supabase.from("coupons").update(payload).eq("id", couponDraft.id);
        if (error) throw error;
        setCouponList((prev) => prev.map((c) => (c.id === couponDraft.id ? { ...c, ...payload } as CouponRow : c)));
        toast.success("Coupon mis à jour.");
      } else {
        const { data, error } = await supabase.from("coupons").insert(payload).select().maybeSingle();
        if (error) throw error;
        if (data) setCouponList((prev) => [...prev, data as CouponRow]);
        toast.success("Coupon créé.");
      }
      setCouponDraft(null);
    } catch (err) {
      console.error("saveCoupon", err);
      toast.error("Erreur lors de l'enregistrement du coupon.");
    } finally {
      setLoading(false);
    }
  };

  const getProductLabel = (id?: string | null) => {
    if (!id) return "Tout le catalogue";
    const p = productsList.find((x) => x.id === id);
    if (p) return p.sku ?? p.name;
    try {
      return id.slice(0, 8);
    } catch {
      return id;
    }
  };

  const isGlobalPromo = (promo: PromoRow) => Boolean((promo as PromoWithScope).applies_to_all);
  const getPromoScopeLabel = (promo: PromoRow) => isGlobalPromo(promo) ? "Tous les produits" : getProductLabel(promo.product_id);
  const getPromoDateStatus = (promo: { starts_at?: string | null; ends_at?: string | null }) => {
    const today = new Date().toISOString().slice(0, 10);
    if (promo.starts_at && promo.starts_at > today) {
      return { label: "À venir", className: "bg-blue-500/10 text-blue-700 dark:text-blue-300" };
    }
    if (promo.ends_at && promo.ends_at < today) {
      return { label: "Terminée", className: "bg-muted text-muted-foreground" };
    }
    return { label: "En cours", className: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300" };
  };

  const formatPromoDate = (value?: string | null) => {
    if (!value) return "—";
    const [date] = value.split("T");
    const [year, month, day] = date!.split("-");
    return year && month && day ? `${day}/${month}/${year}` : date;
  };

  const formatDateInput = (value?: string | null) => value ? value.slice(0, 10) : "";

  const filteredPromos = promos.filter((promo) => {
    const query = promoSearch.trim().toLowerCase();
    const product = productsList.find((item) => item.id === promo.product_id);
    const matchSearch = query === "" || [product?.name, product?.sku, getProductLabel(promo.product_id)]
      .filter(Boolean)
      .some((value) => value!.toLowerCase().includes(query));
    const matchStatus = promoStatusFilter === "all"
      || (promoStatusFilter === "active" && promo.is_active)
      || (promoStatusFilter === "inactive" && !promo.is_active);
    const today = new Date().toISOString().slice(0, 10);
    const matchDate = promoDateFilter === "all"
      || (promoDateFilter === "undated" && !promo.starts_at && !promo.ends_at)
      || (promoDateFilter === "current" && !!promo.starts_at && promo.starts_at <= today && (!promo.ends_at || promo.ends_at >= today))
      || (promoDateFilter === "upcoming" && !!promo.starts_at && promo.starts_at > today)
      || (promoDateFilter === "ended" && !!promo.ends_at && promo.ends_at < today);
    return matchSearch && matchStatus && matchDate;
  });

  const sortedPromos = promoSort
    ? [...filteredPromos].sort((a, b) => promoSort === "asc"
      ? Number(a.discount_value) - Number(b.discount_value)
      : Number(b.discount_value) - Number(a.discount_value))
    : filteredPromos;
  const promoTotalPages = Math.max(1, Math.ceil(sortedPromos.length / promoPageSize));
  const paginatedPromos = sortedPromos.slice((promoPage - 1) * promoPageSize, promoPage * promoPageSize);
  const allFilteredPromosSelected = sortedPromos.length > 0 && sortedPromos.every((promo) => selectedPromoIds.includes(promo.id));
  const selectedPromos = promos.filter((promo) => confirmDeletePromoIds.includes(promo.id));
  const filteredCoupons = couponList.filter((coupon) => {
    const today = new Date().toISOString().slice(0, 10);
    const matchStatus = couponStatusFilter === "all"
      || (couponStatusFilter === "active" && coupon.is_active)
      || (couponStatusFilter === "inactive" && !coupon.is_active);
    const matchDate = couponDateFilter === "all"
      || (couponDateFilter === "undated" && !coupon.starts_at && !coupon.expires_at)
      || (couponDateFilter === "current" && !!coupon.starts_at && coupon.starts_at.slice(0, 10) <= today && (!coupon.expires_at || coupon.expires_at.slice(0, 10) >= today))
      || (couponDateFilter === "upcoming" && !!coupon.starts_at && coupon.starts_at.slice(0, 10) > today)
      || (couponDateFilter === "ended" && !!coupon.expires_at && coupon.expires_at.slice(0, 10) < today);
    return matchStatus && matchDate;
  });
  const sortedCoupons = couponSortDirection
    ? [...filteredCoupons].sort((a, b) => {
        const values = couponSortKey === "value"
          ? [Number(a.discount_value ?? 0), Number(b.discount_value ?? 0)]
          : couponSortKey === "minimum"
            ? [Number(a.min_order_amount ?? 0), Number(b.min_order_amount ?? 0)]
            : [Number(a.used_count ?? 0), Number(b.used_count ?? 0)];
        const firstValue = values[0] ?? 0;
        const secondValue = values[1] ?? 0;
        return couponSortDirection === "asc" ? firstValue - secondValue : secondValue - firstValue;
      })
    : filteredCoupons;
  const couponPageSize = 10;
  const couponTotalPages = Math.max(1, Math.ceil(sortedCoupons.length / couponPageSize));
  const paginatedCoupons = sortedCoupons.slice((couponPage - 1) * couponPageSize, couponPage * couponPageSize);
  const allFilteredCouponsSelected = sortedCoupons.length > 0 && sortedCoupons.every((coupon) => selectedCouponIds.includes(coupon.id));
  const selectedCoupons = couponList.filter((coupon) => confirmDeleteCouponIds.includes(coupon.id));

  useEffect(() => {
    setPromoPage(1);
  }, [promoSearch, promoStatusFilter, promoDateFilter, promoSort]);

  useEffect(() => {
    if (promoPage > promoTotalPages) setPromoPage(promoTotalPages);
  }, [promoPage, promoTotalPages]);

  useEffect(() => {
    setCouponPage(1);
  }, [couponStatusFilter, couponDateFilter, couponSortKey, couponSortDirection]);

  useEffect(() => {
    if (couponPage > couponTotalPages) setCouponPage(couponTotalPages);
  }, [couponPage, couponTotalPages]);


  const handleDeleteCoupon = async (id: string) => {
    if (!id) return;
    setIsDeletingCoupon(true);
    setLoading(true);
    try {
      const { count, error: usageError } = await supabase
        .from("orders")
        .select("id", { count: "exact", head: true })
        .eq("coupon_id", id);
      if (usageError) throw usageError;
      if ((count ?? 0) > 0) {
        const { error } = await supabase.from("coupons").update({ is_active: false }).eq("id", id);
        if (error) throw error;
        setCouponList((prev) => prev.map((coupon) => coupon.id === id ? { ...coupon, is_active: false } : coupon));
        toast.success("Coupon utilisé : il a été désactivé et conservé pour l'historique des commandes.");
        return;
      }
      const { error } = await supabase.from("coupons").delete().eq("id", id);
      if (error) throw error;
      setCouponList((prev) => prev.filter((x) => x.id !== id));
      toast.success("Coupon supprimé.");
    } catch (err) {
      console.error("delete coupon", err);
      toast.error("Impossible de supprimer le coupon.");
    } finally {
      setIsDeletingCoupon(false);
      setLoading(false);
      setConfirmDeleteCouponId(null);
    }
  };

  const toggleCouponStatus = async (coupon: CouponRow) => {
    const nextStatus = !coupon.is_active;
    setIsUpdatingCouponStatus(true);
    setCouponList((prev) => prev.map((item) => item.id === coupon.id ? { ...item, is_active: nextStatus } : item));
    try {
      const { error } = await supabase.from("coupons").update({ is_active: nextStatus }).eq("id", coupon.id);
      if (error) throw error;
      toast.success(nextStatus ? "Coupon activé." : "Coupon désactivé.");
      return true;
    } catch (err) {
      console.error("toggle coupon status", err);
      setCouponList((prev) => prev.map((item) => item.id === coupon.id ? { ...item, is_active: coupon.is_active } : item));
      toast.error("Impossible de modifier le statut du coupon.");
      return false;
    } finally {
      setIsUpdatingCouponStatus(false);
    }
  };

  const handleDeleteSelectedCoupons = async () => {
    if (confirmDeleteCouponIds.length === 0) return;
    setIsDeletingCoupon(true);
    setLoading(true);
    try {
      const { data: usedOrders, error: usageError } = await supabase
        .from("orders")
        .select("coupon_id")
        .in("coupon_id", confirmDeleteCouponIds);
      if (usageError) throw usageError;
      const usedIds = new Set((usedOrders ?? []).map((order) => order.coupon_id).filter(Boolean));
      const unusedIds = confirmDeleteCouponIds.filter((id) => !usedIds.has(id));
      if (unusedIds.length > 0) {
        const { error } = await supabase.from("coupons").delete().in("id", unusedIds);
        if (error) throw error;
      }
      if (usedIds.size > 0) {
        const { error } = await supabase.from("coupons").update({ is_active: false }).in("id", [...usedIds]);
        if (error) throw error;
      }
      const deletedIds = new Set(unusedIds);
      setCouponList((prev) => prev
        .filter((coupon) => !deletedIds.has(coupon.id))
        .map((coupon) => usedIds.has(coupon.id) ? { ...coupon, is_active: false } : coupon));
      setSelectedCouponIds((prev) => prev.filter((id) => !deletedIds.has(id)));
      toast.success("Les coupons utilisés ont été conservés et désactivés; les autres ont été supprimés.");
    } catch (err) {
      console.error("delete selected coupons", err);
      toast.error("Impossible de supprimer les coupons sélectionnés.");
    } finally {
      setIsDeletingCoupon(false);
      setLoading(false);
      setConfirmDeleteCouponIds([]);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Promotions & coupons</h1>
        <p className="text-sm text-muted-foreground">Gérez vos remises catalogue et vos codes promo.</p>
      </div>

      <Tabs defaultValue="promotions">
        <TabsList>
          <TabsTrigger value="promotions">Promotions ({promos.length})</TabsTrigger>
          <TabsTrigger value="coupons">Coupons ({couponList.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="promotions" className="pt-5">
          <div className="mt-8 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex flex-wrap items-center gap-2">
              <Input
                value={promoSearch}
                onChange={(event) => setPromoSearch(event.target.value)}
                placeholder="Rechercher un produit..."
                className="w-80 sm:w-96"
              />
              <Select value={promoStatusFilter} onValueChange={(value) => setPromoStatusFilter(value as typeof promoStatusFilter)}>
                <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tous les statuts</SelectItem>
                  <SelectItem value="active">Actives</SelectItem>
                  <SelectItem value="inactive">Inactives</SelectItem>
                </SelectContent>
              </Select>
              <Select value={promoDateFilter} onValueChange={(value) => setPromoDateFilter(value as typeof promoDateFilter)}>
                <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Toutes les dates</SelectItem>
                  <SelectItem value="current">En cours</SelectItem>
                  <SelectItem value="upcoming">À venir</SelectItem>
                  <SelectItem value="ended">Terminées</SelectItem>
                  {/* <SelectItem value="undated">Sans date</SelectItem> */}
                </SelectContent>
              </Select>
            </div>
            <Button variant="accent" onClick={() => { setPromoDraft(emptyPromo); setPromoProductSearch(""); setPromoValidation({}); }}>
              <Plus className="h-4 w-4" /> Nouvelle promotion
            </Button>
          </div>
          {selectedPromoIds.length > 0 && (
            <div className="mt-3 mb-3">
              <Button variant="destructive" onClick={() => setConfirmDeletePromoIds(selectedPromoIds)}>
                <Trash2 className="h-4 w-4" /> Supprimer ({selectedPromoIds.length})
              </Button>
            </div>
          )}
          <div className="mt-6 overflow-x-auto rounded-xl border border-border bg-card">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-10">
                    <Checkbox
                      aria-label="Sélectionner toutes les promotions filtrées"
                      checked={allFilteredPromosSelected}
                      onCheckedChange={(checked) => {
                        setSelectedPromoIds((current) => {
                          if (checked) return Array.from(new Set([...current, ...sortedPromos.map((promo) => promo.id)]));
                          const filteredIds = new Set(sortedPromos.map((promo) => promo.id));
                          return current.filter((id) => !filteredIds.has(id));
                        });
                      }}
                    />
                  </TableHead>
                  <TableHead>Produit</TableHead>
                  <TableHead>
                    <button
                      type="button"
                      className="inline-flex items-center gap-2"
                      onClick={() => { setPromoSort((current) => current === "asc" ? "desc" : "asc"); setPromoPage(1); }}
                    >
                      <span>Remise</span>
                      <SortArrow dir={promoSort} ariaLabel="Trier par remise" />
                    </button>
                  </TableHead>
                  <TableHead>État</TableHead>
                  <TableHead>Période</TableHead>
                  <TableHead>Statut</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={7} className="py-14 text-center">
                      <div className="flex justify-center">
                        <Spinner showLabel />
                      </div>
                    </TableCell>
                  </TableRow>
                ) : paginatedPromos.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="py-14 text-center text-muted-foreground">
                      Aucune promotion ne correspond à ces critères.
                    </TableCell>
                  </TableRow>
                ) : (
                  paginatedPromos.map((p) => (
                    <TableRow key={p.id}>
                      <TableCell>
                        <Checkbox
                          aria-label={`Sélectionner la promotion ${getProductLabel(p.product_id)}`}
                          checked={selectedPromoIds.includes(p.id)}
                          onCheckedChange={(checked) => {
                            setSelectedPromoIds((current) => checked
                              ? Array.from(new Set([...current, p.id]))
                              : current.filter((id) => id !== p.id));
                          }}
                        />
                      </TableCell>
                      <TableCell className="font-medium">{p.product_id ? getProductLabel(p.product_id) : `Tout le catalogue`}</TableCell>
                      <TableCell className="font-semibold text-accent-strong">
                        {p.discount_type === "percentage" ? `-${p.discount_value}%` : `-${p.discount_value} DT`}
                      </TableCell>
                      <TableCell>
                        {(() => {
                          const dateStatus = getPromoDateStatus(p);
                          return (
                            <span className={`inline-flex rounded-full px-2 py-1 text-xs font-semibold ${dateStatus.className}`}>
                              {dateStatus.label}
                            </span>
                          );
                        })()}
                      </TableCell>
                      <TableCell className="text-muted-foreground">{formatPromoDate(p.starts_at)} → {formatPromoDate(p.ends_at)}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <span className={p.is_active ? "text-success" : "text-destructive"}>
                            {p.is_active ? "Active" : "Inactive"}
                          </span>
                          <button
                            type="button"
                            aria-label={p.is_active ? "Désactiver la promotion" : "Activer la promotion"}
                            title={p.is_active ? "Désactiver" : "Activer"}
                            className={p.is_active
                              ? "rounded p-1 text-success hover:bg-success/10"
                              : "rounded p-1 text-destructive hover:bg-destructive/10"}
                            onClick={() => setPromoStatusConfirm(p)}
                          >
                            <Power className="h-4 w-4" />
                          </button>
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <button aria-label="Modifier" className="mr-1 rounded p-1.5 text-foreground hover:bg-surface" onClick={() => {
                          setPromoDraft(isGlobalPromo(p) ? { ...p, product_id: ALL_PRODUCTS_VALUE } : p);
                          setPromoProductSearch("");
                          setPromoValidation({});
                        }}>
                          <Pencil className="h-4 w-4" />
                        </button>
                        <Button
                          type="button"
                          size="sm"
                          variant="ghost"
                          aria-label="Supprimer"
                          className="text-destructive"
                          onClick={() => setConfirmDeletePromoId(p.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
          <div className="flex items-center justify-between gap-4 px-3 py-3">
            <div className="text-sm text-foreground">
              {sortedPromos.length === 0 ? 0 : (promoPage - 1) * promoPageSize + 1}–{Math.min(promoPage * promoPageSize, sortedPromos.length)} sur {sortedPromos.length}
            </div>
            <Pagination className="mx-0 w-auto justify-end text-black">
              <PaginationContent>
                <PaginationPrevious
                  href="#"
                  className={promoPage === 1 ? "pointer-events-none opacity-50 text-black" : "text-black hover:text-black"}
                  onClick={(event) => { event.preventDefault(); setPromoPage((page) => Math.max(1, page - 1)); }}
                  aria-disabled={promoPage === 1}
                />
                {Array.from({ length: promoTotalPages }, (_, index) => index + 1).map((page) => (
                  <PaginationItem key={page}>
                    <PaginationLink
                      href="#"
                      isActive={page === promoPage}
                      className="text-black hover:text-black"
                      onClick={(event) => { event.preventDefault(); setPromoPage(page); }}
                    >
                      {page}
                    </PaginationLink>
                  </PaginationItem>
                ))}
                <PaginationNext
                  href="#"
                  className={promoPage === promoTotalPages ? "pointer-events-none opacity-50 text-black" : "text-black hover:text-black"}
                  onClick={(event) => { event.preventDefault(); setPromoPage((page) => Math.min(promoTotalPages, page + 1)); }}
                  aria-disabled={promoPage === promoTotalPages}
                />
              </PaginationContent>
            </Pagination>
          </div>
        </TabsContent>

        <TabsContent value="coupons" className="pt-5">
          <div className="mt-8 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex flex-wrap items-center gap-2">
              <Select value={couponStatusFilter} onValueChange={(value) => setCouponStatusFilter(value as typeof couponStatusFilter)}>
                <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tous les statuts</SelectItem>
                  <SelectItem value="active">Actifs</SelectItem>
                  <SelectItem value="inactive">Inactifs</SelectItem>
                </SelectContent>
              </Select>
              <Select value={couponDateFilter} onValueChange={(value) => setCouponDateFilter(value as typeof couponDateFilter)}>
              <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Toutes les dates</SelectItem>
                <SelectItem value="current">En cours</SelectItem>
                <SelectItem value="upcoming">À venir</SelectItem>
                <SelectItem value="ended">Terminés</SelectItem>
                {/* <SelectItem value="undated">Sans date</SelectItem> */}
              </SelectContent>
              </Select>
            </div>
            <Button variant="accent" onClick={() => { setCouponDraft(emptyCoupon); setCouponValidation({}); }}>
              <Plus className="h-4 w-4" /> Nouveau coupon
            </Button>
          </div>
          {selectedCouponIds.length > 0 && (
            <div className="mt-3 mb-3">
              <Button variant="destructive" onClick={() => setConfirmDeleteCouponIds(selectedCouponIds)}>
                <Trash2 className="h-4 w-4" /> Supprimer ({selectedCouponIds.length})
              </Button>
            </div>
          )}
          <div className="mt-6 overflow-x-auto rounded-xl border border-border bg-card">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-10">
                    <Checkbox
                      aria-label="Sélectionner tous les coupons filtrés"
                      checked={allFilteredCouponsSelected}
                      onCheckedChange={(checked) => {
                        setSelectedCouponIds((current) => {
                          if (checked) return Array.from(new Set([...current, ...sortedCoupons.map((coupon) => coupon.id)]));
                          const filteredIds = new Set(sortedCoupons.map((coupon) => coupon.id));
                          return current.filter((id) => !filteredIds.has(id));
                        });
                      }}
                    />
                  </TableHead>
                  <TableHead>Code</TableHead>
                  {(["value", "minimum", "usage"] as const).map((key) => {
                    const labels = { value: "Valeur", minimum: "Minimum", usage: "Utilisations" };
                    const isActive = couponSortKey === key && couponSortDirection;
                    return (
                      <TableHead key={key}>
                        <button
                          type="button"
                          className="inline-flex items-center gap-2"
                          onClick={() => {
                            setCouponSortKey(key);
                            setCouponSortDirection((current) => couponSortKey === key ? (current === "asc" ? "desc" : "asc") : "asc");
                          }}
                        >
                          <span>{labels[key]}</span>
                          <SortArrow dir={isActive ? couponSortDirection : null} ariaLabel={`Trier par ${labels[key]}`} />
                        </button>
                      </TableHead>
                    );
                  })}
                  <TableHead>Validité</TableHead>
                  <TableHead>État</TableHead>
                  <TableHead>Statut</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow><TableCell colSpan={9} className="py-14 text-center"><div className="flex justify-center"><Spinner showLabel /></div></TableCell></TableRow>
                ) : paginatedCoupons.length === 0 ? (
                  <TableRow><TableCell colSpan={9} className="py-14 text-center text-muted-foreground">Aucun coupon ne correspond à ces critères.</TableCell></TableRow>
                ) : paginatedCoupons.map((c) => (
                  <TableRow key={c.id}>
                    <TableCell>
                      <Checkbox
                        aria-label={`Sélectionner le coupon ${c.code}`}
                        checked={selectedCouponIds.includes(c.id)}
                        onCheckedChange={(checked) => {
                          setSelectedCouponIds((current) => checked
                            ? Array.from(new Set([...current, c.id]))
                            : current.filter((id) => id !== c.id));
                        }}
                      />
                    </TableCell>
                    <TableCell className="font-mono font-semibold">{c.code}</TableCell>
                    <TableCell>{c.discount_type === "percentage" ? `-${c.discount_value}%` : `-${c.discount_value} DT`}</TableCell>
                    <TableCell className="text-muted-foreground">{c.min_order_amount ?? 0} DT</TableCell>
                    <TableCell className="text-muted-foreground">{c.used_count ?? 0}/{c.max_uses ?? "—"}</TableCell>
                    <TableCell className="text-muted-foreground">{formatPromoDate(c.starts_at)} → {formatPromoDate(c.expires_at)}</TableCell>
                    <TableCell>
                      {(() => {
                        const dateStatus = getPromoDateStatus({ starts_at: c.starts_at, ends_at: c.expires_at });
                        return <span className={`inline-flex rounded-full px-2 py-1 text-xs font-semibold ${dateStatus.className}`}>{dateStatus.label}</span>;
                      })()}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <span className={c.is_active ? "text-success" : "text-destructive"}>{c.is_active ? "Actif" : "Inactif"}</span>
                        <Button
                          type="button"
                          size="sm"
                          variant="ghost"
                          className={c.is_active ? "text-success" : "text-destructive"}
                          aria-label={c.is_active ? "Désactiver le coupon" : "Activer le coupon"}
                          onClick={() => setCouponStatusConfirm(c)}
                        >
                          <Power className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                      <TableCell className="text-right">
                      <button aria-label="Modifier" className="mr-1 rounded p-1.5 text-foreground hover:bg-surface" onClick={() => { setCouponDraft(c); setCouponValidation({}); }}>
                        <Pencil className="h-4 w-4" />
                      </button>
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        aria-label="Supprimer"
                        className="text-destructive"
                        onClick={() => setConfirmDeleteCouponId(c.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          <div className="flex items-center justify-between gap-4 px-3 py-3">
            <div className="text-sm text-foreground">
              {sortedCoupons.length === 0 ? 0 : (couponPage - 1) * couponPageSize + 1}–{Math.min(couponPage * couponPageSize, sortedCoupons.length)} sur {sortedCoupons.length}
            </div>
            <Pagination className="mx-0 w-auto justify-end text-black">
              <PaginationContent>
                <PaginationPrevious
                  href="#"
                  className={couponPage === 1 ? "pointer-events-none opacity-50 text-black" : "text-black hover:text-black"}
                  onClick={(event) => { event.preventDefault(); setCouponPage((page) => Math.max(1, page - 1)); }}
                  aria-disabled={couponPage === 1}
                />
                {Array.from({ length: couponTotalPages }, (_, index) => index + 1).map((page) => (
                  <PaginationItem key={page}>
                    <PaginationLink href="#" isActive={page === couponPage} className="text-black hover:text-black" onClick={(event) => { event.preventDefault(); setCouponPage(page); }}>{page}</PaginationLink>
                  </PaginationItem>
                ))}
                <PaginationNext
                  href="#"
                  className={couponPage === couponTotalPages ? "pointer-events-none opacity-50 text-black" : "text-black hover:text-black"}
                  onClick={(event) => { event.preventDefault(); setCouponPage((page) => Math.min(couponTotalPages, page + 1)); }}
                  aria-disabled={couponPage === couponTotalPages}
                />
              </PaginationContent>
            </Pagination>
          </div>
        </TabsContent>
      </Tabs>

      {/* Dialog promotion */}
      <Dialog open={promoDraft !== null} onOpenChange={(o) => !o && setPromoDraft(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{promoDraft?.id ? "Modifier la promotion" : "Nouvelle promotion"}</DialogTitle>
          </DialogHeader>
          {promoDraft && (
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Type de remise *</Label>
                <Select
                  value={promoDraft.discount_type ?? "percentage"}
                  onValueChange={(v) => setPromoDraft({ ...promoDraft, discount_type: v })}
                >
                  <SelectTrigger
                    ref={promoTypeRef}
                    aria-required="true"
                    aria-invalid={Boolean(promoValidation.type)}
                    className={promoValidation.type ? "border-destructive focus:ring-destructive" : undefined}
                    onFocus={() => setPromoValidation(({ type: _type, ...rest }) => rest)}
                  >
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="percentage">Pourcentage</SelectItem>
                    <SelectItem value="fixed">Montant fixe</SelectItem>
                  </SelectContent>
                </Select>
                {promoValidation.type && <p className="text-xs text-destructive">{promoValidation.type}</p>}
              </div>
              <div className="space-y-2">
                <Label>Valeur *</Label>
                <Input
                  ref={promoValueRef}
                  required
                  aria-required="true"
                  aria-invalid={Boolean(promoValidation.value)}
                  className={promoValidation.value ? "border-destructive focus-visible:ring-destructive" : undefined}
                  type="number"
                  value={promoDraft.discount_value ?? 0}
                  onChange={(e) => {
                    setPromoDraft({ ...promoDraft, discount_value: Number(e.target.value) });
                    setPromoValidation(({ value: _value, ...rest }) => rest);
                  }}
                />
                {promoValidation.value && <p className="text-xs text-destructive">{promoValidation.value}</p>}
              </div>
              <div className="space-y-2">
                <Label>Produit *</Label>
                <Select
                  value={promoDraft.product_id === null ? ALL_PRODUCTS_VALUE : (promoDraft.product_id ?? "")}
                  onValueChange={(v) => {
                    setPromoDraft({ ...promoDraft, product_id: v });
                    setPromoValidation(({ product: _product, ...rest }) => rest);
                  }}
                >
                  <SelectTrigger
                    ref={promoProductRef}
                    aria-required="true"
                    aria-invalid={Boolean(promoValidation.product)}
                    className={promoValidation.product ? "border-destructive focus:ring-destructive" : undefined}
                  >
                    <SelectValue placeholder="Sélectionner un produit" />
                  </SelectTrigger>
                  <SelectContent>
                    <div className="p-2" onKeyDown={(event) => event.stopPropagation()}>
                      <Input
                        value={promoProductSearch}
                        onChange={(event) => setPromoProductSearch(event.target.value)}
                        placeholder="Rechercher par nom ou SKU..."
                        aria-label="Rechercher un produit"
                        autoFocus
                      />
                    </div>
                    <SelectItem value={ALL_PRODUCTS_VALUE}>Tous les produits</SelectItem>
                    {filteredPromoProducts.map((p) => (
                      <SelectItem key={p.id} value={p.id}>{p.sku ?? p.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {promoValidation.product && <p className="text-xs text-destructive">{promoValidation.product}</p>}
              </div>
              <div className="space-y-2">
                <Label>Début</Label>
                <Input type="date" value={formatDateInput(promoDraft.starts_at)} onChange={(e) => setPromoDraft({ ...promoDraft, starts_at: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>Fin</Label>
                <Input type="date" value={formatDateInput(promoDraft.ends_at)} onChange={(e) => setPromoDraft({ ...promoDraft, ends_at: e.target.value })} />
              </div>
              <div className="flex items-center gap-3 sm:col-span-2">
                <Switch checked={!!promoDraft.is_active} onCheckedChange={(v) => setPromoDraft({ ...promoDraft, is_active: v })} />
                <Label className="font-normal">Promotion active</Label>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setPromoDraft(null)} disabled={isSavingPromo}>Annuler</Button>
            <Button variant="accent" onClick={savePromo} disabled={isSavingPromo}>
              {isSavingPromo ? (
                <Spinner
                  className="h-4 w-4"
                  label={promoDraft?.id ? "Modification..." : "Enregistrement..."}
                  showLabel
                />
              ) : "Enregistrer"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Confirm promotion status change */}
      <Dialog open={Boolean(promoStatusConfirm)} onOpenChange={(open) => { if (!open) setPromoStatusConfirm(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{promoStatusConfirm?.is_active ? "Désactiver la promotion" : "Activer la promotion"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-2 text-sm">
            <p>
              Vous allez {promoStatusConfirm?.is_active ? "désactiver" : "activer"} la promotion de
              <span className="font-semibold"> {promoStatusConfirm ? getPromoScopeLabel(promoStatusConfirm) : ""}</span>.
            </p>
            {promoStatusConfirm && (
              <p className="text-muted-foreground">
                Remise : {promoStatusConfirm.discount_type === "percentage"
                  ? `-${promoStatusConfirm.discount_value}%`
                  : `-${promoStatusConfirm.discount_value} DT`}
              </p>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPromoStatusConfirm(null)} disabled={isUpdatingPromoStatus}>Annuler</Button>
            <Button
              variant="accent"
              onClick={async () => {
                if (!promoStatusConfirm) return;
                const changed = await togglePromoStatus(promoStatusConfirm);
                if (changed) setPromoStatusConfirm(null);
              }}
              disabled={isUpdatingPromoStatus}
            >
              {isUpdatingPromoStatus ? (
                <Spinner className="h-4 w-4" />
              ) : (
                promoStatusConfirm?.is_active ? "Désactiver" : "Activer"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Confirm coupon status change */}
      <Dialog open={Boolean(couponStatusConfirm)} onOpenChange={(open) => { if (!open) setCouponStatusConfirm(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{couponStatusConfirm?.is_active ? "Désactiver le coupon" : "Activer le coupon"}</DialogTitle>
          </DialogHeader>
          {couponStatusConfirm && (
            <div className="space-y-2 text-sm">
              <p>
                Vous allez {couponStatusConfirm.is_active ? "désactiver" : "activer"} le coupon <strong>{couponStatusConfirm.code}</strong>.
              </p>
              <p className="text-muted-foreground">
                Valeur : {couponStatusConfirm.discount_type === "percentage" ? `-${couponStatusConfirm.discount_value}%` : `-${couponStatusConfirm.discount_value} DT`}
              </p>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setCouponStatusConfirm(null)} disabled={isUpdatingCouponStatus}>Annuler</Button>
            <Button
              variant="accent"
              onClick={async () => {
                if (!couponStatusConfirm) return;
                const changed = await toggleCouponStatus(couponStatusConfirm);
                if (changed) setCouponStatusConfirm(null);
              }}
              disabled={isUpdatingCouponStatus}
            >
              {isUpdatingCouponStatus ? <Spinner className="h-4 w-4" /> : (couponStatusConfirm ? (couponStatusConfirm.is_active ? "Désactiver" : "Activer") : "Activer")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Confirm delete promotion */}
      <Dialog open={Boolean(confirmDeletePromoId)} onOpenChange={(v) => { if (!v) setConfirmDeletePromoId(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirmer la suppression</DialogTitle>
          </DialogHeader>
          <p>Voulez-vous vraiment supprimer cette promotion ? Cette action est irréversible.</p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmDeletePromoId(null)} disabled={isDeletingPromo}>Annuler</Button>
            <Button
              variant="accent"
              className="bg-destructive hover:bg-destructive/90"
              onClick={async () => { if (confirmDeletePromoId) await handleDeletePromo(confirmDeletePromoId); }}
              disabled={isDeletingPromo}
            >
              {isDeletingPromo ? <Spinner className="h-4 w-4" /> : "Supprimer"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Confirm replacement of an existing product promotion */}
      <Dialog open={Boolean(promoConflict)} onOpenChange={(v) => { if (!v && !isReplacingPromo) setPromoConflict(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Remplacer la promotion existante</DialogTitle>
          </DialogHeader>
          {promoConflict && (
            <div className="space-y-3 text-sm">
              <p>
                Une promotion existe déjà pour <strong>{getPromoScopeLabel(promoConflict.existing)}</strong>.
              </p>
              <div className="rounded-md border border-border bg-muted/30 p-3">
                <p className="text-muted-foreground">
                  Ancienne remise : <strong className="text-foreground">{promoConflict.existing.discount_type === "percentage" ? `-${promoConflict.existing.discount_value}%` : `-${promoConflict.existing.discount_value} DT`}</strong>
                </p>
                <p className="text-muted-foreground">
                  Nouvelle remise : <strong className="text-foreground">{promoConflict.payload.discount_type === "percentage" ? `-${promoConflict.payload.discount_value}%` : `-${promoConflict.payload.discount_value} DT`}</strong>
                </p>
              </div>
              <p className="font-medium text-destructive">
                La nouvelle promotion remplacera définitivement l'ancienne.
              </p>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setPromoConflict(null)} disabled={isReplacingPromo}>Annuler</Button>
            <Button variant="accent" onClick={replaceConflictingPromo} disabled={isReplacingPromo}>
              {isReplacingPromo ? <Spinner className="h-4 w-4" /> : "Remplacer"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Confirm bulk delete promotions */}
      <Dialog open={confirmDeletePromoIds.length > 0} onOpenChange={(v) => { if (!v && !isDeletingPromo) setConfirmDeletePromoIds([]); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Supprimer les promotions sélectionnées</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 text-sm">
            <p>
              Vous allez supprimer définitivement <strong>{confirmDeletePromoIds.length} promotion{confirmDeletePromoIds.length > 1 ? "s" : ""}</strong>.
            </p>
            <div className="max-h-40 overflow-y-auto rounded-md border border-border bg-muted/30 p-3">
              {selectedPromos.length > 0 ? (
                <ul className="space-y-1 text-muted-foreground">
                  {selectedPromos.map((promo) => (
                    <li key={promo.id} className="truncate">• {getPromoScopeLabel(promo)} — {promo.discount_type === "percentage" ? `-${promo.discount_value}%` : `-${promo.discount_value} DT`}</li>
                  ))}
                </ul>
              ) : (
                <p className="text-muted-foreground">Aucune promotion sélectionnée.</p>
              )}
            </div>
            <p className="font-medium text-destructive">Cette action est irréversible.</p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmDeletePromoIds([])} disabled={isDeletingPromo}>Annuler</Button>
            <Button
              variant="destructive"
              onClick={handleDeleteSelectedPromos}
              disabled={isDeletingPromo || confirmDeletePromoIds.length === 0}
            >
              {isDeletingPromo ? <Spinner className="h-4 w-4" /> : "Supprimer définitivement"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Confirm delete coupon */}
      <Dialog open={Boolean(confirmDeleteCouponId)} onOpenChange={(v) => { if (!v) setConfirmDeleteCouponId(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirmer la suppression</DialogTitle>
          </DialogHeader>
          <p>Voulez-vous vraiment supprimer ce coupon ? Cette action est irréversible.</p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmDeleteCouponId(null)} disabled={isDeletingCoupon}>Annuler</Button>
            <Button
              variant="accent"
              className="bg-destructive hover:bg-destructive/90"
              onClick={async () => { if (confirmDeleteCouponId) await handleDeleteCoupon(confirmDeleteCouponId); }}
              disabled={isDeletingCoupon}
            >
              {isDeletingCoupon ? <Spinner className="h-4 w-4" /> : "Supprimer"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Confirm bulk delete coupons */}
      <Dialog open={confirmDeleteCouponIds.length > 0} onOpenChange={(open) => { if (!open && !isDeletingCoupon) setConfirmDeleteCouponIds([]); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Supprimer les coupons sélectionnés</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 text-sm">
            <p>
              Vous allez supprimer définitivement <strong>{confirmDeleteCouponIds.length} coupon{confirmDeleteCouponIds.length > 1 ? "s" : ""}</strong>.
            </p>
            <div className="max-h-40 overflow-y-auto rounded-md border border-border bg-muted/30 p-3">
              {selectedCoupons.length > 0 ? (
                <ul className="space-y-1 text-muted-foreground">
                  {selectedCoupons.map((coupon) => (
                    <li key={coupon.id} className="truncate">• {coupon.code} — {coupon.discount_type === "percentage" ? `-${coupon.discount_value}%` : `-${coupon.discount_value} DT`}</li>
                  ))}
                </ul>
              ) : (
                <p className="text-muted-foreground">Aucun coupon sélectionné.</p>
              )}
            </div>
            <p className="font-medium text-destructive">Cette action est irréversible.</p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmDeleteCouponIds([])} disabled={isDeletingCoupon}>Annuler</Button>
            <Button variant="destructive" onClick={handleDeleteSelectedCoupons} disabled={isDeletingCoupon || confirmDeleteCouponIds.length === 0}>
              {isDeletingCoupon ? <Spinner className="h-4 w-4" /> : "Supprimer définitivement"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog coupon */}
      <Dialog open={couponDraft !== null} onOpenChange={(o) => !o && setCouponDraft(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{couponDraft?.id ? "Modifier le coupon" : "Nouveau coupon"}</DialogTitle>
          </DialogHeader>
          {couponDraft && (
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Code</Label>
                <Input
                  ref={couponCodeRef}
                  value={couponDraft.code ?? ""}
                  aria-invalid={Boolean(couponValidation.code)}
                  className={couponValidation.code ? "border-destructive focus-visible:ring-destructive" : undefined}
                  onChange={(e) => { setCouponDraft({ ...couponDraft, code: e.target.value.toUpperCase() }); setCouponValidation(({ code: _code, ...rest }) => rest); }}
                />
                {couponValidation.code && <p className="text-xs text-destructive">{couponValidation.code}</p>}
              </div>
              <div className="space-y-2">
                <Label>Type</Label>
                <Select
                  value={couponDraft.discount_type ?? "percentage"}
                  onValueChange={(v) => { setCouponDraft({ ...couponDraft, discount_type: v }); setCouponValidation(({ type: _type, ...rest }) => rest); }}
                >
                  <SelectTrigger ref={couponTypeRef} aria-invalid={Boolean(couponValidation.type)} className={couponValidation.type ? "border-destructive focus:ring-destructive" : undefined}><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="percentage">Pourcentage</SelectItem>
                    <SelectItem value="fixed">Montant fixe</SelectItem>
                    <SelectItem value="free_shipping">Livraison gratuite</SelectItem>
                  </SelectContent>
                </Select>
                {couponValidation.type && <p className="text-xs text-destructive">{couponValidation.type}</p>}
              </div>
              <div className="space-y-2">
                <Label>Valeur</Label>
                <Input
                  ref={couponValueRef}
                  type="number"
                  value={couponDraft.discount_value ?? 0}
                  aria-invalid={Boolean(couponValidation.value)}
                  className={couponValidation.value ? "border-destructive focus-visible:ring-destructive" : undefined}
                  onChange={(e) => { setCouponDraft({ ...couponDraft, discount_value: Number(e.target.value) }); setCouponValidation(({ value: _value, ...rest }) => rest); }}
                />
                {couponValidation.value && <p className="text-xs text-destructive">{couponValidation.value}</p>}
              </div>
              <div className="space-y-2">
                <Label>Montant minimum (DT)</Label>
                <Input type="number" value={couponDraft.min_order_amount ?? 0} onChange={(e) => setCouponDraft({ ...couponDraft, min_order_amount: Number(e.target.value) })} />
              </div>
              <div className="space-y-2">
                <Label>Début</Label>
                <Input type="date" value={formatDateInput(couponDraft.starts_at)} onChange={(e) => setCouponDraft({ ...couponDraft, starts_at: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>Fin</Label>
                <Input type="date" value={formatDateInput(couponDraft.expires_at)} onChange={(e) => setCouponDraft({ ...couponDraft, expires_at: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>Limite d'utilisation</Label>
                <Input type="number" value={couponDraft.max_uses ?? 0} onChange={(e) => setCouponDraft({ ...couponDraft, max_uses: Number(e.target.value) })} />
              </div>
              <div className="space-y-2">
                <Label>Limite par utilisateur</Label>
                <Input type="number" min={1} value={couponDraft.max_uses_per_user ?? 1} onChange={(e) => setCouponDraft({ ...couponDraft, max_uses_per_user: Number(e.target.value) })} />
              </div>
              <div className="flex items-center gap-3">
                <Switch checked={!!couponDraft.is_active} onCheckedChange={(v) => setCouponDraft({ ...couponDraft, is_active: v })} />
                <Label className="font-normal">Coupon actif</Label>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setCouponDraft(null)}>Annuler</Button>
            <Button variant="accent" onClick={saveCoupon}>Enregistrer</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
