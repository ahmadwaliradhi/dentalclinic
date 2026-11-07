/** Who to ask about each area when no Source answers, checked in order. */
const TOPIC_OWNERS: [RegExp, string][] = [
  [/pajak|hukum|legal/, "konsultan pajak/hukum klinik"],
  [/stok|steril|autoclave|bahan|bmhp/, "Tari"],
  [/jadwal|janji|dokter|cuti|\bsip\b/, "Nina"],
];

/**
 * The Topic Owner for a question's area, or null for Pasien & Recall, Keuangan & Aset and
 * anything unplaced, which go to the Pemilik.
 */
export function topicOwner(question: string): string | null {
  const text = question.toLowerCase();
  return TOPIC_OWNERS.find(([area]) => area.test(text))?.[1] ?? null;
}
