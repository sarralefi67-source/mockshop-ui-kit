import { Link, useNavigate } from "@tanstack/react-router";
import { Facebook, Heart, Instagram, Menu, Phone, Search, ShoppingCart, User } from "lucide-react";
import { useEffect, useMemo, useState, type ComponentType } from "react";
import { useStore } from "@/context/StoreContext";
import { useAuth } from "@/context/AuthContext";
import { useSiteSettings } from "@/context/SiteSettingsContext";
import { categoryTreeWithProducts } from "@/data/categories";
import { fetchActiveProducts, fetchCategories } from "@/lib/catalog";
import { formatPrice } from "@/lib/placeholder";
import type { CategoryNode, Product } from "@/types";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { MegaMenu } from "./MegaMenu";

function TikTokIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true">
      <path d="M16.5 3c.4 2.2 2 3.9 4.2 4.2v2.9c-1.5 0-2.9-.4-4.2-1.2v6.7a5.9 5.9 0 1 1-5.1-5.8v2.9a3 3 0 1 0 2.2 2.9V3h2.9Z" />
    </svg>
  );
}

function WhatsAppIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true">
      <path d="M12 2a10 10 0 0 0-8.6 15.1L2 22l5-1.3A10 10 0 1 0 12 2Zm0 18.2c-1.6 0-3.1-.4-4.4-1.2l-.3-.2-3 .8.8-2.9-.2-.3A8.2 8.2 0 1 1 12 20.2Zm4.5-6.1c-.2-.1-1.5-.7-1.7-.8-.2-.1-.4-.1-.6.1-.2.2-.6.8-.8 1-.1.2-.3.2-.5.1-.2-.1-1-.4-1.9-1.2-.7-.6-1.2-1.4-1.3-1.6-.1-.2 0-.4.1-.5.1-.1.2-.3.4-.4.1-.1.2-.2.2-.4.1-.1 0-.3 0-.4-.1-.1-.6-1.4-.8-1.9-.2-.5-.4-.4-.6-.4h-.5c-.2 0-.4.1-.6.3-.2.2-.8.8-.8 1.9 0 1.1.8 2.2.9 2.4.1.2 1.6 2.5 3.9 3.5.5.2 1 .4 1.3.5.5.2 1 .1 1.4.1.4-.1 1.5-.6 1.7-1.2.2-.6.2-1.1.1-1.2-.1-.1-.2-.2-.4-.3Z" />
    </svg>
  );
}

function Logo({ className }: { className?: string }) {
  return (
    <Link to="/" className={className}>
      <span className="font-display text-2xl font-semibold tracking-tight">
        Arti<span className="text-accent-strong">sanat</span>
      </span>
    </Link>
  );
}

