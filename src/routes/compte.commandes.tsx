import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Package } from "lucide-react";
import { ORDER_STATUS_LABELS } from "@/data/orders";
import { formatPrice, mockImage } from "@/lib/placeholder";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { OrderStatus, Order } from "@/types";
import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/lib/supabaseClient";

export const Route = createFileRoute("/compte/commandes")({
  component: AccountOrders,
});

const statusStyle: Record<OrderStatus, string> = {
  pending: "bg-warning/15 text-warning",
  confirmed: "bg-accent-strong/10 text-accent-strong",
  shipped: "bg-chart-2/15 text-chart-2",
  delivered: "bg-success/15 text-success",
  cancelled: "bg-destructive/10 text-destructive",
};

function AccountOrders() {
  const { profile, loading: authLoading } = useAuth();
  const [myOrders, setMyOrders] = useState<Order[]>([]);
  const [openId, setOpenId] = useState<string | null>(null);
  const [loadingOrders, setLoadingOrders] = useState(true);

  useEffect(() => {
    let mounted = true;
    async function load() {
      if (!profile) {
        if (mounted) {
          setMyOrders([]);
          setLoadingOrders(false);
        }
        return;
      }
      setLoadingOrders(true);
      const { data, error } = await supabase
        .from("orders")
        .select(
          `id, order_number, status, payment_method, subtotal, discount_amount, shipping_amount, total, shipping_address, created_at, order_items(*)`
        )
        .eq("user_id", profile.id)
        .order("created_at", { ascending: false });

      if (!mounted) return;
      if (error) {
        console.error("fetch orders error:", error);
        setMyOrders([]);
        setLoadingOrders(false);
        return;
      }

      const mapped: Order[] = (data ?? []).map((r: any) => ({
        id: r.id,
        reference: r.order_number,
        customer_name: (profile.first_name || "") + (profile.last_name ? ` ${profile.last_name}` : ""),
        customer_phone: r.shipping_address?.phone ?? "",
        status: r.status as OrderStatus,
        payment_method: (r.payment_method as any) ?? "cod",
        subtotal: Number(r.subtotal ?? 0),
        shipping: Number(r.shipping_amount ?? 0),
        discount: Number(r.discount_amount ?? 0),
        total: Number(r.total ?? 0),
        governorate: r.shipping_address?.governorate ?? "",
        created_at: r.created_at,
        items: (r.order_items ?? []).map((it: any) => ({
          id: it.id,
          product_id: it.product_id,
          variant_id: it.variant_id,
          name: it.product_name,
          variant_label: it.variant_label ?? null,
          image: mockImage(it.product_name ?? "Produit"),
          unit_price: Number(it.unit_price ?? 0),
          quantity: Number(it.quantity ?? 1),
        })),
      }));

      setMyOrders(mapped);
      setOpenId(mapped[0]?.id ?? null);
      setLoadingOrders(false);
    }

    load();
    return () => {
      mounted = false;
    };
  }, [profile?.id]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Mes commandes</h1>
        <p className="text-sm text-muted-foreground">Historique et suivi de vos achats.</p>
      </div>

      {loadingOrders || authLoading ? (
        <div className="rounded-xl border border-dashed border-border py-12 text-center">
          <Package className="mx-auto h-10 w-10 text-muted-foreground animate-pulse" />
          <p className="mt-3 font-semibold">Chargement de vos commandes…</p>
        </div>
      ) : myOrders.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border py-20 text-center">
          <Package className="mx-auto h-10 w-10 text-muted-foreground" />
          <p className="mt-3 font-semibold">Aucune commande pour le moment</p>
          <Button variant="accent" className="mt-5" asChild><Link to="/">Commencer mes achats</Link></Button>
        </div>
      ) : (
        <ul className="space-y-4">
          {myOrders.map((order) => (
            <li key={order.id} className="overflow-hidden rounded-xl border border-border bg-card">
              <button
                onClick={() => setOpenId(openId === order.id ? null : order.id)}
                className="flex w-full flex-wrap items-center justify-between gap-3 px-5 py-4 text-left hover:bg-surface"
              >
                <div>
                  <p className="font-semibold">{order.reference}</p>
                  <p className="text-xs text-muted-foreground">
                    {new Date(order.created_at).toLocaleDateString("fr-FR")} · {order.items.length} article(s)
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <span className={cn("rounded-full px-3 py-1 text-xs font-semibold", statusStyle[order.status])}>
                    {ORDER_STATUS_LABELS[order.status]}
                  </span>
                  <span className="font-bold">{formatPrice(order.total)}</span>
                </div>
              </button>

              {openId === order.id && (
                <div className="border-t border-border px-5 py-4">
                  <ul className="space-y-3">
                    {order.items.map((item) => (
                      <li key={item.id} className="flex items-center gap-3">
                        <img src={item.image} alt="" className="h-12 w-12 rounded-md border border-border object-cover" />
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium">{item.name}</p>
                          {item.variant_label && (
                            <p className="text-xs text-muted-foreground">{item.variant_label}</p>
                          )}
                        </div>
                        <span className="text-sm text-muted-foreground">×{item.quantity}</span>
                        <span className="text-sm font-semibold">{formatPrice(item.unit_price * item.quantity)}</span>
                      </li>
                    ))}
                  </ul>
                  <dl className="mt-4 space-y-1 border-t border-border pt-4 text-sm">
                    <div className="flex justify-between"><dt className="text-muted-foreground">Sous-total</dt><dd>{formatPrice(order.subtotal)}</dd></div>
                    {order.discount > 0 && (
                      <div className="flex justify-between text-accent-strong"><dt>Remise</dt><dd>-{formatPrice(order.discount)}</dd></div>
                    )}
                    <div className="flex justify-between"><dt className="text-muted-foreground">Livraison ({order.governorate})</dt><dd>{formatPrice(order.shipping)}</dd></div>
                    <div className="flex justify-between font-bold"><dt>Total (payé à la livraison)</dt><dd>{formatPrice(order.total)}</dd></div>
                  </dl>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
