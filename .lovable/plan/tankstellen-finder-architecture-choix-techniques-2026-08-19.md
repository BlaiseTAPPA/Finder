# Tankstellen-Finder — Architecture & choix techniques

Application de recherche de stations-service en Allemagne avec comparaison des prix carburant en temps réel (données Tankerkönig).

## Point important sur la stack

Ce projet tourne sur **TanStack Start (React 19 + Vite)**, pas Next.js — le framework est fixé par la plateforme et ne peut pas être remplacé. Toutes les fonctionnalités demandées restent réalisables à l'identique :

| Demandé (Next.js) | Équivalent ici |
|---|---|
| App Router / Server Components | Routes fichiers `src/routes/` + loaders SSR |
| Route Handlers `/app/api/...` | Server functions `createServerFn` (proxy serveur, clé jamais exposée) |
| `revalidate` / cache Next | Cache mémoire TTL côté serveur + TanStack Query côté client |
| next-themes | Toggle de thème local (non prioritaire, cf. plus bas) |

Le reste — TypeScript strict, Tailwind, shadcn/ui, Zod, react-hook-form, Leaflet — est identique.

## Choix techniques proposés

**Carte : Leaflet + react-leaflet.** Plus léger, tuiles OSM gratuites sans clé, suffisant pour des marqueurs de stations. MapLibre GL n'apporte un gain qu'avec du vectoriel/3D et exige un fournisseur de tuiles avec clé. Chargement dynamique après hydratation (Leaflet touche `window`).

**Cache & quota.** Tankerkönig limite fortement les appels (usage non commercial, ~1 req/min/endpoint recommandé) :
- `list.php` : cache serveur par clé arrondie `lat/lng/rayon` (grille ~0,01°), TTL 5 min.
- `prices.php` : TTL 3 min, un seul appel groupé pour toutes les stations affichées.
- Polling client toutes les 5 min, mis en pause quand l'onglet est masqué.
- Gestion explicite : quota dépassé → message dédié + backoff, pas de retry en boucle.

**Clé API.** Stockée en secret serveur `TANKERKOENIG_API_KEY`, lue uniquement dans les handlers des server functions.

**Géocodage.** Nominatim via le serveur (User-Agent requis), pour la recherche ville/code postal en fallback de la géolocalisation.

## Arborescence

```text
src/
  routes/
    index.tsx                  page principale (recherche + liste + carte + favoris)
  lib/
    tankerkoenig.ts            schémas Zod + normalisation des types
    tankerkoenig.server.ts     appels HTTP + cache TTL + gestion quota
    stations.functions.ts      server fns: listStations, refreshPrices, geocode
    geolocation.ts             hook useGeolocation (permission, erreurs, fallback)
    favorites.ts               hook useFavorites (localStorage, hydratation sûre)
    format.ts                  prix € / distance km, "il y a X min"
  components/
    station-card.tsx           carte station (marque, adresse, distance, badge, prix)
    station-map.tsx            Leaflet, marqueurs + popup + bouton itinéraire
    station-list.tsx           tri, mise en avant de la station la moins chère
    fuel-type-filter.tsx       Tabs E5 / E10 / Diesel
    radius-slider.tsx          slider 1–25 km
    search-form.tsx            react-hook-form + Zod (ville / code postal)
    states.tsx                 skeletons, empty, erreurs, permission refusée
  types/station.ts             Station, FuelPrices, FuelType, SortMode
.env.example
```

## Design

Système de design tiré du fichier Apple fourni : Action Blue `#0066cc`, encre `#1d1d1f`, canevas blanc / parchemin `#f5f5f7`, typographie SF Pro (system-ui), rayons pill pour les boutons, cartes 18px, ombre unique sous les visuels. Tokens sémantiques en oklch dans `src/styles.css`, aucune couleur en dur dans les composants. Mobile-first, chrome discret, prix comme élément typographique dominant.

## Fonctionnalités livrées

1. Géolocalisation navigateur + fallback recherche ville/CP, rayon 1–25 km.
2. Liste : nom, marque, adresse, distance, badge ouvert/fermé, prix E5/E10/Diesel, tri prix/distance, filtre carburant, moins chère mise en avant.
3. Carte interactive synchronisée avec la liste (survol/clic croisés), popup avec prix + itinéraire Maps.
4. Rafraîchissement des prix toutes les 5 min via `prices.php` + indicateur « mis à jour il y a X min ».
5. Favoris épinglés en localStorage, onglet dédié consultable sans nouvelle recherche.
6. États gérés : permission refusée, aucune station, erreur API, quota dépassé.

## Ce dont j'ai besoin

Une clé API Tankerkönig (gratuite, sur creativecommons.tankerkoenig.de). Je la demanderai comme secret au démarrage de l'implémentation ; sans clé, l'app affichera un état « clé manquante » explicite mais le reste fonctionnera.

## Notes

- Textes de l'interface en allemand, prix en €, distances en km.
- Pas de dark mode toggle dans un premier temps (non prioritaire) ; le design clair Apple est la base.
