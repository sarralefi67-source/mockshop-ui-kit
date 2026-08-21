import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/lib/supabaseClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";

export const Route = createFileRoute("/compte/")({
  component: AccountInfo,
});

function AccountInfo() {
  const { profile } = useAuth();
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [newsletter, setNewsletter] = useState(false);
  const [saving, setSaving] = useState(false);
  const [pw1, setPw1] = useState("");
  const [pw2, setPw2] = useState("");
  const [changingPassword, setChangingPassword] = useState(false);

  useEffect(() => {
    if (!profile) return;
    setFirstName(profile.first_name ?? "");
    setLastName(profile.last_name ?? "");
    setEmail(profile.email ?? "");
    setPhone(profile.phone ?? "");
    setNewsletter(Boolean(profile.newsletter_opt_in));
  }, [profile]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Informations personnelles</h1>
        <p className="text-sm text-muted-foreground">Modifiez vos coordonnées et vos préférences.</p>
      </div>

      <form
        className="rounded-xl border border-border bg-card p-6"
        onSubmit={async (e) => {
          e.preventDefault();
          if (!profile) return;
          setSaving(true);
          try {
            const { error } = await supabase
              .from("profiles")
              .update({
                first_name: firstName.trim() || null,
                last_name: lastName.trim() || null,
                email: email.trim() || null,
                phone: phone.trim() || null,
                newsletter_opt_in: newsletter,
              })
              .eq("id", profile.id);
            if (error) throw error;
            if (newsletter && email.trim()) {
              // best-effort: ensure newsletter_subscribers also has this email
              await supabase.from("newsletter_subscribers").insert({ email: email.trim() });
            }
            toast.success("Informations enregistrées.");
          } catch (err) {
            console.error("save profile error:", err);
            toast.error("Impossible d'enregistrer les informations.");
          } finally {
            setSaving(false);
          }
        }}
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="fn">Prénom</Label>
            <Input id="fn" value={firstName} onChange={(e) => setFirstName(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="ln">Nom</Label>
            <Input id="ln" value={lastName} onChange={(e) => setLastName(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="em">E-mail</Label>
            <Input id="em" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="ph">Téléphone</Label>
            <Input id="ph" value={phone} onChange={(e) => setPhone(e.target.value)} />
          </div>
        </div>

        <div className="mt-5 flex items-start gap-2">
          <Checkbox id="nl" checked={newsletter} onCheckedChange={(v) => setNewsletter(Boolean(v))} />
          <Label htmlFor="nl" className="text-sm font-normal leading-snug">
            Je souhaite recevoir la newsletter (promotions et nouveautés, 1 e-mail par semaine).
          </Label>
        </div>

        <Button variant="accent" type="submit" className="mt-6" disabled={saving || !profile}>
          {saving ? "Enregistrement…" : "Enregistrer"}
        </Button>
      </form>

      <form
        className="rounded-xl border border-border bg-card p-6"
        onSubmit={async (e) => {
          e.preventDefault();
          if (pw1.length < 6) {
            toast.error("Le mot de passe doit contenir au moins 6 caractères.");
            return;
          }
          if (pw1 !== pw2) {
            toast.error("Les mots de passe ne correspondent pas.");
            return;
          }
          setChangingPassword(true);
          try {
            const { error } = await supabase.auth.updateUser({ password: pw1 });
            if (error) throw error;
            setPw1("");
            setPw2("");
            toast.success("Mot de passe mis à jour.");
          } catch (err: any) {
            console.error("update password error:", err);
            toast.error(err?.message ?? "Impossible de mettre à jour le mot de passe.");
          } finally {
            setChangingPassword(false);
          }
        }}
      >
        <h2 className="text-lg font-bold">Mot de passe</h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="pw1">Nouveau mot de passe</Label>
            <Input id="pw1" type="password" placeholder="••••••••" value={pw1} onChange={(e) => setPw1(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="pw2">Confirmation</Label>
            <Input id="pw2" type="password" placeholder="••••••••" value={pw2} onChange={(e) => setPw2(e.target.value)} />
          </div>
        </div>
        <Button variant="outline" type="submit" className="mt-5" disabled={changingPassword}>
          {changingPassword ? "Mise à jour…" : "Mettre à jour"}
        </Button>
      </form>
    </div>
  );
}
