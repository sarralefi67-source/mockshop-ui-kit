import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/lib/supabaseClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { GOVERNORATES } from "@/data/governorates";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Switch } from "@/components/ui/switch";
import { Plus, Pencil } from "lucide-react";
import { formatPrice } from "@/lib/placeholder";

export const Route = createFileRoute("/admin/parametres")({
  component: AdminParametres,
});

type ShippingRate = {
  id: string;
  governorate: string;
  price: string | number;
  is_active?: boolean | null;
};

const emptyRate: Partial<ShippingRate> = { governorate: "", price: 0, is_active: true };

function AdminParametres() {
  const [rates, setRates] = useState<ShippingRate[]>([]);
  const [loading, setLoading] = useState(false);
  const [draft, setDraft] = useState<Partial<ShippingRate> | null>(null);

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      setLoading(true);
      try {
        const { data, error } = await supabase.from("shipping_rates").select("*").order("governorate", { ascending: true });
        if (error) throw error;
        if (!mounted) return;
        setRates((data ?? []) as ShippingRate[]);
      } catch (err) {
        console.error("load shipping rates", err);
        toast.error("Impossible de charger les tarifs de livraison.");
      } finally {
        if (mounted) setLoading(false);
      }
    };
    load();
    return () => { mounted = false; };
  }, []);

  const saveRate = async () => {
    if (!draft) return;
    const governorate = String(draft.governorate ?? "").trim();
    if (!governorate) {
      toast.error("Le gouvernorat est requis.");
      return;
    }

    const duplicate = rates.find((r) => r.governorate === governorate && r.id !== draft.id);
    if (duplicate) {
      toast.error("Un tarif existe déjà pour ce gouvernorat.");
      return;
    }

    setLoading(true);
    try {
      const payload = {
        governorate,
        price: Number(draft.price ?? 0),
        is_active: draft.is_active ?? true,
      } as any;

      if (draft.id) {
        const { error } = await supabase.from("shipping_rates").update(payload).eq("id", draft.id);
        if (error) throw error;
        setRates((prev) => prev.map((r) => (r.id === draft.id ? { ...r, ...payload } as ShippingRate : r)));
        toast.success("Tarif mis à jour.");
      } else {
        const { data, error } = await supabase.from("shipping_rates").insert(payload).select().maybeSingle();
        if (error) throw error;
        if (data) setRates((prev) => [...prev, data as ShippingRate]);
        toast.success("Tarif créé.");
      }
      setDraft(null);
    } catch (err) {
      console.error("saveRate", err);
      toast.error("Erreur lors de l'enregistrement du tarif.");
    } finally {
      setLoading(false);
    }
  };

  const toggleActive = async (r: ShippingRate) => {
    setLoading(true);
    try {
      const nextValue = !Boolean(r.is_active);
      const { error } = await supabase.from("shipping_rates").update({ is_active: nextValue }).eq("id", r.id);
      if (error) throw error;
      setRates((prev) => prev.map((x) => (x.id === r.id ? { ...x, is_active: nextValue } : x)));
      toast.success(nextValue ? "Le gouvernorat est de nouveau actif." : "Le gouvernorat a été désactivé.");
    } catch (err) {
      console.error("toggleActive", err);
      toast.error("Impossible de mettre à jour l'état.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Paramètres</h1>
        <p className="text-sm text-muted-foreground">Gérez les paramètres globaux de la boutique.</p>
      </div>

      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Frais de livraison</h2>
        <Button variant="accent" onClick={() => setDraft(emptyRate)}><Plus className="h-4 w-4" /> Nouveau tarif</Button>
      </div>

      <div className="overflow-x-auto rounded-xl border border-border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Gouvernorat</TableHead>
              <TableHead>Prix</TableHead>
              <TableHead>Actif</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rates.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} className="py-14 text-center text-muted-foreground">Aucun tarif enregistré.</TableCell>
              </TableRow>
            ) : (
              rates.map((r) => (
                <TableRow key={r.id}>
                  <TableCell className="font-medium">{r.governorate}</TableCell>
                  <TableCell className="font-semibold">{formatPrice(Number(r.price))}</TableCell>
                  <TableCell>
                    <Switch checked={!!r.is_active} onCheckedChange={() => toggleActive(r)} />
                  </TableCell>
                  <TableCell className="text-right">
                    <button aria-label="Modifier" className="mr-2 rounded p-1.5 text-muted-foreground hover:bg-surface" onClick={() => setDraft(r)}>
                      <Pencil className="h-4 w-4" />
                    </button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <Dialog open={draft !== null} onOpenChange={(o) => !o && setDraft(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{draft?.id ? "Modifier le tarif" : "Nouveau tarif"}</DialogTitle>
          </DialogHeader>
          {draft && (
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Gouvernorat</Label>
                <Select value={draft.governorate ?? ""} onValueChange={(v) => setDraft({ ...draft, governorate: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent className="max-h-72">
                    {GOVERNORATES.map((g) => (
                      <SelectItem key={g} value={g}>{g}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Prix (DT)</Label>
                <Input type="number" step="0.001" value={String(draft.price ?? 0)} onChange={(e) => setDraft({ ...draft, price: Number(e.target.value) })} />
              </div>
              <div className="flex items-center gap-3 sm:col-span-2">
                <Switch checked={!!draft.is_active} onCheckedChange={(v) => setDraft({ ...draft, is_active: v })} />
                <Label className="font-normal">Actif</Label>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setDraft(null)}>Annuler</Button>
            <Button variant="accent" onClick={saveRate}>Enregistrer</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </div>
  );
}
