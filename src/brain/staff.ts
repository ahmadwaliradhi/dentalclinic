import { env } from "cloudflare:workers";

export type Role = "Pemilik" | "Dokter Gigi Mitra" | "TGM" | "Front Office";

export interface Staff {
  id: string;
  name: string;
  role: Role;
}

/** The staff member a bearer token belongs to, or null. */
export async function staffForToken(token: string): Promise<Staff | null> {
  return env.DB.prepare(
    "SELECT staff.id, staff.name, staff.role FROM tokens JOIN staff ON staff.id = tokens.staff_id WHERE tokens.hash = ?",
  )
    .bind(await sha256(token))
    .first<Staff>();
}

async function sha256(text: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
}
