import type { Chunk } from "./search";

export interface Overruled {
  chunk: Chunk;
  by: Chunk;
}

/**
 * Splits Sources into those relied on, those a higher-authority Source on the same fact overrules,
 * and stock counts that disagree: no Source wins those, only a physical count does.
 */
export function resolve(chunks: Chunk[]): {
  relied: Chunk[];
  overruled: Overruled[];
  disputed: Chunk[][];
} {
  const relied: Chunk[] = [];
  const overruled: Overruled[] = [];
  const disputed: Chunk[][] = [];
  for (const chunk of chunks) {
    const rivals = chunks.filter((other) => other === chunk || sameFact(other, chunk));
    if (rivals.length > 1 && stockItem(chunk)) {
      if (rivals[0] === chunk) disputed.push(rivals);
      continue;
    }
    // One winner per fact, so the outcome never depends on which rival is looked at first.
    const winner = rivals.reduce((best, other) => (wins(other, best) ? other : best));
    if (winner === chunk) relied.push(chunk);
    else overruled.push({ chunk, by: winner });
  }
  return { relied, overruled, disputed };
}

/** The stock card item a Source counts, from a fact key such as 'stok/Masker medis', or null. */
export function stockItem(chunk: Chunk): string | null {
  return chunk.fact?.startsWith(STOCK) ? chunk.fact.slice(STOCK.length) : null;
}

/** The fact key prefix of a stock count. */
export const STOCK = "stok/";

/** Why `winner` beats `loser`, referring to the loser as `loserRef`. */
export function because(winner: Chunk, loser: Chunk, loserRef: string): string {
  if (overrides(winner, loser)) {
    return `${label(winner)} lebih baru dari ${label(loser)}, jadi ${loserRef} sudah tidak berlaku`;
  }
  if (authority(winner) !== authority(loser)) {
    return `${label(winner)} lebih diutamakan dari ${label(loser)}`;
  }
  return "lebih baru";
}

/** Two Sources stating the same fact: a Source Conflict when they disagree. */
export function sameFact(a: Chunk, b: Chunk): boolean {
  return a.fact !== null && a.fact === b.fact;
}

/** The Source kind from its URI scheme: emr, doc, task or chat. */
export function kindOf(chunk: Chunk): string {
  return chunk.uri.split("://")[0];
}

function wins(a: Chunk, b: Chunk): boolean {
  if (overrides(a, b)) return true;
  if (overrides(b, a)) return false;
  return authority(a) === authority(b) ? a.dated > b.dated : authority(a) > authority(b);
}

/** A newer Pemilik chat overrides an older doc. */
function overrides(a: Chunk, b: Chunk): boolean {
  return isPemilikChat(a) && kindOf(b) === "doc" && a.dated > b.dated;
}

const AUTHORITY: Record<string, number> = { emr: 5, doc: 4, task: 3 };
const LABEL: Record<string, string> = { emr: "rekam medis", doc: "dokumen", task: "catatan tugas" };

/** emr, then doc, then task, then Pemilik chat, then staff chat. */
function authority(chunk: Chunk): number {
  return isPemilikChat(chunk) ? 2 : (AUTHORITY[kindOf(chunk)] ?? 1);
}

function label(chunk: Chunk): string {
  return isPemilikChat(chunk) ? "pesan Pemilik" : (LABEL[kindOf(chunk)] ?? "pesan staf");
}

function isPemilikChat(chunk: Chunk): boolean {
  return kindOf(chunk) === "chat" && chunk.authorRole === "Pemilik";
}
