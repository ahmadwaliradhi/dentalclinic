import { env } from "cloudflare:workers";
import { proposalsDecidedBy } from "./access";
import type { Guard } from "./access";
import { recordAction } from "./jejak-audit";
import { mask } from "./mask";
import type { Staff } from "./staff";

// Proposals, as defined in GLOSSARY.md: the Klinik Brain prepares an action, and only a human with
// the right Role accepts or declines it in the web app within 24 hours.

const DAY = 86_400_000;

/** What a Proposal is about: one patient for a Recall Message, one stock card item for a Stok Opname Request. */
export type Target =
  | { kind: "recall_message"; noRm: string }
  | { kind: "stok_opname"; item: string };

export type Kind = Target["kind"];

/**
 * Proposes `text` about `target` and records it in the Jejak Audit, unless an undecided Proposal
 * about the same target exists. Returns the new Proposal's id and expiry, or null.
 */
export async function propose(
  caller: Staff,
  target: Target,
  { text, cited, filter }: { text: string; cited: string[]; filter: Guard },
  now: Date,
): Promise<{ id: number; expiresAt: string } | null> {
  const at = now.toISOString();
  const expiresAt = new Date(now.getTime() + DAY).toISOString();
  const noRm = target.kind === "recall_message" ? target.noRm : null;
  const item = target.kind === "stok_opname" ? target.item : null;
  // Lands only while the target has no undecided Proposal, so a repeat request adds none.
  const id = await env.DB.prepare(
    `INSERT INTO proposals (kind, patient_no, item, text, proposed_by, proposed_at, expires_at)
     SELECT ?, ?, ?, ?, ?, ?, ?
     WHERE NOT EXISTS (SELECT 1 FROM proposals
                       WHERE kind = ? AND patient_no IS ? AND item IS ?
                         AND decision IS NULL AND expires_at > ?)
     RETURNING id`,
  )
    .bind(target.kind, noRm, item, text, caller.id, at, expiresAt, target.kind, noRm, item, at)
    .first<number>("id");
  if (id === null) return null;

  await recordAction({
    caller,
    subject: subject({ kind: target.kind, noRm, item }),
    filter,
    cited,
    text,
    decision: "proposed",
    at,
  });
  return { id, expiresAt };
}

/** Where a Proposal stands; expired is declined with no one deciding. */
export type Status = "pending" | "accepted" | "declined" | "expired";

export interface Proposal {
  id: number;
  kind: Kind;
  noRm: string | null;
  /** The patient's name, or the stock card item. */
  name: string;
  /** The patient's number, masked; the full number is only in `whatsapp`. */
  phone: string | null;
  text: string;
  proposedAt: string;
  status: Status;
  /** The wa.me link a human taps to send a Recall Message; only once accepted. */
  whatsapp: string | null;
}

/** The Proposals the caller may decide, newest first, with any that ran out declined first. */
export async function inbox(caller: Staff, now = new Date()): Promise<Proposal[]> {
  await expireProposals(now);
  const decides = proposalsDecidedBy(caller);
  const { results } = await env.DB.prepare(
    `SELECT proposals.id, proposals.kind, proposals.patient_no AS noRm,
       coalesce(patients.name, proposals.item) AS name, patients.phone, proposals.text,
       proposals.proposed_at AS proposedAt, proposals.decision, proposals.decided_by AS decidedBy
     FROM proposals LEFT JOIN patients ON patients.no_rm = proposals.patient_no
     WHERE ${decides.sql}
     ORDER BY proposals.decision IS NOT NULL, proposals.id DESC`,
  )
    .bind(...decides.params)
    .all<
      Omit<Proposal, "status" | "whatsapp"> & { decision: string | null; decidedBy: string | null }
    >();

  return results.map(({ decision, decidedBy, phone, ...proposal }) => {
    const status: Status = !decision ? "pending" : decidedBy ? (decision as Status) : "expired";
    return {
      ...proposal,
      phone: phone && mask(phone),
      status,
      whatsapp: phone && status === "accepted" ? waLink(phone, proposal.text) : null,
    };
  });
}

/**
 * Records the caller's Approval Decision on an undecided Proposal they may decide, in the Jejak
 * Audit too, and returns the Proposal as it now stands; null when they may not decide it. Nothing
 * else changes: accepting sends no message and changes no stock.
 */
export async function decide(
  caller: Staff,
  id: number,
  decision: "accepted" | "declined",
  now = new Date(),
): Promise<Proposal | null> {
  await expireProposals(now);
  const decides = proposalsDecidedBy(caller);
  const at = now.toISOString();
  const decided = await env.DB.prepare(
    `UPDATE proposals SET decision = ?, decided_by = ?, decided_at = ?
     WHERE id = ? AND decision IS NULL AND expires_at > ? AND ${decides.sql}
     RETURNING kind, patient_no AS noRm, item, text`,
  )
    .bind(decision, caller.id, at, id, at, ...decides.params)
    .first<Row>();
  if (!decided) return null;

  await recordAction({
    caller,
    subject: subject(decided),
    filter: null,
    cited: [],
    text: decided.text,
    decision,
    at,
  });
  return (await inbox(caller, now)).find((proposal) => proposal.id === id) ?? null;
}

/** Declines every Proposal undecided after 24 hours, as the Jejak Audit records on its proposer's behalf. */
export async function expireProposals(now = new Date()): Promise<void> {
  const { results } = await env.DB.prepare(
    `UPDATE proposals SET decision = 'declined', decided_at = expires_at
     WHERE decision IS NULL AND expires_at <= ?
     RETURNING kind, patient_no AS noRm, item, text,
       (SELECT json_object('id', id, 'name', name, 'role', role) FROM staff
        WHERE staff.id = proposals.proposed_by) AS proposer`,
  )
    .bind(now.toISOString())
    .all<Row & { proposer: string }>();

  for (const { proposer, ...proposal } of results) {
    await recordAction({
      caller: JSON.parse(proposer),
      subject: subject(proposal),
      filter: null,
      cited: [],
      text: proposal.text,
      decision: "declined",
      reason: "expired",
      at: now.toISOString(),
    });
  }
}

interface Row {
  kind: Kind;
  noRm: string | null;
  item: string | null;
  text: string;
}

/** How the Jejak Audit names a Proposal, such as "Recall Message P-0004". */
function subject({ kind, noRm, item }: Omit<Row, "text">): string {
  return kind === "recall_message" ? `Recall Message ${noRm}` : `Stok Opname Request ${item}`;
}

/** A wa.me link that opens WhatsApp with the text ready to send, from an Indonesian number. */
function waLink(phone: string, text: string): string {
  const number = phone.replace(/\D/g, "").replace(/^0/, "62");
  return `https://wa.me/${number}?text=${encodeURIComponent(text)}`;
}
