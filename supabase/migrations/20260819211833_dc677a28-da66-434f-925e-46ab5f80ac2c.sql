CREATE TYPE public.fuel_type AS ENUM ('e5','e10','diesel');

CREATE TABLE public.stations (
  id text PRIMARY KEY,
  name text NOT NULL DEFAULT '',
  brand text NOT NULL DEFAULT '',
  street text NOT NULL DEFAULT '',
  house_number text NOT NULL DEFAULT '',
  post_code text NOT NULL DEFAULT '',
  place text NOT NULL DEFAULT '',
  lat double precision NOT NULL,
  lng double precision NOT NULL,
  last_seen_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.stations TO anon, authenticated;
GRANT ALL ON public.stations TO service_role;
ALTER TABLE public.stations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "stations public read" ON public.stations FOR SELECT TO anon, authenticated USING (true);
CREATE INDEX stations_last_seen_idx ON public.stations (last_seen_at DESC);

CREATE TABLE public.price_history (
  id bigserial PRIMARY KEY,
  station_id text NOT NULL REFERENCES public.stations(id) ON DELETE CASCADE,
  fuel_type public.fuel_type NOT NULL,
  price numeric(5,3) NOT NULL,
  recorded_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.price_history TO anon, authenticated;
GRANT ALL ON public.price_history TO service_role;
GRANT USAGE, SELECT ON SEQUENCE public.price_history_id_seq TO service_role;
ALTER TABLE public.price_history ENABLE ROW LEVEL SECURITY;
CREATE POLICY "price_history public read" ON public.price_history FOR SELECT TO anon, authenticated USING (true);
CREATE INDEX price_history_lookup_idx ON public.price_history (station_id, fuel_type, recorded_at DESC);

CREATE TABLE public.price_daily (
  station_id text NOT NULL REFERENCES public.stations(id) ON DELETE CASCADE,
  fuel_type public.fuel_type NOT NULL,
  day date NOT NULL,
  avg_price numeric(5,3) NOT NULL,
  min_price numeric(5,3) NOT NULL,
  max_price numeric(5,3) NOT NULL,
  samples integer NOT NULL DEFAULT 0,
  PRIMARY KEY (station_id, fuel_type, day)
);
GRANT SELECT ON public.price_daily TO anon, authenticated;
GRANT ALL ON public.price_daily TO service_role;
ALTER TABLE public.price_daily ENABLE ROW LEVEL SECURITY;
CREATE POLICY "price_daily public read" ON public.price_daily FOR SELECT TO anon, authenticated USING (true);

CREATE TABLE public.collector_state (
  id text PRIMARY KEY,
  status text NOT NULL DEFAULT 'idle',
  lease_until timestamptz,
  cursor text,
  last_run_at timestamptz,
  last_error text,
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.collector_state TO service_role;
ALTER TABLE public.collector_state ENABLE ROW LEVEL SECURITY;

INSERT INTO public.collector_state (id, status) VALUES ('prices','idle');

-- Rétention : agrégation journalière puis purge au-delà de 30 jours.
CREATE OR REPLACE FUNCTION public.compact_price_history()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.price_daily (station_id, fuel_type, day, avg_price, min_price, max_price, samples)
  SELECT station_id, fuel_type, (recorded_at AT TIME ZONE 'Europe/Berlin')::date AS day,
         round(avg(price), 3), min(price), max(price), count(*)
  FROM public.price_history
  WHERE recorded_at < now() - interval '30 days'
  GROUP BY station_id, fuel_type, day
  ON CONFLICT (station_id, fuel_type, day) DO UPDATE
    SET avg_price = EXCLUDED.avg_price,
        min_price = EXCLUDED.min_price,
        max_price = EXCLUDED.max_price,
        samples = EXCLUDED.samples;

  DELETE FROM public.price_history WHERE recorded_at < now() - interval '30 days';
END;
$$;