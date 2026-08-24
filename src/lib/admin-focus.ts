/**
 * Passage de relais entre la boîte de réception et la page ciblée par une
 * notification.
 *
 * Le paramètre d'URL (`?order=`, `?review=`, `?produit=`…) suffit en théorie,
 * mais il dépend entièrement du routeur pour survivre à la navigation : si le
 * paramètre est filtré en chemin, la page s'ouvre sans rien sélectionner et le
 * clic paraît sans effet. Ce relais en mémoire est lu au montage de la page de
 * destination et ne dépend de rien d'autre.
 *
 * Les deux voies coexistent volontairement : le relais couvre le clic, le
 * paramètre d'URL couvre le lien collé, le rafraîchissement et l'ouverture dans
 * un nouvel onglet.
 */
export type AdminFocus = { path: string; search: Record<string, string> };

let pending: AdminFocus | null = null;

export function setAdminFocus(focus: AdminFocus): void {
  pending = focus;
}

/**
 * Récupère la cible en attente pour cette page, et la consomme — une même
 * notification ne doit pas rouvrir sa fiche à chaque remontage du composant.
 */
export function takeAdminFocus(path: string): Record<string, string> | null {
  if (!pending || pending.path !== path) return null;
  const { search } = pending;
  pending = null;
  return search;
}
