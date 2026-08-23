import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { format } from "date-fns";
import { supabase } from "@/lib/supabaseClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import SortArrow from "@/components/ui/sort-arrow";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
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

function LoadingTableRow() {
  return (
    <TableRow>
      <TableCell colSpan={6} className="py-12 text-center">
        <div className="inline-flex items-center gap-2 text-muted-foreground">
          <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
          Chargement des clients…
        </div>
      </TableCell>
    </TableRow>
  );
}

function AdminClients() {
  const [customers, setCustomers] = useState<CustomerRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [query, setQuery] = useState("");
  const [sortKey, setSortKey] = useState<"order_count" | "total_spent">("order_count");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc");
  const [currentPage, setCurrentPage] = useState(1);

  const loadCustomers = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.rpc("get_admin_customers_list");

      if (error) throw error;

      const rows = (data ?? []).map((customer: any) => ({
        id: customer.id,
        first_name: customer.first_name ?? null,
        last_name: customer.last_name ?? null,
        phone: customer.phone ?? null,
        email: customer.email ?? null,
        created_at: customer.created_at ?? null,
        order_count: Number(customer.order_count ?? 0),
        total_spent: Number(customer.total_spent ?? 0),
      })) satisfies CustomerRow[];

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

  const sortedCustomers = useMemo(() => {
    const nextCustomers = [...filteredCustomers];

    nextCustomers.sort((a, b) => {
      const modifier = sortDirection === "asc" ? 1 : -1;
      const left = a[sortKey] ?? 0;
      const right = b[sortKey] ?? 0;
      return (left - right) * modifier;
    });

    return nextCustomers;
  }, [filteredCustomers, sortDirection, sortKey]);

  const pageSize = 10;
  const totalPages = Math.max(1, Math.ceil(sortedCustomers.length / pageSize));
  const pageCustomers = sortedCustomers.slice((currentPage - 1) * pageSize, currentPage * pageSize);
  const pageStart = (currentPage - 1) * pageSize + 1;
  const pageEnd = Math.min(currentPage * pageSize, sortedCustomers.length);

  useEffect(() => {
    setCurrentPage(1);
  }, [query, sortKey, sortDirection]);

  useEffect(() => {
    if (currentPage > totalPages) setCurrentPage(totalPages);
  }, [currentPage, totalPages]);

  const toggleSort = (key: "order_count" | "total_spent") => {
    if (sortKey === key) {
      setSortDirection((current) => (current === "asc" ? "desc" : "asc"));
      return;
    }

    setSortKey(key);
    setSortDirection("desc");
  };

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
              <TableHead>
                <button
                  type="button"
                  onClick={() => toggleSort("order_count")}
                  className="inline-flex items-center gap-1 font-medium text-left"
                >
                  <span>Nb commandes</span>
                  <SortArrow
                    dir={sortKey === "order_count" ? sortDirection : null}
                    ariaLabel="Trier par nombre de commandes"
                  />
                </button>
              </TableHead>
              <TableHead>
                <button
                  type="button"
                  onClick={() => toggleSort("total_spent")}
                  className="inline-flex items-center gap-1 font-medium text-left"
                >
                  <span>Total dépensé</span>
                  <SortArrow
                    dir={sortKey === "total_spent" ? sortDirection : null}
                    ariaLabel="Trier par total dépensé"
                  />
                </button>
              </TableHead>
              <TableHead>Date d’inscription</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <LoadingTableRow />
            ) : sortedCustomers.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="py-12 text-center text-muted-foreground">
                  Aucun client trouvé.
                </TableCell>
              </TableRow>
            ) : (
              pageCustomers.map((customer) => (
                <TableRow
                  key={customer.id}
                  className="hover:bg-muted/50"
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

      {sortedCustomers.length > 0 && (
        <div className="flex items-center justify-between gap-4">
          <span className="text-sm text-foreground">
            {pageStart}–{pageEnd} sur {sortedCustomers.length}
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
    </div>
  );
}
