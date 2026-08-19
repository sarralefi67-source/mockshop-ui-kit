import { createFileRoute } from "@tanstack/react-router";
import React, { useEffect, useState, Fragment } from "react";
import { Pencil, Plus, Trash2, Eye, ChevronRight, ChevronDown } from "lucide-react";
import { toast } from "sonner";
// categories seed removed — use live data from Supabase
import type { Category } from "@/types";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/lib/supabaseClient";
import { uploadToBucket, deleteFromBucket } from "@/lib/storage";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";

export const Route = createFileRoute("/admin/categories")({
  component: AdminCategories,
});

const empty: Category = {
  id: "", parent_id: null, name: "", slug: "", description: "", position: 1, is_active: true,
};

const MAX_IMAGE_MB = 5;

function AdminCategories() {
  const { profile } = useAuth();
  const [list, setList] = useState<Category[]>([]);
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<Category>(empty);
  const [search, setSearch] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(true);
  const [dragOver, setDragOver] = useState(false);
  const [imgError, setImgError] = useState<string | null>(null);
  const [viewCategory, setViewCategory] = useState<Category | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [expandedMap, setExpandedMap] = useState<Record<string, boolean>>({});
  const [dragId, setDragId] = useState<string | null>(null);
  const [dragOverId, setDragOverId] = useState<string | null>(null);

  const toggleExpanded = (id: string) => {
    setExpandedMap((s) => ({ ...s, [id]: !s[id] }));
  };

  useEffect(() => {
    let mounted = true;
    async function load() {
      setLoading(true);
      try {
        const { data, error } = await supabase.from("categories").select("*").order("position", { ascending: true });
        if (error) throw error;
        if (!mounted) return;
        // Normalize nullable DB row fields to our `Category` type
        const normalized: Category[] = (data ?? []).map((r: any) => ({
          id: r.id,
          parent_id: r.parent_id ?? null,
          name: r.name,
          slug: r.slug,
          description: r.description ?? null,
          position: r.position ?? 1,
          is_active: typeof r.is_active === "boolean" ? r.is_active : true,
          image_url: r.image_url ?? null,
          created_at: r.created_at ?? undefined,
        }));
        setList(normalized);
      } catch (err) {
        console.error("load categories error:", err);
        setList([]);
        toast.error("Impossible de charger les catégories depuis Supabase.");
      } finally {
        if (mounted) setLoading(false);
      }
    }
    load();
    return () => { mounted = false; };
  }, []);

  const filtered = list.filter((c) => c.name.toLowerCase().includes(search.toLowerCase()));
  const topLevel = filtered.filter((c) => !c.parent_id);

  const renderRow = (c: Category, level = 0) => {
    const children = filtered.filter((x) => x.parent_id === c.id);
    const isExpanded = !!expandedMap[c.id];
    return (
      <>
        <TableRow
          key={c.id}
          draggable
          onDragStart={(e) => {
            e.dataTransfer.setData("text/plain", c.id);
            setDragId(c.id);
          }}
          onDragEnd={() => { setDragId(null); setDragOverId(null); }}
          onDragOver={(e) => { e.preventDefault(); setDragOverId(c.id); }}
          onDragLeave={() => { setDragOverId((s) => (s === c.id ? null : s)); }}
          onDrop={async (e) => {
            e.preventDefault();
            const dragged = e.dataTransfer.getData("text/plain") || dragId;
            if (!dragged || dragged === c.id) return;
            try {
              setLoading(true);
              // move dragged category to become a child of target `c`
              const { error: upErr } = await supabase.from("categories").update({ parent_id: c.id }).eq("id", dragged);
              if (upErr) throw upErr;
              // recompute positions for new parent's children
              const { data: siblings } = await supabase.from("categories").select("id").eq("parent_id", c.id).order("position", { ascending: true });
              if (siblings) {
                for (let i = 0; i < (siblings as any).length; i++) {
                  const id = (siblings as any)[i].id;
                  await supabase.from("categories").update({ position: i + 1 }).eq("id", id);
                }
              }
              // recompute positions for old parent (best-effort)
              const { data: all } = await supabase.from("categories").select("*").order("position", { ascending: true });
              if (all) {
                const normalized: Category[] = (all ?? []).map((r: any) => ({
                  id: r.id,
                  parent_id: r.parent_id ?? null,
                  name: r.name,
                  slug: r.slug,
                  description: r.description ?? null,
                  position: r.position ?? 1,
                  is_active: typeof r.is_active === "boolean" ? r.is_active : true,
                  image_url: r.image_url ?? null,
                  created_at: r.created_at ?? undefined,
                }));
                setList(normalized);
              }
              toast.success("Catégorie déplacée.");
            } catch (err) {
              console.error("drop move error:", err);
              toast.error("Impossible de déplacer la catégorie.");
            } finally {
              setLoading(false);
              setDragId(null);
              setDragOverId(null);
            }
          }}
          className={dragOverId === c.id ? 'bg-accent/5' : undefined}
        >
          <TableCell className="font-medium">
            <div className="flex items-center gap-2">
              {children.length > 0 ? (
                <button type="button" aria-label="Toggle" className="p-1" onClick={() => toggleExpanded(c.id)}>
                  {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                </button>
              ) : <span className="w-4" />}
              <span style={{ paddingLeft: level * 12 }}>{c.name}</span>
            </div>
          </TableCell>
          <TableCell className="text-muted-foreground">{c.slug}</TableCell>
          <TableCell className="text-muted-foreground">{list.find((p) => p.id === c.parent_id)?.name ?? "—"}</TableCell>
          <TableCell>{c.position}</TableCell>
          <TableCell>
            <span className={c.is_active ? "text-sm font-medium text-success" : "text-sm text-muted-foreground"}>
              {c.is_active ? "Active" : "Inactive"}
            </span>
          </TableCell>
          <TableCell className="text-right">
            <button aria-label="Modifier" className="mr-1 rounded p-1.5 text-muted-foreground hover:bg-surface" onClick={() => { setDraft(c); setFile(null); setImgError(null); setOpen(true); }}>
              <Pencil className="h-4 w-4" />
            </button>
            <button aria-label="Voir" className="mr-1 rounded p-1.5 text-muted-foreground hover:bg-surface" onClick={() => setViewCategory(c)}>
              <Eye className="h-4 w-4" />
            </button>
            <button aria-label="Supprimer" className="rounded p-1.5 text-muted-foreground hover:bg-surface hover:text-destructive" onClick={() => setConfirmDeleteId(c.id)}>
              <Trash2 className="h-4 w-4" />
            </button>
          </TableCell>
        </TableRow>
        {isExpanded && children.map((ch) => (
          <Fragment key={ch.id}>{renderRow(ch, level + 1)}</Fragment>
        ))}
      </>
    );
  };

  // Drop zone to move a category to top-level
  const onDropToRoot = async (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    const dragged = e.dataTransfer.getData("text/plain") || dragId;
    if (!dragged) return;
    try {
      setLoading(true);
      const { error } = await supabase.from("categories").update({ parent_id: null }).eq("id", dragged);
      if (error) throw error;
      // recompute positions for top-level
      const { data: tops } = await supabase.from("categories").select("id").is("parent_id", null).order("position", { ascending: true });
      if (tops) {
        for (let i = 0; i < (tops as any).length; i++) {
          const id = (tops as any)[i].id;
          await supabase.from("categories").update({ position: i + 1 }).eq("id", id);
        }
      }
      const { data: all } = await supabase.from("categories").select("*").order("position", { ascending: true });
      if (all) {
        const normalized: Category[] = (all ?? []).map((r: any) => ({
          id: r.id,
          parent_id: r.parent_id ?? null,
          name: r.name,
          slug: r.slug,
          description: r.description ?? null,
          position: r.position ?? 1,
          is_active: typeof r.is_active === "boolean" ? r.is_active : true,
          image_url: r.image_url ?? null,
          created_at: r.created_at ?? undefined,
        }));
        setList(normalized);
      }
      toast.success("Catégorie déplacée en niveau supérieur.");
    } catch (err) {
      console.error("drop to root error:", err);
      toast.error("Impossible de déplacer la catégorie.");
    } finally {
      setLoading(false);
      setDragId(null);
      setDragOverId(null);
    }
  };

  const validateAndSetFile = (f: File | null) => {
    setImgError(null);
    if (!f) {
      setFile(null);
      return;
    }
    if (!f.type.startsWith("image/")) {
      setImgError("Le fichier doit être une image.");
      return;
    }
    if (f.size > MAX_IMAGE_MB * 1024 * 1024) {
      setImgError(`L'image ne doit pas dépasser ${MAX_IMAGE_MB} Mo.`);
      return;
    }
    setFile(f);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setDragOver(false);
    const f = e.dataTransfer.files?.[0] ?? null;
    validateAndSetFile(f);
  };

  const save = async () => {
    if (!draft.name.trim()) {
      toast.error("Le nom est obligatoire.");
      return;
    }
    if (!profile) {
      toast.error("Vous devez être connecté en tant qu'administrateur.");
      return;
    }
    const slug = draft.slug.trim() || draft.name.toLowerCase().replace(/[^a-z0-9]+/g, "-");
    setLoading(true);
    try {
      let imageUrl = draft.image_url ?? null;
      if (file) {
        const filename = `${Date.now()}-${file.name}`;
        const path = `categories/${filename}`;
        imageUrl = await uploadToBucket("categories", path, file);
      }

      if (draft.id) {
        const { error } = await supabase.from("categories").update({
          name: draft.name,
          slug,
          parent_id: draft.parent_id,
          position: draft.position,
          description: draft.description,
          is_active: draft.is_active,
          image_url: imageUrl,
        }).eq("id", draft.id);
        if (error) throw error;
        setList((prev) => prev.map((c) => (c.id === draft.id ? { ...c, name: draft.name, slug, parent_id: draft.parent_id, position: draft.position, description: draft.description, is_active: draft.is_active, image_url: imageUrl } : c)));
        toast.success("Catégorie mise à jour.");
      } else {
        const payload: any = {
          name: draft.name,
          slug,
          parent_id: draft.parent_id,
          position: draft.position,
          description: draft.description,
          is_active: draft.is_active,
        };
        if (imageUrl) payload.image_url = imageUrl;
        const { data, error } = await supabase.from("categories").insert(payload).select().maybeSingle();
        if (error) throw error;
        if (data) {
          const row = data as any;
          const created: Category = {
            id: row.id,
            parent_id: row.parent_id ?? null,
            name: row.name,
            slug: row.slug,
            description: row.description ?? null,
            position: row.position ?? 1,
            is_active: typeof row.is_active === "boolean" ? row.is_active : true,
            image_url: row.image_url ?? null,
            created_at: row.created_at ?? undefined,
          };
          setList((prev) => [...prev, created]);
        }
        toast.success("Catégorie créée.");
      }
      setOpen(false);
      setFile(null);
      setImgError(null);
    } catch (err) {
      console.error("save category error:", err);
      toast.error("Impossible d'enregistrer la catégorie.");
    } finally {
      setLoading(false);
    }
  };

  const removeImage = async () => {
    if (!draft.image_url) {
      setFile(null);
      setDraft({ ...draft, image_url: null });
      return;
    }
    if (!profile) {
      toast.error("Action non autorisée.");
      return;
    }
    setLoading(true);
    try {
      // try to extract bucket/path from public URL: /storage/v1/object/public/<bucket>/<path>
      const m = draft.image_url.match(/\/storage\/v1\/object\/public\/([^/]+)\/(.+)$/);
      if (m) {
        const bucket = m[1]!;
        const path = decodeURIComponent(m[2]!);
        await deleteFromBucket(bucket, path);
      }
      if (draft.id) {
        const { error } = await supabase.from("categories").update({ image_url: null }).eq("id", draft.id);
        if (error) throw error;
      }
      setDraft({ ...draft, image_url: null });
      setFile(null);
      toast.success("Image supprimée.");
    } catch (err) {
      console.error("remove image error:", err);
      toast.error("Impossible de supprimer l'image.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="space-y-3">
        <div>
          <h1 className="text-2xl font-bold">Catégories</h1>
          <p className="text-sm text-muted-foreground">{list.length} catégories sur 3 niveaux.</p>
        </div>

        <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-wrap items-center gap-2">
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Rechercher…"
              className="w-full sm:w-72"
            />
          </div>

          <Button
            variant="accent"
            onClick={() => { setDraft(empty); setFile(null); setImgError(null); setOpen(true); }}
            className="ml-auto"
          >
            <Plus className="h-4 w-4" /> Nouvelle catégorie
          </Button>
        </div>
      </div>

      <div
        className={`mb-3 rounded-md border border-dashed p-3 text-center text-sm text-muted-foreground ${dragId ? 'bg-accent/5 border-accent' : ''}`}
        onDragOver={(e) => e.preventDefault()}
        onDrop={onDropToRoot}
      >
        Glisser-déposer ici pour déplacer en niveau supérieur
      </div>

      <div className="overflow-x-auto rounded-xl border border-border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nom</TableHead>
              <TableHead>Slug</TableHead>
              <TableHead>Parent</TableHead>
              <TableHead className="w-20">Ordre</TableHead>
              <TableHead className="w-24">Statut</TableHead>
              <TableHead className="w-24 text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="py-14 text-center text-muted-foreground">
                  Aucune catégorie ne correspond à cette recherche.
                </TableCell>
              </TableRow>
            ) : (
              topLevel.map((c) => renderRow(c))
            )}
          </TableBody>
        </Table>
      </div>

      {/* View category dialog */}
      <Dialog open={Boolean(viewCategory)} onOpenChange={(v) => { if (!v) setViewCategory(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{viewCategory ? viewCategory.name : ""}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              {viewCategory?.image_url ? (
                <Avatar>
                  <AvatarImage src={viewCategory.image_url} alt={viewCategory.name} />
                </Avatar>
              ) : (
                <Avatar>
                  <AvatarFallback>{viewCategory?.name.slice(0, 1)}</AvatarFallback>
                </Avatar>
              )}
            </div>
            <p className="text-sm text-muted-foreground">{viewCategory?.description}</p>
            <p className="text-sm">Parent: {list.find((p) => p.id === viewCategory?.parent_id)?.name ?? "—"}</p>
            <p className="text-sm">Position: {viewCategory?.position}</p>
            <p className={viewCategory?.is_active ? "text-sm font-medium text-success" : "text-sm text-muted-foreground"}>{viewCategory?.is_active ? "Active" : "Inactive"}</p>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setViewCategory(null)}>Fermer</Button>
              <Button variant="accent" onClick={() => { if (viewCategory) { setDraft(viewCategory); setOpen(true); setViewCategory(null); } }}>Éditer</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Confirm delete dialog for categories */}
      <Dialog open={Boolean(confirmDeleteId)} onOpenChange={(v) => { if (!v) setConfirmDeleteId(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirmer la suppression</DialogTitle>
          </DialogHeader>
          <p>Voulez-vous vraiment supprimer cette catégorie ?</p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmDeleteId(null)}>Annuler</Button>
            <Button variant="accent" className="bg-destructive hover:bg-destructive/90" onClick={async () => {
              const id = confirmDeleteId;
              if (!id) return;
              try {
                // fetch category to get image url
                const { data: catData, error: catErr } = await supabase.from("categories").select("image_url").eq("id", id).maybeSingle();
                if (catErr) throw catErr;
                const imageUrl = (catData as any)?.image_url as string | undefined;
                if (imageUrl) {
                  const m = imageUrl.match(/\/storage\/v1\/object\/public\/([^/]+)\/(.+)$/);
                  if (m) {
                    const bucket = m[1]!;
                    const path = decodeURIComponent(m[2]!);
                    try { await deleteFromBucket(bucket, path); } catch (e) { console.warn("failed to delete category image", e); }
                  }
                }
                const { error } = await supabase.from("categories").delete().eq("id", id);
                if (error) throw error;
                setList((p) => p.filter((x) => x.id !== id));
                toast.success("Catégorie supprimée.");
              } catch (err) {
                console.error("delete category error:", err);
                toast.error("Impossible de supprimer la catégorie.");
              } finally {
                setConfirmDeleteId(null);
              }
            }}>Supprimer</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{draft.id ? "Modifier la catégorie" : "Nouvelle catégorie"}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Nom</Label>
              <Input value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>Slug</Label>
              <Input value={draft.slug} onChange={(e) => setDraft({ ...draft, slug: e.target.value })} placeholder="auto" />
            </div>
            <div className="space-y-2">
              <Label>Catégorie parente</Label>
              <Select
                value={draft.parent_id ?? "none"}
                onValueChange={(v) => setDraft({ ...draft, parent_id: v === "none" ? null : v })}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent className="max-h-72">
                  <SelectItem value="none">Aucune (niveau 1)</SelectItem>
                  {list.filter((c) => c.id !== draft.id).map((c) => (
                    <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Position</Label>
              <Input
                type="number"
                value={draft.position}
                onChange={(e) => setDraft({ ...draft, position: Number(e.target.value) })}
              />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label>Description</Label>
              <Input value={draft.description ?? ""} onChange={(e) => setDraft({ ...draft, description: e.target.value })} />
            </div>

            <div className="space-y-2 sm:col-span-2">
              <Label>Image (optionnelle)</Label>

              {!file && !draft.image_url ? (
                <div
                  onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                  onDragLeave={() => setDragOver(false)}
                  onDrop={handleDrop}
                  onClick={() => document.getElementById("category-image-input")?.click()}
                  className={`flex cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed p-6 text-center transition-colors ${
                    dragOver ? "border-accent bg-accent/5" : "border-border hover:bg-surface"
                  }`}
                >
                  <p className="text-sm font-medium">Glissez-déposez une image ici</p>
                  <p className="text-xs text-muted-foreground">ou cliquez pour parcourir · JPG, PNG · {MAX_IMAGE_MB} Mo max</p>
                  <input
                    id="category-image-input"
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => validateAndSetFile(e.target.files?.[0] ?? null)}
                  />
                </div>
              ) : (
                <div className="flex items-start gap-3">
                  <img
                    src={file ? URL.createObjectURL(file) : draft.image_url ?? ""}
                    alt="preview"
                    className="h-24 w-24 rounded object-cover"
                  />
                  <div className="flex flex-col items-start gap-2">
                    {file && <span className="text-xs text-muted-foreground">Image en attente d'envoi</span>}
                    <button type="button" className="text-sm text-destructive" onClick={removeImage}>
                      Supprimer l'image
                    </button>
                    <button
                      type="button"
                      className="text-sm text-muted-foreground underline"
                      onClick={() => document.getElementById("category-image-input-replace")?.click()}
                    >
                      Remplacer
                    </button>
                    <input
                      id="category-image-input-replace"
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => validateAndSetFile(e.target.files?.[0] ?? null)}
                    />
                  </div>
                </div>
              )}

              {imgError && <p className="text-xs text-destructive">{imgError}</p>}
            </div>

            <div className="flex items-center gap-3 sm:col-span-2">
              <Switch checked={draft.is_active} onCheckedChange={(v) => setDraft({ ...draft, is_active: v })} />
              <Label className="font-normal">Catégorie active</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Annuler</Button>
            <Button variant="accent" onClick={save} disabled={loading}>Enregistrer</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}