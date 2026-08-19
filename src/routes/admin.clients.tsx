import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { format } from "date-fns";
import { Mail, Phone, UserRound } from "lucide-react";
import { supabase } from "@/lib/supabaseClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatPrice } from "@/lib/placeholder";

export const Route = createFileRoute("/admin/clients")({
  component: AdminClients,
});

type CustomerRow = {
  id: string;
  first_name?: string | null;
  last_name?: string | null;
  phone?: string | null;
  email?: string | null;
  created_at?: string | null;
  order_count: number;
  total_spent: number;
};

type CustomerOrder = {
  id: string;
  order_number: string;
  status: string;
  total: number;
  created_at?: string | null;
};

type CustomerAddress = {
  id: string;
  full_name?: string | null;
  phone?: string | null;
  address_line?: string | null;
  city?: string | null;
  governorate?: string | null;
  postal_code?: string | null;
  is_default?: boolean | null;
};

export default function AdminClients() {
  const [customers, setCustomers] = useState<CustomerRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [query, setQuery] = useState("");
  const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(null);
  const [customerOrders, setCustomerOrders] = useState<CustomerOrder[]>([]);
  const [customerAddresses, setCustomerAddresses] = useState<CustomerAddress[]>([]);

  const loadCustomers = async () => {
    setLoading(true);
    try {
      const { data: profiles, error: profilesError } = await supabase
        .from("profiles")
        .select("*")
        .eq("role", "customer")
        .order("created_at", { ascending: false });

      if (profilesError) throw profilesError;

      const rows = await Promise.all(
        (profiles ?? []).map(async (profile: any) => {
          const { data: orders } = await supabase
            .from("orders")
            .select("id, order_number, status, total, created_at")
            .eq("user_id", profile.id);

          const order_count = orders?.length ?? 0;
          const total_spent = (orders ?? []).reduce((sum: number, order: any) => sum + Number(order.total ?? 0), 0);

          return {
            id: profile.id,
            first_name: profile.first_name ?? null,
            last_name: profile.last_name ?? null,
            phone: profile.phone ?? null,
            email: profile.email ?? null,
            created_at: profile.created_at ?? null,
            order_count,
            total_spent,
          } satisfies CustomerRow;
        })
      );

      setCustomers(rows);
    } catch (err) {
      console.error("load customers", err);
      toast.error("Impossible de charger les clients.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCustomers();
  }, []);

  const filteredCustomers = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return customers;

    return customers.filter((customer) => {
      const fullName = [customer.first_name, customer.last_name].filter(Boolean).join(" ").toLowerCase();
      return (
        fullName.includes(q) ||
        (customer.email ?? "").toLowerCase().includes(q) ||
        (customer.phone ?? "").toLowerCase().includes(q)
      );
    });
  }, [customers, query]);

  const openCustomer = async (customerId: string) => {
    setSelectedCustomerId(customerId);
    const customer = customers.find((c) => c.id === customerId);
    if (!customer) return;

    try {
      const [{ data: orders }, { data: addresses }] = await Promise.all([
        supabase
          .from("orders")
          .select("id, order_number, status, total, created_at")
          .eq("user_id", customerId)
          .order("created_at", { ascending: false }),
        supabase
          .from("addresses")
          .select("*")
          .eq("user_id", customerId)
          .order("is_default", { ascending: false }),
      ]);

      setCustomerOrders((orders ?? []) as CustomerOrder[]);
      setCustomerAddresses((addresses ?? []) as CustomerAddress[]);
    } catch (err) {
      console.error("openCustomer", err);
      toast.error("Impossible de charger le détail client.");
    }
  };

  const selectedCustomer = customers.find((customer) => customer.id === selectedCustomerId) ?? null;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Clients</h1>
        <p className="text-sm text-muted-foreground">Vue d’ensemble des clients et historique d’achat pour le support.</p>
      </div>

      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Rechercher un client…"
          className="max-w-md"
        />
        <div className="text-sm text-muted-foreground">
          {customers.length} client{customers.length > 1 ? "s" : ""}
        </div>
      </div>

      <div className="overflow-x-auto rounded-xl border border-border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nom</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Téléphone</TableHead>
              <TableHead>Nb commandes</TableHead>
              <TableHead>Total dépensé</TableHead>
              <TableHead>Date d’inscription</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={6} className="py-12 text-center text-muted-foreground">
                  Chargement des clients…
                </TableCell>
              </TableRow>
            ) : filteredCustomers.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="py-12 text-center text-muted-foreground">
                  Aucun client trouvé.
                </TableCell>
              </TableRow>
            ) : (
              filteredCustomers.map((customer) => (
                <TableRow
                  key={customer.id}
                  className="cursor-pointer hover:bg-muted/50"
                  onClick={() => openCustomer(customer.id)}
                >
                  <TableCell className="font-medium">
                    {customer.first_name || customer.last_name
                      ? `${customer.first_name ?? ""} ${customer.last_name ?? ""}`.trim()
                      : "Client"}
                  </TableCell>
                  <TableCell>{customer.email ?? "—"}</TableCell>
                  <TableCell>{customer.phone ?? "—"}</TableCell>
                  <TableCell>{customer.order_count}</TableCell>
                  <TableCell>{formatPrice(customer.total_spent)}</TableCell>
                  <TableCell>
                    {customer.created_at ? format(new Date(customer.created_at), "dd/MM/yyyy") : "—"}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <Dialog open={selectedCustomer !== null} onOpenChange={(open) => !open && setSelectedCustomerId(null)}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>
              {selectedCustomer ? `${selectedCustomer.first_name ?? ""} ${selectedCustomer.last_name ?? ""}`.trim() || "Client" : "Client"}
            </DialogTitle>
          </DialogHeader>

          {selectedCustomer && (
            <div className="space-y-6">
              <div className="grid gap-4 rounded-lg border border-border bg-surface p-4 sm:grid-cols-3">
                <div className="flex items-center gap-2 text-sm">
                  <Mail className="h-4 w-4 text-muted-foreground" />
                  <span>{selectedCustomer.email ?? "Email non renseigné"}</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <Phone className="h-4 w-4 text-muted-foreground" />
                  <span>{selectedCustomer.phone ?? "Téléphone non renseigné"}</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <UserRound className="h-4 w-4 text-muted-foreground" />
                  <span>Inscrit le {selectedCustomer.created_at ? format(new Date(selectedCustomer.created_at), "dd/MM/yyyy") : "—"}</span>
                </div>
              </div>

              <div className="grid gap-6 lg:grid-cols-2">
                <div>
                  <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">Commandes</h3>
                  <div className="space-y-2">
                    {customerOrders.length === 0 ? (
                      <p className="text-sm text-muted-foreground">Aucune commande pour ce client.</p>
                    ) : (
                      customerOrders.map((order) => (
                        <div key={order.id} className="rounded-md border border-border p-3">
                          <div className="flex items-center justify-between gap-2">
                            <span className="font-medium">{order.order_number}</span>
                            <span className="text-xs rounded-full bg-muted px-2 py-1 text-muted-foreground">{order.status}</span>
                          </div>
                          <div className="mt-2 flex items-center justify-between text-sm text-muted-foreground">
                            <span>{order.created_at ? format(new Date(order.created_at), "dd/MM/yyyy") : "—"}</span>
                            <span className="font-medium text-foreground">{formatPrice(order.total)}</span>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                <div>
                  <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">Adresses</h3>
                  <div className="space-y-2">
                    {customerAddresses.length === 0 ? (
                      <p className="text-sm text-muted-foreground">Aucune adresse enregistrée.</p>
                    ) : (
                      customerAddresses.map((address) => (
                        <div key={address.id} className="rounded-md border border-border p-3 text-sm">
                          <div className="flex items-center justify-between">
                            <span className="font-medium">{address.full_name ?? "Adresse"}</span>
                            {address.is_default && <span className="text-xs text-accent-strong">Par défaut</span>}
                          </div>
                          <p className="mt-1 text-muted-foreground">{address.address_line ?? "—"}</p>
                          <p className="text-muted-foreground">{[address.city, address.governorate, address.postal_code].filter(Boolean).join(" — ") || "—"}</p>
                          {address.phone && <p className="mt-1 text-muted-foreground">{address.phone}</p>}
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          <div className="flex justify-end">
            <Button variant="outline" onClick={() => setSelectedCustomerId(null)}>Fermer</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
