import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { useAuth } from "@/context/AuthContext";
import { StoreLayout } from "@/components/store/StoreLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";

export const Route = createFileRoute("/connexion")({
  head: () => ({
    meta: [
      { title: "Connexion — NexaStore" },
      { name: "description", content: "Connectez-vous à votre compte NexaStore pour suivre vos commandes et vos favoris." },
      { property: "og:title", content: "Connexion — NexaStore" },
      { property: "og:description", content: "Accédez à votre espace client NexaStore." },
    ],
  }),
  component: LoginPage,
});

function LoginPage() {
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { signIn } = useAuth();

  return (
    <StoreLayout>
      <div className="container-page max-w-md py-16">
        <h1 className="text-3xl font-extrabold">Connexion</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Accédez à vos commandes, adresses et favoris.
        </p>

        <form
          className="mt-8 space-y-4 rounded-xl border border-border bg-card p-6"
          onSubmit={async (e) => {
            e.preventDefault();
            const form = e.currentTarget as HTMLFormElement;
            const formData = new FormData(form);
            const email = String(formData.get("email") ?? "").trim();
            const password = String(formData.get("pwd") ?? "");
            setLoading(true);
            const { error } = await signIn(email, password);
            setLoading(false);
            if (error) {
              toast.error(error.message || "Erreur de connexion");
            } else {
              toast.success("Connecté");
              navigate({ to: "/compte" });
            }
          }}
        >
          <div className="space-y-2">
            <Label htmlFor="email">E-mail</Label>
            <Input id="email" name="email" type="email" required placeholder="vous@example.tn" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="pwd">Mot de passe</Label>
            <Input id="pwd" name="pwd" type="password" required placeholder="••••••••" />
          </div>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Checkbox id="remember" />
              <Label htmlFor="remember" className="text-sm font-normal">Se souvenir de moi</Label>
            </div>
            <button type="button" className="text-sm text-accent-strong hover:underline">
              Mot de passe oublié ?
            </button>
          </div>
          <Button variant="accent" size="lg" type="submit" className="w-full" disabled={loading}>
            {loading ? "Connexion…" : "Se connecter"}
          </Button>
        </form>

        <p className="mt-6 text-center text-sm text-muted-foreground">
          Pas encore de compte ?{" "}
          <Link to="/inscription" className="font-semibold text-accent-strong hover:underline">
            Créer un compte
          </Link>
        </p>
      </div>
    </StoreLayout>
  );
}
