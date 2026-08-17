import type { Category, CategoryNode } from "@/types";

export const categories: Category[] = [
  // Niveau 1
  { id: "c-info", parent_id: null, name: "Informatique", slug: "informatique", position: 1, is_active: true, description: "PC, composants et périphériques" },
  { id: "c-tel", parent_id: null, name: "Téléphonie", slug: "telephonie", position: 2, is_active: true, description: "Smartphones et accessoires" },
  { id: "c-maison", parent_id: null, name: "Maison & Électroménager", slug: "maison-electromenager", position: 3, is_active: true, description: "Petit et gros électroménager" },
  { id: "c-mode", parent_id: null, name: "Mode & Accessoires", slug: "mode-accessoires", position: 4, is_active: true, description: "Vêtements, sacs et montres" },

  // Niveau 2 — Informatique
  { id: "c-info-pc", parent_id: "c-info", name: "Ordinateurs", slug: "ordinateurs", position: 1, is_active: true },
  { id: "c-info-per", parent_id: "c-info", name: "Périphériques", slug: "peripheriques", position: 2, is_active: true },
  { id: "c-info-comp", parent_id: "c-info", name: "Composants", slug: "composants", position: 3, is_active: true },
  // Niveau 3 — Informatique
  { id: "c-info-pc-portable", parent_id: "c-info-pc", name: "PC Portables", slug: "pc-portables", position: 1, is_active: true },
  { id: "c-info-pc-bureau", parent_id: "c-info-pc", name: "PC de Bureau", slug: "pc-de-bureau", position: 2, is_active: true },
  { id: "c-info-per-clavier", parent_id: "c-info-per", name: "Claviers & Souris", slug: "claviers-souris", position: 1, is_active: true },
  { id: "c-info-per-ecran", parent_id: "c-info-per", name: "Écrans", slug: "ecrans", position: 2, is_active: true },
  { id: "c-info-comp-ssd", parent_id: "c-info-comp", name: "Stockage SSD", slug: "stockage-ssd", position: 1, is_active: true },

  // Niveau 2 — Téléphonie
  { id: "c-tel-smart", parent_id: "c-tel", name: "Smartphones", slug: "smartphones", position: 1, is_active: true },
  { id: "c-tel-acc", parent_id: "c-tel", name: "Accessoires", slug: "accessoires-telephonie", position: 2, is_active: true },
  { id: "c-tel-audio", parent_id: "c-tel", name: "Audio", slug: "audio", position: 3, is_active: true },
  { id: "c-tel-acc-coque", parent_id: "c-tel-acc", name: "Coques & Protection", slug: "coques-protection", position: 1, is_active: true },
  { id: "c-tel-audio-casque", parent_id: "c-tel-audio", name: "Casques & Écouteurs", slug: "casques-ecouteurs", position: 1, is_active: true },

  // Niveau 2 — Maison
  { id: "c-maison-cuisine", parent_id: "c-maison", name: "Cuisine", slug: "cuisine", position: 1, is_active: true },
  { id: "c-maison-entretien", parent_id: "c-maison", name: "Entretien", slug: "entretien", position: 2, is_active: true },
  { id: "c-maison-cuisine-cafe", parent_id: "c-maison-cuisine", name: "Machines à café", slug: "machines-a-cafe", position: 1, is_active: true },

  // Niveau 2 — Mode
  { id: "c-mode-sacs", parent_id: "c-mode", name: "Sacs & Bagagerie", slug: "sacs-bagagerie", position: 1, is_active: true },
  { id: "c-mode-montres", parent_id: "c-mode", name: "Montres connectées", slug: "montres-connectees", position: 2, is_active: true },
  { id: "c-mode-vet", parent_id: "c-mode", name: "Vêtements", slug: "vetements", position: 3, is_active: true },
];

export function buildCategoryTree(list: Category[] = categories): CategoryNode[] {
  const map = new Map<string, CategoryNode>();
  list.forEach((c) => map.set(c.id, { ...c, children: [] }));
  const roots: CategoryNode[] = [];
  map.forEach((node) => {
    if (node.parent_id && map.has(node.parent_id)) {
      map.get(node.parent_id)!.children.push(node);
    } else if (!node.parent_id) {
      roots.push(node);
    }
  });
  const sortRec = (nodes: CategoryNode[]) => {
    nodes.sort((a, b) => a.position - b.position);
    nodes.forEach((n) => sortRec(n.children));
  };
  sortRec(roots);
  return roots;
}

export function findCategoryBySlug(slug: string, list: Category[] = categories) {
  return list.find((c) => c.slug === slug);
}

/** Ids de la catégorie + tous ses descendants */
export function categoryWithDescendants(id: string, list: Category[] = categories): string[] {
  const out = [id];
  const walk = (parent: string) => {
    list
      .filter((c) => c.parent_id === parent)
      .forEach((c) => {
        out.push(c.id);
        walk(c.id);
      });
  };
  walk(id);
  return out;
}

export function categoryPath(id: string, list: Category[] = categories): Category[] {
  const path: Category[] = [];
  let current = list.find((c) => c.id === id);
  while (current) {
    path.unshift(current);
    current = current.parent_id ? list.find((c) => c.id === current!.parent_id) : undefined;
  }
  return path;
}
