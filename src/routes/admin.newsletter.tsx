/*
SQL to create the newsletter_subscribers table (run in Supabase):

create table public.newsletter_subscribers (
  id uuid not null default gen_random_uuid (),
  email text not null,
  is_active boolean null default true,
  subscribed_at timestamp with time zone null default now(),
  constraint newsletter_subscribers_pkey primary key (id),
  constraint newsletter_subscribers_email_key unique (email)
) TABLESPACE pg_default;

*/

import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState, useMemo } from "react";
import { supabase } from "@/lib/supabaseClient";
import { toast } from "sonner";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import { Download, Power, Trash2 } from "lucide-react";
import { format } from "date-fns";
import { jsPDF } from "jspdf";

export const Route = createFileRoute("/admin/newsletter")({ component: AdminNewsletter });

type Subscriber = {
  id: string;
  email: string;
  is_active?: boolean | null;
  subscribed_at?: string | null;
};

function LoadingTableRow() {
  return (
    <TableRow>
      <TableCell colSpan={5} className="py-14 text-center">
        <div className="inline-flex items-center gap-2 text-muted-foreground">
          <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
          Chargement des abonnés...
        </div>
      </TableCell>
    </TableRow>
  );
}

function AdminNewsletter() {
  const [subs, setSubs] = useState<Subscriber[]>([]);
  const [loading, setLoading] = useState(false);
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "inactive">("all");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [confirmSelectedDelete, setConfirmSelectedDelete] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [confirmStatusId, setConfirmStatusId] = useState<string | null>(null);
  const [updatingStatusId, setUpdatingStatusId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [deletingSelected, setDeletingSelected] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      setLoading(true);
        try {
        const { data, error } = await supabase.from("newsletter_subscribers").select("*").order("subscribed_at", { ascending: false });
        console.debug("[admin.newsletter] supabase load result:", { data, error });
        if (error) throw error;
        if (!mounted) return;
        setErrorMsg(null);
        setSubs((data ?? []) as Subscriber[]);
      } catch (err) {
          console.error("load newsletter subscribers", err);
          const msg = (err as any)?.message ?? String(err ?? "Erreur inconnue");
          setErrorMsg("Erreur de chargement : " + msg);
          toast.error("Impossible de charger la liste des abonnés.");
      } finally {
        if (mounted) setLoading(false);
      }
    };
    load();
    return () => { mounted = false; };
  }, []);

  const toggleActive = async (s: Subscriber) => {
    setUpdatingStatusId(s.id);
    try {
      const { error } = await supabase.from("newsletter_subscribers").update({ is_active: !s.is_active }).eq("id", s.id);
      if (error) throw error;
      setSubs((prev) => prev.map((x) => (x.id === s.id ? { ...x, is_active: !s.is_active } : x)));
    } catch (err) {
      console.error("toggleActive subscriber", err);
      toast.error("Impossible de mettre à jour l'abonné.");
    } finally {
      setUpdatingStatusId(null);
    }
  };

  const deleteSubscriber = async (id: string) => {
    if (!id) return;
    setDeletingId(id);
    try {
      const { error } = await supabase.from("newsletter_subscribers").delete().eq("id", id);
      if (error) throw error;
      setSubs((prev) => prev.filter((x) => x.id !== id));
      toast.success("Abonné supprimé.");
    } catch (err) {
      console.error("delete subscriber", err);
      toast.error("Impossible de supprimer l'abonné.");
    } finally {
      setDeletingId(null);
    }
  };

  const visible = useMemo(() => {
    const q = String(query ?? "").trim().toLowerCase();
    return subs.filter((s) => {
      const matchesQuery = !q || s.email.toLowerCase().includes(q);
      const matchesStatus =
        statusFilter === "all" || (statusFilter === "active" ? s.is_active === true : s.is_active !== true);
      return matchesQuery && matchesStatus;
    });
  }, [subs, query, statusFilter]);

  const pageSize = 10;
  const totalPages = Math.max(1, Math.ceil(visible.length / pageSize));
  const pageItems = visible.slice((currentPage - 1) * pageSize, currentPage * pageSize);
  const pageStart = (currentPage - 1) * pageSize + 1;
  const pageEnd = Math.min(currentPage * pageSize, visible.length);
  const pageItemIds = pageItems.map((subscriber) => subscriber.id);
  const allPageItemsSelected = pageItemIds.length > 0 && pageItemIds.every((id) => selectedIds.includes(id));

  useEffect(() => {
    setCurrentPage(1);
    setSelectedIds([]);
  }, [query, statusFilter]);

  useEffect(() => {
    if (currentPage > totalPages) setCurrentPage(totalPages);
  }, [currentPage, totalPages]);

  const toggleSelected = (id: string) => {
    setSelectedIds((current) => current.includes(id) ? current.filter((selectedId) => selectedId !== id) : [...current, id]);
  };

  const togglePageSelection = (checked: boolean) => {
    setSelectedIds((current) => {
      if (checked) return Array.from(new Set([...current, ...pageItemIds]));
      return current.filter((id) => !pageItemIds.includes(id));
    });
  };

  const deleteSelected = async () => {
    if (selectedIds.length === 0) return;
    setDeletingSelected(true);
    try {
      const { error } = await supabase.from("newsletter_subscribers").delete().in("id", selectedIds);
      if (error) throw error;
      setSubs((current) => current.filter((subscriber) => !selectedIds.includes(subscriber.id)));
      setSelectedIds([]);
      toast.success("Abonnés supprimés.");
    } catch (err) {
      console.error("delete selected subscribers", err);
      toast.error("Impossible de supprimer les abonnés sélectionnés.");
    } finally {
      setDeletingSelected(false);
    }
  };

  const exportPDF = (source = visible) => {
    if (!source || source.length === 0) {
      toast.error("Aucun abonné à exporter.");
      return;
    }

    const doc = new jsPDF();
    doc.setFontSize(16);
    doc.text("Newsletter - Abonnés", 14, 18);
    doc.setFontSize(10);

    const headers = ["#", "Email", "Statut", "Date"];
    const xPositions = [14, 28, 120, 170];
    let y = 30;

    const drawHeader = () => {
      doc.setFillColor(240, 240, 240);
      doc.rect(12, y - 5, 186, 10, "F");
      headers.forEach((header, index) => {
        const x = Number(xPositions[index] ?? 14);
        doc.text(header, x, y);
      });
      y += 10;
    };

    drawHeader();

    source.forEach((s, index) => {
      if (y > 260) {
        doc.addPage();
        y = 20;
        drawHeader();
      }

      const status = s.is_active ? "Actif" : "Désabonné";
      const date = s.subscribed_at ? format(new Date(s.subscribed_at), "dd/MM/yyyy") : "-";
      const emailLines = doc.splitTextToSize(s.email, 82);
      const lineCount = Math.max(1, emailLines.length);
      const rowHeight = 8 * lineCount;

      doc.setDrawColor(220, 220, 220);
      doc.line(12, y + rowHeight - 2, 198, y + rowHeight - 2);

      doc.text(String(index + 1), Number(xPositions[0] ?? 14), y + 6);
      doc.text(emailLines, Number(xPositions[1] ?? 28), y + 6);
      doc.text(status, Number(xPositions[2] ?? 120), y + 6);
      doc.text(date, Number(xPositions[3] ?? 170), y + 6);

      y += rowHeight + 2;
    });

    doc.save(`newsletter_subscribers_${new Date().toISOString().slice(0, 10)}.pdf`);
    toast.success("PDF exporté.");
  };

  return (
    <div className="space-y-6">
      <div className="space-y-3">
        <div>
          <h1 className="text-2xl font-bold">Newsletter</h1>
          <p className="text-sm text-muted-foreground">Liste des abonnés à la newsletter.</p>
        </div>

        <div className="mt-8 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-col gap-2">
            <div className="flex flex-wrap gap-2">
              <Input
                placeholder="Rechercher par email"
                value={query}
                onChange={(e) => setQuery(String(e.target.value))}
                className="w-80 sm:w-96"
              />
              <Select
                value={statusFilter}
                onValueChange={(value) => setStatusFilter(value as "all" | "active" | "inactive")}
              >
                <SelectTrigger className="w-48" aria-label="Filtrer par statut">
                  <SelectValue placeholder="Filtrer par statut" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tous les statuts</SelectItem>
                  <SelectItem value="active">Actifs</SelectItem>
                  <SelectItem value="inactive">Désabonnés</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {selectedIds.length > 0 && (
              <Button
                variant="accent"
                onClick={() => setConfirmSelectedDelete(true)}
                className="w-fit bg-destructive hover:bg-destructive/90"
              >
                <Trash2 className="h-4 w-4" /> Supprimer ({selectedIds.length})
              </Button>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Button variant="accent" onClick={() => exportPDF()} className="whitespace-nowrap">
              <Download className="h-4 w-4" /> Exporter PDF
            </Button>
          </div>
        </div>
      </div>
      {errorMsg && (
        <div className="rounded-md border border-destructive/20 bg-destructive/5 p-3 text-sm text-destructive">{errorMsg}</div>
      )}

      <div className="overflow-x-auto rounded-xl border border-border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-12">
                <Checkbox
                  checked={allPageItemsSelected}
                  onCheckedChange={(checked) => togglePageSelection(checked === true)}
                  disabled={loading || pageItems.length === 0 || updatingStatusId !== null || deletingId !== null || deletingSelected}
                  aria-label="Sélectionner les abonnés de la page"
                />
              </TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Date d'inscription</TableHead>
              <TableHead>Statut</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <LoadingTableRow />
            ) : visible.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="py-14 text-center text-muted-foreground">Aucun abonné.</TableCell>
              </TableRow>
            ) : (
              pageItems.map((s) => (
                <TableRow key={s.id}>
                  <TableCell>
                    <Checkbox
                      checked={selectedIds.includes(s.id)}
                      onCheckedChange={() => toggleSelected(s.id)}
                      disabled={updatingStatusId !== null || deletingId !== null || deletingSelected}
                      aria-label={`Sélectionner ${s.email}`}
                    />
                  </TableCell>
                  <TableCell className="font-medium">{s.email}</TableCell>
                  <TableCell>{s.subscribed_at ? format(new Date(s.subscribed_at), "Pp") : "-"}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <span className={s.is_active ? "text-emerald-600" : "text-destructive"}>
                        {s.is_active ? "Actif" : "Désabonné"}
                      </span>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className={s.is_active ? "h-7 w-7 text-emerald-600 hover:text-emerald-700" : "h-7 w-7 text-destructive hover:text-destructive/80"}
                        onClick={() => setConfirmStatusId(s.id)}
                        disabled={updatingStatusId !== null || deletingId !== null || deletingSelected}
                        aria-label={s.is_active ? "Désactiver l'abonnement" : "Activer l'abonnement"}
                      >
                        {updatingStatusId === s.id ? (
                          <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                        ) : (
                          <Power className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      size="sm"
                      variant="ghost"
                      className="text-destructive"
                      onClick={() => setConfirmDeleteId(s.id)}
                      disabled={updatingStatusId !== null || deletingId !== null || deletingSelected}
                      aria-label={`Supprimer ${s.email}`}
                    >
                      {deletingId === s.id ? (
                        <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                      ) : (
                        <Trash2 className="h-4 w-4" />
                      )}
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {visible.length > 0 && (
        <div className="flex items-center justify-between gap-4 px-3 py-3">
          <span className="text-sm text-foreground">
            {pageStart}–{pageEnd} sur {visible.length}
          </span>
          <Pagination className="mx-0 w-auto justify-end text-foreground">
            <PaginationContent>
              <PaginationItem>
                <PaginationPrevious
                  href="#"
                  onClick={(event) => {
                    event.preventDefault();
                    setCurrentPage((page) => Math.max(1, page - 1));
                  }}
                  aria-disabled={currentPage === 1}
                  className={currentPage === 1 ? "pointer-events-none opacity-50" : undefined}
                />
              </PaginationItem>
              {Array.from({ length: totalPages }, (_, index) => index + 1).map((page) => (
                <PaginationItem key={page}>
                  <PaginationLink
                    href="#"
                    isActive={currentPage === page}
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
                  onClick={(event) => {
                    event.preventDefault();
                    setCurrentPage((page) => Math.min(totalPages, page + 1));
                  }}
                  aria-disabled={currentPage === totalPages}
                  className={currentPage === totalPages ? "pointer-events-none opacity-50" : undefined}
                />
              </PaginationItem>
            </PaginationContent>
          </Pagination>
        </div>
      )}

      <Dialog open={confirmSelectedDelete} onOpenChange={(open) => !open && setConfirmSelectedDelete(false)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirmer la suppression</DialogTitle>
          </DialogHeader>
          <p>
            Voulez-vous vraiment supprimer {selectedIds.length} abonné{selectedIds.length > 1 ? "s" : ""} sélectionné{selectedIds.length > 1 ? "s" : ""} ? Cette action est irréversible.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmSelectedDelete(false)} disabled={deletingSelected}>
              Annuler
            </Button>
            <Button
              variant="accent"
              className="bg-destructive hover:bg-destructive/90"
              onClick={async () => {
                await deleteSelected();
                setConfirmSelectedDelete(false);
              }}
              disabled={deletingSelected}
            >
              {deletingSelected ? (
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
              ) : "Supprimer"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(confirmDeleteId)} onOpenChange={(open) => !open && setConfirmDeleteId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirmer la suppression</DialogTitle>
          </DialogHeader>
          <p>Voulez-vous vraiment supprimer cet abonné ? Cette action est irréversible.</p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmDeleteId(null)} disabled={deletingId !== null}>
              Annuler
            </Button>
            <Button
              variant="accent"
              className="bg-destructive hover:bg-destructive/90"
              onClick={async () => {
                if (confirmDeleteId) {
                  await deleteSubscriber(confirmDeleteId);
                  setConfirmDeleteId(null);
                }
              }}
              disabled={deletingId !== null}
            >
              {deletingId !== null ? (
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
              ) : "Supprimer"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(confirmStatusId)} onOpenChange={(open) => !open && setConfirmStatusId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {subs.find((subscriber) => subscriber.id === confirmStatusId)?.is_active
                ? "Confirmer le désabonnement"
                : "Confirmer l'activation"}
            </DialogTitle>
          </DialogHeader>
          <p>
            {subs.find((subscriber) => subscriber.id === confirmStatusId)?.is_active
              ? "Voulez-vous vraiment désabonner cet abonné de la newsletter ?"
              : "Voulez-vous vraiment réactiver cet abonné à la newsletter ?"}
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmStatusId(null)} disabled={updatingStatusId !== null}>
              Annuler
            </Button>
            <Button
              variant="accent"
              className="bg-destructive hover:bg-destructive/90"
              onClick={async () => {
                const subscriber = subs.find((item) => item.id === confirmStatusId);
                if (subscriber) await toggleActive(subscriber);
                setConfirmStatusId(null);
              }}
              disabled={updatingStatusId !== null}
            >
              {updatingStatusId !== null ? (
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
              ) : (
                subs.find((subscriber) => subscriber.id === confirmStatusId)?.is_active
                  ? "Désabonner"
                  : "Activer"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
