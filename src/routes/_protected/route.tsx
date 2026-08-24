import { createFileRoute, Outlet, useNavigate } from "@tanstack/react-router";
import { useAuth } from "@clerk/clerk-react";
import { useEffect } from "react";

export const Route = createFileRoute("/_protected")({
  ssr: false,
  component: ProtectedLayout,
});

function ProtectedLayout() {
  const { isLoaded, isSignedIn } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (isLoaded && !isSignedIn) void navigate({ to: "/sign-in", replace: true });
  }, [isLoaded, isSignedIn, navigate]);

  if (!isLoaded || !isSignedIn) {
    return (
      <div className="flex min-h-screen items-center justify-center text-sm text-muted-foreground">
        Konto wird geprüft …
      </div>
    );
  }

  return <Outlet />;
}