export function Header() {
  const { count, setCartOpen, wishlist } = useStore();
  const { user, profile, signOut, openAuth } = useAuth();
  const { settings } = useSiteSettings();
  const [query, setQuery] = useState("");
  const [searchReady, setSearchReady] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const navigate = useNavigate();
  const [tree, setTree] = useState<CategoryNode[]>([]);
  const [products, setProducts] = useState<Product[]>([]);

  useEffect(() => {
    let mounted = true;
    Promise.all([fetchCategories(), fetchActiveProducts()])
      .then(([categories, activeProducts]) => {
        if (!mounted) return;
        setProducts(activeProducts);
        setTree(categoryTreeWithProducts(categories, activeProducts));
      })
      .catch((err) => console.error("load header catalog", err));
    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    setQuery("");
    setSearchReady(false);
  }, [user?.id]);

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [];
    return products
      .filter((p) => p.name.toLowerCase().includes(q) || p.brand.toLowerCase().includes(q))
      .slice(0, 6);
  }, [products, query]);

  // Seuls les reseaux renseignes dans /admin/parametres sont affiches.
  const socialLinks = useMemo(() => {
    const all: {
      key: string;
      href: string | null | undefined;
      label: string;
      Icon: ComponentType<{ className?: string }>;
    }[] = [
      { key: "instagram", href: settings?.instagram_url, label: "Instagram", Icon: Instagram },
      { key: "facebook", href: settings?.facebook_url, label: "Facebook", Icon: Facebook },
      { key: "tiktok", href: settings?.tiktok_url, label: "TikTok", Icon: TikTokIcon },
      { key: "whatsapp", href: settings?.whatsapp_url, label: "WhatsApp", Icon: WhatsAppIcon },
    ];
    // flatMap plutot que filter : il retire les liens vides ET restreint le
    // type de `href` a string, ce qu'un filter ne fait pas.
    return all.flatMap((link) => (link.href?.trim() ? [{ ...link, href: link.href.trim() }] : []));
  }, [settings]);

  return (
    <header className="sticky top-0 z-50 bg-card">
      <div className="weave-texture border-b border-border/60 bg-surface text-foreground">
        <div className="container-page relative flex h-10 items-center justify-center gap-2 text-[13px]">
          <p className="flex items-center gap-2">
            <Phone className="h-3.5 w-3.5 text-accent-strong" />
            {settings?.phone ? `${settings.phone} — Livraison 24/48h` : "Livraison 24/48h"}
          </p>
          <p className="hidden font-medium sm:block">— Paiement à la livraison partout en Tunisie</p>

          <div className="absolute right-4 hidden items-center gap-3 sm:flex">
            {socialLinks.map(({ key, href, label, Icon }) => (
              <a
                key={key}
                href={href}
                target="_blank"
                rel="noreferrer"
                aria-label={label}
                className="text-muted-foreground transition-colors hover:text-accent-strong"
              >
                <Icon className="h-3.5 w-3.5" />
              </a>
            ))}
          </div>
        </div>
      </div>

      <div className="border-b border-surface lg:border-b-0">
        <div className="container-page grid h-20 grid-cols-[1fr_auto_1fr] items-center gap-4 lg:grid-cols-[auto_1fr_auto]">
          <div className="flex items-center gap-3">
            <button
              className="text-foreground lg:hidden"
              aria-label="Ouvrir le menu"
              onClick={() => setMobileOpen(true)}
            >
              <Menu className="h-6 w-6" />
            </button>

            <Logo className="hidden items-center gap-2 lg:flex" />
          </div>

          <Logo className="flex justify-center lg:hidden" />

          <div className="relative mx-auto hidden w-full max-w-xl lg:block">
            <Input
              name="search"
              autoComplete="off"
              readOnly={!searchReady}
              onFocus={() => setSearchReady(true)}
              data-lpignore="true"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Rechercher un produit, une marque…"
              className="h-11 rounded-md border-border bg-card pr-14 shadow-none"
              aria-label="Rechercher"
            />
            <span className="pointer-events-none absolute right-0 top-0 grid h-11 w-12 place-items-center rounded-r-md bg-accent-strong text-accent-strong-foreground">
              <Search className="h-4 w-4" />
            </span>
            {query.trim().length > 0 && (
              <div className="absolute inset-x-0 top-full z-50 mt-2 overflow-hidden rounded-lg border border-border bg-card shadow-pop">
                {results.length === 0 ? (
                  <p className="px-4 py-6 text-center text-sm text-muted-foreground">
                    Aucun résultat pour « {query} »
                  </p>
                ) : (
                  <ul>
                    {results.map((p) => (
                      <li key={p.id}>
                        <button
                          onClick={() => {
                            setQuery("");
                            navigate({ to: "/produit/$slug", params: { slug: p.slug } });
                          }}
                          className="flex w-full items-center gap-3 px-3 py-2 text-left hover:bg-surface"
                        >
                          <img src={p.images[0]?.url} alt="" className="h-10 w-10 rounded object-cover" />
                          <span className="min-w-0 flex-1">
                            <span className="block truncate text-sm font-medium">{p.name}</span>
                            <span className="block text-xs text-muted-foreground">{p.brand}</span>
                          </span>
                          <span className="text-sm font-bold text-accent-strong">
                            {formatPrice(p.price)}
                          </span>
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}
          </div>

          <div className="flex items-center justify-end gap-1">
            {user ? (
              <div className="flex items-center gap-2">
                <span className="hidden sm:block text-sm font-medium">{profile?.first_name ?? user.email}</span>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => navigate({ to: profile?.role === "admin" ? "/admin/parametres" : "/compte" })}
                  aria-label={profile?.role === "admin" ? "Paramètres" : "Mon compte"}
                >
                  <User className="h-5 w-5" />
                </Button>
              </div>
            ) : (
              <Button
                variant="ghost"
                size="icon"
                aria-label="Se connecter"
                onClick={() => openAuth("signin")}
              >
                <User className="h-5 w-5" />
              </Button>
            )}
            <Button variant="ghost" size="icon" asChild aria-label="Mes favoris" className="relative">
              <Link to="/favoris">
                <Heart className="h-5 w-5" />
                {wishlist.length > 0 && (
                  <span className="absolute -right-0.5 -top-0.5 grid h-4 min-w-4 place-items-center rounded-full bg-foreground px-1 text-[10px] font-bold text-background">
                    {wishlist.length}
                  </span>
                )}
              </Link>
            </Button>
            <button
              onClick={() => setCartOpen(true)}
              aria-label="Ouvrir le panier"
              className="relative grid h-10 w-10 place-items-center rounded-md transition-colors hover:bg-accent hover:text-accent-strong"
            >
              <ShoppingCart className="h-5 w-5" />
              {count > 0 && (
                <span className="absolute -right-0.5 -top-0.5 grid h-4 min-w-4 place-items-center rounded-full bg-accent-strong px-1 text-[10px] font-bold text-accent-strong-foreground">
                  {count}
                </span>
              )}
            </button>
          </div>
        </div>

        <div className="container-page pb-3 lg:hidden">
          <div className="relative">
            <Input
              name="search"
              autoComplete="off"
              readOnly={!searchReady}
              onFocus={() => setSearchReady(true)}
              data-lpignore="true"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Rechercher…"
              className="h-11 rounded-md border-border bg-card pr-14 shadow-none"
              aria-label="Rechercher"
            />
            <span className="pointer-events-none absolute right-0 top-0 grid h-11 w-12 place-items-center rounded-r-md bg-accent-strong text-accent-strong-foreground">
              <Search className="h-4 w-4" />
            </span>
            {query.trim().length > 0 && (
              <div className="absolute inset-x-0 top-full z-50 mt-2 overflow-hidden rounded-lg border border-border bg-card shadow-pop">
                {results.length === 0 ? (
                  <p className="px-4 py-6 text-center text-sm text-muted-foreground">Aucun résultat</p>
                ) : (
                  results.map((p) => (
                    <button
                      key={p.id}
                      onClick={() => {
                        setQuery("");
                        navigate({ to: "/produit/$slug", params: { slug: p.slug } });
                      }}
                      className="flex w-full items-center gap-3 px-3 py-2 text-left hover:bg-surface"
                    >
                      <img src={p.images[0]?.url} alt="" className="h-9 w-9 rounded object-cover" />
                      <span className="truncate text-sm">{p.name}</span>
                    </button>
                  ))
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      <MegaMenu />

      <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
        <SheetContent side="left" className="w-80 p-0">
          <SheetHeader className="border-b border-border px-5 py-4">
            <SheetTitle>Catégories</SheetTitle>
          </SheetHeader>
          <div className="overflow-y-auto px-3 py-2">
            <Accordion type="multiple">
              {tree.map((cat: CategoryNode) => {
                const subCategories: CategoryNode[] = cat.children ?? [];

                return (
                  <AccordionItem key={cat.id} value={cat.id}>
                    <AccordionTrigger className="text-sm font-semibold">{cat.name}</AccordionTrigger>
                    <AccordionContent>
                      <ul className="space-y-1 pl-2">
                        <li>
                          <Link
                            to="/categorie/$slug"
                            params={{ slug: cat.slug }}
                            onClick={() => setMobileOpen(false)}
                            className="block py-1 text-sm font-medium text-accent-strong"
                          >
                            Tout {cat.name}
                          </Link>
                        </li>
                        {subCategories.map((sub) => {
                          const typedSub = sub as CategoryNode;
                          const leafCategories: CategoryNode[] = typedSub.children ?? [];

                          return (
                            <li key={typedSub.id}>
                              <Link
                                to="/categorie/$slug"
                                params={{ slug: typedSub.slug }}
                                onClick={() => setMobileOpen(false)}
                                className="block py-1 text-sm"
                              >
                                {typedSub.name}
                              </Link>
                              <ul className="pl-3">
                                {leafCategories.map((leaf) => {
                                  const typedLeaf = leaf as CategoryNode;
                                  return (
                                    <li key={typedLeaf.id}>
                                      <Link
                                        to="/categorie/$slug"
                                        params={{ slug: typedLeaf.slug }}
                                        onClick={() => setMobileOpen(false)}
                                        className="block py-1 text-sm text-muted-foreground"
                                      >
                                        {typedLeaf.name}
                                      </Link>
                                    </li>
                                  );
                                })}
                              </ul>
                            </li>
                          );
                        })}
                      </ul>
                    </AccordionContent>
                  </AccordionItem>
                );
              })}
            </Accordion>
            <div className="mt-4 space-y-1 border-t border-border pt-4">
              <Link to="/promotions" onClick={() => setMobileOpen(false)} className="block py-1.5 text-sm font-semibold text-accent-strong">
                Promotions
              </Link>
              <Link to="/compte" onClick={() => setMobileOpen(false)} className="block py-1.5 text-sm">
                Mon compte
              </Link>
              {profile?.role === "admin" && (
                <Link to="/admin/parametres" onClick={() => setMobileOpen(false)} className="block py-1.5 text-sm">
                  Paramètres
                </Link>
              )}
              <Link to="/favoris" onClick={() => setMobileOpen(false)} className="block py-1.5 text-sm">
                Mes favoris
              </Link>
            </div>
          </div>
        </SheetContent>
      </Sheet>
    </header>
  );
}