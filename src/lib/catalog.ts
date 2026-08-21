// Live Supabase data layer for the storefront catalog (products + categories).
// Maps DB rows onto the existing mock-shaped `Product`/`Category` types so
// components (ProductCard, category/product pages...) don't need to change.
import { supabase } from "@/lib/supabaseClient";
import type { Category, Product, ProductAttribute, ProductImage, ProductVariant } from "@/types";

const PRODUCT_SELECT = `
  *,
  product_images(*),
  product_attributes(
    attribute_id,
    attributes(id, name, display_type, attribute_values(*))
  ),
  product_variants(
    *,
    variant_attribute_values(
      attribute_value_id,
      attribute_values(id, value, color_hex, attribute_id)
    )
  )
`;

const DISPLAY_TYPE_TO_UI: Record<string, ProductAttribute["type"]> = {
  color_swatch: "swatch",
  image_swatch: "image",
  select: "button",
};

const NEW_WINDOW_DAYS = 30;

// A promotion row, keyed by product_id (product_id is UNIQUE in the DB — at
// most one active promotion per product, see database/fix-is-admin-null-bypass.sql
// era discussion / admin.promotions.tsx).
type PromoMap = Map<string, { discount_type: string | null; discount_value: number }>;
type ReviewStats = Map<string, { avg: number; count: number }>;

function applyDiscount(price: number, promo?: { discount_type: string | null; discount_value: number }) {
  if (!promo) return price;
  if (promo.discount_type === "percentage") return Math.max(0, price * (1 - promo.discount_value / 100));
  if (promo.discount_type === "fixed") return Math.max(0, price - promo.discount_value);
  return price;
}

function mapProductRow(row: any, promoByProduct: PromoMap, reviewStats: ReviewStats): Product {
  const attributes: ProductAttribute[] = (row.product_attributes ?? [])
    .map((pa: any) => pa.attributes)
    .filter(Boolean)
    .map((attr: any) => ({
      id: attr.id,
      name: attr.name,
      // No `code` column on attributes in the real schema — the attribute's
      // own id doubles as the (opaque) selection key, matching the Product
      // type's documented contract ("keyed by the REAL attribute id").
      code: attr.id,
      type: DISPLAY_TYPE_TO_UI[attr.display_type ?? "select"] ?? "button",
      values: (attr.attribute_values ?? []).map((v: any) => ({
        id: v.id,
        label: v.value,
        hex: v.color_hex ?? undefined,
      })),
    }));

  const images: ProductImage[] = (row.product_images ?? [])
    .slice()
    .sort((a: any, b: any) => (a.position ?? 0) - (b.position ?? 0))
    .map((img: any) => ({
      id: img.id,
      product_id: img.product_id,
      url: img.url,
      alt: row.name,
      position: img.position ?? 0,
      is_main: img.is_main ?? false,
      variant_value: img.variant_value ?? null,
    }));

  const promo = promoByProduct.get(row.id);
  const basePrice = Number(row.base_price ?? 0);
  const price = applyDiscount(basePrice, promo);
  const compareAtPrice = promo ? basePrice : null;

  const variants: ProductVariant[] = (row.product_variants ?? [])
    .filter((v: any) => v.is_active !== false)
    .slice()
    .sort((a: any, b: any) => (a.position ?? 0) - (b.position ?? 0))
    .map((v: any) => {
      const options: Record<string, string> = {};
      (v.variant_attribute_values ?? []).forEach((vav: any) => {
        const av = vav.attribute_values;
        if (av?.attribute_id) options[av.attribute_id] = av.id;
      });
      const variantBase = Number(v.price ?? basePrice);
      const variantPrice = applyDiscount(variantBase, promo);
      return {
        id: v.id,
        product_id: v.product_id,
        sku: v.sku ?? "",
        options,
        price: variantPrice,
        compare_at_price: promo ? variantBase : (v.compare_at_price ?? null),
        stock: v.stock_quantity ?? 0,
        position: v.position ?? 0,
      };
    });

  const stats = reviewStats.get(row.id);

  return {
    id: row.id,
    name: row.name,
    slug: row.slug,
    brand: row.brand ?? "",
    category_id: row.category_id ?? null,
    short_description: row.short_description ?? "",
    description: row.description ?? "",
    price,
    compare_at_price: compareAtPrice,
    stock: row.stock_quantity ?? 0,
    sku: row.sku ?? "",
    is_active: row.is_active ?? true,
    is_new: row.created_at
      ? (Date.now() - new Date(row.created_at).getTime()) / 86_400_000 <= NEW_WINDOW_DAYS
      : false,
    rating: stats?.avg ?? 0,
    reviews_count: stats?.count ?? 0,
    created_at: row.created_at ?? new Date().toISOString(),
    images,
    attributes,
    variants,
    tags: [],
  };
}

