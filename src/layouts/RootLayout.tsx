import { Outlet } from "react-router-dom";
import { Toaster } from "@/components/ui/sonner";
import { VehicleOnboardingGuard } from "@/components/vehicle-onboarding-guard";

export function RootLayout() {
  return (
    <>
      <VehicleOnboardingGuard />
      <Outlet />
      <Toaster position="top-center" richColors />
    </>
  );
}
