# Audit responsive & plan mobile-first

## 1. Audit par écran / composant

### Page principale (`src/routes/index.tsx`)
- Actuel : header fixe 44px de haut avec 3 blocs texte (le libellé « Live-Preise · Deutschland » se serre sur 375px), hero avec padding `py-12`, onglets Umkreis / Trajet / Favoriten sur une seule ligne (débordent horizontalement sur mobile), grille liste+carte `lg:grid-cols-2` avec carte figée à `h-[320px]` en dessous de `lg`.
- Cible :
  - base : header 56px, logo + bouton menu (Sheet) ; hero compact (`py-8`) ; onglets scrollables ou pleine largeur avec libellés courts ; sous-onglets « Liste / Karte » pour l'affichage résultats ; carte `h-[60vh]`.
  - md : liste et carte empilées (carte au-dessus, liste dessous), plus de sous-onglets ; grille de cartes 2 colonnes dans Favoriten.
  - lg/xl : layout deux colonnes (liste 2/5, carte 3/5 collante `h-[calc(100vh-…)]`), barre de recherche horizontale visible en permanence.

### Header / navigation
- Actuel : pas de navigation réelle, une barre de titre.
- Cible : header sticky avec safe-area (`pt-[env(safe-area-inset-top)]`), menu hamburger (Sheet shadcn depuis la gauche) sur mobile contenant les onglets + accès filtres ; barre horizontale à partir de `md`.

### `SearchForm`
- Actuel : déjà `flex-col sm:flex-row`, hauteurs 48px — OK tactile.
- Cible : inchangé sur le fond ; boutons pleine largeur en base, texte « Standort » masqué sous 380px (icône seule + `aria-label`).

### Filtres (`RadiusSlider`, `FuelTypeFilter`, tri)
- Actuel : grille `sm:grid-cols-3` toujours visible ; slider avec poignée fine.
- Cible : sur mobile, repliés dans un Accordion « Filter » (ou Sheet), déployés en permanence à partir de `md` ; poignée du slider agrandie (zone tactile 44px via `::before` / classes utilitaires sur `SliderThumb`) ; triggers `FuelTypeFilter` à `h-11` minimum.

### `StationCard`
- Actuel : nom et adresse tronqués (`truncate`) sans tooltip ; grille de 3 prix `grid-cols-3` correcte mais serrée avec badges qui wrappent.
- Cible : titre tronqué + `Tooltip` (et `title`) portant le nom complet ; badges en `flex-wrap` avec `gap-1.5` ; prix `text-[17px]` en base → `text-[19px]` à `sm` ; boutons d'action `min-h-11` ; bouton favori zone 44x44.

### `StationList`
- Actuel : `space-y-3` une colonne partout.
- Cible : une colonne dans le contexte carte ; grille `md:grid-cols-2 xl:grid-cols-3` optionnelle (prop `layout="grid"`) utilisée par l'onglet Favoriten.

### `StationMap`
- Actuel : hauteur imposée par le parent (`320px` fixe) ; contrôles de zoom en haut à gauche par défaut ; popups sans largeur max.
- Cible : hauteur relative (`h-[60vh]` base, `h-[55vh]` md, `h-full` lg) ; `zoomControl` repositionné (`bottomright`, marge basse pour le pouce/safe-area) ; popups `maxWidth` ~260px et contenu responsive ; `scrollWheelZoom` désactivé sur tactile pour ne pas piéger le scroll de page (drag/pinch conservés).

### `RouteForm`
- Actuel : deux champs en `sm:grid-cols-2`, slider corridor + bouton en `sm:grid-cols-[1fr_auto]`.
- Cible : champs empilés en base (déjà le cas), bouton « Trajet suchen » pleine largeur en base ; liste de suggestions limitée en hauteur (`max-h-64 overflow-auto`) pour rester visible au-dessus du clavier virtuel.

### `RouteFavoritesBar` et barre « Trajet speichern »
- Actuel : `Input w-64` fixe → déborde sous 375px.
- Cible : `w-full sm:w-64` ; puces de trajets scrollables horizontalement avec `min-h-11`.

### `PriceTrendChart`
- Actuel : `ResponsiveContainer` déjà utilisé ; dialog probablement large ; axes avec tous les labels.
- Cible : `DialogContent` `w-[calc(100vw-2rem)] max-w-lg` ; hauteur du graphe `h-56 sm:h-72` ; `XAxis` avec `interval="preserveStartEnd"` et `minTickGap` pour réduire les labels en largeur réduite ; marges réduites en mobile.

### `states.tsx` / états vides
- Actuel : padding `p-10` uniforme.
- Cible : `p-6 sm:p-10`, titres `text-lg sm:text-[21px]`.

### `__root.tsx`
- À vérifier / ajouter : meta viewport `width=device-width, initial-scale=1, viewport-fit=cover` (nécessaire pour `env(safe-area-inset-*)`), `overflow-x-hidden` sur `body`.

## 2. Restructuration proposée du layout principal
L'état (`center`, `stations`, `activeId`, `fuel`, `sort`, `trends`) reste au niveau de `HomePage` — aucun changement de logique métier. Ajout d'un état purement UI :
- `mobileView: "list" | "map"` pour les sous-onglets mobile,
- `filtersOpen` pour l'accordéon/Sheet de filtres,
- `navOpen` pour le Sheet de navigation.

Extraction d'un composant de présentation `ResultsLayout` (liste + carte) réutilisé par les onglets Umkreis et Trajet, qui rend :
- base : `Tabs` Liste/Karte,
- `md` : empilé (carte puis liste),
- `lg` : deux colonnes synchronisées.
La carte reste montée dans les deux vues mobiles (via `hidden`/`block` plutôt que démontage) pour éviter la réinitialisation Leaflet.

## 3. Détails techniques
- Uniquement des classes utilitaires Tailwind responsive ; safe-area via `env(safe-area-inset-*)` en classes arbitraires (`pb-[env(safe-area-inset-bottom)]`).
- Aucun conteneur en largeur/hauteur fixe : `w-full`, `max-w-*`, `vh`.
- Cibles tactiles : `min-h-11 min-w-11` sur tous les boutons icônes.
- Pas d'élément `fixed` en bas contenant un champ de saisie.

## 4. Tests
Playwright aux largeurs 375 / 768 / 1024 / 1440 px : captures des onglets Umkreis et Trajet, vérification `document.documentElement.scrollWidth <= clientWidth` (pas de scroll horizontal), ouverture/fermeture du Sheet mobile et scroll interne.

## 5. Compromis anticipés
- Le pattern « bottom sheet façon Google Maps » est remplacé par des sous-onglets Liste/Karte : plus simple à maintenir avec l'état partagé existant et sans conflit de gestes avec Leaflet.
- Désactivation du zoom molette sur tactile : léger changement de comportement, nécessaire pour éviter le piégeage du scroll.
