import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Eye } from "lucide-react";
import { toast } from "sonner";
import { ORDER_STATUS_LABELS, orders as seedOrders } from "@/data/orders";
import type { Order, OrderStatus } from "@/types";
import { formatPrice } from "@/lib/placeholder";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";

export const Route = createFileRoute("/admin/commandes")({
  component: AdminOrders,
});

const statusStyle: Record<OrderStatus, string> = {
  pending: "bg-warning/15 text-warning",
  confirmed: "bg-accent-strong/10 text-accent-strong",
  shipped: "bg-chart-2/15 text-chart-2",
  delivered: "bg-success/15 text-success",
  cancelled: "bg-destructive/10 text-destructive",
};

const statuses: OrderStatus[] = ["pending", "confirmed", "shipped", "delivered", "cancelled"];

function AdminOrders() {
  const [list, setList] = useState<Order[]>(seedOrders);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<string>("all");
  const [detail, setDetail] = useState<Order | null>(null);

  const filtered = list.filter((o) => {
    const matchSearch =
      o.reference.toLowerCase().includes(search.toLowerCase()) ||
      o.customer_name.toLowerCase().includes(search.toLowerCase());
    const matchStatus = filter === "all" || o.status === filter;
    return matchSearch && matchStatus;
  });

  const changeStatus = (id: string, status: OrderStatus) => {
    setList((prev) => prev.map((o) => (o.id === id ? { ...o, status } : o)));
    setDetail((d) => (d && d.id === id ? { ...d, status } : d));
    toast.success(`Statut mis à jour : ${ORDER_STATUS_LABELS[status]}`);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Commandes</h1>
          <p className="text-sm text-muted-foreground">
            {list.length} commandes — toutes en paiement à la livraison.
          </p>
        </div>
        <div className="flex gap-2">
          <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Réf. ou client…" className="w-52" />
          <Select value={filter} onValueChange={setFilter}>
            <SelectTrigger className="w-44"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tous les statuts</SelectItem>
              {statuses.map((s) => (
                <SelectItem key={s} value={s}>{ORDER_STATUS_LABELS[s]}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="overflow-x-auto rounded-xl border border-border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Référence</TableHead>
              <TableHead>Client</TableHead>
              <TableHead>Gouvernorat</TableHead>
              <TableHead>Date</TableHead>
              <TableHead>Total</TableHead>
              <TableHead>Statut</TableHead>
              <TableHead className="text-right">Détail</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="py-14 text-center text-muted-foreground">
                  Aucune commande ne correspond à ces critères.
                </TableCell>
              </TableRow>
            ) : (
              filtered.map((o) => (
                <TableRow key={o.id}>
                  <TableCell className="font-medium">{o.reference}</TableCell>
                  <TableCell>
                    <p>{o.customer_name}</p>
                    <p className="text-xs text-muted-foreground">{o.customer_phone}</p>
                  </TableCell>
                  <TableCell className="text-muted-foreground">{o.governorate}</TableCell>
                  <TableCell className="text-muted-foreground">
                    {new Date(o.created_at).toLocaleDateString("fr-FR")}
                  </TableCell>
                  <TableCell className="font-semibold">{formatPrice(o.total)}</TableCell>
                  <TableCell>
                    <Select value={o.status} onValueChange={(v) => changeStatus(o.id, v as OrderStatus)}>
                      <SelectTrigger className="h-8 w-36"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {statuses.map((s) => (
                          <SelectItem key={s} value={s}>{ORDER_STATUS_LABELS[s]}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </TableCell>
                  <TableCell className="text-right">
                    <Button size="sm" variant="outline" onClick={() => setDetail(o)}>
                      <Eye className="h-4 w-4" /> Voir
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <Dialog open={detail !== null} onOpenChange={(o) => !o && setDetail(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Commande {detail?.reference}</DialogTitle>
          </DialogHeader>
          {detail && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-semibold">{detail.customer_name}</p>
                  <p className="text-sm text-muted-foreground">{detail.customer_phone}</p>
                  <p className="text-sm text-muted-foreground">{detail.governorate}</p>
                </div>
                <span className={cn("rounded-full px-3 py-1 text-xs font-semibold", statusStyle[detail.status])}>
                  {ORDER_STATUS_LABELS[detail.status]}
                </span>
              </div>

              <ul className="space-y-3 border-t border-border pt-4">
                {detail.items.map((item) => (
                  <li key={item.id} className="flex items-center gap-3">
                    <img src={item.image} alt="" className="h-12 w-12 rounded-md border border-border object-cover" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">{item.name}</p>
                      {item.variant_label && <p className="text-xs text-muted-foreground">{item.variant_label}</p>}
                    </div>
                    <span className="text-sm text-muted-foreground">×{item.quantity}</span>
                    <span className="text-sm font-semibold">{formatPrice(item.unit_price * item.quantity)}</span>
                  </li>
                ))}
              </ul>

              <dl className="space-y-1 border-t border-border pt-4 text-sm">
                <div className="flex justify-between"><dt className="text-muted-foreground">Sous-total</dt><dd>{formatPrice(detail.subtotal)}</dd></div>
                {detail.discount > 0 && (
                  <div className="flex justify-between text-accent-strong"><dt>Remise</dt><dd>-{formatPrice(detail.discount)}</dd></div>
                )}
                <div className="flex justify-between"><dt className="text-muted-foreground">Livraison</dt><dd>{formatPrice(detail.shipping)}</dd></div>
                <div className="flex justify-between font-bold"><dt>Total (COD)</dt><dd>{formatPrice(detail.total)}</dd></div>
              </dl>

              <div className="space-y-2 border-t border-border pt-4">
                <p className="text-sm font-medium">Changer le statut</p>
                <Select value={detail.status} onValueChange={(v) => changeStatus(detail.id, v as OrderStatus)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {statuses.map((s) => (
                      <SelectItem key={s} value={s}>{ORDER_STATUS_LABELS[s]}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
