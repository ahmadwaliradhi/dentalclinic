import { env } from "cloudflare:workers";
import { expect, it } from "vitest";
import { ask } from "../src/brain/ask";
import { kpi } from "../src/brain/kpi";
import type { Staff } from "../src/brain/staff";

const rina: Staff = { id: "rina", name: "drg. Rina", role: "Pemilik" };

it("answers when the scaler ultrasonik pays back, with formula and Sources", async () => {
  // Scaling margin: drg. Andi 200.000 − 25.000 − 80.000 = 95.000; drg. Rina 200.000 − 25.000 = 175.000.
  // Average per month, Agustus–Oktober: drg. Andi (4 + 5 + 6) / 3 = 5, drg. Rina (6 + 6 + 9) / 3 = 7.
  // Margin per month 5 × 95.000 + 7 × 175.000 = 1.700.000; Payback 8.000.000 / 1.700.000 = 4,7 months.
  const answer = await kpi(rina, "Scaler ultrasonik balik modal kapan?");

  expect(answer.decision).toBe("answered");
  expect(answer.text).toBe(
    "Scaler ultrasonik: Payback 4,7 bulan sejak dibeli 3 Agustus 2026, balik modal sekitar Desember 2026. Penyusutan Rp83.333 per bulan.\n\n" +
      "Rumus: Payback = harga Aset ÷ margin per bulan dari tindakan yang memakainya, dengan rata-rata tindakan Agustus–Oktober 2026. " +
      "Margin per Tindakan = tarif − BMHP − fee dokter. " +
      "Penyusutan garis lurus 8 tahun adalah perkiraan; kelompok pajaknya tanyakan ke konsultan pajak/hukum klinik.\n\n" +
      "[1] doc://aset/scaler-ultrasonik (3 Agustus 2026)\n" +
      "[2] doc://katalog-tindakan#scaling (6 November 2026)\n" +
      "[3] doc://kontrak/bagi-hasil-andi#fee (2 Januari 2026)\n" +
      "[4] task://tindakan/2026-08 (31 Agustus 2026)\n" +
      "[5] task://tindakan/2026-09 (30 September 2026)\n" +
      "[6] task://tindakan/2026-10 (31 Oktober 2026)",
  );
  expect(answer.citations[0]).toEqual({
    uri: "doc://aset/scaler-ultrasonik",
    dated: "2026-08-03",
    text: "Scaler ultrasonik dibeli 3 Agustus 2026 seharga Rp8.000.000, dipakai untuk Scaling.",
  });
});

it("gives Margin per Tindakan for the procedures named, per dentist who does them", async () => {
  const answer = await kpi(rina, "Margin per tindakan scaling, komposit dan ortodonti?");

  expect(answer.text).toBe(
    "Scaling, drg. Andi: Rp200.000 − Rp25.000 − Rp80.000 = Rp95.000\n" +
      "Scaling, drg. Rina: Rp200.000 − Rp25.000 − Rp0 = Rp175.000\n" +
      "Tumpatan komposit, drg. Andi: Rp400.000 − Rp60.000 − Rp160.000 = Rp180.000\n" +
      "Kontrol ortodonti, drg. Maya, Sp.Ort: Rp300.000 − Rp30.000 − Rp105.000 = Rp165.000\n\n" +
      "Rumus: Margin per Tindakan = tarif − BMHP − fee dokter.\n\n" +
      "[1] doc://katalog-tindakan#scaling (6 November 2026)\n" +
      "[2] doc://katalog-tindakan#komposit (6 November 2026)\n" +
      "[3] doc://katalog-tindakan#ortodonti (6 November 2026)\n" +
      "[4] doc://kontrak/bagi-hasil-andi#fee (2 Januari 2026)\n" +
      "[5] doc://kontrak/bagi-hasil-maya#fee (2 Januari 2026)",
  );
});

