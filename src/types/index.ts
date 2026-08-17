// Types modélisés comme une future base de données (Supabase-ready).
// Chaque interface correspond à une table potentielle.

export interface Category {
  id: string;
  parent_id: string | null;
  name: string;
  slug: string;
  description?: string;
  image?: string;
  position: number;
  is_active: boolean;
}

export interface CategoryNode extends Category {
  children: CategoryNode[];
}

export interface ProductImage {
  id: string;
  product_id: string;
  url: string;
  alt: string;
  position: number;
  /** Valeur d'attribut (ex: couleur) à laquelle cette image est rattachée */
  variant_value?: string | null;
}

export interface ProductAttribute {
  id: string;
  name: string;
  code: "color" | "size" | string;
  type: "swatch" | "button";
  values: ProductAttributeValue[];
}

export interface ProductAttributeValue {
  id: string;
  label: string;
  /** Code couleur hex pour les swatchs */
  hex?: string;
}

export interface ProductVariant {
  id: string;
  product_id: string;
  sku: string;
  /** map code attribut -> id de valeur, ex { color: "c-noir", size: "s-m" } */
  options: Record<string, string>;
  price: number;
  compare_at_price: number | null;
  stock: number;
  is_active: boolean;
}

export interface Product {
  id: string;
  name: string;
  slug: string;
  brand: string;
  category_id: string;
  short_description: string;
  description: string;
  price: number;
  compare_at_price: number | null;
  stock: number;
  sku: string;
  is_active: boolean;
  is_new: boolean;
  rating: number;
  reviews_count: number;
  created_at: string;
  images: ProductImage[];
  attributes: ProductAttribute[];
  variants: ProductVariant[];
  tags: string[];
}

export interface Review {
  id: string;
  product_id: string;
  author: string;
  rating: number;
  title: string;
  body: string;
  created_at: string;
  verified: boolean;
}

export interface Coupon {
  id: string;
  code: string;
  type: "percent" | "fixed";
  value: number;
  min_amount: number;
  starts_at: string;
  ends_at: string;
  usage_limit: number;
  used_count: number;
  is_active: boolean;
}

export interface Promotion {
  id: string;
  name: string;
  discount_percent: number;
  category_id: string | null;
  starts_at: string;
  ends_at: string;
  is_active: boolean;
}

export interface Address {
  id: string;
  label: string;
  full_name: string;
  phone: string;
  line1: string;
  city: string;
  governorate: string;
  postal_code: string;
  is_default: boolean;
}

export type OrderStatus =
  | "pending"
  | "confirmed"
  | "shipped"
  | "delivered"
  | "cancelled";

export interface OrderItem {
  id: string;
  product_id: string;
  variant_id: string | null;
  name: string;
  variant_label: string | null;
  image: string;
  unit_price: number;
  quantity: number;
}

export interface Order {
  id: string;
  reference: string;
  customer_name: string;
  customer_phone: string;
  status: OrderStatus;
  payment_method: "cod";
  subtotal: number;
  shipping: number;
  discount: number;
  total: number;
  governorate: string;
  created_at: string;
  items: OrderItem[];
}

export interface CartItem {
  key: string;
  product_id: string;
  variant_id: string | null;
  slug: string;
  name: string;
  variant_label: string | null;
  image: string;
  unit_price: number;
  compare_at_price: number | null;
  quantity: number;
  max_stock: number;
}

export interface Customer {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  newsletter: boolean;
}
