CREATE TABLE public.price_reports (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  station_id text NOT NULL REFERENCES public.stations(id) ON DELETE CASCADE,
  fuel_type public.fuel_type NOT NULL,
  reported_price numeric(5,3),
  comment text,
  contributor_id text NOT NULL,
  user_lat double precision,
  user_lng double precision,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX price_reports_station_fuel_idx ON public.price_reports (station_id, fuel_type, created_at DESC);
CREATE INDEX price_reports_contributor_idx ON public.price_reports (contributor_id, created_at DESC);

GRANT ALL ON public.price_reports TO service_role;
ALTER TABLE public.price_reports ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.price_confirmations (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  station_id text NOT NULL REFERENCES public.stations(id) ON DELETE CASCADE,
  fuel_type public.fuel_type NOT NULL,
  contributor_id text NOT NULL,
  user_lat double precision NOT NULL,
  user_lng double precision NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX price_confirmations_station_fuel_idx ON public.price_confirmations (station_id, fuel_type, created_at DESC);
CREATE INDEX price_confirmations_contributor_idx ON public.price_confirmations (contributor_id, created_at DESC);

GRANT ALL ON public.price_confirmations TO service_role;
ALTER TABLE public.price_confirmations ENABLE ROW LEVEL SECURITY;