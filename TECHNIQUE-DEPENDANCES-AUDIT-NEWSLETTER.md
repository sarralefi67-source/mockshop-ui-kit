# Fiche technique - dependances front-end

## Objet et perimetre

Cette fiche recense les dependances du front-end aux deux features supprimees du backend :

- `admin_audit_log`, avec `log_admin_action()` et les triggers `trg_admin_audit` ;
- `newsletter_subscribers`, avec inscription publique et gestion administrateur.

L'analyse porte sur le code source executable sous `src/`, les routes generees, les composants, les types, la navigation, les tests, les traductions et la persistance client.

Les occurrences presentes dans `database/` sont des artefacts backend et ne constituent pas des dependances front-end. Les occurrences de `.output/` et de `.kilo/worktrees/` sont des sorties/worktrees generes ou paralleles, pas des sources de l'application active ; elles ne doivent pas etre modifiees comme etape de nettoyage du front.

## Synthese

| Feature | Dependances front directes | Etat constate |
|---|---:|---|
| `admin_audit_log` | 1 type Supabase ; 0 page ; 0 appel client ; 0 menu ; 0 test | Aucun ecran ni appel front identifie. La table est seulement declaree dans les types generes/manuels. |
| `newsletter_subscribers` | 1 route admin ; 3 composants/parcours d'inscription ; 5 appels Supabase ; 1 type Supabase ; arbre de routes genere | Feature encore active dans le code, meme si le formulaire Footer et l'entree de menu sont commentes. |

## Etat apres nettoyage front-end

Le nettoyage front-end de cette fiche a ete applique :

- aucune occurrence de `admin_audit_log`, `newsletter_subscribers`, `newsletter_opt_in` ou `/admin/newsletter` ne subsiste sous `src/` ;
- `src/routes/admin.newsletter.tsx` a ete supprimee ;
- `src/routeTree.gen.ts` a ete regenere par le build et ne declare plus `/admin/newsletter` ;
- l'import `Mail` et l'entree de menu newsletter ont ete retires de `src/routes/admin.tsx` ;
- `jspdf` et `date-fns` restent utilises par d'autres routes et ont donc ete conserves ;
- l'acces HTTP a `/admin/newsletter` retourne `404` ;
- `npm run build` passe avec succes.

Les sections ci-dessous decrivent l'inventaire avant nettoyage et servent de trace technique des dependances supprimees.

## 1. Feature `admin_audit_log`

### Routes et pages

Aucune route front ne gere ou n'affiche l'audit log.

- Aucun fichier `src/routes/*` ne contient `admin_audit_log`, `audit log`, ou un tableau d'audit.
- Aucun chemin applicatif `/admin/audit`, `/admin/audit-log` ou equivalent n'est declare.
- `src/routes/admin.avis.tsx` concerne la moderation des avis et ne constitue pas une page d'audit log.

**Action :** aucune page a supprimer. Verification a conserver apres nettoyage : une navigation vers un ancien lien d'audit doit rester absente ou etre redirigee explicitement si un lien externe historique existe.

### Composants

Aucun composant React dedie a `admin_audit_log` n'a ete trouve.

- Aucun composant de tableau, detail ou consultation des actions administrateur n'est present.
- `src/routes/admin.tsx` ne contient pas d'entree de menu d'audit.

**Action :** aucune suppression de composant. Ne pas supprimer les composants generiques `Table`, `Dialog`, etc. : ils servent a d'autres pages admin.

### Appels Supabase, hooks et services

Aucun appel `.from("admin_audit_log")` n'a ete trouve dans `src/`.

- Aucun `select`, `insert`, `update`, `delete`, hook ou service front ne cible la table.
- Les actions admin peuvent encore declencher des triggers backend historiques sur d'autres tables, mais cela releve du backend et n'est pas un appel front direct a `admin_audit_log`.

**Action :** aucune logique client a supprimer. La suppression backend ne devrait pas produire d'erreur front specifique a cette table, puisqu'aucun appel ne la cible.

### Types TypeScript

**Fichier :** `src/types/index.ts`

- Bloc `Database.public.Tables.admin_audit_log`.
- Il declare les colonnes `action`, `admin_id`, `created_at`, `id`, `new_value`, `old_value`, `record_id`, `table_name`, ainsi que les formes `Row`, `Insert` et `Update`.

