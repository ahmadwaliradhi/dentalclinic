-- The clinic schema replaces the scaffold marker.
DROP TABLE scaffold;

CREATE TABLE staff (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('Pemilik', 'Dokter Gigi Mitra', 'TGM', 'Front Office'))
) STRICT;

-- Bearer tokens for MCP callers, stored as SHA-256 hex. Never store a token in plain text.
CREATE TABLE tokens (
  hash TEXT PRIMARY KEY,
  staff_id TEXT NOT NULL REFERENCES staff (id)
) STRICT;

-- Citable Sources, keyed by URI: doc://<slug>#<section>, chat://wa/grup-klinik/<id>, task://<kind>/<id>.
CREATE TABLE sources (
  uri TEXT PRIMARY KEY,
  author_id TEXT NOT NULL REFERENCES staff (id),
  dated TEXT NOT NULL,
  body TEXT NOT NULL
) STRICT;

CREATE VIRTUAL TABLE source_search USING fts5 (
  uri UNINDEXED,
  body,
  tokenize = 'unicode61 remove_diacritics 2'
);

CREATE TRIGGER sources_insert AFTER INSERT ON sources BEGIN
  INSERT INTO source_search (uri, body) VALUES (new.uri, new.body);
END;

CREATE TRIGGER sources_delete AFTER DELETE ON sources BEGIN
  DELETE FROM source_search WHERE uri = old.uri;
END;

CREATE TRIGGER sources_update AFTER UPDATE ON sources BEGIN
  DELETE FROM source_search WHERE uri = old.uri;
  INSERT INTO source_search (uri, body) VALUES (new.uri, new.body);
END;

-- One row per question. retrieved and cited are JSON arrays of Source URIs.
CREATE TABLE jejak_audit (
  id INTEGER PRIMARY KEY,
  staff_id TEXT NOT NULL REFERENCES staff (id),
  role TEXT NOT NULL,
  question TEXT NOT NULL,
  retrieved TEXT NOT NULL,
  cited TEXT NOT NULL,
  answer TEXT NOT NULL,
  decision TEXT NOT NULL CHECK (decision IN ('answered', 'refusal', 'unknown_routed')),
  asked_at TEXT NOT NULL,
  answered_at TEXT NOT NULL
) STRICT;
