-- Sources stating the same fact share a key, such as 'tarif/scaling'. Any two of them are a Source Conflict.
ALTER TABLE sources ADD COLUMN fact TEXT;

-- Injection flags raised on retrieved Sources, as a JSON array of {uri, text}.
ALTER TABLE jejak_audit ADD COLUMN flags TEXT NOT NULL DEFAULT '[]';
