/**
 * Middleware für Server-Funktionen, die einen angemeldeten Clerk-Nutzer verlangen.
 * Client-Phase hängt das Clerk-Token als eigenen Header an (kollidiert nicht mit
 * dem Supabase-Bearer der globalen Middleware).
 */
import { createMiddleware } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";

export const CLERK_TOKEN_HEADER = "x-clerk-token";

interface ClerkWindow {
  Clerk?: { session?: { getToken: () => Promise<string | null> } };
}

async function browserToken(): Promise<string | null> {
  if (typeof window === "undefined") return null;
  try {
    const clerk = (window as unknown as ClerkWindow).Clerk;
    return (await clerk?.session?.getToken()) ?? null;
  } catch {
    return null;
  }
}

export const requireClerkAuth = createMiddleware({ type: "function" })
  .client(async ({ next }) => {
    const token = await browserToken();
    return next(token ? { headers: { [CLERK_TOKEN_HEADER]: token } } : {});
  })
  .server(async ({ next }) => {
    const { clerkUserIdFromToken } = await import("./clerk.server");
    const request = getRequest();
    const token = request?.headers?.get(CLERK_TOKEN_HEADER) ?? null;
    const userId = await clerkUserIdFromToken(token);
    if (!userId) throw new Error("Unauthorized");
    return next({ context: { clerkUserId: userId } });
  });
