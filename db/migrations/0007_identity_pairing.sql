-- Identity Pairing replaces the static demo tokens. Tokens and pairing secrets are stored as
-- SHA-256 hex only; the plain values exist only in the response that hands them out.
DROP TABLE tokens;

CREATE TABLE tokens (
  id INTEGER PRIMARY KEY,
  hash TEXT NOT NULL UNIQUE,
  staff_id TEXT NOT NULL REFERENCES staff (id),
  scope TEXT NOT NULL CHECK (scope = 'read propose'),
  paired_at TEXT NOT NULL,
  expires_at TEXT NOT NULL
) STRICT;

-- An open pairing: the code a staff member confirms, and the secret WorkBuddy polls with.
-- staff_id is set once the code is confirmed; the row is deleted when the token is handed out.
CREATE TABLE pairings (
  secret_hash TEXT PRIMARY KEY,
  code TEXT NOT NULL UNIQUE,
  staff_id TEXT REFERENCES staff (id),
  expires_at TEXT NOT NULL
) STRICT;
