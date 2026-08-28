import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState, type FormEvent } from "react";
import { ArrowLeft, Eye, EyeOff, LockKeyhole } from "lucide-react";
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
  const [passwordVisible, setPasswordVisible] = useState(false);
  const [confirmationVisible, setConfirmationVisible] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const errors: Record<string, string> = {};
    if (!password) errors.password = "Le nouveau mot de passe est obligatoire.";
    else if (password.length < 6) errors.password = "Le mot de passe doit contenir au moins 6 caractères.";
    if (!confirmation) errors.confirmation = "La confirmation du mot de passe est obligatoire.";
    else if (password !== confirmation) errors.confirmation = "Les mots de passe ne correspondent pas.";
    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      const firstInvalidField = errors.password ? "new-password" : "confirm-password";
      document.getElementById(firstInvalidField)?.focus();
      return;
    }
    setFieldErrors({});
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
         
          <h1 className="text-center text-3xl">Nouveau mot de passe</h1>
          <p className="mt-3 text-sm text-muted-foreground">
            Choisissez un nouveau mot de passe pour sécuriser votre compte.
          </p>
          <form className="mt-6 space-y-4" onSubmit={handleSubmit}>
            <div className="space-y-2">
              <Label htmlFor="new-password">Nouveau mot de passe</Label>
              <div className="relative">
                <Input
                  id="new-password"
                  type={passwordVisible ? "text" : "password"}
                  aria-required="true"
                  aria-invalid={Boolean(fieldErrors.password)}
                  autoComplete="new-password"
                  value={password}
                  onChange={(event) => { setPassword(event.target.value); setFieldErrors((errors) => ({ ...errors, password: "" })); }}
                  className={`pr-11 ${fieldErrors.password ? "border-red-500 focus-visible:ring-red-500" : ""}`}
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => setPasswordVisible((visible) => !visible)}
                  aria-label={passwordVisible ? "Masquer le mot de passe" : "Afficher le mot de passe"}
                  className="absolute right-1 top-1/2 h-7 w-7 -translate-y-1/2 text-muted-foreground"
                >
                  {passwordVisible ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </Button>
              </div>
              {fieldErrors.password && <p className="text-sm text-red-600">{fieldErrors.password}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirm-password">Confirmer le mot de passe</Label>
              <div className="relative">
                <Input
                  id="confirm-password"
                  type={confirmationVisible ? "text" : "password"}
                  aria-required="true"
                  aria-invalid={Boolean(fieldErrors.confirmation)}
                  autoComplete="new-password"
                  value={confirmation}
                  onChange={(event) => { setConfirmation(event.target.value); setFieldErrors((errors) => ({ ...errors, confirmation: "" })); }}
                  className={`pr-11 ${fieldErrors.confirmation ? "border-red-500 focus-visible:ring-red-500" : ""}`}
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => setConfirmationVisible((visible) => !visible)}
                  aria-label={confirmationVisible ? "Masquer la confirmation" : "Afficher la confirmation"}
                  className="absolute right-1 top-1/2 h-7 w-7 -translate-y-1/2 text-muted-foreground"
                >
                  {confirmationVisible ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </Button>
              </div>
              {fieldErrors.confirmation && <p className="text-sm text-red-600">{fieldErrors.confirmation}</p>}
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
