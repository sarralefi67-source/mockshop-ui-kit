import React, { createContext, useContext, useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

type Profile = {
  id: string;
  role?: string;
  first_name?: string | null;
  last_name?: string | null;
  email?: string | null;
  phone?: string | null;
  newsletter_opt_in?: boolean | null;
};

export type AuthMode = "signin" | "signup";

/** Etat de la modale de connexion / inscription (voir AuthDialog). */
type AuthDialogState = { open: boolean; mode: AuthMode; redirect: string | null };

type AuthContextValue = {
  user: any | null;
  profile: Profile | null;
  loading: boolean;
  /**
   * true uniquement si une session Supabase est active ET que le profil
   * associé a le rôle "customer". La session Supabase est partagée entre
   * la vitrine et le back-office admin (même client, même storage du
   * navigateur) : un admin connecté sur /admin peut donc apparaître comme
   * "user" ici. Tout code vitrine qui gère commande/compte client doit se
   * baser sur `isCustomer`, jamais sur `user` seul.
   */
  isCustomer: boolean;
  signIn: (email: string, password: string) => Promise<{ error?: any }>;
  signUp: (
    email: string,
    password: string,
    attrs?: Partial<Profile>,
    captchaToken?: string
  ) => Promise<{ error?: any }>;
  signOut: () => Promise<void>;
  authDialog: AuthDialogState;
  /** Ouvre la modale. `redirect` sert quand l'action en cours exige une
   *  destination une fois connecté (commander, consulter son compte…). */
  openAuth: (mode?: AuthMode, redirect?: string | null) => void;
  setAuthMode: (mode: AuthMode) => void;
  closeAuth: () => void;
};

export const PENDING_SIGNUP_STORAGE_KEY = "artisanat.pendingSignup";

export const isPendingSignup = () => {
  if (typeof window === "undefined") return false;
  return window.localStorage.getItem(PENDING_SIGNUP_STORAGE_KEY) === "1";
};

export const setPendingSignup = (pending: boolean) => {
  if (typeof window === "undefined") return;
  if (pending) {
    window.localStorage.setItem(PENDING_SIGNUP_STORAGE_KEY, "1");
    return;
  }
  window.localStorage.removeItem(PENDING_SIGNUP_STORAGE_KEY);
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<any | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [authDialog, setAuthDialog] = useState<AuthDialogState>({
    open: false,
    mode: "signin",
    redirect: null,
  });

  const openAuth = (mode: AuthMode = "signin", redirect: string | null = null) => {
    if (mode === "signin") setPendingSignup(false);
    setAuthDialog({ open: true, mode, redirect });
  };
  const setAuthMode = (mode: AuthMode) => setAuthDialog((prev) => ({ ...prev, mode }));
  const closeAuth = () => setAuthDialog((prev) => ({ ...prev, open: false }));

  useEffect(() => {
    let mounted = true;

    async function init() {
      const { data } = await supabase.auth.getSession();
      if (!mounted) return;
      const session = data.session;
      const u = session?.user ?? null;
      setUser(u);
      if (u) {
        const { data: p } = await supabase.from("profiles").select("*").eq("id", u.id).maybeSingle();
        setProfile(p ?? null);
      } else {
        setProfile(null);
      }
      setLoading(false);
    }

    init();

    const { data: sub } = supabase.auth.onAuthStateChange(async (_event, sess) => {
      const u = sess?.user ?? null;
      setUser(u);
      if (u) {
        const { data: p } = await supabase.from("profiles").select("*").eq("id", u.id).maybeSingle();
        setProfile(p ?? null);
      } else {
        setProfile(null);
      }
    });

    return () => {
      mounted = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  async function signIn(email: string, password: string) {
    const res = await supabase.auth.signInWithPassword({ email, password });
    // debug logs to surface API error details during development
    if (res.error) console.error("signIn error:", res.error, "response:", res.data);
    if (!res.error && res.data?.user) {
      setPendingSignup(false);
      const { data: p } = await supabase.from("profiles").select("*").eq("id", res.data.user.id).maybeSingle();
      setProfile(p ?? null);
    }
    return { error: res.error };
  }

 async function signUp(email: string, password: string, attrs?: Partial<Profile>, captchaToken?: string) {
  // supabase-js v2 : signUp prend UN SEUL objet, avec `options.data` pour les
  // métadonnées utilisateur et `options.captchaToken` (camelCase) pour hCaptcha.
  // exactOptionalPropertyTypes:true oblige à omettre la clé plutôt que de la
  // mettre à `undefined`.
  const res = await supabase.auth.signUp({
    email,
    password,
    options: {
      ...(attrs ? { data: attrs } : {}),
      ...(captchaToken ? { captchaToken } : {}),
      emailRedirectTo: `${window.location.origin}/compte`,
    },
  });

  if (res.error) console.error("signUp error:", res.error, "response:", res.data);
  const u = res.data?.user ?? null;
  if (!res.error && u) {
    setPendingSignup(Boolean(!res.data.session));
    try {
      const { data: p, error: fetchErr } = await supabase.from("profiles").select("*").eq("id", u.id).maybeSingle();
      if (fetchErr) {
        console.warn("Could not fetch profile after signUp (likely awaiting DB trigger):", fetchErr);
      }
      setProfile(p ?? null);
    } catch (err) {
      console.warn("Profile read failed after signUp:", err);
    }
  }
  return { error: res.error };
}

  async function signOut() {
    await supabase.auth.signOut();
    setUser(null);
    setProfile(null);
  }

  const isCustomer = Boolean(user) && profile?.role === "customer";

  return (
    <AuthContext.Provider
      value={{
        user,
        profile,
        loading,
        isCustomer,
        signIn,
        signUp,
        signOut,
        authDialog,
        openAuth,
        setAuthMode,
        closeAuth,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}