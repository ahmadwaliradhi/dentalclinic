import { env } from "cloudflare:workers";
import { patientsVisibleTo, proposalsDecidedBy, visitsVisibleTo } from "./access";
import { recordAction } from "./jejak-audit";
import { mask } from "./mask";
import { day } from "./reply";
import type { Staff } from "./staff";

// Recall, as defined in GLOSSARY.md: the Klinik Brain finds patients Due for Recall and proposes a
// Recall Message for each; only a human in the web app decides, and only a human sends it.

const DAY = 86_400_000;

export interface DueForRecall {
  noRm: string;
  name: string;
  dentist: string;
  reason: string;
  /** The visit record the reason comes from. */
  source: string;
  /** Without WA Opt-in a patient gets no Recall Message. */
  waOptIn: boolean;
}

/**
 * Patients Due for Recall that the caller may list and whose latest visit record they may see, so a
 * Dokter Gigi Mitra gets only their own patients. A patient with a visit booked is not due.
 */
export async function listDueForRecall(caller: Staff, now = new Date()): Promise<DueForRecall[]> {
  const visible = visitsVisibleTo(caller);
  const listed = patientsVisibleTo(caller);
  const { results } = await env.DB.prepare(
    `SELECT patients.no_rm AS noRm, patients.name, staff.name AS dentist,
       patients.wa_opt_in_at IS NOT NULL AS waOptIn, visits.n, visits.visited_at AS visitedAt,
       visits.rencana_tindak_lanjut_on AS followUpOn,
       (SELECT json_object('treatment', treatment, 'done', completed_visits, 'total', total_visits)
        FROM rencana_perawatan
        WHERE patient_no = visits.patient_no AND completed_visits < total_visits
        ORDER BY treatment LIMIT 1) AS plan
     FROM visits
     JOIN patients ON patients.no_rm = visits.patient_no
     JOIN staff ON staff.id = patients.dentist_id
     WHERE visits.n = (SELECT max(n) FROM visits AS v WHERE v.patient_no = visits.patient_no)
       AND NOT EXISTS (SELECT 1 FROM appointments
                       WHERE appointments.patient_no = visits.patient_no AND starts_at >= ?)
       AND (${visible.sql}) AND (${listed.sql})
     ORDER BY patients.no_rm`,
  )
    .bind(now.toISOString(), ...visible.params, ...listed.params)
    .all<{
      noRm: string;
      name: string;
      dentist: string;
      waOptIn: number;
      n: number;
      visitedAt: string;
      followUpOn: string | null;
      plan: string | null;
    }>();

  const today = now.toLocaleDateString("en-CA", { timeZone: "Asia/Jakarta" });
  return results.flatMap(({ noRm, name, dentist, waOptIn, n, visitedAt, followUpOn, plan }) => {
    const unfinished: { treatment: string; done: number; total: number } | null =
      plan && JSON.parse(plan);
    let reason: string;
    if (unfinished && Date.parse(visitedAt) < now.getTime() - 14 * DAY) {
      reason = `${unfinished.treatment} baru ${unfinished.done} dari ${unfinished.total} kunjungan, terakhir ${day(visitedAt)}`;
    } else if (followUpOn && followUpOn < today) {
      reason = `Rencana Tindak Lanjut ${day(followUpOn)} sudah lewat`;
    } else {
      return [];
    }
    const source = `emr://patient/${noRm}/visit/${n}`;
    return [{ noRm, name, dentist, reason, source, waOptIn: Boolean(waOptIn) }];
  });
}

/** Due for Recall as an answer the Expert shows verbatim, recorded in the Jejak Audit. */
export async function dueForRecall(caller: Staff, now = new Date()) {
  const patients = await listDueForRecall(caller, now);
  const cited = patients.map((patient) => patient.source);
  const text = patients.length
    ? [
        patients
          .map(
            ({ noRm, name, dentist, reason, waOptIn }, i) =>
              `${noRm} ${name}, ${dentist}: ${reason}.${waOptIn ? "" : " Tanpa WA Opt-in, tidak dihubungi lewat WhatsApp."} [${i + 1}]`,
          )
          .join("\n"),
        cited.map((uri, i) => `[${i + 1}] ${uri}`).join("\n"),
      ].join("\n\n")
    : "Tidak ada pasien Due for Recall.";
  const auditId = await recordAction({
    caller,
    subject: "Due for Recall",
    filter: visitsVisibleTo(caller),
    cited,
    // The reasons stay out of the Jejak Audit; the cited visit records carry them.
    text: patients.map((patient) => patient.noRm).join(", "),
    decision: "answered",
    at: now.toISOString(),
  });
  return { text, patients, auditId };
}

export interface Proposed {
  id: number;
  noRm: string;
  name: string;
  text: string;
  expiresAt: string;
}

/**
 * One Recall Message Proposal for each opted-in patient Due for Recall, or each of `only`, that has
 * no undecided Proposal yet. Nothing is sent: a human accepts it in the web app first.
 */