**Action :** supprimable directement si ce fichier est maintenu manuellement et si aucune reference indirecte n'est revelee par le compilateur. Si le fichier est genere depuis Supabase, regenerer les types apres suppression backend plutot que modifier uniquement ce bloc. Risque : une regeneration peut aussi modifier d'autres tables ; verifier le diff.

### Navigation

Aucune entree de navigation ou de menu ne pointe vers l'audit log.

**Action :** rien a retirer.

### Tests

Aucun fichier de test unitaire ou e2e `*.test.*` / `*.spec.*` n'a ete trouve dans le depot. Aucun test d'audit log n'est donc a supprimer ou adapter.

### i18n et traductions

Aucun systeme de fichiers de traduction dedie n'a ete trouve et aucune chaine d'interface d'audit log n'est presente dans `src/`.

**Action :** rien a retirer.

### Cache et persistance client

Aucune donnee `admin_audit_log` n'est stockee dans `localStorage`, `sessionStorage`, React Query, un contexte global ou un autre cache client.

**Action :** rien a purger.

## 2. Feature `newsletter_subscribers`

### Routes et pages concernees

#### Page admin de gestion des abonnes

**Fichier :** `src/routes/admin.newsletter.tsx`

**Route applicative :** `/admin/newsletter`

La route exporte `createFileRoute("/admin/newsletter")` et implemente une page complete de gestion : chargement, recherche par e-mail, filtre actif/inactif, pagination, activation/desactivation, suppression unitaire, suppression multiple et export PDF.

**Action :** suppression directe de la route et de son contenu, sous reserve de retirer aussi son enregistrement de l'arbre TanStack genere. La dependance a `jspdf` et `date-fns` dans cette route disparaitra avec elle, mais ces paquets peuvent etre utilises ailleurs : verifier avant de les retirer du manifest.

#### Parcours publics et compte client

Il n'existe pas actuellement de route publique dediee a l'inscription newsletter. Les dependances sont embarquees dans des composants ou routes existants :

| Fichier | Route/parcours | Description | Action |
|---|---|---|---|
| `src/components/store/Footer.tsx` | Toutes les pages utilisant `StoreLayout` | Le formulaire newsletter est entierement dans un bloc JSX commente. Le composant contient encore `email`, `Input`, `Button`, `toast` et `supabase` lies a ce bloc. | Supprimer le bloc commente et les imports/etat devenus inutiles. Le composant `Footer` reste partage et doit etre conserve. |
| `src/components/store/AuthDialog.tsx` | Modale d'inscription ouverte notamment depuis `/inscription` et d'autres parcours storefront | Apres `signUp`, insertion asynchrone dans `newsletter_subscribers` si `newsletter` est vrai. La case newsletter correspondante est commentee, mais l'etat vaut `true` par defaut : l'insertion est donc actuellement declenchee lors de chaque inscription reussie. | Adapter le parcours d'inscription en supprimant l'etat `newsletter`, le bloc d'insertion et la case commentee. Conserver tout le reste de l'authentification. Le composant est partage par tout le storefront. |
| `src/routes/compte.index.tsx` | `/compte/` (route fichier `src/routes/compte.index.tsx`) | La sauvegarde du profil inclut `newsletter_opt_in`, puis insere l'e-mail dans `newsletter_subscribers` lorsque la valeur est vraie. Dans l'extrait actuel, aucun controle newsletter visible n'est rendu dans ce formulaire ; l'etat est neanmoins lu depuis le profil et renvoye a `profiles`. | Adapter, ne pas supprimer la page compte. Supprimer l'insertion vers la table. Decider explicitement si `newsletter_opt_in` doit rester un champ de profil sans effet, etre retire de l'UI/metier, ou etre conserve pour une future integration newsletter. |
| `src/components/store/StoreLayout.tsx` | Toutes les routes qui utilisent le layout storefront | Monte `Footer` et `AuthDialog`, donc depend indirectement des deux points precedents. | Ne pas supprimer `StoreLayout`. Aucun changement structurel necessaire si `Footer` et `AuthDialog` restent presents. |

