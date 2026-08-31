import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function isSafeUrl(url: string | null | undefined): url is string {
  if (!url) return false;
  try {
    const parsed = new URL(url.trim());
    return parsed.protocol === "http:" || parsed.protocol === "https:";
  } catch {
    return false;
  }
}

/**
 * Valide que la redirection est une route interne (chemin relatif commençant par /).
 * Empêche les open redirects vers des domaines externes.
 */
export function isSafeRedirect(redirect: unknown): redirect is string {
  if (typeof redirect !== "string") return false;
  const trimmed = redirect.trim();
  // Doit commencer par "/" et ne pas contenir de protocole ou "//"
  return trimmed.startsWith("/") && !trimmed.includes("://") && !trimmed.includes("//");
}
