import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Bar, BarChart, CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { ShoppingBag, TrendingUp, Users, Wallet } from "lucide-react";
import { ORDER_STATUS_LABELS, ORDER_STATUS_STYLES } from "@/data/orders";
import { formatPrice } from "@/lib/placeholder";
import Spinner from "@/components/ui/spinner";
import { supabase } from "@/lib/supabaseClient";

export const Route = createFileRoute("/admin/")({ component: AdminDashboard });

type MonthlySale = { month: string; total: number };
type BestSellerSale = { month: string; product_id: string | null; variant_id: string | null; product_name: string; sku: string | null; image_url: string | null; quantity: number; revenue: number };
type BestSellerChartRow = { product: string; productName: string; imageUrl: string; quantity: number };
type LowStockProduct = { id: string; name: string; sku: string | null; stock_quantity: number; image_url: string | null };
type RecentOrder = { id: string; reference: string; status: string; total: number; created_at: string | null; customer_name: string; governorate: string | null };
type Kpis = {
  customers: number;
  orders: number;
  revenue: number;
  average_basket: number;
  customers_delta_percent: number | null;
  orders_delta_percent: number | null;
  revenue_delta_percent: number | null;
  average_basket_delta_percent: number | null;
};

const PERIODS = [
  { days: 7, label: "7 derniers jours" },
  { days: 30, label: "30 derniers jours" },
  { days: 180, label: "6 derniers mois" },
  { days: 365, label: "12 derniers mois" },
] as const;
type PeriodSelection = number | "custom";

const today = () => new Date().toISOString().slice(0, 10);
const daysAgo = (days: number) => {
  const date = new Date();
  date.setDate(date.getDate() - days);
  return date.toISOString().slice(0, 10);
};

const formatOrderDate = (value: string | null) => {
  if (!value) return "Date non renseignée";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Date non renseignée";
  return `${date.toLocaleDateString("fr-FR")} à ${date.toLocaleTimeString("fr-FR", {
    hour: "2-digit",
    minute: "2-digit",
  })}`;
};

function BestSellerTooltip({
  active,
  payload,
}: {
  active?: boolean;
  payload?: Array<{ payload?: BestSellerChartRow }>;
}) {
  const row = payload?.[0]?.payload;
  if (!active || !row) return null;

  return (
    <div className="flex max-w-xs items-center gap-3 rounded-lg border border-border bg-card p-3 shadow-lg">
      {row.imageUrl ? (
        <img src={row.imageUrl} alt="" className="h-12 w-12 shrink-0 rounded-md object-cover" />
      ) : (
        <div className="h-12 w-12 shrink-0 rounded-md bg-surface" />
      )}
      <div className="min-w-0 text-sm">
        <p className="truncate font-semibold">{row.productName}</p>
        <p className="truncate text-muted-foreground">{row.product}</p>
        <p className="mt-1 text-accent-strong">Vendus : {row.quantity} article{row.quantity > 1 ? "s" : ""}</p>
      </div>
    </div>
  );
}

