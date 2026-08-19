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
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Download, Trash2 } from "lucide-react";
import { format } from "date-fns";
import { jsPDF } from "jspdf";

export const Route = createFileRoute("/admin/newsletter")({ component: AdminNewsletter });

type Subscriber = {
  id: string;
  email: string;
  is_active?: boolean | null;
  subscribed_at?: string | null;
};

export default function AdminNewsletter() {
  const [subs, setSubs] = useState<Subscriber[]>([]);
  const [loading, setLoading] = useState(false);
  const [query, setQuery] = useState("");
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
    setLoading(true);
    try {
      const { error } = await supabase.from("newsletter_subscribers").update({ is_active: !s.is_active }).eq("id", s.id);
      if (error) throw error;
      setSubs((prev) => prev.map((x) => (x.id === s.id ? { ...x, is_active: !s.is_active } : x)));
    } catch (err) {
      console.error("toggleActive subscriber", err);
      toast.error("Impossible de mettre à jour l'abonné.");
    } finally {
      setLoading(false);
    }
  };

  const deleteSubscriber = async (id: string) => {
    if (!id) return;
    setLoading(true);
    try {
      const { error } = await supabase.from("newsletter_subscribers").delete().eq("id", id);
      if (error) throw error;
      setSubs((prev) => prev.filter((x) => x.id !== id));
      toast.success("Abonné supprimé.");
    } catch (err) {
      console.error("delete subscriber", err);
      toast.error("Impossible de supprimer l'abonné.");
    } finally {
      setLoading(false);
    }
  };

  const visible = useMemo(() => {
    const q = String(query ?? "").trim().toLowerCase();
    if (!q) return subs;
    return subs.filter((s) => s.email.toLowerCase().includes(q));
  }, [subs, query]);

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
          <div className="flex flex-wrap gap-2">
            <Input
              placeholder="Rechercher par email"
              value={query}
              onChange={(e) => setQuery(String(e.target.value))}
              className="w-80 sm:w-96"
            />
          </div>

          <Button variant="accent" onClick={() => exportPDF()} className="whitespace-nowrap">
            <Download className="h-4 w-4" /> Exporter PDF
          </Button>
        </div>
      </div>
      {errorMsg && (
        <div className="rounded-md border border-destructive/20 bg-destructive/5 p-3 text-sm text-destructive">{errorMsg}</div>
      )}

      <div className="overflow-x-auto rounded-xl border border-border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Email</TableHead>
              <TableHead>Date d'inscription</TableHead>
              <TableHead>Statut</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {visible.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} className="py-14 text-center text-muted-foreground">Aucun abonné.</TableCell>
              </TableRow>
            ) : (
              visible.map((s) => (
                <TableRow key={s.id}>
                  <TableCell className="font-medium">{s.email}</TableCell>
                  <TableCell>{s.subscribed_at ? format(new Date(s.subscribed_at), "Pp") : "-"}</TableCell>
                  <TableCell>{s.is_active ? "Actif" : "Désabonné"}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-2">
                      <Switch checked={!!s.is_active} onCheckedChange={() => toggleActive(s)} />
                      <Button size="sm" variant="ghost" className="text-destructive" onClick={() => deleteSubscriber(s.id)}>
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
  );
}