Les routes wrappers `src/routes/inscription.tsx` et `src/routes/connexion.tsx` utilisent `StoreLayout` et/ou la modale d'authentification, mais ne contiennent pas d'appel newsletter direct. Elles restent necessaires a l'authentification et ne doivent pas etre supprimees.

### Appels Supabase, hooks et services

Aucun hook/service dedie n'existe ; les appels sont inline dans les composants/routes.

| Fichier | Operation | Description | Suppression/adaptation |
|---|---|---|---|
| `src/routes/admin.newsletter.tsx` | `select("*").order("subscribed_at")` | Charge la liste des abonnes au montage de la page admin. | Supprimer avec la route. |
| `src/routes/admin.newsletter.tsx` | `update({ is_active: ... }).eq("id", ...)` | Active/desactive un abonne. | Supprimer avec la route. |
| `src/routes/admin.newsletter.tsx` | `delete().eq("id", ...)` | Supprime un abonne. | Supprimer avec la route. |
| `src/routes/admin.newsletter.tsx` | `delete().in("id", selectedIds)` | Supprime les abonnes selectionnes. | Supprimer avec la route. |
| `src/components/store/Footer.tsx` | `insert({ email }).select()` | Inscription publique depuis le formulaire du footer ; code actuellement commente. | Supprimer avec le bloc commente et nettoyer les imports. |
| `src/components/store/AuthDialog.tsx` | `insert({ email })` | Inscription newsletter apres creation de compte ; appel asynchrone best-effort. | Supprimer l'appel sans modifier `signUp` lui-meme. |
| `src/routes/compte.index.tsx` | `insert({ email: email.trim() })` | Synchronisation best-effort apres activation de `newsletter_opt_in` lors de la sauvegarde du profil. | Supprimer uniquement cet appel et son commentaire. Conserver la mise a jour `profiles` si le champ est encore supporte. |

### Composants et etat local de la page admin

Le composant `AdminNewsletter` dans `src/routes/admin.newsletter.tsx` est entierement specifique a la table :

- type local `Subscriber` ;
- etats `subs`, `query`, `statusFilter`, `selectedIds` et etats de confirmation/chargement ;
- filtres, pagination et export PDF ;
- textes d'interface "Newsletter", "Abonnes", "Actif", "Desabonne", etc.

**Action :** suppression directe du fichier, sans extraire ces elements dans des composants partages : ils ne sont pas reutilises ailleurs dans le code source identifie.

### Types TypeScript

**Fichier :** `src/types/index.ts`

Le bloc `Database.public.Tables.newsletter_subscribers` declare :

- `Row` : `email`, `id`, `is_active`, `subscribed_at` ;
- `Insert` ;
- `Update` ;
- `Relationships` vide.

Le type local `Subscriber` de `src/routes/admin.newsletter.tsx` est un second type manuel specifique a la page.

**Action :**

1. Supprimer le type local avec la route.
2. Supprimer le bloc Supabase `newsletter_subscribers` si `src/types/index.ts` est manuel.
3. Si le fichier est genere, regenerer les types depuis le schema backend puis verifier les changements collateraux.
4. Ne pas supprimer automatiquement `newsletter_opt_in` du type de profil : ce champ appartient a `profiles`, pas a `newsletter_subscribers`. Il faut une decision fonctionnelle separee.

### Navigation et enregistrement de route

**Fichier :** `src/routes/admin.tsx`

- L'entree `{ to: "/admin/newsletter", label: "Newsletter", icon: Mail, exact: false }` est deja commentee.
- L'import `Mail` de `lucide-react` semble alors inutilise et pourra etre retire apres verification ESLint.

**Action :** supprimer la ligne commentee et l'import `Mail`. Le tableau `nav` et le layout admin doivent rester.

**Fichier :** `src/routeTree.gen.ts`

- Import de `AdminNewsletterRoute`.
- Enregistrement de la route `/admin/newsletter` dans les types, unions et map de routes generees.

**Action :** ne pas modifier ce fichier a la main. Supprimer `src/routes/admin.newsletter.tsx`, puis lancer le mecanisme de generation de TanStack Router (generalement pendant `dev`/`build`, selon la configuration) afin d'eviter un import casse et un acces route persistant. Verifier ensuite que `/admin/newsletter` n'est plus reconnu par le routeur.

