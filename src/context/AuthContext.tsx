import React, { createContext, useContext, useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

type Profile = {
  id: string;
  role?: string;
  first_name?: string | null;
  last_name?: string | null;
  email?: string | null;
};

type AuthContextValue = {
  user: any | null;
  profile: Profile | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error?: any }>;
  signUp: (
    email: string,
    password: string,
    attrs?: Partial<Profile>,
    captchaToken?: string
  ) => Promise<{ error?: any }>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<any | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

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
    },
  });

  if (res.error) console.error("signUp error:", res.error, "response:", res.data);
  const u = res.data?.user ?? null;
  if (!res.error && u) {
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

  return (
    <AuthContext.Provider value={{ user, profile, loading, signIn, signUp, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}