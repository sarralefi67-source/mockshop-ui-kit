import { createFileRoute, Link } from "@tanstack/react-router";
import { CheckCircle2, Banknote, Truck } from "lucide-react";
import { StoreLayout } from "@/components/store/StoreLayout";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/commande-confirmee")({
  validateSearch: (search: Record<string, unknown>) => ({
    ref: typeof search["ref"] === "string" ? search["ref"] : "CMD-2026-0000",
  }),
  head: () => ({
    meta: [
      { title: "Commande confirmée — NexaStore" },
      { name: "description", content: "Votre commande a bien été enregistrée. Paiement à la livraison." },
      { property: "og:title", content: "Commande confirmée — NexaStore" },
      { property: "og:description", content: "Merci pour votre commande NexaStore." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: ConfirmationPage,
});

function ConfirmationPage() {
  const { ref } = Route.useSearch();

  return (
    <StoreLayout>
      <div className="container-page max-w-2xl py-16 text-center">
        <CheckCircle2 className="mx-auto h-16 w-16 text-success" />
        <h1 className="mt-5 text-3xl font-extrabold">Merci, votre commande est confirmée !</h1>
        <p className="mt-3 text-muted-foreground">
          Référence <span className="font-semibold text-foreground">{ref}</span>. Notre équipe vous
          appelle sous peu pour valider la livraison.
        </p>

        <div className="mt-8 grid gap-4 text-left sm:grid-cols-2">
          <div className="rounded-xl border border-border bg-card p-5">
            <Banknote className="h-5 w-5 text-accent-strong" />
            <p className="mt-2 font-semibold">Paiement à la livraison</p>
            <p className="text-sm text-muted-foreground">
              Préparez le montant exact en espèces à remettre au livreur.
            </p>
          </div>
          <div className="rounded-xl border border-border bg-card p-5">
            <Truck className="h-5 w-5 text-accent-strong" />
            <p className="mt-2 font-semibold">Livraison 24/48h</p>
            <p className="text-sm text-muted-foreground">
              Vous recevrez un SMS dès que le colis part de notre entrepôt.
            </p>
          </div>
        </div>

        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <Button variant="accent" asChild><Link to="/">Continuer mes achats</Link></Button>
          <Button variant="outline" asChild><Link to="/compte/commandes">Suivre mes commandes</Link></Button>
        </div>
      </div>
    </StoreLayout>
  );
}
