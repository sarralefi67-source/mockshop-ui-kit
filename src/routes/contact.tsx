import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Mail, MapPin, Phone } from "lucide-react";
import { toast } from "sonner";
import { StoreLayout } from "@/components/store/StoreLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

export const Route = createFileRoute("/contact")({
  head: () => ({
    meta: [
      { title: "Contact — NexaStore" },
      { name: "description", content: "Une question sur une commande ou un produit ? Notre équipe vous répond 6j/7." },
      { property: "og:title", content: "Contact — NexaStore" },
      { property: "og:description", content: "Contactez le service client NexaStore." },
    ],
  }),
  component: ContactPage,
});

function ContactPage() {
  const [sending, setSending] = useState(false);

  return (
    <StoreLayout>
      <div className="container-page grid gap-10 py-12 md:grid-cols-2">
        <div>
          <h1 className="text-3xl font-extrabold">Contactez-nous</h1>
          <p className="mt-3 text-muted-foreground">
            Notre service client est disponible du lundi au samedi, de 9h à 18h.
          </p>
          <ul className="mt-6 space-y-3 text-sm">
            <li className="flex items-center gap-3"><Phone className="h-4 w-4 text-accent-strong" /> +216 71 000 000</li>
            <li className="flex items-center gap-3"><Mail className="h-4 w-4 text-accent-strong" /> contact@nexastore.tn</li>
            <li className="flex items-center gap-3"><MapPin className="h-4 w-4 text-accent-strong" /> Avenue Habib Bourguiba, Tunis</li>
          </ul>
        </div>

        <form
          className="space-y-4 rounded-xl border border-border bg-card p-6"
          onSubmit={(e) => {
            e.preventDefault();
            setSending(true);
            setTimeout(() => {
              setSending(false);
              toast.success("Message envoyé (démo) — nous vous répondons sous 24h.");
            }, 700);
          }}
        >
          <div className="space-y-2">
            <Label htmlFor="c-name">Nom complet</Label>
            <Input id="c-name" required placeholder="Sarra Lefi" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="c-mail">E-mail</Label>
            <Input id="c-mail" type="email" required placeholder="vous@example.tn" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="c-msg">Message</Label>
            <Textarea id="c-msg" required rows={5} placeholder="Votre message…" />
          </div>
          <Button variant="accent" type="submit" className="w-full" disabled={sending}>
            {sending ? "Envoi…" : "Envoyer le message"}
          </Button>
        </form>
      </div>
    </StoreLayout>
  );
}
