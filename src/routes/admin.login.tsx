import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/lib/supabaseClient";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/admin/login")({
  head: () => ({
    meta: [
      { title: "Admin Login — Yadawi" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: AdminLogin,
});

function AdminLogin() {
  const { signIn, signOut } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const { error } = await signIn(email, password);
      if (error) {
        console.error("admin signIn error:", error);
        toast.error(error.message ?? "Erreur d'authentification");
        setLoading(false);
        return;
      }

      // signIn() only proves valid credentials — this form is admin-only, so
      // reject non-admin accounts here instead of flashing "Connecté" and
      // relying on the /admin guard to kick them back out afterwards.
      const { data: sessionData } = await supabase.auth.getSession();
      const userId = sessionData.session?.user?.id;
      const { data: profile } = userId
        ? await supabase.from("profiles").select("role").eq("id", userId).maybeSingle()
        : { data: null };

      if (!profile || profile.role !== "admin") {
        await signOut();
        toast.error("Ce compte n'a pas accès à l'administration.");
        setLoading(false);
        return;
      }

      toast.success("Connecté");
      // navigate back to admin root (AuthContext signIn triggers profile load)
      window.location.href = "/admin";
    } catch (err) {
      console.error(err);
      toast.error("Erreur réseau");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="w-full max-w-md">
        <div className="rounded-xl border border-border bg-card p-6">
          <h1 className="text-2xl font-bold">Connexion administrateur</h1>
          <p className="text-sm text-muted-foreground mt-1">Veuillez vous connecter avec un compte administrateur.</p>
          <form className="mt-6 space-y-4" onSubmit={handleSubmit}>
            <div>
              <Label>Adresse e-mail</Label>
              <Input value={email} onChange={(e) => setEmail(e.target.value)} type="email" required />
            </div>
            <div>
              <Label>Mot de passe</Label>
              <Input value={password} onChange={(e) => setPassword(e.target.value)} type="password" required />
            </div>
            <div className="flex items-center justify-between">
              <Button type="submit" variant="accent" disabled={loading}>{loading ? "Connexion…" : "Se connecter"}</Button>
              <Link to="/" className="text-sm text-muted-foreground hover:text-accent-strong">Retour site</Link>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
