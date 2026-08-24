import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Bell, CheckCheck, PackageX, ShoppingBag, Star, Trash2 } from "lucide-react";
import { supabase } from "@/lib/supabaseClient";
import type { Database } from "@/types";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import Spinner from "@/components/ui/spinner";
import { cn } from "@/lib/utils";
import { orderReferenceFromTitle, parseAdminLink, productNameFromBody } from "@/lib/admin-links";
import { setAdminFocus } from "@/lib/admin-focus";
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";

export const Route = createFileRoute("/admin/notifications")({
  component: AdminNotifications,
});

type NotificationRow = Database["public"]["Tables"]["notifications"]["Row"];

// `type` est libre côté base (voir database/notifications.sql) : on habille les
// types connus, les autres retombent sur la cloche et sur leur libellé brut.
const TYPE_ICONS: Record<string, typeof Bell> = {
  order: ShoppingBag,
  review: Star,
  stock: PackageX,
};

const TYPE_LABELS: Record<string, string> = {
  order: "Commandes",
  review: "Avis",
  stock: "Stock",
};

function AdminNotifications() {
  const navigate = useNavigate();
  const [items, setItems] = useState<NotificationRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [confirmBulkDelete, setConfirmBulkDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("notifications")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(100);
      if (error) throw error;
      setItems(data ?? []);
    } catch (err) {
      console.error("load notifications", err);
      toast.error("Impossible de charger les notifications.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  useEffect(() => {
    setSelectedIds([]);
  }, [typeFilter]);

  const markRead = async (id: string) => {
    setItems((prev) => prev.map((n) => (n.id === id ? { ...n, is_read: true } : n)));
    const { error } = await supabase.from("notifications").update({ is_read: true }).eq("id", id);
    if (error) console.error("mark read", error);
  };

  const markAllRead = async () => {
    const unreadIds = items.filter((n) => !n.is_read).map((n) => n.id);
    if (unreadIds.length === 0) return;
    setItems((prev) => prev.map((n) => ({ ...n, is_read: true })));
    const { error } = await supabase.from("notifications").update({ is_read: true }).in("id", unreadIds);
    if (error) {
      console.error("mark all read", error);
      toast.error("Impossible de tout marquer comme lu.");
    }
  };

  const remove = async (id: string) => {
    const removed = items.find((n) => n.id === id);
    setItems((prev) => prev.filter((n) => n.id !== id));
    setSelectedIds((prev) => prev.filter((x) => x !== id));
    const { error } = await supabase.from("notifications").delete().eq("id", id);
    if (error) {
      console.error("delete notification", error);
      // Restaure la ligne : sans ça elle disparaît de l'écran alors qu'elle est
      // toujours en base, et elle réapparaît au prochain chargement.
      if (removed) setItems((prev) => [removed, ...prev]);
      toast.error("Impossible de supprimer la notification.");
    }
  };

  const removeSelected = async () => {
    if (selectedIds.length === 0) return;
    setDeleting(true);
    const snapshot = items;
    const count = selectedIds.length;
    // selectedIds ne contient que du visible : la sélection est vidée à chaque
    // changement de filtre, on ne peut donc pas supprimer une ligne masquée.
    setItems((prev) => prev.filter((n) => !selectedIds.includes(n.id)));
    const { error } = await supabase.from("notifications").delete().in("id", selectedIds);
    setDeleting(false);
    setConfirmBulkDelete(false);
    if (error) {
      console.error("bulk delete notifications", error);
      setItems(snapshot);
      toast.error("Impossible de supprimer les notifications sélectionnées.");
      return;
    }
    setSelectedIds([]);
    toast.success(`${count} notification${count > 1 ? "s" : ""} supprimée${count > 1 ? "s" : ""}.`);
  };

  const unreadCount = items.filter((n) => !n.is_read).length;

  // Un onglet par type réellement présent : inutile de proposer « Stock » si
  // aucune alerte de stock n'existe.
  const typeTabs = useMemo(() => {
    const counts = new Map<string, number>();
    items.forEach((n) => counts.set(n.type, (counts.get(n.type) ?? 0) + 1));
    return [
      { value: "all", label: "Toutes", count: items.length },
      ...[...counts.entries()]
        .sort((a, b) => b[1] - a[1])
        .map(([type, count]) => ({ value: type, label: TYPE_LABELS[type] ?? type, count })),
    ];
  }, [items]);

  const visible = useMemo(
    () => (typeFilter === "all" ? items : items.filter((n) => n.type === typeFilter)),
    [items, typeFilter],
  );

  // La sélection ne porte que sur ce qui est affiché : cocher « tout » sous un
  // filtre ne doit pas embarquer les notifications masquées.
  const visibleIds = visible.map((n) => n.id);
  const selectedVisibleIds = selectedIds.filter((id) => visibleIds.includes(id));
  const allVisibleSelected = visibleIds.length > 0 && selectedVisibleIds.length === visibleIds.length;

  const toggleSelected = (id: string) =>
    setSelectedIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));

  const toggleSelectAllVisible = () =>
    setSelectedIds((prev) =>
      allVisibleSelected
        ? prev.filter((id) => !visibleIds.includes(id))
        : [...new Set([...prev, ...visibleIds])],
    );

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold">
            Notifications
            {unreadCount > 0 && (
              <span className="grid h-6 min-w-6 place-items-center rounded-full bg-accent-strong px-1.5 text-xs font-bold text-accent-strong-foreground">
                {unreadCount}
              </span>
            )}
          </h1>
          <p className="text-sm text-muted-foreground">
            {unreadCount > 0 ? `${unreadCount} non lue${unreadCount > 1 ? "s" : ""}` : "Tout est lu."}
          </p>
        </div>
        <Button variant="outline" onClick={markAllRead} disabled={unreadCount === 0}>
          <CheckCheck className="h-4 w-4" /> Tout marquer comme lu
        </Button>
      </div>

      {items.length > 0 && (
        <div className="flex flex-wrap items-center gap-2">
          {typeTabs.map((tab) => {
            const Icon = tab.value === "all" ? Bell : TYPE_ICONS[tab.value] ?? Bell;
            const active = typeFilter === tab.value;
            return (
              <button
                key={tab.value}
                type="button"
                onClick={() => setTypeFilter(tab.value)}
                className={cn(
                  "flex items-center gap-2 rounded-full border px-3 py-1.5 text-sm font-medium transition-colors",
                  active
                    ? "border-accent-strong bg-accent-strong text-accent-strong-foreground"
                    : "border-border bg-card text-muted-foreground hover:border-accent-strong hover:text-accent-strong",
                )}
              >
                <Icon className="h-3.5 w-3.5" />
                {tab.label}
                <span
                  className={cn(
                    "grid h-5 min-w-5 place-items-center rounded-full px-1 text-[11px] font-bold",
                    active ? "bg-accent-strong-foreground/20" : "bg-surface",
                  )}
                >
                  {tab.count}
                </span>
              </button>
            );
          })}
        </div>
      )}

      {visible.length > 0 && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border bg-card px-4 py-2.5">
          <label className="flex cursor-pointer items-center gap-2 text-sm">
            <Checkbox checked={allVisibleSelected} onCheckedChange={toggleSelectAllVisible} />
            {selectedVisibleIds.length > 0
              ? `${selectedVisibleIds.length} sélectionnée${selectedVisibleIds.length > 1 ? "s" : ""}`
              : "Tout sélectionner"}
          </label>
          <Button
            variant="destructive"
            size="sm"
            disabled={selectedVisibleIds.length === 0}
            onClick={() => setConfirmBulkDelete(true)}
          >
            <Trash2 className="h-4 w-4" /> Supprimer la sélection
          </Button>
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-14"><Spinner showLabel /></div>
      ) : visible.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border py-16 text-center">
          <Bell className="mx-auto h-10 w-10 text-muted-foreground" />
          <p className="mt-3 font-semibold">
            {items.length === 0
              ? "Aucune notification pour le moment"
              : "Aucune notification de ce type"}
          </p>
        </div>
      ) : (
        <ul className="space-y-2">
          {visible.map((n) => (
            <li
              key={n.id}
              className={cn(
                "flex items-start gap-3 rounded-xl border p-4",
                n.is_read ? "border-border bg-card" : "border-accent-strong/30 bg-accent-strong/5",
              )}
            >
              <Checkbox
                className="mt-1 shrink-0"
                checked={selectedIds.includes(n.id)}
                onCheckedChange={() => toggleSelected(n.id)}
                aria-label={`Sélectionner « ${n.title} »`}
              />

              <a
                href={n.link ?? "/admin/notifications"}
                onClick={(event) => {
                  event.preventDefault();
                  if (!n.is_read) markRead(n.id);
                  const target = parseAdminLink(n.link) ?? { to: "/admin/notifications", search: {} };
                  // Les notifications créées avant que le lien ne porte
                  // l'identifiant ne pointent que vers la page. Le numéro de
                  // commande figure dans leur titre : il suffit à retrouver la
                  // fiche, sans attendre une migration de la base.
                  if (n.type === "order" && !target.search["order"]) {
                    const reference = orderReferenceFromTitle(n.title);
                    if (reference) {
                      target.to = "/admin/commandes";
                      target.search = { ...target.search, ref: reference };
                    }
                  }
                  // Même repli pour les alertes de stock : leur corps commence
                  // par le nom du produit, ce qui suffit à retrouver la fiche.
                  if (n.type === "stock" && !target.search["produit"]) {
                    const name = productNameFromBody(n.body);
                    if (name) {
                      target.to = "/admin/produits";
                      target.search = { ...target.search, nom: name };
                    }
                  }
                  // Relais direct : la page de destination le lit au montage,
                  // sans dépendre du transport des paramètres par le routeur.
                  setAdminFocus({ path: target.to, search: target.search });
                  navigate({ to: target.to as "/admin/notifications", search: target.search });
                }}
                className="min-w-0 flex-1"
              >
                <div className="flex items-center gap-2">
                  {!n.is_read && <span className="h-2 w-2 shrink-0 rounded-full bg-accent-strong" />}
                  {(() => {
                    const Icon = TYPE_ICONS[n.type] ?? Bell;
                    return <Icon className="h-4 w-4 shrink-0 text-accent-strong" />;
                  })()}
                  <p className="font-semibold">{n.title}</p>
                </div>
                {n.body && <p className="mt-1 text-sm text-muted-foreground">{n.body}</p>}
                <p className="mt-1 text-xs text-muted-foreground">
                  {n.created_at ? new Date(n.created_at).toLocaleString("fr-FR") : ""}
                </p>
              </a>

              <div className="flex shrink-0 items-center gap-1">
                {!n.is_read && (
                  <button
                    aria-label="Marquer comme lu"
                    className="rounded p-1.5 text-muted-foreground hover:bg-surface"
                    onClick={() => markRead(n.id)}
                  >
                    <CheckCheck className="h-4 w-4" />
                  </button>
                )}
                <button
                  aria-label="Supprimer"
                  className="rounded p-1.5 text-destructive hover:bg-destructive/10"
                  onClick={() => remove(n.id)}
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}

      <Dialog open={confirmBulkDelete} onOpenChange={(o) => !o && !deleting && setConfirmBulkDelete(false)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              Supprimer {selectedVisibleIds.length} notification
              {selectedVisibleIds.length > 1 ? "s" : ""} ?
            </DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">Cette action est irréversible.</p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmBulkDelete(false)} disabled={deleting}>
              Annuler
            </Button>
            <Button variant="destructive" onClick={removeSelected} disabled={deleting}>
              {deleting ? "Suppression…" : "Supprimer"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
