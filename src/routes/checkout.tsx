import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { BadgePercent, Banknote, ShoppingBag } from "lucide-react";
import { toast } from "sonner";
import { StoreLayout } from "@/components/store/StoreLayout";
import { useStore } from "@/context/StoreContext";
import { useAuth } from "@/context/AuthContext";
import { GOVERNORATES } from "@/data/governorates";
import { formatPrice, formatShipping } from "@/lib/placeholder";
import { useSiteSettings } from "@/context/SiteSettingsContext";
import { supabase } from "@/lib/supabaseClient";
import type { Address } from "@/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";
import { Plus } from "lucide-react";
import { randomUUID } from "@/lib/uid";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";

const STOCK_PREFIX = "Insufficient stock for ";

/** Messages levés par public.create_order — voir database/create-order-rpc.sql. */
const ORDER_ERRORS: Record<string, string> = {
  "Authentication required": "Vous devez être connecté pour commander.",
  "Cart is empty": "Votre panier est vide.",
  "Invalid quantity": "La quantité d'un article de votre panier est invalide.",
  "Shipping not available for this governorate":
    "Aucun tarif de livraison n'est configuré pour ce gouvernorat.",
  "Product not available": "Un produit de votre panier n'est plus disponible à la vente.",
  "Variant not available": "Une variante de votre panier n'est plus disponible.",
  "Invalid or expired coupon": "Code promo invalide ou expiré.",
  "Order does not meet the minimum amount for this coupon":
    "Le montant minimum requis par ce code promo n'est pas atteint.",
  "Coupon usage limit reached": "Ce code promo a atteint sa limite d'utilisation.",
  "You have already used this coupon": "Vous avez déjà utilisé ce code promo.",
};

function orderErrorMessage(error: any): string {
  const raw = String(error?.message ?? "");
  if (raw.includes(STOCK_PREFIX)) {
    return `Stock insuffisant pour ${raw.slice(raw.indexOf(STOCK_PREFIX) + STOCK_PREFIX.length)}.`;
  }
  for (const [needle, message] of Object.entries(ORDER_ERRORS)) {
    if (raw.includes(needle)) return message;
  }
  return raw || "Impossible de valider la commande. Réessayez.";
}

