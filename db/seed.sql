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

-- Patients. NIK and phone numbers are fictional.
INSERT INTO patients (no_rm, name, nik, phone, dentist_id, wa_opt_in_at) VALUES
  ('P-0001', 'Siti Rahmawati', '3276014806630001', '0812-1037-2053', 'andi', '2026-02-11T02:00:00Z'),
  ('P-0002', 'Agus Setiawan', '3276011511660002', '0857-1074-2106', 'andi', '2026-03-12T02:00:00Z'),
  ('P-0003', 'Dewi Lestari', '3276016204690003', '0812-1111-2159', 'andi', NULL),
  ('P-0004', 'Rudi Hartono', '3276010109720004', '0857-1148-2212', 'andi', '2026-05-14T02:00:00Z'),
  ('P-0005', 'Fitri Handayani', '3276014802750005', '0812-1185-2265', 'andi', '2026-06-15T02:00:00Z'),
  ('P-0006', 'Bayu Pratama', '3276011507780006', '0857-1222-2318', 'andi', NULL),
  ('P-0007', 'Ratna Sari', '3276016212810007', '0812-1259-2371', 'andi', '2026-08-17T02:00:00Z'),
  ('P-0008', 'Hendra Wijaya', '3276010105840008', '0857-1296-2424', 'andi', '2026-01-18T02:00:00Z'),
  ('P-0009', 'Wulan Purnama', '3276014810870009', '0812-1333-2477', 'andi', NULL),
  ('P-0010', 'Eko Saputra', '3276011503900010', '0857-1370-2530', 'andi', '2026-03-10T02:00:00Z'),
  ('P-0011', 'Indah Permata', '3276016208930011', '0812-1407-2583', 'andi', '2026-04-11T02:00:00Z'),
  ('P-0012', 'Joko Susilo', '3276010101960012', '0857-1444-2636', 'andi', NULL),
  ('P-0013', 'Maria Ulfa', '3276014806990013', '0812-1481-2689', 'andi', '2026-06-13T02:00:00Z'),
  ('P-0014', 'Taufik Hidayat', '3276011511620014', '0857-1518-2742', 'andi', '2026-07-14T02:00:00Z'),
  ('P-0015', 'Yuni Astuti', '3276016204650015', '0812-1555-2795', 'andi', NULL),
  ('P-0016', 'Arief Nugroho', '3276010109680016', '0857-1592-2848', 'andi', '2026-01-16T02:00:00Z'),
  ('P-0017', 'Lina Marlina', '3276014802710017', '0812-1629-2901', 'andi', '2026-02-17T02:00:00Z'),
  ('P-0018', 'Dimas Prasetyo', '3276011507740018', '0857-1666-2954', 'andi', NULL),
  ('P-0019', 'Nur Aini', '3276016212770019', '0812-1703-3007', 'andi', '2026-04-19T02:00:00Z'),
  ('P-0020', 'Fajar Ramadhan', '3276010105800020', '0857-1740-3060', 'andi', '2026-05-10T02:00:00Z'),
  ('P-0021', 'Sri Wahyuni', '3276014810830021', '0812-1777-3113', 'andi', NULL),
  ('P-0022', 'Andre Gunawan', '3276011503860022', '0857-1814-3166', 'andi', '2026-07-12T02:00:00Z'),
  ('P-0023', 'Citra Kirana', '3276016208890023', '0812-1851-3219', 'maya', '2026-08-13T02:00:00Z'),
  ('P-0024', 'Rizky Maulana', '3276010101920024', '0857-1888-3272', 'maya', NULL),
  ('P-0025', 'Putri Anggraini', '3276014806950025', '0812-1925-3325', 'maya', '2026-02-15T02:00:00Z'),
  ('P-0026', 'Galih Saputro', '3276011511980026', '0857-1962-3378', 'maya', '2026-03-16T02:00:00Z'),
  ('P-0027', 'Ayu Wandira', '3276016204610027', '0812-1999-3431', 'maya', NULL),
  ('P-0028', 'Reza Firmansyah', '3276010109640028', '0857-2036-3484', 'maya', '2026-05-18T02:00:00Z'),
  ('P-0029', 'Kartika Dewi', '3276014802670029', '0812-2073-3537', 'maya', '2026-06-19T02:00:00Z'),
  ('P-0030', 'Yoga Aditya', '3276011507700030', '0857-2110-3590', 'maya', NULL),
  ('P-0031', 'Nadia Safitri', '3276016212730031', '0812-2147-3643', 'maya', '2026-08-11T02:00:00Z'),
  ('P-0032', 'Irfan Hakim', '3276010105760032', '0857-2184-3696', 'maya', '2026-01-12T02:00:00Z'),
  ('P-0033', 'Larasati Putri', '3276014810790033', '0812-2221-3749', 'maya', NULL),
  ('P-0034', 'Bambang Sutrisno', '3276011503820034', '0857-2258-3802', 'maya', '2026-03-14T02:00:00Z'),
  ('P-0035', 'Sinta Maharani', '3276016208850035', '0812-2295-3855', 'rina', '2026-04-15T02:00:00Z'),
  ('P-0036', 'Hadi Kurniawan', '3276010101880036', '0857-2332-3908', 'rina', NULL),
  ('P-0037', 'Melati Suryani', '3276014806910037', '0812-2369-3961', 'rina', '2026-06-17T02:00:00Z'),
  ('P-0038', 'Teguh Santoso', '3276011511940038', '0857-2406-4014', 'rina', '2026-07-18T02:00:00Z'),
  ('P-0039', 'Anisa Rahma', '3276016204970039', '0812-2443-4067', 'rina', NULL),
  ('P-0040', 'Gilang Ramadhan', '3276010109600040', '0857-2480-4120', 'rina', '2026-01-10T02:00:00Z')