function AdminDashboard() {
  const [lowStock, setLowStock] = useState<LowStockProduct[]>([]);
  const [recentOrders, setRecentOrders] = useState<RecentOrder[]>([]);
  const [listsLoading, setListsLoading] = useState(true);
  const [kpis, setKpis] = useState<Kpis>({
    customers: 0, orders: 0, revenue: 0, average_basket: 0,
    customers_delta_percent: null, orders_delta_percent: null,
    revenue_delta_percent: null, average_basket_delta_percent: null,
  });
  const [kpisLoading, setKpisLoading] = useState(true);
  const [salesByMonth, setSalesByMonth] = useState<MonthlySale[]>([]);
  const [salesLoading, setSalesLoading] = useState(true);
  const [bestSellerData, setBestSellerData] = useState<Record<string, number | string>[]>([]);
  const [bestSellerNames, setBestSellerNames] = useState<string[]>([]);
  const [bestSellerLoading, setBestSellerLoading] = useState(true);
  const [periodSelection, setPeriodSelection] = useState<PeriodSelection>(180);
  const [customStart, setCustomStart] = useState(() => daysAgo(6));
  const [customEnd, setCustomEnd] = useState(today);
  const periodDays = periodSelection === "custom"
    ? Math.max(1, Math.round((new Date(`${customEnd}T00:00:00`).getTime() - new Date(`${customStart}T00:00:00`).getTime()) / 86_400_000) + 1)
    : periodSelection;
  const periodEndDate = periodSelection === "custom" ? customEnd : today();

  const loadKpis = async (days = periodDays) => {
    setKpisLoading(true);
    const { data, error } = await supabase.rpc("get_admin_dashboard_kpis", { p_days: days, p_end_date: periodEndDate });
    if (error) console.error("load dashboard KPIs", error);
    else if (data) setKpis({
      customers: Number(data.customers ?? 0), orders: Number(data.orders ?? 0),
      revenue: Number(data.revenue ?? 0), average_basket: Number(data.average_basket ?? 0),
      customers_delta_percent: data.customers_delta_percent,
      orders_delta_percent: data.orders_delta_percent,
      revenue_delta_percent: data.revenue_delta_percent,
      average_basket_delta_percent: data.average_basket_delta_percent,
    });
    setKpisLoading(false);
  };

  const loadMonthlySales = async (days = periodDays) => {
    setSalesLoading(true);
    const { data, error } = await supabase.rpc("get_admin_monthly_sales", { p_days: days, p_end_date: periodEndDate });
    if (error) console.error("load dashboard monthly sales", error);
    else setSalesByMonth((data ?? []).map((item) => ({
      month: new Date(`${item.month}${item.month.length === 7 ? "-01" : ""}T00:00:00`).toLocaleDateString(
        "fr-FR",
        item.month.length === 7 ? { month: "short" } : { day: "2-digit", month: "2-digit" },
      ),
      total: Number(item.total ?? 0),
    })));
    setSalesLoading(false);
  };

  const loadBestSellers = async (days = periodDays) => {
    setBestSellerLoading(true);
    const { data, error } = await supabase.rpc("get_admin_best_sellers", {
      p_days: days,
      p_end_date: periodEndDate,
      p_limit: 8,
    });
    if (error) {
      console.error("load dashboard best sellers", error);
      setBestSellerData([]);
      setBestSellerNames([]);
    } else {
      const rows = (data ?? []) as BestSellerSale[];
      const products = new Map<string, { label: string; productName: string; imageUrl: string | null; quantity: number }>();
      rows.forEach((item) => {
        const key = `${item.product_id ?? item.product_name}:${item.variant_id ?? item.sku ?? ""}`;
        const label = item.sku || "Sans SKU";
        const current = products.get(key);
        products.set(key, {
          label,
          productName: item.product_name,
          imageUrl: item.image_url,
          quantity: (current?.quantity ?? 0) + Number(item.quantity ?? 0),
        });
      });
      const bestSellers = [...products.values()].sort((a, b) => b.quantity - a.quantity);
      setBestSellerNames(bestSellers.map((item) => item.label));
      setBestSellerData(bestSellers.map((item) => ({
        product: item.label,
        productName: item.productName,
        imageUrl: item.imageUrl ?? "",
        quantity: item.quantity,
      })));
    }
    setBestSellerLoading(false);
  };

  const loadDashboardLists = async () => {
    setListsLoading(true);
    const [stockResult, ordersResult] = await Promise.all([
      supabase.rpc("get_admin_low_stock_products", { p_limit: 5 }),
      supabase.rpc("get_admin_recent_orders", { p_limit: 5 }),
    ]);

    if (stockResult.error) console.error("load low stock products", stockResult.error);
    else setLowStock((Array.isArray(stockResult.data) ? stockResult.data : []) as LowStockProduct[]);

    if (ordersResult.error) console.error("load recent orders", ordersResult.error);
    else setRecentOrders((Array.isArray(ordersResult.data) ? ordersResult.data : []) as RecentOrder[]);

    setListsLoading(false);
  };

  useEffect(() => {
    loadKpis(periodDays);
    loadMonthlySales(periodDays);
    loadBestSellers(periodDays);
    loadDashboardLists();
    const channel = supabase.channel("admin-dashboard-kpis") as any;
    channel
      .on("postgres_changes", { event: "*", schema: "public", table: "orders" }, () => {
        loadKpis(periodDays);
        loadMonthlySales(periodDays);
        loadBestSellers(periodDays);
        loadDashboardLists();
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "profiles" }, loadKpis)
      .on("postgres_changes", { event: "*", schema: "public", table: "products" }, loadDashboardLists)
      .subscribe();
    return () => { void supabase.removeChannel(channel); };
  }, [periodDays, periodEndDate]);

  const cards = [
    { label: "Chiffre d'affaires", value: formatPrice(kpis.revenue), icon: Wallet, delta: kpis.revenue_delta_percent },
    { label: "Commandes livrées", value: String(kpis.orders), icon: ShoppingBag, delta: kpis.orders_delta_percent },
    { label: "Clients", value: String(kpis.customers), icon: Users, delta: kpis.customers_delta_percent },
    { label: "Panier moyen", value: formatPrice(kpis.average_basket), icon: TrendingUp, delta: kpis.average_basket_delta_percent },
  ];

  return <div className="space-y-6">
    <div className="flex flex-wrap items-end justify-between gap-3">
      <div><h1 className="text-2xl font-bold">Dashboard</h1><p className="text-sm text-muted-foreground">Vue d'ensemble de l'activité en temps réel.</p></div>
      <label className="flex items-center gap-2 text-sm font-medium">
        <span className="text-muted-foreground">Période</span>
        <select
          value={periodSelection}
          onChange={(event) => setPeriodSelection(event.target.value === "custom" ? "custom" : Number(event.target.value))}
          className="h-9 rounded-md border border-border bg-card px-3 text-sm outline-none focus:border-accent-strong"
          aria-label="Filtrer le dashboard par période"
        >
          {PERIODS.map((period) => <option key={period.days} value={period.days}>{period.label}</option>)}
          <option value="custom">Personnalisée</option>
        </select>
      </label>
      {periodSelection === "custom" && (
        <div className="flex flex-wrap items-center gap-2 text-sm">
          <label className="flex items-center gap-2">
            <span className="text-muted-foreground">Du</span>
            <input type="date" value={customStart} max={customEnd || today()} onChange={(event) => setCustomStart(event.target.value)} className="h-9 rounded-md border border-border bg-card px-2 outline-none focus:border-accent-strong" />
          </label>
          <label className="flex items-center gap-2">
            <span className="text-muted-foreground">Au</span>
            <input type="date" value={customEnd} min={customStart || undefined} max={today()} onChange={(event) => setCustomEnd(event.target.value)} className="h-9 rounded-md border border-border bg-card px-2 outline-none focus:border-accent-strong" />
          </label>
        </div>
      )}
    </div>
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {cards.map(({ label, value, icon: Icon, delta }) => <div key={label} className="rounded-xl border border-border bg-card p-5">
        <div className="flex items-center justify-between"><span className="text-sm text-muted-foreground">{label}</span><Icon className="h-4 w-4 text-accent-strong" /></div>
        <div className="mt-3 text-2xl font-extrabold">{kpisLoading ? <Spinner className="h-6 w-6" /> : value}</div>
        <p className={`mt-1 text-xs font-semibold ${delta !== null && delta < 0 ? "text-destructive" : "text-success"}`}>{delta === null ? "Pas de comparaison" : `${delta >= 0 ? "+" : ""}${delta.toFixed(2).replace(".", ",")}% vs mois précédent`}</p>
      </div>)}
    </div>
    <div className="grid gap-4 lg:grid-cols-[2fr_1fr]">
      <div className="rounded-xl border border-border bg-card p-5"><h2 className="text-base font-bold">Ventes par mois</h2><div className="mt-4 h-64">
        {salesLoading ? <div className="flex h-full items-center justify-center"><Spinner className="h-6 w-6" /></div> : <ResponsiveContainer width="100%" height="100%"><LineChart data={salesByMonth}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} /><XAxis dataKey="month" tickLine={false} axisLine={false} fontSize={12} /><YAxis tickLine={false} axisLine={false} fontSize={12} width={50} /><Tooltip cursor={{ fill: "var(--surface)" }} contentStyle={{ borderRadius: 8, border: "1px solid var(--border)", background: "var(--card)" }} formatter={(value) => formatPrice(Number(value))} /><Line type="monotone" dataKey="total" stroke="var(--accent-strong)" strokeWidth={3} dot={{ r: 4, fill: "var(--accent-strong)" }} activeDot={{ r: 6 }} />
        </LineChart></ResponsiveContainer>}
      </div></div>
      <div className="rounded-xl border border-border bg-card p-5">
        <h2 className="text-base font-bold">Stock faible</h2>{listsLoading ? 
        <Spinner className="mt-4 h-6 w-6" /> : lowStock.length === 0 ? <p className="mt-4 text-sm text-muted-foreground">Tous les stocks sont confortables.</p> : <ul className="mt-4 space-y-3">{lowStock.map((product) => <li key={product.id}><Link to="/admin/produits" search={{ produit: product.id }} className="flex items-center gap-3 rounded-md p-1 transition-colors hover:bg-surface"><img src={product.image_url ?? ""} alt="" className="h-10 w-10 rounded-md object-cover" /><span className="min-w-0 flex-1"><span className="block truncate text-sm">{product.name}</span><span className="block text-xs text-muted-foreground">SKU : {product.sku || "Non défini"}</span></span><span className={product.stock_quantity === 0 ? "text-sm font-bold text-red-600" : "text-sm font-bold text-warning"}>{product.stock_quantity}</span></Link></li>)}</ul>}</div>
    </div>
    <div className="rounded-xl border border-border bg-card p-5"><h2 className="text-base font-bold">Meilleures ventes</h2><div className="mt-4 h-72">
      {bestSellerLoading ? <div className="flex h-full items-center justify-center"><Spinner className="h-6 w-6" /></div> : bestSellerNames.length === 0 ? <p className="flex h-full items-center justify-center text-sm text-muted-foreground">Aucune vente livrée sur cette période.</p> : <ResponsiveContainer width="100%" height="100%"><BarChart data={bestSellerData} margin={{ bottom: 45, left: 10, right: 20 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
        <XAxis dataKey="product" tickLine={false} axisLine={false} fontSize={11} angle={-25} textAnchor="end" interval={0} />
        <YAxis allowDecimals={false} tickLine={false} axisLine={false} fontSize={12} width={35} />
        <Tooltip cursor={{ fill: "var(--surface)" }} content={<BestSellerTooltip />} />
        <Bar dataKey="quantity" name="Vendus" fill="var(--accent-strong)" radius={[4, 4, 0, 0]} />
      </BarChart></ResponsiveContainer>}
    </div></div>
    <div className="rounded-xl border border-border bg-card p-5"><div className="flex items-center justify-between"><h2 className="text-base font-bold">Dernières commandes</h2><Link to="/admin/commandes" className="text-sm font-semibold text-accent-strong hover:underline">Tout voir</Link></div>{listsLoading ? <Spinner className="mt-4 h-6 w-6" /> : <ul className="mt-4 divide-y divide-border">{recentOrders.map((order) => { const status = order.status as keyof typeof ORDER_STATUS_LABELS; return <li key={order.id} className="flex flex-wrap items-center justify-between gap-2 py-3 text-sm"><span className="font-medium">{order.reference}</span><span className="text-xs text-muted-foreground">{formatOrderDate(order.created_at)}</span><span className="text-muted-foreground">{order.customer_name}</span><span className={`rounded-full px-2 py-1 text-xs font-semibold ${ORDER_STATUS_STYLES[status] ?? "bg-muted text-muted-foreground"}`}>{ORDER_STATUS_LABELS[status] ?? order.status}</span><span className="font-semibold">{formatPrice(order.total)}</span></li>; })}</ul>}</div>
  </div>;
}
