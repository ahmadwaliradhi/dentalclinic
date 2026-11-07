import { env } from "cloudflare:workers";
import { expect, it } from "vitest";
import { auditFor, verifyChain } from "../src/brain/jejak-audit";
import { decide, expireProposals, inbox } from "../src/brain/proposals";
import { listDueForRecall, proposeRecallMessages } from "../src/brain/recall";
import type { Staff } from "../src/brain/staff";

const rina: Staff = { id: "rina", name: "drg. Rina", role: "Pemilik" };
const andi: Staff = { id: "andi", name: "drg. Andi", role: "Dokter Gigi Mitra" };
const maya: Staff = { id: "maya", name: "drg. Maya, Sp.Ort", role: "Dokter Gigi Mitra" };
const tari: Staff = { id: "tari", name: "Tari", role: "TGM" };
const nina: Staff = { id: "nina", name: "Nina", role: "Front Office" };

/** The seed's "today": 7 November 2026, 10.00 WIB. */
const NOW = new Date("2026-11-07T03:00:00Z");

it("lists Due for Recall patients for both triggers, with reason and Source", async () => {
  const due = await listDueForRecall(rina, NOW);

  expect(due.find((patient) => patient.noRm === "P-0004")).toEqual({
    noRm: "P-0004",
    name: "Rudi Hartono",
    dentist: "drg. Andi",
    reason: "PSA gigi 17 baru 1 dari 3 kunjungan, terakhir 5 Agustus 2026",
    source: "emr://patient/P-0004/visit/1",
    waOptIn: true,
  });
  expect(due.find((patient) => patient.noRm === "P-0035")).toEqual({
    noRm: "P-0035",
    name: "Sinta Maharani",
    dentist: "drg. Rina",
    reason: "Rencana Tindak Lanjut 5 Oktober 2026 sudah lewat",
    source: "emr://patient/P-0035/visit/1",
    waOptIn: true,
  });
  expect(due.find((patient) => patient.noRm === "P-0039")).toMatchObject({ waOptIn: false });
  // Finished treatment, a follow-up still ahead, or no plan at all: not Due for Recall.
  for (const noRm of ["P-0018", "P-0036", "P-0001"]) {
    expect(due.map((patient) => patient.noRm)).not.toContain(noRm);
  }
});

it("shows a Dokter Gigi Mitra only their own patients, and Front Office none", async () => {
  const due = await listDueForRecall(andi, NOW);

  expect(due.length).toBeGreaterThan(0);
  expect(due.every((patient) => patient.dentist === "drg. Andi")).toBe(true);
  expect(await listDueForRecall(nina, NOW)).toEqual([]);
});

it("proposes one Recall Message per opted-in patient and nothing sendable (T10)", async () => {
  const { proposals, text } = await proposeRecallMessages(rina, NOW);
  const due = await listDueForRecall(rina, NOW);
  const optedIn = due.filter((patient) => patient.waOptIn).map((patient) => patient.noRm);

  expect(proposals.map((proposal) => proposal.noRm)).toEqual(optedIn);
  expect(optedIn).not.toContain("P-0039");
  expect(proposals[0]).toEqual({
    id: expect.any(Number),
    noRm: "P-0004",
    name: "Rudi Hartono",
    text: "Halo Rudi Hartono, ini Klinik Gigi Senyum Sejahtera. Sudah waktunya Anda kembali ke klinik bersama drg. Andi. Balas pesan ini untuk memilih jadwal yang cocok. Terima kasih.",
    expiresAt: "2026-11-08T03:00:00.000Z",
  });
  expect(text).toContain(`${proposals.length} Recall Message menunggu persetujuan`);
  expect(text).toContain("P-0039");
  // Undecided Proposals are not proposed twice.
  expect((await proposeRecallMessages(rina, NOW)).proposals).toEqual([]);
});

it("keeps every diagnosis and procedure out of Recall Message text", async () => {
  const { proposals } = await proposeRecallMessages(rina, NOW);
  const { results: plans } = await env.DB.prepare("SELECT treatment FROM rencana_perawatan").all<{
    treatment: string;
  }>();

  for (const { text } of [...proposals, ...(await pending(rina))]) {
    expect(text).not.toMatch(/diagnosis|tindakan|psa|karies|pulp|scaling|ortodonti|gigi \d/i);
    for (const { treatment } of plans) expect(text).not.toContain(treatment);
  }
});

