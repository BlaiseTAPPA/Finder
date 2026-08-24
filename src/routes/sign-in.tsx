import { createFileRoute } from "@tanstack/react-router";
import { SignIn } from "@clerk/clerk-react";

export const Route = createFileRoute("/sign-in")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Anmelden – Tankstellen-Finder" },
      {
        name: "description",
        content:
          "Melde dich an, um Favoriten, Trajets und Preisalarme geräteübergreifend zu speichern.",
      },
      { property: "og:title", content: "Anmelden – Tankstellen-Finder" },
      {
        property: "og:description",
        content: "Favoriten und Preisalarme im eigenen Konto speichern.",
      },
    ],
  }),
  component: SignInPage,
});

function SignInPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-4 py-10">
      <SignIn routing="hash" signUpUrl="/sign-up" fallbackRedirectUrl="/" />
    </main>
  );
}
