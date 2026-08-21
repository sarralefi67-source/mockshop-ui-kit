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
  showRequiredErrors,
}: {
  draft: Product;
  setDraft: (p: Product) => void;
  categoriesMap: Record<string, string>;
  showRequiredErrors: boolean;
}) {
  return (
    <div className="grid gap-4 pt-5 sm:grid-cols-2">
      <div className="space-y-2 sm:col-span-2">
        <Label htmlFor="product-name">Nom *</Label>
        <Input
          id="product-name"
          required
          autoFocus
          value={draft.name}
          onChange={(e) => setDraft({ ...draft, name: e.target.value })}
        />
        {showRequiredErrors && !draft.name.trim() && (
          <p className="text-xs text-destructive">Le nom est obligatoire.</p>
        )}
      </div>
     
      <div className="space-y-2">
          <Label htmlFor="product-category">Catégorie *</Label>
          <Select value={(draft.category_id ?? "") as string} onValueChange={(v) => setDraft({ ...draft, category_id: v || null })}>
            <SelectTrigger id="product-category"><SelectValue placeholder="Choisir une catégorie" /></SelectTrigger>
          <SelectContent className="max-h-72">
            {Object.entries(categoriesMap).map(([id, name]) => (
              <SelectItem key={id} value={id}>{name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
          {showRequiredErrors && !draft.category_id && (
            <p className="text-xs text-destructive">La catégorie est obligatoire.</p>
          )}
       
      </div>
       <div className="space-y-2">
        <Label>Marque</Label>
        <Input value={draft.brand} onChange={(e) => setDraft({ ...draft, brand: e.target.value })} />
      </div>
     
      <div className="space-y-2">
        <Label>Prix (DT)</Label>
        <Input
          type="number"
          value={draft.variants.length > 0 ? (draft.variants[0]?.price ?? draft.price) : draft.price}
          onChange={(e) => setDraft({ ...draft, price: Number(e.target.value) })}
          disabled={draft.variants.length > 0}
          className={draft.variants.length > 0 ? "bg-muted/60 text-muted-foreground" : ""}
        />
        {draft.variants.length > 0 && (
          <p className="text-xs text-muted-foreground">Le prix est défini par variante ; le prix du produit sert uniquement de référence pour les nouvelles variantes.</p>
        )}
      </div>

        <div className="space-y-2">
        <Label>Stock</Label>
        <Input
          type="number"
          value={draft.variants.length > 0 ? draft.variants.reduce((sum, v) => sum + Number(v.stock ?? 0), 0) : draft.stock}
          onChange={(e) => setDraft({ ...draft, stock: Number(e.target.value) })}
          disabled={draft.variants.length > 0}
          className={draft.variants.length > 0 ? "bg-muted/60 text-muted-foreground" : ""}
        />
        {draft.variants.length > 0 && (
          <p className="text-xs text-muted-foreground">Le stock global est calculé automatiquement à partir de la somme des variantes.</p>
        )}
      </div>
   
    
      {/* <div className="space-y-2">
        <Label>Slug</Label>
        <Input value={draft.slug} onChange={(e) => setDraft({ ...draft, slug: e.target.value })} placeholder="auto" />
      </div> */}
      <div className="space-y-2 sm:col-span-2">
        <Label htmlFor="product-short-description">Description courte *</Label>
        <Input
          id="product-short-description"
          name="short_description"
          required
          value={draft.short_description}
          onChange={(e) => setDraft({ ...draft, short_description: e.target.value })}
        />
        {showRequiredErrors && !draft.short_description.trim() && (
          <p className="text-xs text-destructive">La description courte est obligatoire.</p>
        )}
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
