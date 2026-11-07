import { env } from "cloudflare:workers";
import { patientsVisibleTo, visitsVisibleTo } from "./access";
import { recordAction } from "./jejak-audit";
import { propose } from "./proposals";
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
  const filter = visitsVisibleTo(caller);

  const proposals: Proposed[] = [];
  for (const patient of due.filter((patient) => patient.waOptIn)) {
    const text = recallMessage(patient);
    const proposed = await propose(
      caller,
      { kind: "recall_message", noRm: patient.noRm },
      { text, cited: [patient.source], filter },
      now,
    );
    if (proposed) proposals.push({ ...proposed, noRm: patient.noRm, name: patient.name, text });
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
