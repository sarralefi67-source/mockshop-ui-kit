import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState, type FormEvent } from "react";
import { BadgePercent, Banknote, ShoppingBag } from "lucide-react";
import { toast } from "sonner";
import { StoreLayout } from "@/components/store/StoreLayout";
import { useStore } from "@/context/StoreContext";
import { GOVERNORATES } from "@/data/governorates";
import { formatPrice } from "@/lib/placeholder";
import { supabase } from "@/lib/supabaseClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";

export const Route = createFileRoute("/checkout")({
  head: () => ({
    meta: [
      { title: "Commande — Paiement à la livraison | NexaStore" },
      { name: "description", content: "Finalisez votre commande NexaStore : adresse de livraison, code promo et paiement à la livraison." },
      { property: "og:title", content: "Commande — NexaStore" },
      { property: "og:description", content: "Paiement à la livraison partout en Tunisie." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: CheckoutPage,
});

function CheckoutPage() {
  const { items, subtotal, coupon, applyCoupon, removeCoupon, clearCart } = useStore();
  const [code, setCode] = useState("");
  const [governorate, setGovernorate] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [shippingRates, setShippingRates] = useState<Record<string, number>>({});
  const navigate = useNavigate();

  useEffect(() => {
    let mounted = true;
    async function loadShippingRates() {
      try {
        const { data, error } = await supabase
          .from("shipping_rates")
          .select("governorate, price")
          .eq("is_active", true);
        if (error) throw error;
        if (!mounted) return;
        const map: Record<string, number> = {};
        (data ?? []).forEach((rate: { governorate: string; price: number | string | null }) => {
          if (rate.governorate) {
            map[rate.governorate] = Number(rate.price ?? 0);
          }
        });
        setShippingRates(map);
      } catch (err) {
        console.error("loadShippingRates", err);
        toast.error("Impossible de charger les frais de livraison.");
      }
    }

    loadShippingRates();
    return () => { mounted = false; };
  }, []);

  const availableGovernorates = useMemo(
    () => GOVERNORATES.filter((g) => shippingRates[g] !== undefined && Number(shippingRates[g]) >= 0),
    [shippingRates],
  );

  const shipping = items.length === 0 ? 0 : Number(shippingRates[governorate] ?? 0);
  const total = Math.max(0, subtotal - (coupon?.discount ?? 0)) + shipping;

  const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!governorate) {
      toast.error("Veuillez choisir un gouvernorat.");
      return;
    }
    if (!shippingRates[governorate]) {
      toast.error("La livraison n'est pas disponible pour ce gouvernorat.");
      return;
    }
    setSubmitting(true);
    setTimeout(() => {
      const reference = `CMD-2026-${Math.floor(2000 + Math.random() * 8000)}`;
      clearCart();
      setSubmitting(false);
      navigate({ to: "/commande-confirmee", search: { ref: reference } });
    }, 900);
  };

  if (items.length === 0) {
    return (
      <StoreLayout>
        <div className="container-page py-24 text-center">
          <ShoppingBag className="mx-auto h-10 w-10 text-muted-foreground" />
          <h1 className="mt-4 text-2xl font-bold">Votre panier est vide</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Ajoutez des articles avant de passer commande.
          </p>
          <Button variant="accent" className="mt-6" asChild>
            <Link to="/">Retour à la boutique</Link>
          </Button>
        </div>
      </StoreLayout>
    );
  }

  return (
    <StoreLayout>
      <div className="container-page py-10">
        <h1 className="text-3xl font-extrabold">Finaliser ma commande</h1>

        <form onSubmit={handleSubmit} className="mt-8 grid gap-8 lg:grid-cols-[1fr_380px]">
          <div className="space-y-6">
            <section className="rounded-xl border border-border bg-card p-6">
              <h2 className="text-lg font-bold">Coordonnées</h2>
              <div className="mt-4 grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="prenom">Prénom</Label>
                  <Input id="prenom" required placeholder="Sarra" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="nom">Nom</Label>
                  <Input id="nom" required placeholder="Lefi" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="tel">Téléphone</Label>
                  <Input id="tel" required type="tel" placeholder="+216 22 000 000" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="mail">E-mail (optionnel)</Label>
                  <Input id="mail" type="email" placeholder="vous@example.tn" />
                </div>
              </div>
            </section>

            <section className="rounded-xl border border-border bg-card p-6">
              <h2 className="text-lg font-bold">Adresse de livraison</h2>
              <div className="mt-4 grid gap-4 sm:grid-cols-2">
                <div className="space-y-2 sm:col-span-2">
                  <Label htmlFor="adresse">Adresse</Label>
                  <Input id="adresse" required placeholder="12 rue de la Liberté, Apt 4" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="ville">Ville</Label>
                  <Input id="ville" required placeholder="Le Bardo" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="gov">Gouvernorat</Label>
                  <Select value={governorate} onValueChange={setGovernorate}>
                    <SelectTrigger id="gov"><SelectValue placeholder={availableGovernorates.length ? "Choisir…" : "Aucun gouvernorat disponible"} /></SelectTrigger>
                    <SelectContent className="max-h-72">
                      {availableGovernorates.map((g) => (
                        <SelectItem key={g} value={g}>{g}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="cp">Code postal</Label>
                  <Input id="cp" placeholder="2000" />
                </div>
                <div className="space-y-2 sm:col-span-2">
                  <Label htmlFor="note">Note pour le livreur (optionnel)</Label>
                  <Textarea id="note" rows={3} placeholder="Étage, point de repère…" />
                </div>
              </div>
            </section>

            <section className="rounded-xl border border-border bg-card p-6">
              <h2 className="text-lg font-bold">Mode de paiement</h2>
              <div className="mt-4 flex items-start gap-3 rounded-lg border-2 border-accent-strong bg-accent-strong/5 p-4">
                <Banknote className="mt-0.5 h-5 w-5 text-accent-strong" />
                <div>
                  <p className="font-semibold">Paiement à la livraison (COD)</p>
                  <p className="text-sm text-muted-foreground">
                    Vous réglez en espèces au livreur à la réception de votre colis. Aucun paiement
                    en ligne n'est demandé.
                  </p>
                </div>
              </div>
              <div className="mt-4 flex items-start gap-2">
                <Checkbox id="cgv" required />
                <Label htmlFor="cgv" className="text-sm font-normal leading-snug">
                  J'accepte les conditions générales de vente et confirme mes coordonnées.
                </Label>
              </div>
            </section>
          </div>

          {/* Récap */}
          <aside className="h-fit lg:sticky lg:top-32">
            <div className="rounded-xl border border-border bg-card p-6">
              <h2 className="text-lg font-bold">Récapitulatif</h2>
              <ul className="mt-4 space-y-3">
                {items.map((item) => (
                  <li key={item.key} className="flex gap-3">
                    <img src={item.image} alt="" className="h-14 w-14 rounded-md border border-border object-cover" />
                    <div className="min-w-0 flex-1">
                      <p className="line-clamp-2 text-sm font-medium">{item.name}</p>
                      {item.variant_label && (
                        <p className="text-xs text-muted-foreground">{item.variant_label}</p>
                      )}
                      <p className="text-xs text-muted-foreground">Qté {item.quantity}</p>
                    </div>
                    <span className="text-sm font-semibold">
                      {formatPrice(item.unit_price * item.quantity)}
                    </span>
                  </li>
                ))}
              </ul>

              <Separator className="my-5" />

              <div className="space-y-2">
                <Label htmlFor="coupon" className="flex items-center gap-2 text-sm">
                  <BadgePercent className="h-4 w-4 text-accent-strong" /> Code promo
                </Label>
                {coupon ? (
                  <div className="flex items-center justify-between rounded-md bg-accent-strong/10 px-3 py-2 text-sm">
                    <span className="font-semibold text-accent-strong">{coupon.code}</span>
                    <button type="button" onClick={removeCoupon} className="text-xs text-muted-foreground hover:text-foreground">
                      Retirer
                    </button>
                  </div>
                ) : (
                  <div className="flex gap-2">
                    <Input
                      id="coupon"
                      value={code}
                      onChange={(e) => setCode(e.target.value)}
                      placeholder="BIENVENUE10"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => {
                        const res = applyCoupon(code);
                        res.ok ? toast.success(res.message) : toast.error(res.message);
                        if (res.ok) setCode("");
                      }}
                    >
                      Appliquer
                    </Button>
                  </div>
                )}
              </div>

              <dl className="mt-5 space-y-2 text-sm">
                <div className="flex justify-between">
                  <dt className="text-muted-foreground">Sous-total</dt>
                  <dd className="font-medium">{formatPrice(subtotal)}</dd>
                </div>
                {coupon && (
                  <div className="flex justify-between text-accent-strong">
                    <dt>Réduction</dt>
                    <dd>-{formatPrice(coupon.discount)}</dd>
                  </div>
                )}
                <div className="flex justify-between">
                  <dt className="text-muted-foreground">Livraison</dt>
                  <dd className="font-medium">{formatPrice(shipping)}</dd>
                </div>
                <Separator />
                <div className="flex justify-between text-base">
                  <dt className="font-semibold">Total à payer à la livraison</dt>
                  <dd className="font-bold text-accent-strong">{formatPrice(total)}</dd>
                </div>
              </dl>

              <Button variant="accent" size="lg" type="submit" className="mt-5 w-full" disabled={submitting}>
                {submitting ? "Traitement…" : "Confirmer la commande"}
              </Button>
              <p className="mt-3 text-center text-xs text-muted-foreground">
                Démo : aucune commande réelle n'est enregistrée.
              </p>
            </div>
          </aside>
        </form>
      </div>
    </StoreLayout>
  );
}
