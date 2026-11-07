import type { Staff } from "./staff";

/** An SQL condition on `sources` and its parameters. */
export interface Guard {
  sql: string;
  params: string[];
}

/** Every Source: what the Pemilik sees, and how a Refusal learns whether withheld data exists. */
export const EVERYTHING: Guard = { sql: "TRUE", params: [] };

const GRANTED = "sources.uri IN (SELECT uri FROM source_access WHERE staff_id = ?)";

/** What the caller's Role may see, as defined under Restricted in GLOSSARY.md. */
export function visibleTo(caller: Staff): Guard {
  switch (caller.role) {
    case "Pemilik":
      return EVERYTHING;
    case "Dokter Gigi Mitra":
      return { sql: `sources.area IS NULL OR ${GRANTED}`, params: [caller.id] };
    case "TGM":
      return {
        sql: `sources.area IS NULL OR (sources.area = 'clinical' AND ${GRANTED})`,
        params: [caller.id],
      };
    case "Front Office":
      return { sql: "sources.area IS NULL", params: [] };
  }
}

/** Visits whose emr Source the caller may see, as an SQL condition on `visits`. */
export function visitsVisibleTo(caller: Staff): Guard {
  const sources = visibleTo(caller);
  return {
    sql: `EXISTS (SELECT 1 FROM sources WHERE sources.uri = 'emr://patient/' || visits.patient_no || '/visit/' || visits.n AND (${sources.sql}))`,
    params: sources.params,
  };
}

/**
 * Patients the caller may list, as an SQL condition on `patients`: every patient for the Pemilik
 * and Front Office, a Dokter Gigi Mitra's own, and those a TGM assisted.
 */
export function patientsVisibleTo(caller: Staff): Guard {
  switch (caller.role) {
    case "Pemilik":
    case "Front Office":
      return EVERYTHING;
    case "Dokter Gigi Mitra":
      return { sql: "patients.dentist_id = ?", params: [caller.id] };
    case "TGM":
      return {
        sql: "patients.no_rm IN (SELECT patient_no FROM visits WHERE assistant_id = ?)",
        params: [caller.id],
      };
  }
}

/** Clinic finance, such as what an Aset cost, is the Pemilik's alone. */
export function seesClinicFinance(caller: Staff): boolean {
  return caller.role === "Pemilik";
}

/** The whole Jejak Audit, with Refusal reasons and injection flags, is the Pemilik's alone. */
export function seesWholeJejakAudit(caller: Staff): boolean {
  return caller.role === "Pemilik";
}
