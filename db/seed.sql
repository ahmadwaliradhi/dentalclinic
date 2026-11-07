INSERT INTO scaffold (key, value)
VALUES ('product', 'DentalClinic Brain')
ON CONFLICT (key) DO NOTHING;
