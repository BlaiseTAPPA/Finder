import { Outlet, useNavigate } from "react-router-dom";
import { useSafeAuth, useIsClerkEnabled } from "@/lib/auth";
import { useEffect } from "react";

export function ProtectedLayout() {
  const isClerkEnabled = useIsClerkEnabled();
  const { isLoaded, isSignedIn } = useSafeAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!isClerkEnabled) {
      navigate("/", { replace: true });
      return;
    }
    if (isLoaded && !isSignedIn) {
      navigate("/sign-in", { replace: true });
    }
  }, [isClerkEnabled, isLoaded, isSignedIn, navigate]);

  if (!isClerkEnabled) {
    return (
      <div className="flex min-h-screen items-center justify-center text-sm text-muted-foreground">
        Authentifizierung ist nicht aktiviert.
      </div>
    );
  }

  if (!isLoaded || !isSignedIn) {
    return (
      <div className="flex min-h-screen items-center justify-center text-sm text-muted-foreground">
        Konto wird geprüft …
      </div>
    );
  }

  return <Outlet />;
}
