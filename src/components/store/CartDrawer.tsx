import { Link } from "@tanstack/react-router";
import { Minus, Plus, ShoppingBag, Trash2, Truck } from "lucide-react";
import { useStore } from "@/context/StoreContext";
import { formatPrice, formatShipping } from "@/lib/placeholder";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Separator } from "@/components/ui/separator";

export function CartDrawer() {
  const { items, cartOpen, setCartOpen, updateQuantity, removeItem, subtotal, shipping, total, coupon, count } =
    useStore();
  const continueShopping = () => setCartOpen(false);

  return (
    <Sheet open={cartOpen} onOpenChange={setCartOpen}>
      <SheetContent className="flex w-full flex-col gap-0 p-0 sm:max-w-md">
        <SheetHeader className="border-b border-border px-5 py-4">
          <SheetTitle className="flex items-center gap-2 text-base">
            <ShoppingBag className="h-4 w-4" />
            Mon panier
            <span className="text-muted-foreground">({count})</span>
          </SheetTitle>
        </SheetHeader>

        {items.length === 0 ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-3 px-8 text-center">
            <div className="grid h-16 w-16 place-items-center rounded-full bg-surface">
              <ShoppingBag className="h-7 w-7 text-muted-foreground" />
            </div>
            <p className="text-sm font-semibold">Votre panier est vide</p>
            <p className="text-sm text-muted-foreground">
              Parcourez nos catégories et ajoutez vos premiers articles.
            </p>
            <Button variant="accent" className="mt-2" onClick={continueShopping} asChild>
              <Link to="/">Continuer mes achats</Link>
            </Button>
          </div>
        ) : (
          <>
            <div className="flex-1 overflow-y-auto px-5 py-4">
              <ul className="space-y-4">
                {items.map((item) => (
                  <li key={item.key} className="flex gap-3">
                    <Link
                      to="/produit/$slug"
                      params={{ slug: item.slug }}
                      onClick={() => setCartOpen(false)}
                      className="h-20 w-20 shrink-0 overflow-hidden rounded-lg border border-border bg-surface"
                    >
                      <img src={item.image} alt={item.name} className="h-full w-full object-cover" />
                    </Link>
                    <div className="flex min-w-0 flex-1 flex-col">
                      <div className="flex items-start justify-between gap-2">
                        <p className="line-clamp-2 text-sm font-semibold">{item.name}</p>
                        <button
                          onClick={() => removeItem(item.key)}
                          aria-label="Retirer l'article"
                          className="text-muted-foreground hover:text-destructive"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                      {item.variant_label && (
                        <p className="text-xs text-muted-foreground">{item.variant_label}</p>
                      )}
                      <div className="mt-auto flex items-center justify-between pt-2">
                        <div className="flex items-center rounded-md border border-border">
                          <button
                            className="grid h-7 w-7 place-items-center text-muted-foreground hover:text-foreground"
                            onClick={() => updateQuantity(item.key, item.quantity - 1)}
                            aria-label="Diminuer"
                          >
                            <Minus className="h-3.5 w-3.5" />
                          </button>
                          <span className="w-7 text-center text-sm font-semibold">{item.quantity}</span>
                          <button
                            className="grid h-7 w-7 place-items-center text-muted-foreground hover:text-foreground disabled:opacity-40"
                            disabled={item.quantity >= item.max_stock}
                            onClick={() => updateQuantity(item.key, item.quantity + 1)}
                            aria-label="Augmenter"
                          >
                            <Plus className="h-3.5 w-3.5" />
                          </button>
                        </div>
                        <span className="text-sm font-bold">
                          {formatPrice(item.unit_price * item.quantity)}
                        </span>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            </div>

            <div className="border-t border-border px-5 py-4">
              <div className="flex items-center gap-2 rounded-md bg-surface px-3 py-2 text-xs text-muted-foreground">
                <Truck className="h-4 w-4 text-accent-strong" />
                Paiement à la livraison disponible partout en Tunisie.
              </div>
              <dl className="mt-4 space-y-2 text-sm">
                <div className="flex justify-between">
                  <dt className="text-muted-foreground">Sous-total</dt>
                  <dd className="font-medium">{formatPrice(subtotal)}</dd>
                </div>
                {coupon && (
                  <div className="flex justify-between text-accent-strong">
                    <dt>Code {coupon.code}</dt>
                    <dd>-{formatPrice(coupon.discount)}</dd>
                  </div>
                )}
                <div className="flex justify-between">
                  <dt className="text-muted-foreground">Livraison</dt>
                  <dd className={`font-medium ${shipping > 0 ? "" : "text-emerald-600"}`}>
                    {formatShipping(shipping)}
                  </dd>
                </div>
                <Separator />
                <div className="flex justify-between text-base">
                  <dt className="font-semibold">Total</dt>
                  <dd className="font-bold text-accent-strong">{formatPrice(total)}</dd>
                </div>
              </dl>
              <Button variant="accent" size="lg" className="mt-4 w-full" asChild>
                <Link to="/checkout" onClick={() => setCartOpen(false)}>
                  Passer la commande
                </Link>
              </Button>
              <button
                onClick={continueShopping}
                className="mt-2 w-full text-center text-sm text-muted-foreground hover:text-foreground"
              >
                Continuer mes achats
              </button>
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}
