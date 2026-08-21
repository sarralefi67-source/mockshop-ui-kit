import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState, useRef } from "react";
import { toast } from "sonner";
// import HCaptcha from "@hcaptcha/react-hcaptcha"; // TODO: réactiver après achat du nom de domaine
import { useAuth } from "@/context/AuthContext";
import { StoreLayout } from "@/components/store/StoreLayout";
import { supabase } from "@/lib/supabaseClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";

export const Route = createFileRoute("/inscription")({
  head: () => ({
    meta: [
      { title: "Créer un compte : Artisanat" },
      { name: "description", content: "Créez votre compte Artisanat pour commander plus vite et suivre vos livraisons." },
      { property: "og:title", content: "Créer un compte : Artisanat" },
      { property: "og:description", content: "Inscription gratuite à l'espace client Artisanat." },
    ],
  }),
  component: RegisterPage,
});

function RegisterPage() {
  const [loading, setLoading] = useState(false);
  const captchaRef = useRef<any>(null);
  const [token, setToken] = useState<string | null>(null);
  const { signUp } = useAuth();
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
          onSubmit={async (e) => {
            e.preventDefault();
            const form = e.currentTarget as HTMLFormElement;
            const fd = new FormData(form);
            const email = String(fd.get("em") ?? "").trim();
            const password = String(fd.get("pw") ?? "");
            const first_name = String(fd.get("fn") ?? "").trim() || null;
            const last_name = String(fd.get("ln") ?? "").trim() || null;
            const phone = String(fd.get("ph") ?? "").trim() || null;
            const wantsNewsletter = form.querySelector<HTMLButtonElement>("#nl")?.getAttribute("data-state") === "checked";

            // TODO: réactiver la vérification hCaptcha après achat du nom de domaine
            // if (!token) {
            //   toast.error("Veuillez compléter le hCaptcha");
            //   return;
            // }

            setLoading(true);
            // le token hCaptcha est maintenant transmis en 4e argument à signUp
            const { error } = await signUp(email, password, { first_name, last_name, phone }, token ?? undefined);
            setLoading(false);
            if (error) {
              toast.error(error.message || "Erreur lors de la création du compte");
              // le token hCaptcha est à usage unique : on le réinitialise et on force
              // l'utilisateur à revalider le widget avant de réessayer
              // captchaRef.current?.resetCaptcha?.();
              setToken(null);
            } else {
              if (wantsNewsletter) {
                // best-effort: standalone table, not gated on the profile row existing yet
                supabase.from("newsletter_subscribers").insert({ email }).then(({ error: nlError }) => {
                  if (nlError) console.warn("newsletter subscribe on signup failed:", nlError);
                });
              }
              toast.success("Compte créé — vérifiez votre e-mail si confirmation requise.");
              navigate({ to: "/compte" });
            }
          }}
        >
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="fn">Prénom</Label>
              <Input id="fn" name="fn" required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="ln">Nom</Label>
              <Input id="ln" name="ln" required />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="em">E-mail</Label>
            <Input id="em" name="em" type="email" required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="ph">Téléphone</Label>
            <Input id="ph" name="ph" type="tel" required placeholder="+216 22 000 000" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="pw">Mot de passe</Label>
            <Input id="pw" name="pw" type="password" required />

          {/* TODO: réactiver le widget hCaptcha après achat du nom de domaine
          <div>
            <HCaptcha
              ref={captchaRef}
              sitekey={import.meta.env.VITE_HCAPTCHA_SITE_KEY ?? "VITE_HCAPTCHA_SITE_KEY"}
              onVerify={(t) => setToken(t)}
              onExpire={() => setToken(null)}
            />
          </div>
          */}
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