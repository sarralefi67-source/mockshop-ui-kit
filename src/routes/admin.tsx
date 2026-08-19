import { createFileRoute, Link, Outlet, useRouterState } from "@tanstack/react-router";
import { useNavigate } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import {
  BadgePercent, ChevronLeft, LayoutDashboard, ListTree, Menu, Package, ShoppingBag, Store,
  Bell, User, LogOut, MessageCircle, Mail,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/context/AuthContext";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

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
  { to: "/admin/newsletter", label: "Newsletter", icon: Mail, exact: false },
  { to: "/admin/avis", label: "Avis clients", icon: MessageCircle, exact: false },
  { to: "/admin/clients", label: "Clients", icon: User, exact: false },
  { to: "/admin/commandes", label: "Commandes", icon: ShoppingBag, exact: false },
  { to: "/admin/parametres", label: "Paramètres", icon: User, exact: false },
] as const;

function AdminLayout() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const [open, setOpen] = useState(false);
  const { user, profile, loading, signIn, signOut } = useAuth();
  const navigate = useNavigate();
  const [userMenuOpen, setUserMenuOpen] = useState(false);

  const displayName = profile?.first_name ? `${profile.first_name}${profile?.last_name ? ` ${profile.last_name}` : ""}` : user?.email;

  useEffect(() => {
    // if logged in but not admin, redirect away
    if (!loading && user && profile && profile.role !== "admin") navigate({ to: "/" });
  }, [loading, user, profile, navigate]);

  // don't redirect unauthenticated users here - allow the child login route to render

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p>Chargement…</p>
      </div>
    );
  }

  // If the current path is the admin login, render a standalone login page (no sidebar/header)
  if (pathname === "/admin/login") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background px-4">
        <div className="w-full max-w-md">
          <div className="rounded-xl border border-border bg-card p-6">
            <h1 className="text-2xl font-bold">Connexion administrateur</h1>
            <p className="text-sm text-muted-foreground mt-1">Veuillez vous connecter avec un compte administrateur.</p>
            <form
              className="mt-6 space-y-4"
              onSubmit={async (e) => {
                e.preventDefault();
                const form = e.target as HTMLFormElement;
                const fd = new FormData(form);
                const email = String(fd.get("email") ?? "");
                const password = String(fd.get("password") ?? "");
                try {
                  const { error } = await signIn(email, password);
                  if (error) {
                    console.error("admin signIn error:", error);
                    toast.error(error.message ?? "Erreur d'authentification");
                    return;
                  }
                  toast.success("Connecté");
                  navigate({ to: "/admin" });
                } catch (err) {
                  console.error(err);
                  toast.error("Erreur réseau");
                }
              }}
            >
              <div>
                <Label>Adresse e-mail</Label>
                <Input name="email" type="email" required />
              </div>
              <div>
                <Label>Mot de passe</Label>
                <Input name="password" type="password" required />
              </div>
              <div className="flex items-center justify-between">
                <Button type="submit" variant="accent">Se connecter</Button>
                <Link to="/" className="text-sm text-muted-foreground hover:text-accent-strong">Retour site</Link>
              </div>
            </form>
          </div>
        </div>
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
        <div className="flex h-16 items-center gap-2 border-b border-border px-5">
        
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

      <div className="flex min-w-0 flex-1 flex-col lg:pl-64">
        <header className="sticky top-0 z-40 flex h-16 items-center gap-3 border-b border-border bg-card px-4 lg:px-8">
          <button className="lg:hidden" onClick={() => setOpen(true)} aria-label="Ouvrir le menu">
            <Menu className="h-6 w-6" />
          </button>

          <div className="ml-auto flex items-center gap-3">
            <button
              aria-label="Notifications"
              onClick={() => navigate({ to: "/admin" })}
              className="relative rounded-md p-2 text-muted-foreground hover:bg-surface"
            >
              <Bell className="h-5 w-5" />
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