it("proposes only for the named patients the caller may see", async () => {
  const { proposals } = await proposeRecallMessages(andi, NOW, ["P-0023", "P-0009", "P-0002"]);

  // P-0023 is drg. Maya's, P-0009 has no WA Opt-in, P-0002 is not Due for Recall.
  expect(proposals).toEqual([]);
});

it("shows the full text and recipient before deciding, and a wa.me link only after accepting", async () => {
  await proposeRecallMessages(andi, NOW, ["P-0004"]);
  const proposal = await pendingFor(andi, "P-0004");

  expect(proposal).toMatchObject({
    name: "Rudi Hartono",
    phone: "****-****-2212",
    text: expect.stringMatching(/^Halo Rudi Hartono,/),
    whatsapp: null,
  });

  const accepted = await decide(andi, proposal.id, "accepted", NOW);

  expect(accepted).toMatchObject({ status: "accepted" });
  expect(accepted?.whatsapp).toBe(
    `https://wa.me/6285711482212?text=${encodeURIComponent(proposal.text)}`,
  );
  // Decided once: a second decision changes nothing.
  expect(await decide(andi, proposal.id, "declined", NOW)).toBeNull();
});

it("leaves no wa.me link after a decline, and logs it in the Jejak Audit (T11)", async () => {
  await proposeRecallMessages(rina, NOW, ["P-0037"]);
  const proposal = await pendingFor(rina, "P-0037");

  const declined = await decide(rina, proposal.id, "declined", NOW);

  expect(declined).toMatchObject({ status: "declined", whatsapp: null });
  expect(JSON.stringify(await inbox(rina, NOW))).not.toContain("wa.me/6281223693961");
  expect((await auditFor(rina))[0]).toMatchObject({
    staff: "drg. Rina",
    question: "Recall Message P-0037",
    decision: "declined",
    reason: null,
  });
  expect(await verifyChain()).toBe(true);
});

it("lets only drg. Rina or the patient's own Dokter Gigi Mitra decide", async () => {
  await proposeRecallMessages(rina, NOW);
  // A pending Proposal for one of drg. Andi's patients.
  const proposal = (await pending(rina)).find((p) => p.noRm !== null && p.noRm < "P-0023")!;

  for (const caller of [maya, tari, nina]) {
    expect(await decide(caller, proposal.id, "accepted", NOW)).toBeNull();
    expect(await inbox(caller, NOW)).not.toContainEqual(
      expect.objectContaining({ id: proposal.id }),
    );
  }
  expect(await decide(rina, proposal.id, "accepted", NOW)).toMatchObject({ status: "accepted" });
});

it("declines the seeded Proposal once it expires, and logs that (T12)", async () => {
  await expireProposals(NOW);

  expect((await inbox(rina, NOW)).find((p) => p.id === 1)).toMatchObject({
    noRm: "P-0035",
    status: "expired",
    whatsapp: null,
  });
  expect(await decide(rina, 1, "accepted", NOW)).toBeNull();
  const logged = (await auditFor(rina)).filter(
    (row) => row.question === "Recall Message P-0035" && row.reason === "expired",
  );
  expect(logged).toEqual([expect.objectContaining({ decision: "declined", staff: "drg. Rina" })]);
});

it("declines a Proposal no one decides within 24 hours", async () => {
  await proposeRecallMessages(maya, NOW, ["P-0023"]);
  const proposal = await pendingFor(maya, "P-0023");
  const later = new Date(NOW.getTime() + 24 * 60 * 60 * 1000);

  expect(await decide(maya, proposal.id, "accepted", later)).toBeNull();
  expect((await inbox(maya, later)).find((p) => p.id === proposal.id)).toMatchObject({
    status: "expired",
  });
});

/** The undecided Proposals in the caller's inbox. */
async function pending(caller: Staff) {
  return (await inbox(caller, NOW)).filter((proposal) => proposal.status === "pending");
}

/** The caller's undecided Proposal for one patient. */
async function pendingFor(caller: Staff, noRm: string) {
  const proposal = (await pending(caller)).find((p) => p.noRm === noRm);
  if (!proposal) throw new Error(`No undecided Proposal for ${noRm}`);
  return proposal;
}
