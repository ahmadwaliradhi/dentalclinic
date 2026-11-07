import { env } from "cloudflare:workers";
import { patientsVisibleTo, seesClinicFinance, visitsVisibleTo } from "./access";
import { mask } from "./mask";
import type { Staff } from "./staff";

// Read-only views of clinic data, filtered by the caller's Role as defined under Restricted in
// GLOSSARY.md. Visit notes go through the same Source guard as `ask`, and identity data is masked
// the same way.

export interface Patient {
  noRm: string;
  name: string;
  nik: string;
  phone: string;
  dentist: string;
  /** The latest visit the caller may see, or null. */
  lastVisit: { on: string; notes: string } | null;
}

export async function patientsFor(caller: Staff): Promise<Patient[]> {
  const visits = visitsVisibleTo(caller);
  const listed = patientsVisibleTo(caller);
  const { results } = await env.DB.prepare(
    `SELECT patients.no_rm AS noRm, patients.name, patients.nik, patients.phone, staff.name AS dentist,
       (SELECT json_object('on', visits.visited_at, 'notes', visits.notes) FROM visits
        WHERE visits.patient_no = patients.no_rm AND ${visits.sql}
        ORDER BY visits.visited_at DESC LIMIT 1) AS lastVisit
     FROM patients JOIN staff ON staff.id = patients.dentist_id
     WHERE ${listed.sql}
     ORDER BY patients.no_rm`,
  )
    .bind(...visits.params, ...listed.params)
    .all<Omit<Patient, "lastVisit"> & { lastVisit: string | null }>();

  return results.map((patient) => {
    const lastVisit = patient.lastVisit ? JSON.parse(patient.lastVisit) : null;
    return {
      ...patient,
      nik: mask(patient.nik),
      phone: mask(patient.phone),
      lastVisit: lastVisit && { on: lastVisit.on, notes: mask(lastVisit.notes) },
    };
  });
}

export interface Appointment {
  startsAt: string;
  noRm: string;
  patient: string;
  dentist: string;
}

/** Appointments of the patients the caller may list. */
export async function scheduleFor(caller: Staff): Promise<Appointment[]> {
  const listed = patientsVisibleTo(caller);
  const { results } = await env.DB.prepare(
    `SELECT appointments.starts_at AS startsAt, patients.no_rm AS noRm, patients.name AS patient,
       staff.name AS dentist
     FROM appointments
     JOIN patients ON patients.no_rm = appointments.patient_no
     JOIN staff ON staff.id = appointments.dentist_id
     WHERE ${listed.sql}
     ORDER BY appointments.starts_at`,
  )
    .bind(...listed.params)
    .all<Appointment>();
  return results;
}

export interface StockItem {
  item: string;
  quantity: number;
  unit: string;
  countedAt: string;
}

/** The stock card. Stock is not Restricted, so every Role sees all of it. */
export async function stockCard(): Promise<StockItem[]> {
  const { results } = await env.DB.prepare(
    "SELECT item, quantity, unit, counted_at AS countedAt FROM stock_items ORDER BY item",
  ).all<StockItem>();
  return results;
}

export interface Aset {
  name: string;
  boughtOn: string;
  /** In rupiah; null unless the caller may see clinic finance. */
  price: number | null;
}

export async function asetFor(caller: Staff): Promise<Aset[]> {
  // The price is never read for a caller who may not see it.
  const price = seesClinicFinance(caller) ? "price" : "NULL";
  const { results } = await env.DB.prepare(
    `SELECT name, bought_on AS boughtOn, ${price} AS price FROM aset ORDER BY name`,
  ).all<Aset>();
  return results;
}
