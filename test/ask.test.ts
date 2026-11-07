import { env } from "cloudflare:workers";
import { expect, it } from "vitest";
import { ask } from "../src/brain/ask";
import type { Staff } from "../src/brain/staff";

const nina: Staff = { id: "nina", name: "Nina", role: "Front Office" };
const rina: Staff = { id: "rina", name: "drg. Rina", role: "Pemilik" };

const JAM_PRAKTIK =
  "Jam praktik: klinik buka Senin–Jumat pukul 09.00–21.00 dan Sabtu pukul 09.00–15.00. Minggu dan hari libur nasional tutup.";

function auditRow(id: number) {
  return env.DB.prepare("SELECT * FROM jejak_audit WHERE id = ?")
    .bind(id)
    .first<Record<string, string>>();
}

function auditCount() {
  return env.DB.prepare("SELECT count(*) AS n FROM jejak_audit").first<number>("n");
}

it("answers Nina's opening-hours question from the SOP with a doc:// citation (T01)", async () => {
  const answer = await ask(nina, "Jam praktik klinik?");

  expect(answer).toMatchObject({
    decision: "answered",
    text: `${JAM_PRAKTIK} [1]\n\n[1] doc://sop/jam-operasional#jam-praktik (2 Januari 2026)`,
    citations: [
      {
        uri: "doc://sop/jam-operasional#jam-praktik",
        dated: "2026-01-02T00:00:00Z",
        text: JAM_PRAKTIK,
      },
    ],
  });
});

it("dates each citation in WIB", async () => {
  const answer = await ask(nina, "Siapa yang izin datang terlambat hari Rabu?");

  expect(answer.text).toBe(
    "Saya izin datang 30 menit terlambat hari Rabu, mohon pasien pertama dimundurkan. [1]\n\n" +
      "[1] chat://wa/grup-klinik/msg-2204 (5 November 2026)",
  );
});

it("says it does not know when no Source matches", async () => {
  const answer = await ask(nina, "Berapa harga mobil listrik?");

  expect(answer).toMatchObject({
    decision: "unknown_routed",
    text: "Saya tidak tahu.",
    citations: [],
  });
});

it("says it does not know when a Source shares only a stray keyword", async () => {
  const answer = await ask(nina, "Siapa dokter pasien Budi?");

  expect(answer).toMatchObject({ decision: "unknown_routed", citations: [] });
});

it("answers from the Source that matches most of the question", async () => {
  const closed = await ask(nina, "Klinik tutup hari apa?");
  const autoclave = await ask(nina, "Kapan autoclave terakhir diuji?");

  expect(closed.citations.map((citation) => citation.uri)).toEqual([
    "doc://sop/jam-operasional#jam-praktik",
  ]);
  expect(autoclave.text).toMatch(/^Autoclave .*diuji/);
});

it("writes exactly one Jejak Audit row per ask, answered or not", async () => {
  const before = await auditCount();
  const answered = await ask(nina, "Jam praktik klinik?");
  const unknown = await ask(nina, "Berapa harga mobil listrik?");

  expect(await auditCount()).toBe((before ?? 0) + 2);

  const row = await auditRow(answered.auditId);
  expect(row).toMatchObject({
    staff_id: "nina",
    role: "Front Office",
    question: "Jam praktik klinik?",
    cited: '["doc://sop/jam-operasional#jam-praktik"]',
    answer: answered.text,
    decision: "answered",
  });
  expect(JSON.parse(row!.retrieved)).toContain("doc://sop/jam-operasional#jam-praktik");
  expect(row!.asked_at <= row!.answered_at).toBe(true);
  expect(new Date(row!.answered_at).toISOString()).toBe(row!.answered_at);

  expect(await auditRow(unknown.auditId)).toMatchObject({
    retrieved: "[]",
    cited: "[]",
    answer: "Saya tidak tahu.",
    decision: "unknown_routed",
  });
});

it("stores the question with NIK, phone and email masked", async () => {
  const { auditId } = await ask(
    nina,
    "Pasien NIK 3276011203900001, HP +62 812-3456-7890 atau 081298765432, email budi@gmail.com datang jam berapa?",
  );

  expect((await auditRow(auditId))?.question).toBe(
    "Pasien NIK ************0001, HP +** ***-****-7890 atau ********5432, email ***@gmail.com datang jam berapa?",
  );
});

it("cites only text found in a chunk it retrieved (T15)", async () => {
  const questions = [
    "Jam praktik klinik?",
    "Kapan autoclave terakhir diuji?",
    "Bagaimana instrumen disterilkan?",
    "Pasien baru harus mengisi apa?",
    "Stok sarung tangan nitril berapa kotak?",
    "Siapa yang izin datang terlambat hari Rabu?",
    "Pasien ortodonti dijadwalkan hari apa?",
    "Berapa harga mobil listrik?",
  ];
  const citedUris = new Set<string>();

  for (const question of questions) {
    const answer = await ask(rina, question);
    const retrieved: string[] = JSON.parse((await auditRow(answer.auditId))!.retrieved);

    for (const citation of answer.citations) {
      citedUris.add(citation.uri);
      expect(retrieved).toContain(citation.uri);
      const source = await env.DB.prepare("SELECT body FROM sources WHERE uri = ?")
        .bind(citation.uri)
        .first<string>("body");
      expect(source).toContain(citation.text);
    }
  }

  expect([...citedUris].map((uri) => uri.split("://")[0])).toEqual(
    expect.arrayContaining(["chat", "doc", "task"]),
  );
});
