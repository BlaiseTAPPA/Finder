-- Owner-only access to synced favorites and saved trips.
-- The app server writes with the service role (bypasses RLS) after verifying the Clerk token.
-- These policies cover direct access with a Clerk session token (Supabase third-party auth),
-- where the JWT "sub" claim is the Clerk user id stored in clerk_user_id.

GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_favorites TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_trips TO authenticated;

CREATE POLICY "user_favorites owner select" ON public.user_favorites
  FOR SELECT TO authenticated USING ((auth.jwt() ->> 'sub') = clerk_user_id);
CREATE POLICY "user_favorites owner insert" ON public.user_favorites
  FOR INSERT TO authenticated WITH CHECK ((auth.jwt() ->> 'sub') = clerk_user_id);
CREATE POLICY "user_favorites owner update" ON public.user_favorites
  FOR UPDATE TO authenticated
  USING ((auth.jwt() ->> 'sub') = clerk_user_id)
  WITH CHECK ((auth.jwt() ->> 'sub') = clerk_user_id);
CREATE POLICY "user_favorites owner delete" ON public.user_favorites
  FOR DELETE TO authenticated USING ((auth.jwt() ->> 'sub') = clerk_user_id);

CREATE POLICY "user_trips owner select" ON public.user_trips
  FOR SELECT TO authenticated USING ((auth.jwt() ->> 'sub') = clerk_user_id);
CREATE POLICY "user_trips owner insert" ON public.user_trips
  FOR INSERT TO authenticated WITH CHECK ((auth.jwt() ->> 'sub') = clerk_user_id);
CREATE POLICY "user_trips owner update" ON public.user_trips
  FOR UPDATE TO authenticated
  USING ((auth.jwt() ->> 'sub') = clerk_user_id)
  WITH CHECK ((auth.jwt() ->> 'sub') = clerk_user_id);
CREATE POLICY "user_trips owner delete" ON public.user_trips
  FOR DELETE TO authenticated USING ((auth.jwt() ->> 'sub') = clerk_user_id);

-- Trip deletion filters on the trip's client-side id inside the JSON payload.
CREATE INDEX IF NOT EXISTS user_trips_trip_id_idx ON public.user_trips (clerk_user_id, (trip ->> 'id'));
