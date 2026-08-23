/**
 * Génération d'identifiants côté client.
 *
 * `crypto.randomUUID()` n'est exposé que dans un contexte sécurisé (HTTPS ou
 * localhost). En accédant à l'admin par une IP du réseau local en http —
 * http://192.168.1.18:8080 par exemple — la fonction n'existe pas et lève
 * « crypto.randomUUID is not a function ».
 *
 * `crypto.getRandomValues()`, lui, reste disponible en http : on s'en sert pour
 * fabriquer un UUID v4 conforme, ce qui compte pour les identifiants envoyés en
 * base sur une colonne `uuid`.
 */

function fromRandomBytes(bytes: Uint8Array): string {
  const b = Array.from(bytes, (value) => value & 0xff);
  b[6] = ((b[6] ?? 0) & 0x0f) | 0x40; // version 4
  b[8] = ((b[8] ?? 0) & 0x3f) | 0x80; // variante RFC 4122
  const hex = b.map((value) => value.toString(16).padStart(2, "0")).join("");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

/** UUID v4, quel que soit le contexte (http compris). */
export function randomUUID(): string {
  const webCrypto = globalThis.crypto;
  if (webCrypto && typeof webCrypto.randomUUID === "function") {
    return webCrypto.randomUUID();
  }
  if (webCrypto && typeof webCrypto.getRandomValues === "function") {
    return fromRandomBytes(webCrypto.getRandomValues(new Uint8Array(16)));
  }
  // Dernier recours (pas de WebCrypto du tout) : non cryptographique, mais la
  // forme reste celle d'un UUID v4 et l'unicité suffit à nos usages.
  const bytes = Uint8Array.from({ length: 16 }, () => Math.floor(Math.random() * 256));
  return fromRandomBytes(bytes);
}

/**
 * Identifiant local préfixé, pour les clés React des lignes pas encore
 * enregistrées (images, valeurs d'attribut…). Deux entrées partageant le même
 * id cassent le rendu : « Supprimer » semble sans effet, ou retire la mauvaise
 * ligne.
 */
export function genId(prefix: string): string {
  return `${prefix}-${randomUUID()}`;
}
