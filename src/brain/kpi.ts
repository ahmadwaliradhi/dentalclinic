import { env } from "cloudflare:workers";
import { ask } from "./ask";
import type { Answer, Citation, Reason } from "./ask";
import { recordAsk } from "./jejak-audit";
import { day, dontKnow, refusal, sourceList } from "./reply";
import { pemilik } from "./staff";
import type { Staff } from "./staff";
import { topicOwner } from "./topic-owner";

type Topic = "pajak" | "payback" | "margin" | "overhead";

/** The Keuangan & Aset question a query asks, or null for any other question. */
export function kpiTopic(query: string): Topic | null {
  const text = query.toLowerCase();
  if (/pajak/.test(text) && /kelompok|golongan|alat|aset/.test(text)) return "pajak";
  if (/balik modal|payback|penyusutan|depresiasi/.test(text)) return "payback";
  if (/margin/.test(text)) return "margin";
  if (/overhead|biaya operasional/.test(text)) return "overhead";
  return null;
}

/**
 * Keuangan & Aset answers for the Pemilik, computed from the clinic's books and recorded in the
 * Jejak Audit. Every other Role gets the Refusal. Tax grouping is always "saya tidak tahu".
 */
export async function kpi(caller: Staff, query: string): Promise<Answer> {
  const askedAt = new Date().toISOString();
  const topic = kpiTopic(query);
  const owner = await pemilik();

  let answer: Omit<Answer, "auditId">;
  let reason: Reason | null = null;
  if (topic === "pajak") {
    answer = unknown(topicOwner(query) ?? owner.name);
  } else if (caller.role !== "Pemilik") {
    answer = { text: refusal(owner), decision: "refusal", citations: [], flags: [] };
    reason = "restricted";
  } else if (topic === "payback") {
    answer = payback(query, await books());
  } else if (topic === "margin") {
    answer = marginPerTindakan(query, await books());
  } else if (topic === "overhead") {
    answer = overhead(await books());
  } else {
    // Not a Keuangan & Aset question after all: answer it from the Sources instead.
    return ask(caller, query);
  }

  const { citations } = answer;
  const auditId = await recordAsk({
    caller,
    question: query,
    retrieved: citations,
    answer,
    reason,
    askedAt,
  });
  return { ...answer, auditId };
}

function unknown(who: string): Omit<Answer, "auditId"> {
  return { text: dontKnow(who), decision: "unknown_routed", citations: [], flags: [] };
}

/** Payback months per Aset named in the query, or every Aset when none is named. */
function payback(query: string, books: Books): Omit<Answer, "auditId"> {
  const named = books.aset.filter((aset) => mentions(query, aset.name));
  const lines: string[] = [];
  const cited: Citation[] = [];
  const dentists = new Set<string>();

  for (const aset of named.length ? named : books.aset) {
    const uses = books.procedures.filter((procedure) => aset.uses.includes(procedure.code));
    const counts = books.counts.filter((count) => aset.uses.includes(count.procedure));
    const perMonth =
      counts.reduce((sum, count) => sum + margin(books, count) * count.count, 0) /
      books.months.length;
    const depreciation = `Penyusutan ${rupiah(aset.price / 96)} per bulan.`;

    if (perMonth > 0) {
      const months = aset.price / perMonth;
      const paidBack = new Date(Date.parse(aset.boughtOn) + months * 30.4375 * 86_400_000);
      lines.push(
        `${aset.name}: Payback ${decimal.format(months)} bulan sejak dibeli ${day(aset.boughtOn)}, balik modal sekitar ${monthYear.format(paidBack)}. ${depreciation}`,
      );
    } else {
      lines.push(
        `${aset.name}: belum ada tindakan yang memakainya pada ${period(books)}. ${depreciation}`,
      );
    }
    cited.push(asetSource(aset, uses), ...uses.map(catalogueSource));
    for (const count of counts) if (count.share > 0) dentists.add(count.dentistId);
  }
  cited.push(...[...dentists].flatMap((id) => books.contracts.get(id) ?? []));
  cited.push(...books.months.map((month) => countsSource(books, month.month)));

  const formula =
    `Rumus: Payback = harga Aset ÷ margin per bulan dari tindakan yang memakainya, dengan rata-rata tindakan ${period(books)}. ` +
    "Margin per Tindakan = tarif − BMHP − fee dokter. " +
    "Penyusutan garis lurus 8 tahun adalah perkiraan; kelompok pajaknya tanyakan ke konsultan pajak/hukum klinik.";
  return answered(lines, formula, cited);
}

