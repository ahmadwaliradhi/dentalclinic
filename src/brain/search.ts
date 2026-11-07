import { env } from "cloudflare:workers";
import type { Guard } from "./access";

export interface Chunk {
  uri: string;
  /** When the Source was issued, sent or logged, as UTC ISO 8601. */
  dated: string;
  text: string;
}

const STOPWORDS = words(
  "apa apakah berapa kapan siapa mana bagaimana gimana yang dan atau untuk dari pada ini itu ada saya kami kita anda bisa tolong mohon dong sih drg the what when where who how does are",
);

/** The patients (by no RM) and dentists (by first name) a question names, lower-cased. */
export function subjects(question: string): string[] {
  const patients = question.match(/\bP-\d{4}\b/gi) ?? [];
  const dentists = [...question.matchAll(/\bdrg\.?\s+(\p{L}+)/giu)].map((match) => match[1]);
  return [...patients, ...dentists].map((subject) => subject.toLowerCase());
}

/**
 * The Sources the guard lets through that match the most of the question's keywords, at least
 * half of them, best first, up to five. A Source about one patient or dentist only matches a
 * question that names them.
 */
export async function search(question: string, guard: Guard): Promise<Chunk[]> {
  const keywords = [...words(question)].filter((word) => word.length > 2 && !STOPWORDS.has(word));
  if (keywords.length === 0) return [];

  const { results } = await env.DB.prepare(
    `SELECT sources.uri, sources.dated, sources.body AS text
     FROM source_search JOIN sources USING (uri)
     WHERE source_search MATCH ?
       AND (sources.subject IS NULL OR sources.subject IN (SELECT value FROM json_each(?)))
       AND (${guard.sql})
     ORDER BY source_search.rank LIMIT 20`,
  )
    .bind(
      keywords.map((keyword) => `"${keyword}"`).join(" OR "),
      JSON.stringify(subjects(question)),
      ...guard.params,
    )
    .all<Chunk>();

  // bm25 alone favours a short chunk with one rare word, so count keywords matched first.
  const matched = (chunk: Chunk) =>
    keywords.filter((keyword) => words(chunk.text).has(keyword)).length;
  const best = Math.max(0, ...results.map(matched));
  if (best * 2 < keywords.length) return [];
  return results.filter((chunk) => matched(chunk) === best).slice(0, 5);
}

function words(text: string): Set<string> {
  return new Set(text.toLowerCase().match(/[\p{L}\p{N}]+/gu));
}
