# Contribution communautaire (signalement / confirmation de prix)

Couche communautaire **par-dessus** Tankerkönig. Le prix affiché reste toujours celui de
Tankerkönig ; la communauté n'ajoute qu'un signal de confiance.

## 1. Schéma de données

```text
price_reports
  id              uuid        PK  default gen_random_uuid()
  station_id      text        FK -> stations(id) on delete cascade
  fuel_type       fuel_type   -- enum existant ('e5','e10','diesel')
  reported_price  numeric(5,3) NULL
  comment         text NULL   -- max 200 car., validé côté serveur
  contributor_id  text        -- identifiant neutre (UUID anonyme aujourd'hui, user id demain)
  user_lat        double precision NULL
  user_lng        double precision NULL
  created_at      timestamptz not null default now()
  index (station_id, fuel_type, created_at desc)
  index (contributor_id, created_at desc)

price_confirmations
  id              uuid        PK
  station_id      text        FK -> stations(id) on delete cascade
  fuel_type       fuel_type
  contributor_id  text
  user_lat        double precision not null   -- obligatoire (proximité vérifiée)
  user_lng        double precision not null
  created_at      timestamptz not null default now()
  index (station_id, fuel_type, created_at desc)
  index (contributor_id, created_at desc)
```

Sécurité : RLS activé, **aucune** policy `anon` en écriture ni en lecture directe. Tout passe
par des server functions en service_role qui appliquent validation, rate limiting et proximité.
`contributor_id` reste un `text` volontairement découplé de l'auth : ajouter un compte plus tard
consistera à écrire l'`auth.uid()` dans ce champ et à ajouter une colonne `user_id` optionnelle.

Confidentialité : `user_lat`/`user_lng` sont arrondis à 3 décimales (~100 m) avant écriture et ne
sont jamais renvoyés au client.

## 2. Logique du badge de fiabilité

Fenêtre glissante de 48 h, pondération par fraîcheur (demi-vie 12 h) :

```text
poids(x) = 0.5 ^ (âge_en_heures / 12)
C = Σ poids(confirmations)      R = Σ poids(signalements)
score = (C - R) / (C + R)
```

Classification (par station + carburant) :

| Condition | Statut | Rendu |
|---|---|---|
| `C + R < 2` (poids cumulé) | `neutral` | aucun badge |
| `score >= 0.34` | `confirmed` | badge vert « Récemment bestätigt » |
| `score <= -0.34` | `disputed` | badge orange « Preis angezweifelt » |
| sinon | `neutral` | aucun badge |

Le tooltip détaille : nombre brut de confirmations, de signalements, et l'horodatage relatif de la
dernière activité. Un signalement seul récent (poids ≥ 2, soit ~2 signalements frais) suffit à
passer en `disputed` — jamais à modifier le prix.

## 3. Positionnement vis-à-vis de Tankerkönig

- Le prix reste rendu tel quel, avec sa source. Le badge est **à côté** du bloc prix, jamais dessus.
- Textes explicites : « Preis: Tankerkönig (offizielle Meldung der Station) » et
  « Community-Hinweis, ändert den offiziellen Preis nicht » dans le tooltip et le dialog.
- Le dialog de signalement affiche un rappel : en cas d'écart réel et persistant, s'adresser à la
  station ou signaler via les canaux officiels (lien MTS-K / Tankerkönig).
- Aucun statut communautaire n'entre dans le tri, le calcul du « moins cher » ni dans la tendance.

## 4. Anti-abus

- 1 signalement max par (contributor_id, station, carburant) par heure.
- 1 confirmation max par (contributor_id, station, carburant) par heure.
- 10 actions max par contributor_id par 24 h, tous types confondus.
- Confirmation : rejet si distance utilisateur ↔ station > 500 m (Haversine, `src/lib/geo.ts`).
- Signalement : pas d'exigence de proximité, mais horodatage affiché.
- Validation Zod : prix 0,5–5,00 €, commentaire ≤ 200 caractères, trim, filtre de gros-mots simple
  côté serveur (liste courte, remplacement par refus explicite).
- `contributor_id` doit être un UUID v4 valide.

## 5. Endpoints (server functions TanStack, équivalents des routes demandées)

| Demandé | Ici |
|---|---|
| `POST /api/stations/[id]/report` | `reportPrice` (`src/lib/community.functions.ts`) |
| `POST /api/stations/[id]/confirm` | `confirmPrice` |
| `GET /api/stations/[id]/community-status` | `getCommunityStatus` + `getCommunityStatuses` (bulk pour la liste) |

Retour de statut : `{ status, confirmationsCount, reportsCount, lastActivityAt }`.
Erreurs typées et traduites : `rate_limited`, `too_far`, `invalid_input`.

## 6. UI

- `useContributorId()` : UUID v4 en localStorage (`tankstellen:contributor`), lecture après
  hydratation comme `useFavorites`.
- `CommunityTrustBadge` : badge + tooltip, à côté de `TrendBadge` sur la `StationCard`.
- `ReportPriceDialog` : carburant (préselectionné), prix observé optionnel, commentaire optionnel,
  encart d'avertissement sur l'origine du prix.
- `ConfirmPriceButton` : one-tap, désactivé avec explication si position inconnue ou > 500 m,
  toast sonner en retour.
- Boutons ajoutés dans la rangée d'actions de la `StationCard` (à côté de Verlauf / Route),
  compacts en mobile (icônes + libellés courts).
- Statuts récupérés en bulk pour la liste visible, invalidation TanStack Query après une action.

## 7. Tests

Vitest sur la pondération : décroissance temporelle, seuils confirmed/disputed/neutral, fenêtre
48 h, rate limiting (fonctions pures), contrôle de proximité 500 m.