/** Margin per Tindakan for each procedure named in the query, or all, per dentist who does it. */
function marginPerTindakan(query: string, books: Books): Omit<Answer, "auditId"> {
  const named = books.procedures.filter((procedure) => mentions(query, procedure.name));
  const lines: string[] = [];
  const cited: Citation[] = [];
  const contracts: Citation[] = [];

  for (const procedure of named.length ? named : books.procedures) {
    const done = books.counts.filter((count) => count.procedure === procedure.code);
    const dentists = [...new Map(done.map((count) => [count.dentistId, count])).values()];
    for (const count of dentists) {
      lines.push(
        `${procedure.name}, ${count.dentist}: ${rupiah(procedure.tariff)} − ${rupiah(procedure.bmhp)} − ${rupiah(fee(procedure, count))} = ${rupiah(margin(books, count))}`,
      );
      const contract = books.contracts.get(count.dentistId);
      if (contract) contracts.push(contract);
    }
    cited.push(catalogueSource(procedure));
  }
  return answered(lines, "Rumus: Margin per Tindakan = tarif − BMHP − fee dokter.", [
    ...cited,
    ...contracts,
  ]);
}

/** Overhead as a share of collections over the last three months, against the 59% reference. */
function overhead(books: Books): Omit<Answer, "auditId"> {
  const spent = books.months.reduce((sum, month) => sum + month.overhead, 0);
  const received = books.months.reduce((sum, month) => sum + month.collections, 0);
  const share = (spent / received) * 100;
  const against = share > 59 ? "di atas" : share < 59 ? "di bawah" : "sama dengan";

  return answered(
    [
      `Overhead ${period(books)}: ${decimal.format(share)}% dari penerimaan (${rupiah(spent)} dari ${rupiah(received)}), ${against} acuan 59%.`,
    ],
    "Rumus: overhead % = overhead ÷ penerimaan. " +
      "Acuan 59% adalah referensi internasional untuk praktik dokter gigi umum (Levin Group, AS), bukan standar Indonesia.",
    books.months.map((month) => ({
      uri: `task://keuangan/${month.month}`,
      dated: monthEnd(month.month),
      text: `Pembukuan ${monthYear.format(new Date(`${month.month}-01`))}: overhead ${rupiah(month.overhead)}, penerimaan ${rupiah(month.collections)}.`,
    })),
  );
}

function answered(lines: string[], formula: string, cited: Citation[]): Omit<Answer, "auditId"> {
  const citations = [...new Map(cited.map((citation) => [citation.uri, citation])).values()];
  return {
    text: [lines.join("\n"), formula, sourceList(citations)].join("\n\n"),
    decision: "answered",
    citations,
    flags: [],
  };
}

/** Tariff minus BMHP minus the dentist's fee, for one procedure done by one dentist. */
function margin(books: Books, count: Count): number {
  const procedure = books.procedures.find(({ code }) => code === count.procedure)!;
  return procedure.tariff - procedure.bmhp - fee(procedure, count);
}

function fee(procedure: Procedure, count: Count): number {
  return Math.round((procedure.tariff * count.share) / 100);
}

/** Whether the query names something, by any word of its name. */
function mentions(query: string, name: string): boolean {
  const text = query.toLowerCase();
  return name
    .toLowerCase()
    .split(" ")
    .some((word) => word.length >= 3 && text.includes(word));
}

function asetSource(aset: Aset, uses: Procedure[]): Citation {
  return {
    uri: `doc://aset/${aset.id}`,
    dated: aset.boughtOn,
    text: `${aset.name} dibeli ${day(aset.boughtOn)} seharga ${rupiah(aset.price)}, dipakai untuk ${uses.map(({ name }) => name).join(", ")}.`,
  };
}

function catalogueSource(procedure: Procedure): Citation {
  return {
    uri: `doc://katalog-tindakan#${procedure.code}`,
    dated: procedure.effectiveOn,
    text: `${procedure.name}: tarif ${rupiah(procedure.tariff)}, BMHP ${rupiah(procedure.bmhp)}.`,
  };
}

