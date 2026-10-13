import { Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { SignIn } from "@clerk/clerk-react";
import { useIsClerkEnabled } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { touchFriendlyAppearance } from "@/lib/clerk-appearance";

export function SignInPage() {
  const isClerkEnabled = useIsClerkEnabled();

  if (!isClerkEnabled) {
    return (
      <main className="flex min-h-dvh flex-col items-center justify-center gap-4 bg-background px-safe py-10">
        <p className="text-caption text-ink-2">Authentifizierung ist derzeit nicht eingerichtet.</p>
        <Button asChild variant="outline">
          <Link to="/">Zurück zur Startseite</Link>
        </Button>
      </main>
    );
  }

  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-4 bg-background px-safe py-10">
      <Link
        to="/"
        className="text-caption inline-flex min-h-11 items-center gap-1 px-1 text-ink-2 hover:text-foreground"
      >
        <ArrowLeft className="size-4" /> Zurück zur Preissuche
      </Link>
      <SignIn
        routing="hash"
        signUpUrl="/sign-up"
        fallbackRedirectUrl="/"
        appearance={touchFriendlyAppearance}
      />
    </main>
  );
}
