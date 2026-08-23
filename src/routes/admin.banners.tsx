import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { ImagePlus, Pencil, Plus, Trash2 } from "lucide-react";
import { supabase } from "@/lib/supabaseClient";
import { uploadToBucket } from "@/lib/storage";
import type { Database } from "@/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import Spinner from "@/components/ui/spinner";
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";

export const Route = createFileRoute("/admin/banners")({
  component: AdminBanners,
});

type BannerRow = Database["public"]["Tables"]["banners"]["Row"];
type BannerDraft = Partial<BannerRow> & { product_ids?: string[] };

// Une bannière renvoie vers sa propre page, qui liste les produits associés
// (voir src/routes/banniere.$id.tsx). L'id n'existe qu'après la création, d'où
// le link_url renseigné dans un second temps pour une nouvelle bannière.
const bannerLink = (bannerId: string | null | undefined) =>
  bannerId ? `/banniere/${bannerId}` : "";

const emptyBanner: BannerDraft = {
  title: "",
  subtitle: "",
  image_url: "",
  link_url: "",
  is_active: true,
  product_ids: [],
};

function AdminBanners() {
  const [banners, setBanners] = useState<BannerRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [draft, setDraft] = useState<BannerDraft | null>(null);
  const [products, setProducts] = useState<{ id: string; sku: string | null; slug: string | null }[]>([]);
  const [productSearch, setProductSearch] = useState("");
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.from("banners").select("*").order("position", { ascending: true });
      if (error) throw error;
      setBanners(data ?? []);
      const { data: productRows, error: productsError } = await supabase
        .from("products")
        .select("id,sku,slug")
        .eq("is_active", true)
        .order("sku")
        .limit(30);
      if (productsError) throw productsError;
      setProducts(productRows ?? []);
    } catch (err) {
      console.error("load banners", err);
      toast.error("Impossible de charger les bannières.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const save = async () => {
    if (!draft) return;
    if (!draft.image_url) {
      toast.error("Ajoutez une image pour la bannière.");
      return;
    }
    setSaving(true);
    try {
      const payload = {
        title: draft.title?.trim() || null,
        subtitle: draft.subtitle?.trim() || null,
        image_url: draft.image_url,
        is_active: draft.is_active ?? true,
      };
      if (draft.id) {
        const { error } = await supabase
          .from("banners")
          .update({ ...payload, link_url: bannerLink(draft.id) })
          .eq("id", draft.id);
        if (error) throw error;
        await saveBannerProducts(draft.id, draft.product_ids ?? []);
        toast.success("Bannière mise à jour.");
      } else {
        const { data: created, error } = await supabase
          .from("banners")
          .insert({ ...payload, link_url: null, position: banners.length })
          .select("id")
          .single();
        if (error) throw error;
        const { error: linkError } = await supabase
          .from("banners")
          .update({ link_url: bannerLink(created.id) })
          .eq("id", created.id);
        if (linkError) throw linkError;
        await saveBannerProducts(created.id, draft.product_ids ?? []);
        toast.success("Bannière créée.");
      }
      setDraft(null);
      await load();
    } catch (err) {
      console.error("save banner", err);
      toast.error("Erreur lors de l'enregistrement.");
    } finally {
      setSaving(false);
    }
  };

  const saveBannerProducts = async (bannerId: string, productIds: string[]) => {
    const bannerProducts = supabase.from("banner_products" as never) as any;
    const { error: deleteError } = await bannerProducts.delete().eq("banner_id", bannerId);
    if (deleteError) throw deleteError;
    if (productIds.length === 0) return;
    const { error: insertError } = await bannerProducts.insert(
      productIds.map((productId, position) => ({ banner_id: bannerId, product_id: productId, position })),
    );
    if (insertError) throw insertError;
  };

  const openBanner = async (banner: BannerRow | typeof emptyBanner) => {
    if (!("id" in banner) || !banner.id) {
      setDraft({ ...banner, product_ids: [] });
      return;
    }
    const bannerProducts = supabase.from("banner_products" as never) as any;
    const { data } = await bannerProducts.select("product_id").eq("banner_id", banner.id).order("position");
    setDraft({ ...banner, product_ids: (data ?? []).map((row: { product_id: string }) => row.product_id) });
  };

  const handleUpload = async (file: File) => {
    setUploading(true);
    try {
      const safeName = file.name.replace(/\s+/g, "_").replace(/[^a-zA-Z0-9._-]/g, "");
      const path = `${Date.now()}-${safeName}`;
      const publicUrl = await uploadToBucket("banners", path, file);
      setDraft((d) => (d ? { ...d, image_url: publicUrl } : d));
    } catch (err) {
      console.error("upload banner image", err);
      toast.error("Échec de l'upload de l'image.");
    } finally {
      setUploading(false);
    }
  };

  const toggleActive = async (banner: BannerRow) => {
    const next = !banner.is_active;
    setBanners((prev) => prev.map((b) => (b.id === banner.id ? { ...b, is_active: next } : b)));
    const { error } = await supabase.from("banners").update({ is_active: next }).eq("id", banner.id);
    if (error) {
      console.error("toggle banner", error);
      setBanners((prev) => prev.map((b) => (b.id === banner.id ? { ...b, is_active: banner.is_active } : b)));
      toast.error("Impossible de changer le statut.");
    }
  };

  const move = async (banner: BannerRow, direction: -1 | 1) => {
    const sorted = [...banners].sort((a, b) => a.position - b.position);
    const idx = sorted.findIndex((b) => b.id === banner.id);
    const swapWith = sorted[idx + direction];
    if (!swapWith) return;
    try {
      await supabase.from("banners").update({ position: swapWith.position }).eq("id", banner.id);
      await supabase.from("banners").update({ position: banner.position }).eq("id", swapWith.id);
      await load();
    } catch (err) {
      console.error("reorder banner", err);
      toast.error("Impossible de réordonner.");
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const { error } = await supabase.from("banners").delete().eq("id", id);
      if (error) throw error;
      setBanners((prev) => prev.filter((b) => b.id !== id));
      toast.success("Bannière supprimée.");
    } catch (err) {
      console.error("delete banner", err);
      toast.error("Impossible de supprimer la bannière.");
    } finally {
      setConfirmDeleteId(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Bannières</h1>
          <p className="text-sm text-muted-foreground">Gérez le carrousel affiché en haut de l'accueil.</p>
        </div>
        <Button variant="accent" onClick={() => { setProductSearch(""); openBanner(emptyBanner); }}>
          <Plus className="h-4 w-4" /> Nouvelle bannière
        </Button>
      </div>

      {loading ? (
        <div className="flex justify-center py-14"><Spinner showLabel /></div>
      ) : banners.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border py-16 text-center text-muted-foreground">
          Aucune bannière — la section hero de l'accueil reste masquée tant qu'il n'y en a pas.
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[...banners].sort((a, b) => a.position - b.position).map((banner, idx, arr) => (
            <div key={banner.id} className="overflow-hidden rounded-xl border border-border bg-card">
              <img src={banner.image_url} alt={banner.title ?? ""} className="aspect-[21/9] w-full object-cover" />
              <div className="space-y-2 p-4">
                <p className="font-semibold">{banner.title || "(sans titre)"}</p>
                {banner.subtitle && <p className="text-sm text-muted-foreground">{banner.subtitle}</p>}
                <div className="flex items-center justify-between pt-2">
                  <div className="flex items-center gap-2">
                    <Switch checked={banner.is_active} onCheckedChange={() => toggleActive(banner)} />
                    <span className="text-xs text-muted-foreground">{banner.is_active ? "Active" : "Inactive"}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <button disabled={idx === 0} className="text-muted-foreground hover:text-foreground disabled:opacity-30" onClick={() => move(banner, -1)} aria-label="Monter">◀</button>
                    <button disabled={idx === arr.length - 1} className="text-muted-foreground hover:text-foreground disabled:opacity-30" onClick={() => move(banner, 1)} aria-label="Descendre">▶</button>
                    <button className="rounded p-1.5 text-muted-foreground hover:bg-surface" onClick={() => { setProductSearch(""); openBanner(banner); }} aria-label="Modifier">
                      <Pencil className="h-4 w-4" />
                    </button>
                    <button className="rounded p-1.5 text-destructive hover:bg-destructive/10" onClick={() => setConfirmDeleteId(banner.id)} aria-label="Supprimer">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <Dialog open={draft !== null} onOpenChange={(o) => !o && setDraft(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{draft?.id ? "Modifier la bannière" : "Nouvelle bannière"}</DialogTitle>
          </DialogHeader>
          {draft && (
            <div className="space-y-4">
              <div>
                <Label>Image</Label>
                <div className="mt-2 flex items-center gap-3">
                  {draft.image_url ? (
                    <img src={draft.image_url} alt="" className="h-20 w-36 rounded-md border border-border object-cover" />
                  ) : (
                    <div className="grid h-20 w-36 place-items-center rounded-md border-2 border-dashed border-border text-muted-foreground">
                      <ImagePlus className="h-6 w-6" />
                    </div>
                  )}
                  <label className="cursor-pointer text-sm font-semibold text-accent-strong hover:underline">
                    {uploading ? "Envoi…" : draft.image_url ? "Changer l'image" : "Choisir une image"}
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      disabled={uploading}
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) handleUpload(file);
                      }}
                    />
                  </label>
                </div>
              </div>
              <div className="space-y-2">
                <Label>Titre (optionnel)</Label>
                <Input value={draft.title ?? ""} onChange={(e) => setDraft({ ...draft, title: e.target.value })} placeholder="Nouvelle collection" />
              </div>
              <div className="space-y-2">
                <Label>Sous-titre (optionnel)</Label>
                <Input value={draft.subtitle ?? ""} onChange={(e) => setDraft({ ...draft, subtitle: e.target.value })} placeholder="Découvrez nos pièces artisanales" />
              </div>
              <div className="space-y-2">
                <Label>Lien automatique</Label>
                <Input
                  value={bannerLink(draft.id) || "Généré à la création de la bannière"}
                  readOnly
                />
                <p className="text-xs text-muted-foreground">
                  Un clic sur la bannière ouvre cette page, qui affiche les produits associés ci-dessous.
                </p>
              </div>
              <div className="space-y-2">
                <Label>Produits associés</Label>
                <Input
                  value={productSearch}
                  onChange={(e) => setProductSearch(e.target.value)}
                  placeholder="Rechercher par SKU"
                />
                <div className="max-h-44 space-y-2 overflow-y-auto rounded-md border border-border p-3">
                  {products.filter((product) => (product.sku ?? "").toLowerCase().includes(productSearch.trim().toLowerCase())).length === 0 ? (
                    <p className="text-sm text-muted-foreground">Aucun produit actif.</p>
                  ) : products.filter((product) => (product.sku ?? "").toLowerCase().includes(productSearch.trim().toLowerCase())).slice(0, 30).map((product) => {
                    const checked = draft.product_ids?.includes(product.id) ?? false;
                    return (
                      <label key={product.id} className="flex items-center gap-2 text-sm">
                        <Checkbox
                          checked={checked}
                          onCheckedChange={(value) => setDraft({
                            ...draft,
                            product_ids: value
                              ? [...(draft.product_ids ?? []), product.id]
                              : (draft.product_ids ?? []).filter((id) => id !== product.id),
                          })}
                        />
                        <span>{product.sku || "SKU non défini"}</span>
                      </label>
                    );
                  })}
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Switch checked={draft.is_active ?? true} onCheckedChange={(v) => setDraft({ ...draft, is_active: v })} />
                <Label className="font-normal">Bannière active</Label>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setDraft(null)} disabled={saving}>Annuler</Button>
            <Button variant="accent" onClick={save} disabled={saving || uploading}>
              {saving ? "Enregistrement…" : "Enregistrer"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={confirmDeleteId !== null} onOpenChange={(o) => !o && setConfirmDeleteId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Supprimer cette bannière ?</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">Cette action est irréversible.</p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmDeleteId(null)}>Annuler</Button>
            <Button variant="destructive" onClick={() => confirmDeleteId && handleDelete(confirmDeleteId)}>Supprimer</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