ON CONFLICT DO NOTHING;

INSERT INTO visits (patient_no, n, dentist_id, assistant_id, visited_at, notes, rencana_tindak_lanjut_on) VALUES
  ('P-0001', 1, 'andi', NULL, '2026-09-03T03:00:00Z', 'Diagnosis: karies profunda gigi 26. Tindakan: tumpatan komposit dengan basis.', NULL),
  ('P-0002', 1, 'andi', NULL, '2026-10-04T04:00:00Z', 'Diagnosis: gingivitis kronis gigi 36. Tindakan: scaling dan polishing.', NULL),
  ('P-0003', 1, 'andi', NULL, '2026-08-05T05:00:00Z', 'Diagnosis: sisa akar gigi 46. Tindakan: pencabutan dengan anestesi lokal.', NULL),
  ('P-0004', 1, 'andi', 'tari', '2026-08-05T03:00:00Z', 'Diagnosis: pulpitis ireversibel gigi 17. Tindakan: PSA kunjungan 1 dari 3, ekstirpasi pulpa dan dressing.', '2026-08-18'),
  ('P-0005', 1, 'andi', NULL, '2026-10-07T07:00:00Z', 'Diagnosis: karies media gigi 27. Tindakan: tumpatan komposit.', NULL),
  ('P-0006', 1, 'andi', NULL, '2026-08-08T08:00:00Z', 'Diagnosis: karies profunda gigi 37. Tindakan: tumpatan komposit dengan basis.', NULL),
  ('P-0007', 1, 'andi', NULL, '2026-09-09T09:00:00Z', 'Diagnosis: gingivitis kronis gigi 47. Tindakan: scaling dan polishing.', NULL),
  ('P-0008', 1, 'andi', 'tari', '2026-10-10T02:00:00Z', 'Diagnosis: sisa akar gigi 14. Tindakan: pencabutan dengan anestesi lokal.', NULL),
  ('P-0009', 1, 'andi', 'tari', '2026-09-05T03:00:00Z', 'Diagnosis: pulpitis ireversibel gigi 24. Tindakan: PSA kunjungan 1 dari 3, ekstirpasi pulpa dan dressing.', '2026-09-18'),
  ('P-0010', 1, 'andi', NULL, '2026-09-12T04:00:00Z', 'Diagnosis: karies media gigi 35. Tindakan: tumpatan komposit.', NULL),
  ('P-0011', 1, 'andi', NULL, '2026-10-13T05:00:00Z', 'Diagnosis: karies profunda gigi 45. Tindakan: tumpatan komposit dengan basis.', NULL),
  ('P-0012', 1, 'andi', 'tari', '2026-08-14T06:00:00Z', 'Diagnosis: gingivitis kronis gigi 16. Tindakan: scaling dan polishing.', NULL),
  ('P-0013', 1, 'andi', NULL, '2026-09-15T07:00:00Z', 'Diagnosis: sisa akar gigi 26. Tindakan: pencabutan dengan anestesi lokal.', NULL),
  ('P-0014', 1, 'andi', NULL, '2026-10-16T08:00:00Z', 'Diagnosis: karies superfisial gigi 36. Tindakan: fissure sealant.', NULL),
  ('P-0015', 1, 'andi', 'tari', '2026-09-01T03:00:00Z', 'Diagnosis: pulpitis ireversibel gigi 46. Tindakan: PSA kunjungan 1 dari 3, ekstirpasi pulpa dan dressing.', '2026-09-14'),
  ('P-0015', 2, 'andi', 'tari', '2026-09-08T03:00:00Z', 'Tindakan: PSA kunjungan 2 dari 3 gigi 46, preparasi saluran akar.', '2026-09-21'),
  ('P-0016', 1, 'andi', 'tari', '2026-09-18T02:00:00Z', 'Diagnosis: karies profunda gigi 17. Tindakan: tumpatan komposit dengan basis.', NULL),
  ('P-0017', 1, 'andi', NULL, '2026-10-19T03:00:00Z', 'Diagnosis: gingivitis kronis gigi 27. Tindakan: scaling dan polishing.', NULL),
  ('P-0018', 1, 'andi', 'tari', '2026-10-04T03:00:00Z', 'Diagnosis: pulpitis ireversibel gigi 37. Tindakan: PSA kunjungan 1 dari 3, ekstirpasi pulpa dan dressing.', '2026-10-17'),
  ('P-0018', 2, 'andi', 'tari', '2026-10-11T03:00:00Z', 'Tindakan: PSA kunjungan 2 dari 3 gigi 37, preparasi saluran akar.', '2026-10-24'),
  ('P-0018', 3, 'andi', 'tari', '2026-10-18T03:00:00Z', 'Tindakan: PSA kunjungan 3 dari 3 gigi 37, obturasi saluran akar, perawatan selesai.', NULL),
  ('P-0019', 1, 'andi', NULL, '2026-09-21T05:00:00Z', 'Diagnosis: karies superfisial gigi 47. Tindakan: fissure sealant.', NULL),
  ('P-0020', 1, 'andi', 'tari', '2026-10-22T06:00:00Z', 'Diagnosis: karies media gigi 14. Tindakan: tumpatan komposit.', NULL),
  ('P-0021', 1, 'andi', NULL, '2026-08-23T07:00:00Z', 'Diagnosis: karies profunda gigi 24. Tindakan: tumpatan komposit dengan basis.', NULL),
  ('P-0022', 1, 'andi', NULL, '2026-09-24T08:00:00Z', 'Diagnosis: gingivitis kronis gigi 35. Tindakan: scaling dan polishing.', NULL),
  ('P-0023', 1, 'maya', NULL, '2026-09-03T09:00:00Z', 'Diagnosis: maloklusi kelas III ringan. Tindakan: kontrol ortodonti cekat bulan ke-8, ganti karet ligatur.', '2026-10-03'),
  ('P-0023', 2, 'maya', 'tari', '2026-10-03T09:00:00Z', 'Tindakan: kontrol ortodonti cekat bulan ke-9, aktivasi kawat.', '2026-11-03'),
  ('P-0024', 1, 'maya', NULL, '2026-09-04T09:00:00Z', 'Diagnosis: maloklusi kelas II divisi 1. Tindakan: kontrol ortodonti cekat bulan ke-9, ganti karet ligatur.', '2026-10-04'),
  ('P-0024', 2, 'maya', NULL, '2026-10-04T09:00:00Z', 'Tindakan: kontrol ortodonti cekat bulan ke-10, aktivasi kawat.', '2026-11-04'),
  ('P-0025', 1, 'maya', NULL, '2026-09-05T09:00:00Z', 'Diagnosis: maloklusi kelas I dengan gigi berjejal. Tindakan: kontrol ortodonti cekat bulan ke-10, ganti karet ligatur.', '2026-10-05'),
  ('P-0025', 2, 'maya', 'tari', '2026-10-05T09:00:00Z', 'Tindakan: kontrol ortodonti cekat bulan ke-11, aktivasi kawat.', '2026-11-05'),
  ('P-0026', 1, 'maya', NULL, '2026-09-06T09:00:00Z', 'Diagnosis: maloklusi kelas III ringan. Tindakan: kontrol ortodonti cekat bulan ke-11, ganti karet ligatur.', '2026-10-06'),
  ('P-0026', 2, 'maya', NULL, '2026-10-06T09:00:00Z', 'Tindakan: kontrol ortodonti cekat bulan ke-12, aktivasi kawat.', '2026-11-06'),
  ('P-0027', 1, 'maya', NULL, '2026-09-07T09:00:00Z', 'Diagnosis: maloklusi kelas II divisi 1. Tindakan: kontrol ortodonti cekat bulan ke-3, ganti karet ligatur.', '2026-10-07'),
  ('P-0027', 2, 'maya', 'tari', '2026-10-07T09:00:00Z', 'Tindakan: kontrol ortodonti cekat bulan ke-4, aktivasi kawat.', '2026-11-07'),
  ('P-0028', 1, 'maya', NULL, '2026-09-08T09:00:00Z', 'Diagnosis: maloklusi kelas I dengan gigi berjejal. Tindakan: kontrol ortodonti cekat bulan ke-4, ganti karet ligatur.', '2026-10-08'),
  ('P-0028', 2, 'maya', NULL, '2026-10-08T09:00:00Z', 'Tindakan: kontrol ortodonti cekat bulan ke-5, aktivasi kawat.', '2026-11-08'),
  ('P-0029', 1, 'maya', NULL, '2026-09-09T09:00:00Z', 'Diagnosis: maloklusi kelas III ringan. Tindakan: kontrol ortodonti cekat bulan ke-5, ganti karet ligatur.', '2026-10-09'),
  ('P-0029', 2, 'maya', 'tari', '2026-10-09T09:00:00Z', 'Tindakan: kontrol ortodonti cekat bulan ke-6, aktivasi kawat.', '2026-11-09'),
  ('P-0030', 1, 'maya', NULL, '2026-09-10T09:00:00Z', 'Diagnosis: maloklusi kelas II divisi 1. Tindakan: kontrol ortodonti cekat bulan ke-6, ganti karet ligatur.', '2026-10-10'),
  ('P-0030', 2, 'maya', NULL, '2026-10-10T09:00:00Z', 'Tindakan: kontrol ortodonti cekat bulan ke-7, aktivasi kawat.', '2026-11-10'),
  ('P-0031', 1, 'maya', NULL, '2026-09-11T09:00:00Z', 'Diagnosis: maloklusi kelas I dengan gigi berjejal. Tindakan: kontrol ortodonti cekat bulan ke-7, ganti karet ligatur.', '2026-10-11'),
  ('P-0031', 2, 'maya', 'tari', '2026-10-11T09:00:00Z', 'Tindakan: kontrol ortodonti cekat bulan ke-8, aktivasi kawat.', '2026-11-11'),
  ('P-0032', 1, 'maya', NULL, '2026-09-12T09:00:00Z', 'Diagnosis: maloklusi kelas III ringan. Tindakan: kontrol ortodonti cekat bulan ke-8, ganti karet ligatur.', '2026-10-12'),
  ('P-0032', 2, 'maya', NULL, '2026-10-12T09:00:00Z', 'Tindakan: kontrol ortodonti cekat bulan ke-9, aktivasi kawat.', '2026-11-12'),
  ('P-0033', 1, 'maya', NULL, '2026-09-13T09:00:00Z', 'Diagnosis: maloklusi kelas II divisi 1. Tindakan: kontrol ortodonti cekat bulan ke-9, ganti karet ligatur.', '2026-10-13'),
  ('P-0033', 2, 'maya', 'tari', '2026-10-13T09:00:00Z', 'Tindakan: kontrol ortodonti cekat bulan ke-10, aktivasi kawat.', '2026-11-13'),
  ('P-0034', 1, 'maya', NULL, '2026-09-14T09:00:00Z', 'Diagnosis: maloklusi kelas I dengan gigi berjejal. Tindakan: kontrol ortodonti cekat bulan ke-10, ganti karet ligatur.', '2026-10-14'),
  ('P-0034', 2, 'maya', NULL, '2026-10-14T09:00:00Z', 'Tindakan: kontrol ortodonti cekat bulan ke-11, aktivasi kawat.', '2026-11-14'),
  ('P-0035', 1, 'rina', 'tari', '2026-07-05T04:00:00Z', 'Diagnosis: kalkulus dan gingivitis marginal. Tindakan: scaling rahang atas dan bawah. Rencana tindak lanjut: kontrol scaling.', '2026-10-05'),
  ('P-0036', 1, 'rina', 'tari', '2026-10-06T04:00:00Z', 'Diagnosis: kalkulus dan gingivitis marginal. Tindakan: scaling rahang atas dan bawah. Rencana tindak lanjut: kontrol scaling.', '2026-12-06'),
  ('P-0037', 1, 'rina', 'tari', '2026-07-07T04:00:00Z', 'Diagnosis: kalkulus dan gingivitis marginal. Tindakan: scaling rahang atas dan bawah. Rencana tindak lanjut: kontrol scaling.', '2026-10-07'),
  ('P-0038', 1, 'rina', 'tari', '2026-10-08T04:00:00Z', 'Diagnosis: kalkulus dan gingivitis marginal. Tindakan: scaling rahang atas dan bawah. Rencana tindak lanjut: kontrol scaling.', '2026-12-08'),
  ('P-0039', 1, 'rina', 'tari', '2026-07-09T04:00:00Z', 'Diagnosis: kalkulus dan gingivitis marginal. Tindakan: scaling rahang atas dan bawah. Rencana tindak lanjut: kontrol scaling.', '2026-10-09'),
  ('P-0040', 1, 'rina', 'tari', '2026-10-10T04:00:00Z', 'Diagnosis: kalkulus dan gingivitis marginal. Tindakan: scaling rahang atas dan bawah. Rencana tindak lanjut: kontrol scaling.', '2026-12-10')
