import React from "react";
import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type { Product, ProductAttribute, ProductVariant } from "@/types";

const isImageUrl = (value?: string) => !!value && (/^https?:\/\//i.test(value) || value.startsWith("data:image/") || value.startsWith("/"));

const resolveImagePreview = (value: { id: string; label: string; image_url?: string }, images: { id: string; url: string; variant_value: string | null }[]) => {
  if (value.image_url && isImageUrl(value.image_url)) return value.image_url;
  const matched = images.find((img) => img.variant_value === value.id);
  if (matched?.url) return matched.url;
  if (isImageUrl(value.label)) return value.label;
  return undefined;
};

export default function AttributesVariants({
  draft,
  setDraft,
  addAttribute,
  addValue,
  removeValue,
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
  removeValue?: (attrId: string, valueId: string) => void;
  addVariant: () => void;
  updateAttribute: (id: string, patch: Partial<ProductAttribute>) => void;
  removeAttribute: (id: string) => void;
  updateVariant: (id: string, patch: Partial<ProductVariant>) => void;
  setVariantOption: (variantId: string, attributeId: string, valueId: string) => void;
  moveVariant: (id: string, dir: -1 | 1) => void;
}) {
  // Supprime une valeur d'attribut. Si le parent nous a passé removeValue (qui
  // nettoie aussi draft.variants[].options), on l'utilise ; sinon on retombe
  // sur une suppression locale équivalente pour ne rien casser si le parent
  // n'a pas encore été mis à jour avec cette prop.
  const handleRemoveValue = (attrId: string, valueId: string) => {
    if (removeValue) {
      removeValue(attrId, valueId);
      return;
    }
    setDraft({
      ...draft,
      attributes: draft.attributes.map((a) =>
        a.id === attrId ? { ...a, values: a.values.filter((v) => v.id !== valueId) } : a
      ),
      variants: draft.variants.map((v) => {
        if (v.options[attrId] !== valueId) return v;
        const { [attrId]: _removed, ...rest } = v.options;
        return { ...v, options: rest };
      }),
    });
  };

  return (
    <div className="space-y-6 pt-5">
      <section>
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold uppercase tracking-wide">Attributs</h3>
          <Button type="button" size="sm" variant="outline" onClick={addAttribute}><Plus className="h-4 w-4" /> Attribut</Button>
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
                          <SelectItem value="image">Image</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <button
                    type="button"
                    aria-label="Supprimer l'attribut"
                    className="mt-6 rounded p-2 text-muted-foreground hover:text-destructive"
                    onClick={(event) => {
                      event.preventDefault();
                      removeAttribute(attr.id);
                    }}
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>

                <div className="mt-3 space-y-2">
                  {attr.values.map((val) => {
                    const imageSrc = attr.type === "image" ? resolveImagePreview(val, draft.images) : undefined;
                    return (
                      <div key={val.id} className="flex items-center gap-2">
                        {attr.type === "image" ? (
                          <>
                            {imageSrc ? (
                              <img src={imageSrc} alt={val.label || "Image de variante"} className="h-10 w-10 rounded border border-border object-cover" />
                            ) : (
                              <div className="grid h-10 w-10 place-items-center rounded border border-dashed border-border bg-muted text-[9px] font-medium text-muted-foreground">
                                IMG
                              </div>
                            )}
                            <Input
                              className="flex-1"
                              value={val.image_url || val.label}
                              onChange={(e) => updateAttribute(attr.id, {
                                values: attr.values.map((v) => (v.id === val.id ? { ...v, label: e.target.value, image_url: e.target.value } : v)),
                              })}
                              placeholder="URL de l'image"
                            />
                          </>
                        ) : (
                          <Input className="flex-1" value={val.label} onChange={(e) => updateAttribute(attr.id, { values: attr.values.map((v) => (v.id === val.id ? { ...v, label: e.target.value } : v)) })} />
                        )}
                        {attr.type === "swatch" && (
                          <input type="color" aria-label="Couleur" value={val.hex ?? "#cccccc"} onChange={(e) => updateAttribute(attr.id, { values: attr.values.map((v) => (v.id === val.id ? { ...v, hex: e.target.value } : v)) })} className="h-9 w-12 cursor-pointer rounded border border-border bg-card" />
                        )}
                        <button
                          type="button"
                          aria-label="Supprimer la valeur"
                          className="rounded p-2 text-muted-foreground hover:text-destructive"
                          onClick={(event) => {
                            event.preventDefault();
                            handleRemoveValue(attr.id, val.id);
                          }}
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    );
                  })}
                  <Button type="button" size="sm" variant="ghost" onClick={() => addValue(attr.id)}><Plus className="h-4 w-4" /> Ajouter une valeur</Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      <section>
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold uppercase tracking-wide">Variantes</h3>
          <Button type="button" size="sm" variant="outline" onClick={addVariant}><Plus className="h-4 w-4" /> Variante</Button>
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
                        <button type="button" aria-label="Monter" disabled={idx === 0} className="rounded text-muted-foreground hover:text-foreground disabled:opacity-30" onClick={() => moveVariant(v.id, -1)}>▲</button>
                        <button type="button" aria-label="Descendre" disabled={idx === arr.length - 1} className="rounded text-muted-foreground hover:text-foreground disabled:opacity-30" onClick={() => moveVariant(v.id, 1)}>▼</button>
                      </div>
                    </TableCell>
                    {/* SKU is auto-generated by the DB trigger; not editable in the admin form */}
                    {draft.attributes.map((attr) => (
                      <TableCell key={attr.id}>
                        {attr.type === "image" ? (
                          <Select value={v.options[attr.id] ?? ""} onValueChange={(valueId) => setVariantOption(v.id, attr.id, valueId)}>
                            <SelectTrigger className="w-32">
                              {(() => {
                                const selectedValue = attr.values.find((val) => val.id === v.options[attr.id]);
                                const selectedImage = selectedValue ? resolveImagePreview(selectedValue, draft.images) : undefined;
                                return selectedImage ? (
                                  <div className="flex items-center gap-2">
                                    <img src={selectedImage} alt={selectedValue?.label || "Image de variante"} className="h-6 w-6 rounded object-cover" />
                                  </div>
                                ) : <SelectValue placeholder="—" />;
                              })()}
                            </SelectTrigger>
                            <SelectContent>
                              {attr.values.map((val) => {
                                const preview = resolveImagePreview(val, draft.images);
                                return (
                                  <SelectItem key={val.id} value={val.id}>
                                    <div className="flex items-center gap-2">
                                      {preview ? <img src={preview} alt={val.label || "Image de variante"} className="h-6 w-6 rounded object-cover" /> : <span className="grid h-6 w-6 place-items-center rounded border border-dashed text-[8px]">IMG</span>}
                                      <span>{val.label || "Image"}</span>
                                    </div>
                                  </SelectItem>
                                );
                              })}
                            </SelectContent>
                          </Select>
                        ) : (
                          <Select value={v.options[attr.id] ?? ""} onValueChange={(valueId) => setVariantOption(v.id, attr.id, valueId)}>
                            <SelectTrigger className="w-32"><SelectValue placeholder="—" /></SelectTrigger>
                            <SelectContent>{attr.values.map((val) => (<SelectItem key={val.id} value={val.id}>{val.label}</SelectItem>))}</SelectContent>
                          </Select>
                        )}
                      </TableCell>
                    ))}
                    <TableCell><Input type="number" value={v.price} onChange={(e) => updateVariant(v.id, { price: Number(e.target.value) })} /></TableCell>
                    <TableCell><Input type="number" value={v.stock} onChange={(e) => updateVariant(v.id, { stock: Number(e.target.value) })} /></TableCell>
                    <TableCell>
                      <button type="button" aria-label="Supprimer la variante" className="rounded p-1.5 text-muted-foreground hover:text-destructive" onClick={() => setDraft({ ...draft, variants: draft.variants.filter((x) => x.id !== v.id) })}>
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