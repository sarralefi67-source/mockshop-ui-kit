import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";
import type { CartItem } from "@/types";
import { SHIPPING_FEE, coupons } from "@/data/coupons";

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
  applyCoupon: (code: string) => { ok: boolean; message: string };
  removeCoupon: () => void;
}

const StoreContext = createContext<StoreContextValue | null>(null);

export function StoreProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);
  const [cartOpen, setCartOpen] = useState(false);
  const [wishlist, setWishlist] = useState<string[]>(["p-3", "p-9"]);
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

  const toggleWishlist = useCallback((productId: string) => {
    setWishlist((prev) =>
      prev.includes(productId) ? prev.filter((p) => p !== productId) : [...prev, productId],
    );
  }, []);

  const subtotal = useMemo(
    () => items.reduce((sum, i) => sum + i.unit_price * i.quantity, 0),
    [items],
  );
  const count = useMemo(() => items.reduce((sum, i) => sum + i.quantity, 0), [items]);
  const shipping = items.length === 0 ? 0 : SHIPPING_FEE;
  const discount = coupon?.discount ?? 0;
  const total = Math.max(0, subtotal - discount) + shipping;

  const applyCoupon = useCallback(
    (code: string) => {
      const found = coupons.find(
        (c) => c.code.toLowerCase() === code.trim().toLowerCase() && c.is_active,
      );
      if (!found) return { ok: false, message: "Code promo invalide ou expiré." };
      const currentSubtotal = items.reduce((sum, i) => sum + i.unit_price * i.quantity, 0);
      if (currentSubtotal < found.min_amount) {
        return { ok: false, message: `Minimum ${found.min_amount} DT d'achat requis.` };
      }
      const value =
        found.type === "percent" ? (currentSubtotal * found.value) / 100 : found.value;
      setCoupon({ code: found.code, discount: Number(value.toFixed(3)) });
      return { ok: true, message: `Code ${found.code} appliqué.` };
    },
    [items],
  );

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
