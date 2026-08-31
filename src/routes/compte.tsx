import { createFileRoute, Link, Outlet, useRouterState, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { Heart, LogOut, MapPin, Package, User } from "lucide-react";
import { StoreLayout } from "@/components/store/StoreLayout";
import { isPendingSignup, useAuth } from "@/context/AuthContext";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/compte")({
  head: () => ({
    meta: [
      { title: "Mon compte : Artisanat" },
      { name: "description", content: "Gérez vos informations, vos commandes, vos adresses et vos favoris Artisanat." },
      { property: "og:title", content: "Mon compte : Artisanat" },
      { property: "og:description", content: "Espace client Artisanat." },
    ],
  }),
  component: AccountLayout,
});

const links = [
  { to: "/compte", label: "Informations", icon: User, exact: true },
  { to: "/compte/commandes", label: "Mes commandes", icon: Package, exact: false },
  { to: "/compte/adresses", label: "Mes adresses", icon: MapPin, exact: false },
  { to: "/favoris", label: "Mes favoris", icon: Heart, exact: false },
] as const;

function AccountLayout() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const { user, profile, loading, signOut, openAuth } = useAuth();
  const navigate = useNavigate();
  const pendingSignup = isPendingSignup();

  useEffect(() => {
    if (loading || user) return;
    if (pendingSignup) {
      navigate({ to: "/", replace: true });
      return;
    }
    navigate({ to: "/" });
    openAuth("signin", "/compte");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading, user, pendingSignup]);

  if (loading || !user) {
    return (
      <StoreLayout>
        <div className="container-page py-24 text-center text-muted-foreground">
          {pendingSignup ? "Vérifiez votre e-mail pour confirmer votre compte avant de vous connecter." : "Chargement…"}
        </div>
      </StoreLayout>
    );
  }

  return (
    <StoreLayout>
      <div className="container-page grid gap-8 py-10 lg:grid-cols-[260px_1fr]">
        <aside>
          <div className="rounded-xl border border-border bg-card p-5">
            <p className="text-sm text-muted-foreground">Bonjour</p>
            <p className="text-lg font-bold">
              {profile?.first_name} {profile?.last_name}
            </p>
            <p className="text-xs text-muted-foreground">{profile?.email}</p>
          </div>
          <nav className="mt-4 space-y-1">
            {links.map(({ to, label, icon: Icon, exact }) => {
              const active = exact ? pathname === to : pathname.startsWith(to);
              return (
                <Link
                  key={to}
                  to={to}
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
            <button
              type="button"
              onClick={async () => {
                await signOut();
                navigate({ to: "/" });
              }}
              className="flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm font-medium text-muted-foreground hover:bg-surface hover:text-foreground"
            >
              <LogOut className="h-4 w-4" />
              Se déconnecter
            </button>
          </nav>
        </aside>

        <div>
          <Outlet />
        </div>
      </div>
    </StoreLayout>
  );
}