async function fetchPromoMap(): Promise<PromoMap> {
  const { data, error } = await supabase.from("promotions").select("*").eq("is_active", true);
  if (error) throw error;
  const now = new Date().toISOString();
  const map: PromoMap = new Map();
  (data ?? []).forEach((promo: any) => {
    if (promo.starts_at && promo.starts_at > now) return;
    if (promo.ends_at && promo.ends_at < now) return;
    if (!promo.product_id) return;
    map.set(promo.product_id, { discount_type: promo.discount_type, discount_value: Number(promo.discount_value ?? 0) });
  });
  return map;
}

async function fetchReviewStats(productIds?: string[]): Promise<ReviewStats> {
  let query = supabase.from("reviews").select("product_id, rating").eq("is_approved", true);
  if (productIds) query = query.in("product_id", productIds);
  const { data, error } = await query;
  if (error) throw error;
  const sums = new Map<string, { sum: number; count: number }>();
  (data ?? []).forEach((r: any) => {
    if (!r.product_id) return;
    const entry = sums.get(r.product_id) ?? { sum: 0, count: 0 };
    entry.sum += Number(r.rating ?? 0);
    entry.count += 1;
    sums.set(r.product_id, entry);
  });
  const stats: ReviewStats = new Map();
  sums.forEach((v, k) => stats.set(k, { avg: v.sum / v.count, count: v.count }));
  return stats;
}

/** All active products, with live pricing (promotions), rating (approved reviews) and variants. */
export async function fetchActiveProducts(): Promise<Product[]> {
  const [{ data, error }, promoByProduct, reviewStats] = await Promise.all([
    supabase.from("products").select(PRODUCT_SELECT).eq("is_active", true).order("created_at", { ascending: false }),
    fetchPromoMap(),
    fetchReviewStats(),
  ]);
  if (error) throw error;
  return (data ?? []).map((row: any) => mapProductRow(row, promoByProduct, reviewStats));
}

/** Single active product by slug, or null if not found/inactive. */
export async function fetchProductBySlug(slug: string): Promise<Product | null> {
  const { data, error } = await supabase
    .from("products")
    .select(PRODUCT_SELECT)
    .eq("slug", slug)
    .eq("is_active", true)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;
  const [promoByProduct, reviewStats] = await Promise.all([
    fetchPromoMap(),
    fetchReviewStats([(data as any).id]),
  ]);
  return mapProductRow(data, promoByProduct, reviewStats);
}

function mapCategoryRow(row: any): Category {
  return {
    id: row.id,
    // Root categories self-reference (parent_id = id) at the DB level — see
    // database/categories-parent-id.sql. Normalize back to null so the
    // existing buildCategoryTree/categoryPath/categoryWithDescendants helpers
    // (which treat falsy parent_id as "root") don't loop on self-reference.
    parent_id: row.parent_id === row.id ? null : row.parent_id,
    name: row.name,
    slug: row.slug,
    description: row.description ?? null,
    image_url: row.image_url ?? null,
    subcategories_count: row.subcategories_count ?? 0,
    created_at: row.created_at ?? undefined,
    updated_at: row.updated_at ?? undefined,
  };
}

export async function fetchCategories(): Promise<Category[]> {
  const { data, error } = await supabase.from("categories").select("*").order("name", { ascending: true });
  if (error) throw error;
  return (data ?? []).map(mapCategoryRow);
}

export type Banner = {
  id: string;
  title: string | null;
  subtitle: string | null;
  image_url: string;
  link_url: string | null;
  position: number;
};

export async function fetchActiveBanners(): Promise<Banner[]> {
  const { data, error } = await supabase
    .from("banners")
    .select("id, title, subtitle, image_url, link_url, position")
    .eq("is_active", true)
    .order("position", { ascending: true });
  if (error) throw error;
  return data ?? [];
}
