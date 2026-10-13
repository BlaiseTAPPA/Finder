-- Planification de la collecte des prix (toutes les 20 minutes) et de la
-- compaction quotidienne de l'historique, via pg_cron + pg_net.
--
-- L'URL de l'endpoint et le secret partagé ne sont pas versionnés : ils sont
-- lus au moment de l'exécution depuis Supabase Vault, sous les noms
--   'collector_url'    → https://<domaine-prod>/api/public/cron/collect-prices
--   'collector_secret' → même valeur que la variable CRON_SECRET du serveur
-- Tant que ces secrets n'existent pas, le job de collecte ne fait rien.

CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

CREATE OR REPLACE FUNCTION public.trigger_price_collection()
RETURNS bigint
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  target_url text;
  secret text;
BEGIN
  SELECT decrypted_secret INTO target_url
  FROM vault.decrypted_secrets WHERE name = 'collector_url';
  SELECT decrypted_secret INTO secret
  FROM vault.decrypted_secrets WHERE name = 'collector_secret';

  IF target_url IS NULL THEN
    RAISE NOTICE 'collector_url absent du Vault : collecte ignorée';
    RETURN NULL;
  END IF;

  RETURN net.http_post(
    url := target_url,
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-cron-secret', coalesce(secret, '')
    ),
    body := '{}'::jsonb,
    timeout_milliseconds := 60000
  );
END;
$$;

REVOKE ALL ON FUNCTION public.trigger_price_collection() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.trigger_price_collection() TO service_role;

-- cron.schedule remplace un job existant du même nom (idempotent).
SELECT cron.schedule(
  'collect-prices',
  '*/20 * * * *',
  $$SELECT public.trigger_price_collection();$$
);

-- Agrégation journalière + purge > 30 jours (03:15 UTC).
SELECT cron.schedule(
  'compact-price-history',
  '15 3 * * *',
  $$SELECT public.compact_price_history();$$
);
