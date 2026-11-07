-- A tamper-evident Jejak Audit: each row hashes its content with the previous row's hash.
-- Rows written before this migration have no hash and stay outside the chain.

-- The Source filter applied for the caller's Role, as the JSON of an access Guard.
ALTER TABLE jejak_audit ADD COLUMN filter TEXT;
ALTER TABLE jejak_audit ADD COLUMN prev_hash TEXT;
ALTER TABLE jejak_audit ADD COLUMN hash TEXT;

-- Where the chain starts: every row after this id must be chained, so clearing a hash shows.
CREATE TABLE jejak_audit_chain (starts_after INTEGER NOT NULL) STRICT;
INSERT INTO jejak_audit_chain SELECT coalesce(max(id), 0) FROM jejak_audit;
