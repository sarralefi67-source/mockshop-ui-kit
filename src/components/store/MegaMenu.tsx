import { Link } from "@tanstack/react-router";
import { ChevronDown, MoreHorizontal } from "lucide-react";
import { useEffect, useState } from "react";
import { categoryTreeWithProducts } from "@/data/categories";
import { isOnSale } from "@/data/products";
import { fetchActiveProducts, fetchCategories } from "@/lib/catalog";
import { cn } from "@/lib/utils";
import type { CategoryNode } from "@/types";

export function MegaMenu() {
  const [open, setOpen] = useState<string | null>(null);
  const [tree, setTree] = useState<CategoryNode[]>([]);
  // Le bouton « Promotions » n'a de sens que s'il y a effectivement des remises.
  const [hasPromos, setHasPromos] = useState(false);

  useEffect(() => {
    let mounted = true;
    Promise.all([fetchCategories(), fetchActiveProducts()])
      .then(([categories, products]) => {
        if (!mounted) return;
        setTree(categoryTreeWithProducts(categories, products));
        setHasPromos(products.some(isOnSale));
      })
      .catch((err) => console.error("load mega menu categories", err));
    return () => {
      mounted = false;
    };
  }, []);

  const visibleCategories = tree.slice(0, 8);
  const remainingCategories = tree.slice(8);

  return (
    <nav className="relative hidden border-y border-border/70 bg-card lg:block">
      <div className="container-page flex items-center gap-2" onMouseLeave={() => setOpen(null)}>
        {visibleCategories.map((cat: CategoryNode) => (
          <div key={cat.id} className="static">
            <Link
              to="/categorie/$slug"
              params={{ slug: cat.slug }}
              onMouseEnter={() => setOpen(cat.id)}
              className={cn(
                "relative flex shrink-0 items-center gap-1.5 whitespace-nowrap px-4 py-4 text-[15px] font-semibold transition-colors",
                "after:absolute after:inset-x-4 after:bottom-2.5 after:h-0.5 after:origin-left after:scale-x-0 after:bg-accent-strong after:transition-transform hover:after:scale-x-100",
                open === cat.id ? "text-accent-strong after:scale-x-100" : "text-foreground hover:text-accent-strong",
              )}
            >
              {/* {cat.image_url && (
                <img src={cat.image_url} alt="" className="h-6 w-6 rounded-full object-cover" />
              )} */}
              {cat.name}
              {cat.children.length > 0 && <ChevronDown className="h-3.5 w-3.5" />}
            </Link>

            {open === cat.id && cat.children.length > 0 && (
              <div className="absolute inset-x-0 top-full z-40 border-b border-border bg-card shadow-pop">
                <div className="container-page grid gap-8 py-8 lg:grid-cols-[minmax(0,1fr)_18rem]">
                  <div className="grid grid-cols-3 gap-x-8 gap-y-6">
                  {(cat.children as CategoryNode[]).map((sub: CategoryNode) => (
                    <div key={sub.id}>
                      <Link
                        to="/categorie/$slug"
                        params={{ slug: sub.slug }}
                        onClick={() => setOpen(null)}
                        className="flex items-center gap-2 border-b border-border/70 pb-2 font-display text-sm font-semibold text-foreground transition-colors hover:text-accent-strong"
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
                        {/* {sub.children.length === 0 && (
                          <li className="text-xs text-muted-foreground">Bientôt disponible</li>
                        )} */}
                      </ul>
                    </div>
                  ))}
                  </div>

                  {/* Visuel de la catégorie : toujours dans la colonne de droite,
                      quel que soit le nombre de sous-catégories. */}
                  <Link
                    to="/categorie/$slug"
                    params={{ slug: cat.slug }}
                    onClick={() => setOpen(null)}
                    className="group relative flex min-h-56 flex-col justify-end overflow-hidden rounded-lg bg-surface p-5"
                  >
                    {cat.image_url && (
                      <>
                        <img
                          src={cat.image_url}
                          alt=""
                          className="absolute inset-0 h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                        />
                        <span
                          aria-hidden="true"
                          className="absolute inset-0 bg-gradient-to-t from-foreground/85 via-foreground/45 to-foreground/5"
                        />
                      </>
                    )}
                    <span className="relative block">
                      <span className={cn(
                        "block text-xs font-semibold uppercase tracking-[0.1em]",
                        cat.image_url ? "text-background/85" : "text-accent-strong",
                      )}>
                        Sélection
                      </span>
                      <span className={cn(
                        "mt-1 block font-display text-base font-semibold",
                        cat.image_url ? "text-background" : "text-foreground",
                      )}>
                        {cat.name}
                      </span>
                      <span className={cn(
                        "mt-1 line-clamp-2 block text-sm",
                        cat.image_url ? "text-background/80" : "text-muted-foreground",
                      )}>
                        {cat.description ?? "Nos meilleures offres du moment."}
                      </span>
                      <span className={cn(
                        "mt-3 inline-block text-sm font-semibold group-hover:underline",
                        cat.image_url ? "text-background" : "text-accent-strong",
                      )}>
                        Voir tout →
                      </span>
                    </span>
                  </Link>
                </div>
              </div>
            )}
          </div>
        ))}
        {remainingCategories.length > 0 && (
          <div className="static">
            <button
              type="button"
              onMouseEnter={() => setOpen("more")}
              aria-label="Voir les autres catégories"
              className={cn(
                "flex items-center gap-1 px-4 py-4 text-[15px] font-semibold transition-colors",
                open === "more" ? "text-accent-strong" : "text-foreground hover:text-accent-strong",
              )}
            >
              <MoreHorizontal className="h-5 w-5" />
            </button>
            {open === "more" && (
              <div className="absolute inset-x-0 top-full z-40 border-b border-border bg-card shadow-pop">
                <div className="container-page grid grid-cols-4 gap-4 py-5">
                  {remainingCategories.map((cat: CategoryNode) => (
                    <Link
                      key={cat.id}
                      to="/categorie/$slug"
                      params={{ slug: cat.slug }}
                      onClick={() => setOpen(null)}
                      className="flex items-center gap-2 px-3 py-2 text-sm font-semibold text-foreground hover:text-accent-strong"
                    >
                      {cat.name}
                      {cat.children.length > 0 && <ChevronDown className="h-3.5 w-3.5" />}
                    </Link>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
        {hasPromos && (
          <Link
            to="/promotions"
            className="my-2 ml-auto rounded-md bg-accent-strong px-4 py-2 text-[13px] font-bold uppercase tracking-[0.08em] text-accent-strong-foreground transition-colors hover:bg-deep"
          >
            Promotions
          </Link>
        )}
      </div>
    </nav>
  );
}
