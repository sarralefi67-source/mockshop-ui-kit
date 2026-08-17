import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { StoreLayout } from "@/components/store/StoreLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";

export const Route = createFileRoute("/inscription")({
  head: () => ({
    meta: [
      { title: "Créer un compte — NexaStore" },
      { name: "description", content: "Créez votre compte NexaStore pour commander plus vite et suivre vos livraisons." },
      { property: "og:title", content: "Créer un compte — NexaStore" },
      { property: "og:description", content: "Inscription gratuite à l'espace client NexaStore." },
    ],
  }),
  component: RegisterPage,
});

function RegisterPage() {
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  return (
    <StoreLayout>
      <div className="container-page max-w-lg py-16">
        <h1 className="text-3xl font-extrabold">Créer un compte</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Commandez plus vite et suivez vos livraisons.
        </p>

        <form
          className="mt-8 space-y-4 rounded-xl border border-border bg-card p-6"
          onSubmit={(e) => {
            e.preventDefault();
            setLoading(true);
            setTimeout(() => {
              setLoading(false);
              toast.success("Compte créé (démo) — authentification à brancher.");
              navigate({ to: "/compte" });
            }, 700);
          }}
        >
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="fn">Prénom</Label>
              <Input id="fn" required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="ln">Nom</Label>
              <Input id="ln" required />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="em">E-mail</Label>
            <Input id="em" type="email" required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="ph">Téléphone</Label>
            <Input id="ph" type="tel" required placeholder="+216 22 000 000" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="pw">Mot de passe</Label>
            <Input id="pw" type="password" required />
          </div>
          <div className="flex items-start gap-2">
            <Checkbox id="nl" defaultChecked />
            <Label htmlFor="nl" className="text-sm font-normal leading-snug">
              Je souhaite recevoir la newsletter (promos et nouveautés).
            </Label>
          </div>
          <div className="flex items-start gap-2">
            <Checkbox id="cgu" required />
            <Label htmlFor="cgu" className="text-sm font-normal leading-snug">
              J'accepte les conditions générales d'utilisation.
            </Label>
          </div>
          <Button variant="accent" size="lg" type="submit" className="w-full" disabled={loading}>
            {loading ? "Création…" : "Créer mon compte"}
          </Button>
        </form>

        <p className="mt-6 text-center text-sm text-muted-foreground">
          Déjà inscrit ?{" "}
          <Link to="/connexion" className="font-semibold text-accent-strong hover:underline">
            Se connecter
          </Link>
        </p>
      </div>
    </StoreLayout>
  );
}
