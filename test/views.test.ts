import { env } from "cloudflare:workers";
import { expect, it } from "vitest";
import type { Staff } from "../src/brain/staff";
import { asetFor, patientsFor, scheduleFor, stockCard } from "../src/brain/views";

const rina: Staff = { id: "rina", name: "drg. Rina", role: "Pemilik" };
const andi: Staff = { id: "andi", name: "drg. Andi", role: "Dokter Gigi Mitra" };
const tari: Staff = { id: "tari", name: "Tari", role: "TGM" };
const nina: Staff = { id: "nina", name: "Nina", role: "Front Office" };

const UNMASKED = /\d(?:[\s-]?\d){9}/;

it("shows Nina every patient with masked NIK and phone and no clinical notes", async () => {
  const patients = await patientsFor(nina);

  expect(patients).toHaveLength(40);
  expect(patients[6]).toEqual({
    noRm: "P-0007",
    name: "Ratna Sari",
    nik: "************0007",
    phone: "****-****-2371",
    dentist: "drg. Andi",
    lastVisit: null,
  });
  expect(JSON.stringify(patients)).not.toMatch(UNMASKED);
  expect(patients.every((patient) => patient.lastVisit === null)).toBe(true);
});

it("shows drg. Andi only his own patients, with their notes", async () => {
  const patients = await patientsFor(andi);

  expect(patients).toHaveLength(22);
  expect(patients.every((patient) => patient.dentist === "drg. Andi")).toBe(true);
  expect(patients.find((patient) => patient.noRm === "P-0018")?.lastVisit).toEqual({
    on: "2026-10-18T03:00:00Z",
    notes: "Tindakan: PSA kunjungan 3 dari 3 gigi 37, obturasi saluran akar, perawatan selesai.",
  });
  expect(JSON.stringify(patients)).not.toMatch(UNMASKED);
});

it("shows drg. Rina every patient, with notes", async () => {
  const patients = await patientsFor(rina);

  expect(patients).toHaveLength(40);
  expect(patients.find((patient) => patient.noRm === "P-0023")?.lastVisit?.notes).toBe(
    "Tindakan: kontrol ortodonti cekat bulan ke-9, aktivasi kawat.",
  );
  expect(JSON.stringify(patients)).not.toMatch(UNMASKED);
});

it("shows Tari only the patients she assisted, with the notes of those visits", async () => {
  const patients = await patientsFor(tari);

  // She assisted P-0023 visit 2 but never P-0001.
  expect(patients.find((patient) => patient.noRm === "P-0023")?.lastVisit?.on).toBe(
    "2026-10-03T09:00:00Z",
  );
  expect(patients.some((patient) => patient.noRm === "P-0001")).toBe(false);
  expect(patients.every((patient) => patient.lastVisit !== null)).toBe(true);
});

it("shows Nina the whole schedule and drg. Andi only his own appointments", async () => {
  const all = await scheduleFor(nina);
  const own = await scheduleFor(andi);

  expect(all).toHaveLength(7);
  expect(all[0]).toEqual({
    startsAt: "2026-11-09T02:00:00Z",
    noRm: "P-0002",
    patient: "Agus Setiawan",
    dentist: "drg. Andi",
  });
  expect(own.map((appointment) => appointment.noRm)).toEqual(["P-0002", "P-0010", "P-0013"]);
});

it("shows Tari the appointments of patients she assisted", async () => {
  const schedule = await scheduleFor(tari);

  expect(schedule.map((appointment) => appointment.noRm)).toEqual(["P-0036", "P-0029", "P-0040"]);
});

it("shows the stock card to every Role", async () => {
  expect(await stockCard()).toEqual([
    { item: "Kapas gulung", quantity: 5, unit: "pak", countedAt: "2026-10-31T09:00:00Z" },
    { item: "Masker medis", quantity: 8, unit: "kotak", countedAt: "2026-10-31T09:00:00Z" },
    {
      item: "Sarung tangan nitril M",
      quantity: 6,
      unit: "kotak",
      countedAt: "2026-10-31T09:00:00Z",
    },
  ]);
});

it("shows drg. Rina what each Aset cost", async () => {
  expect(await asetFor(rina)).toEqual([
    { name: "Dental unit", boughtOn: "2026-02-09", price: 45_000_000 },
    { name: "Scaler ultrasonik", boughtOn: "2026-08-03", price: 8_000_000 },
    { name: "X-ray panoramik", boughtOn: "2025-11-17", price: 180_000_000 },
  ]);
});

it.each([andi, tari, nina])("shows $name the Aset without what they cost", async (caller) => {
  const aset = await asetFor(caller);

  expect(aset.map((row) => row.name)).toEqual([
    "Dental unit",
    "Scaler ultrasonik",
    "X-ray panoramik",
  ]);
  expect(aset.every((row) => row.price === null)).toBe(true);
});

// Last: it adds a patient, which the counts above do not expect.
it("lists drg. Andi's new patient before their first visit", async () => {
  await env.DB.prepare(
    "INSERT INTO patients (no_rm, name, nik, phone, dentist_id) VALUES ('P-0041', 'Budi Santoso', '3276010101900041', '0812-3000-4041', 'andi')",
  ).run();

  expect((await patientsFor(andi)).find((patient) => patient.noRm === "P-0041")).toMatchObject({
    nik: "************0041",
    lastVisit: null,
  });
});
