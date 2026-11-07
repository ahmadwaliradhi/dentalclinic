# Scope decisions, 2026-11-07

Input for specs and tickets. Vocabulary follows `GLOSSARY.md`; architecture rationale is in `docs/adr/`.

## Product

- Product: **DentalClinic Brain**, live at `dentalclinic.web.id` (Cloudflare zone; fallback `*.workers.dev`). No other domain or repository is touched.
- Gallery title: "DentalClinic Brain: Tahu Untung, Tahu Batas".
- The Klinik Brain answers over three Knowledge Domains: Pasien & Recall, Keuangan & Aset, Dokter & Jadwal. No ERP create/edit screens (ADR 0002).
- Hero flow: Recall of unfinished treatment. Keuangan & Aset is the business-value beat. Dokter & Jadwal appears mainly as a permission boundary (fees, SIP expiry).
- Staff use the Klinik Brain only through WorkBuddy. The site has no chat (ADR 0001).
- Answers follow the language of the question. The site is Indonesian only. Expert package text is bilingual as WorkBuddy requires.

## Agents

- Fast single Expert **Dira Cepat**: built first, used for the 90-second live test and most evidence runs.
- Expert Team, built second from the same MCP tools: **Dira** (lead), **Sari** (Pasien & Recall), **Bima** (Keuangan & Aset), **Wulan** (compliance reviewer, max 3 review cycles).

## Fictional clinic (seed)

Klinik Gigi Senyum Sejahtera, a klinik pratama in Depok, about 40 patients.

| Person | Role |
|---|---|
| drg. Rina | Pemilik (also drg. PJ) |
| drg. Andi | Dokter Gigi Mitra (umum) |
| drg. Maya Sp.Ort | Dokter Gigi Mitra (ortodonti) |
| Tari | Perawat Gigi |
| Nina | Front Office |

Topic Owners: Pasien & Recall and Keuangan & Aset go to drg. Rina; Dokter & Jadwal goes to Nina; stock and sterilisation go to Tari; tax and legal questions go to an external consultant ("konsultan pajak/hukum klinik").

Seeded situations: a scaling tariff conflict (2024 tariff list Rp150k vs a newer Pemilik chat at Rp200k); a stock conflict (stock card says 4, Perawat Gigi chat says "tinggal 1"); one SOP with an embedded injection instruction; a non-existent patient and a non-existent dentist for Refusal equality; one already-expired Proposal; three Aset (dental unit Rp45M, scaler ultrasonik Rp8M, panoramic X-ray Rp180M) linked to procedures; SIP expiry dates, with one under 90 days.

## Identity and access

- Identity comes from Identity Pairing, never from chat text. The staff member logs in on the site and confirms an 8-character code valid for 10 minutes. The token is bound to that staff member, has scope `read` + `propose`, and lasts 90 days. A demo role switch means re-pairing and starting a New Task.
- Four Roles; what each one may not see is defined under Restricted in the glossary. Restricted data and non-existent data get the identical Refusal.
- Demo Login: one-click sign-in as each seeded staff member. A nightly cron resets the seed. There is no real sign-up.
- Jejak Audit: the Pemilik sees every row, including the true reason behind a Refusal. Every other Role sees only their own rows, with no reason code.

## Accountability rules

- Sources: emr, doc, task, chat. Source Conflict resolution is as defined in the glossary. A conflict answer cites both Sources and says which one it relied on.
- When there is no answer, the reply is "saya tidak tahu" plus the Topic Owner. Tax grouping of an Aset is always "saya tidak tahu".
- NIK and phone numbers are masked before any text reaches the model.
- Proposal types: **Recall Message** and **Stok Opname Request** only. They expire after 24 hours. The agent never sends anything. On acceptance, the approvals inbox shows the final text and a `wa.me` link that a human taps. No WhatsApp Business API.
- Due for Recall: a Rencana Perawatan with remaining visits and more than 14 days since the last visit, or a Rencana Tindak Lanjut date that has passed. Patients without WA Opt-in are listed but get no draft. No generic 6-monthly recall.
- Out of scope; these go on the accountability sheet as roadmap or "never": record correction after 2x24 h, treatment-plan scheduling, PII reveal, deleting records, SATUSEHAT, BPJS.

## Keuangan & Aset

Payback months per Aset; Margin per Tindakan; overhead % against a 59% international reference. Depreciation is straight-line over 8 years with a caveat. No reorder logic beyond the Stok Opname conflict. Keuangan & Aset answers are for the Pemilik only, since they show every dentist's fees. Payback uses today's tariffs and the last three closed months' volumes. STR is lifelong under UU 17/2023, so only the SIP carries an expiry date.

## Tech

TanStack Start on Cloudflare Workers, D1 with FTS5 keyword retrieval (no Vectorize), shadcn/ui on Tailwind, oxlint + oxfmt, a remote MCP endpoint on the same Worker.

## Tests

Research matrix T01–T25 with two edits: T25 becomes "SIP drg. Andi habis kapan?" (answered with a Source, plus a warning under 90 days), and T12 uses the seeded expired Proposal. The engine has automated tests (Vitest). Every case is also run in WorkBuddy and screenshotted. Failures are reported.

## Site

Sections: hero with launch link and zip; Demo Login strip; meet the team; three principles (sumber, izin, jejak); accountability sheet; test results including failures; architecture image; embedded video; pairing quick start; FAQ; footer. No pricing, testimonials or client logos.

## Process

- WorkBuddy writes all code from tickets. Planning documents are not code.
- Tickets are GitHub issues in `ahmadwaliradhi/dentalclinic` (public).
- WorkBuddy works on a branch per ticket or batch, pushes it, and opens a PR. The owner merges on GitHub. Nobody pushes directly to `main`.
- `docs/research/` stays untracked and local only.
- Submit the form by 22:30 WIB.

## Cut order if behind (first cut first)

1. Expert Team (keep Dira Cepat)
2. Stok Opname Request
3. Identity Pairing (fall back to 4 static tokens)
4. Payback per Aset (keep Margin per Tindakan)
5. Custom domain (fall back to workers.dev)

Never cut: Refusal equality, masking, Jejak Audit, Recall Message approval, the test results table, form submission.
