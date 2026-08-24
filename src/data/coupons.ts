// Coupon/promotion validation is done server-side against the real
// `coupons`/`promotions` tables (see database/create-order-rpc.sql —
// `validate_coupon` and `create_order` RPCs).
//
// SHIPPING_FEE (7 DT en dur) a ete retire : la boutique livre toute la Tunisie
// au meme tarif, defini dans /admin/parametres et lu via
// `useSiteSettings().settings.shipping_price` (cf. database/shipping-flat-rate.sql).
export {};
