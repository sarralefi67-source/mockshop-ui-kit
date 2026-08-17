import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { currentCustomer } from "@/data/orders";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";

export const Route = createFileRoute("/compte/")({
  component: AccountInfo,
});

function AccountInfo() {
  const [newsletter, setNewsletter] = useState(currentCustomer.newsletter);
  const [saving, setSaving] = useState(false);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Informations personnelles</h1>
        <p className="text-sm text-muted-foreground">Modifiez vos coordonnées et vos préférences.</p>
      </div>

      <form
        className="rounded-xl border border-border bg-card p-6"
        onSubmit={(e) => {
          e.preventDefault();
          setSaving(true);
          setTimeout(() => { setSaving(false); toast.success("Informations enregistrées (démo)."); }, 600);
        }}
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="fn">Prénom</Label>
            <Input id="fn" defaultValue={currentCustomer.first_name} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="ln">Nom</Label>
            <Input id="ln" defaultValue={currentCustomer.last_name} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="em">E-mail</Label>
            <Input id="em" type="email" defaultValue={currentCustomer.email} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="ph">Téléphone</Label>
            <Input id="ph" defaultValue={currentCustomer.phone} />
          </div>
        </div>

        <div className="mt-5 flex items-start gap-2">
          <Checkbox id="nl" checked={newsletter} onCheckedChange={(v) => setNewsletter(Boolean(v))} />
          <Label htmlFor="nl" className="text-sm font-normal leading-snug">
            Je souhaite recevoir la newsletter (promotions et nouveautés, 1 e-mail par semaine).
          </Label>
        </div>

        <Button variant="accent" type="submit" className="mt-6" disabled={saving}>
          {saving ? "Enregistrement…" : "Enregistrer"}
        </Button>
      </form>

      <form
        className="rounded-xl border border-border bg-card p-6"
        onSubmit={(e) => { e.preventDefault(); toast.success("Mot de passe mis à jour (démo)."); }}
      >
        <h2 className="text-lg font-bold">Mot de passe</h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="pw1">Nouveau mot de passe</Label>
            <Input id="pw1" type="password" placeholder="••••••••" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="pw2">Confirmation</Label>
            <Input id="pw2" type="password" placeholder="••••••••" />
          </div>
        </div>
        <Button variant="outline" type="submit" className="mt-5">Mettre à jour</Button>
      </form>
    </div>
  );
}
