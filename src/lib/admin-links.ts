/**
 * Les notifications stockent leur destination dans une simple colonne texte
 * (`notifications.link`), query string comprise — par exemple
 * `/admin/commandes?order=<uuid>`. TanStack Router attend un chemin dans `to`
 * et les paramètres à part dans `search` : passer la chaîne entière à `to` ne
 * fonctionne pas.
 */
export function parseAdminLink(
  link: string | null | undefined,
): { to: string; search: Record<string, string> } | null {
  if (!link) return null;
  const [pathname, queryString] = link.split("?");
  if (!pathname) return null;
  return {
    to: pathname,
    search: Object.fromEntries(new URLSearchParams(queryString ?? "")),
  };
}

/**
 * Numéro de commande contenu dans le titre d'une notification
 * (« Nouvelle commande CMD-20260823-4 »).
 *
 * Sert de repli pour les notifications créées avant que le lien ne porte
 * l'identifiant de la commande : le numéro suffit à retrouver la fiche, sans
 * dépendre d'une migration de la base.
 */
export function orderReferenceFromTitle(title: string | null | undefined): string | null {
  const match = title?.match(/(?:CMD|ORD)-[A-Za-z0-9-]+/);
  return match ? match[0] : null;
}

/**
 * Nom du produit contenu dans le corps d'une alerte de stock
 * (« Coussin Miroir — 3 en stock », ou « Coussin Miroir — SKU-12 — 0 en stock »).
 *
 * Même rôle que orderReferenceFromTitle : permettre d'ouvrir la fiche depuis
 * une alerte antérieure à l'ajout de l'identifiant dans le lien.
 */
export function productNameFromBody(body: string | null | undefined): string | null {
  const first = body?.split(" — ")[0]?.trim();
  return first ? first : null;
}
