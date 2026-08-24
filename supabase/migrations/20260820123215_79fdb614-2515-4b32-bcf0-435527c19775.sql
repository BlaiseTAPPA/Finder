CREATE TABLE public.profiles (
  clerk_user_id text PRIMARY KEY,
  username text,
  avatar_url text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.user_favorites (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  clerk_user_id text NOT NULL,
  station_id text NOT NULL,
  station jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (clerk_user_id, station_id)
);
GRANT ALL ON public.user_favorites TO service_role;
ALTER TABLE public.user_favorites ENABLE ROW LEVEL SECURITY;
CREATE INDEX user_favorites_user_idx ON public.user_favorites (clerk_user_id);

CREATE TABLE public.user_trips (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  clerk_user_id text NOT NULL,
  name text NOT NULL,
  trip jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (clerk_user_id, name)
);
GRANT ALL ON public.user_trips TO service_role;
ALTER TABLE public.user_trips ENABLE ROW LEVEL SECURITY;
CREATE INDEX user_trips_user_idx ON public.user_trips (clerk_user_id);

CREATE TABLE public.price_alerts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  clerk_user_id text NOT NULL,
  station_id text NOT NULL REFERENCES public.stations(id),
  station_name text NOT NULL DEFAULT '',
  fuel_type fuel_type NOT NULL,
  threshold numeric NOT NULL,
  active boolean NOT NULL DEFAULT true,
  last_triggered_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (clerk_user_id, station_id, fuel_type)
);
GRANT ALL ON public.price_alerts TO service_role;
ALTER TABLE public.price_alerts ENABLE ROW LEVEL SECURITY;
CREATE INDEX price_alerts_user_idx ON public.price_alerts (clerk_user_id);