export const Route = createFileRoute("/checkout")({
  head: () => ({
    meta: [
      { title: "Commande — Paiement à la livraison | Artisanat" },
      { name: "description", content: "Finalisez votre commande Artisanat : adresse de livraison, code promo et paiement à la livraison." },
      { property: "og:title", content: "Commande — Artisanat" },
      { property: "og:description", content: "Paiement à la livraison partout en Tunisie." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: CheckoutPage,
});

function CheckoutPage() {
  const { items, subtotal, coupon, applyCoupon, removeCoupon, clearCart } = useStore();
  const { user, profile, loading: authLoading, openAuth } = useAuth();
  const { settings } = useSiteSettings();
  const [code, setCode] = useState("");
  const [governorate, setGovernorate] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [applyingCoupon, setApplyingCoupon] = useState(false);

  const navigate = useNavigate();
  const idempotencyKey = useRef(randomUUID());

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [addressLine, setAddressLine] = useState("");
  const [city, setCity] = useState("");
  const [postalCode, setPostalCode] = useState("");
  const [note, setNote] = useState("");

  const [savedAddresses, setSavedAddresses] = useState<Address[]>([]);
  const [selectedAddressId, setSelectedAddressId] = useState<string | null>(null);

  const applyAddress = (a: Address) => {
    setPhone(a.phone);
    setAddressLine(a.line1);
    setCity(a.city);
    setPostalCode(a.postal_code);
    setGovernorate(a.governorate);
  };

  const startNewAddress = () => {
    setSelectedAddressId(null);
    setAddressLine("");
    setCity("");
    setPostalCode("");
    setGovernorate("");
  };

  useEffect(() => {
    if (profile) {
      setFirstName((v) => v || profile.first_name || "");
      setLastName((v) => v || profile.last_name || "");
      setEmail((v) => v || profile.email || "");
    }
  }, [profile]);

  // Smart checkout: pre-fill from the customer's saved address book (default
  // first, else the most recently added) so a returning customer never has
  // to retype it. First-time customers just get an empty, editable form —
  // whatever they type there gets saved to their address book on order
  // success (see handleSubmit), so next time it's here too.
  useEffect(() => {
    if (!user) return;
    let mounted = true;
    supabase
      .from("addresses")
      .select("*")
      .eq("user_id", user.id)
      .order("is_default", { ascending: false })
      .then(({ data, error }) => {
        if (error) {
          console.error("load saved addresses", error);
          return;
        }
        if (!mounted) return;
        const list: Address[] = (data ?? []).map((row) => ({
          id: row.id,
          label: row.label,
          full_name: row.full_name ?? "",
          phone: row.phone ?? "",
          line1: row.line1 ?? "",
          city: row.city ?? "",
          governorate: row.governorate ?? "",
          postal_code: row.postal_code ?? "",
          is_default: row.is_default ?? false,
        }));
        setSavedAddresses(list);
        if (list.length > 0) {
          const preferred = list.find((a) => a.is_default) ?? list[0]!;
          applyAddress(preferred);
          setSelectedAddressId(preferred.id);
        }
      });
    return () => {
      mounted = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  // Compte requis pour commander : on ouvre la modale sans quitter le panier,
  // et on revient ici une fois connecté.
  useEffect(() => {
    if (!authLoading && !user) {
      openAuth("signin", "/checkout");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authLoading, user]);

  // Tarif unique pour toute la Tunisie : tous les gouvernorats sont livrables,
  // il n'y a plus de bareme a charger ni de destination a exclure.
  const availableGovernorates = GOVERNORATES;

  const shipping = items.length === 0 ? 0 : Number(settings?.shipping_price ?? 0);
  const total = Math.max(0, subtotal - (coupon?.discount ?? 0)) + shipping;

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!governorate) {
      toast.error("Veuillez choisir un gouvernorat.");
      return;
    }
    if (!phone.trim() || !addressLine.trim() || !city.trim()) {
      toast.error("Veuillez compléter vos coordonnées et votre adresse.");
      return;
    }

    setSubmitting(true);
    try {
      const { data, error } = await supabase.rpc("create_order", {
        p_items: items.map((item) => ({
          product_id: item.product_id,
          variant_id: item.variant_id,
          variant_label: item.variant_label,
          quantity: item.quantity,
        })),
        p_governorate: governorate,
        p_shipping_address: {
          full_name: `${firstName} ${lastName}`.trim(),
          phone: phone.trim(),
          line1: addressLine.trim(),
          city: city.trim(),
          governorate,
          postal_code: postalCode.trim() || null,
        },
        p_coupon_code: coupon?.code ?? null,
        p_notes: note.trim() || null,
        p_idempotency_key: idempotencyKey.current,
      });

      if (error) throw error;
      const result = data as { id: string; order_number: string; total: number };

      // first time this address is used (not picked from the saved book):
      // persist it so it's pre-filled on the next order too
      if (!selectedAddressId) {
        supabase
          .from("addresses")
          .insert({
            user_id: user!.id,
            label: savedAddresses.length === 0 ? "Domicile" : "Adresse",
            full_name: `${firstName} ${lastName}`.trim(),
            phone: phone.trim(),
            line1: addressLine.trim(),
            city: city.trim(),
            governorate,
            postal_code: postalCode.trim() || null,
            is_default: savedAddresses.length === 0,
          })
          .then(({ error: addrError }) => {
            if (addrError) console.warn("save address to book failed", addrError);
          });
      }

      clearCart();
      navigate({ to: "/commande-confirmee", search: { ref: result.order_number } });
    } catch (err: any) {
      // Une PostgrestError range l'essentiel dans details/hint/code : sans les
      // journaliser, un 500 ne laisse qu'un « create_order » opaque en console.
      console.error("create_order", {
        message: err?.message,
        details: err?.details,
        hint: err?.hint,
        code: err?.code,
        error: err,
      });
      toast.error(orderErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  };

  if (authLoading || !user) {
    return (
      <StoreLayout>
        <div className="container-page py-24 text-center text-muted-foreground">Redirection…</div>
      </StoreLayout>
    );
  }

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
        <h1 className="page-title text-3xl">Finaliser ma commande</h1>

        <form onSubmit={handleSubmit} className="mt-8 grid gap-8 lg:grid-cols-[1fr_380px]">
          <div className="space-y-6">
            <section className="rounded-xl border border-border bg-card p-6">
              <h2 className="text-lg font-bold">Coordonnées</h2>
              <div className="mt-4 grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="prenom">Prénom</Label>
                  <Input id="prenom" required placeholder="Sarra" value={firstName} onChange={(e) => setFirstName(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="nom">Nom</Label>
                  <Input id="nom" required placeholder="Lefi" value={lastName} onChange={(e) => setLastName(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="tel">Téléphone</Label>
                  <Input id="tel" required type="tel" placeholder="+216 22 000 000" value={phone} onChange={(e) => setPhone(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="mail">E-mail (optionnel)</Label>
                  <Input id="mail" type="email" placeholder="vous@example.tn" value={email} onChange={(e) => setEmail(e.target.value)} />
                </div>
              </div>
            </section>

            <section className="rounded-xl border border-border bg-card p-6">
              <h2 className="text-lg font-bold">Adresse de livraison</h2>

              {savedAddresses.length > 0 && (
                <div className="mt-4 flex flex-wrap gap-2">
                  {savedAddresses.map((a) => (
                    <button
                      key={a.id}
                      type="button"
                      onClick={() => {
                        applyAddress(a);
                        setSelectedAddressId(a.id);
                      }}
                      className={cn(
                        "rounded-full border px-3 py-1.5 text-xs font-medium transition-colors",
                        selectedAddressId === a.id
                          ? "border-accent-strong bg-accent-strong/10 text-accent-strong"
                          : "border-border text-muted-foreground hover:border-muted-foreground hover:text-foreground",
                      )}
                    >
                      {a.label}
                    </button>
                  ))}
                  <button
                    type="button"
                    onClick={startNewAddress}
                    className={cn(
                      "inline-flex items-center gap-1 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors",
                      selectedAddressId === null
                        ? "border-accent-strong bg-accent-strong/10 text-accent-strong"
                        : "border-border text-muted-foreground hover:border-muted-foreground hover:text-foreground",
                    )}
                  >
                    <Plus className="h-3 w-3" /> Nouvelle adresse
                  </button>
                </div>
              )}

              <div className="mt-4 grid gap-4 sm:grid-cols-2">
                <div className="space-y-2 sm:col-span-2">
                  <Label htmlFor="adresse">Adresse</Label>
                  <Input id="adresse" required placeholder="12 rue de la Liberté, Apt 4" value={addressLine} onChange={(e) => setAddressLine(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="ville">Ville</Label>
                  <Input id="ville" required placeholder="Le Bardo" value={city} onChange={(e) => setCity(e.target.value)} />
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
                  <Input id="cp" placeholder="2000" value={postalCode} onChange={(e) => setPostalCode(e.target.value)} />
                </div>
                <div className="space-y-2 sm:col-span-2">
                  <Label htmlFor="note">Note pour le livreur (optionnel)</Label>
                  <Textarea id="note" rows={3} placeholder="Étage, point de repère…" value={note} onChange={(e) => setNote(e.target.value)} />
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
                    Vous réglez en espèces au livreur à la réception de votre colis.
                  </p>
                </div>
              </div>
              {/* <div className="mt-4 flex items-start gap-2">
                <Checkbox id="cgv" required />
                <Label htmlFor="cgv" className="text-sm font-normal leading-snug">
                  J'accepte les conditions générales de vente et confirme mes coordonnées.
                </Label>
              </div> */}
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
                      disabled={applyingCoupon || !code.trim()}
                      onClick={async () => {
                        setApplyingCoupon(true);
                        try {
                          const res = await applyCoupon(code);
                          if (res.ok) {
                            toast.success(res.message);
                            setCode("");
                          } else {
                            toast.error(res.message);
                          }
                        } finally {
                          setApplyingCoupon(false);
                        }
                      }}
                    >
                      {applyingCoupon ? "…" : "Appliquer"}
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
                  <dd className={`font-medium ${shipping > 0 ? "" : "text-emerald-600"}`}>
                    {formatShipping(shipping)}
                  </dd>
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
            </div>
          </aside>
        </form>
      </div>
    </StoreLayout>
  );
}
