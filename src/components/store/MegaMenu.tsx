import { Link } from "@tanstack/react-router";
import { ChevronDown } from "lucide-react";
import { useEffect, useState } from "react";
import { buildCategoryTree } from "@/data/categories";
import { fetchCategories } from "@/lib/catalog";
import { cn } from "@/lib/utils";
import type { CategoryNode } from "@/types";

export function MegaMenu() {
  const [open, setOpen] = useState<string | null>(null);
  const [tree, setTree] = useState<CategoryNode[]>([]);

  useEffect(() => {
    let mounted = true;
    fetchCategories()
      .then((data) => {
        if (mounted) setTree(buildCategoryTree(data));
      })
      .catch((err) => console.error("load mega menu categories", err));
    return () => {
      mounted = false;
    };
  }, []);

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
                "flex items-center gap-2 px-4 py-3 text-sm font-semibold transition-colors",
                open === cat.id ? "text-accent-strong" : "text-foreground hover:text-accent-strong",
              )}
            >
              {cat.image_url && (
                <img src={cat.image_url} alt="" className="h-6 w-6 rounded-full object-cover" />
              )}
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
                        className="flex items-center gap-2 text-sm font-bold uppercase tracking-wide text-foreground hover:text-accent-strong"
                      >
                        {sub.image_url && (
                          <img src={sub.image_url} alt="" className="h-8 w-8 rounded-md object-cover" />
                        )}
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
                  <Link
                    to="/categorie/$slug"
                    params={{ slug: cat.slug }}
                    onClick={() => setOpen(null)}
                    className="group relative col-span-1 overflow-hidden rounded-lg bg-surface p-5"
                  >
                    {cat.image_url && (
                      <img
                        src={cat.image_url}
                        alt=""
                        className="absolute inset-0 h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                      />
                    )}
                    <div className={cn("relative", cat.image_url && "bg-gradient-to-t from-foreground/70 via-foreground/10 to-transparent -m-5 p-5 h-full")}>
                      <p className={cn("text-xs font-semibold uppercase tracking-wide", cat.image_url ? "text-background/90" : "text-accent-strong")}>
                        Sélection
                      </p>
                      <p className={cn("mt-2 text-sm font-semibold", cat.image_url && "text-background")}>{cat.name} en promo</p>
                      <p className={cn("mt-1 text-sm", cat.image_url ? "text-background/80" : "text-muted-foreground")}>
                        {cat.description ?? "Nos meilleures offres du moment."}
                      </p>
                      <span className={cn("mt-4 inline-block text-sm font-semibold hover:underline", cat.image_url ? "text-background" : "text-accent-strong")}>
                        Voir tout →
                      </span>
                    </div>
                  </Link>
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
