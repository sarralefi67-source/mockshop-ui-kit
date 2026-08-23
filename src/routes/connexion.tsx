import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import { StoreLayout } from "@/components/store/StoreLayout";

/**
 * La connexion se fait en modale (voir components/store/AuthDialog). Cette
 * route ne subsiste que pour les liens et favoris existants : elle renvoie à
 * l'accueil en ouvrant la modale, en conservant la destination demandée.
 */
export const Route = createFileRoute("/connexion")({
  validateSearch: (search: Record<string, unknown>): { redirect?: string } =>
    typeof search["redirect"] === "string" ? { redirect: search["redirect"] } : {},
  head: () => ({
    meta: [{ title: "Connexion : Artisanat" }, { name: "robots", content: "noindex" }],
  }),
  component: LoginRedirect,
});

function LoginRedirect() {
  const { redirect } = Route.useSearch();
  const { openAuth } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    navigate({ to: "/", replace: true });
    openAuth("signin", redirect ?? null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <StoreLayout>
      <div className="container-page py-24 text-center text-muted-foreground">
        Ouverture de la connexion…
      </div>
    </StoreLayout>
  );
}
