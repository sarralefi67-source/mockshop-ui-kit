import { useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/lib/supabaseClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";

/**
 * Connexion et création de compte en modale : le client garde sa page (fiche
 * produit, panier…) sous les yeux et y revient directement après validation.
 * L'ouverture passe par `openAuth()` du contexte d'authentification.
 */
export function AuthDialog() {
  const { authDialog, setAuthMode, closeAuth, signIn, signUp } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [newsletter, setNewsletter] = useState(true);
  const [acceptedTerms, setAcceptedTerms] = useState(false);

  const isSignup = authDialog.mode === "signup";

  // Après succès : on suit la destination demandée si l'action en exigeait une
  // (commander, laisser un avis…), sinon on referme simplement et le client
  // reste où il était.
  const finish = (message: string) => {
    toast.success(message);
    closeAuth();
    if (authDialog.redirect) navigate({ to: authDialog.redirect as "/compte" });
  };

  const handleSignIn = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const email = String(data.get("email") ?? "").trim();
    const password = String(data.get("password") ?? "");
    setLoading(true);
    const { error } = await signIn(email, password);
    setLoading(false);
    if (error) {
      toast.error(error.message || "Erreur de connexion");
      return;
    }
    finish("Connecté");
  };

  const handleSignUp = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!acceptedTerms) {
      toast.error("Vous devez accepter les conditions générales d'utilisation.");
      return;
    }
    const data = new FormData(event.currentTarget);
    const email = String(data.get("email") ?? "").trim();
    const password = String(data.get("password") ?? "");
    const first_name = String(data.get("first_name") ?? "").trim() || null;
    const last_name = String(data.get("last_name") ?? "").trim() || null;
    const phone = String(data.get("phone") ?? "").trim() || null;

    setLoading(true);
    // TODO: repasser le token hCaptcha en 4e argument une fois le domaine acheté.
    const { error } = await signUp(email, password, { first_name, last_name, phone });
    setLoading(false);
    if (error) {
      toast.error(error.message || "Erreur lors de la création du compte");
      return;
    }
    if (newsletter) {
      // Table indépendante : on n'attend pas que la ligne profil soit créée.
      supabase
        .from("newsletter_subscribers")
        .insert({ email })
        .then(({ error: newsletterError }) => {
          if (newsletterError) console.warn("newsletter subscribe on signup failed:", newsletterError);
        });
    }
    finish("Compte créé — vérifiez votre e-mail si une confirmation est requise.");
  };

  return (
    <Dialog
      open={authDialog.open}
      onOpenChange={(open) => {
        if (!open) closeAuth();
      }}
    >
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="font-display text-2xl">
            {isSignup ? "Créer un compte" : "Connexion"}
          </DialogTitle>
          <DialogDescription>
            {isSignup
              ? "Commandez plus vite et suivez vos livraisons."
              : "Accédez à vos commandes, adresses et favoris."}
          </DialogDescription>
        </DialogHeader>

        {isSignup ? (
          <form className="space-y-4" onSubmit={handleSignUp}>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="auth-first-name">Prénom</Label>
                <Input id="auth-first-name" name="first_name" required autoComplete="given-name" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="auth-last-name">Nom</Label>
                <Input id="auth-last-name" name="last_name" required autoComplete="family-name" />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="auth-signup-email">E-mail</Label>
              <Input
                id="auth-signup-email"
                name="email"
                type="email"
                required
                autoComplete="email"
                placeholder="vous@example.tn"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="auth-phone">Téléphone</Label>
              <Input
                id="auth-phone"
                name="phone"
                type="tel"
                required
                autoComplete="tel"
                placeholder="+216 22 000 000"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="auth-signup-password">Mot de passe</Label>
              <Input
                id="auth-signup-password"
                name="password"
                type="password"
                required
                autoComplete="new-password"
              />
            </div>
            {/* <div className="flex items-start gap-2">
              <Checkbox
                id="auth-newsletter"
                checked={newsletter}
                onCheckedChange={(value) => setNewsletter(value === true)}
              />
              <Label htmlFor="auth-newsletter" className="text-sm font-normal leading-snug">
                Je souhaite recevoir la newsletter (promos et nouveautés).
              </Label>
            </div> */}
            <div className="flex items-start gap-2">
              <Checkbox
                id="auth-terms"
                checked={acceptedTerms}
                onCheckedChange={(value) => setAcceptedTerms(value === true)}
              />
              <Label htmlFor="auth-terms" className="text-sm font-normal leading-snug">
                J'accepte les conditions générales d'utilisation.
              </Label>
            </div>
            <Button variant="accent" size="lg" type="submit" className="w-full" disabled={loading}>
              {loading ? "Création…" : "Créer mon compte"}
            </Button>
            <p className="text-center text-sm text-muted-foreground">
              Déjà inscrit ?{" "}
              <button
                type="button"
                className="font-semibold text-accent-strong hover:underline"
                onClick={() => setAuthMode("signin")}
              >
                Se connecter
              </button>
            </p>
          </form>
        ) : (
          <form className="space-y-4" onSubmit={handleSignIn}>
            <div className="space-y-2">
              <Label htmlFor="auth-email">E-mail</Label>
              <Input
                id="auth-email"
                name="email"
                type="email"
                required
                autoComplete="email"
                placeholder="vous@example.tn"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="auth-password">Mot de passe</Label>
              <Input
                id="auth-password"
                name="password"
                type="password"
                required
                autoComplete="current-password"
                placeholder="••••••••"
              />
            </div>
            <Button variant="accent" size="lg" type="submit" className="w-full" disabled={loading}>
              {loading ? "Connexion…" : "Se connecter"}
            </Button>
            <p className="text-center text-sm text-muted-foreground">
              Pas encore de compte ?{" "}
              <button
                type="button"
                className="font-semibold text-accent-strong hover:underline"
                onClick={() => setAuthMode("signup")}
              >
                Créer un compte
              </button>
            </p>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
