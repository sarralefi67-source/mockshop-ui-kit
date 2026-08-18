import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/types";

// Use bracket access to satisfy TS index signature types for import.meta.env
const url = import.meta.env["VITE_SUPABASE_URL"];
const key = import.meta.env["VITE_SUPABASE_ANON_KEY"];

if (!url || !key) {
  console.warn("VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY is not set. Supabase will not work without them.");
}

// Node.js < 22 (côté SSR de Vite en dev) n'a pas de WebSocket natif :
// on fournit le package "ws" comme transport uniquement quand on n'est pas dans un navigateur.
const isBrowser = typeof window !== "undefined";

let _supabase: ReturnType<typeof createClient<Database>>;

if (isBrowser) {
  _supabase = createClient<Database, 'public'>(url ?? "", key ?? "");
} else {
  // dynamic import of ws for SSR in dev; cast to any to avoid strict type mismatches
  const wsModule = await import("ws");
  const transport = (wsModule as any).default ?? (wsModule as any);
  _supabase = createClient<Database, 'public'>(url ?? "", key ?? "", { realtime: { transport: transport as any } as any } as any);
}

export const supabase = _supabase;
export default supabase;