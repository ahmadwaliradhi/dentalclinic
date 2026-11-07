-- Proposals and their Approval Decisions. A Proposal no one decides within 24 hours is declined
-- by expiry: decision 'declined' with no decided_by.

CREATE TABLE proposals (
  id INTEGER PRIMARY KEY,
  kind TEXT NOT NULL CHECK (kind IN ('recall_message')),
  patient_no TEXT NOT NULL REFERENCES patients (no_rm),
  text TEXT NOT NULL,
  proposed_by TEXT NOT NULL REFERENCES staff (id),
  proposed_at TEXT NOT NULL,
  expires_at TEXT NOT NULL,
  decision TEXT CHECK (decision IN ('accepted', 'declined')),
  decided_by TEXT REFERENCES staff (id),
  decided_at TEXT
) STRICT;

-- The Jejak Audit also records Proposals and Approval Decisions. SQLite cannot change a CHECK in
-- place, so the table is rebuilt with every row, id and hash kept.
CREATE TABLE jejak_audit_next (
  id INTEGER PRIMARY KEY,
  staff_id TEXT NOT NULL REFERENCES staff (id),
  role TEXT NOT NULL,
  question TEXT NOT NULL,
  retrieved TEXT NOT NULL,
  cited TEXT NOT NULL,
  answer TEXT NOT NULL,
  decision TEXT NOT NULL CHECK (
    decision IN ('answered', 'refusal', 'unknown_routed', 'proposed', 'accepted', 'declined')
  ),
  asked_at TEXT NOT NULL,
  answered_at TEXT NOT NULL,
  reason TEXT CHECK (reason IN ('restricted', 'not_found', 'expired')),
  flags TEXT NOT NULL DEFAULT '[]',
  filter TEXT,
  prev_hash TEXT,
  hash TEXT
) STRICT;

INSERT INTO jejak_audit_next
SELECT id, staff_id, role, question, retrieved, cited, answer, decision, asked_at, answered_at,
  reason, flags, filter, prev_hash, hash
FROM jejak_audit;

DROP TABLE jejak_audit;
ALTER TABLE jejak_audit_next RENAME TO jejak_audit;
