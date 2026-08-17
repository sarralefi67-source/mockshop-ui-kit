import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { MapPin, Pencil, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { addresses as seedAddresses } from "@/data/orders";
import { GOVERNORATES } from "@/data/coupons";
import type { Address } from "@/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";

export const Route = createFileRoute("/compte/adresses")({
  component: AccountAddresses,
});

const emptyAddress: Address = {
  id: "", label: "", full_name: "", phone: "", line1: "", city: "",
  governorate: "Tunis", postal_code: "", is_default: false,
};

function AccountAddresses() {
  const [list, setList] = useState<Address[]>(seedAddresses);
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<Address>(emptyAddress);

  const save = () => {
    if (!draft.label || !draft.line1) {
      toast.error("Libellé et adresse sont obligatoires.");
      return;
    }
    setList((prev) =>
      draft.id
        ? prev.map((a) => (a.id === draft.id ? draft : a))
        : [...prev, { ...draft, id: `a-${Date.now()}` }],
    );
    setOpen(false);
    toast.success("Adresse enregistrée (démo).");
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Mes adresses</h1>
          <p className="text-sm text-muted-foreground">Gérez vos adresses de livraison.</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button variant="accent" onClick={() => setDraft(emptyAddress)}>
              <Plus className="h-4 w-4" /> Ajouter
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{draft.id ? "Modifier l'adresse" : "Nouvelle adresse"}</DialogTitle>
            </DialogHeader>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Libellé</Label>
                <Input value={draft.label} onChange={(e) => setDraft({ ...draft, label: e.target.value })} placeholder="Domicile" />
              </div>
              <div className="space-y-2">
                <Label>Nom complet</Label>
                <Input value={draft.full_name} onChange={(e) => setDraft({ ...draft, full_name: e.target.value })} />
              </div>
              <div className="space-y-2 sm:col-span-2">
                <Label>Adresse</Label>
                <Input value={draft.line1} onChange={(e) => setDraft({ ...draft, line1: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>Ville</Label>
                <Input value={draft.city} onChange={(e) => setDraft({ ...draft, city: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>Gouvernorat</Label>
                <Select value={draft.governorate} onValueChange={(v) => setDraft({ ...draft, governorate: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent className="max-h-72">
                    {GOVERNORATES.map((g) => <SelectItem key={g} value={g}>{g}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Téléphone</Label>
                <Input value={draft.phone} onChange={(e) => setDraft({ ...draft, phone: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>Code postal</Label>
                <Input value={draft.postal_code} onChange={(e) => setDraft({ ...draft, postal_code: e.target.value })} />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setOpen(false)}>Annuler</Button>
              <Button variant="accent" onClick={save}>Enregistrer</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {list.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border py-20 text-center">
          <MapPin className="mx-auto h-10 w-10 text-muted-foreground" />
          <p className="mt-3 font-semibold">Aucune adresse enregistrée</p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {list.map((a) => (
            <div key={a.id} className="rounded-xl border border-border bg-card p-5">
              <div className="flex items-start justify-between">
                <div>
                  <p className="font-semibold">{a.label}</p>
                  {a.is_default && (
                    <span className="mt-1 inline-block rounded bg-accent-strong/10 px-2 py-0.5 text-[11px] font-semibold text-accent-strong">
                      Par défaut
                    </span>
                  )}
                </div>
                <div className="flex gap-1">
                  <button
                    aria-label="Modifier"
                    className="grid h-8 w-8 place-items-center rounded-md text-muted-foreground hover:bg-surface"
                    onClick={() => { setDraft(a); setOpen(true); }}
                  >
                    <Pencil className="h-4 w-4" />
                  </button>
                  <button
                    aria-label="Supprimer"
                    className="grid h-8 w-8 place-items-center rounded-md text-muted-foreground hover:bg-surface hover:text-destructive"
                    onClick={() => { setList((p) => p.filter((x) => x.id !== a.id)); toast.success("Adresse supprimée."); }}
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
              <p className="mt-3 text-sm text-muted-foreground">
                {a.full_name}<br />{a.line1}<br />{a.city}, {a.governorate} {a.postal_code}<br />{a.phone}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
