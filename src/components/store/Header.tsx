import { Link, useNavigate } from "@tanstack/react-router";
import { Heart, Instagram, Menu, Phone, Search, ShoppingCart, User, X } from "lucide-react";
import { useState } from "react";
import { useStore } from "@/context/StoreContext";
import { useAuth } from "@/context/AuthContext";
import { buildCategoryTree } from "@/data/categories";
import { searchProducts } from "@/data/products";
import { formatPrice } from "@/lib/placeholder";
import type { CategoryNode } from "@/types";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { MegaMenu } from "./MegaMenu";

const tree: CategoryNode[] = buildCategoryTree();

// URLs des réseaux sociaux — à remplacer par vos vrais liens
const SOCIAL_LINKS = {
  instagram: "https://instagram.com/votre_compte",
  tiktok: "https://www.tiktok.com/@votre_compte",
  whatsapp: "https://wa.me/21671000000",
};

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

export function Header() {
  const { count, setCartOpen, wishlist } = useStore();
  const { user, profile, signOut } = useAuth();
  const [query, setQuery] = useState("");
  const [mobileOpen, setMobileOpen] = useState(false);
  const navigate = useNavigate();
  const results = searchProducts(query).slice(0, 6);

  return (
    <header className="sticky top-0 z-50 bg-card">
      <div className="bg-foreground text-background">
        <div className="container-page relative flex h-9 items-center justify-center gap-2 text-xs">
          <p className="flex items-center gap-2">
            <Phone className="h-3.5 w-3.5" /> +216 71 000 000 — Livraison 24/48h
          </p>
          <p className="hidden font-medium sm:block">— Paiement à la livraison partout en Tunisie</p>

          <div className="absolute right-4 hidden items-center gap-3 sm:flex">
            <a
              href={SOCIAL_LINKS.instagram}
              target="_blank"
              rel="noreferrer"
              aria-label="Instagram"
              className="text-background/80 transition-colors hover:text-background"
            >
              <Instagram className="h-3.5 w-3.5" />
            </a>
            <a
              href={SOCIAL_LINKS.tiktok}
              target="_blank"
              rel="noreferrer"
              aria-label="TikTok"
              className="text-background/80 transition-colors hover:text-background"
            >
              <TikTokIcon className="h-3.5 w-3.5" />
            </a>
            <a
              href={SOCIAL_LINKS.whatsapp}
              target="_blank"
              rel="noreferrer"
              aria-label="WhatsApp"
              className="text-background/80 transition-colors hover:text-background"
            >
              <WhatsAppIcon className="h-3.5 w-3.5" />
            </a>
          </div>
        </div>
      </div>

      <div className="border-b border-border">
        <div className="container-page grid h-16 grid-cols-[auto_1fr_auto] items-center gap-4">
          <div className="flex items-center gap-3">
            <button
              className="lg:hidden text-foreground"
              aria-label="Ouvrir le menu"
              onClick={() => setMobileOpen(true)}
            >
              <Menu className="h-6 w-6" />
            </button>

            <Link to="/" className="flex items-center gap-2">
              <span className="text-lg font-extrabold">
                E_<span className="text-accent-strong">Commerce</span>
              </span>
            </Link>
          </div>

          <div className="relative mx-auto hidden w-full max-w-xl md:block">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Rechercher un produit, une marque…"
              className="h-10 pl-9"
              aria-label="Rechercher"
            />
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

          <div className="flex items-center gap-1">
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
              <Button variant="ghost" size="icon" asChild aria-label="Mon compte">
                <Link to="/connexion">
                  <User className="h-5 w-5" />
                </Link>
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
              className="relative grid h-9 w-9 place-items-center rounded-md hover:bg-accent"
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

        <div className="container-page pb-3 md:hidden">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Rechercher…"
              className="h-10 pl-9"
              aria-label="Rechercher"
            />
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
          <SheetHeader className="flex-row items-center justify-between border-b border-border px-5 py-4">
            <SheetTitle>Catégories</SheetTitle>
            <button onClick={() => setMobileOpen(false)} aria-label="Fermer">
              <X className="h-5 w-5" />
            </button>
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