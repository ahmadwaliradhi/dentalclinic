import { env } from "cloudflare:workers";
import { sha256 } from "./sha256";

export type Role = "Pemilik" | "Dokter Gigi Mitra" | "Perawat Gigi" | "Front Office";

export interface Staff {
  id: string;
  name: string;
  role: Role;
}

/** Seconds a web session lasts: seven days. */
export const SESSION_SECONDS = 7 * 24 * 60 * 60;

/** The staff members Demo Login signs in as. */
const DEMO_LOGIN = ["rina", "andi", "tari", "nina"];

/** Opens a Demo Login session and returns its secret, or null for anyone else. */
export async function openSession(staffId: string): Promise<string | null> {
  if (!DEMO_LOGIN.includes(staffId)) return null;
  const secret = crypto.randomUUID();
  const expires = new Date(Date.now() + SESSION_SECONDS * 1000).toISOString();
  const { meta } = await env.DB.prepare(
    "INSERT INTO sessions (hash, staff_id, expires_at) SELECT ?, id, ? FROM staff WHERE id = ?",
  )
    .bind(await sha256(secret), expires, staffId)
    .run();
  return meta.changes ? secret : null;
}

/** The staff member a live web session belongs to, or null. */
export async function staffForSession(secret: string): Promise<Staff | null> {
  return env.DB.prepare(
    "SELECT staff.id, staff.name, staff.role FROM sessions JOIN staff ON staff.id = sessions.staff_id WHERE sessions.hash = ? AND sessions.expires_at > ?",
  )
    .bind(await sha256(secret), new Date().toISOString())
    .first<Staff>();
}

export async function closeSession(secret: string): Promise<void> {
  await env.DB.prepare("DELETE FROM sessions WHERE hash = ?")
    .bind(await sha256(secret))
    .run();
}

/** The Pemilik, the one Role that may see all Restricted data, named in every Refusal. */
export async function pemilik(): Promise<Staff> {
  const staff = await env.DB.prepare(
    "SELECT id, name, role FROM staff WHERE role = 'Pemilik'",
  ).first<Staff>();
  if (!staff) throw new Error("The clinic has no Pemilik");
  return staff;
}
