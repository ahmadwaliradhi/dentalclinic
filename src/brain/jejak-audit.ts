import { env } from "cloudflare:workers";
import { seesWholeJejakAudit } from "./access";
import type { Guard } from "./access";
import type { Answer, Decision, Reason } from "./ask";
import type { InjectionFlag } from "./injection";
import { mask } from "./mask";
import { sha256 } from "./sha256";
import type { Staff } from "./staff";

// The Jejak Audit is a hash chain: each row's hash covers its content and the previous row's hash,
// so editing any row breaks every hash after it.

/** The columns a row's hash covers, in order. */
const HASHED = [
  "staff_id",
  "role",
  "filter",
  "question",
  "retrieved",
  "cited",
  "answer",
  "decision",
  "reason",
  "flags",
  "asked_at",
  "answered_at",
] as const;

type Hashed = Record<(typeof HASHED)[number], string | null>;

/** The hash of the chain's last row; null before the first. */
const HEAD = "SELECT hash FROM jejak_audit ORDER BY id DESC LIMIT 1";

interface AskEntry {
  caller: Staff;
  /** The Source filter the search ran with. */
  filter: Guard;
  question: string;
  /** The Sources looked at, cited or not. */
  retrieved: { uri: string }[];
  answer: Omit<Answer, "auditId">;
  reason: Reason | null;
  askedAt: string;
}

/** Appends one Jejak Audit row and returns its id. */
export async function recordAsk({
  caller,
  filter,
  question,
  retrieved,
  answer,
  reason,
  askedAt,
}: AskEntry) {
  const row: Hashed = {
    staff_id: caller.id,
    role: caller.role,
    filter: JSON.stringify(filter),
    question: mask(question),
    retrieved: JSON.stringify(retrieved.map((chunk) => chunk.uri)),
    cited: JSON.stringify(answer.citations.map((citation) => citation.uri)),
    answer: withoutMedicalRecords(answer),
    decision: answer.decision,
    reason,
    flags: JSON.stringify(
      answer.flags.map((flag) => (isMedicalRecord(flag.uri) ? { ...flag, text: "" } : flag)),
    ),
    asked_at: askedAt,
    answered_at: new Date().toISOString(),
  };

  // The insert only lands on the chain's current head; a concurrent append makes it retry.
  for (let attempt = 0; attempt < 5; attempt++) {
    const prev = await env.DB.prepare(HEAD).first<string>("hash");
    const hash = await hashOf(prev, row);
    const id = await env.DB.prepare(
      `INSERT INTO jejak_audit (${HASHED.join(", ")}, prev_hash, hash)
       SELECT ${HASHED.map(() => "?").join(", ")}, ?, ?
       WHERE (${HEAD}) IS ?
       RETURNING id`,
    )
      .bind(...HASHED.map((column) => row[column]), prev, hash, prev)
      .first<number>("id");
    if (id !== null) return id;
  }
  throw new Error("Jejak Audit append kept losing the race for the chain head");
}

/** Whether every row since the chain started still matches its hash and links to the row before. */
export async function verifyChain(): Promise<boolean> {
  const { results } = await env.DB.prepare(
    `SELECT ${HASHED.join(", ")}, prev_hash, hash FROM jejak_audit
     WHERE id > (SELECT starts_after FROM jejak_audit_chain) ORDER BY id`,
  ).all<Hashed & { prev_hash: string | null; hash: string | null }>();

  let prev: string | null = null;
  for (const row of results) {
    if (row.prev_hash !== prev || row.hash !== (await hashOf(prev, row))) return false;
    prev = row.hash;
  }
  return true;
}

export interface AuditRow {
  id: number;
  askedAt: string;
  staff: string;
  question: string;
  decision: Decision;
  /** The URIs of the Sources cited. */
  cited: string[];
  /** Why a Refusal was given; null unless the caller may see the whole Jejak Audit. */
  reason: Reason | null;
  /** Empty unless the caller may see the whole Jejak Audit. */
  flags: InjectionFlag[];
}

/** The Jejak Audit as the caller may see it, newest first: every row for the Pemilik, otherwise their own. */
export async function auditFor(caller: Staff): Promise<AuditRow[]> {
  const whole = seesWholeJejakAudit(caller);
  // Reasons and flags are never read for a caller who may not see them.
  const { results } = await env.DB.prepare(
    `SELECT jejak_audit.id, jejak_audit.asked_at AS askedAt, staff.name AS staff,
       jejak_audit.question, jejak_audit.decision, jejak_audit.cited,
       ${whole ? "jejak_audit.reason, jejak_audit.flags" : "NULL AS reason, '[]' AS flags"}
     FROM jejak_audit JOIN staff ON staff.id = jejak_audit.staff_id
     WHERE ? OR jejak_audit.staff_id = ?
     ORDER BY jejak_audit.id DESC`,
  )
    .bind(whole ? 1 : 0, caller.id)
    .all<Omit<AuditRow, "cited" | "flags"> & { cited: string; flags: string }>();
  return results.map((row) => ({
    ...row,
    cited: JSON.parse(row.cited),
    flags: JSON.parse(row.flags),
  }));
}

function hashOf(prev: string | null, row: Hashed): Promise<string> {
  return sha256(JSON.stringify([prev, ...HASHED.map((column) => row[column])]));
}

/** The answer with all medical record text left out: cited notes and flagged sentences alike. */
function withoutMedicalRecords(answer: AskEntry["answer"]): string {
  return [...answer.citations, ...answer.flags]
    .filter((part) => isMedicalRecord(part.uri))
    .reduce((text, part) => text.replaceAll(part.text, ""), answer.text);
}

function isMedicalRecord(uri: string): boolean {
  return uri.startsWith("emr://");
}
