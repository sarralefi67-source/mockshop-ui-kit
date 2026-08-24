import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import type { CartItem } from "@/types";
import { useSiteSettings } from "@/context/SiteSettingsContext";
import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/lib/supabaseClient";

interface AppliedCoupon {
  code: string;
  discount: number;
}

interface StoreContextValue {
  items: CartItem[];
  addItem: (item: Omit<CartItem, "key" | "quantity">, quantity?: number) => void;
  removeItem: (key: string) => void;
  updateQuantity: (key: string, quantity: number) => void;
  clearCart: () => void;
  count: number;
  subtotal: number;
  shipping: number;
  total: number;
  cartOpen: boolean;
  setCartOpen: (open: boolean) => void;
  wishlist: string[];
  toggleWishlist: (productId: string) => void;
  isWishlisted: (productId: string) => boolean;
  coupon: AppliedCoupon | null;
  applyCoupon: (code: string) => Promise<{ ok: boolean; message: string }>;
  removeCoupon: () => void;
}

const StoreContext = createContext<StoreContextValue | null>(null);

export function StoreProvider({ children }: { children: ReactNode }) {
  const { profile } = useAuth();
  const { settings } = useSiteSettings();
  const shippingPrice = settings?.shipping_price ?? 0;
  const [items, setItems] = useState<CartItem[]>([]);
  const [cartOpen, setCartOpen] = useState(false);
  const [wishlist, setWishlist] = useState<string[]>([]);
  const [coupon, setCoupon] = useState<AppliedCoupon | null>(null);

  const addItem = useCallback((item: Omit<CartItem, "key" | "quantity">, quantity = 1) => {
    const key = `${item.product_id}::${item.variant_id ?? "default"}`;
    setItems((prev) => {
      const existing = prev.find((i) => i.key === key);
      if (existing) {
        return prev.map((i) =>
          i.key === key
            ? { ...i, quantity: Math.min(i.max_stock || 99, i.quantity + quantity) }
            : i,
        );
      }
      return [...prev, { ...item, key, quantity }];
    });
    setCartOpen(true);
  }, []);

  const removeItem = useCallback((key: string) => {
    setItems((prev) => prev.filter((i) => i.key !== key));
  }, []);

  const updateQuantity = useCallback((key: string, quantity: number) => {
    setItems((prev) =>
      prev
        .map((i) => (i.key === key ? { ...i, quantity: Math.max(0, Math.min(i.max_stock || 99, quantity)) } : i))
        .filter((i) => i.quantity > 0),
    );
  }, []);

  const clearCart = useCallback(() => {
    setItems([]);
    setCoupon(null);
  }, []);

  const toggleWishlist = useCallback(async (productId: string) => {
    // optimistic UI update
    setWishlist((prev) => (prev.includes(productId) ? prev.filter((p) => p !== productId) : [...prev, productId]));

    if (!profile) return; // keep local only for guests

    try {
      const exists = wishlist.includes(productId);
      if (exists) {
        // delete row
        const { error } = await supabase.from("wishlists").delete().match({ user_id: profile.id, product_id: productId });
        if (error) {
          console.error("Failed to remove wishlist item:", error);
        }
      } else {
        const { error } = await supabase.from("wishlists").insert({ user_id: profile.id, product_id: productId });
        if (error) {
          console.error("Failed to add wishlist item:", error);
        }
      }
    } catch (err) {
      console.error("toggleWishlist error:", err);
    }
  }, [profile, wishlist]);

  const subtotal = useMemo(
    () => items.reduce((sum, i) => sum + i.unit_price * i.quantity, 0),
    [items],
  );
  const count = useMemo(() => items.reduce((sum, i) => sum + i.quantity, 0), [items]);
  // Tarif unique defini dans /admin/parametres (site_settings.shipping_price)
  // au lieu de la constante SHIPPING_FEE : le prix doit suivre la boutique.
  const shipping = items.length === 0 ? 0 : shippingPrice;
  const discount = coupon?.discount ?? 0;
  const total = Math.max(0, subtotal - discount) + shipping;

  const applyCoupon = useCallback(
    async (code: string) => {
      const currentSubtotal = items.reduce((sum, i) => sum + i.unit_price * i.quantity, 0);
      const { data, error } = await supabase.rpc("validate_coupon", {
        p_code: code.trim(),
        p_subtotal: currentSubtotal,
      });
      if (error) {
        console.error("validate_coupon", error);
        return { ok: false, message: "Impossible de vérifier ce code pour le moment." };
      }
      const result = data as { ok: boolean; message?: string; code?: string; discount_type?: string; discount_value?: number };
      if (!result.ok) {
        return { ok: false, message: result.message ?? "Code promo invalide ou expiré." };
      }
      const value =
        result.discount_type === "percentage"
          ? (currentSubtotal * (result.discount_value ?? 0)) / 100
          : (result.discount_value ?? 0);
      setCoupon({ code: result.code!, discount: Number(value.toFixed(3)) });
      return { ok: true, message: `Code ${result.code} appliqué.` };
    },
    [items],
  );

  useEffect(() => {
    let mounted = true;
    async function loadWishlist() {
      if (!profile) {
        // guests: local-only wishlist (nothing to load from the DB)
        return;
      }
      const { data, error } = await supabase.from("wishlists").select("product_id").eq("user_id", profile.id);
      if (error) {
        console.error("Could not load wishlist:", error);
        return;
      }
      if (!mounted) return;
      setWishlist((data ?? []).map((r: any) => r.product_id));
    }
    loadWishlist();
    return () => { mounted = false; };
  }, [profile]);

  const value: StoreContextValue = {
    items, addItem, removeItem, updateQuantity, clearCart,
    count, subtotal, shipping, total,
    cartOpen, setCartOpen,
    wishlist, toggleWishlist,
    isWishlisted: (id: string) => wishlist.includes(id),
    coupon, applyCoupon, removeCoupon: () => setCoupon(null),
  };

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

export function useStore() {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error("useStore doit être utilisé dans un StoreProvider");
  return ctx;
}