### Tests

Aucun test unitaire ou e2e present dans le depot ne couvre la newsletter ou l'audit log. Aucun fichier de test n'a ete trouve avec les suffixes `*.test.*` ou `*.spec.*`.

**Action :** aucun fichier a supprimer. Apres nettoyage, un smoke test manuel ou e2e minimal est recommande pour :

- ouverture du storefront et rendu du Footer ;
- inscription client via `/inscription` ;
- sauvegarde de `/compte/` ;
- acces direct a `/admin/newsletter` (doit ne plus etre une route valide) ;
- absence d'erreur TypeScript/ESLint liee aux imports supprimes.

### i18n et traductions

Aucun catalogue i18n dedie n'a ete trouve. Les textes sont des litteraux francais dans les composants/routes :

- `src/routes/admin.newsletter.tsx` : titres, filtres, etats, confirmations, erreurs et export PDF ;
- `src/components/store/Footer.tsx` : bloc newsletter commente, dont "Newsletter", "Votre e-mail" et messages de toast ;
- `src/components/store/AuthDialog.tsx` : libelle de case newsletter commente et message de log d'erreur ;
- commentaires associes dans `src/routes/compte.index.tsx`.

**Action :** supprimer ces chaines avec les blocs correspondants. Ne pas supprimer des chaines generiques partagees comme celles liees a l'authentification ou aux profils.

### Cache et persistance client

Aucune donnee de `newsletter_subscribers` n'est mise en cache dans `localStorage`, `sessionStorage`, React Query ou un contexte global.

Points voisins a ne pas supprimer par erreur :

- `src/context/AuthContext.tsx` persiste un indicateur generique de confirmation d'inscription en attente dans `localStorage`; ce n'est pas une donnee newsletter.
- `src/context/StoreContext.tsx` persiste le panier ; aucun lien avec les abonnes.
- `src/routes/compte.index.tsx` porte un etat React local `newsletter` et le champ serveur `profiles.newsletter_opt_in`; ce n'est pas un cache de la table `newsletter_subscribers`, mais c'est une dependance metier a arbitrer.

**Action :** aucune cle de cache newsletter a purger. Adapter seulement l'etat et le champ de profil selon la decision fonctionnelle sur `newsletter_opt_in`.

## 3. Dependances backend trouvees mais hors front-end

Ces fichiers contiennent des references aux tables/fonctions, mais ils ne doivent pas etre supprimes dans une tache de nettoyage front sans decision backend distincte :

- `database/admin-audit-log-triggers.sql` : definition de `log_admin_action()`, insertion dans `admin_audit_log` et liste de tables equipees des triggers ;
- `database/schema.sql` : definition SQL de `newsletter_subscribers` ;
- `database/newsletter-authenticated-insert.sql` : politique d'insertion de `newsletter_subscribers` ;
- `database/banners.sql` et `database/site-settings.sql` : triggers `trg_admin_audit` sur d'autres tables ;
- `database` et migrations eventuelles non presentes dans `src`.

Ces references expliquent la dependance backend historique, mais aucune d'elles n'est un appel execute par le front-end.

## 4. Checklist de suppression ordonnee

### UI publique

- [x] Supprimer le bloc newsletter commente de `src/components/store/Footer.tsx`.
- [x] Retirer de `Footer.tsx` les imports `Input`, `Button`, `toast`, `supabase` et l'etat `email` s'ils ne servent plus ailleurs dans le fichier.
- [x] Retirer de `AuthDialog.tsx` l'etat `newsletter`, le bloc `insert` et la case newsletter commentee.
- [x] Verifier que `signUp`, la validation, les conditions et la fermeture de la modale fonctionnent toujours via le build et le diagnostic TypeScript.
- [x] Dans `src/routes/compte.index.tsx`, supprimer l'insertion vers `newsletter_subscribers`.
- [x] Retirer `newsletter_opt_in` du profil front, puisqu'il n'a plus de destinataire backend.

### UI admin

