import { mask } from "./mask";
import type { Chunk } from "./search";

export interface InjectionFlag {
  uri: string;
  /** The instruction-like sentence, quoted from the Source with identity data masked. */
  text: string;
}

const INSTRUCTION = [
  /\b(abaikan|lupakan|ignore|disregard|forget)\b.*\b(instruksi|perintah|aturan|sebelumnya|instructions?|rules|previous)\b/i,
  /\b(kirim|kirimkan|bocorkan|send|forward)\b.*(@|https?:\/\/|\d{4})/i,
  /system prompt|you are now|kamu sekarang adalah/i,
];

/** Sentence boundaries, not counting the dot in titles such as "drg. Rina". */
const SENTENCE_END = /(?<!\b(?:drg|dr|Sp|No))(?<=[.!?])\s+/;

export function sentences(text: string): string[] {
  return text.split(SENTENCE_END);
}

/** Removes instruction-like sentences from retrieved Sources, flagging each one. */
export function screen(chunks: Chunk[]): { chunks: Chunk[]; flags: InjectionFlag[] } {
  const flags: InjectionFlag[] = [];
  const clean = chunks.flatMap((chunk) => {
    const kept = sentences(chunk.text).filter((sentence) => {
      const flagged = INSTRUCTION.some((pattern) => pattern.test(sentence));
      if (flagged) flags.push({ uri: chunk.uri, text: mask(sentence) });
      return !flagged;
    });
    return kept.length ? [{ ...chunk, text: kept.join(" ") }] : [];
  });
  return { chunks: clean, flags };
}

/** A question asking for the Klinik Brain's own prompt or instructions. */
export function asksForPrompt(question: string): boolean {
  return /system prompt|prompt[- ]?(sistem|mu|kamu|anda)|(instruksi|aturan) (sistem|kamu|anda)|(your|system) (instructions|rules)/i.test(
    question,
  );
}
