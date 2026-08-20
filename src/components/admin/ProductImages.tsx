import React from "react";
import { ImagePlus, X } from "lucide-react";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { uploadToBucket } from "@/lib/storage";
import { supabase } from "@/lib/supabaseClient";
import { toast } from "sonner";
import type { Product, ProductImage } from "@/types";

export default function ProductImages({ draft, setDraft }: { draft: Product; setDraft: (p: Product) => void }) {
  return (
    <div className="pt-5">
      <div className="flex flex-wrap gap-3">
        {[...draft.images].sort((a, b) => a.position - b.position).map((img, idx, arr) => (
          <div key={img.id} className="relative">
            <img src={img.url} alt="" className={`h-24 w-24 rounded-lg border object-cover ${img.is_main ? "border-accent-strong ring-2 ring-accent-strong" : "border-border"}`} />
            <button
              aria-label="Supprimer l'image"
              className="absolute -right-2 -top-2 grid h-6 w-6 place-items-center rounded-full bg-card shadow-card"
              onClick={async () => {
                if (!draft.id) {
                  setDraft({ ...draft, images: draft.images.filter((i) => i.id !== img.id) });
                  return;
                }
                try {
                  await supabase.from("product_images").delete().eq("id", img.id);
                  setDraft({ ...draft, images: draft.images.filter((i) => i.id !== img.id) });
                  toast.success("Image supprimée.");
                } catch (e) {
                  console.error(e);
                  toast.error("Impossible de supprimer l'image.");
                }
              }}
            >
              <X className="h-3.5 w-3.5" />
            </button>
            <div className="mt-1 flex items-center justify-between gap-1">
              <button type="button" className={`text-xs ${img.is_main ? "text-accent-strong" : "text-muted-foreground hover:text-accent-strong"}`} onClick={async () => {
                try {
                  if (draft.id) {
                    await supabase.from("product_images").update({ is_main: false }).eq("product_id", draft.id);
                    await supabase.from("product_images").update({ is_main: true }).eq("id", img.id);
                  }
                  setDraft({ ...draft, images: draft.images.map((i) => ({ ...i, is_main: i.id === img.id })) });
                } catch (e) {
                  console.error(e);
                  toast.error("Impossible de définir l'image principale.");
                }
              }}>{img.is_main ? "★ Principale" : "☆"}</button>
              <div className="flex gap-0.5">
                <button disabled={idx === 0} className="text-muted-foreground hover:text-foreground disabled:opacity-30" onClick={async () => {
                  const prev = arr[idx - 1];
                  if (!prev) return;
                  try {
                    if (draft.id) {
                      await supabase.from("product_images").update({ position: prev.position }).eq("id", img.id);
                      await supabase.from("product_images").update({ position: img.position }).eq("id", prev.id);
                    }
                    setDraft({ ...draft, images: draft.images.map((i) => {
                      if (i.id === img.id) return { ...i, position: prev.position };
                      if (i.id === prev.id) return { ...i, position: img.position };
                      return i;
                    }) });
                  } catch (e) {
                    console.error(e);
                    toast.error("Impossible de réordonner les images.");
                  }
                }}>◀</button>
                <button disabled={idx === arr.length - 1} className="text-muted-foreground hover:text-foreground disabled:opacity-30" onClick={async () => {
                  const next = arr[idx + 1];
                  if (!next) return;
                  try {
                    if (draft.id) {
                      await supabase.from("product_images").update({ position: next.position }).eq("id", img.id);
                      await supabase.from("product_images").update({ position: img.position }).eq("id", next.id);
                    }
                    setDraft({ ...draft, images: draft.images.map((i) => {
                      if (i.id === img.id) return { ...i, position: next.position };
                      if (i.id === next.id) return { ...i, position: img.position };
                      return i;
                    }) });
                  } catch (e) {
                    console.error(e);
                    toast.error("Impossible de réordonner les images.");
                  }
                }}>▶</button>
              </div>
            </div>
            <div className="mt-2">
              <Label className="text-xs">Associer à</Label>
              <div className="mt-1">
                <Select value={img.variant_value ?? ""} onValueChange={async (v) => {
                  const nextValue = v || null;

                  // local update
                  setDraft({ ...draft, images: draft.images.map((i) => i.id === img.id ? { ...i, variant_value: nextValue } : i) });

                  if (!img.id) return;
                  try {
                    const { error } = await supabase.from("product_images").update({ variant_value: nextValue }).eq("id", img.id);
                    if (error) throw error;
                    toast.success("Association enregistrée.");
                  } catch (e) {
                    console.error(e);
                    toast.error("Impossible d'enregistrer l'association.");
                  }
                }}>
                  <SelectTrigger className="w-44"><SelectValue placeholder="Aucune" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">Aucune</SelectItem>
                    {draft.attributes.map((attr) => (
                      attr.values.map((val) => (
                        <SelectItem key={`${attr.id}-${val.id}`} value={val.id}>{`${attr.name}: ${val.label}`}</SelectItem>
                      ))
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
        ))}

        <label className="grid h-24 w-24 place-items-center rounded-lg border-2 border-dashed border-border text-muted-foreground hover:border-accent-strong hover:text-accent-strong cursor-pointer">
          <input
            type="file"
            className="hidden"
            accept="image/*"
            onChange={async (e) => {
              const file = e.target.files?.[0];
              if (!file) return;
              try {
                let productId = draft.id;
                if (!productId) {
                  const { data, error } = await supabase.from("products").insert({ name: draft.name || "Untitled", slug: draft.slug || `prod-${Date.now()}`, base_price: draft.price || 0 }).select().single();
                  if (error) throw error;
                  productId = data.id;
                  setDraft((d) => ({ ...d, id: productId }));
                }
                const rawName = file.name.replace(/\s+/g, "_");
                const safeName = rawName.replace(/[^a-zA-Z0-9._-]/g, "");
                const path = `${productId}/${Date.now()}-${safeName}`;
                const publicUrl = await uploadToBucket("products", path, file);
                const { error } = await supabase.from("product_images").insert({ product_id: productId, url: publicUrl, position: draft.images.length, is_main: draft.images.length === 0 }).select();
                if (error) throw error;
                const { data: refreshed } = await supabase.from("product_images").select("*").eq("product_id", productId).order("position");
                setDraft((d) => ({ ...d, images: (refreshed ?? []).map((img: any) => ({ id: img.id, product_id: img.product_id, url: img.url, alt: "", position: img.position ?? 0, is_main: img.is_main ?? false, variant_value: img.variant_value ?? null })) }));
                toast.success("Image uploadée.");
              } catch (err) {
                console.error(err);
                const msg = (err as any)?.message ?? String(err);
                if (msg.includes("violates row-level security") || msg.includes("row-level security")) {
                  toast.error("Upload refusé par les policies RLS — vérifiez que l'utilisateur est admin ou ajustez les policies DB.");
                } else {
                  toast.error("Échec de l'upload.");
                }
              }
            }}
          />
          <ImagePlus className="h-6 w-6" />
        </label>
      </div>
      <p className="mt-3 text-xs text-muted-foreground">Rattachez une image à une valeur d'attribut (couleur) pour que la galerie change avec la variante.</p>
    </div>
  );
}