- [x] Supprimer `src/routes/admin.newsletter.tsx` et tout son composant specifique.
- [x] Verifier que les dependances `jspdf` et `date-fns` restent utilisees ailleurs avant toute suppression du manifest.
- [x] Tester l'acces direct a `/admin/newsletter` : la reponse est `404`.

### Hooks et services

- [x] Rechercher une derniere fois `.from("newsletter_subscribers")`, `newsletter_subscribers` et `admin_audit_log` sous `src/`.
- [x] Confirmer qu'aucun hook/service partage ne les cible ; l'analyse actuelle n'en a trouve aucun.
- [x] Ne pas modifier `supabaseClient` : il est partage par de nombreuses features et ne contient pas de logique specifique a ces tables.

### Types

- [x] Supprimer les blocs `admin_audit_log` et `newsletter_subscribers` de `src/types/index.ts`.
- [x] Examiner le diff : seuls les blocs des deux tables et les references a `newsletter_opt_in` ont ete retires.
- [x] Traiter `profiles.newsletter_opt_in` separement en le retirant du profil front.

### Navigation et routes generees

- [x] Supprimer l'entree de menu newsletter deja commentee dans `src/routes/admin.tsx`.
- [x] Supprimer l'import `Mail` devenu inutilise.
- [x] Regenerer `src/routeTree.gen.ts` apres suppression de la route source.
- [x] Verifier les liens actifs et l'acces direct a `/admin/newsletter` ; aucun lien actif ne subsiste et la route retourne `404`.

### Tests et validation

- [x] Valider le build storefront et le rendu compilable du Footer sans formulaire newsletter.
- [x] Verifier par recherche source qu'aucune requete vers la table supprimee ne part apres `signUp`.
- [x] Verifier que la sauvegarde du compte n'envoie plus `newsletter_opt_in`.
- [x] Verifier qu'un admin ne voit plus de menu newsletter et que l'ancienne route retourne `404`.
- [ ] Executer `npm run lint` global : bloque par les erreurs Prettier/CRLF preexistantes du depot ; les diagnostics des fichiers modifies sont sans erreur.

## 5. Risques de regression

- **Import de route casse :** supprimer le fichier sans regenerer `src/routeTree.gen.ts` laisserait un import `AdminNewsletterRouteImport` invalide.
- **Route 404 ou route fantome :** conserver l'arbre genere ou un lien historique peut produire un comportement different entre navigation et acces direct.
- **Erreur TypeScript Supabase :** retirer la table du schema sans regenerer les types peut laisser des references obsoletes ; regenerer peut aussi provoquer des changements hors perimetre a verifier.
- **Inscription client incomplete :** retirer le bloc newsletter dans `AuthDialog` sans toucher a `signUp` doit rester intentionnel ; l'authentification et la confirmation e-mail ne doivent pas etre affectees.
- **Etat de profil incoherent :** supprimer la table mais conserver `newsletter_opt_in` donne une preference visible ou persistante sans destinataire. A l'inverse, retirer le champ du profil sans migration correspondante peut casser la mise a jour `profiles`.
- **Imports inutilises :** `Mail` dans `admin.tsx`, et les imports newsletter dans `Footer.tsx`, peuvent faire echouer ESLint selon sa configuration.
- **Suppression excessive de dependances :** `jspdf`, `date-fns`, `Input`, `Button` et `toast` sont potentiellement partages ; leur suppression du projet entier doit etre precedee d'une recherche globale.
- **Regeneration de routes :** un build/dev TanStack Router peut reecrire `routeTree.gen.ts`; ce changement genere doit etre controle dans le diff.
- **Audit log absent sans erreur visible :** aucun ecran front ne depend de `admin_audit_log`, mais une eventualite de navigation externe vers une page non implementee doit etre verifiee hors du code source.

## Conclusion

La suppression front de `admin_audit_log` est limitee a la declaration de types, car aucune UI, navigation, requete, traduction, cache ou test ne la reference. La suppression de `newsletter_subscribers` est plus large : elle concerne une route admin complete, deux insertions actives dans les parcours d'inscription/compte, un formulaire Footer deja commente, les types Supabase et l'arbre de routes genere. Le point fonctionnel a trancher avant implementation est le devenir de `profiles.newsletter_opt_in`, qui est distinct de la table supprimee mais encore manipule par le profil client.