function countsSource(books: Books, month: string): Citation {
  const counts = books.counts
    .filter((count) => count.month === month)
    .map((count) => {
      const { name } = books.procedures.find(({ code }) => code === count.procedure)!;
      return `${name} ${count.count} oleh ${count.dentist}`;
    });
  return {
    uri: `task://tindakan/${month}`,
    dated: monthEnd(month),
    text: `Tindakan ${monthYear.format(new Date(`${month}-01`))}: ${counts.join(", ")}.`,
  };
}

/** The months averaged over, such as "Agustus–Oktober 2026". */
function period(books: Books): string {
  const first = new Date(`${books.months[0].month}-01`);
  const last = new Date(`${books.months.at(-1)!.month}-01`);
  const start =
    first.getUTCFullYear() === last.getUTCFullYear()
      ? monthOnly.format(first)
      : monthYear.format(first);
  return `${start}–${monthYear.format(last)}`;
}

function monthEnd(month: string): string {
  const [year, number] = month.split("-").map(Number);
  return new Date(Date.UTC(year, number, 0)).toISOString().slice(0, 10);
}

function rupiah(amount: number): string {
  return `Rp${whole.format(Math.round(amount))}`;
}

const whole = new Intl.NumberFormat("id-ID");
const decimal = new Intl.NumberFormat("id-ID", { maximumFractionDigits: 1 });
const monthYear = new Intl.DateTimeFormat("id-ID", {
  month: "long",
  year: "numeric",
  timeZone: "Asia/Jakarta",
});
const monthOnly = new Intl.DateTimeFormat("id-ID", { month: "long", timeZone: "Asia/Jakarta" });

interface Procedure {
  code: string;
  name: string;
  tariff: number;
  bmhp: number;
  effectiveOn: string;
}

interface Aset {
  id: string;
  name: string;
  price: number;
  boughtOn: string;
  uses: string[];
}

interface Count {
  month: string;
  procedure: string;
  dentistId: string;
  dentist: string;
  /** The dentist's fee as a percentage of the tariff; 0 for the Pemilik. */
  share: number;
  count: number;
}

interface Month {
  month: string;
  overhead: number;
  collections: number;
}

interface Books {
  /** The last three closed months, oldest first. */
  months: Month[];
  procedures: Procedure[];
  /** Procedure counts within those months. */
  counts: Count[];
  aset: Aset[];
  /** Each dentist's fee-share contract, by staff id. */
  contracts: Map<string, Citation>;
}

const LAST_THREE_MONTHS = "SELECT month FROM monthly_books ORDER BY month DESC LIMIT 3";

async function books(): Promise<Books> {
  const db = env.DB;
  const [months, procedures, counts, aset, contracts] = await Promise.all([
    db
      .prepare(`SELECT * FROM monthly_books WHERE month IN (${LAST_THREE_MONTHS}) ORDER BY month`)
      .all<Month>(),
    db
      .prepare(
        "SELECT code, name, tariff, bmhp, effective_on AS effectiveOn FROM procedures ORDER BY rowid",
      )
      .all<Procedure>(),
    db
      .prepare(
        `SELECT c.month, c.procedure, c.dentist_id AS dentistId, staff.name AS dentist,
           coalesce(fee_rules.share_percent, 0) AS share, c.count
         FROM procedure_counts c JOIN staff ON staff.id = c.dentist_id
           LEFT JOIN fee_rules ON fee_rules.dentist_id = c.dentist_id
         WHERE c.month IN (${LAST_THREE_MONTHS}) ORDER BY c.rowid`,
      )
      .all<Count>(),
    db
      .prepare(
        `SELECT id, name, price, bought_on AS boughtOn,
           (SELECT json_group_array(procedure) FROM aset_procedures WHERE aset_id = aset.id) AS uses
         FROM aset ORDER BY rowid`,
      )
      .all<Omit<Aset, "uses"> & { uses: string }>(),
    db
      .prepare(
        "SELECT subject, uri, dated, body AS text FROM sources WHERE uri LIKE 'doc://kontrak/bagi-hasil-%#fee'",
      )
      .all<Citation & { subject: string }>(),
  ]);
  return {
    months: months.results,
    procedures: procedures.results,
    counts: counts.results,
    aset: aset.results.map((row) => ({ ...row, uses: JSON.parse(row.uses) })),
    contracts: new Map(contracts.results.map(({ subject, ...citation }) => [subject, citation])),
  };
}
