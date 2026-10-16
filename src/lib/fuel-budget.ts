/**
 * Client-Zugriff auf das Tankbudget (Feature 0002): eine Abfrage für Fahrzeug, Budget und
 * Tankvorgänge der letzten Monate – nur für angemeldete Nutzer.
 */
import { useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useSafeAuth } from "./auth";
import { getFuelBudget } from "./account.functions";
import { recentPeriods } from "./budget";

export const FUEL_BUDGET_QUERY_KEY = ["fuel-budget"] as const;

/** Historie für Seite und Vorperioden: 6 Monate (deckt auch 8 Wochen ab). */
const HISTORY_MONTHS = 6;

export function useFuelBudget() {
  const { isLoaded, isSignedIn, userId } = useSafeAuth();
  const since = useMemo(
    () =>
      new Date(recentPeriods("monthly", Date.now(), HISTORY_MONTHS).at(-1)!.start).toISOString(),
    [],
  );
  const enabled = isLoaded && isSignedIn && userId !== null;
  const query = useQuery({
    queryKey: [...FUEL_BUDGET_QUERY_KEY, userId, since],
    enabled,
    staleTime: 60 * 1000,
    queryFn: () => getFuelBudget({ data: { since } }),
  });
  return { ...query, enabled, userId };
}

export function useRefreshFuelBudget() {
  const queryClient = useQueryClient();
  return () => queryClient.invalidateQueries({ queryKey: FUEL_BUDGET_QUERY_KEY });
}

// ----- "Später" beim Fahrzeug-Onboarding (pro Konto, nur auf diesem Gerät) -----

const skipKey = (userId: string) => `tankstellen:vehicle-onboarding-skipped:${userId}`;

export function isVehicleOnboardingSkipped(userId: string): boolean {
  try {
    return localStorage.getItem(skipKey(userId)) === "1";
  } catch {
    return false;
  }
}

export function skipVehicleOnboarding(userId: string): void {
  try {
    localStorage.setItem(skipKey(userId), "1");
  } catch {
    /* Speicher blockiert – dann wird beim nächsten Start erneut gefragt */
  }
}
