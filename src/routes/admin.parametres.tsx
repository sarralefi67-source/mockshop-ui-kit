import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/lib/supabaseClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle,
} from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  ArrowLeft, ArrowRight, Check, Eye, EyeOff, ImagePlus, Truck, X,
} from "lucide-react";
import { formatPrice } from "@/lib/placeholder";
import { useAuth } from "@/context/AuthContext";
import { useSiteSettings, SITE_SETTINGS_ID, type SiteSettings } from "@/context/SiteSettingsContext";
import { uploadToBucket } from "@/lib/storage";

export const Route = createFileRoute("/admin/parametres")({
  component: AdminParametres,
});

/**
 * Champs editables de public.site_settings, dans l'ordre d'affichage.
 * shipping_price est tenu en string : un <input type="number"> controle par un
 * number ne laisse pas vider le champ ni taper "7." pendant la saisie.
 */
type SettingsForm = Omit<SiteSettings, "id" | "shipping_price"> & { shipping_price: string };

const EMPTY_SETTINGS: SettingsForm = {
  phone: "",
  email: "",
  address: "",
  instagram_url: "",
  facebook_url: "",
  tiktok_url: "",
  whatsapp_url: "",
  favicon_url: "",
  shipping_price: "0",
};

const SOCIAL_FIELDS: { key: keyof SettingsForm; label: string; placeholder: string }[] = [
  { key: "instagram_url", label: "Instagram", placeholder: "https://instagram.com/votre_compte" },
  { key: "facebook_url", label: "Facebook", placeholder: "https://facebook.com/votre_page" },
  { key: "tiktok_url", label: "TikTok", placeholder: "https://www.tiktok.com/@votre_compte" },
  { key: "whatsapp_url", label: "WhatsApp", placeholder: "https://wa.me/21671000000" },
];

const MIN_PASSWORD_LENGTH = 8;

/**
 * Normalise un lien social. Un champ vide est valide (le reseau est alors
 * masque dans le header). On accepte aussi un domaine nu type
 * "www.tiktok.com/@moi" : sans schema, le navigateur traiterait le href comme
 * un chemin relatif et l'icone renverrait sur la boutique elle-meme, donc on
 * prefixe https://.
 */
function normalizeUrl(value: string | null): { ok: boolean; value: string } {
  const raw = String(value ?? "").trim();
  if (!raw) return { ok: true, value: "" };
  const withScheme = /^https?:\/\//i.test(raw) ? raw : `https://${raw}`;
  try {
    const parsed = new URL(withScheme);
    if (!parsed.hostname.includes(".")) return { ok: false, value: raw };
    return { ok: true, value: withScheme };
  } catch {
    return { ok: false, value: raw };
  }
}

