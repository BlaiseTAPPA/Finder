/**
 * Client helper to invoke backend API endpoints.
 * Automatically attaches Supabase and Clerk tokens if user is authenticated.
 */
import { supabase } from "@/integrations/supabase/client";

interface ClerkWindow {
  Clerk?: { session?: { getToken: () => Promise<string | null> } };
}

async function getAuthHeaders(): Promise<Record<string, string>> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };

  try {
    const { data } = await supabase.auth.getSession();
    const token = data?.session?.access_token;
    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
    }
  } catch {
    // Supabase session access failed, ignore
  }

  if (typeof window !== "undefined") {
    try {
      const clerk = (window as unknown as ClerkWindow).Clerk;
      const clerkToken = await clerk?.session?.getToken();
      if (clerkToken) {
        headers["x-clerk-token"] = clerkToken;
      }
    } catch {
      // Clerk session access failed, ignore
    }
  }

  return headers;
}

export async function fetchApi<T>(
  url: string,
  body?: unknown,
  method: string = "POST",
): Promise<T> {
  const headers = await getAuthHeaders();
  const res = await fetch(url, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

  if (!res.ok) {
    let errorDetail = "";
    try {
      const errorJson = await res.json();
      errorDetail = errorJson.message || errorJson.error || JSON.stringify(errorJson);
    } catch {
      errorDetail = await res.text();
    }
    throw new Error(errorDetail || `Request failed with status ${res.status}`);
  }

  return res.json() as Promise<T>;
}

export function useServerFn<T extends (...args: unknown[]) => unknown>(fn: T): T {
  return fn;
}
