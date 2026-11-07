-- Keuangan & Aset: the procedure catalogue, each Aset and the procedures that use it, monthly
-- procedure counts per dentist, and the monthly books. Amounts are whole rupiah.

CREATE TABLE procedures (
  code TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  tariff INTEGER NOT NULL,
  bmhp INTEGER NOT NULL,
  effective_on TEXT NOT NULL
) STRICT;

CREATE TABLE aset (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  price INTEGER NOT NULL,
  bought_on TEXT NOT NULL
) STRICT;

CREATE TABLE aset_procedures (
  aset_id TEXT NOT NULL REFERENCES aset (id),
  procedure TEXT NOT NULL REFERENCES procedures (code),
  PRIMARY KEY (aset_id, procedure)
) STRICT;

-- month is YYYY-MM.
CREATE TABLE procedure_counts (
  month TEXT NOT NULL,
  procedure TEXT NOT NULL REFERENCES procedures (code),
  dentist_id TEXT NOT NULL REFERENCES staff (id),
  count INTEGER NOT NULL,
  PRIMARY KEY (month, procedure, dentist_id)
) STRICT;

-- One row per closed month. collections is the money actually received.
CREATE TABLE monthly_books (
  month TEXT PRIMARY KEY,
  overhead INTEGER NOT NULL,
  collections INTEGER NOT NULL
) STRICT;

-- The last day a Source is valid, such as a SIP. Answers citing it warn from 90 days before.
ALTER TABLE sources ADD COLUMN expires_on TEXT;
