import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState, type FormEvent } from "react";
import { ArrowLeft, LockKeyhole } from "lucide-react";
import { toast } from "sonner";
import { StoreLayout } from "@/components/store/StoreLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/lib/supabaseClient";

export const Route = createFileRoute("/reinitialiser-mot-de-passe")({
  head: () => ({
    meta: [
      { title: "Réinitialiser le mot de passe : Artisanat" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: ResetPasswordPage,
});

function ResetPasswordPage() {
  const navigate = useNavigate();
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (password.length < 6) {
      toast.error("Le mot de passe doit contenir au moins 6 caractères.");
      return;
    }
    if (password !== confirmation) {
      toast.error("Les mots de passe ne correspondent pas.");
      return;
    }
    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password });
    setLoading(false);
    if (error) {
      toast.error(error.message || "Impossible de réinitialiser le mot de passe.");
      return;
    }
    toast.success("Votre mot de passe a été réinitialisé.");
    navigate({ to: "/" });
  };

  return (
    <StoreLayout>
      <div className="container-page flex min-h-[60vh] items-center justify-center py-12">
        <div className="w-full max-w-md rounded-xl border border-border bg-card p-6 shadow-sm">
          <div className="mb-6 flex h-12 w-12 items-center justify-center rounded-full bg-accent-strong/10 text-accent-strong">
            <LockKeyhole className="h-6 w-6" />
          </div>
          <h1 className="page-title text-3xl">Nouveau mot de passe</h1>
          <p className="mt-3 text-sm text-muted-foreground">
            Choisissez un nouveau mot de passe pour sécuriser votre compte.
          </p>
          <form className="mt-6 space-y-4" onSubmit={handleSubmit}>
            <div className="space-y-2">
              <Label htmlFor="new-password">Nouveau mot de passe</Label>
              <Input
                id="new-password"
                type="password"
                required
                minLength={6}
                autoComplete="new-password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirm-password">Confirmer le mot de passe</Label>
              <Input
                id="confirm-password"
                type="password"
                required
                minLength={6}
                autoComplete="new-password"
                value={confirmation}
                onChange={(event) => setConfirmation(event.target.value)}
              />
            </div>
            <Button variant="accent" size="lg" type="submit" className="w-full" disabled={loading}>
              {loading ? "Enregistrement…" : "Réinitialiser le mot de passe"}
            </Button>
          </form>
          <Link
            to="/"
            className="mt-6 inline-flex items-center gap-2 text-sm font-semibold text-accent-strong hover:underline"
          >
            <ArrowLeft className="h-4 w-4" /> Retour à la boutique
          </Link>
        </div>
      </div>
    </StoreLayout>
  );
}
