import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { Eye, EyeOff } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/lib/supabaseClient";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/admin/login")({
  head: () => ({
    meta: [{ title: "Admin Login — Artisanat" }, { name: "robots", content: "noindex" }],
  }),
  component: AdminLogin,
});

function AdminLogin() {
  const { signIn, signOut } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [passwordVisible, setPasswordVisible] = useState(false);
  const [resettingPassword, setResettingPassword] = useState(false);
  const [emailError, setEmailError] = useState("");
  const [passwordError, setPasswordError] = useState("");

  async function handleForgotPassword() {
    const address = email.trim();
    if (!address) {
      toast.error("Saisissez votre adresse e-mail.");
      return;
    }

    setResettingPassword(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(address, {
        redirectTo: `${window.location.origin}/admin/login`,
      });
      if (error) throw error;
      toast.success("Un e-mail de réinitialisation vous a été envoyé.");
    } catch (err) {
      console.error("admin password reset", err);
      const rawMessage = String((err as { message?: string })?.message ?? "").toLowerCase();
      const isRateLimited =
        (err as { status?: number })?.status === 429 ||
        rawMessage.includes("rate limit") ||
        rawMessage.includes("too many") ||
        rawMessage.includes("over_email_send_rate_limit");
      toast.error(
        isRateLimited
          ? "Trop de demandes d’e-mail ont été envoyées récemment. Attendez quelques minutes avant de réessayer."
          : "Impossible d’envoyer l’e-mail de réinitialisation pour le moment. Vérifiez l’adresse, puis réessayez.",
      );
    } finally {
      setResettingPassword(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const cleanEmail = email.trim();
    setEmailError(cleanEmail ? "" : "L'adresse e-mail est obligatoire.");
    setPasswordError(password ? "" : "Le mot de passe est obligatoire.");
    if (!cleanEmail || !password) {
      document.getElementById(!cleanEmail ? "admin-email" : "admin-password")?.focus();
      return;
    }

    setLoading(true);
    try {
      const { error } = await signIn(cleanEmail, password);
      if (error) {
        console.error("admin signIn error:", error);
        setPasswordError("Adresse e-mail ou mot de passe incorrect.");
        document.getElementById("admin-password")?.focus();
        setLoading(false);
        return;
      }

      // signIn() only proves valid credentials — this form is admin-only, so
      // reject non-admin accounts here instead of flashing "Connecté" and
      // relying on the /admin guard to kick them back out afterwards.
      const { data: sessionData } = await supabase.auth.getSession();
      const userId = sessionData.session?.user?.id;
      const { data: profile } = userId
        ? await supabase.from("profiles").select("role").eq("id", userId).maybeSingle()
        : { data: null };

      if (!profile || profile.role !== "admin") {
        await signOut();
        toast.error("Ce compte n'a pas accès à l'administration.");
        setLoading(false);
        return;
      }

      toast.success("Connecté");
      // navigate back to admin root (AuthContext signIn triggers profile load)
      window.location.href = "/admin";
    } catch (err) {
      console.error(err);
      toast.error("Erreur réseau");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="w-full max-w-md">
        <div className="rounded-xl border border-border bg-card p-6">
          <h1 className="text-2xl font-bold">Connexion administrateur</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Veuillez vous connecter avec un compte administrateur.
          </p>
          <form className="mt-6 space-y-4" onSubmit={handleSubmit} noValidate>
            <div className="space-y-2">
              <Label htmlFor="admin-email">Adresse e-mail</Label>
              <Input
                id="admin-email"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  if (emailError) setEmailError("");
                }}
                type="email"
                aria-invalid={Boolean(emailError)}
                aria-describedby={emailError ? "admin-email-error" : undefined}
                className={emailError ? "border-red-600 focus-visible:ring-red-600" : undefined}
              />
              {emailError ? (
                <p id="admin-email-error" className="text-sm text-red-600" role="alert">
                  {emailError}
                </p>
              ) : null}
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="admin-password">Mot de passe</Label>
                <button
                  type="button"
                  onClick={handleForgotPassword}
                  disabled={resettingPassword}
                  className="text-xs text-accent-strong hover:underline disabled:opacity-50"
                >
                  {resettingPassword ? "Envoi…" : "Mot de passe oublié ?"}
                </button>
              </div>
              <div className="relative mt-2">
                <Input
                  id="admin-password"
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    if (passwordError) setPasswordError("");
                  }}
                  type={passwordVisible ? "text" : "password"}
                  aria-invalid={Boolean(passwordError)}
                  aria-describedby={passwordError ? "admin-password-error" : undefined}
                  className={`${passwordError ? "border-red-600 focus-visible:ring-red-600 " : ""}pr-11`}
                />
                <button
                  type="button"
                  onClick={() => setPasswordVisible((visible) => !visible)}
                  aria-label={
                    passwordVisible ? "Masquer le mot de passe" : "Afficher le mot de passe"
                  }
                  className="absolute right-1 top-1/2 grid h-8 w-8 -translate-y-1/2 place-items-center rounded text-muted-foreground hover:text-foreground"
                >
                  {passwordVisible ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              {passwordError ? (
                <p id="admin-password-error" className="text-sm text-red-600" role="alert">
                  {passwordError}
                </p>
              ) : null}
            </div>
            <div className="flex items-center justify-between">
              <Button type="submit" variant="accent" disabled={loading}>
                {loading ? "Connexion…" : "Se connecter"}
              </Button>
              <a href="/" className="text-sm text-muted-foreground hover:text-accent-strong">
                Retour à la boutique
              </a>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
