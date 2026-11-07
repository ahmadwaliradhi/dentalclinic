import { env } from "cloudflare:workers";
import { visibleTo } from "./access";
import { STOCK } from "./conflict";
import { propose } from "./proposals";
import type { Staff } from "./staff";

// Stok Opname Request, as defined in GLOSSARY.md: when recorded and reported stock disagree, the
// Klinik Brain asks for a physical count. It never proposes a reorder and never changes stock.

/**
 * A Stok Opname Request for a stock card item, named in any case, whose Sources disagree on its
 * stock and that has no undecided request yet.
 */
export async function proposeStokOpname(caller: Staff, item: string, now = new Date()) {
  const filter = visibleTo(caller);
  const { results } = await env.DB.prepare(
    `SELECT stock_items.item, sources.uri, sources.body AS text
     FROM stock_items JOIN sources ON sources.fact = ? || stock_items.item
     WHERE stock_items.item = ? COLLATE NOCASE AND (${filter.sql})
     ORDER BY sources.dated`,
  )
    .bind(STOCK, item, ...filter.params)
    .all<{ item: string; uri: string; text: string }>();

  // Two Sources on one stock count are a disagreement; fewer leave nothing to count.
  if (results.length < 2)
    return { text: `Tidak ada Source yang berbeda tentang stok ${item}.`, proposal: null };

  const named = results[0].item;
  const proposed = await propose(
    caller,
    { kind: "stok_opname", item: named },
    {
      text: [`Hitung fisik ${named}.`, ...results.map((source) => source.text)].join(" "),
      cited: results.map((source) => source.uri),
      filter,
    },
    now,
  );
  return {
    text: proposed
      ? `Stok Opname Request ${named} menunggu persetujuan di halaman Persetujuan.`
      : `Stok Opname Request ${named} sudah menunggu persetujuan.`,
    proposal: proposed && { ...proposed, item: named },
  };
}
