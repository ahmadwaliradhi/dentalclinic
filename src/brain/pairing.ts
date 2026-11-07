import { env } from "cloudflare:workers";
import { sha256 } from "./staff";
import type { Staff } from "./staff";

// Identity Pairing: WorkBuddy asks for a code, the signed-in staff member confirms it on the site,
// and WorkBuddy's next poll receives a token bound to them. See GLOSSARY.md.

/** Seconds a pairing code stays valid: ten minutes. */
export const CODE_SECONDS = 10 * 60;

/** Seconds a paired token stays valid: 90 days. */
export const TOKEN_SECONDS = 90 * 24 * 60 * 60;

/** What a paired token may do: read, and prepare Proposals for a human to approve. */
const SCOPE = "read propose";

/** 32 letters and digits, without the look-alikes 0, O, 1 and I. 256 bytes map onto it evenly. */
const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

export interface Pairing {
  /** What the staff member confirms on the site. */
  code: string;
  /** What WorkBuddy polls with. Never shown to the staff member. */
  secret: string;
}

export async function requestPairing(): Promise<Pairing> {
  const now = new Date();
  const code = Array.from(
    crypto.getRandomValues(new Uint8Array(8)),
    (n) => ALPHABET[n % ALPHABET.length],
  ).join("");
  const secret = crypto.randomUUID();
  await env.DB.batch([
    env.DB.prepare("DELETE FROM pairings WHERE expires_at <= ?").bind(now.toISOString()),
    env.DB.prepare("DELETE FROM tokens WHERE expires_at <= ?").bind(now.toISOString()),
    env.DB.prepare("INSERT INTO pairings (secret_hash, code, expires_at) VALUES (?, ?, ?)").bind(
      await sha256(secret),
      code,
      later(now, CODE_SECONDS),
    ),
  ]);
  return { code, secret };
}

/**
 * Binds an open pairing to the staff member, giving WorkBuddy another ten minutes to collect the
 * token. False when the code is unknown, used or expired.
 */
export async function confirmPairing(code: string, staff: Staff): Promise<boolean> {
  const now = new Date();
  const { meta } = await env.DB.prepare(
    "UPDATE pairings SET staff_id = ?, expires_at = ? WHERE code = ? AND staff_id IS NULL AND expires_at > ?",
  )
    .bind(
      staff.id,
      later(now, CODE_SECONDS),
      code.toUpperCase().replace(/[^A-Z0-9]/g, ""),
      now.toISOString(),
    )
    .run();
  return meta.changes > 0;
}

/**
 * Hands out the token once the code is confirmed, closing the pairing. "pending" until then;
 * null for an unknown, closed or expired pairing.
 */
export async function claimToken(secret: string): Promise<{ token: string } | "pending" | null> {
  const now = new Date();
  const hash = await sha256(secret);
  const staffId = await env.DB.prepare(
    "DELETE FROM pairings WHERE secret_hash = ? AND staff_id IS NOT NULL AND expires_at > ? RETURNING staff_id",
  )
    .bind(hash, now.toISOString())
    .first<string>("staff_id");
  if (!staffId) {
    const open = await env.DB.prepare(
      "SELECT 1 FROM pairings WHERE secret_hash = ? AND expires_at > ?",
    )
      .bind(hash, now.toISOString())
      .first();
    return open ? "pending" : null;
  }

  const token = crypto.randomUUID();
  await env.DB.prepare(
    "INSERT INTO tokens (hash, staff_id, scope, paired_at, expires_at) VALUES (?, ?, ?, ?, ?)",
  )
    .bind(await sha256(token), staffId, SCOPE, now.toISOString(), later(now, TOKEN_SECONDS))
    .run();
  return { token };
}

/** The staff member a live bearer token belongs to, or null. */
export async function staffForToken(token: string): Promise<Staff | null> {
  return env.DB.prepare(
    "SELECT staff.id, staff.name, staff.role FROM tokens JOIN staff ON staff.id = tokens.staff_id WHERE tokens.hash = ? AND tokens.expires_at > ?",
  )
    .bind(await sha256(token), new Date().toISOString())
    .first<Staff>();
}

/** A WorkBuddy paired with a staff member: Perangkat terhubung. */
export interface Device {
  id: number;
  pairedAt: string;
  expiresAt: string;
}

export async function devicesOf(staff: Staff): Promise<Device[]> {
  const { results } = await env.DB.prepare(
    "SELECT id, paired_at AS pairedAt, expires_at AS expiresAt FROM tokens WHERE staff_id = ? AND expires_at > ? ORDER BY paired_at DESC",
  )
    .bind(staff.id, new Date().toISOString())
    .all<Device>();
  return results;
}

/** Revokes one of the staff member's own tokens. */
export async function unpair(staff: Staff, deviceId: number): Promise<void> {
  await env.DB.prepare("DELETE FROM tokens WHERE id = ? AND staff_id = ?")
    .bind(deviceId, staff.id)
    .run();
}

function later(from: Date, seconds: number): string {
  return new Date(from.getTime() + seconds * 1000).toISOString();
}