ON CONFLICT DO NOTHING;

INSERT INTO rencana_perawatan (patient_no, treatment, total_visits, completed_visits) VALUES
  ('P-0004', 'PSA gigi 17', 3, 1),
  ('P-0009', 'PSA gigi 24', 3, 1),
  ('P-0015', 'PSA gigi 46', 3, 2),
  ('P-0018', 'PSA gigi 37', 3, 3),
  ('P-0023', 'Perawatan ortodonti cekat', 24, 9),
  ('P-0024', 'Perawatan ortodonti cekat', 24, 10),
  ('P-0025', 'Perawatan ortodonti cekat', 24, 11),
  ('P-0026', 'Perawatan ortodonti cekat', 24, 12),
  ('P-0027', 'Perawatan ortodonti cekat', 24, 4),
  ('P-0028', 'Perawatan ortodonti cekat', 24, 5),
  ('P-0029', 'Perawatan ortodonti cekat', 24, 6),
  ('P-0030', 'Perawatan ortodonti cekat', 24, 7),
  ('P-0031', 'Perawatan ortodonti cekat', 24, 8),
  ('P-0032', 'Perawatan ortodonti cekat', 24, 9),
  ('P-0033', 'Perawatan ortodonti cekat', 24, 10),
  ('P-0034', 'Perawatan ortodonti cekat', 24, 11)
