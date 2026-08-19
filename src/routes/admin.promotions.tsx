import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Pencil, Plus, Trash2, Eye } from "lucide-react";
import { toast } from "sonner";
import { categories } from "@/data/categories";
import type { Database } from "@/types";
import { supabase } from "@/lib/supabaseClient";

type PromoRow = Database["public"]["Tables"]["promotions"]["Row"];
type CouponRow = Database["public"]["Tables"]["coupons"]["Row"];
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

const emptyPromo: Partial<PromoRow> = {
  discount_type: "percentage",
  discount_value: 10,
  product_id: null,
  variant_id: null,
  starts_at: "2026-09-01",
  ends_at: "2026-09-30",
  is_active: true,
};

const emptyCoupon: Partial<CouponRow> = {
  code: "",
  discount_type: "percentage",
  discount_value: 10,
  min_order_amount: 0,
  starts_at: "2026-09-01",
  expires_at: "2026-12-31",
  max_uses: 100,
  max_uses_per_user: null,
  used_count: 0,
  is_active: true,
};

function AdminPromotions() {
  const [promos, setPromos] = useState<PromoRow[]>([]);
  const [couponList, setCouponList] = useState<CouponRow[]>([]);
  const [promoDraft, setPromoDraft] = useState<Partial<PromoRow> | null>(null);
  const [couponDraft, setCouponDraft] = useState<Partial<CouponRow> | null>(null);
  const [loading, setLoading] = useState(false);
  const [couponUsages, setCouponUsages] = useState<Array<{ id: string; user_id?: string | null; order_id?: string | null; used_at?: string | null }>>([]);
  const [viewCouponId, setViewCouponId] = useState<string | null>(null);
  const [productsList, setProductsList] = useState<Array<{ id: string; name: string; sku?: string }>>([]);
  const [variantsList, setVariantsList] = useState<Array<{ id: string; sku: string; product_id: string }>>([]);
  const [confirmDeletePromoId, setConfirmDeletePromoId] = useState<string | null>(null);
  const [confirmDeleteCouponId, setConfirmDeleteCouponId] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      setLoading(true);
      try {
        const [
          { data: pData, error: pErr },
          { data: cData, error: cErr },
          { data: prodData, error: prodErr },
          { data: varData, error: varErr },
        ] = await Promise.all([
          supabase.from("promotions").select("*").order("starts_at", { ascending: true }),
          supabase.from("coupons").select("*").order("starts_at", { ascending: true }),
          supabase.from("products").select("id,name,sku").order("created_at", { ascending: false }),
          supabase.from("product_variants").select("id,sku,product_id"),
        ]);
        if (pErr) throw pErr;
        if (cErr) throw cErr;
        if (prodErr) throw prodErr;
        if (varErr) throw varErr;
        if (!mounted) return;
        setPromos(pData ?? []);
        setCouponList(cData ?? []);
        setProductsList((prodData ?? []).map((p: any) => ({ id: p.id, name: p.name ?? p.slug ?? p.id, sku: p.sku })));
        setVariantsList((varData ?? []).map((v: any) => ({
          id: v.id,
          sku: v.sku ?? String(v.id).slice(0, 8),
          product_id: v.product_id ?? "",
        })));
      } catch (err) {
        console.error("load promotions/coupons", err);
        toast.error("Impossible de charger les promotions et coupons depuis la base.");
      } finally {
        if (mounted) setLoading(false);
      }
    };
    load();
    return () => { mounted = false; };
  }, []);

  const savePromo = async () => {
    if (!promoDraft) return;
    setLoading(true);
    try {
      // Map UI fields (if any) to DB columns. We support percentage/fixed types.
      const payload: any = {
        discount_type: promoDraft.discount_type ?? (promoDraft.discount_value !== undefined ? "percentage" : null),
        discount_value: promoDraft.discount_value ?? 0,
        product_id: promoDraft.product_id ?? null,
        variant_id: promoDraft.variant_id ?? null,
        starts_at: promoDraft.starts_at ?? null,
        ends_at: promoDraft.ends_at ?? null,
        is_active: promoDraft.is_active ?? true,
      };

      if (promoDraft.id) {
        const { error } = await supabase.from("promotions").update(payload).eq("id", promoDraft.id);
        if (error) throw error;
        setPromos((prev) => prev.map((p) => (p.id === promoDraft.id ? { ...p, ...payload } as PromoRow : p)));
        toast.success("Promotion mise à jour.");
      } else {
        const { data, error } = await supabase.from("promotions").insert(payload).select().maybeSingle();
        if (error) throw error;
        if (data) setPromos((prev) => [...prev, data as PromoRow]);
        toast.success("Promotion créée.");
      }
      setPromoDraft(null);
    } catch (err) {
      console.error("savePromo", err);
      toast.error("Erreur lors de l'enregistrement de la promotion.");
    } finally {
      setLoading(false);
    }
  };

  const handleDeletePromo = async (id: string) => {
    if (!id) return;
    setLoading(true);
    try {
      const { error } = await supabase.from("promotions").delete().eq("id", id);
      if (error) throw error;
      setPromos((prev) => prev.filter((x) => x.id !== id));
      toast.success("Promotion supprimée.");
    } catch (err) {
      console.error("delete promo", err);
      toast.error("Impossible de supprimer la promotion.");
    } finally {
      setLoading(false);
      setConfirmDeletePromoId(null);
    }
  };

  const saveCoupon = async () => {
    if (!couponDraft) return;
    if (!couponDraft.code || !couponDraft.code.trim()) {
      toast.error("Le code est obligatoire.");
      return;
    }
    setLoading(true);
    try {
      const anyDraft = couponDraft as any;
      const payload: any = {
        code: (couponDraft.code ?? "").toUpperCase(),
        discount_type: couponDraft.discount_type ?? anyDraft.type ?? "percentage",
        discount_value: couponDraft.discount_value ?? anyDraft.value ?? 0,
        min_order_amount: couponDraft.min_order_amount ?? anyDraft.min_amount ?? 0,
        starts_at: couponDraft.starts_at ?? null,
        expires_at: couponDraft.expires_at ?? anyDraft.ends_at ?? null,
        max_uses: couponDraft.max_uses ?? anyDraft.usage_limit ?? null,
        max_uses_per_user: couponDraft.max_uses_per_user ?? anyDraft.max_uses_per_user ?? null,
        used_count: couponDraft.used_count ?? 0,
        is_active: couponDraft.is_active ?? true,
      };

      if (couponDraft.id) {
        const { error } = await supabase.from("coupons").update(payload).eq("id", couponDraft.id);
        if (error) throw error;
        setCouponList((prev) => prev.map((c) => (c.id === couponDraft.id ? { ...c, ...payload } as CouponRow : c)));
        toast.success("Coupon mis à jour.");
      } else {
        const { data, error } = await supabase.from("coupons").insert(payload).select().maybeSingle();
        if (error) throw error;
        if (data) setCouponList((prev) => [...prev, data as CouponRow]);
        toast.success("Coupon créé.");
      }
      setCouponDraft(null);
    } catch (err) {
      console.error("saveCoupon", err);
      toast.error("Erreur lors de l'enregistrement du coupon.");
    } finally {
      setLoading(false);
    }
  };

  const getProductLabel = (id?: string | null) => {
    if (!id) return "Tout le catalogue";
    const p = productsList.find((x) => x.id === id);
    if (p) return p.sku ?? p.name;
    try {
      return id.slice(0, 8);
    } catch {
      return id;
    }
  };


  const handleDeleteCoupon = async (id: string) => {
    if (!id) return;
    setLoading(true);
    try {
      const { error } = await supabase.from("coupons").delete().eq("id", id);
      if (error) throw error;
      setCouponList((prev) => prev.filter((x) => x.id !== id));
      toast.success("Coupon supprimé.");
    } catch (err) {
      console.error("delete coupon", err);
      toast.error("Impossible de supprimer le coupon.");
    } finally {
      setLoading(false);
      setConfirmDeleteCouponId(null);
    }
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
                      <TableCell className="font-medium">{p.product_id ? getProductLabel(p.product_id) : `Tout le catalogue`}</TableCell>
                      <TableCell className="font-semibold text-accent-strong">
                        {p.discount_type === "percentage" ? `-${p.discount_value}%` : `-${p.discount_value} DT`}
                      </TableCell>
                      <TableCell className="text-muted-foreground">{p.product_id ? getProductLabel(p.product_id) : "Tout le catalogue"}</TableCell>
                      <TableCell className="text-muted-foreground">{p.starts_at ?? "—"} → {p.ends_at ?? "—"}</TableCell>
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
                          onClick={() => setConfirmDeletePromoId(p.id)}
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
                    <TableCell>{c.discount_type === "percentage" ? `-${c.discount_value}%` : `-${c.discount_value} DT`}</TableCell>
                    <TableCell className="text-muted-foreground">{c.min_order_amount ?? 0} DT</TableCell>
                    <TableCell className="text-muted-foreground">{c.used_count ?? 0}/{c.max_uses ?? "—"}</TableCell>
                    <TableCell className="text-muted-foreground">{c.starts_at ?? "—"} → {c.expires_at ?? "—"}</TableCell>
                    <TableCell className={c.is_active ? "text-success" : "text-muted-foreground"}>
                      {c.is_active ? "Actif" : "Inactif"}
                    </TableCell>
                      <TableCell className="text-right">
                      <button aria-label="Historique" className="mr-1 rounded p-1.5 text-muted-foreground hover:bg-surface" onClick={async () => {
                        setLoading(true);
                        try {
                          const { data, error } = await supabase.from('coupon_usages').select('*').eq('coupon_id', c.id).order('used_at', { ascending: false });
                          if (error) throw error;
                          setCouponUsages(data ?? []);
                          setViewCouponId(c.id);
                        } catch (err) {
                          console.error('fetch coupon usages', err);
                          toast.error('Impossible de charger l\'historique.');
                        } finally {
                          setLoading(false);
                        }
                      }}>
                        <Eye className="h-4 w-4" />
                      </button>
                      <button aria-label="Modifier" className="mr-1 rounded p-1.5 text-muted-foreground hover:bg-surface" onClick={() => setCouponDraft(c)}>
                        <Pencil className="h-4 w-4" />
                      </button>
                      <button
                        aria-label="Supprimer"
                        className="rounded p-1.5 text-muted-foreground hover:bg-surface hover:text-destructive"
                        onClick={() => setConfirmDeleteCouponId(c.id)}
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
              <div className="space-y-2">
                <Label>Type de remise</Label>
                <Select
                  value={promoDraft.discount_type ?? "percentage"}
                  onValueChange={(v) => setPromoDraft({ ...promoDraft, discount_type: v })}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="percentage">Pourcentage</SelectItem>
                    <SelectItem value="fixed">Montant fixe</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Valeur</Label>
                <Input type="number" value={promoDraft.discount_value ?? 0} onChange={(e) => setPromoDraft({ ...promoDraft, discount_value: Number(e.target.value) })} />
              </div>
              <div className="space-y-2">
                <Label>Produit</Label>
                <Select
                  value={promoDraft.product_id ?? "all"}
                  onValueChange={(v) => setPromoDraft({ ...promoDraft, product_id: v === "all" ? null : v, variant_id: null })}
                >
                  <SelectTrigger><SelectValue placeholder="Aucun (catalogue)" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Tout le catalogue</SelectItem>
                    {productsList.map((p) => (
                      <SelectItem key={p.id} value={p.id}>{p.sku ?? p.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Variante (optionnel)</Label>
                <Select
                  value={promoDraft.variant_id ?? "none"}
                  onValueChange={(v) => setPromoDraft({ ...promoDraft, variant_id: v === "none" ? null : v })}
                >
                  <SelectTrigger><SelectValue placeholder="Toutes les variantes" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Toutes les variantes</SelectItem>
                    {variantsList.map((v) => (
                      <SelectItem key={v.id} value={v.id}>{v.sku ?? v.id.slice(0, 8)}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Début</Label>
                <Input type="date" value={promoDraft.starts_at ?? ""} onChange={(e) => setPromoDraft({ ...promoDraft, starts_at: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>Fin</Label>
                <Input type="date" value={promoDraft.ends_at ?? ""} onChange={(e) => setPromoDraft({ ...promoDraft, ends_at: e.target.value })} />
              </div>
              <div className="flex items-center gap-3 sm:col-span-2">
                <Switch checked={!!promoDraft.is_active} onCheckedChange={(v) => setPromoDraft({ ...promoDraft, is_active: v })} />
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

        {/* Dialog coupon usages/history */}
        <Dialog open={Boolean(viewCouponId)} onOpenChange={(v) => { if (!v) setViewCouponId(null); }}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Historique d'utilisation</DialogTitle>
            </DialogHeader>
            {couponUsages.length === 0 ? (
              <p className="text-muted-foreground">Aucune utilisation enregistrée pour ce coupon.</p>
            ) : (
              <div className="space-y-2">
                {couponUsages.map((u) => (
                  <div key={u.id} className="rounded-md border border-border p-3">
                    <p className="text-sm">Utilisateur: {u.user_id ?? "—"}</p>
                    <p className="text-sm">Commande: {u.order_id ?? "—"}</p>
                    <p className="text-xs text-muted-foreground">Le: {u.used_at ? new Date(u.used_at).toLocaleString() : "—"}</p>
                  </div>
                ))}
              </div>
            )}
            <DialogFooter>
              <Button variant="outline" onClick={() => setViewCouponId(null)}>Fermer</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

      {/* Confirm delete promotion */}
      <Dialog open={Boolean(confirmDeletePromoId)} onOpenChange={(v) => { if (!v) setConfirmDeletePromoId(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirmer la suppression</DialogTitle>
          </DialogHeader>
          <p>Voulez-vous vraiment supprimer cette promotion ? Cette action est irréversible.</p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmDeletePromoId(null)}>Annuler</Button>
            <Button variant="accent" className="bg-destructive hover:bg-destructive/90" onClick={async () => { if (confirmDeletePromoId) await handleDeletePromo(confirmDeletePromoId); }}>Supprimer</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Confirm delete coupon */}
      <Dialog open={Boolean(confirmDeleteCouponId)} onOpenChange={(v) => { if (!v) setConfirmDeleteCouponId(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirmer la suppression</DialogTitle>
          </DialogHeader>
          <p>Voulez-vous vraiment supprimer ce coupon ? Cette action est irréversible.</p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmDeleteCouponId(null)}>Annuler</Button>
            <Button variant="accent" className="bg-destructive hover:bg-destructive/90" onClick={async () => { if (confirmDeleteCouponId) await handleDeleteCoupon(confirmDeleteCouponId); }}>Supprimer</Button>
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
                <Input value={couponDraft.code ?? ""} onChange={(e) => setCouponDraft({ ...couponDraft, code: e.target.value.toUpperCase() })} />
              </div>
              <div className="space-y-2">
                <Label>Type</Label>
                <Select
                  value={couponDraft.discount_type ?? "percentage"}
                  onValueChange={(v) => setCouponDraft({ ...couponDraft, discount_type: v })}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="percentage">Pourcentage</SelectItem>
                    <SelectItem value="fixed">Montant fixe</SelectItem>
                    <SelectItem value="free_shipping">Livraison gratuite</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Valeur</Label>
                <Input type="number" value={couponDraft.discount_value ?? 0} onChange={(e) => setCouponDraft({ ...couponDraft, discount_value: Number(e.target.value) })} />
              </div>
              <div className="space-y-2">
                <Label>Montant minimum (DT)</Label>
                <Input type="number" value={couponDraft.min_order_amount ?? 0} onChange={(e) => setCouponDraft({ ...couponDraft, min_order_amount: Number(e.target.value) })} />
              </div>
              <div className="space-y-2">
                <Label>Début</Label>
                <Input type="date" value={couponDraft.starts_at ?? ""} onChange={(e) => setCouponDraft({ ...couponDraft, starts_at: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>Fin</Label>
                <Input type="date" value={couponDraft.expires_at ?? ""} onChange={(e) => setCouponDraft({ ...couponDraft, expires_at: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>Limite d'utilisation</Label>
                <Input type="number" value={couponDraft.max_uses ?? 0} onChange={(e) => setCouponDraft({ ...couponDraft, max_uses: Number(e.target.value) })} />
              </div>
              <div className="space-y-2">
                <Label>Limite par utilisateur</Label>
                <Input type="number" value={couponDraft.max_uses_per_user ?? 0} onChange={(e) => setCouponDraft({ ...couponDraft, max_uses_per_user: Number(e.target.value) })} />
              </div>
              <div className="flex items-center gap-3">
                <Switch checked={!!couponDraft.is_active} onCheckedChange={(v) => setCouponDraft({ ...couponDraft, is_active: v })} />
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
