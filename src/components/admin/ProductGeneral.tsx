import React from "react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import type { Product } from "@/types";

export default function ProductGeneral({
  draft,
  setDraft,
  categoriesMap,
}: {
  draft: Product;
  setDraft: (p: Product) => void;
  categoriesMap: Record<string, string>;
}) {
  return (
    <div className="grid gap-4 pt-5 sm:grid-cols-2">
      <div className="space-y-2 sm:col-span-2">
        <Label>Nom</Label>
        <Input value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} />
      </div>
      <div className="space-y-2">
        <Label>Marque</Label>
        <Input value={draft.brand} onChange={(e) => setDraft({ ...draft, brand: e.target.value })} />
      </div>
      <div className="space-y-2">
        <Label>Catégorie</Label>
        <Select value={(draft.category_id ?? "") as string} onValueChange={(v) => setDraft({ ...draft, category_id: v || null })}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent className="max-h-72">
            {Object.entries(categoriesMap).map(([id, name]) => (
              <SelectItem key={id} value={id}>{name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-2">
        <Label>Prix (DT)</Label>
        <Input type="number" value={draft.price} onChange={(e) => setDraft({ ...draft, price: Number(e.target.value) })} />
      </div>
      <div className="space-y-2">
        <Label>Prix barré (DT)</Label>
        <Input type="number" value={draft.compare_at_price ?? ""} onChange={(e) => setDraft({ ...draft, compare_at_price: e.target.value ? Number(e.target.value) : null })} />
      </div>
      <div className="space-y-2">
        <Label>Stock</Label>
        <Input type="number" value={draft.stock} onChange={(e) => setDraft({ ...draft, stock: Number(e.target.value) })} />
      </div>
      <div className="space-y-2">
        <Label>Slug</Label>
        <Input value={draft.slug} onChange={(e) => setDraft({ ...draft, slug: e.target.value })} placeholder="auto" />
      </div>
      <div className="space-y-2 sm:col-span-2">
        <Label>Description courte</Label>
        <Input value={draft.short_description} onChange={(e) => setDraft({ ...draft, short_description: e.target.value })} />
      </div>
      <div className="space-y-2 sm:col-span-2">
        <Label>Description</Label>
        <Textarea rows={4} value={draft.description} onChange={(e) => setDraft({ ...draft, description: e.target.value })} />
      </div>
      <div className="flex items-center gap-3">
        <Switch checked={draft.is_active} onCheckedChange={(v) => setDraft({ ...draft, is_active: v })} />
        <Label className="font-normal">Produit actif</Label>
      </div>
      <div className="flex items-center gap-3">
        <Switch checked={draft.is_new} onCheckedChange={(v) => setDraft({ ...draft, is_new: v })} />
        <Label className="font-normal">Badge « Nouveau »</Label>
      </div>
    </div>
  );
}
