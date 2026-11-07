-- Patients, their visits and Rencana Perawatan, dentists' fee rules, and who may see which Source.

CREATE TABLE patients (
  no_rm TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  nik TEXT NOT NULL,
  phone TEXT NOT NULL,
  dentist_id TEXT NOT NULL REFERENCES staff (id),
  wa_opt_in_at TEXT
) STRICT;

CREATE TABLE visits (
  patient_no TEXT NOT NULL REFERENCES patients (no_rm),
  n INTEGER NOT NULL,
  dentist_id TEXT NOT NULL REFERENCES staff (id),
  assistant_id TEXT REFERENCES staff (id),
  visited_at TEXT NOT NULL,
  notes TEXT NOT NULL,
  rencana_tindak_lanjut_on TEXT,
  PRIMARY KEY (patient_no, n)
) STRICT;

CREATE TABLE rencana_perawatan (
  patient_no TEXT NOT NULL REFERENCES patients (no_rm),
  treatment TEXT NOT NULL,
  total_visits INTEGER NOT NULL,
  completed_visits INTEGER NOT NULL,
  PRIMARY KEY (patient_no, treatment)
) STRICT;

-- A Dokter Gigi Mitra's share of the tariff for each procedure they perform.
CREATE TABLE fee_rules (
  dentist_id TEXT PRIMARY KEY REFERENCES staff (id),
  share_percent INTEGER NOT NULL
) STRICT;

-- area: NULL is open to every Role; 'clinical' and 'finance' are Restricted (see GLOSSARY.md).
-- subject: the one patient (lower-case no RM) or dentist (lower-case first name) a Source is about;
-- such a Source only answers a question that names its subject.
ALTER TABLE sources ADD COLUMN area TEXT CHECK (area IN ('clinical', 'finance'));
ALTER TABLE sources ADD COLUMN subject TEXT;

-- Staff other than the Pemilik who may see a Restricted Source: the patient's dentist, the
-- assisting TGM, or the dentist a fee Source is about.
CREATE TABLE source_access (
  uri TEXT NOT NULL REFERENCES sources (uri),
  staff_id TEXT NOT NULL REFERENCES staff (id),
  PRIMARY KEY (uri, staff_id)
) STRICT;

-- Why a Refusal was given. Only the Jejak Audit holds it; the asker never sees it.
ALTER TABLE jejak_audit ADD COLUMN reason TEXT CHECK (reason IN ('restricted', 'not_found'));
