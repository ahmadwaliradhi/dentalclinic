import { env } from "cloudflare:workers";
import seed from "../../db/seed.sql?raw";
import { expireProposals } from "./proposals";

/**
 * The nightly job: Proposals that ran out are declined and logged, then the demo returns to its
 * seed. The Jejak Audit is append-only, so it is kept.
 */
export async function nightly(now = new Date()): Promise<void> {
  await expireProposals(now);
  // Proposals are the only seeded rows the app changes; the seed puts back anything removed.
  // The seeded Proposal 1 can only ever expire, so it is kept and its expiry is logged once.
  await env.DB.batch([
    env.DB.prepare("DELETE FROM proposals WHERE id > 1"),
    ...statements(seed).map((sql) => env.DB.prepare(sql)),
  ]);
}

/** The statements of an SQL file whose statements each end a line with a semicolon. */
function statements(sql: string): string[] {
  return sql.split(/;\s*$/m).filter((statement) => statement.replace(/^\s*--.*$/gm, "").trim());
}
