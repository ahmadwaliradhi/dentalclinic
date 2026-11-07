import { env } from "cloudflare:workers";
import type { Answer, Reason } from "./ask";
import { mask } from "./mask";
import type { Chunk } from "./search";
import type { Staff } from "./staff";

interface AskEntry {
  caller: Staff;
  question: string;
  retrieved: Chunk[];
  answer: Omit<Answer, "auditId">;
  reason: Reason | null;
  askedAt: string;
}

/** Appends one Jejak Audit row and returns its id. */
export async function recordAsk({
  caller,
  question,
  retrieved,
  answer,
  reason,
  askedAt,
}: AskEntry) {
  const id = await env.DB.prepare(
    `INSERT INTO jejak_audit (staff_id, role, question, retrieved, cited, answer, decision, reason, flags, asked_at, answered_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?) RETURNING id`,
  )
    .bind(
      caller.id,
      caller.role,
      mask(question),
      JSON.stringify(retrieved.map((chunk) => chunk.uri)),
      JSON.stringify(answer.citations.map((citation) => citation.uri)),
      answer.text,
      answer.decision,
      reason,
      JSON.stringify(answer.flags),
      askedAt,
      new Date().toISOString(),
    )
    .first<number>("id");
  if (id === null) throw new Error("Jejak Audit insert returned no id");
  return id;
}
