import React, { createContext, useCallback, useContext, useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

/**
 * Coordonnees et reseaux sociaux de la boutique (table singleton
 * public.site_settings, cf. database/site-settings.sql).
 *
 * Un seul provider monte au niveau du root : le header, le footer et la page
 * /contact affichent les memes valeurs sans refaire une requete chacun, et
 * /admin/parametres appelle `refresh()` apres enregistrement pour que la
 * boutique reflete le changement sans rechargement.
 */
export type SiteSettings = {
  id: string;
  phone: string | null;
  email: string | null;
  address: string | null;
  instagram_url: string | null;
  facebook_url: string | null;
  tiktok_url: string | null;
  whatsapp_url: string | null;
  /**
   * Tarif de livraison unique pour toute la Tunisie, en DT
   * (cf. database/shipping-flat-rate.sql). 0 = livraison gratuite.
   */
  shipping_price: number;
};

type SiteSettingsContextValue = {
  settings: SiteSettings | null;
  loading: boolean;
  refresh: () => Promise<void>;
};

const SiteSettingsContext = createContext<SiteSettingsContextValue | null>(null);

const COLUMNS =
  "id, phone, email, address, instagram_url, facebook_url, tiktok_url, whatsapp_url, shipping_price";

/**
 * Id fige de la ligne unique (cf. le CHECK dans database/site-settings.sql).
 * Connaitre cet id permet a l'admin d'ecrire la ligne meme quand la lecture
 * initiale a echoue (table pas encore creee au chargement de la page).
 */
export const SITE_SETTINGS_ID = "00000000-0000-0000-0000-000000000001";

export async function fetchSiteSettings(): Promise<SiteSettings | null> {
  const { data, error } = await supabase.from("site_settings").select(COLUMNS).limit(1).maybeSingle();
  if (error) {
    console.error("load site settings", error);
    return null;
  }
  if (!data) return null;
  // numeric revient en string via PostgREST : on normalise ici, une fois, pour
  // que tous les consommateurs (panier, checkout, admin) aient un number.
  const row = data as Omit<SiteSettings, "shipping_price"> & { shipping_price: number | string | null };
  return { ...row, shipping_price: Number(row.shipping_price ?? 0) };
}

export function SiteSettingsProvider({ children }: { children: React.ReactNode }) {
  const [settings, setSettings] = useState<SiteSettings | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    const next = await fetchSiteSettings();
    if (next) setSettings(next);
  }, []);

  useEffect(() => {
    let mounted = true;
    fetchSiteSettings()
      .then((data) => {
        if (!mounted) return;
        setSettings(data);
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });
    return () => {
      mounted = false;
    };
  }, []);

  return (
    <SiteSettingsContext.Provider value={{ settings, loading, refresh }}>
      {children}
    </SiteSettingsContext.Provider>
  );
}

export function useSiteSettings(): SiteSettingsContextValue {
  const ctx = useContext(SiteSettingsContext);
  if (!ctx) throw new Error("useSiteSettings must be used within SiteSettingsProvider");
  return ctx;
}
