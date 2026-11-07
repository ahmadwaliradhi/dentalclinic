import type { Staff } from "./staff";

/** The one reply for Restricted and for absent data, so the asker cannot tell which. */
export function refusal(owner: Staff): string {
  return `Saya tidak menemukan informasi yang dapat saya tampilkan untuk permintaan ini. Jika Anda yakin data ini ada, hubungi ${owner.name}.`;
}

/** The reply when no Source answers, naming who to ask instead. */
export function dontKnow(who: string): string {
  return `Saya tidak tahu. Tanyakan ke ${who}.`;
}

/** The numbered footer of an answer: one line per cited Source, dated in WIB. */
export function sourceList(cited: { uri: string; dated: string }[]): string {
  return cited.map(({ uri, dated }, i) => `[${i + 1}] ${uri} (${day(dated)})`).join("\n");
}

/** A date such as "3 Agustus 2026", in WIB. */
export function day(iso: string): string {
  return longDate.format(new Date(iso));
}

const longDate = new Intl.DateTimeFormat("id-ID", { dateStyle: "long", timeZone: "Asia/Jakarta" });
