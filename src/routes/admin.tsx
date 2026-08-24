import { createFileRoute, Link, Outlet, useRouterState } from "@tanstack/react-router";
import { useNavigate } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import {
  BadgePercent, ChevronLeft, Image, LayoutDashboard, ListTree, Menu, Package, ShoppingBag, Store,
  Bell, User, LogOut, MessageCircle, Mail,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/lib/supabaseClient";
import { toast } from "sonner";

export const Route = createFileRoute("/admin")({
  head: () => ({
    meta: [
      { title: "Back-office — Artisanat" },
      { name: "description", content: "Administration Artisanat : catalogue, promotions et commandes." },
      { property: "og:title", content: "Back-office — Artisanat" },
      { property: "og:description", content: "Interface d'administration de la boutique Artisanat." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: AdminLayout,
});

// Aligné sur le seuil des alertes SQL (database/notifications-low-stock.sql).
const LOW_STOCK_THRESHOLD = 5;

const nav = [
  { to: "/admin", label: "Dashboard", icon: LayoutDashboard, exact: true },
  // { to: "/admin/notifications", label: "Notifications", icon: Bell, exact: false },
  { to: "/admin/banners", label: "Bannières", icon: Image, exact: false },
  { to: "/admin/produits", label: "Produits", icon: Package, exact: false },
  { to: "/admin/commandes", label: "Commandes", icon: ShoppingBag, exact: false },
  { to: "/admin/promotions", label: "Promotions & coupons", icon: BadgePercent, exact: false },
  { to: "/admin/categories", label: "Catégories", icon: ListTree, exact: false },
  { to: "/admin/clients", label: "Clients", icon: User, exact: false },
  // { to: "/admin/newsletter", label: "Newsletter", icon: Mail, exact: false },
  { to: "/admin/avis", label: "Avis clients", icon: MessageCircle, exact: false },
  { to: "/admin/parametres", label: "Paramètres", icon: User, exact: false },
] as const;

function AdminLayout() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const [open, setOpen] = useState(false);
  const { user, profile, loading, signOut } = useAuth();
  const navigate = useNavigate();
  const [userMenuOpen, setUserMenuOpen] = useState(false);

  const displayName = profile?.first_name ? `${profile.first_name}${profile?.last_name ? ` ${profile.last_name}` : ""}` : user?.email;

  const isAdmin = Boolean(user && profile && profile.role === "admin");
  const [unreadNotifications, setUnreadNotifications] = useState(0);
  // Pastilles « à traiter » du menu, par route. Le stock faible est le seul
  // seuil arbitraire : il est aligné sur celui des alertes SQL
  // (database/notifications-low-stock.sql).
  const [navBadges, setNavBadges] = useState<Record<string, number>>({});

  const loadUnreadNotifications = async () => {
    const { count, error } = await supabase
      .from("notifications")
      .select("id", { count: "exact", head: true })
      .eq("is_read", false);
    if (error) {
      console.error("load unread notifications", error);
      return;
    }
    setUnreadNotifications(count ?? 0);
  };

  const loadNavBadges = async () => {
    const countOf = async (build: () => any, label: string) => {
      const { count, error } = await build();
      if (error) {
        console.warn(`load badge ${label}`, error);
        return 0;
      }
      return count ?? 0;
    };

    const [orders, reviews, lowStock] = await Promise.all([
      countOf(
        () => supabase.from("orders").select("id", { count: "exact", head: true }).eq("status", "pending"),
        "commandes",
      ),
      countOf(
        () => supabase.from("reviews").select("id", { count: "exact", head: true }).is("is_approved", null),
        "avis",
      ),
      countOf(
        () =>
          supabase
            .from("products")
            .select("id", { count: "exact", head: true })
            .eq("is_active", true)
            .lte("stock_quantity", LOW_STOCK_THRESHOLD),
        "stock",
      ),
    ]);

    setNavBadges({
      "/admin/commandes": orders,
      "/admin/avis": reviews,
      // "/admin/produits": lowStock,
    });
  };

  // Initial unread count + live updates while an admin is in the panel
  // (notifications is in the supabase_realtime publication and RLS-gated to
  // is_admin(), see database/notifications.sql).
  useEffect(() => {
    if (!isAdmin) return;
    loadUnreadNotifications();
    loadNavBadges();

    const channel = supabase
      .channel("admin-notifications")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "notifications" }, (payload) => {
        const row = payload.new as { title?: string; body?: string | null };
        // Carte en bas à droite, sans action : elle informe sans réclamer de
        // clic. `position` est passée par toast plutôt que sur le <Toaster>
        // global, pour ne pas déplacer tous les autres messages du site.
        toast.info(row.title ?? "Nouvelle notification", {
          position: "bottom-right",
          icon: <img src="/favicon.ico" alt="" className="h-5 w-5 rounded-sm object-contain" />,
          ...(row.body ? { description: row.body } : {}),
        });
        loadUnreadNotifications();
        loadNavBadges();
      })
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "notifications" }, () => {
        loadUnreadNotifications();
      })
      .on("postgres_changes", { event: "DELETE", schema: "public", table: "notifications" }, () => {
        loadUnreadNotifications();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAdmin]);

  useEffect(() => {
    if (loading) return;

    // not logged in at all: send to the real login route (child route below),
    // never render the admin shell for an anonymous visitor
    if (!user) {
      if (pathname !== "/admin/login") navigate({ to: "/admin/login" });
      return;
    }

    // logged in but not admin (or profile row missing entirely): back to the
    // admin login, same as an anonymous visitor — not the storefront, so the
    // destination is consistent no matter who's hitting /admin
    if ((!profile || profile.role !== "admin") && pathname !== "/admin/login") {
      navigate({ to: "/admin/login" });
    }
  }, [loading, user, profile, pathname, navigate]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p>Chargement…</p>
      </div>
    );
  }

  // Admin login is its own standalone page (no sidebar/header chrome, which
  // assumes a logged-in admin). Render the real /admin/login route component
  // through the outlet instead of a shell around it.
  if (pathname === "/admin/login") {
    return <Outlet />;
  }

  if (!user || !profile || profile.role !== "admin") {
    // redirect effect above is about to fire (anonymous visitor, or logged
    // in as a non-admin) — avoid flashing the admin shell / firing its data
    // fetches in the meantime
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p>Redirection…</p>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-surface">
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 w-64 shrink-0 border-r border-border bg-card transition-transform lg:translate-x-0",
          open ? "translate-x-0" : "-translate-x-full",
        )}
      >
        <div className="relative flex h-16 items-center gap-2 border-b border-border px-5">
          <span className="absolute left-1/2 -translate-x-1/2 whitespace-nowrap text-lg font-extrabold">
            Arti<span className="text-accent-strong">sanat</span>
          </span>
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
                {(navBadges[to] ?? 0) > 0 && (
                  <span className="ml-auto grid h-5 min-w-5 place-items-center rounded-full bg-accent-strong px-1 text-[11px] font-bold text-accent-strong-foreground">
                    {navBadges[to]}
                  </span>
                )}
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

      <div className="flex min-w-0 flex-1 flex-col lg:pl-64">
        <header className="sticky top-0 z-40 flex h-16 items-center gap-3 border-b border-border bg-card px-4 lg:px-8">
          <button className="lg:hidden" onClick={() => setOpen(true)} aria-label="Ouvrir le menu">
            <Menu className="h-6 w-6" />
          </button>

          <div className="ml-auto flex items-center gap-3">
            <button
              aria-label="Notifications"
              onClick={() => navigate({ to: "/admin/notifications" })}
              className="relative rounded-md p-2 text-muted-foreground hover:bg-surface"
            >
              <Bell className="h-5 w-5" />
              {unreadNotifications > 0 && (
                <span className="absolute right-1 top-1 grid h-4 min-w-4 place-items-center rounded-full bg-accent-strong px-0.5 text-[10px] font-bold text-accent-strong-foreground">
                  {unreadNotifications}
                </span>
              )}
            </button>

            <div className="relative">
              <button
                aria-label="Compte"
                onClick={() => setUserMenuOpen((s) => !s)}
                className="flex items-center gap-2 rounded-md px-2 py-1 text-sm hover:bg-surface"
              >
                <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-accent-strong text-xs font-semibold text-accent-strong-foreground">
                  {user?.email?.charAt(0).toUpperCase() ?? "U"}
                </span>
                <span className="hidden sm:block text-sm">{displayName}</span>
              </button>

              {userMenuOpen && (
                <div className="absolute right-0 mt-2 w-48 rounded-lg border border-border bg-card shadow-lg">
                  <button
                    className="flex w-full items-center gap-2 px-3 py-2 text-sm hover:bg-surface"
                    onClick={() => {
                      setUserMenuOpen(false);
                      navigate({ to: "/admin/parametres" });
                    }}
                  >
                    <User className="h-4 w-4" /> Paramètres
                  </button>
                  <button
                    className="flex w-full items-center gap-2 px-3 py-2 text-sm text-destructive hover:bg-surface"
                    onClick={async () => {
                      setUserMenuOpen(false);
                      try {
                        await signOut();
                        toast.success("Déconnecté");
                        navigate({ to: "/admin/login" });
                      } catch (e) {
                        console.error(e);
                        toast.error("Erreur déconnexion");
                      }
                    }}
                  >
                    <LogOut className="h-4 w-4" /> Se déconnecter
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>
        <main className="flex-1 overflow-auto p-4 lg:p-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
