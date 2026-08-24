# Stations le long d'un itinéraire

Nouvelle recherche « trajet » à côté de la recherche « autour de moi » : on saisit un départ et une destination, l'app trace la route, cherche les stations dans un corridor autour d'elle, et les classe par prix et détour.

## Choix du moteur de routage

**OSRM public** (`https://router.project-osrm.org`) — cohérent avec Nominatim, sans clé, sans quota facturé. Réserve : instance publique sans garantie de disponibilité.

L'accès passe par une interface unique `src/lib/routing.ts` (`type RoutingProvider = { route(origin, destination): Promise<RouteResult> }`), avec un adaptateur OSRM. Changer pour GraphHopper ou Mapbox = ajouter un adaptateur + une variable d'env, sans toucher au reste. Timeout 8 s, retry unique, erreurs typées (`ApiErrorShape` existant).

## Structure des endpoints

L'app tourne sur TanStack Start : les endpoints demandés (`/api/route`, `/api/route/stations`) deviennent des server functions typées, même rôle, clés côté serveur.

- `src/lib/route.functions.ts`
  - `planRoute({ origin, destination })` → `{ polyline: Coords[], distanceKm, durationMin, bbox }`, cache mémoire TTL 1 h clé sur les coordonnées arrondies.
  - `routeStations({ origin, destination, corridorKm, fuelType })` → route + stations enrichies `{ station, corridorKm, detourKm, detourMin, score }`.

Récupération des stations : on échantillonne la polyline tous les ~8 km, on appelle `list.php` (rayon = corridor + 5 km) sur chaque point, on déduplique par `id`, on garde ≤ 12 appels par trajet (cache Tankerkönig existant réutilisé).

## Géométrie — `src/lib/geo.ts`

- `haversineKm(a, b)`
- `distancePointToSegmentKm(p, a, b)` : projection sur le segment en plan local équirectangulaire, clamp [0,1]
- `distanceToPolylineKm(p, polyline)` : minimum sur tous les segments, renvoie aussi l'index du segment le plus proche
- `samplePolyline(polyline, stepKm)`

Tests unitaires (`src/lib/geo.test.ts`, Vitest déjà en place) : point sur la ligne = 0, point perpendiculaire, projection au-delà des extrémités, polyline à un seul point.

## Détour et classement

Détour ≈ 2 × distance station→route ; durée = détour / 45 km/h + 2 min d'arrêt.

Score « meilleur compromis » = économie estimée (prix médian du corridor − prix station) × 50 L − coût du détour (carburant du détour + temps valorisé à 12 €/h). Tris disponibles : compromis / prix / détour.

**Limites** : l'aller-retour théorique ignore les sens uniques, les échangeurs d'autoroute et les stations accessibles seulement dans un sens ; il sous-estime les détours autoroutiers et surestime les détours en ville. Amélioration possible plus tard : appeler OSRM pour un itinéraire origine → station → destination sur les 5 meilleurs candidats et comparer au trajet direct.

## UI

- Onglet « Trajet » à côté de « Umkreis » et « Favoriten ».
- `route-form.tsx` : départ + destination avec autocomplete Nominatim (nouvelle server fn `suggestPlaces`, debounce 300 ms), bouton « ma position » sur le départ, slider corridor (0,5–10 km, défaut 2), sélecteur carburant réutilisé.
- `station-map.tsx` : nouveau mode itinéraire — `Polyline` de la route, marqueurs colorés vert→rouge selon le prix, bande de corridor semi-transparente (`Polyline` épaissie, désactivable).
- `station-list.tsx` / `station-card.tsx` : badge « +X min · +Y km » quand l'info de détour est présente (props optionnelles, la vue Umkreis ne change pas).
- Trajets favoris : `src/lib/route-favorites.ts` sur localStorage (même pattern hydratation-safe que `favorites.ts`), bouton « Trajet speichern » avec nom libre, liste cliquable au-dessus du formulaire.

## Fichiers

Nouveaux : `src/lib/routing.ts`, `src/lib/geo.ts`, `src/lib/geo.test.ts`, `src/lib/route.functions.ts`, `src/lib/route-favorites.ts`, `src/lib/route-input.ts`, `src/components/route-form.tsx`, `src/components/route-favorites-bar.tsx`, `src/components/detour-badge.tsx`.

Modifiés : `src/routes/index.tsx` (onglet Trajet), `src/components/station-map.tsx`, `src/components/station-card.tsx`, `src/components/station-list.tsx`, `src/types/station.ts` (types route/corridor), `src/lib/stations.functions.ts` (autocomplete).

Pas de base de données : tout reste en localStorage, comme les favoris de stations.
