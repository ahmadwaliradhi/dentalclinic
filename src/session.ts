import { getCookie } from "@tanstack/react-start/server";
import { SESSION_SECONDS, staffForSession } from "./brain/staff";
import type { Staff } from "./brain/staff";

// The web session cookie. Server-only: import it from server handlers and middleware alone.

const COOKIE = "sesi";

/** The Set-Cookie value that stores a session secret, or clears it when null. */
export function sessionCookie(secret: string | null): string {
  const maxAge = secret ? SESSION_SECONDS : 0;
  return `${COOKIE}=${secret ?? ""}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${maxAge}`;
}

/** The secret of the request's session cookie, if any. */
export function sessionSecret(): string | undefined {
  return getCookie(COOKIE);
}

/** The staff member signed in on this request, or null. */
export async function signedIn(): Promise<Staff | null> {
  const secret = sessionSecret();
  return secret ? staffForSession(secret) : null;
}
