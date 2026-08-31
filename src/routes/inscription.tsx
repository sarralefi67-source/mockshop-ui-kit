import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { isPendingSignup, useAuth } from "@/context/AuthContext";
import { StoreLayout } from "@/components/store/StoreLayout";

/**
 * La création de compte se fait en modale (voir components/store/AuthDialog).
 * Cette route ne subsiste que pour les liens et favoris existants.
 */
export const Route = createFileRoute("/inscription")({
  head: () => ({
    meta: [{ title: "Créer un compte : Artisanat" }, { name: "robots", content: "noindex" }],
  }),
  component: RegisterRedirect,
});

function RegisterRedirect() {
  const { openAuth, user } = useAuth();
  const navigate = useNavigate();
  const pendingSignup = isPendingSignup();

  useEffect(() => {
    if (pendingSignup || user) {
      navigate({ to: "/", replace: true });
      return;
    }

    navigate({ to: "/", replace: true });
    openAuth("signup");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pendingSignup, user]);

  return (
    <StoreLayout>
      <div className="container-page py-24 text-center text-muted-foreground">
        Ouverture de la création de compte…
      </div>
    </StoreLayout>
  );
}
