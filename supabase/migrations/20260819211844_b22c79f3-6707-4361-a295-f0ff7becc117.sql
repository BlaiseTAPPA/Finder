REVOKE ALL ON FUNCTION public.compact_price_history() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.compact_price_history() TO service_role;