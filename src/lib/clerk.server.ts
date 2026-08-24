/** Server-only: Clerk-Token prüfen. */
import { verifyToken } from "@clerk/backend";

/** Gibt die Clerk-User-ID zurück oder null, wenn das Token ungültig/fehlt. */
export async function clerkUserIdFromToken(
  token: string | null | undefined,
): Promise<string | null> {
  const secretKey = process.env["CLERK_SECRET_KEY"];
  if (!token || !secretKey) return null;
  try {
    const claims = await verifyToken(token, { secretKey });
    return typeof claims.sub === "string" ? claims.sub : null;
  } catch {
    return null;
  }
}
