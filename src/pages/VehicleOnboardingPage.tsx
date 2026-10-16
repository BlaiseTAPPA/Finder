/** "Dein Fahrzeug": erste Frage nach der Anmeldung (Feature 0002). */
import { useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Car } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { VehicleForm } from "@/components/vehicle-form";
import { skipVehicleOnboarding, useFuelBudget, useRefreshFuelBudget } from "@/lib/fuel-budget";

/** Nur interne Pfade als Rücksprungziel zulassen (kein "//evil.example"). */
function safeNext(value: string | null): string {
  if (!value || !value.startsWith("/") || value.startsWith("//")) return "/";
  return value;
}

export function VehicleOnboardingPage() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const next = safeNext(params.get("next"));
  const { data, isPending, userId } = useFuelBudget();
  const refresh = useRefreshFuelBudget();

  // Schon angelegt (z. B. auf einem anderen Gerät): direkt weiter.
  useEffect(() => {
    if (data?.vehicle) navigate(next, { replace: true });
  }, [data?.vehicle, navigate, next]);

  return (
    <main className="mx-auto max-w-md px-safe pt-10 pb-[calc(2rem+env(safe-area-inset-bottom))]">
      <Car aria-hidden className="size-8 text-ink-3" />
      <h1 className="text-title mt-4 text-foreground">Dein Fahrzeug</h1>
      <p className="text-caption mt-1 text-ink-2">
        Damit wir dein Tankbudget und Tankmengen für dich berechnen können. Du kannst das jederzeit
        auf der Budgetseite ändern.
      </p>

      <div className="mt-6 rounded-md border bg-surface p-4 sm:p-5">
        {isPending ? (
          <div className="grid gap-4">
            <Skeleton className="h-11" />
            <Skeleton className="h-11" />
            <Skeleton className="h-11" />
          </div>
        ) : (
          <VehicleForm
            initial={null}
            submitLabel="Speichern und weiter"
            onSaved={() => {
              void refresh();
              navigate(next, { replace: true });
            }}
            secondary={
              <Button
                type="button"
                variant="ghost"
                onClick={() => {
                  if (userId) skipVehicleOnboarding(userId);
                  navigate(next, { replace: true });
                }}
              >
                Später
              </Button>
            }
          />
        )}
      </div>
    </main>
  );
}
