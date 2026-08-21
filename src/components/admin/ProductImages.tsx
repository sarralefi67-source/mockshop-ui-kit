import React from "react";
import { ImagePlus, X } from "lucide-react";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
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
              onClick={() => setDraft({ ...draft, images: draft.images.filter((i) => i.id !== img.id) })}
            >
              <X className="h-3.5 w-3.5" />
            </button>
            <div className="mt-1 flex items-center justify-between gap-1">
              <button type="button" className={`text-xs ${img.is_main ? "text-accent-strong" : "text-muted-foreground hover:text-accent-strong"}`} onClick={() => {
                setDraft({ ...draft, images: draft.images.map((i) => ({ ...i, is_main: i.id === img.id })) });
              }}>{img.is_main ? "★ Principale" : "☆"}</button>
              <div className="flex gap-0.5">
                <button type="button" disabled={idx === 0} className="text-muted-foreground hover:text-foreground disabled:opacity-30" onClick={() => {
                  const prev = arr[idx - 1];
                  if (!prev) return;
                  setDraft({ ...draft, images: draft.images.map((i) => {
                      if (i.id === img.id) return { ...i, position: prev.position };
                      if (i.id === prev.id) return { ...i, position: img.position };
                      return i;
                    }) });
                }}>◀</button>
                <button type="button" disabled={idx === arr.length - 1} className="text-muted-foreground hover:text-foreground disabled:opacity-30" onClick={() => {
                  const next = arr[idx + 1];
                  if (!next) return;
                  setDraft({ ...draft, images: draft.images.map((i) => {
                      if (i.id === img.id) return { ...i, position: next.position };
                      if (i.id === next.id) return { ...i, position: img.position };
                      return i;
                    }) });
                }}>▶</button>
              </div>
            </div>
            <div className="mt-2">
              <Label className="text-xs">Associer à</Label>
              <div className="mt-1">
                <Select value={img.variant_value ?? ""} onValueChange={(v) => {
                  const nextValue = v || null;
                  setDraft({ ...draft, images: draft.images.map((i) => i.id === img.id ? { ...i, variant_value: nextValue } : i) });
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
            multiple
            onChange={(e) => {
              const files = Array.from(e.target.files ?? []);
              if (files.length === 0) return;
              const hadImages = draft.images.length > 0;
              const nextImages = files.map((file, index): ProductImage => ({
                id: `img-${crypto.randomUUID()}`,
                product_id: draft.id || "new",
                url: URL.createObjectURL(file),
                alt: file.name,
                position: draft.images.length + index,
                is_main: !hadImages && index === 0,
                variant_value: null,
                file,
              }));
              setDraft({ ...draft, images: [...draft.images, ...nextImages] });
              e.target.value = "";
            }}
          />
          <ImagePlus className="h-6 w-6" />
        </label>
      </div>
      <p className="mt-3 text-xs text-muted-foreground">Rattachez une image à une valeur d'attribut (couleur) pour que la galerie change avec la variante.</p>
    </div>
  );
}
