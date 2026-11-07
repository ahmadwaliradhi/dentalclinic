import { EVERYTHING, visibleTo } from "./access";
import { recordAsk } from "./jejak-audit";
import { mask } from "./mask";
import { search, subjects } from "./search";
import type { Chunk } from "./search";
import { pemilik } from "./staff";
import type { Staff } from "./staff";

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
  auditId: number;
}

/** Answers from the Sources the caller may see and records the question in the Jejak Audit. */
export async function ask(caller: Staff, question: string): Promise<Answer> {
  const askedAt = new Date().toISOString();
  // Every step runs for every question, so Restricted and absent data take the same path.
  const [retrieved, withheld, owner] = await Promise.all([
    search(question, visibleTo(caller)),
    search(question, EVERYTHING),
    pemilik(),
  ]);
  const citations = grounded(retrieved, retrieved);

  let answer: Omit<Answer, "auditId">;
  let reason: Reason | null = null;
  if (citations.length) {
    answer = { text: render(citations), decision: "answered", citations };
  } else if (subjects(question).length) {
    // Decided from the question alone, so the reply cannot reveal whether withheld data exists.
    answer = { text: refusal(owner), decision: "refusal", citations: [] };
    reason = withheld.length ? "restricted" : "not_found";
  } else {
    answer = { text: "Saya tidak tahu.", decision: "unknown_routed", citations: [] };
  }

  // Identity data never leaves the engine unmasked.
  answer = {
    ...answer,
    text: mask(answer.text),
    citations: answer.citations.map((citation) => ({ ...citation, text: mask(citation.text) })),
  };

  const auditId = await recordAsk({ caller, question, retrieved, answer, reason, askedAt });
  return { ...answer, auditId };
}

/** The one reply for Restricted and for absent data, so the asker cannot tell which. */
function refusal(owner: Staff): string {
  return `Saya tidak menemukan informasi yang dapat saya tampilkan untuk permintaan ini. Jika Anda yakin data ini ada, hubungi ${owner.name}.`;
}

/** Drops any citation whose text is not in the retrieved chunk it names. */
function grounded(citations: Citation[], retrieved: Chunk[]): Citation[] {
  return citations.filter((citation) =>
    retrieved.some((chunk) => chunk.uri === citation.uri && chunk.text.includes(citation.text)),
  );
}

const date = new Intl.DateTimeFormat("id-ID", { dateStyle: "long", timeZone: "Asia/Jakarta" });

/** The answer is made only of cited text, each claim numbered to its dated Source. */
function render(citations: Citation[]): string {
  const claims = citations.map((citation, i) => `${citation.text} [${i + 1}]`).join(" ");
  const sources = citations
    .map((citation, i) => `[${i + 1}] ${citation.uri} (${date.format(new Date(citation.dated))})`)
    .join("\n");
  return `${claims}\n\n${sources}`;
}
