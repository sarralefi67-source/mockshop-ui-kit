import { createFileRoute, Link, Outlet, useRouterState } from "@tanstack/react-router";
import { Heart, LogOut, MapPin, Package, User } from "lucide-react";
import { StoreLayout } from "@/components/store/StoreLayout";
import { currentCustomer } from "@/data/orders";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/compte")({
  head: () => ({
    meta: [
      { title: "Mon compte — NexaStore" },
      { name: "description", content: "Gérez vos informations, vos commandes, vos adresses et vos favoris NexaStore." },
      { property: "og:title", content: "Mon compte — NexaStore" },
      { property: "og:description", content: "Espace client NexaStore." },
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

  return (
    <StoreLayout>
      <div className="container-page grid gap-8 py-10 lg:grid-cols-[260px_1fr]">
        <aside>
          <div className="rounded-xl border border-border bg-card p-5">
            <p className="text-sm text-muted-foreground">Bonjour</p>
            <p className="text-lg font-bold">
              {currentCustomer.first_name} {currentCustomer.last_name}
            </p>
            <p className="text-xs text-muted-foreground">{currentCustomer.email}</p>
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
            <Link
              to="/connexion"
              className="flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium text-muted-foreground hover:bg-surface hover:text-foreground"
            >
              <LogOut className="h-4 w-4" />
              Se déconnecter
            </Link>
          </nav>
        </aside>

        <div>
          <Outlet />
        </div>
      </div>
    </StoreLayout>
  );
}
