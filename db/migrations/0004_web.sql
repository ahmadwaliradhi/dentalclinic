-- Web sessions, and the schedule, stock and Aset behind the read-only views.

-- Session cookies, stored as SHA-256 hex like tokens. Never store a session in plain text.
CREATE TABLE sessions (
  hash TEXT PRIMARY KEY,
  staff_id TEXT NOT NULL REFERENCES staff (id),
  expires_at TEXT NOT NULL
) STRICT;

CREATE TABLE appointments (
  id INTEGER PRIMARY KEY,
  patient_no TEXT NOT NULL REFERENCES patients (no_rm),
  dentist_id TEXT NOT NULL REFERENCES staff (id),
  starts_at TEXT NOT NULL
) STRICT;

-- The stock card: the last recorded count of each item.
CREATE TABLE stock_items (
  item TEXT PRIMARY KEY,
  quantity INTEGER NOT NULL,
  unit TEXT NOT NULL,
  counted_at TEXT NOT NULL
) STRICT;

-- aset is created by migration 0005_keuangan_aset.sql with columns price and bought_on.
