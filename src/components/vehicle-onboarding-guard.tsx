/**
 * Führt angemeldete Nutzer ohne Fahrzeugprofil zuerst zu "Dein Fahrzeug" (Feature 0002).
 * Gäste und Nutzer, die "Später" gewählt haben, bleiben unberührt.
 */
import { useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { isVehicleOnboardingSkipped, useFuelBudget } from "@/lib/fuel-budget";

/** Seiten, auf denen nicht umgeleitet wird (/budget fragt selbst nach dem Fahrzeug). */
const EXEMPT = ["/fahrzeug", "/sign-in", "/sign-up", "/budget", "/impressum", "/datenschutz"];

export function VehicleOnboardingGuard() {
  const { data, isSuccess, enabled, userId } = useFuelBudget();
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    if (!enabled || !isSuccess || !userId || data.vehicle) return;
    if (EXEMPT.some((path) => location.pathname.startsWith(path))) return;
    if (isVehicleOnboardingSkipped(userId)) return;
    const next = `${location.pathname}${location.search}`;
    navigate(`/fahrzeug?next=${encodeURIComponent(next)}`, { replace: true });
  }, [enabled, isSuccess, userId, data, location.pathname, location.search, navigate]);

  return null;
}
