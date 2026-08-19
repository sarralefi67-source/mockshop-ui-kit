import type { Coupon, Promotion } from "@/types";
import { GOVERNORATES } from "@/data/governorates";

export const coupons: Coupon[] = [
  {
    id: "cp-1",
    code: "BIENVENUE10",
    type: "percent",
    value: 10,
    min_amount: 100,
    starts_at: "2026-01-01",
    ends_at: "2026-12-31",
    usage_limit: 500,
    used_count: 128,
    is_active: true,
  },
  {
    id: "cp-2",
    code: "LIVRAISON7",
    type: "fixed",
    value: 7,
    min_amount: 150,
    starts_at: "2026-06-01",
    ends_at: "2026-09-30",
    usage_limit: 200,
    used_count: 41,
    is_active: true,
  },
  {
    id: "cp-3",
    code: "RENTREE20",
    type: "percent",
    value: 20,
    min_amount: 400,
    starts_at: "2026-08-15",
    ends_at: "2026-10-01",
    usage_limit: 100,
    used_count: 0,
    is_active: false,
  },
];

export const promotions: Promotion[] = [
  {
    id: "pr-1",
    name: "Soldes Informatique",
    discount_percent: 15,
    category_id: "c-info",
    starts_at: "2026-08-01",
    ends_at: "2026-08-31",
    is_active: true,
  },
  {
    id: "pr-2",
    name: "Back to School Audio",
    discount_percent: 25,
    category_id: "c-tel-audio",
    starts_at: "2026-08-15",
    ends_at: "2026-09-20",
    is_active: true,
  },
  {
    id: "pr-3",
    name: "Black Friday",
    discount_percent: 40,
    category_id: null,
    starts_at: "2026-11-25",
    ends_at: "2026-11-30",
    is_active: false,
  },
];

// GOVERNORATES moved to src/data/governorates.ts

export const SHIPPING_FEE = 7;
