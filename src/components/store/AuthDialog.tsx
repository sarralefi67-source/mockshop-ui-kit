import { Link, useNavigate } from "@tanstack/react-router";
import { Eye, EyeOff } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/lib/supabaseClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

type SignupField = "first_name" | "last_name" | "email" | "phone" | "password";
type SignupErrors = Partial<Record<SignupField, string>>;
type SigninErrors = Partial<Record<"email" | "password", string>>;

/**
 * Connexion et création de compte en modale : le client garde sa page (fiche
 * produit, panier…) sous les yeux et y revient directement après validation.
 * L'ouverture passe par `openAuth()` du contexte d'authentification.
 */
export function AuthDialog() {
  const { authDialog, setAuthMode, closeAuth, signIn, signUp, signOut } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [newsletter, setNewsletter] = useState(true);
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [signupPasswordVisible, setSignupPasswordVisible] = useState(false);
  const [signinPasswordVisible, setSigninPasswordVisible] = useState(false);
  const [signupErrors, setSignupErrors] = useState<SignupErrors>({});
  const [signinErrors, setSigninErrors] = useState<SigninErrors>({});
  const [termsError, setTermsError] = useState("");

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
    const errors: SigninErrors = {};
    if (!email) errors.email = "L'e-mail est obligatoire.";
    else if (!/^\S+@\S+\.\S+$/.test(email)) errors.email = "Veuillez saisir une adresse e-mail valide.";
    if (!password) errors.password = "Le mot de passe est obligatoire.";
    setSigninErrors(errors);
    if (Object.keys(errors).length > 0) {
      const firstInvalid = errors.email ? "auth-email" : "auth-password";
      document.getElementById(firstInvalid)?.focus();
      return;
    }
    setLoading(true);
    const { error } = await signIn(email, password);
    setLoading(false);
    if (error) {
      const message =
        error.message === "Invalid login credentials"
          ? "Identifiants invalides. Vérifiez votre e-mail et votre mot de passe."
          : error.message || "Erreur de connexion";
      toast.error(message);
      return;
    }
    const { data: sessionData } = await supabase.auth.getSession();
    const userId = sessionData.session?.user?.id;
    const { data: profile } = userId
      ? await supabase.from("profiles").select("role").eq("id", userId).maybeSingle()
      : { data: null };
    if (profile?.role !== "customer") {
      await signOut();
      toast.error("Cette connexion est réservée aux comptes clients.");
      return;
    }
    toast.success("Connecté");
    closeAuth();
    const target = authDialog.redirect ?? "/compte";
    navigate({ to: target as "/compte" });
  };

  const handleSignUp = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const first_name = String(data.get("first_name") ?? "").trim();
    const last_name = String(data.get("last_name") ?? "").trim();
    const email = String(data.get("email") ?? "").trim();
    const phone = String(data.get("phone") ?? "").trim();
    const password = String(data.get("password") ?? "");
    const errors: SignupErrors = {};

    if (!first_name) errors.first_name = "Le prénom est obligatoire.";
    if (!last_name) errors.last_name = "Le nom est obligatoire.";
    if (!email) errors.email = "L'e-mail est obligatoire.";
    else if (!/^\S+@\S+\.\S+$/.test(email)) errors.email = "Veuillez saisir une adresse e-mail valide.";
    if (!phone) errors.phone = "Le téléphone est obligatoire.";
    if (!password) errors.password = "Le mot de passe est obligatoire.";
    else if (password.length < 6) errors.password = "Le mot de passe doit contenir au moins 6 caractères.";

    setSignupErrors(errors);
    if (Object.keys(errors).length > 0) {
      const firstInvalid = Object.keys(errors)[0] as SignupField;
      (event.currentTarget.elements.namedItem(firstInvalid) as HTMLInputElement | null)?.focus();
      return;
    }
    if (!acceptedTerms) {
      setTermsError("Vous devez accepter les conditions générales d'utilisation.");
      return;
    }
    setTermsError("");

    setLoading(true);
    // TODO: repasser le token hCaptcha en 4e argument une fois le domaine acheté.
    const { error } = await signUp(email, password, {
      first_name: first_name || null,
      last_name: last_name || null,
      phone: phone || null,
    });
    setLoading(false);
    if (error) {
      const normalizedMessage = String(error.message ?? "").toLowerCase();
      const message =
        error.message === "User already registered"
          ? "Un compte existe déjà avec cet e-mail. Essayez de vous connecter."
          : normalizedMessage.includes("rate limit exceeded") || normalizedMessage.includes("rate_limit_exceeded")
            ? "Trop de demandes envoyées. Merci d’attendre quelques secondes avant de réessayer."
            : error.message || "Erreur lors de la création du compte";
      toast.error(message);
      return;
    }
    if (newsletter) {
      // Table indépendante : on n'attend pas que la ligne profil soit créée.
      supabase
        .from("newsletter_subscribers")
        .insert({ email })
        .then(({ error: newsletterError }) => {
          if (newsletterError)
            console.warn("newsletter subscribe on signup failed:", newsletterError);
        });
    }
    finish("Compte créé : vérifiez votre e-mail pour confirmer votre adresse.");
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
          <form className="space-y-4" onSubmit={handleSignUp} noValidate>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="auth-first-name">Prénom</Label>
                <Input
                  id="auth-first-name"
                  name="first_name"
                  autoComplete="given-name"
                  aria-invalid={Boolean(signupErrors.first_name)}
                  aria-describedby={signupErrors.first_name ? "auth-first-name-error" : undefined}
                  className={signupErrors.first_name ? "border-red-600 focus-visible:ring-red-600" : undefined}
                />
                {signupErrors.first_name ? <p id="auth-first-name-error" className="text-sm text-red-600">{signupErrors.first_name}</p> : null}
              </div>
              <div className="space-y-2">
                <Label htmlFor="auth-last-name">Nom</Label>
                <Input
                  id="auth-last-name"
                  name="last_name"
                  autoComplete="family-name"
                  aria-invalid={Boolean(signupErrors.last_name)}
                  aria-describedby={signupErrors.last_name ? "auth-last-name-error" : undefined}
                  className={signupErrors.last_name ? "border-red-600 focus-visible:ring-red-600" : undefined}
                />
                {signupErrors.last_name ? <p id="auth-last-name-error" className="text-sm text-red-600">{signupErrors.last_name}</p> : null}
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="auth-signup-email">E-mail</Label>
              <Input
                id="auth-signup-email"
                name="email"
                type="email"
                autoComplete="email"
                placeholder="vous@example.tn"
                aria-invalid={Boolean(signupErrors.email)}
                aria-describedby={signupErrors.email ? "auth-signup-email-error" : undefined}
                className={signupErrors.email ? "border-red-600 focus-visible:ring-red-600" : undefined}
              />
              {signupErrors.email ? <p id="auth-signup-email-error" className="text-sm text-red-600">{signupErrors.email}</p> : null}
            </div>
            <div className="space-y-2">
              <Label htmlFor="auth-phone">Téléphone</Label>
              <Input
                id="auth-phone"
                name="phone"
                type="tel"
                autoComplete="tel"
                placeholder="+216 22 000 000"
                aria-invalid={Boolean(signupErrors.phone)}
                aria-describedby={signupErrors.phone ? "auth-phone-error" : undefined}
                className={signupErrors.phone ? "border-red-600 focus-visible:ring-red-600" : undefined}
              />
              {signupErrors.phone ? <p id="auth-phone-error" className="text-sm text-red-600">{signupErrors.phone}</p> : null}
            </div>
            <div className="space-y-2">
              <Label htmlFor="auth-signup-password">Mot de passe</Label>
              <div className="relative">
                <Input
                  id="auth-signup-password"
                  name="password"
                  type={signupPasswordVisible ? "text" : "password"}
                  autoComplete="new-password"
                  aria-invalid={Boolean(signupErrors.password)}
                  aria-describedby={signupErrors.password ? "auth-signup-password-error" : undefined}
                  className={`${signupErrors.password ? "border-red-600 focus-visible:ring-red-600 " : ""}pr-11`}
                />
                <button
                  type="button"
                  onClick={() => setSignupPasswordVisible((visible) => !visible)}
                  aria-label={signupPasswordVisible ? "Masquer le mot de passe" : "Afficher le mot de passe"}
                  className="absolute right-1 top-1/2 grid h-8 w-8 -translate-y-1/2 place-items-center rounded text-muted-foreground hover:text-foreground"
                >
                  {signupPasswordVisible ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              {signupErrors.password ? (
                <p id="auth-signup-password-error" className="text-sm text-red-600" role="alert">
                  {signupErrors.password}
                </p>
              ) : null}
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
                className={termsError ? "border-red-600" : undefined}
                aria-invalid={Boolean(termsError)}
                aria-describedby={termsError ? "auth-terms-error" : undefined}
                onCheckedChange={(value) => {
                  setAcceptedTerms(value === true);
                  if (value === true) setTermsError("");
                }}
              />
              <Label htmlFor="auth-terms" className="text-sm font-normal leading-snug">
                J'accepte les{" "}
                <Link
                  to="/pages/$slug"
                  params={{ slug: "confidentialite" }}
                  className="font-medium text-accent-strong underline-offset-2 hover:underline"
                  onClick={closeAuth}
                >
                  conditions générales d'utilisation
                </Link>
                .
              </Label>
            </div>
            {termsError ? (
              <p id="auth-terms-error" className="text-sm text-red-600" role="alert">
                {termsError}
              </p>
            ) : null}
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
          <form className="space-y-4" onSubmit={handleSignIn} noValidate>
            <div className="space-y-2">
              <Label htmlFor="auth-email">E-mail</Label>
              <Input
                id="auth-email"
                name="email"
                type="email"
                autoComplete="email"
                placeholder="vous@example.tn"
                aria-invalid={Boolean(signinErrors.email)}
                aria-describedby={signinErrors.email ? "auth-signin-email-error" : undefined}
                className={signinErrors.email ? "border-red-600 focus-visible:ring-red-600" : undefined}
                onChange={() => setSigninErrors((errors) => ({ ...errors, email: "" }))}
              />
              {signinErrors.email ? <p id="auth-signin-email-error" className="text-sm text-red-600" role="alert">{signinErrors.email}</p> : null}
            </div>
            <div className="space-y-2">
              <Label htmlFor="auth-password">Mot de passe</Label>
              <div className="relative">
                <Input
                  id="auth-password"
                  name="password"
                  type={signinPasswordVisible ? "text" : "password"}
                  autoComplete="current-password"
                  placeholder="••••••••"
                  aria-invalid={Boolean(signinErrors.password)}
                  aria-describedby={signinErrors.password ? "auth-signin-password-error" : undefined}
                  className={`pr-11 ${signinErrors.password ? "border-red-600 focus-visible:ring-red-600" : ""}`}
                  onChange={() => setSigninErrors((errors) => ({ ...errors, password: "" }))}
                />
                <button
                  type="button"
                  onClick={() => setSigninPasswordVisible((visible) => !visible)}
                  aria-label={signinPasswordVisible ? "Masquer le mot de passe" : "Afficher le mot de passe"}
                  className="absolute right-1 top-1/2 grid h-8 w-8 -translate-y-1/2 place-items-center rounded text-muted-foreground hover:text-foreground"
                >
                  {signinPasswordVisible ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              {signinErrors.password ? <p id="auth-signin-password-error" className="text-sm text-red-600" role="alert">{signinErrors.password}</p> : null}
            </div>
            <Button variant="accent" size="lg" type="submit" className="w-full" disabled={loading}>
              {loading ? "Connexion…" : "Se connecter"}
            </Button>
            <button
              type="button"
              className="block w-full text-center text-sm font-semibold text-accent-strong hover:underline"
              onClick={() => {
                closeAuth();
                navigate({ to: "/mot-de-passe-oublie" });
              }}
            >
              Mot de passe oublié ?
            </button>
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
