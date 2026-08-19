/*
SQL préalable à exécuter dans Supabase (une seule fois) :

alter table reviews
  add constraint reviews_user_profile_fkey
  foreign key (user_id) references profiles(id) on delete cascade;

alter table profiles add column if not exists email text;
*/

import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/lib/supabaseClient";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { format } from "date-fns";
import { Trash2 } from "lucide-react";
import SortArrow from "@/components/ui/sort-arrow";

export const Route = createFileRoute("/admin/avis")({
  component: AdminAvis,
});

type ReviewRow = {
  id: string;
  product?: { id: string; name?: string | null; sku?: string | null } | null;
  profile?: { id: string; first_name?: string | null; last_name?: string | null; email?: string | null } | null;
  rating: number;
  comment?: string | null;
  is_approved?: boolean | null;
  created_at?: string | null;
};

export default function AdminAvis() {
  const [reviews, setReviews] = useState<ReviewRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [sortDir, setSortDir] = useState<"desc" | "asc">("desc");
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [statusDecision, setStatusDecision] = useState<{ id: string; status: boolean | null | undefined } | null>(null);

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from("reviews")
          // "profile:profiles(...)" fonctionne car reviews.user_id référence maintenant profiles.id
          // (contrainte ajoutée en SQL, voir commentaire en haut du fichier)
          .select(
            `*, product:products(id,name,sku), profile:profiles(id,first_name,last_name,email)`
          )
          .order("created_at", { ascending: false });
        if (error) throw error;
        if (!mounted) return;
        // Normalize rows to match ReviewRow type. Supabase may return SelectQueryError objects
        // for failed embeds; ensure `profile` is either the expected object or null.
        const rows = (data ?? []).map((d: any) => ({
          id: d.id,
          rating: d.rating,
          comment: d.comment ?? null,
          is_approved: d.is_approved ?? null,
          created_at: d.created_at ?? null,
          product: d.product ?? null,
          profile: d && typeof d.profile === "object" && d.profile !== null && !('message' in d.profile) ? {
            id: d.profile.id,
            first_name: d.profile.first_name,
            last_name: d.profile.last_name,
            email: d.profile.email,
          } : null,
        })) as ReviewRow[];
        setReviews(rows);
      } catch (err) {
        console.error("load reviews", err);
        toast.error("Impossible de charger les avis.");
      } finally {
        if (mounted) setLoading(false);
      }
    };
    load();
    return () => { mounted = false; };
  }, []);

  const visible = useMemo(() => {
    const q = String(query ?? "").trim().toLowerCase();
    let out = reviews.slice();
    if (q) {
      out = out.filter((r) => {
        const prod = (r.product?.sku ?? r.product?.name ?? "").toLowerCase();
        const user = (r.profile?.email ?? "").toLowerCase();
        return prod.includes(q) || user.includes(q);
      });
    }
    if (statusFilter === "approved") out = out.filter((r) => r.is_approved === true);
    else if (statusFilter === "rejected") out = out.filter((r) => r.is_approved === false);
    else if (statusFilter === "pending") out = out.filter((r) => r.is_approved === null || r.is_approved === undefined);
    out.sort((a, b) => (sortDir === "desc" ? b.rating - a.rating : a.rating - b.rating));
    return out;
  }, [reviews, query, statusFilter, sortDir]);

  const toggleApproval = async (id: string, to: boolean) => {
    setLoading(true);
    try {
      const { error } = await supabase.from("reviews").update({ is_approved: to }).eq("id", id);
      if (error) throw error;
      setReviews((prev) => prev.map((r) => (r.id === id ? { ...r, is_approved: to } : r)));
      toast.success(to ? "Avis approuvé." : "Avis rejeté.");
    } catch (err) {
      console.error("toggleApproval", err);
      toast.error("Impossible de mettre à jour l'état de l'avis.");
    } finally {
      setLoading(false);
    }
  };

  

  const deleteReview = async (id: string) => {
    if (!id) return;
    setLoading(true);
    try {
      const { error } = await supabase.from("reviews").delete().eq("id", id);
      if (error) throw error;
      setReviews((prev) => prev.filter((r) => r.id !== id));
      toast.success("Avis supprimé.");
    } catch (err) {
      console.error("delete review", err);
      toast.error("Impossible de supprimer l'avis.");
    } finally {
      setLoading(false);
    }
  };

  const formatUser = (r: ReviewRow) => {
    const name = [r.profile?.first_name, r.profile?.last_name].filter(Boolean).join(" ");
    return name || r.profile?.email || "-";
  };

  const openStatusDialog = (id: string, currentStatus: boolean | null | undefined) => {
    setStatusDecision({ id, status: currentStatus });
  };

  const applyStatusDecision = async (nextStatus: boolean) => {
    if (!statusDecision) return;
    await toggleApproval(statusDecision.id, nextStatus);
    setStatusDecision(null);
  };

  return (
    <>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Avis clients</h1>
          <p className="text-sm text-muted-foreground">Modération des avis — approuver ou rejeter avant publication.</p>
        </div>

        <div className="flex items-center gap-3">
          <Input placeholder="Rechercher par SKU produit ou email" value={query} onChange={(e) => setQuery(String(e.target.value))} />
          <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tous</SelectItem>
              <SelectItem value="approved">Approuvé</SelectItem>
              <SelectItem value="pending">En attente</SelectItem>
              <SelectItem value="rejected">Rejeté</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="overflow-x-auto rounded-xl border border-border bg-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Produit</TableHead>
                <TableHead>Utilisateur</TableHead>
                <TableHead>
                  <button
                    type="button"
                    className="inline-flex items-center gap-1 font-medium text-foreground"
                    onClick={() => setSortDir((s) => (s === "desc" ? "asc" : "desc"))}
                  >
                    <span>Note</span>
                    <SortArrow dir={sortDir === "desc" ? "desc" : "asc"} ariaLabel="Trier par note" />
                  </button>
                </TableHead>
                <TableHead>Commentaire</TableHead>
                <TableHead>Créé</TableHead>
                <TableHead>Statut</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {visible.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="py-14 text-center text-muted-foreground">Aucun avis trouvé.</TableCell>
                </TableRow>
              ) : (
                visible.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell className="font-medium">{r.product?.sku ?? r.product?.name ?? "-"}</TableCell>
                    <TableCell className="max-w-xs truncate">{formatUser(r)}</TableCell>
                    <TableCell>{r.rating} / 5</TableCell>
                    <TableCell className="max-w-xl truncate">{r.comment ?? ""}</TableCell>
                    <TableCell>{r.created_at ? format(new Date(r.created_at), "Pp") : "-"}</TableCell>
                    <TableCell>
                      <Button
                        size="sm"
                        variant={r.is_approved === true ? "default" : r.is_approved === false ? "secondary" : "outline"}
                        className={r.is_approved === true ? "bg-green-600 text-white hover:bg-green-700" : r.is_approved === false ? "bg-red-600 text-white hover:bg-red-700" : ""}
                        onClick={() => openStatusDialog(r.id, r.is_approved)}
                        disabled={loading}
                      >
                        {r.is_approved === true ? "Approuvé" : r.is_approved === false ? "Rejeté" : "En attente"}
                      </Button>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button size="sm" variant="ghost" className="text-destructive" onClick={() => setConfirmDeleteId(r.id)} aria-label="Supprimer">
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      {/* Status decision dialog */}
      <Dialog open={Boolean(statusDecision)} onOpenChange={(v) => { if (!v) setStatusDecision(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Publier l'avis ?</DialogTitle>
          </DialogHeader>
          <p>Vous voullez publier cet avis ?</p>
          <DialogFooter className="gap-2 sm:justify-end">
            <Button variant="secondary" className="bg-red-600 text-white hover:bg-red-700" onClick={() => applyStatusDecision(false)} disabled={loading}>Rejeter</Button>
            <Button variant="default" className="bg-green-600 text-white hover:bg-green-700" onClick={() => applyStatusDecision(true)} disabled={loading}>Approuver</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Confirm delete dialog */}
      <Dialog open={Boolean(confirmDeleteId)} onOpenChange={(v) => { if (!v) setConfirmDeleteId(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirmer la suppression</DialogTitle>
          </DialogHeader>
          <p>Voulez-vous vraiment supprimer cet avis ? Cette action est irréversible.</p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmDeleteId(null)}>Annuler</Button>
            <Button variant="accent" className="bg-destructive hover:bg-destructive/90" onClick={async () => { if (confirmDeleteId) { await deleteReview(confirmDeleteId); setConfirmDeleteId(null); } }}>Supprimer</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}