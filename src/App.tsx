import { useState, useEffect } from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AppAuthProvider } from "@/lib/auth";
import { getClerkPublishableKey } from "@/lib/account.functions";
import { RootLayout } from "@/layouts/RootLayout";
import { ProtectedLayout } from "@/layouts/ProtectedLayout";
import { HomePage } from "@/pages/HomePage";
import { AlertsPage } from "@/pages/AlertsPage";
import { SignInPage } from "@/pages/SignInPage";
import { SignUpPage } from "@/pages/SignUpPage";
import { NotFoundPage } from "@/pages/NotFoundPage";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60 * 1000,
      refetchOnWindowFocus: false,
    },
  },
});

export function App() {
  const [clerkKey, setClerkKey] = useState<string | null | undefined>(
    typeof import.meta !== "undefined" && import.meta.env?.["VITE_CLERK_PUBLISHABLE_KEY"]
      ? (import.meta.env["VITE_CLERK_PUBLISHABLE_KEY"] as string)
      : undefined,
  );

  useEffect(() => {
    if (clerkKey === undefined) {
      getClerkPublishableKey()
        .then((key) => setClerkKey(key))
        .catch(() => setClerkKey(null));
    }
  }, [clerkKey]);

  return (
    <AppAuthProvider publishableKey={clerkKey}>
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <Routes>
            <Route element={<RootLayout />}>
              <Route path="/" element={<HomePage />} />
              <Route path="/sign-in" element={<SignInPage />} />
              <Route path="/sign-up" element={<SignUpPage />} />
              <Route element={<ProtectedLayout />}>
                <Route path="/alerts" element={<AlertsPage />} />
              </Route>
              <Route path="*" element={<NotFoundPage />} />
            </Route>
          </Routes>
        </BrowserRouter>
      </QueryClientProvider>
    </AppAuthProvider>
  );
}

export default App;
