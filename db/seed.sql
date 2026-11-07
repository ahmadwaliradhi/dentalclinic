-- Klinik Gigi Senyum Sejahtera, Depok. Fictional. Safe to repeat. Times are UTC (WIB minus 7 hours).

INSERT INTO staff (id, name, role) VALUES
  ('rina', 'drg. Rina', 'Pemilik'),
  ('andi', 'drg. Andi', 'Dokter Gigi Mitra'),
  ('maya', 'drg. Maya, Sp.Ort', 'Dokter Gigi Mitra'),
  ('tari', 'Tari', 'TGM'),
  ('nina', 'Nina', 'Front Office')
ON CONFLICT DO NOTHING;

-- SHA-256 of the public demo tokens demo-rina, demo-andi, demo-tari and demo-nina.
INSERT INTO tokens (hash, staff_id) VALUES
  ('d7ad238857eec99aefe9303adfc1bc707608e5243f0dd52172a37548c73d19d2', 'rina'),
  ('17bfd23338cc36f78545dbd7f3b817cd9900f4fb2be150cf121e733b807b585c', 'andi'),
  ('c4360457007c05fba6e5fb3b2a2b775ebac0474ee5bfe4ed5652a05203749084', 'tari'),
  ('afaa4fad048066041191848ef1dade9da69b0a1726d69f83ef1cd210ae39a383', 'nina')
ON CONFLICT DO NOTHING;

INSERT INTO sources (uri, author_id, dated, body) VALUES
  -- SOPs, effective 2 January 2026.
  ('doc://sop/jam-operasional#jam-praktik', 'rina', '2026-01-02T00:00:00Z',
    'Jam praktik: klinik buka Senin–Jumat pukul 09.00–21.00 dan Sabtu pukul 09.00–15.00. Minggu dan hari libur nasional tutup.'),
  ('doc://sop/jam-operasional#pasien-terakhir', 'rina', '2026-01-02T00:00:00Z',
    'Pasien terakhir diterima 30 menit sebelum klinik tutup.'),
  ('doc://sop/sterilisasi#instrumen', 'rina', '2026-01-02T00:00:00Z',
    'Instrumen dicuci, dikeringkan, dikemas dalam pouch berlabel tanggal, lalu disterilkan dengan autoclave pada 134 °C selama 4 menit.'),
  ('doc://sop/sterilisasi#uji-autoclave', 'rina', '2026-01-02T00:00:00Z',
    'Autoclave diuji dengan indikator biologis setiap Senin sebelum praktik dimulai. Hasilnya dicatat di log sterilisasi.'),
  ('doc://sop/pendaftaran#pasien-baru', 'rina', '2026-01-02T00:00:00Z',
    'Pasien baru mengisi formulir identitas dan persetujuan dihubungi lewat WhatsApp di meja depan, lalu mendapat nomor rekam medis.'),
  ('doc://sop/pendaftaran#janji-temu', 'rina', '2026-01-02T00:00:00Z',
    'Janji temu dibuat lewat telepon atau WhatsApp klinik paling lambat satu hari sebelumnya. Pasien yang terlambat lebih dari 15 menit dijadwalkan ulang.'),

  -- WhatsApp group export.
  ('chat://wa/grup-klinik/msg-2201', 'nina', '2026-11-02T01:05:00Z',
    'Pagi semua, hari ini ada 14 pasien terjadwal, 3 di antaranya pasien baru.'),
  ('chat://wa/grup-klinik/msg-2202', 'tari', '2026-11-02T01:20:00Z',
    'Autoclave sudah diuji pagi ini, indikator biologis lulus.'),
  ('chat://wa/grup-klinik/msg-2203', 'rina', '2026-11-03T12:00:00Z',
    'Mulai pekan depan pasien ortodonti drg. Maya dijadwalkan Selasa dan Kamis sore.'),
  ('chat://wa/grup-klinik/msg-2204', 'andi', '2026-11-04T23:30:00Z',
    'Saya izin datang 30 menit terlambat hari Rabu, mohon pasien pertama dimundurkan.'),
  ('chat://wa/grup-klinik/msg-2205', 'nina', '2026-11-05T09:10:00Z',
    'Pasien yang batal hari ini sudah saya hubungi untuk jadwal ulang.'),

  -- Task log.
  ('task://sterilisasi/117', 'tari', '2026-10-26T01:10:00Z',
    'Uji indikator biologis autoclave: lulus.'),
  ('task://sterilisasi/118', 'tari', '2026-11-02T01:15:00Z',
    'Uji indikator biologis autoclave: lulus.'),
  ('task://stok-opname/42', 'tari', '2026-10-31T09:00:00Z',
    'Stok opname bulanan: sarung tangan nitril ukuran M 6 kotak, masker medis 8 kotak, kapas gulung 5 pak.')
ON CONFLICT DO NOTHING;
