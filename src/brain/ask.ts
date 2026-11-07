import { EVERYTHING, visibleTo } from "./access";
import { because, resolve, stockItem } from "./conflict";
import { asksForPrompt, screen, sentences } from "./injection";
import type { InjectionFlag } from "./injection";
import { recordAsk } from "./jejak-audit";
import { kpi, kpiTopic } from "./kpi";
import { mask } from "./mask";
import { dontKnow, refusal, sourceList } from "./reply";
import { search, subjects } from "./search";
import type { Chunk } from "./search";
import { pemilik } from "./staff";
import type { Staff } from "./staff";
import { topicOwner } from "./topic-owner";

export type Decision = "answered" | "refusal" | "unknown_routed";

/** Why a Refusal was given. Recorded in the Jejak Audit, never shown to the asker. */
export type Reason = "restricted" | "not_found";

export interface Citation {
  uri: string;
  dated: string;
  text: string;
}

export interface Answer {
  /** Final text, rendered verbatim by the Expert. */
  text: string;
  decision: Decision;
  citations: Citation[];
  /** Instruction-like sentences found in retrieved Sources and not followed. */
  flags: InjectionFlag[];
  auditId: number;
}

/** Answers from the Sources the caller may see and records the question in the Jejak Audit. */
export async function ask(caller: Staff, question: string): Promise<Answer> {
  if (kpiTopic(question)) return kpi(caller, question);

  const askedAt = new Date().toISOString();
  const filter = visibleTo(caller);
  // Every step runs for every question, so Restricted and absent data take the same path.
  const [retrieved, withheld, owner] = await Promise.all([
    search(question, filter),
    search(question, EVERYTHING),
    pemilik(),
  ]);
  const composed = compose(question, retrieved, owner);
  const refused = {
    ...composed,
    text: refusal(owner),
    decision: "refusal" as const,
    citations: [],
  };

  let answer = composed;
  let reason: Reason | null = null;
  if (asksForPrompt(question)) {
    answer = refused;
    reason = "restricted";
  } else if (composed.decision === "unknown_routed" && subjects(question).length) {
    // Decided from the question alone, so the reply cannot reveal whether withheld data exists.
    answer = refused;
    reason = withheld.length ? "restricted" : "not_found";
  }

  // Identity data never leaves the engine unmasked.
  answer = {
    ...answer,
    text: mask(answer.text),
    citations: answer.citations.map((citation) => ({ ...citation, text: mask(citation.text) })),
  };

  const auditId = await recordAsk({ caller, filter, question, retrieved, answer, reason, askedAt });
  return { ...answer, auditId };
}

/** An answer made only of cited text, numbered to dated Sources, siding with authority on a Source Conflict. */
function compose(question: string, retrieved: Chunk[], owner: Staff): Omit<Answer, "auditId"> {
  const { chunks, flags } = screen(retrieved);
  const { relied, overruled, disputed } = resolve(grounded(chunks, retrieved));
  const cited = [...relied, ...overruled.map(({ chunk }) => chunk), ...disputed.flat()];
  const ref = (chunk: Chunk) => `[${cited.indexOf(chunk) + 1}]`;

  const body = cited.length
    ? [
        relied.map((chunk) => `${chunk.text} ${ref(chunk)}`).join(" "),
        ...overruled.map(
          ({ chunk, by }) =>
            `Berbeda dengan ${ref(chunk)}: ${chunk.text} Saya memakai ${ref(by)} karena ${because(by, chunk, ref(chunk))}.`,
        ),
        // Never a reorder: a disagreement on stock only ever leads to a count.
        ...disputed.map((counts) =>
          [
            `Stok ${stockItem(counts[0])} tidak pasti: ${counts.map(ref).join(" dan ")} berbeda.`,
            ...counts.map((chunk) => `${chunk.text} ${ref(chunk)}`),
            "Hanya hitung fisik yang memastikan; minta saya mengajukan Stok Opname Request.",
          ].join(" "),
        ),
      ]
    : [dontKnow(topicOwner(question) ?? owner.name)];
  const expiring = cited.flatMap((chunk) => {
    const days = daysUntil(chunk.expiresOn);
    if (days === null || days >= 90) return [];
    return [
      `Peringatan: ${ref(chunk)} ${days < 0 ? "sudah berakhir" : `berakhir dalam ${days} hari`}.`,
    ];
  });
  const warnings = [
    ...expiring,
    ...flags.map(({ uri, text }) => `Instruksi di ${uri} tidak saya ikuti: "${text}"`),
  ];
  const sources = sourceList(cited);

  return {
    text: [...body, ...warnings, sources].filter(Boolean).join("\n\n"),
    decision: cited.length ? "answered" : "unknown_routed",
    citations: cited.map(({ uri, dated, text }) => ({ uri, dated, text })),
    flags,
  };
}

/** Drops any chunk with a sentence not found in the retrieved Source it names. */
function grounded(chunks: Chunk[], retrieved: Chunk[]): Chunk[] {
  return chunks.filter((chunk) =>
    retrieved.some(
      (source) =>
        source.uri === chunk.uri &&
        sentences(chunk.text).every((sentence) => source.text.includes(sentence)),
    ),
  );
}

/** Whole days from today in WIB to a YYYY-MM-DD date, or null without one. */
function daysUntil(date: string | null): number | null {
  if (!date) return null;
  const today = new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Jakarta" });
  return Math.round((Date.parse(date) - Date.parse(today)) / 86_400_000);
}
