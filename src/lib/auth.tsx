import { createContext, useContext, useMemo, type ReactNode } from "react";
import {
  ClerkProvider,
  useAuth as useClerkAuth,
  useUser as useClerkUser,
} from "@clerk/clerk-react";

export interface SafeAuthState {
  isLoaded: boolean;
  isSignedIn: boolean;
  userId: string | null;
  sessionId: string | null;
  actor: unknown;
  orgId: string | null;
  orgRole: string | null;
  orgSlug: string | null;
  has: (params?: unknown) => boolean;
  signOut: (options?: unknown) => Promise<void>;
  getToken: (options?: unknown) => Promise<string | null>;
}

export interface SafeUserState {
  isLoaded: boolean;
  isSignedIn: boolean;
  user: ReturnType<typeof useClerkUser>["user"] | null;
}

interface AuthContextValue {
  isClerkEnabled: boolean;
  auth: SafeAuthState;
  user: SafeUserState;
}

const FALLBACK_AUTH: SafeAuthState = {
  isLoaded: true,
  isSignedIn: false,
  userId: null,
  sessionId: null,
  actor: null,
  orgId: null,
  orgRole: null,
  orgSlug: null,
  has: () => false,
  signOut: async () => {},
  getToken: async () => null,
};

const FALLBACK_USER: SafeUserState = {
  isLoaded: true,
  isSignedIn: false,
  user: null,
};

const AuthContext = createContext<AuthContextValue>({
  isClerkEnabled: false,
  auth: FALLBACK_AUTH,
  user: FALLBACK_USER,
});

function ClerkBridge({ children }: { children: ReactNode }) {
  const clerkAuth = useClerkAuth();
  const clerkUser = useClerkUser();

  const value = useMemo<AuthContextValue>(
    () => ({
      isClerkEnabled: true,
      auth: {
        isLoaded: clerkAuth.isLoaded,
        isSignedIn: clerkAuth.isSignedIn ?? false,
        userId: clerkAuth.userId ?? null,
        sessionId: clerkAuth.sessionId ?? null,
        actor: clerkAuth.actor ?? null,
        orgId: clerkAuth.orgId ?? null,
        orgRole: clerkAuth.orgRole ?? null,
        orgSlug: clerkAuth.orgSlug ?? null,
        has: clerkAuth.has
          ? (params) => clerkAuth.has(params as Parameters<typeof clerkAuth.has>[0])
          : () => false,
        signOut: () => clerkAuth.signOut(),
        getToken: (options) =>
          clerkAuth.getToken(options as Parameters<typeof clerkAuth.getToken>[0]),
      },
      user: {
        isLoaded: clerkUser.isLoaded,
        isSignedIn: clerkUser.isSignedIn ?? false,
        user: clerkUser.user ?? null,
      },
    }),
    [clerkAuth, clerkUser],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function AppAuthProvider({
  publishableKey,
  children,
}: {
  publishableKey: string | null | undefined;
  children: ReactNode;
}) {
  if (publishableKey) {
    return (
      <ClerkProvider publishableKey={publishableKey} afterSignOutUrl="/">
        <ClerkBridge>{children}</ClerkBridge>
      </ClerkProvider>
    );
  }

  return (
    <AuthContext.Provider
      value={{
        isClerkEnabled: false,
        auth: FALLBACK_AUTH,
        user: FALLBACK_USER,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useIsClerkEnabled(): boolean {
  return useContext(AuthContext).isClerkEnabled;
}

export function useSafeAuth(): SafeAuthState {
  return useContext(AuthContext).auth;
}

export function useSafeUser(): SafeUserState {
  return useContext(AuthContext).user;
}
