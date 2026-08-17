# MockShop UI Kit

Objectif : construire toute l'interface (boutique + back-office) avec des données statiques/mock en dur dans le code (tableaux JS/TS), sans connecter Supabase pour l'instant — pour valider le design et les écrans sans consommer de crédits sur la partie backend. On branchera la vraie base dans une deuxième étape séparée.

Contexte

Site e-commerce inspiré du front de 2btrading.tn (mega menu catégories, fiches produits avec variantes qui changent la galerie d'images, drawer panier). Stack : React (Vite) + TypeScript + Tailwind CSS. Pas de paiement en ligne — uniquement paiement à la livraison (COD).

Ne connecte pas Supabase pour l'instant. Utilise des données mock (au moins 3 catégories avec sous-catégories, 8-10 produits dont certains avec variantes couleur/taille et images différentes par variante, quelques avis clients, un coupon exemple) dans des fichiers src/mocks/ ou src/data/. Structure les types TypeScript comme si ça venait d'une vraie base (Product, ProductVariant, Category, Order, etc.) pour faciliter le branchement Supabase plus tard.

Design

Palette neutre et professionnelle : fond clair, une couleur d'accent forte réservée aux CTA et aux prix promo, typographie sans-serif lisible adaptée aux fiches produits denses. Priorité à la clarté de la grille produit, à la lisibilité du sélecteur de variantes, et à un drawer panier rapide. Responsive mobile obligatoire.

Écrans à construire (front boutique)

Header : logo, mega menu catégories (2-3 niveaux, colonnes comme 2B Trading), barre de recherche (filtrage sur les mocks), icônes compte / favoris / panier avec badge quantité.

Accueil : hero, catégories mises en avant, produits en promo, nouveautés.

Page catégorie : grille produits, filtres (prix, attributs), tri, pagination simple.

Fiche produit : galerie d'images qui change quand on sélectionne une variante (couleur en swatch, taille en boutons), prix + prix barré si promo, stock affiché, onglet avis clients, produits liés.

Drawer panier (slide depuis la droite, state React/Context, pas de persistance serveur pour l'instant) : liste articles, quantité modifiable, sous-total, bouton checkout.

Checkout (UI uniquement, pas de vraie soumission) : récap panier, formulaire adresse avec sélection gouvernorat, champ code coupon, mention claire "Paiement à la livraison", bouton "Confirmer la commande" → page de confirmation mock.

Compte client : écrans connexion/inscription (formulaires, pas d'auth réelle), mes commandes (mock), mes adresses, mes favoris, infos perso, case newsletter.

Favoris : page listant les produits mock en wishlist (state local).

Footer : liens catégories, CGV/CGU, mentions légales, contact.

Écrans à construire (back-office /admin)

Pas besoin de vraie protection par rôle pour l'instant — juste la route /admin accessible, avec sidebar :

Dashboard (chiffres mock).

Catégories : liste + formulaire CRUD (agit sur les mocks en state, pas de persistance).

Produits : liste + formulaire CRUD, avec gestion des variantes (attributs, valeurs, images par variante) en UI complète.

Promotions et Coupons : liste + formulaire CRUD basique.

Commandes : liste mock avec détail et changement de statut (UI seulement).

Consigne importante

Concentre-toi sur la qualité et la complétude de l'UI/UX (interactions, responsive, états vides, états de chargement simulés) plutôt que sur la logique métier réelle — tout sera reconnecté à Supabase dans une étape suivante avec un prompt dédié. N'ajoute aucune dépendance Supabase, aucune clé API, aucune table.

This project was built with [Lovable](https://lovable.dev).

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/a01eaf8d-632f-4e4f-91c9-8e821e24eb7a).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
