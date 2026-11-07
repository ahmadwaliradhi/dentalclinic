-- The TGM role is now called Perawat Gigi. SQLite cannot change a CHECK in place, so staff is
-- rebuilt with every row and id kept. Rows are copied aside and inserted into the new staff table
-- under its own name, so every table that references staff (id) finds its row again by commit.
PRAGMA defer_foreign_keys = true;

CREATE TABLE staff_copy AS
SELECT id, name, CASE role WHEN 'TGM' THEN 'Perawat Gigi' ELSE role END AS role
FROM staff;

DROP TABLE staff;

CREATE TABLE staff (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('Pemilik', 'Dokter Gigi Mitra', 'Perawat Gigi', 'Front Office'))
) STRICT;

INSERT INTO staff (id, name, role) SELECT id, name, role FROM staff_copy;

DROP TABLE staff_copy;
