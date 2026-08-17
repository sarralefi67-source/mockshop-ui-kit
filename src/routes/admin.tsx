import { createFileRoute, Link, Outlet, useRouterState } from "@tanstack/react-router";
import { useState } from "react";
import {
  BadgePercent, ChevronLeft, LayoutDashboard, ListTree, Menu, Package, ShoppingBag, Store,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/admin")({
  head: () => ({
    meta: [
      { title: "Back-office — NexaStore" },
      { name: "description", content: "Administration NexaStore : catalogue, promotions et commandes." },
      { property: "og:title", content: "Back-office — NexaStore" },
      { property: "og:description", content: "Interface d'administration de la boutique NexaStore." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: AdminLayout,
});

const nav = [
  { to: "/admin", label: "Dashboard", icon: LayoutDashboard, exact: true },
  { to: "/admin/categories", label: "Catégories", icon: ListTree, exact: false },
  { to: "/admin/produits", label: "Produits", icon: Package, exact: false },
  { to: "/admin/promotions", label: "Promotions & coupons", icon: BadgePercent, exact: false },
  { to: "/admin/commandes", label: "Commandes", icon: ShoppingBag, exact: false },
] as const;

function AdminLayout() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const [open, setOpen] = useState(false);

  return (
    <div className="flex min-h-screen bg-surface">
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 w-64 shrink-0 border-r border-border bg-card transition-transform lg:static lg:translate-x-0",
          open ? "translate-x-0" : "-translate-x-full",
        )}
      >
        <div className="flex h-16 items-center gap-2 border-b border-border px-5">
          <span className="grid h-8 w-8 place-items-center rounded-md bg-accent-strong text-sm font-black text-accent-strong-foreground">
            N
          </span>
          <span className="font-extrabold">Admin</span>
          <button className="ml-auto lg:hidden" onClick={() => setOpen(false)} aria-label="Fermer">
            <ChevronLeft className="h-5 w-5" />
          </button>
        </div>
        <nav className="space-y-1 p-3">
          {nav.map(({ to, label, icon: Icon, exact }) => {
            const active = exact ? pathname === to : pathname.startsWith(to);
            return (
              <Link
                key={to}
                to={to}
                onClick={() => setOpen(false)}
                className={cn(
                  "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                  active
                    ? "bg-accent-strong/10 text-accent-strong"
                    : "text-muted-foreground hover:bg-surface hover:text-foreground",
                )}
              >
                <Icon className="h-4 w-4" />
                {label}
              </Link>
            );
          })}
        </nav>
        <div className="p-3">
          <Button variant="outline" className="w-full" asChild>
            <Link to="/"><Store className="h-4 w-4" /> Voir la boutique</Link>
          </Button>
        </div>
      </aside>

      {open && (
        <div className="fixed inset-0 z-40 bg-foreground/40 lg:hidden" onClick={() => setOpen(false)} />
      )}

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-16 items-center gap-3 border-b border-border bg-card px-4 lg:px-8">
          <button className="lg:hidden" onClick={() => setOpen(true)} aria-label="Ouvrir le menu">
            <Menu className="h-6 w-6" />
          </button>
          <p className="text-sm text-muted-foreground">
            Environnement de démonstration — les modifications ne sont pas persistées.
          </p>
        </header>
        <main className="flex-1 p-4 lg:p-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
