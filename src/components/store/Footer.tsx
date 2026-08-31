import { Link } from "@tanstack/react-router";
import { Facebook, Instagram, Mail, MapPin, Phone, Truck, ShieldCheck, RotateCcw } from "lucide-react";
import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { supabase } from "@/lib/supabaseClient";
import { useSiteSettings } from "@/context/SiteSettingsContext";

function TikTokIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true">
      <path d="M16.5 3c.4 2.2 2 3.9 4.2 4.2v2.9c-1.5 0-2.9-.4-4.2-1.2v6.7a5.9 5.9 0 1 1-5.1-5.8v2.9a3 3 0 1 0 2.2 2.9V3h2.9Z" />
    </svg>
  );
}

function WhatsAppIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true">
      <path d="M12 2a10 10 0 0 0-8.6 15.1L2 22l5-1.3A10 10 0 1 0 12 2Zm0 18.2c-1.6 0-3.1-.4-4.4-1.2l-.3-.2-3 .8.8-2.9-.2-.3A8.2 8.2 0 1 1 12 20.2Zm4.5-6.1c-.2-.1-1.5-.7-1.7-.8-.2-.1-.4-.1-.6.1-.2.2-.6.8-.8 1-.1.2-.3.2-.5.1-.2-.1-1-.4-1.9-1.2-.7-.6-1.2-1.4-1.3-1.6-.1-.2 0-.4.1-.5.1-.1.2-.3.4-.4.1-.1.2-.2.2-.4.1-.1 0-.3 0-.4-.1-.1-.6-1.4-.8-1.9-.2-.5-.4-.4-.6-.4h-.5c-.2 0-.4.1-.6.3-.2.2-.8.8-.8 1.9 0 1.1.8 2.2.9 2.4.1.2 1.6 2.5 3.9 3.5.5.2 1 .4 1.3.5.5.2 1 .1 1.4.1.4-.1 1.5-.6 1.7-1.2.2-.6.2-1.1.1-1.2-.1-.1-.2-.2-.4-.3Z" />
    </svg>
  );
}

export function Footer() {
  const [email, setEmail] = useState("");
  const { settings } = useSiteSettings();

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

      <div className="container-page grid gap-4 py-12 md:grid-cols-[1.35fr_1fr_1.2fr_1fr]">
        <div>
          <span className="font-display text-2xl font-semibold tracking-tight text-deep-foreground">
            Arti<span className="text-ocre">sanat</span>
          </span>
          <p className="mt-3 text-sm text-deep-foreground/70">
            Découvrez l’artisanat tunisien à travers des créations authentiques, sélectionnées avec
            soin et livrées chez vous partout en Tunisie.
          </p>
          <ul className="mt-4 space-y-2 text-sm text-deep-foreground/70">
            {settings?.phone && (
              <li className="flex items-center gap-2">
                <Phone className="h-4 w-4" />
                <a href={`tel:${settings.phone.replace(/\s+/g, "")}`} className="transition-colors hover:text-ocre">
                  {settings.phone}
                </a>
              </li>
            )}
            {settings?.email && (
              <li className="flex items-center gap-2">
                <Mail className="h-4 w-4" />
                <a href={`mailto:${settings.email}`} className="transition-colors hover:text-ocre">
                  {settings.email}
                </a>
              </li>
            )}
            {settings?.address && (
              <li className="flex items-center gap-2"><MapPin className="h-4 w-4" /> {settings.address}</li>
            )}
          </ul>
        </div>

     

        <div>
          <h3 className="relative pb-3 font-display text-base font-semibold text-deep-foreground after:absolute after:bottom-0 after:left-0 after:h-0.5 after:w-10 after:bg-ocre">Informations</h3>
          <ul className="mt-4 space-y-2">
            <li><Link to="/" className="text-sm text-deep-foreground/70 transition-colors hover:text-ocre">Accueil</Link></li>
            <li><Link to="/promotions" className="text-sm text-deep-foreground/70 transition-colors hover:text-ocre">Promotions</Link></li>
            <li><Link to="/inscription" className="text-sm text-deep-foreground/70 transition-colors hover:text-ocre">Suivre ma commande</Link></li>
          </ul>
        </div>

        <div>
          <h3 className="relative pb-3 font-display text-base font-semibold text-deep-foreground after:absolute after:bottom-0 after:left-0 after:h-0.5 after:w-10 after:bg-ocre">Obtenir de l'aide</h3>
          <ul className="mt-4 space-y-2">
            {/* <li><Link to="/pages/$slug" params={{ slug: "cgv" }} className="text-sm text-deep-foreground/70 transition-colors hover:text-ocre">CGV</Link></li>
            <li><Link to="/pages/$slug" params={{ slug: "cgu" }} className="text-sm text-deep-foreground/70 transition-colors hover:text-ocre">CGU</Link></li>
            <li><Link to="/pages/$slug" params={{ slug: "mentions-legales" }} className="text-sm text-deep-foreground/70 transition-colors hover:text-ocre">Mentions légales</Link></li> */}
            <li><Link to="/pages/$slug" params={{ slug: "confidentialite" }} className="text-sm text-deep-foreground/70 transition-colors hover:text-ocre">Politique de confidentialité</Link></li>
            <li><Link to="/pages/$slug" params={{ slug: "remboursement" }} className="text-sm text-deep-foreground/70 transition-colors hover:text-ocre">Politique de remboursement</Link></li>
            {/* <li><Link to="/pages/$slug" params={{ slug: "livraison" }} className="text-sm text-deep-foreground/70 transition-colors hover:text-ocre">Livraison & retours</Link></li> */}
            {/* <li><Link to="/contact" className="text-sm text-deep-foreground/70 transition-colors hover:text-ocre">Contact</Link></li>
            <li><Link to="/admin" className="text-sm text-deep-foreground/70 transition-colors hover:text-ocre">Back-office</Link></li> */}
          </ul>
        </div>

        <div>
          <h3 className="relative pb-3 font-display text-base font-semibold text-deep-foreground after:absolute after:bottom-0 after:left-0 after:h-0.5 after:w-10 after:bg-ocre">Suivez-nous</h3>
          <div className="mt-4 flex items-center gap-3">
            {[
              { href: settings?.instagram_url, label: "Instagram", Icon: Instagram },
              { href: settings?.facebook_url, label: "Facebook", Icon: Facebook },
              { href: settings?.tiktok_url, label: "TikTok", Icon: TikTokIcon },
              { href: settings?.whatsapp_url, label: "WhatsApp", Icon: WhatsAppIcon },
            ].map(({ href, label, Icon }) =>
              href?.trim() ? (
                <a
                  key={label}
                  href={href.trim()}
                  target="_blank"
                  rel="noreferrer"
                  aria-label={label}
                  className="grid h-10 w-10 place-items-center rounded-full bg-deep-foreground/10 text-deep-foreground/70 transition-colors hover:bg-ocre hover:text-deep"
                >
                  <Icon className="h-4 w-4" />
                </a>
              ) : null,
            )}
          </div>
        </div>

        {/* <div>
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
        </div> */}
      </div>

      <div className="border-t border-deep-foreground/15 py-5">
        <p className="container-page text-center text-xs text-deep-foreground/60">
          © 2026 Artisanat 
        </p>
      </div>
    </footer>
  );
}
