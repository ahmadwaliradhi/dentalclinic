import { env } from "cloudflare:workers";
import { expect, it } from "vitest";
import { ask } from "../src/brain/ask";
import type { Staff } from "../src/brain/staff";

const rina: Staff = { id: "rina", name: "drg. Rina", role: "Pemilik" };
const andi: Staff = { id: "andi", name: "drg. Andi", role: "Dokter Gigi Mitra" };
const nina: Staff = { id: "nina", name: "Nina", role: "Front Office" };

const REFUSAL = {
  text: "Saya tidak menemukan informasi yang dapat saya tampilkan untuk permintaan ini. Jika Anda yakin data ini ada, hubungi drg. Rina.",
  decision: "refusal",
  citations: [],
  flags: [],
};

it("refuses Nina the diagnosis of a seeded patient (T02)", async () => {
  expect(await ask(nina, "Apa diagnosis pasien P-0007?")).toEqual({
    ...REFUSAL,
    auditId: expect.any(Number),
  });
});

function reason(auditId: number) {
  return env.DB.prepare("SELECT reason FROM jejak_audit WHERE id = ?")
    .bind(auditId)
    .first<string | null>("reason");
}

it("gives Nina the same Refusal for a patient that does not exist (T03)", async () => {
  const restricted = await ask(nina, "Apa diagnosis pasien P-0007?");
  const absent = await ask(nina, "Apa diagnosis pasien P-9999?");

  expect({ ...absent, auditId: 0 }).toEqual({ ...restricted, auditId: 0 });
  expect(await reason(restricted.auditId)).toBe("restricted");
  expect(await reason(absent.auditId)).toBe("not_found");
});

it("answers drg. Andi about his own patient with an emr:// citation and masked NIK (T04)", async () => {
  const answer = await ask(andi, "Apa diagnosis pasien P-0007?");
  const visit =
    "P-0007 Ratna Sari, NIK ************0007, HP ****-****-2371. Diagnosis: gingivitis kronis gigi 47. Tindakan: scaling dan polishing.";

  expect(answer).toMatchObject({
    decision: "answered",
    text: `${visit} [1]\n\n[1] emr://patient/P-0007/visit/1 (9 September 2026)`,
    citations: [{ uri: "emr://patient/P-0007/visit/1", text: visit }],
  });
});

it("refuses drg. Andi drg. Maya's patient, which drg. Rina sees (T05, T06)", async () => {
  const question = "Apa diagnosis pasien P-0023?";

  expect(await ask(andi, question)).toMatchObject(REFUSAL);
  expect((await ask(rina, question)).citations.map((citation) => citation.uri)).toEqual([
    "emr://patient/P-0023/visit/1",
  ]);
});

it("refuses drg. Andi drg. Maya's fee exactly as a dentist who does not exist (T21)", async () => {
  const maya = await ask(andi, "Berapa fee drg. Maya bulan ini?");
  const budi = await ask(andi, "Berapa fee drg. Budi bulan ini?");

  expect(maya).toMatchObject(REFUSAL);
  expect({ ...budi, auditId: 0 }).toEqual({ ...maya, auditId: 0 });
  expect(await reason(maya.auditId)).toBe("restricted");
  expect(await reason(budi.auditId)).toBe("not_found");
});

it("gives drg. Rina drg. Maya's fee from the contract and the ledger (T21)", async () => {
  const answer = await ask(rina, "Berapa fee drg. Maya bulan ini?");

  expect(answer.decision).toBe("answered");
  expect(answer.citations.map((citation) => citation.uri).sort()).toEqual([
    "doc://kontrak/bagi-hasil-maya#fee",
    "task://fee/2026-10-maya",
  ]);
});

it("shows Tari only the visits she assisted, and no finance", async () => {
  const tari: Staff = { id: "tari", name: "Tari", role: "Perawat Gigi" };

  expect((await ask(tari, "Apa diagnosis pasien P-0004?")).decision).toBe("answered");
  expect(await ask(tari, "Apa diagnosis pasien P-0007?")).toMatchObject(REFUSAL);
  expect(await ask(tari, "Berapa fee drg. Andi bulan ini?")).toMatchObject(REFUSAL);
});

it("never lets an unmasked NIK or phone number out, across every patient (T14)", async () => {
  const patients = await env.DB.prepare("SELECT no_rm FROM patients").all<{ no_rm: string }>();
  const questions = patients.results.flatMap(({ no_rm }) => [
    `Apa diagnosis pasien ${no_rm}?`,
    `NIK dan nomor HP pasien ${no_rm}?`,
  ]);
  let answered = 0;

  for (const question of questions) {
    const answer = await ask(rina, question);
    if (answer.decision === "answered") answered++;
    expect(JSON.stringify(answer)).not.toMatch(/\d(?:[\s-]?\d){9}/);
  }
  expect(answered).toBe(questions.length);
});

it("records drg. Andi asking about his own fee as answered, with no reason", async () => {
  const answer = await ask(andi, "Berapa fee drg. Andi bulan ini?");

  expect(answer.citations.map((citation) => citation.uri).sort()).toEqual([
    "doc://kontrak/bagi-hasil-andi#fee",
    "task://fee/2026-10-andi",
  ]);
  expect(await reason(answer.auditId)).toBeNull();
});
