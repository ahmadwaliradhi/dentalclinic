import { recordAsk } from "./jejak-audit";
import { search } from "./search";
import type { Chunk } from "./search";
import type { Staff } from "./staff";

export type Decision = "answered" | "refusal" | "unknown_routed";

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

/** Answers from clinic Sources and records the question in the Jejak Audit. */
export async function ask(caller: Staff, question: string): Promise<Answer> {
  const askedAt = new Date().toISOString();
  const retrieved = await search(question);
  const citations = grounded(retrieved.slice(0, 1), retrieved);
  const answer = citations.length
    ? { text: render(citations), decision: "answered" as const, citations }
    : { text: "Saya tidak tahu.", decision: "unknown_routed" as const, citations };

  const auditId = await recordAsk({ caller, question, retrieved, answer, askedAt });
  return { ...answer, auditId };
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
