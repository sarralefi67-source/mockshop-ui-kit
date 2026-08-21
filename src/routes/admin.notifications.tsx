import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Bell, CheckCheck, Trash2 } from "lucide-react";
import { supabase } from "@/lib/supabaseClient";
import type { Database } from "@/types";
import { Button } from "@/components/ui/button";
import Spinner from "@/components/ui/spinner";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/admin/notifications")({
  component: AdminNotifications,
});

type NotificationRow = Database["public"]["Tables"]["notifications"]["Row"];

export default function AdminNotifications() {
  const [items, setItems] = useState<NotificationRow[]>([]);
  const [loading, setLoading] = useState(true);

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
    setItems((prev) => prev.filter((n) => n.id !== id));
    const { error } = await supabase.from("notifications").delete().eq("id", id);
    if (error) {
      console.error("delete notification", error);
      toast.error("Impossible de supprimer la notification.");
    }
  };

  const unreadCount = items.filter((n) => !n.is_read).length;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Notifications</h1>
          <p className="text-sm text-muted-foreground">
            {unreadCount > 0 ? `${unreadCount} non lue${unreadCount > 1 ? "s" : ""}` : "Tout est lu."}
          </p>
        </div>
        <Button variant="outline" onClick={markAllRead} disabled={unreadCount === 0}>
          <CheckCheck className="h-4 w-4" /> Tout marquer comme lu
        </Button>
      </div>

      {loading ? (
        <div className="flex justify-center py-14"><Spinner showLabel /></div>
      ) : items.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border py-16 text-center">
          <Bell className="mx-auto h-10 w-10 text-muted-foreground" />
          <p className="mt-3 font-semibold">Aucune notification pour le moment</p>
        </div>
      ) : (
        <ul className="space-y-2">
          {items.map((n) => (
            <li
              key={n.id}
              className={cn(
                "flex items-start justify-between gap-4 rounded-xl border p-4",
                n.is_read ? "border-border bg-card" : "border-accent-strong/30 bg-accent-strong/5",
              )}
            >
              <Link
                to={(n.link ?? "/admin/notifications") as "/admin/notifications"}
                onClick={() => !n.is_read && markRead(n.id)}
                className="min-w-0 flex-1"
              >
                <div className="flex items-center gap-2">
                  {!n.is_read && <span className="h-2 w-2 shrink-0 rounded-full bg-accent-strong" />}
                  <p className="font-semibold">{n.title}</p>
                </div>
                {n.body && <p className="mt-1 text-sm text-muted-foreground">{n.body}</p>}
                <p className="mt-1 text-xs text-muted-foreground">
                  {n.created_at ? new Date(n.created_at).toLocaleString("fr-FR") : ""}
                </p>
              </Link>
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
    </div>
  );
}
