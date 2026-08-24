import { createFileRoute } from "@tanstack/react-router";
import { SignUp } from "@clerk/clerk-react";

export const Route = createFileRoute("/sign-up")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Konto erstellen – Tankstellen-Finder" },
      {
        name: "description",
        content:
          "Erstelle ein Konto, um Favoriten, Trajets und Preisalarme dauerhaft zu sichern.",
      },
      { property: "og:title", content: "Konto erstellen – Tankstellen-Finder" },
      {
        property: "og:description",
        content: "Preisalarme und Favoriten dauerhaft sichern.",
      },
    ],
  }),
  component: SignUpPage,
});

function SignUpPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-4 py-10">
      <SignUp routing="hash" signInUrl="/sign-in" fallbackRedirectUrl="/" />
    </main>
  );
}
