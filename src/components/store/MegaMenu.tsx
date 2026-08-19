import { Link } from "@tanstack/react-router";
import { ChevronDown } from "lucide-react";
import { useState } from "react";
import { buildCategoryTree } from "@/data/categories";
import { cn } from "@/lib/utils";
import type { CategoryNode } from "@/types";

const tree: CategoryNode[] = buildCategoryTree();

export function MegaMenu() {
  const [open, setOpen] = useState<string | null>(null);

  return (
    <nav className="relative hidden lg:block border-t border-border bg-card">
      <div className="container-page flex items-center gap-1" onMouseLeave={() => setOpen(null)}>
        {tree.map((cat: CategoryNode) => (
          <div key={cat.id} className="static">
            <Link
              to="/categorie/$slug"
              params={{ slug: cat.slug }}
              onMouseEnter={() => setOpen(cat.id)}
              className={cn(
                "flex items-center gap-1 px-4 py-3 text-sm font-semibold transition-colors",
                open === cat.id ? "text-accent-strong" : "text-foreground hover:text-accent-strong",
              )}
            >
              {cat.name}
              {cat.children.length > 0 && <ChevronDown className="h-3.5 w-3.5" />}
            </Link>

            {open === cat.id && cat.children.length > 0 && (
              <div className="absolute inset-x-0 top-full z-40 border-b border-border bg-card shadow-pop">
                <div className="container-page grid grid-cols-4 gap-8 py-8">
                  {(cat.children as CategoryNode[]).map((sub: CategoryNode) => (
                    <div key={sub.id}>
                      <Link
                        to="/categorie/$slug"
                        params={{ slug: sub.slug }}
                        onClick={() => setOpen(null)}
                        className="text-sm font-bold uppercase tracking-wide text-foreground hover:text-accent-strong"
                      >
                        {sub.name}
                      </Link>
                      <ul className="mt-3 space-y-2">
                        {(sub.children as CategoryNode[]).map((leaf: CategoryNode) => (
                          <li key={leaf.id}>
                            <Link
                              to="/categorie/$slug"
                              params={{ slug: leaf.slug }}
                              onClick={() => setOpen(null)}
                              className="text-sm text-muted-foreground hover:text-accent-strong"
                            >
                              {leaf.name}
                            </Link>
                          </li>
                        ))}
                        {sub.children.length === 0 && (
                          <li className="text-xs text-muted-foreground">Bientôt disponible</li>
                        )}
                      </ul>
                    </div>
                  ))}
                  <div className="col-span-1 rounded-lg bg-surface p-5">
                    <p className="text-xs font-semibold uppercase tracking-wide text-accent-strong">
                      Sélection
                    </p>
                    <p className="mt-2 text-sm font-semibold">{cat.name} en promo</p>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {cat.description ?? "Nos meilleures offres du moment."}
                    </p>
                    <Link
                      to="/categorie/$slug"
                      params={{ slug: cat.slug }}
                      onClick={() => setOpen(null)}
                      className="mt-4 inline-block text-sm font-semibold text-accent-strong hover:underline"
                    >
                      Voir tout →
                    </Link>
                  </div>
                </div>
              </div>
            )}
          </div>
        ))}
        <Link
          to="/promotions"
          className="ml-auto px-4 py-3 text-sm font-semibold text-accent-strong hover:underline"
        >
          Promotions
        </Link>
      </div>
    </nav>
  );
}