it("gives every procedure's margin when none is named", async () => {
  const answer = await kpi(rina, "Berapa margin per tindakan?");

  expect(answer.text.split("\n\n")[0].split("\n")).toEqual([
    "Scaling, drg. Andi: Rp200.000 − Rp25.000 − Rp80.000 = Rp95.000",
    "Scaling, drg. Rina: Rp200.000 − Rp25.000 − Rp0 = Rp175.000",
    "Tumpatan komposit, drg. Andi: Rp400.000 − Rp60.000 − Rp160.000 = Rp180.000",
    "Pencabutan, drg. Andi: Rp300.000 − Rp35.000 − Rp120.000 = Rp145.000",
    "PSA, drg. Andi: Rp800.000 − Rp120.000 − Rp320.000 = Rp360.000",
    "Kontrol ortodonti, drg. Maya, Sp.Ort: Rp300.000 − Rp30.000 − Rp105.000 = Rp165.000",
    "Foto panoramik, drg. Rina: Rp350.000 − Rp40.000 − Rp0 = Rp310.000",
  ]);
});

it("shows overhead as a share of collections against 59%, labelled international", async () => {
  // (44.800.000 + 45.600.000 + 47.100.000) / (70.500.000 + 73.200.000 + 76.300.000) = 62,5%.
  const answer = await kpi(rina, "Overhead klinik berapa persen?");

  expect(answer.text).toBe(
    "Overhead Agustus–Oktober 2026: 62,5% dari penerimaan (Rp137.500.000 dari Rp220.000.000), di atas acuan 59%.\n\n" +
      "Rumus: overhead % = overhead ÷ penerimaan. " +
      "Acuan 59% adalah referensi internasional untuk praktik dokter gigi umum (Levin Group, AS), bukan standar Indonesia.\n\n" +
      "[1] task://keuangan/2026-08 (31 Agustus 2026)\n" +
      "[2] task://keuangan/2026-09 (30 September 2026)\n" +
      "[3] task://keuangan/2026-10 (31 Oktober 2026)",
  );
  expect(answer.citations[2].text).toBe(
    "Pembukuan Oktober 2026: overhead Rp47.100.000, penerimaan Rp76.300.000.",
  );
});

const FINANCE = [
  "Scaler ultrasonik balik modal kapan?",
  "Margin per tindakan scaling?",
  "Overhead klinik berapa persen?",
];

it("gives Tari, Nina and drg. Andi the Refusal for finance questions, through ask too", async () => {
  const others: Staff[] = [
    { id: "tari", name: "Tari", role: "Perawat Gigi" },
    { id: "nina", name: "Nina", role: "Front Office" },
    { id: "andi", name: "drg. Andi", role: "Dokter Gigi Mitra" },
  ];

  for (const caller of others) {
    for (const question of FINANCE) {
      for (const answer of [await kpi(caller, question), await ask(caller, question)]) {
        expect(answer).toMatchObject({
          text: "Saya tidak menemukan informasi yang dapat saya tampilkan untuk permintaan ini. Jika Anda yakin data ini ada, hubungi drg. Rina.",
          decision: "refusal",
          citations: [],
        });
        expect(await reason(answer.auditId)).toBe("restricted");
      }
    }
  }
});

it("answers drg. Rina's finance questions through ask", async () => {
  for (const question of FINANCE) {
    expect(await ask(rina, question)).toEqual({
      ...(await kpi(rina, question)),
      auditId: expect.any(Number),
    });
  }
});

it("never answers which tax group an Aset falls in, even for drg. Rina (T24)", async () => {
  for (const caller of [rina, { id: "nina", name: "Nina", role: "Front Office" } as const]) {
    expect(await ask(caller, "Alat X-ray masuk kelompok pajak berapa?")).toMatchObject({
      text: "Saya tidak tahu. Tanyakan ke konsultan pajak/hukum klinik.",
      decision: "unknown_routed",
      citations: [],
    });
  }
});

function reason(auditId: number) {
  return env.DB.prepare("SELECT reason FROM jejak_audit WHERE id = ?")
    .bind(auditId)
    .first<string | null>("reason");
}

it("answers a kpi query outside Keuangan & Aset from the Sources", async () => {
  expect(await kpi(rina, "Jam praktik klinik?")).toMatchObject({
    decision: "answered",
    citations: [{ uri: "doc://sop/jam-operasional#jam-praktik" }],
  });
});
