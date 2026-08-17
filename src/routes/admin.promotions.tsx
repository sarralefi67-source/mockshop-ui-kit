import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { coupons as seedCoupons, promotions as seedPromotions } from "@/data/coupons";
import { categories } from "@/data/categories";
import type { Coupon, Promotion } from "@/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";

export const Route = createFileRoute("/admin/promotions")({
  component: AdminPromotions,
});

const emptyPromo: Promotion = {
  id: "", name: "", discount_percent: 10, category_id: null,
  starts_at: "2026-09-01", ends_at: "2026-09-30", is_active: true,
};

const emptyCoupon: Coupon = {
  id: "", code: "", type: "percent", value: 10, min_amount: 0,
  starts_at: "2026-09-01", ends_at: "2026-12-31", usage_limit: 100, used_count: 0, is_active: true,
};

function AdminPromotions() {
  const [promos, setPromos] = useState<Promotion[]>(seedPromotions);
  const [couponList, setCouponList] = useState<Coupon[]>(seedCoupons);
  const [promoDraft, setPromoDraft] = useState<Promotion | null>(null);
  const [couponDraft, setCouponDraft] = useState<Coupon | null>(null);

  const savePromo = () => {
    if (!promoDraft) return;
    if (!promoDraft.name.trim()) {
      toast.error("Le nom est obligatoire.");
      return;
    }
    setPromos((prev) =>
      promoDraft.id
        ? prev.map((p) => (p.id === promoDraft.id ? promoDraft : p))
        : [...prev, { ...promoDraft, id: `pr-${Date.now()}` }],
    );
    setPromoDraft(null);
    toast.success("Promotion enregistrée.");
  };

  const saveCoupon = () => {
    if (!couponDraft) return;
    if (!couponDraft.code.trim()) {
      toast.error("Le code est obligatoire.");
      return;
    }
    setCouponList((prev) =>
      couponDraft.id
        ? prev.map((c) => (c.id === couponDraft.id ? couponDraft : c))
        : [...prev, { ...couponDraft, id: `cp-${Date.now()}`, code: couponDraft.code.toUpperCase() }],
    );
    setCouponDraft(null);
    toast.success("Coupon enregistré.");
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Promotions & coupons</h1>
        <p className="text-sm text-muted-foreground">Gérez vos remises catalogue et vos codes promo.</p>
      </div>

      <Tabs defaultValue="promotions">
        <TabsList>
          <TabsTrigger value="promotions">Promotions ({promos.length})</TabsTrigger>
          <TabsTrigger value="coupons">Coupons ({couponList.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="promotions" className="pt-5">
          <div className="mb-3 flex justify-end">
            <Button variant="accent" onClick={() => setPromoDraft(emptyPromo)}>
              <Plus className="h-4 w-4" /> Nouvelle promotion
            </Button>
          </div>
          <div className="overflow-x-auto rounded-xl border border-border bg-card">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nom</TableHead>
                  <TableHead>Remise</TableHead>
                  <TableHead>Périmètre</TableHead>
                  <TableHead>Période</TableHead>
                  <TableHead>Statut</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {promos.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="py-14 text-center text-muted-foreground">
                      Aucune promotion enregistrée.
                    </TableCell>
                  </TableRow>
                ) : (
                  promos.map((p) => (
                    <TableRow key={p.id}>
                      <TableCell className="font-medium">{p.name}</TableCell>
                      <TableCell className="font-semibold text-accent-strong">-{p.discount_percent}%</TableCell>
                      <TableCell className="text-muted-foreground">
                        {p.category_id ? categories.find((c) => c.id === p.category_id)?.name : "Tout le catalogue"}
                      </TableCell>
                      <TableCell className="text-muted-foreground">{p.starts_at} → {p.ends_at}</TableCell>
                      <TableCell className={p.is_active ? "text-success" : "text-muted-foreground"}>
                        {p.is_active ? "Active" : "Inactive"}
                      </TableCell>
                      <TableCell className="text-right">
                        <button aria-label="Modifier" className="mr-1 rounded p-1.5 text-muted-foreground hover:bg-surface" onClick={() => setPromoDraft(p)}>
                          <Pencil className="h-4 w-4" />
                        </button>
                        <button
                          aria-label="Supprimer"
                          className="rounded p-1.5 text-muted-foreground hover:bg-surface hover:text-destructive"
                          onClick={() => { setPromos((prev) => prev.filter((x) => x.id !== p.id)); toast.success("Promotion supprimée."); }}
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </TabsContent>

        <TabsContent value="coupons" className="pt-5">
          <div className="mb-3 flex justify-end">
            <Button variant="accent" onClick={() => setCouponDraft(emptyCoupon)}>
              <Plus className="h-4 w-4" /> Nouveau coupon
            </Button>
          </div>
          <div className="overflow-x-auto rounded-xl border border-border bg-card">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Code</TableHead>
                  <TableHead>Valeur</TableHead>
                  <TableHead>Minimum</TableHead>
                  <TableHead>Utilisations</TableHead>
                  <TableHead>Validité</TableHead>
                  <TableHead>Statut</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {couponList.map((c) => (
                  <TableRow key={c.id}>
                    <TableCell className="font-mono font-semibold">{c.code}</TableCell>
                    <TableCell>{c.type === "percent" ? `-${c.value}%` : `-${c.value} DT`}</TableCell>
                    <TableCell className="text-muted-foreground">{c.min_amount} DT</TableCell>
                    <TableCell className="text-muted-foreground">{c.used_count}/{c.usage_limit}</TableCell>
                    <TableCell className="text-muted-foreground">{c.starts_at} → {c.ends_at}</TableCell>
                    <TableCell className={c.is_active ? "text-success" : "text-muted-foreground"}>
                      {c.is_active ? "Actif" : "Inactif"}
                    </TableCell>
                    <TableCell className="text-right">
                      <button aria-label="Modifier" className="mr-1 rounded p-1.5 text-muted-foreground hover:bg-surface" onClick={() => setCouponDraft(c)}>
                        <Pencil className="h-4 w-4" />
                      </button>
                      <button
                        aria-label="Supprimer"
                        className="rounded p-1.5 text-muted-foreground hover:bg-surface hover:text-destructive"
                        onClick={() => { setCouponList((prev) => prev.filter((x) => x.id !== c.id)); toast.success("Coupon supprimé."); }}
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </TabsContent>
      </Tabs>

      {/* Dialog promotion */}
      <Dialog open={promoDraft !== null} onOpenChange={(o) => !o && setPromoDraft(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{promoDraft?.id ? "Modifier la promotion" : "Nouvelle promotion"}</DialogTitle>
          </DialogHeader>
          {promoDraft && (
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2 sm:col-span-2">
                <Label>Nom</Label>
                <Input value={promoDraft.name} onChange={(e) => setPromoDraft({ ...promoDraft, name: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>Remise (%)</Label>
                <Input type="number" value={promoDraft.discount_percent} onChange={(e) => setPromoDraft({ ...promoDraft, discount_percent: Number(e.target.value) })} />
              </div>
              <div className="space-y-2">
                <Label>Catégorie</Label>
                <Select
                  value={promoDraft.category_id ?? "all"}
                  onValueChange={(v) => setPromoDraft({ ...promoDraft, category_id: v === "all" ? null : v })}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent className="max-h-72">
                    <SelectItem value="all">Tout le catalogue</SelectItem>
                    {categories.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Début</Label>
                <Input type="date" value={promoDraft.starts_at} onChange={(e) => setPromoDraft({ ...promoDraft, starts_at: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>Fin</Label>
                <Input type="date" value={promoDraft.ends_at} onChange={(e) => setPromoDraft({ ...promoDraft, ends_at: e.target.value })} />
              </div>
              <div className="flex items-center gap-3 sm:col-span-2">
                <Switch checked={promoDraft.is_active} onCheckedChange={(v) => setPromoDraft({ ...promoDraft, is_active: v })} />
                <Label className="font-normal">Promotion active</Label>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setPromoDraft(null)}>Annuler</Button>
            <Button variant="accent" onClick={savePromo}>Enregistrer</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog coupon */}
      <Dialog open={couponDraft !== null} onOpenChange={(o) => !o && setCouponDraft(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{couponDraft?.id ? "Modifier le coupon" : "Nouveau coupon"}</DialogTitle>
          </DialogHeader>
          {couponDraft && (
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Code</Label>
                <Input value={couponDraft.code} onChange={(e) => setCouponDraft({ ...couponDraft, code: e.target.value.toUpperCase() })} />
              </div>
              <div className="space-y-2">
                <Label>Type</Label>
                <Select
                  value={couponDraft.type}
                  onValueChange={(v) => setCouponDraft({ ...couponDraft, type: v as Coupon["type"] })}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="percent">Pourcentage</SelectItem>
                    <SelectItem value="fixed">Montant fixe</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Valeur</Label>
                <Input type="number" value={couponDraft.value} onChange={(e) => setCouponDraft({ ...couponDraft, value: Number(e.target.value) })} />
              </div>
              <div className="space-y-2">
                <Label>Montant minimum (DT)</Label>
                <Input type="number" value={couponDraft.min_amount} onChange={(e) => setCouponDraft({ ...couponDraft, min_amount: Number(e.target.value) })} />
              </div>
              <div className="space-y-2">
                <Label>Début</Label>
                <Input type="date" value={couponDraft.starts_at} onChange={(e) => setCouponDraft({ ...couponDraft, starts_at: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>Fin</Label>
                <Input type="date" value={couponDraft.ends_at} onChange={(e) => setCouponDraft({ ...couponDraft, ends_at: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>Limite d'utilisation</Label>
                <Input type="number" value={couponDraft.usage_limit} onChange={(e) => setCouponDraft({ ...couponDraft, usage_limit: Number(e.target.value) })} />
              </div>
              <div className="flex items-center gap-3">
                <Switch checked={couponDraft.is_active} onCheckedChange={(v) => setCouponDraft({ ...couponDraft, is_active: v })} />
                <Label className="font-normal">Coupon actif</Label>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setCouponDraft(null)}>Annuler</Button>
            <Button variant="accent" onClick={saveCoupon}>Enregistrer</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
