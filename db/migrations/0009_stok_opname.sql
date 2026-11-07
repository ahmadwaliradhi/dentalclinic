-- A Proposal is now a Recall Message for one patient or a Stok Opname Request for one stock card
-- item. SQLite cannot change a CHECK in place, so the table is rebuilt with every row and id kept.
CREATE TABLE proposals_next (
  id INTEGER PRIMARY KEY,
  kind TEXT NOT NULL CHECK (kind IN ('recall_message', 'stok_opname')),
  patient_no TEXT REFERENCES patients (no_rm),
  item TEXT REFERENCES stock_items (item),
  text TEXT NOT NULL,
  proposed_by TEXT NOT NULL REFERENCES staff (id),
  proposed_at TEXT NOT NULL,
  expires_at TEXT NOT NULL,
  decision TEXT CHECK (decision IN ('accepted', 'declined')),
  decided_by TEXT REFERENCES staff (id),
  decided_at TEXT,
  CHECK ((kind = 'recall_message') = (patient_no IS NOT NULL)),
  CHECK ((kind = 'stok_opname') = (item IS NOT NULL))
) STRICT;

INSERT INTO proposals_next (id, kind, patient_no, text, proposed_by, proposed_at, expires_at,
  decision, decided_by, decided_at)
SELECT id, kind, patient_no, text, proposed_by, proposed_at, expires_at, decision, decided_by,
  decided_at
FROM proposals;

DROP TABLE proposals;
ALTER TABLE proposals_next RENAME TO proposals;