export async function proposeRecallMessages(caller: Staff, now = new Date(), only?: string[]) {
  const due = (await listDueForRecall(caller, now)).filter(
    (patient) => !only || only.includes(patient.noRm),
  );
  const at = now.toISOString();
  const expiresAt = new Date(now.getTime() + DAY).toISOString();
  const filter = visitsVisibleTo(caller);

  const proposals: Proposed[] = [];
  for (const patient of due.filter((patient) => patient.waOptIn)) {
    const text = recallMessage(patient);
    // Lands only while the patient has no undecided Proposal, so a repeat request adds none.
    const id = await env.DB.prepare(
      `INSERT INTO proposals (kind, patient_no, text, proposed_by, proposed_at, expires_at)
       SELECT 'recall_message', ?, ?, ?, ?, ?
       WHERE NOT EXISTS (SELECT 1 FROM proposals
                         WHERE patient_no = ? AND decision IS NULL AND expires_at > ?)
       RETURNING id`,
    )
      .bind(patient.noRm, text, caller.id, at, expiresAt, patient.noRm, at)
      .first<number>("id");
    if (id === null) continue;
    await recordAction({
      caller,
      subject: `Recall Message ${patient.noRm}`,
      filter,
      cited: [patient.source],
      text,
      decision: "proposed",
      at,
    });
    proposals.push({ id, noRm: patient.noRm, name: patient.name, text, expiresAt });
  }

  const unreachable = due.filter((patient) => !patient.waOptIn);
  const text = [
    proposals.length
      ? `${proposals.length} Recall Message menunggu persetujuan di halaman Persetujuan. Belum ada yang terkirim.`
      : "Tidak ada Recall Message baru.",
    unreachable.length &&
      `Tanpa WA Opt-in, tidak dihubungi lewat WhatsApp: ${unreachable.map((patient) => `${patient.noRm} ${patient.name}`).join(", ")}.`,
  ]
    .filter(Boolean)
    .join("\n\n");
  return { text, proposals };
}

/** A friendly WhatsApp text with no clinical detail: no diagnosis, procedure or tooth. */
function recallMessage({ name, dentist }: DueForRecall): string {
  return `Halo ${name}, ini Klinik Gigi Senyum Sejahtera. Sudah waktunya Anda kembali ke klinik bersama ${dentist}. Balas pesan ini untuk memilih jadwal yang cocok. Terima kasih.`;
}

export type Status = "pending" | "accepted" | "declined" | "expired";

export interface Proposal {
  id: number;
  noRm: string;
  name: string;
  /** Masked; the full number is only in `whatsapp`. */
  phone: string;
  text: string;
  proposedAt: string;
  status: Status;
  /** The wa.me link a human taps to send the text; only once accepted. */
  whatsapp: string | null;
}

/** The Proposals the caller may decide, newest first, with any that ran out declined first. */
export async function inbox(caller: Staff, now = new Date()): Promise<Proposal[]> {
  await expireProposals(now);
  const decides = proposalsDecidedBy(caller);
  const { results } = await env.DB.prepare(
    `SELECT proposals.id, patients.no_rm AS noRm, patients.name, patients.phone, proposals.text,
       proposals.proposed_at AS proposedAt, proposals.decision, proposals.decided_by AS decidedBy
     FROM proposals JOIN patients ON patients.no_rm = proposals.patient_no
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
      phone: mask(phone),
      status,
      whatsapp: status === "accepted" ? waLink(phone, proposal.text) : null,
    };
  });
}

/**
 * Records the caller's Approval Decision on an undecided Proposal they may decide, in the Jejak
 * Audit too, and returns the Proposal as it now stands; null when they may not decide it.
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
     WHERE id = ? AND decision IS NULL AND expires_at > ?
       AND patient_no IN (SELECT no_rm FROM patients WHERE ${decides.sql})
     RETURNING patient_no AS noRm, text`,
  )
    .bind(decision, caller.id, at, id, at, ...decides.params)
    .first<{ noRm: string; text: string }>();
  if (!decided) return null;

  await recordAction({
    caller,
    subject: `Recall Message ${decided.noRm}`,
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
     RETURNING patient_no AS noRm, text,
       (SELECT json_object('id', id, 'name', name, 'role', role) FROM staff
        WHERE staff.id = proposals.proposed_by) AS proposer`,
  )
    .bind(now.toISOString())
    .all<{ noRm: string; text: string; proposer: string }>();

  for (const { noRm, text, proposer } of results) {
    await recordAction({
      caller: JSON.parse(proposer),
      subject: `Recall Message ${noRm}`,
      filter: null,
      cited: [],
      text,
      decision: "declined",
      reason: "expired",
      at: now.toISOString(),
    });
  }
}

/** A wa.me link that opens WhatsApp with the text ready to send, from an Indonesian number. */
function waLink(phone: string, text: string): string {
  const number = phone.replace(/\D/g, "").replace(/^0/, "62");
  return `https://wa.me/${number}?text=${encodeURIComponent(text)}`;
}
