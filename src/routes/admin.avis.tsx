/*
SQL préalable à exécuter dans Supabase (une seule fois) :

alter table reviews
  add constraint reviews_user_profile_fkey
  foreign key (user_id) references profiles(id) on delete cascade;

alter table profiles add column if not exists email text;

alter table public.reviews
  alter column is_approved drop not null;

alter table public.reviews
  alter column is_approved set default null;
*/

import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/lib/supabaseClient";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { format } from "date-fns";
import { CheckCircle2, Clock3, Eye, Trash2, XCircle } from "lucide-react";
import SortArrow from "@/components/ui/sort-arrow";
import Spinner from "@/components/ui/spinner";
import { takeAdminFocus } from "@/lib/admin-focus";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";

export const Route = createFileRoute("/admin/avis")({
  // `?review=<uuid>` : lien profond depuis les notifications, qui ouvre
  // directement le détail de l'avis concerné.
  validateSearch: (search: Record<string, unknown>): { review?: string } =>
    typeof search["review"] === "string" ? { review: search["review"] } : {},
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

function AdminAvis() {
  const [reviews, setReviews] = useState<ReviewRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [sortDir, setSortDir] = useState<"desc" | "asc">("desc");
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [selectedReviewIds, setSelectedReviewIds] = useState<string[]>([]);
  const [confirmDeleteIds, setConfirmDeleteIds] = useState<string[]>([]);
  const [isBulkDeleting, setIsBulkDeleting] = useState(false);
  const [updatingReviewId, setUpdatingReviewId] = useState<string | null>(null);
  const [updatingStatusAction, setUpdatingStatusAction] = useState<"approve" | "reject" | "pending" | null>(null);
  const [statusDecision, setStatusDecision] = useState<{ id: string; status: boolean | null | undefined } | null>(null);
  const [reviewDetails, setReviewDetails] = useState<ReviewRow | null>(null);
  const { review: focusReviewId } = Route.useSearch();
  // Cible transmise par la boîte de réception (cf. lib/admin-focus).
  const [relayFocus, setRelayFocus] = useState<Record<string, string> | null>(null);
  useEffect(() => {
    setRelayFocus(takeAdminFocus("/admin/avis"));
  }, []);
  const navigate = useNavigate();
  const [currentPage, setCurrentPage] = useState(1);

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

  // Une fois les avis chargés, on ouvre celui visé par la notification puis on
  // retire le paramètre : refermer le détail ne doit pas le rouvrir au
  // rafraîchissement de la page.
  useEffect(() => {
    const wantedId = focusReviewId ?? relayFocus?.["review"];
    if (!wantedId) return;
    const target = reviews.find((r) => r.id === wantedId);
    if (!target) return;
    setReviewDetails(target);
    setRelayFocus(null);
    navigate({ to: "/admin/avis", search: {}, replace: true });
  }, [focusReviewId, relayFocus, reviews, navigate]);

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

  const pageSize = 10;
  const totalPages = Math.max(1, Math.ceil(visible.length / pageSize));
  const pageReviews = visible.slice((currentPage - 1) * pageSize, currentPage * pageSize);
  const pageStart = (currentPage - 1) * pageSize + 1;
  const pageEnd = Math.min(currentPage * pageSize, visible.length);

  useEffect(() => {
    setCurrentPage(1);
  }, [query, statusFilter, sortDir]);

  useEffect(() => {
    if (currentPage > totalPages) setCurrentPage(totalPages);
  }, [currentPage, totalPages]);

  const allVisibleSelected = visible.length > 0 && visible.every((review) => selectedReviewIds.includes(review.id));

  const toggleReviewSelection = (id: string, checked: boolean) => {
    setSelectedReviewIds((prev) => checked ? [...new Set([...prev, id])] : prev.filter((reviewId) => reviewId !== id));
  };

  const toggleAllVisibleReviews = (checked: boolean) => {
    if (checked) {
      setSelectedReviewIds((prev) => [...new Set([...prev, ...visible.map((review) => review.id)])]);
    } else {
      const visibleIds = new Set(visible.map((review) => review.id));
      setSelectedReviewIds((prev) => prev.filter((id) => !visibleIds.has(id)));
    }
  };

  const toggleApproval = async (id: string, to: boolean | null) => {
    setUpdatingReviewId(id);
    try {
      const { error } = await supabase.from("reviews").update({ is_approved: to }).eq("id", id);
      if (error) throw error;
      setReviews((prev) => prev.map((r) => (r.id === id ? { ...r, is_approved: to } : r)));
      setReviewDetails((prev) => (prev && prev.id === id ? { ...prev, is_approved: to } : prev));
      if (to === null) {
        toast.success("Avis remis en attente.");
      } else {
        toast.success(to ? "Avis approuvé." : "Avis rejeté.");
      }
    } catch (err) {
      console.error("toggleApproval", err);
      toast.error("Impossible de mettre à jour l'état de l'avis.");
    } finally {
      setUpdatingReviewId(null);
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

  const deleteSelectedReviews = async () => {
    if (confirmDeleteIds.length === 0) return;
    setIsBulkDeleting(true);
    setLoading(true);
    try {
      const { error } = await supabase.from("reviews").delete().in("id", confirmDeleteIds);
      if (error) throw error;
      const deletedIds = new Set(confirmDeleteIds);
      setReviews((prev) => prev.filter((review) => !deletedIds.has(review.id)));
      setSelectedReviewIds((prev) => prev.filter((id) => !deletedIds.has(id)));
      toast.success(`${confirmDeleteIds.length} avis supprimé${confirmDeleteIds.length > 1 ? "s" : ""}.`);
    } catch (err) {
      console.error("delete selected reviews", err);
      toast.error("Impossible de supprimer les avis sélectionnés.");
    } finally {
      setIsBulkDeleting(false);
      setLoading(false);
      setConfirmDeleteIds([]);
    }
  };

  const formatUser = (r: ReviewRow) => {
    const name = [r.profile?.first_name, r.profile?.last_name].filter(Boolean).join(" ");
    return name || r.profile?.email || "-";
  };

  const truncateComment = (comment: string | null | undefined) => {
    const words = (comment ?? "").trim().split(/\s+/).filter(Boolean);
    return words.length > 5 ? `${words.slice(0, 5).join(" ")}...` : words.join(" ");
  };

  const openStatusDialog = (id: string, currentStatus: boolean | null | undefined) => {
    setStatusDecision({ id, status: currentStatus });
  };

  const applyStatusDecision = async (nextStatus: boolean | null) => {
    if (!statusDecision) return;
    setUpdatingStatusAction(nextStatus === true ? "approve" : nextStatus === false ? "reject" : "pending");
    try {
      await toggleApproval(statusDecision.id, nextStatus);
      setStatusDecision(null);
    } finally {
      setUpdatingStatusAction(null);
    }
  };

  return (
    <>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Avis clients ({reviews.length})</h1>
          <p className="text-sm text-muted-foreground">Modération des avis : approuver ou rejeter avant publication.</p>
        </div>

        <div className="mt-8 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-wrap items-center gap-2">
            <Input className="w-64 sm:w-80" placeholder="Rechercher par SKU produit ou email" value={query} onChange={(e) => setQuery(String(e.target.value))} />
            <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v)}>
              <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous</SelectItem>
                <SelectItem value="approved">Approuvé</SelectItem>
                <SelectItem value="pending">En attente</SelectItem>
                <SelectItem value="rejected">Rejeté</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        {selectedReviewIds.length > 0 && (
          <div className="mt-3 mb-3">
            <Button variant="destructive" onClick={() => setConfirmDeleteIds(selectedReviewIds)} disabled={loading}>
              <Trash2 className="h-4 w-4" /> Supprimer ({selectedReviewIds.length})
            </Button>
          </div>
        )}

        <div className="overflow-x-auto rounded-xl border border-border bg-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12">
                  <Checkbox
                    checked={allVisibleSelected}
                    onCheckedChange={(checked) => toggleAllVisibleReviews(checked === true)}
                    aria-label="Sélectionner tous les avis visibles"
                    disabled={loading || visible.length === 0}
                  />
                </TableHead>
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
              {loading && reviews.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="py-14 text-center">
                    <div className="flex justify-center">
                      <Spinner showLabel label="Chargement des avis..." />
                    </div>
                  </TableCell>
                </TableRow>
              ) : visible.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="py-14 text-center text-muted-foreground">Aucun avis trouvé.</TableCell>
                </TableRow>
              ) : (
                pageReviews.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell>
                      <Checkbox
                        checked={selectedReviewIds.includes(r.id)}
                        onCheckedChange={(checked) => toggleReviewSelection(r.id, checked === true)}
                        aria-label={`Sélectionner l'avis ${r.id}`}
                        disabled={loading}
                      />
                    </TableCell>
                    <TableCell className="font-medium">{r.product?.sku ?? r.product?.name ?? "-"}</TableCell>
                    <TableCell className="max-w-xs truncate">{formatUser(r)}</TableCell>
                    <TableCell>{r.rating} / 5</TableCell>
                    <TableCell className="max-w-xl">{truncateComment(r.comment)}</TableCell>
                    <TableCell>{r.created_at ? format(new Date(r.created_at), "Pp") : "-"}</TableCell>
                    <TableCell>
                      <Button
                        size="sm"
                        variant="outline"
                        className={r.is_approved === true
                          ? "gap-1.5 border-green-200 bg-green-50 text-green-700 hover:bg-green-100 hover:text-green-800"
                          : r.is_approved === false
                            ? "gap-1.5 border-red-200 bg-red-50 text-red-700 hover:bg-red-100 hover:text-red-800"
                            : "gap-1.5 border-amber-200 bg-amber-50 text-amber-700 hover:bg-amber-100 hover:text-amber-800"}
                        onClick={() => openStatusDialog(r.id, r.is_approved)}
                        disabled={loading || updatingReviewId !== null}
                      >
                        {updatingReviewId === r.id ? (
                          <Spinner className="h-4 w-4" />
                        ) : r.is_approved === true ? (
                          <CheckCircle2 className="h-4 w-4" />
                        ) : r.is_approved === false ? (
                          <XCircle className="h-4 w-4" />
                        ) : (
                          <Clock3 className="h-4 w-4" />
                        )}
                        {r.is_approved === true ? "Approuvé" : r.is_approved === false ? "Rejeté" : "En attente"}
                      </Button>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button size="sm" variant="outline" onClick={() => setReviewDetails(r)} aria-label="Voir l'avis">
                          <Eye className="h-4 w-4" />
                        </Button>
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

        {visible.length > 0 && (
          <div className="flex items-center justify-between gap-4">
            <span className="text-sm text-foreground">
              {pageStart}–{pageEnd} sur {visible.length}
            </span>
            <Pagination className="mx-0 w-auto justify-end text-foreground">
              <PaginationContent>
                <PaginationItem>
                  <PaginationPrevious
                    href="#"
                    className={currentPage === 1 ? "pointer-events-none opacity-50 text-foreground" : "text-foreground"}
                    onClick={(event) => {
                      event.preventDefault();
                      setCurrentPage((page) => Math.max(1, page - 1));
                    }}
                    aria-disabled={currentPage === 1}
                  />
                </PaginationItem>
                {Array.from({ length: totalPages }, (_, index) => index + 1).map((page) => (
                  <PaginationItem key={page}>
                    <PaginationLink
                      href="#"
                      isActive={currentPage === page}
                      className="text-foreground"
                      onClick={(event) => {
                        event.preventDefault();
                        setCurrentPage(page);
                      }}
                    >
                      {page}
                    </PaginationLink>
                  </PaginationItem>
                ))}
                <PaginationItem>
                  <PaginationNext
                    href="#"
                    className={currentPage === totalPages ? "pointer-events-none opacity-50 text-foreground" : "text-foreground"}
                    onClick={(event) => {
                      event.preventDefault();
                      setCurrentPage((page) => Math.min(totalPages, page + 1));
                    }}
                    aria-disabled={currentPage === totalPages}
                  />
                </PaginationItem>
              </PaginationContent>
            </Pagination>
          </div>
        )}
      </div>

      {/* Review details dialog */}
      <Dialog open={Boolean(reviewDetails)} onOpenChange={(open) => { if (!open) setReviewDetails(null); }}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Détail de l'avis</DialogTitle>
          </DialogHeader>
          {reviewDetails && (
            <div className="space-y-4 text-sm">
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <p className="text-muted-foreground">Produit</p>
                  <p className="font-semibold">{reviewDetails.product?.sku ?? reviewDetails.product?.name ?? "-"}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Utilisateur</p>
                  <p className="font-semibold">{formatUser(reviewDetails)}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Note</p>
                  <p className="font-semibold">{reviewDetails.rating} / 5</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Statut</p>
                  <Select
                    value={reviewDetails.is_approved === true ? "approved" : reviewDetails.is_approved === false ? "rejected" : "pending"}
                    onValueChange={(value) => {
                      const nextStatus = value === "approved" ? true : value === "rejected" ? false : null;
                      if (nextStatus !== reviewDetails.is_approved) {
                        setStatusDecision({ id: reviewDetails.id, status: nextStatus });
                      }
                    }}
                  >
                    <SelectTrigger className="mt-1 w-36">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pending">En attente</SelectItem>
                      <SelectItem value="approved">Approuvé</SelectItem>
                      <SelectItem value="rejected">Rejeté</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div>
                <p className="text-muted-foreground">Commentaire</p>
                <p className="mt-1 whitespace-pre-wrap rounded-md border border-border bg-muted/30 p-3">
                  {reviewDetails.comment || "Aucun commentaire"}
                </p>
              </div>
              <div>
                <p className="text-muted-foreground">Date</p>
                <p className="font-semibold">{reviewDetails.created_at ? format(new Date(reviewDetails.created_at), "Pp") : "-"}</p>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Bulk delete dialog */}
      <Dialog open={confirmDeleteIds.length > 0} onOpenChange={(open) => { if (!open && !isBulkDeleting) setConfirmDeleteIds([]); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Supprimer les avis sélectionnés ?</DialogTitle>
          </DialogHeader>
          <p>Voulez-vous vraiment supprimer {confirmDeleteIds.length} avis ? Cette action est irréversible.</p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmDeleteIds([])} disabled={isBulkDeleting}>Annuler</Button>
            <Button variant="destructive" onClick={deleteSelectedReviews} disabled={isBulkDeleting}>
              {isBulkDeleting ? <Spinner className="h-4 w-4" /> : <><Trash2 className="h-4 w-4" /> Supprimer</>}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Status decision dialog */}
      <Dialog open={Boolean(statusDecision)} onOpenChange={(v) => { if (!v) setStatusDecision(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Modifier le statut de l'avis</DialogTitle>
          </DialogHeader>
          <p>Choisissez le nouveau statut de cet avis.</p>
          <DialogFooter className="gap-2 sm:justify-end">
           
            <Button variant="secondary" className="bg-red-600 text-white hover:bg-red-700" onClick={() => applyStatusDecision(false)} disabled={updatingReviewId !== null}>
              {updatingStatusAction === "reject" ? <Spinner className="h-4 w-4" /> : "Rejeter"}
            </Button>
            <Button variant="default" className="bg-green-600 text-white hover:bg-green-700" onClick={() => applyStatusDecision(true)} disabled={updatingReviewId !== null}>
              {updatingStatusAction === "approve" ? <Spinner className="h-4 w-4" /> : "Approuver"}
            </Button>
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
            <Button variant="outline" onClick={() => setConfirmDeleteId(null)} disabled={loading}>Annuler</Button>
            <Button
              variant="accent"
              className="bg-destructive hover:bg-destructive/90"
              onClick={async () => { if (confirmDeleteId) { await deleteReview(confirmDeleteId); setConfirmDeleteId(null); } }}
              disabled={loading}
            >
              {loading ? <Spinner className="h-4 w-4" /> : "Supprimer"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}