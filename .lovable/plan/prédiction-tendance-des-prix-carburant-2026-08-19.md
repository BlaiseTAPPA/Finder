# Prédiction & tendance des prix carburant

Ajout d'un historique de prix, d'un calcul de tendance et de recommandations horaires.
Comme demandé, voici d'abord le schéma de données et la stratégie de collecte.

## Adaptations à la stack du projet

| Demandé | Ici |
|---|---|
| Postgres Neon/Vercel + Prisma/Drizzle | Lovable Cloud (Postgres managé, migrations SQL) — aucun compte externe |
| Vercel Cron + `/app/api/cron/...` | pg_cron déclenchant `POST /api/public/cron/collect-prices` (route serveur TanStack) |
| `/api/stations/[id]/history` | server function `getPriceHistory` (appelée par TanStack Query) |
| `/api/stations/[id]/trend` | server function `getPriceTrend` |
| recharts | déjà disponible, utilisé pour le graphique |

## Schéma de base de données

```text
stations
  id            text        PK   -- id Tankerkönig
  name          text
  brand         text
  street/house/postcode/place  text
  lat, lng      double precision
  last_seen_at  timestamptz      -- MAJ à chaque fois qu'un user voit la station
  created_at    timestamptz

price_history
  id            bigserial   PK
  station_id    text        FK -> stations(id) on delete cascade
  fuel_type     fuel_type   -- enum ('e5','e10','diesel')
  price         numeric(5,3)
  recorded_at   timestamptz
  index (station_id, fuel_type, recorded_at desc)

price_daily            -- agrégat au-delà de 30 jours
  station_id, fuel_type, day date, avg_price, min_price, max_price, samples
  PK (station_id, fuel_type, day)

collector_state        -- verrou single-flight + circuit breaker
  id text PK ('prices')
  lease_until timestamptz, status text ('idle'|'running'|'paused'),
  last_run_at, last_error, cursor text
```

Grants : `SELECT` pour `anon`/`authenticated` sur `stations`, `price_history`, `price_daily` (données publiques, aucune donnée perso) ; écriture réservée au `service_role`. RLS activé, policies SELECT `TO anon` uniquement.

## Stratégie de collecte

- **Enregistrement des stations** : chaque recherche utilisateur upsert les stations vues (`last_seen_at`), donc le pool grandit naturellement. Seules les stations vues dans les 14 derniers jours sont collectées.
- **Cron** : toutes les 20 minutes, pg_cron appelle l'endpoint public avec un header secret `CRON_SECRET`.
- **Lot borné** : max 10 requêtes `prices.php` par exécution, 100 ids par requête (soit ≤ 1000 stations/run), curseur tournant stocké dans `collector_state` pour couvrir tout le pool sur plusieurs runs.
- **Écriture différentielle** : insertion uniquement si le prix diffère du dernier enregistré pour (station, carburant).
- **Verrou** : lease de 5 min dans `collector_state`, un second run sortant immédiatement.
- **Circuit breaker** : quota/429 Tankerkönig → `status = 'paused'`, pas de retry en boucle ; reprise au run suivant avec une seule requête sonde.
- **Rétention** : job quotidien qui agrège en `price_daily` puis supprime les lignes `price_history` de plus de 30 jours.

Compromis : 20 min de granularité suffit pour le cycle journalier (les changements réels sont ~4-8/jour par station) tout en restant très en dessous du quota Tankerkönig ; l'écriture différentielle limite le volume à ~10 lignes/station/jour, soit ~300 lignes/station/mois.

## Calculs (côté serveur)

1. **Tendance 7/14/30 j** : min, max, moyenne, percentile du prix actuel → `bas` (<25e), `moyen`, `élevé` (>75e).
2. **Cycle journalier** : moyenne par heure locale (Europe/Berlin) sur N jours → heure du creux et du pic. Recommandation :
   - heure actuelle proche du creux → « bon moment »
   - creux à venir dans les prochaines heures → « attends jusqu'à ~Xh »
   - sinon rien.
3. **Confiance** : aucune recommandation si < 4 jours distincts d'historique ou < 20 points. L'UI affiche alors un état « pas encore assez de données ».

## UI

- `PriceTrendChart` : recharts (ligne + ligne de moyenne), Tabs 7/14/30 j, dans un Dialog shadcn ouvert au clic sur une station.
- Badge de tendance sur `StationCard` (vert/orange/rouge) + Tooltip expliquant le percentile.
- Encart recommandation sous le prix, masqué si confiance insuffisante.

## Tests

Tests unitaires Vitest sur données synthétiques : percentiles, classification, détection creux/pic, seuil de confiance, écriture différentielle.

## Conformité

Tankerkönig (CC BY 4.0, usage non commercial) autorise la réutilisation avec attribution ; on ajoutera la mention de source sur les vues d'historique. On stocke uniquement des prix publics, aucune donnée utilisateur.

## Livraison en deux temps

1. Base + collecte + calculs + endpoints + tests.
2. UI branchée dessus, avec état « pas encore assez de données » visible dès le jour 1 (l'historique se remplit ensuite).
