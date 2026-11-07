# Klinik Brain

A staff-facing agent for an Indonesian dental clinic that answers questions with sources, respects who may see what, and proposes actions that a human approves.

## Product

**Klinik Brain**:
The agent staff talk to (through WorkBuddy) to ask about the clinic and to request actions.
_Avoid_: chatbot, assistant, ERP, clinic management system

**Knowledge Domain**:
One of three bodies of clinic data the Klinik Brain answers over: Pasien & Recall, Keuangan & Aset, Dokter & Jadwal.
_Avoid_: module, pillar, feature

**Demo Login**:
One-click sign-in as a seeded staff member, so visitors can see the clinic through each Role without an account.
_Avoid_: guest mode, test account

## Keuangan & Aset

**Aset**:
A piece of clinic equipment bought as an investment, such as a dental unit or X-ray, linked to the procedures that use it.
_Avoid_: asset (in UI copy), equipment, inventory

**Payback**:
The number of months until an Aset's purchase cost is recovered from the margin of the procedures that use it.
_Avoid_: ROI (unqualified), break-even

**Margin per Tindakan**:
A procedure's tariff minus its consumables (BMHP) and the dentist's fee.
_Avoid_: profit, HPP

**Overhead %**:
The clinic's overhead divided by the money it collected over the last three closed months, set against the 59% international reference for general practice.
_Avoid_: cost ratio, expense rate

## People

**Role**:
The access level a staff member holds; one of Pemilik, Dokter Gigi Mitra, TGM, Front Office.
_Avoid_: user type, permission group

**Pemilik**:
The clinic owner, who is also the dentist in charge (drg. PJ); may see all clinic data including every dentist's fees.
_Avoid_: admin, owner, drg. PJ (as a separate role)

**Dokter Gigi Mitra**:
A dentist who practises at the clinic under a fee-share agreement; sees only their own patients and their own fees.
_Avoid_: associate, doctor, drg. (as a role name)

**SIP**:
Surat Izin Praktik, a dentist's five-year licence to practise at one clinic; the Klinik Brain warns from 90 days before it ends.
_Avoid_: license, izin (unqualified), STR (which is lifelong)

**TGM**:
Terapis Gigi dan Mulut; sees records of cases they assisted, stock, and sterilisation logs, never finance.
_Avoid_: nurse, assistant, perawat gigi

**Front Office**:
Reception and cashier staff; sees schedules, masked contact details, tariffs and SOPs, never clinical notes or finance.
_Avoid_: kasir, resepsionis, admin (as separate roles)

## Pasien & Recall

**Recall**:
Bringing a patient back for treatment that is unfinished or whose follow-up date has passed.
_Avoid_: reminder, follow-up, kontrol (when meaning the outreach itself)

**Rencana Perawatan**:
A planned course of treatment for one patient that may span several visits, such as a root-canal treatment (PSA).
_Avoid_: treatment plan (in UI copy), case

**Rencana Tindak Lanjut**:
The follow-up date or instruction a dentist writes into a visit record.
_Avoid_: next appointment, kontrol date

**Due for Recall**:
A patient whose Rencana Perawatan has remaining visits and no visit for more than 14 days, or whose Rencana Tindak Lanjut date has passed with no visit booked.
_Avoid_: overdue, lapsed, inactive patient

**WA Opt-in**:
A patient's separately recorded, timestamped consent to be contacted by the clinic on WhatsApp; without it no Recall Message is drafted.
_Avoid_: consent (unqualified), subscription

## Accountability

**Identity Pairing**:
Linking one staff member's WorkBuddy to the clinic with a short-lived code they confirm while logged in, so the Klinik Brain knows their Role.
_Avoid_: login, API key setup

**Proposal**:
An action the Klinik Brain has prepared but may not carry out until a human with the right Role accepts it; expires after 24 hours.
_Avoid_: draft, request, task, pending action

**Recall Message**:
A Proposal containing a WhatsApp message text for one Due for Recall patient, with no clinical detail; a human sends it after acceptance.
_Avoid_: reminder, notification, broadcast

**Stok Opname Request**:
A Proposal asking staff to physically count an item whose recorded stock and reported stock disagree.
_Avoid_: stock adjustment, reorder

**Approval Decision**:
A human's accept or decline of a Proposal; expiry without a decision counts as declined.
_Avoid_: confirmation, sign-off

**Restricted**:
Data that exists but the asking Role may not see: clinical notes for Front Office, another dentist's patients or fees, and clinic-wide Keuangan & Aset figures, for a Dokter Gigi Mitra, finance for TGM and Front Office, and unmasked NIK for anyone.
_Avoid_: private, hidden, forbidden

**Source**:
A single clinic record the Klinik Brain cites: a medical record entry (emr), a document such as an SOP or tariff list (doc), a log entry such as a sterilisation, stock count or month's books (task), or a WhatsApp group message (chat).
_Avoid_: reference, document (for all types), evidence

**Source Conflict**:
Two Sources that disagree on the same fact; the higher-authority one wins (emr, then doc, then task, then Pemilik chat, then staff chat), except that a newer Pemilik chat overrides an older doc.
_Avoid_: inconsistency, discrepancy

**Injection Flag**:
A sentence in a retrieved Source that reads as an instruction to the Klinik Brain; it is reported and logged in the Jejak Audit, never cited or followed.
_Avoid_: alert, warning, prompt injection (in UI copy)

**Topic Owner**:
The person the Klinik Brain names when it cannot answer a question in a given area.
_Avoid_: contact person, escalation, PIC

**Jejak Audit**:
The append-only record of every question, the Sources retrieved, the answer or Refusal given, and every Approval Decision.
_Avoid_: log, history, activity feed

**Refusal**:
The single fixed reply given both for Restricted data and for data that does not exist, so the asker cannot tell which; also given to requests for the Klinik Brain's own instructions.
_Avoid_: error, access denied, not found
