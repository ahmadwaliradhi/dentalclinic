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
