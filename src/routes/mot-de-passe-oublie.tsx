import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, type FormEvent } from "react";
import { ArrowLeft, Mail } from "lucide-react";
import { toast } from "sonner";
import { StoreLayout } from "@/components/store/StoreLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/lib/supabaseClient";

export const Route = createFileRoute("/mot-de-passe-oublie")({
  head: () => ({
    meta: [{ title: "Mot de passe oublié : Artisanat" }, { name: "robots", content: "noindex" }],
  }),
  component: ForgotPasswordPage,
});

function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [emailError, setEmailError] = useState("");

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setErrorMessage("");
    if (!email.trim()) {
      const message = "L'adresse e-mail est obligatoire.";
      setEmailError(message);
      document.getElementById("forgot-email")?.focus();
      return;
    }
    if (!/^\S+@\S+\.\S+$/.test(email.trim())) {
      const message = "Veuillez saisir une adresse e-mail valide.";
      setEmailError(message);
      document.getElementById("forgot-email")?.focus();
      return;
    }
    setEmailError("");
    setLoading(true);
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: `${window.location.origin}/reinitialiser-mot-de-passe`,
    });
    setLoading(false);
    if (error) {
      const rawMessage = String(error.message ?? "").toLowerCase();
      const isRateLimited =
        error.status === 429 ||
        rawMessage.includes("rate limit") ||
        rawMessage.includes("too many") ||
        rawMessage.includes("over_email_send_rate_limit");
      const message = isRateLimited
        ? "Trop de demandes d’e-mail ont été envoyées récemment. Attendez quelques minutes avant de réessayer."
        : "Impossible d’envoyer l’e-mail pour le moment. Vérifiez l’adresse saisie, puis réessayez.";
      setErrorMessage(message);
      toast.error(message);
      return;
    }
    setSent(true);
  };

  return (
    <StoreLayout>
      <div className="container-page flex min-h-[60vh] items-center justify-center py-12">
        <div className="w-full max-w-md rounded-xl border border-border bg-card p-6 shadow-sm">

          <h1 className="text-center text-3xl">Mot de passe oublié ?</h1>
          {sent ? (
            <p className="mt-4 text-sm leading-relaxed text-muted-foreground">
              Si un compte correspond à cette adresse, vous recevrez un lien pour réinitialiser
              votre mot de passe.
            </p>
          ) : (
            <form className="mt-6 space-y-4" onSubmit={handleSubmit} noValidate>
              {errorMessage && (
                <p
                  role="alert"
                  className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700"
                >
                  {errorMessage}
                </p>
              )}
              <div className="space-y-2">
                <Label htmlFor="forgot-email">Adresse e-mail</Label>
                <Input
                  id="forgot-email"
                  type="email"
                  autoComplete="email"
                  placeholder="saisissez votre adresse e-mail"
                  value={email}
                  onChange={(event) => { setEmail(event.target.value); setEmailError(""); }}
                  aria-required="true"
                  aria-invalid={Boolean(emailError)}
                  aria-describedby={emailError ? "forgot-email-error" : undefined}
                  className={emailError ? "border-red-600 focus-visible:ring-red-600" : undefined}
                />
                {emailError ? <p id="forgot-email-error" className="text-sm text-red-600" role="alert">{emailError}</p> : null}
              </div>
              <Button
                variant="accent"
                size="lg"
                type="submit"
                className="w-full"
                disabled={loading}
              >
                {loading ? "Envoi…" : "le lien"}
              </Button>
            </form>
          )}
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
