import { useEffect, useState } from "react";
import { Clock3 } from "lucide-react";
import { ORDER_STATUS_LABELS, ORDER_STATUS_STYLES } from "@/data/orders";
import { supabase } from "@/lib/supabaseClient";
import { cn } from "@/lib/utils";
import Spinner from "@/components/ui/spinner";

type OrderStatusTimelineProps = {
  orderId: string;
  title?: string;
  className?: string;
};

type HistoryRow = {
  id: string;
  status: string;
  note: string | null;
  created_at: string;
};

const formatHistoryDate = (value: string) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Date non renseignée";
  return date.toLocaleString("fr-FR", {
    dateStyle: "medium",
    timeStyle: "short",
  });
};

export default function OrderStatusTimeline({ orderId, title = "Suivi de la commande", className }: OrderStatusTimelineProps) {
  const [history, setHistory] = useState<HistoryRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    let mounted = true;

    const loadHistory = async () => {
      setLoading(true);
      setError(false);
      const { data, error: queryError } = await supabase
        .from("order_status_history")
        .select("*")
        .eq("order_id", orderId)
        .order("created_at", { ascending: false });

      if (!mounted) return;
      if (queryError) {
        console.error("load order status history", queryError);
        setHistory([]);
        setError(true);
      } else {
        setHistory((data ?? []).map((row: any) => ({
          id: row.id,
          status: row.status ?? row.new_status ?? "",
          note: row.note ?? null,
          created_at: row.created_at,
        })));
      }
      setLoading(false);
    };

    void loadHistory();
    const channel = supabase
      .channel(`order-status-history-${orderId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "order_status_history", filter: `order_id=eq.${orderId}` },
        () => { void loadHistory(); },
      )
      .subscribe();

    return () => {
      mounted = false;
      void supabase.removeChannel(channel);
    };
  }, [orderId]);

  return (
    <section className={cn("border-t border-border pt-4", className)} aria-label={title}>
      <h3 className="mb-4 text-base font-semibold">{title}</h3>
      {loading ? (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Spinner className="h-4 w-4" /> Chargement du suivi...
        </div>
      ) : error ? (
        <p className="text-sm text-muted-foreground">Le suivi de cette commande est indisponible.</p>
      ) : history.length === 0 ? (
        <p className="text-sm text-muted-foreground">Aucun historique disponible.</p>
      ) : (
        <ol className="space-y-0">
          {history.map((entry, index) => (
            <li key={entry.id} className="relative flex gap-3 pb-5 last:pb-0">
              {index < history.length - 1 && <span className="absolute left-[7px] top-4 h-full w-px bg-border" aria-hidden="true" />}
              <span className={cn(
                "relative z-10 mt-1 flex h-4 w-4 shrink-0 items-center justify-center rounded-full border-2 bg-card",
                ORDER_STATUS_STYLES[entry.status as keyof typeof ORDER_STATUS_STYLES] ?? "border-muted-foreground text-muted-foreground",
              )}>
                <span className="h-1.5 w-1.5 rounded-full bg-current" />
              </span>
              <div className="min-w-0">
                <p className="font-medium">
                  <span className={cn(
                    "inline-flex rounded-full px-2 py-0.5 text-xs font-semibold",
                    ORDER_STATUS_STYLES[entry.status as keyof typeof ORDER_STATUS_STYLES] ?? "bg-muted text-muted-foreground",
                  )}>
                    {ORDER_STATUS_LABELS[entry.status as keyof typeof ORDER_STATUS_LABELS] ?? entry.status}
                  </span>
                </p>
                <p className="mt-0.5 flex items-center gap-1 text-xs text-muted-foreground">
                  <Clock3 className="h-3 w-3" />
                  {formatHistoryDate(entry.created_at)}
                </p>
                {entry.note && <p className="mt-2 whitespace-pre-wrap text-sm text-muted-foreground">{entry.note}</p>}
              </div>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}
