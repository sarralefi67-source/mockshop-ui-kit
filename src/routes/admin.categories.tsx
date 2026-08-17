import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { categories as seedCategories } from "@/data/categories";
import type { Category } from "@/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";

export const Route = createFileRoute("/admin/categories")({
  component: AdminCategories,
});

const empty: Category = {
  id: "", parent_id: null, name: "", slug: "", description: "", position: 1, is_active: true,
};

function AdminCategories() {
  const [list, setList] = useState<Category[]>(seedCategories);
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<Category>(empty);
  const [search, setSearch] = useState("");

  const filtered = list.filter((c) => c.name.toLowerCase().includes(search.toLowerCase()));

  const save = () => {
    if (!draft.name.trim()) {
      toast.error("Le nom est obligatoire.");
      return;
    }
    const slug = draft.slug.trim() || draft.name.toLowerCase().replace(/[^a-z0-9]+/g, "-");
    setList((prev) =>
      draft.id
        ? prev.map((c) => (c.id === draft.id ? { ...draft, slug } : c))
        : [...prev, { ...draft, slug, id: `c-${Date.now()}` }],
    );
    setOpen(false);
    toast.success(draft.id ? "Catégorie mise à jour." : "Catégorie créée.");
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Catégories</h1>
          <p className="text-sm text-muted-foreground">{list.length} catégories sur 3 niveaux.</p>
        </div>
        <div className="flex gap-2">
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Rechercher…"
            className="w-48"
          />
          <Button variant="accent" onClick={() => { setDraft(empty); setOpen(true); }}>
            <Plus className="h-4 w-4" /> Nouvelle catégorie
          </Button>
        </div>
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
              filtered.map((c) => (
                <TableRow key={c.id}>
                  <TableCell className="font-medium">{c.name}</TableCell>
                  <TableCell className="text-muted-foreground">{c.slug}</TableCell>
                  <TableCell className="text-muted-foreground">
                    {list.find((p) => p.id === c.parent_id)?.name ?? "—"}
                  </TableCell>
                  <TableCell>{c.position}</TableCell>
                  <TableCell>
                    <span className={c.is_active ? "text-sm font-medium text-success" : "text-sm text-muted-foreground"}>
                      {c.is_active ? "Active" : "Inactive"}
                    </span>
                  </TableCell>
                  <TableCell className="text-right">
                    <button
                      aria-label="Modifier"
                      className="mr-1 rounded p-1.5 text-muted-foreground hover:bg-surface"
                      onClick={() => { setDraft(c); setOpen(true); }}
                    >
                      <Pencil className="h-4 w-4" />
                    </button>
                    <button
                      aria-label="Supprimer"
                      className="rounded p-1.5 text-muted-foreground hover:bg-surface hover:text-destructive"
                      onClick={() => { setList((p) => p.filter((x) => x.id !== c.id)); toast.success("Catégorie supprimée."); }}
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
            <div className="flex items-center gap-3 sm:col-span-2">
              <Switch checked={draft.is_active} onCheckedChange={(v) => setDraft({ ...draft, is_active: v })} />
              <Label className="font-normal">Catégorie active</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Annuler</Button>
            <Button variant="accent" onClick={save}>Enregistrer</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
