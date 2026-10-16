-- Fuel budget (feature 0002, phase 1): vehicle profile, budget and fill-up log.
-- Signed-in users only. The app server writes with the service role after verifying
-- the Clerk token; the owner policies cover direct access with a Clerk session token
-- (JWT "sub" = clerk_user_id), as in 20261013150000_user_data_rls.sql.

CREATE TABLE public.vehicle_profiles (
  clerk_user_id text PRIMARY KEY,
  name text CHECK (name IS NULL OR char_length(name) <= 40),
  fuel_type public.fuel_type NOT NULL,
  consumption_l_per_100km numeric(4, 1) NOT NULL
    CHECK (consumption_l_per_100km BETWEEN 2 AND 30),
  tank_capacity_l numeric(5, 1) NOT NULL CHECK (tank_capacity_l BETWEEN 10 AND 150),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.fuel_budgets (
  clerk_user_id text PRIMARY KEY,
  amount_eur numeric(8, 2) NOT NULL CHECK (amount_eur BETWEEN 1 AND 10000),
  period text NOT NULL CHECK (period IN ('weekly', 'monthly')),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Station data is a snapshot (no foreign key): an entry must survive the station
-- disappearing, and manual entries have no station. No coordinates are stored.
CREATE TABLE public.fuel_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  clerk_user_id text NOT NULL,
  filled_at timestamptz NOT NULL,
  station_id text,
  station_name text CHECK (station_name IS NULL OR char_length(station_name) <= 120),
  station_brand text CHECK (station_brand IS NULL OR char_length(station_brand) <= 80),
  station_place text CHECK (station_place IS NULL OR char_length(station_place) <= 80),
  fuel_type public.fuel_type NOT NULL,
  liters numeric(6, 2) NOT NULL CHECK (liters BETWEEN 0.5 AND 150),
  price_per_liter numeric(5, 3) NOT NULL CHECK (price_per_liter BETWEEN 0.5 AND 5),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX fuel_logs_user_filled_idx ON public.fuel_logs (clerk_user_id, filled_at DESC);

GRANT ALL ON public.vehicle_profiles, public.fuel_budgets, public.fuel_logs TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE
  ON public.vehicle_profiles, public.fuel_budgets, public.fuel_logs TO authenticated;

ALTER TABLE public.vehicle_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fuel_budgets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fuel_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "vehicle_profiles owner select" ON public.vehicle_profiles
  FOR SELECT TO authenticated USING ((auth.jwt() ->> 'sub') = clerk_user_id);
CREATE POLICY "vehicle_profiles owner insert" ON public.vehicle_profiles
  FOR INSERT TO authenticated WITH CHECK ((auth.jwt() ->> 'sub') = clerk_user_id);
CREATE POLICY "vehicle_profiles owner update" ON public.vehicle_profiles
  FOR UPDATE TO authenticated
  USING ((auth.jwt() ->> 'sub') = clerk_user_id)
  WITH CHECK ((auth.jwt() ->> 'sub') = clerk_user_id);
CREATE POLICY "vehicle_profiles owner delete" ON public.vehicle_profiles
  FOR DELETE TO authenticated USING ((auth.jwt() ->> 'sub') = clerk_user_id);

CREATE POLICY "fuel_budgets owner select" ON public.fuel_budgets
  FOR SELECT TO authenticated USING ((auth.jwt() ->> 'sub') = clerk_user_id);
CREATE POLICY "fuel_budgets owner insert" ON public.fuel_budgets
  FOR INSERT TO authenticated WITH CHECK ((auth.jwt() ->> 'sub') = clerk_user_id);
CREATE POLICY "fuel_budgets owner update" ON public.fuel_budgets
  FOR UPDATE TO authenticated
  USING ((auth.jwt() ->> 'sub') = clerk_user_id)
  WITH CHECK ((auth.jwt() ->> 'sub') = clerk_user_id);
CREATE POLICY "fuel_budgets owner delete" ON public.fuel_budgets
  FOR DELETE TO authenticated USING ((auth.jwt() ->> 'sub') = clerk_user_id);

CREATE POLICY "fuel_logs owner select" ON public.fuel_logs
  FOR SELECT TO authenticated USING ((auth.jwt() ->> 'sub') = clerk_user_id);
CREATE POLICY "fuel_logs owner insert" ON public.fuel_logs
  FOR INSERT TO authenticated WITH CHECK ((auth.jwt() ->> 'sub') = clerk_user_id);
CREATE POLICY "fuel_logs owner update" ON public.fuel_logs
  FOR UPDATE TO authenticated
  USING ((auth.jwt() ->> 'sub') = clerk_user_id)
  WITH CHECK ((auth.jwt() ->> 'sub') = clerk_user_id);
CREATE POLICY "fuel_logs owner delete" ON public.fuel_logs
  FOR DELETE TO authenticated USING ((auth.jwt() ->> 'sub') = clerk_user_id);
