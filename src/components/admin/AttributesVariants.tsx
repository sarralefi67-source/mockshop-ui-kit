import React from "react";
import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type { Product, ProductAttribute, ProductVariant } from "@/types";

export default function AttributesVariants({
  draft,
  setDraft,
  addAttribute,
  addValue,
  addVariant,
  updateAttribute,
  removeAttribute,
  updateVariant,
  setVariantOption,
  moveVariant,
}: {
  draft: Product;
  setDraft: (p: Product) => void;
  addAttribute: () => void;
  addValue: (attrId: string) => void;
  addVariant: () => void;
  updateAttribute: (id: string, patch: Partial<ProductAttribute>) => void;
  removeAttribute: (id: string) => void;
  updateVariant: (id: string, patch: Partial<ProductVariant>) => void;
  setVariantOption: (variantId: string, attributeId: string, valueId: string) => void;
  moveVariant: (id: string, dir: -1 | 1) => void;
}) {
  return (
    <div className="space-y-6 pt-5">
      <section>
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold uppercase tracking-wide">Attributs</h3>
          <Button size="sm" variant="outline" onClick={addAttribute}><Plus className="h-4 w-4" /> Attribut</Button>
        </div>
        {draft.attributes.length === 0 ? (
          <p className="mt-3 rounded-lg border border-dashed border-border py-8 text-center text-sm text-muted-foreground">Aucun attribut. Ajoutez « Couleur » ou « Taille » pour créer des variantes.</p>
        ) : (
          <div className="mt-3 space-y-4">
            {draft.attributes.map((attr) => (
              <div key={attr.id} className="rounded-lg border border-border p-4">
                <div className="flex items-start gap-3">
                  <div className="grid flex-1 gap-3 sm:grid-cols-2">
                    <div className="space-y-1">
                      <Label className="text-xs">Nom</Label>
                      <Input value={attr.name} onChange={(e) => updateAttribute(attr.id, { name: e.target.value })} />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Affichage</Label>
                      <Select value={attr.type} onValueChange={(v) => updateAttribute(attr.id, { type: v as ProductAttribute["type"] })}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="swatch">Pastille couleur</SelectItem>
                          <SelectItem value="button">Bouton</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <button aria-label="Supprimer l'attribut" className="mt-6 rounded p-2 text-muted-foreground hover:text-destructive" onClick={() => removeAttribute(attr.id)}>
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>

                <div className="mt-3 space-y-2">
                  {attr.values.map((val) => (
                    <div key={val.id} className="flex items-center gap-2">
                      <Input className="flex-1" value={val.label} onChange={(e) => updateAttribute(attr.id, { values: attr.values.map((v) => (v.id === val.id ? { ...v, label: e.target.value } : v)) })} />
                      {attr.type === "swatch" && (
                        <input type="color" aria-label="Couleur" value={val.hex ?? "#cccccc"} onChange={(e) => updateAttribute(attr.id, { values: attr.values.map((v) => (v.id === val.id ? { ...v, hex: e.target.value } : v)) })} className="h-9 w-12 cursor-pointer rounded border border-border bg-card" />
                      )}
                      <button aria-label="Supprimer la valeur" className="rounded p-2 text-muted-foreground hover:text-destructive" onClick={() => updateAttribute(attr.id, { values: attr.values.filter((v) => v.id !== val.id) })}>
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  ))}
                  <Button size="sm" variant="ghost" onClick={() => addValue(attr.id)}><Plus className="h-4 w-4" /> Ajouter une valeur</Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      <section>
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold uppercase tracking-wide">Variantes</h3>
          <Button size="sm" variant="outline" onClick={addVariant}><Plus className="h-4 w-4" /> Variante</Button>
        </div>
        {draft.variants.length === 0 ? (
          <p className="mt-3 rounded-lg border border-dashed border-border py-8 text-center text-sm text-muted-foreground">Aucune variante — le produit sera vendu en version unique.</p>
        ) : (
          <div className="mt-3 overflow-x-auto rounded-lg border border-border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-16">Ordre</TableHead>
                  {draft.attributes.map((attr) => (<TableHead key={attr.id}>{attr.name}</TableHead>))}
                  <TableHead className="w-28">Prix</TableHead>
                  <TableHead className="w-24">Stock</TableHead>
                  <TableHead className="w-12"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {[...draft.variants].sort((a, b) => (a.position ?? 0) - (b.position ?? 0)).map((v, idx, arr) => (
                  <TableRow key={v.id}>
                    <TableCell>
                      <div className="flex flex-col">
                        <button aria-label="Monter" disabled={idx === 0} className="rounded text-muted-foreground hover:text-foreground disabled:opacity-30" onClick={() => moveVariant(v.id, -1)}>▲</button>
                        <button aria-label="Descendre" disabled={idx === arr.length - 1} className="rounded text-muted-foreground hover:text-foreground disabled:opacity-30" onClick={() => moveVariant(v.id, 1)}>▼</button>
                      </div>
                    </TableCell>
                    {/* SKU is auto-generated by the DB trigger; not editable in the admin form */}
                    {draft.attributes.map((attr) => (
                      <TableCell key={attr.id}>
                        <Select value={v.options[attr.id] ?? ""} onValueChange={(valueId) => setVariantOption(v.id, attr.id, valueId)}>
                          <SelectTrigger className="w-32"><SelectValue placeholder="—" /></SelectTrigger>
                          <SelectContent>{attr.values.map((val) => (<SelectItem key={val.id} value={val.id}>{val.label}</SelectItem>))}</SelectContent>
                        </Select>
                      </TableCell>
                    ))}
                    <TableCell><Input type="number" value={v.price} onChange={(e) => updateVariant(v.id, { price: Number(e.target.value) })} /></TableCell>
                    <TableCell><Input type="number" value={v.stock} onChange={(e) => updateVariant(v.id, { stock: Number(e.target.value) })} /></TableCell>
                    <TableCell>
                      <button aria-label="Supprimer la variante" className="rounded p-1.5 text-muted-foreground hover:text-destructive" onClick={() => setDraft({ ...draft, variants: draft.variants.filter((x) => x.id !== v.id) })}>
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
        <p className="mt-2 text-xs text-muted-foreground">Choisissez la valeur de chaque attribut (ex: Couleur = Rouge) pour identifier la variante. Le SKU est généré automatiquement s'il est laissé vide.</p>
      </section>
    </div>
  );
}
