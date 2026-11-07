import { env } from "cloudflare:workers";

export interface Chunk {
  uri: string;
  /** When the Source was issued, sent or logged, as UTC ISO 8601. */
  dated: string;
  text: string;
}

const STOPWORDS = words(
  "apa apakah berapa kapan siapa mana bagaimana gimana yang dan atau untuk dari pada ini itu ada saya kami kita anda bisa tolong mohon dong sih the what when where who how does are",
);

/** Up to five Sources matching at least half the question's keywords, best match first. */
export async function search(question: string): Promise<Chunk[]> {
  const keywords = [...words(question)].filter((word) => word.length > 2 && !STOPWORDS.has(word));
  if (keywords.length === 0) return [];

  const { results } = await env.DB.prepare(
    "SELECT sources.uri, sources.dated, sources.body AS text FROM source_search JOIN sources USING (uri) WHERE source_search MATCH ? ORDER BY source_search.rank LIMIT 20",
  )
    .bind(keywords.map((keyword) => `"${keyword}"`).join(" OR "))
    .all<Chunk>();

  // bm25 alone favours a short chunk with one rare word, so count keywords matched first.
  const matched = (chunk: Chunk) =>
    keywords.filter((keyword) => words(chunk.text).has(keyword)).length;
  return results
    .filter((chunk) => matched(chunk) * 2 >= keywords.length)
    .sort((a, b) => matched(b) - matched(a))
    .slice(0, 5);
}

function words(text: string): Set<string> {
  return new Set(text.toLowerCase().match(/[\p{L}\p{N}]+/gu));
}
