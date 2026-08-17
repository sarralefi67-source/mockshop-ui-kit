import { createFileRoute, Link } from "@tanstack/react-router";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { ArrowUpRight, ShoppingBag, TrendingUp, Users, Wallet } from "lucide-react";
import { ORDER_STATUS_LABELS, dashboardStats, orders } from "@/data/orders";
import { products } from "@/data/products";
import { formatPrice } from "@/lib/placeholder";

export const Route = createFileRoute("/admin/")({
  component: AdminDashboard,
});

function AdminDashboard() {
  const lowStock = products.filter((p) => p.stock <= 5);

  const cards = [
    { label: "Chiffre d'affaires", value: formatPrice(dashboardStats.revenue), icon: Wallet, delta: "+12,4%" },
    { label: "Commandes", value: String(dashboardStats.orders), icon: ShoppingBag, delta: "+8,1%" },
    { label: "Clients", value: String(dashboardStats.customers), icon: Users, delta: "+5,6%" },
    { label: "Panier moyen", value: formatPrice(dashboardStats.averageBasket), icon: TrendingUp, delta: "+2,3%" },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Dashboard</h1>
        <p className="text-sm text-muted-foreground">Vue d'ensemble de l'activité (données mock).</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {cards.map(({ label, value, icon: Icon, delta }) => (
          <div key={label} className="rounded-xl border border-border bg-card p-5">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">{label}</span>
              <Icon className="h-4 w-4 text-accent-strong" />
            </div>
            <p className="mt-3 text-2xl font-extrabold">{value}</p>
            <p className="mt-1 flex items-center gap-1 text-xs font-semibold text-success">
              <ArrowUpRight className="h-3.5 w-3.5" /> {delta} vs mois dernier
            </p>
          </div>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-[2fr_1fr]">
        <div className="rounded-xl border border-border bg-card p-5">
          <h2 className="text-base font-bold">Ventes par mois</h2>
          <div className="mt-4 h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={dashboardStats.salesByMonth}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                <XAxis dataKey="month" tickLine={false} axisLine={false} fontSize={12} />
                <YAxis tickLine={false} axisLine={false} fontSize={12} width={50} />
                <Tooltip
                  cursor={{ fill: "var(--surface)" }}
                  contentStyle={{ borderRadius: 8, border: "1px solid var(--border)", background: "var(--card)" }}
                />
                <Bar dataKey="total" fill="var(--accent-strong)" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="rounded-xl border border-border bg-card p-5">
          <h2 className="text-base font-bold">Stock faible</h2>
          {lowStock.length === 0 ? (
            <p className="mt-4 text-sm text-muted-foreground">Tous les stocks sont confortables.</p>
          ) : (
            <ul className="mt-4 space-y-3">
              {lowStock.map((p) => (
                <li key={p.id} className="flex items-center gap-3">
                  <img src={p.images[0]?.url} alt="" className="h-10 w-10 rounded-md object-cover" />
                  <span className="min-w-0 flex-1 truncate text-sm">{p.name}</span>
                  <span className={p.stock === 0 ? "text-sm font-bold text-destructive" : "text-sm font-bold text-warning"}>
                    {p.stock}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      <div className="rounded-xl border border-border bg-card p-5">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-bold">Dernières commandes</h2>
          <Link to="/admin/commandes" className="text-sm font-semibold text-accent-strong hover:underline">
            Tout voir
          </Link>
        </div>
        <ul className="mt-4 divide-y divide-border">
          {orders.slice(0, 5).map((o) => (
            <li key={o.id} className="flex flex-wrap items-center justify-between gap-2 py-3 text-sm">
              <span className="font-medium">{o.reference}</span>
              <span className="text-muted-foreground">{o.customer_name}</span>
              <span className="text-muted-foreground">{ORDER_STATUS_LABELS[o.status]}</span>
              <span className="font-semibold">{formatPrice(o.total)}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
