import { Link } from "@tanstack/react-router";
import { Mail, MapPin, Phone, Truck, ShieldCheck, RotateCcw } from "lucide-react";
import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { supabase } from "@/lib/supabaseClient";

export function Footer() {
  const [email, setEmail] = useState("");

  return (
    <footer className="weave-texture mt-16 bg-deep text-deep-foreground/80">
      <div className="container-page grid gap-6 border-b border-deep-foreground/15 py-8 sm:grid-cols-3">
        {[
          { icon: Truck, title: "Livraison 24/48h", text: "Partout en Tunisie, 7 DT" },
          { icon: ShieldCheck, title: "Paiement à la livraison", text: "Payez à la réception" },
          { icon: RotateCcw, title: "Retour sous 7 jours", text: "Satisfait ou remboursé" },
        ].map(({ icon: Icon, title, text }) => (
          <div key={title} className="flex items-center gap-3">
            <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-deep-foreground/10 text-ocre">
              <Icon className="h-5 w-5" />
            </span>
            <span>
              <span className="block font-display text-sm font-semibold text-deep-foreground">{title}</span>
              <span className="block text-xs text-deep-foreground/60">{text}</span>
            </span>
          </div>
        ))}
      </div>

      <div className="container-page grid gap-8 py-12 md:grid-cols-3">
        <div>
          <span className="font-display text-2xl font-semibold tracking-tight text-deep-foreground">
            Arti<span className="text-ocre">sanat</span>
          </span>
          <p className="mt-3 text-sm text-deep-foreground/70">
            Votre boutique high-tech et maison en Tunisie. Des produits sélectionnés, livrés chez
            vous, payés à la livraison.
          </p>
          <ul className="mt-4 space-y-2 text-sm text-deep-foreground/70">
            <li className="flex items-center gap-2"><Phone className="h-4 w-4" /> +216 71 000 000</li>
            <li className="flex items-center gap-2"><Mail className="h-4 w-4" /> contact@Artisanat.tn</li>
            <li className="flex items-center gap-2"><MapPin className="h-4 w-4" /> Avenue Habib Bourguiba, Tunis</li>
          </ul>
        </div>

     

        <div>
          <h3 className="relative pb-3 font-display text-base font-semibold text-deep-foreground after:absolute after:bottom-0 after:left-0 after:h-0.5 after:w-10 after:bg-ocre">Informations</h3>
          <ul className="mt-4 space-y-2">
            <li><Link to="/pages/$slug" params={{ slug: "cgv" }} className="text-sm text-deep-foreground/70 transition-colors hover:text-ocre">CGV</Link></li>
            <li><Link to="/pages/$slug" params={{ slug: "cgu" }} className="text-sm text-deep-foreground/70 transition-colors hover:text-ocre">CGU</Link></li>
            <li><Link to="/pages/$slug" params={{ slug: "mentions-legales" }} className="text-sm text-deep-foreground/70 transition-colors hover:text-ocre">Mentions légales</Link></li>
            <li><Link to="/pages/$slug" params={{ slug: "livraison" }} className="text-sm text-deep-foreground/70 transition-colors hover:text-ocre">Livraison & retours</Link></li>
            <li><Link to="/contact" className="text-sm text-deep-foreground/70 transition-colors hover:text-ocre">Contact</Link></li>
            <li><Link to="/admin" className="text-sm text-deep-foreground/70 transition-colors hover:text-ocre">Back-office</Link></li>
          </ul>
        </div>

        <div>
          <h3 className="relative pb-3 font-display text-base font-semibold text-deep-foreground after:absolute after:bottom-0 after:left-0 after:h-0.5 after:w-10 after:bg-ocre">Newsletter</h3>
          <p className="mt-4 text-sm text-deep-foreground/70">
            Recevez les promos et nouveautés une fois par semaine.
          </p>
          <form
            className="mt-4 flex gap-2"
            onSubmit={async (e) => {
              e.preventDefault();
              if (!email) return;
              try {
                const { error } = await supabase.from("newsletter_subscribers").insert({ email }).select();
                if (error) {
                  // handle duplicate gracefully
                  if ((error as any).code === "23505") {
                    toast.success("Vous êtes déjà inscrit(e) à la newsletter.");
                  } else {
                    console.error("newsletter insert error:", error);
                    toast.error("Impossible de vous inscrire pour le moment.");
                  }
                } else {
                  toast.success("Inscription à la newsletter enregistrée.");
                  setEmail("");
                }
              } catch (err) {
                console.error(err);
                toast.error("Erreur réseau.");
              }
            }}
          >
            <Input
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              type="email"
              required
              placeholder="Votre e-mail"
              aria-label="E-mail"
              className="h-11 rounded-md border-deep-foreground/20 bg-deep-foreground/10 text-deep-foreground placeholder:text-deep-foreground/50"
            />
            <Button variant="accent" type="submit" className="h-11 px-6 font-bold uppercase tracking-[0.08em]">
              OK
            </Button>
          </form>
        </div>
      </div>

      <div className="border-t border-deep-foreground/15 py-5">
        <p className="container-page text-center text-xs text-deep-foreground/60">
          © 2026 Artisanat — Paiement à la livraison uniquement.
        </p>
      </div>
    </footer>
  );
}
