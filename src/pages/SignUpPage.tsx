import { Link } from "react-router-dom";
import { SignUp } from "@clerk/clerk-react";
import { useIsClerkEnabled } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { touchFriendlyAppearance } from "@/lib/clerk-appearance";

export function SignUpPage() {
  const isClerkEnabled = useIsClerkEnabled();

  if (!isClerkEnabled) {
    return (
      <main className="flex min-h-dvh flex-col items-center justify-center gap-4 bg-background px-4 py-10">
        <p className="text-muted-foreground">Authentifizierung ist derzeit nicht eingerichtet.</p>
        <Button asChild variant="outline">
          <Link to="/">Zurück zur Startseite</Link>
        </Button>
      </main>
    );
  }

  return (
    <main className="flex min-h-dvh items-center justify-center bg-background px-4 py-10">
      <SignUp
        routing="hash"
        signInUrl="/sign-in"
        fallbackRedirectUrl="/"
        appearance={touchFriendlyAppearance}
      />
    </main>
  );
}