ON CONFLICT DO NOTHING;

INSERT INTO fee_rules (dentist_id, share_percent) VALUES
  ('andi', 40),
  ('maya', 35)
ON CONFLICT DO NOTHING;

-- Each visit is an emr Source, headed with the patient's identity, which masking hides on the way out.
INSERT INTO sources (uri, author_id, dated, body, area, subject)
SELECT 'emr://patient/' || p.no_rm || '/visit/' || v.n, v.dentist_id, v.visited_at,
  p.no_rm || ' ' || p.name || ', NIK ' || p.nik || ', HP ' || p.phone || '. ' || v.notes,
  'clinical', lower(p.no_rm)
FROM visits v JOIN patients p ON p.no_rm = v.patient_no
WHERE true
ON CONFLICT DO NOTHING;

-- Fee-share contracts and the October fee ledger.
INSERT INTO sources (uri, author_id, dated, body, area, subject) VALUES
  ('doc://kontrak/bagi-hasil-andi#fee', 'rina', '2026-01-02T00:00:00Z',
    'Kontrak bagi hasil drg. Andi: fee dokter 40% dari tarif setiap tindakan yang dikerjakan, dibayar setiap bulan paling lambat tanggal 5.',
    'finance', 'andi'),
  ('doc://kontrak/bagi-hasil-maya#fee', 'rina', '2026-01-02T00:00:00Z',
    'Kontrak bagi hasil drg. Maya, Sp.Ort: fee dokter 35% dari tarif setiap tindakan yang dikerjakan, dibayar setiap bulan paling lambat tanggal 5.',
    'finance', 'maya'),
  ('task://fee/2026-10-andi', 'rina', '2026-11-05T03:00:00Z',
    'Fee drg. Andi bulan Oktober 2026: Rp14.280.000, yaitu 40% dari tindakan senilai Rp35.700.000.',
    'finance', 'andi'),
  ('task://fee/2026-10-maya', 'rina', '2026-11-05T03:00:00Z',
    'Fee drg. Maya bulan Oktober 2026: Rp12.600.000, yaitu 35% dari tindakan senilai Rp36.000.000.',
    'finance', 'maya')
ON CONFLICT DO NOTHING;

-- A patient's dentist and the assisting TGM may see a visit; a dentist may see their own fees.
INSERT INTO source_access (uri, staff_id)
SELECT 'emr://patient/' || v.patient_no || '/visit/' || v.n, p.dentist_id
FROM visits v JOIN patients p ON p.no_rm = v.patient_no
UNION
SELECT 'emr://patient/' || patient_no || '/visit/' || n, assistant_id
FROM visits WHERE assistant_id IS NOT NULL
UNION
SELECT uri, subject FROM sources WHERE area = 'finance'
ON CONFLICT DO NOTHING;
