import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/lib/supabaseClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Eye, EyeOff } from "lucide-react";

const MIN_PASSWORD_LENGTH = 6;

function PasswordField({
  id,
  label,
  value,
  onChange,
  autoComplete,
  error,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  autoComplete: string;
  error?: string;
}) {
  const [visible, setVisible] = useState(false);

  return (
    <div className="space-y-2">
      <Label htmlFor={id}>{label}</Label>
      <div className="relative">
        <Input
          id={id}
          type={visible ? "text" : "password"}
          autoComplete={autoComplete}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          aria-invalid={Boolean(error)}
          aria-describedby={error ? `${id}-error` : undefined}
          className={`${error ? "border-red-600 focus-visible:ring-red-600 " : ""}pr-11`}
        />
        <button
          type="button"
          onClick={() => setVisible((current) => !current)}
          aria-label={visible ? "Masquer le mot de passe" : "Afficher le mot de passe"}
          className="absolute right-1 top-1/2 grid h-8 w-8 -translate-y-1/2 place-items-center rounded text-muted-foreground hover:text-foreground"
        >
          {visible ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
        </button>
      </div>
      {error ? (
        <p id={`${id}-error`} className="text-sm text-red-600" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}

export const Route = createFileRoute("/compte/")({
  component: AccountInfo,
});

function AccountInfo() {
  const { profile, user } = useAuth();
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [newsletter, setNewsletter] = useState(false);
  const [saving, setSaving] = useState(false);
  const [passwordStep, setPasswordStep] = useState<1 | 2>(1);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [verifyingPassword, setVerifyingPassword] = useState(false);
  const [changingPassword, setChangingPassword] = useState(false);
  const [passwordErrors, setPasswordErrors] = useState<{
    current?: string;
    new?: string;
    confirm?: string;
  }>({});

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
            <Input
              id="em"
              type="email"
              value={email}
              readOnly
              disabled
              aria-describedby="email-locked"
            />
            <p id="email-locked" className="text-xs text-muted-foreground">
              L'adresse e-mail ne peut pas être modifiée.
            </p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="ph">Téléphone</Label>
            <Input id="ph" value={phone} onChange={(e) => setPhone(e.target.value)} />
          </div>
        </div>

     

        <Button variant="accent" type="submit" className="mt-6" disabled={saving || !profile}>
          {saving ? "Enregistrement…" : "Enregistrer"}
        </Button>
      </form>

      <div
        className="rounded-xl border border-border bg-card p-6"
      >
        <h2 className="text-lg font-bold">Mot de passe</h2>
        <ol className="mt-4 flex items-center justify-center gap-3 text-sm">
          <li className={passwordStep === 1 ? "font-semibold" : "text-muted-foreground"}>1. Mot de passe actuel</li>
          <li className="text-muted-foreground">→</li>
          <li className={passwordStep === 2 ? "font-semibold" : "text-muted-foreground"}>2. Nouveau mot de passe</li>
        </ol>

        {passwordStep === 1 ? (
          <div className="mx-auto mt-5 max-w-md space-y-4">
            <PasswordField
              id="current-password"
              label="Mot de passe actuel"
              value={currentPassword}
              onChange={(value) => {
                setCurrentPassword(value);
                if (passwordErrors.current) setPasswordErrors((errors) => ({ ...errors, current: undefined }));
              }}
              autoComplete="current-password"
              error={passwordErrors.current}
            />
            <div className="flex justify-end">
              <Button
                variant="accent"
                type="button"
                onClick={async () => {
                if (!currentPassword) {
                  setPasswordErrors({ current: "Saisissez votre mot de passe actuel." });
                  document.getElementById("current-password")?.focus();
                  return;
                }
                if (!user?.email) {
                  toast.error("Session expirée, reconnectez-vous.");
                  return;
                }
                setVerifyingPassword(true);
                try {
                  const { error } = await supabase.auth.signInWithPassword({
                    email: user.email,
                    password: currentPassword,
                  });
                  if (error) {
                    setPasswordErrors({ current: "Mot de passe actuel incorrect." });
                    document.getElementById("current-password")?.focus();
                    return;
                  }
                  setPasswordErrors({});
                  setPasswordStep(2);
                } catch (error) {
                  console.error("verify current password error:", error);
                  toast.error("Vérification impossible pour le moment.");
                } finally {
                  setVerifyingPassword(false);
                }
                }}
                disabled={verifyingPassword || !currentPassword}
              >
                {verifyingPassword ? "Vérification…" : "Suivant"}
              </Button>
            </div>
          </div>
        ) : (
          <div className="mx-auto mt-5 max-w-md space-y-4">
            <PasswordField
              id="new-password"
              label="Nouveau mot de passe"
              value={newPassword}
              onChange={(value) => {
                setNewPassword(value);
                if (passwordErrors.new) setPasswordErrors((errors) => ({ ...errors, new: undefined }));
              }}
              autoComplete="new-password"
              error={passwordErrors.new}
            />
            <PasswordField
              id="confirm-password"
              label="Confirmer le nouveau mot de passe"
              value={confirmPassword}
              onChange={(value) => {
                setConfirmPassword(value);
                if (passwordErrors.confirm) setPasswordErrors((errors) => ({ ...errors, confirm: undefined }));
              }}
              autoComplete="new-password"
              error={passwordErrors.confirm}
            />
            <ul className="space-y-1 text-xs text-muted-foreground">
              <li className={newPassword.length >= MIN_PASSWORD_LENGTH ? "text-emerald-600" : undefined}>
                Au moins {MIN_PASSWORD_LENGTH} caractères
              </li>
              <li
                className={
                  newPassword.length > 0 && newPassword !== currentPassword ? "text-emerald-600" : undefined
                }
              >
                Différent de l'ancien mot de passe
              </li>
              <li className={newPassword === confirmPassword && newPassword.length > 0 ? "text-emerald-600" : undefined}>
                Les deux saisies sont identiques
              </li>
            </ul>
            <div className="flex justify-between gap-3">
              <Button type="button" variant="ghost" onClick={() => setPasswordStep(1)} disabled={changingPassword}>
                Retour
              </Button>
              <Button
                variant="accent"
                type="button"
                onClick={async () => {
                  if (newPassword.length < MIN_PASSWORD_LENGTH) {
                    setPasswordErrors({ new: `Le mot de passe doit contenir au moins ${MIN_PASSWORD_LENGTH} caractères.` });
                    document.getElementById("new-password")?.focus();
                    return;
                  }
                  if (newPassword === currentPassword) {
                    setPasswordErrors({ new: "Le nouveau mot de passe doit être différent de l'ancien." });
                    document.getElementById("new-password")?.focus();
                    return;
                  }
                  if (newPassword !== confirmPassword) {
                    setPasswordErrors({ confirm: "Les mots de passe ne correspondent pas." });
                    document.getElementById("confirm-password")?.focus();
                    return;
                  }
                  setChangingPassword(true);
                  try {
                    const { error } = await supabase.auth.updateUser({ password: newPassword });
                    if (error) throw error;
                    setCurrentPassword("");
                    setNewPassword("");
                    setConfirmPassword("");
                    setPasswordStep(1);
                    setPasswordErrors({});
                    toast.success("Mot de passe mis à jour.");
                  } catch (error) {
                    console.error("update password error:", error);
                    toast.error("Impossible de mettre à jour le mot de passe.");
                  } finally {
                    setChangingPassword(false);
                  }
                }}
                disabled={changingPassword}
              >
                {changingPassword ? "Mise à jour…" : "Modifier le mot de passe"}
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
