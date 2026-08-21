// Coupon/promotion validation is done server-side against the real
// `coupons`/`promotions` tables (see database/create-order-rpc.sql —
// `validate_coupon` and `create_order` RPCs). This file only keeps the
// flat shipping estimate used for a quick cart-summary display outside
// the checkout flow itself (checkout computes the exact per-governorate
// rate live from `shipping_rates`).
export const SHIPPING_FEE = 7;
