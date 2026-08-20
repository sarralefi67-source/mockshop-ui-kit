import type { Category, CategoryNode } from "@/types";

export const categories: Category[] = [
  // Niveau 1
  { id: "c-info", parent_id: null, name: "Informatique", slug: "informatique", description: "PC, composants et périphériques" },
  { id: "c-tel", parent_id: null, name: "Téléphonie", slug: "telephonie", description: "Smartphones et accessoires" },
  { id: "c-maison", parent_id: null, name: "Maison & Électroménager", slug: "maison-electromenager", description: "Petit et gros électroménager" },
  { id: "c-mode", parent_id: null, name: "Mode & Accessoires", slug: "mode-accessoires", description: "Vêtements, sacs et montres" },

  // Niveau 2 — Informatique
  { id: "c-info-pc", parent_id: "c-info", name: "Ordinateurs", slug: "ordinateurs" },
  { id: "c-info-per", parent_id: "c-info", name: "Périphériques", slug: "peripheriques" },
  { id: "c-info-comp", parent_id: "c-info", name: "Composants", slug: "composants" },
  // Niveau 3 — Informatique
  { id: "c-info-pc-portable", parent_id: "c-info-pc", name: "PC Portables", slug: "pc-portables" },
  { id: "c-info-pc-bureau", parent_id: "c-info-pc", name: "PC de Bureau", slug: "pc-de-bureau" },
  { id: "c-info-per-clavier", parent_id: "c-info-per", name: "Claviers & Souris", slug: "claviers-souris" },
  { id: "c-info-per-ecran", parent_id: "c-info-per", name: "Écrans", slug: "ecrans" },
  { id: "c-info-comp-ssd", parent_id: "c-info-comp", name: "Stockage SSD", slug: "stockage-ssd" },

  // Niveau 2 — Téléphonie
  { id: "c-tel-smart", parent_id: "c-tel", name: "Smartphones", slug: "smartphones" },
  { id: "c-tel-acc", parent_id: "c-tel", name: "Accessoires", slug: "accessoires-telephonie" },
  { id: "c-tel-audio", parent_id: "c-tel", name: "Audio", slug: "audio" },
  { id: "c-tel-acc-coque", parent_id: "c-tel-acc", name: "Coques & Protection", slug: "coques-protection" },
  { id: "c-tel-audio-casque", parent_id: "c-tel-audio", name: "Casques & Écouteurs", slug: "casques-ecouteurs" },

  // Niveau 2 — Maison
  { id: "c-maison-cuisine", parent_id: "c-maison", name: "Cuisine", slug: "cuisine" },
  { id: "c-maison-entretien", parent_id: "c-maison", name: "Entretien", slug: "entretien" },
  { id: "c-maison-cuisine-cafe", parent_id: "c-maison-cuisine", name: "Machines à café", slug: "machines-a-cafe" },

  // Niveau 2 — Mode
  { id: "c-mode-sacs", parent_id: "c-mode", name: "Sacs & Bagagerie", slug: "sacs-bagagerie" },
  { id: "c-mode-montres", parent_id: "c-mode", name: "Montres connectées", slug: "montres-connectees" },
  { id: "c-mode-vet", parent_id: "c-mode", name: "Vêtements", slug: "vetements" },
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
    nodes.sort((a, b) => a.name.localeCompare(b.name));
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