/** Champ mot de passe avec l'oeil afficher/masquer pose dans le champ. */
function PasswordField({
  id,
  label,
  value,
  onChange,
  autoComplete,
  onEnter,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  autoComplete: string;
  onEnter?: () => void;
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
          onKeyDown={(e) => {
            if (e.key === "Enter" && onEnter) {
              e.preventDefault();
              onEnter();
            }
          }}
          className="pr-11"
        />
        {/* size="icon" fait 9x9 comme l'Input lui-meme : ramene a 7x7 pour
            tenir dans le champ sans en recouvrir tout le bord droit. */}
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={() => setVisible((v) => !v)}
          aria-label={visible ? "Masquer le mot de passe" : "Afficher le mot de passe"}
          className="absolute right-1 top-1/2 h-7 w-7 -translate-y-1/2 text-muted-foreground"
        >
          {visible ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
        </Button>
      </div>
    </div>
  );
}

/** Ligne de controle du nouveau mot de passe (longueur, similitude...). */
function Rule({ ok, children }: { ok: boolean; children: React.ReactNode }) {
  return (
    <li className={`flex items-center gap-2 ${ok ? "text-emerald-600" : "text-muted-foreground"}`}>
      {ok ? <Check className="h-3.5 w-3.5" /> : <X className="h-3.5 w-3.5" />}
      {children}
    </li>
  );
}

function AdminParametres() {
  const { user } = useAuth();
  const { settings, loading: loadingSettings, refresh: refreshSettings } = useSiteSettings();

  // --- Coordonnees & reseaux sociaux --------------------------------------
  const [form, setForm] = useState<SettingsForm>(EMPTY_SETTINGS);
  const [savingSettings, setSavingSettings] = useState(false);
  const [uploadingFavicon, setUploadingFavicon] = useState(false);


  // --- Mot de passe (assistant en 2 etapes) -------------------------------
  const [pwStep, setPwStep] = useState<1 | 2>(1);
  const [currentPassword, setCurrentPassword] = useState("");
  const [nextPassword, setNextPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [verifying, setVerifying] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);

  // Le contexte a deja charge la ligne : on hydrate juste le formulaire.
  useEffect(() => {
    if (!settings) return;
    setForm({
      phone: settings.phone ?? "",
      email: settings.email ?? "",
      address: settings.address ?? "",
      instagram_url: settings.instagram_url ?? "",
      facebook_url: settings.facebook_url ?? "",
      tiktok_url: settings.tiktok_url ?? "",
      whatsapp_url: settings.whatsapp_url ?? "",
      favicon_url: settings.favicon_url ?? "",
      shipping_price: String(settings.shipping_price ?? 0),
    });
  }, [settings]);

  const setField = (key: keyof SettingsForm, value: string) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  const handleFaviconUpload = async (file: File) => {
    setUploadingFavicon(true);
    try {
      const safeName = file.name.replace(/\s+/g, "_").replace(/[^a-zA-Z0-9._-]/g, "");
      // Horodaté : le navigateur met les favicons en cache très agressivement,
      // un nom fixe garderait l'ancienne icône affichée après remplacement.
      const publicUrl = await uploadToBucket("site", `favicon-${Date.now()}-${safeName}`, file);
      setField("favicon_url", publicUrl);
      toast.success("Icône chargée. Enregistrez pour l'appliquer.");
    } catch (err) {
      console.error("upload favicon", err);
      toast.error("Échec de l'envoi de l'icône.");
    } finally {
      setUploadingFavicon(false);
    }
  };

  const settingsDirty = useMemo(() => {
    // Compare a EMPTY_SETTINGS quand la ligne n'a pas pu etre lue, sinon le
    // bouton resterait grise alors que l'admin a bel et bien saisi quelque
    // chose (c'etait le cas quand la page etait ouverte avant la migration).
    const reference = settings ?? EMPTY_SETTINGS;
    return (Object.keys(EMPTY_SETTINGS) as (keyof SettingsForm)[]).some(
      (key) => String(form[key] ?? "").trim() !== String(reference[key] ?? "").trim(),
    );
  }, [form, settings]);

  const saveSettings = async () => {
    const email = (form.email ?? "").trim();
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      toast.error("L'adresse e-mail n'est pas valide.");
      return;
    }

    const urls = {} as Record<keyof SettingsForm, string>;
    for (const field of SOCIAL_FIELDS) {
      const result = normalizeUrl(form[field.key]);
      if (!result.ok) {
        toast.error(`Le lien ${field.label} n'est pas une adresse valide.`);
        return;
      }
      urls[field.key] = result.value;
    }

    setSavingSettings(true);
    try {
      // Les champs vides sont stockes en NULL : header, footer et /contact
      // masquent alors la ligne au lieu d'afficher un blanc.
      const clean = (value: string | null) => String(value ?? "").trim() || null;
      const payload = {
        phone: clean(form.phone),
        email: clean(form.email),
        address: clean(form.address),
        instagram_url: clean(urls.instagram_url),
        facebook_url: clean(urls.facebook_url),
        tiktok_url: clean(urls.tiktok_url),
        whatsapp_url: clean(urls.whatsapp_url),
        favicon_url: clean(form.favicon_url),
        shipping_price: Number(form.shipping_price),
      };

      // upsert plutot qu'update : l'id du singleton est connu, donc on ecrit la
      // ligne meme si la lecture initiale a echoue (page ouverte avant que la
      // migration ne soit appliquee). Evite un bouton definitivement grise.
      const { error } = await supabase
        .from("site_settings")
        .upsert({ id: settings?.id ?? SITE_SETTINGS_ID, ...payload })
        .select()
        .maybeSingle();
      if (error) throw error;

      // Renvoie les URLs normalisees dans le formulaire (https:// ajoute).
      setForm((prev) => ({ ...prev, ...urls }));
      await refreshSettings();
      toast.success("Coordonnées et réseaux sociaux mis à jour.");
    } catch (err) {
      console.error("saveSettings", err);
      toast.error("Erreur lors de l'enregistrement des paramètres.");
    } finally {
      setSavingSettings(false);
    }
  };


  // ------------------------------------------------------------ mot de passe

  const rules = useMemo(
    () => ({
      length: nextPassword.length >= MIN_PASSWORD_LENGTH,
      different: nextPassword.length > 0 && nextPassword !== currentPassword,
      match: nextPassword.length > 0 && nextPassword === confirmPassword,
    }),
    [nextPassword, confirmPassword, currentPassword],
  );
  const canSubmitPassword = rules.length && rules.different && rules.match;

  const resetPasswordFlow = () => {
    setPwStep(1);
    setCurrentPassword("");
    setNextPassword("");
    setConfirmPassword("");
  };

  /** Etape 1 : on verifie le mot de passe actuel avant d'aller plus loin. */
  const verifyCurrentPassword = async () => {
    const email = user?.email as string | undefined;
    if (!email) {
      toast.error("Session expirée, reconnectez-vous.");
      return;
    }
    if (!currentPassword) {
      toast.error("Saisissez votre mot de passe actuel.");
      return;
    }

    setVerifying(true);
    try {
      // Supabase autorise updateUser sur la seule foi de la session : on
      // revalide donc explicitement le mot de passe actuel, sinon une session
      // laissee ouverte suffirait a s'approprier le compte admin.
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password: currentPassword,
      });
      if (error) {
        toast.error("Mot de passe actuel incorrect.");
        return;
      }
      setPwStep(2);
    } catch (err) {
      console.error("verifyCurrentPassword", err);
      toast.error("Vérification impossible pour le moment.");
    } finally {
      setVerifying(false);
    }
  };

  /** Etape 2 : le mot de passe actuel est deja valide a ce stade. */
  const changePassword = async () => {
    if (!canSubmitPassword) return;

    setSavingPassword(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: nextPassword });
      if (error) throw error;
      resetPasswordFlow();
      toast.success("Mot de passe modifié.");
    } catch (err) {
      console.error("changePassword", err);
      toast.error("Impossible de modifier le mot de passe.");
    } finally {
      setSavingPassword(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Paramètres</h1>
        <p className="text-sm text-muted-foreground">Gérez les paramètres globaux de la boutique.</p>
      </div>

      <Tabs defaultValue="coordonnees">
        <TabsList>
          <TabsTrigger value="coordonnees">Coordonnées &amp; réseaux</TabsTrigger>
          <TabsTrigger value="livraison">Livraison</TabsTrigger>
          <TabsTrigger value="securite">Sécurité</TabsTrigger>
        </TabsList>

        <TabsContent value="coordonnees" className="mt-6">
          <Card className="shadow-none">
            <CardHeader>
              <CardTitle className="text-lg">Coordonnées de la boutique</CardTitle>
              <CardDescription>
                Affichées dans le bandeau du header, le footer et la page Contact.
              </CardDescription>
            </CardHeader>

            <CardContent className="space-y-4">
          

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="set-phone">Téléphone</Label>
                <Input
                  id="set-phone"
                  value={form.phone ?? ""}
                  onChange={(e) => setField("phone", e.target.value)}
                  placeholder="+216 71 000 000"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="set-email">E-mail</Label>
                <Input
                  id="set-email"
                  type="email"
                  value={form.email ?? ""}
                  onChange={(e) => setField("email", e.target.value)}
                  placeholder="contact@artisanat.tn"
                />
              </div>
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="set-address">Adresse</Label>
                <Input
                  id="set-address"
                  value={form.address ?? ""}
                  onChange={(e) => setField("address", e.target.value)}
                  placeholder="Avenue Habib Bourguiba, Tunis"
                />
              </div>
            </div>

            <Separator />

            <div>
              <h3 className="text-base font-semibold">Icône du site</h3>
              <p className="text-sm text-muted-foreground">
                Affichée dans l'onglet du navigateur et les favoris. Une image carrée donne le
                meilleur rendu ; PNG, SVG ou ICO. Laissez vide pour garder l'icône par défaut.
              </p>
              <div className="mt-4 flex flex-wrap items-center gap-4">
                {form.favicon_url ? (
                  <img
                    src={form.favicon_url}
                    alt="Icône du site"
                    className="h-16 w-16 rounded-md border border-border bg-surface object-contain p-1"
                  />
                ) : (
                  <div className="grid h-16 w-16 place-items-center rounded-md border-2 border-dashed border-border text-muted-foreground">
                    <ImagePlus className="h-6 w-6" />
                  </div>
                )}
                <div className="flex items-center gap-3">
                  <label className="cursor-pointer text-sm font-semibold text-accent-strong hover:underline">
                    {uploadingFavicon
                      ? "Envoi…"
                      : form.favicon_url
                        ? "Changer l'icône"
                        : "Choisir une image"}
                    <input
                      type="file"
                      accept="image/png,image/svg+xml,image/x-icon,image/vnd.microsoft.icon,image/jpeg,image/webp"
                      className="hidden"
                      disabled={uploadingFavicon}
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) handleFaviconUpload(file);
                        e.target.value = "";
                      }}
                    />
                  </label>
                  {form.favicon_url && (
                    <button
                      type="button"
                      className="text-sm text-muted-foreground hover:text-destructive"
                      onClick={() => setField("favicon_url", "")}
                    >
                      Retirer
                    </button>
                  )}
                </div>
              </div>
            </div>

            <Separator />

            <div>
              <h3 className="text-base font-semibold">Réseaux sociaux</h3>
             
              <div className="mt-4 grid gap-4 sm:grid-cols-2">
                {SOCIAL_FIELDS.map(({ key, label, placeholder }) => (
                  <div key={key} className="space-y-2">
                    <Label htmlFor={`set-${key}`}>{label}</Label>
                    <Input
                      id={`set-${key}`}
                      type="text"
                      inputMode="url"
                      value={form[key] ?? ""}
                      onChange={(e) => setField(key, e.target.value)}
                      placeholder={placeholder}
                    />
                  </div>
                ))}
              </div>
            </div>

            </CardContent>

            <CardFooter className="justify-end">
              <Button
                variant="accent"
                onClick={saveSettings}
                disabled={savingSettings || !settingsDirty}
              >
                {savingSettings ? "Enregistrement…" : "Enregistrer"}
              </Button>
            </CardFooter>
          </Card>
        </TabsContent>

        <TabsContent value="livraison" className="mt-6">
          <Card className="shadow-none">
            <CardHeader>
              <CardTitle className="text-lg">Frais de livraison</CardTitle>
              <CardDescription>
                Un tarif unique appliqué à toute la Tunisie, ajouté au total de chaque commande.
              </CardDescription>
            </CardHeader>

            <CardContent className="space-y-4">
              <div className="max-w-xs space-y-2">
                <Label htmlFor="shipping-price">Tarif de livraison</Label>
                <div className="relative">
                  <Truck className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-accent-strong" />
                  <Input
                    id="shipping-price"
                    type="number"
                    min="0"
                    step="0.001"
                    value={form.shipping_price ?? "0"}
                    onChange={(e) => setField("shipping_price", e.target.value)}
                    placeholder="7.000"
                    className="pl-9 pr-10"
                  />
                  <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs font-medium text-muted-foreground">
                    DT
                  </span>
                </div>
              </div>

              <Alert>
                <Truck className="h-4 w-4" />
                <AlertTitle>
                  {Number(form.shipping_price ?? 0) > 0
                    ? `Livraison facturée ${formatPrice(Number(form.shipping_price ?? 0))}`
                    : "Livraison gratuite"}
                </AlertTitle>
              
              </Alert>
            </CardContent>

            <CardFooter className="justify-end">
              <Button
                variant="accent"
                onClick={saveSettings}
                disabled={savingSettings || !settingsDirty}
              >
                {savingSettings ? "Enregistrement…" : "Enregistrer"}
              </Button>
            </CardFooter>
          </Card>
        </TabsContent>
        <TabsContent value="securite" className="mt-6">
          <Card className="shadow-none">
            <CardHeader>
              <CardTitle className="text-lg">Mot de passe</CardTitle>
              <CardDescription>
                Modifiez le mot de passe du compte administrateur
                {user?.email ? ` ${user.email}` : ""}.
              </CardDescription>
            </CardHeader>

            <CardContent className="space-y-5">
            <ol className="flex items-center justify-center gap-3 text-sm">
              {[
                { step: 1 as const, label: "Mot de passe actuel" },
                { step: 2 as const, label: "Nouveau mot de passe" },
              ].map(({ step, label }, index) => (
                <li key={step} className="flex items-center gap-3">
                  {index > 0 && <span className="h-px w-8 bg-border" />}
                  <span
                    className={`flex items-center gap-2 ${
                      pwStep === step ? "font-semibold text-foreground" : "text-muted-foreground"
                    }`}
                  >
                    <span
                      className={`grid h-6 w-6 place-items-center rounded-full text-xs font-bold ${
                        pwStep > step
                          ? "bg-emerald-600 text-white"
                          : pwStep === step
                            ? "bg-accent-strong text-accent-strong-foreground"
                            : "bg-surface text-muted-foreground"
                      }`}
                    >
                      {pwStep > step ? <Check className="h-3.5 w-3.5" /> : step}
                    </span>
                    {label}
                  </span>
                </li>
              ))}
            </ol>

            {pwStep === 1 ? (
              <div className="mx-auto max-w-md space-y-4">
                <PasswordField
                  id="pw-current"
                  label="Mot de passe actuel"
                  value={currentPassword}
                  onChange={setCurrentPassword}
                  autoComplete="current-password"
                  onEnter={verifyCurrentPassword}
                />
                <div className="flex justify-end">
                  <Button
                    variant="accent"
                    onClick={verifyCurrentPassword}
                    disabled={verifying || !currentPassword}
                  >
                    {verifying ? "Vérification…" : "Suivant"}
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ) : (
              <div className="mx-auto max-w-md space-y-4">
                <PasswordField
                  id="pw-next"
                  label="Nouveau mot de passe"
                  value={nextPassword}
                  onChange={setNextPassword}
                  autoComplete="new-password"
                />
                <PasswordField
                  id="pw-confirm"
                  label="Confirmer le nouveau mot de passe"
                  value={confirmPassword}
                  onChange={setConfirmPassword}
                  autoComplete="new-password"
                  onEnter={changePassword}
                />

                <ul className="space-y-1.5 text-xs">
                  <Rule ok={rules.length}>Au moins {MIN_PASSWORD_LENGTH} caractères</Rule>
                  <Rule ok={rules.different}>Différent du mot de passe actuel</Rule>
                  <Rule ok={rules.match}>Les deux saisies sont identiques</Rule>
                </ul>

                <div className="flex justify-between gap-3">
                  <Button variant="ghost" onClick={() => setPwStep(1)} disabled={savingPassword}>
                    <ArrowLeft className="h-4 w-4" /> Retour
                  </Button>
                  <Button
                    variant="accent"
                    onClick={changePassword}
                    disabled={savingPassword || !canSubmitPassword}
                  >
                    {savingPassword ? "Modification…" : "Modifier le mot de passe"}
                  </Button>
                </div>
              </div>
            )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

    </div>
  );
}
