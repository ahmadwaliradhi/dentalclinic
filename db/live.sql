-- Klinik Gigi Senyum Sejahtera, 7–27 November 2026: the clinic's days after the seed. Fictional.
-- Applied on top of db/seed.sql to the production D1 only (npm run db:live -- --remote), so the
-- tests keep their fixed seed. Safe to repeat. Times are UTC (WIB minus 7 hours).

-- Patients registered in November.
INSERT INTO patients (no_rm, name, nik, phone, dentist_id, wa_opt_in_at) VALUES
  ('P-0041', 'Bagas Wicaksono', '3276010304910041', '0812-3071-4041', 'andi', '2026-11-13T02:40:00Z'),
  ('P-0042', 'Intan Permatasari', '3276015709880042', '0857-3108-4094', 'rina', '2026-11-16T02:35:00Z'),
  ('P-0043', 'Rahmat Hidayat', '3276012206790043', '0812-3145-4147', 'andi', NULL),
  ('P-0044', 'Salsabila Putri', '3276016511060044', '0857-3182-4200', 'maya', '2026-11-26T08:50:00Z'),
  ('P-0045', 'Kevin Tanjaya', '3276011012930045', '0812-3219-4253', 'andi', '2026-11-23T03:50:00Z')
ON CONFLICT DO NOTHING;

-- November visits. Ortodonti drg. Maya runs Tuesday and Thursday 16.00–20.00 WIB from 10 November.
INSERT INTO visits (patient_no, n, dentist_id, assistant_id, visited_at, notes, rencana_tindak_lanjut_on) VALUES
  ('P-0002', 2, 'andi', NULL, '2026-11-09T02:00:00Z', 'Kontrol pasca scaling gigi 36. Gingiva sudah tidak meradang. Tindakan: edukasi cara menyikat gigi.', NULL),
  ('P-0010', 2, 'andi', NULL, '2026-11-09T03:00:00Z', 'Kontrol tumpatan komposit gigi 35. Tidak ada keluhan, tumpatan baik.', NULL),
  ('P-0036', 2, 'rina', 'tari', '2026-11-09T04:00:00Z', 'Kontrol scaling. Kalkulus minimal. Tindakan: polishing. Rencana tindak lanjut: scaling enam bulan lagi.', '2027-05-10'),
  ('P-0028', 3, 'maya', NULL, '2026-11-10T09:00:00Z', 'Tindakan: kontrol ortodonti cekat bulan ke-6, ganti kawat NiTi 0.016.', '2026-12-08'),
  ('P-0029', 3, 'maya', 'tari', '2026-11-10T10:00:00Z', 'Tindakan: kontrol ortodonti cekat bulan ke-7, aktivasi kawat.', '2026-12-08'),
  ('P-0023', 3, 'maya', 'tari', '2026-11-10T11:00:00Z', 'Tindakan: kontrol ortodonti cekat bulan ke-10, ganti karet ligatur.', '2026-12-08'),
  ('P-0024', 3, 'maya', NULL, '2026-11-10T12:00:00Z', 'Tindakan: kontrol ortodonti cekat bulan ke-11, bracket gigi 22 lepas dan dipasang ulang.', '2026-12-08'),
  ('P-0013', 2, 'andi', NULL, '2026-11-11T03:00:00Z', 'Kontrol pasca pencabutan gigi 26. Soket menutup baik, tidak ada keluhan.', NULL),
  ('P-0040', 2, 'rina', 'tari', '2026-11-11T07:00:00Z', 'Kontrol scaling. Gingiva sehat. Rencana tindak lanjut: scaling enam bulan lagi.', '2027-05-11'),
  ('P-0025', 3, 'maya', 'tari', '2026-11-12T09:00:00Z', 'Tindakan: kontrol ortodonti cekat bulan ke-12, aktivasi kawat.', '2026-12-10'),
  ('P-0026', 3, 'maya', NULL, '2026-11-12T10:00:00Z', 'Tindakan: kontrol ortodonti cekat bulan ke-13, ganti karet ligatur.', '2026-12-10'),
  ('P-0041', 1, 'andi', 'tari', '2026-11-13T03:00:00Z', 'Diagnosis: karies media gigi 16 dan 26. Tindakan: tumpatan komposit gigi 16, gigi 26 dijadwalkan.', '2026-11-27'),
  ('P-0042', 1, 'rina', 'tari', '2026-11-16T03:00:00Z', 'Diagnosis: kalkulus dan gingivitis marginal. Tindakan: foto panoramik, scaling rahang atas dan bawah. Rencana tindak lanjut: kontrol scaling.', '2026-11-28'),
  ('P-0015', 3, 'andi', 'tari', '2026-11-16T04:00:00Z', 'Tindakan: PSA kunjungan 3 dari 3 gigi 46, obturasi saluran akar, perawatan selesai.', NULL),
  ('P-0027', 3, 'maya', NULL, '2026-11-17T09:00:00Z', 'Tindakan: kontrol ortodonti cekat bulan ke-5, aktivasi kawat.', '2026-12-15'),
  ('P-0043', 1, 'andi', 'tari', '2026-11-18T03:00:00Z', 'Diagnosis: pulpitis ireversibel gigi 36. Tindakan: PSA kunjungan 1 dari 3, ekstirpasi pulpa dan dressing.', '2026-11-25'),
  ('P-0030', 3, 'maya', 'tari', '2026-11-19T09:00:00Z', 'Tindakan: kontrol ortodonti cekat bulan ke-8, ganti karet ligatur.', '2026-12-17'),
  ('P-0031', 3, 'maya', NULL, '2026-11-19T10:00:00Z', 'Tindakan: kontrol ortodonti cekat bulan ke-9, aktivasi kawat.', '2026-12-17'),
  ('P-0001', 2, 'andi', NULL, '2026-11-20T03:00:00Z', 'Kontrol tumpatan gigi 26. Tidak ada keluhan ngilu, tumpatan baik.', NULL),
  ('P-0037', 2, 'rina', 'tari', '2026-11-20T07:00:00Z', 'Kontrol scaling, terlambat dari rencana 7 Oktober. Kalkulus sedang. Tindakan: scaling ulang. Rencana tindak lanjut: kontrol scaling.', '2027-05-20'),
  ('P-0045', 1, 'andi', NULL, '2026-11-23T04:00:00Z', 'Diagnosis: karies profunda gigi 46. Tindakan: tumpatan sementara, tumpatan komposit dengan basis dijadwalkan.', '2026-11-27'),
  ('P-0033', 3, 'maya', 'tari', '2026-11-24T09:00:00Z', 'Tindakan: kontrol ortodonti cekat bulan ke-11, ganti karet ligatur.', '2026-12-22'),
  ('P-0043', 2, 'andi', 'tari', '2026-11-25T03:00:00Z', 'Tindakan: PSA kunjungan 2 dari 3 gigi 36, preparasi saluran akar.', '2026-12-02'),
  ('P-0044', 1, 'maya', 'tari', '2026-11-26T09:00:00Z', 'Diagnosis: maloklusi kelas I dengan gigi berjejal. Tindakan: pemasangan ortodonti cekat rahang atas dan bawah.', '2026-12-22')
ON CONFLICT DO NOTHING;

INSERT INTO rencana_perawatan (patient_no, treatment, total_visits, completed_visits) VALUES
  ('P-0043', 'PSA gigi 36', 3, 2),
  ('P-0044', 'Perawatan ortodonti cekat', 24, 1)
ON CONFLICT DO NOTHING;

-- Progress made in November. Absolute counts, so repeating changes nothing.
UPDATE rencana_perawatan SET completed_visits = 3 WHERE patient_no = 'P-0015' AND treatment = 'PSA gigi 46';
UPDATE rencana_perawatan SET completed_visits = 10 WHERE patient_no = 'P-0023' AND treatment = 'Perawatan ortodonti cekat';
UPDATE rencana_perawatan SET completed_visits = 11 WHERE patient_no = 'P-0024' AND treatment = 'Perawatan ortodonti cekat';
UPDATE rencana_perawatan SET completed_visits = 12 WHERE patient_no = 'P-0025' AND treatment = 'Perawatan ortodonti cekat';
UPDATE rencana_perawatan SET completed_visits = 13 WHERE patient_no = 'P-0026' AND treatment = 'Perawatan ortodonti cekat';
UPDATE rencana_perawatan SET completed_visits = 5 WHERE patient_no = 'P-0027' AND treatment = 'Perawatan ortodonti cekat';
UPDATE rencana_perawatan SET completed_visits = 6 WHERE patient_no = 'P-0028' AND treatment = 'Perawatan ortodonti cekat';
UPDATE rencana_perawatan SET completed_visits = 7 WHERE patient_no = 'P-0029' AND treatment = 'Perawatan ortodonti cekat';
UPDATE rencana_perawatan SET completed_visits = 8 WHERE patient_no = 'P-0030' AND treatment = 'Perawatan ortodonti cekat';
UPDATE rencana_perawatan SET completed_visits = 9 WHERE patient_no = 'P-0031' AND treatment = 'Perawatan ortodonti cekat';
UPDATE rencana_perawatan SET completed_visits = 11 WHERE patient_no = 'P-0033' AND treatment = 'Perawatan ortodonti cekat';

-- Every visit is an emr Source its dentist and assisting Perawat Gigi may see, as in the seed.
INSERT INTO sources (uri, author_id, dated, body, area, subject)
SELECT 'emr://patient/' || p.no_rm || '/visit/' || v.n, v.dentist_id, v.visited_at,
  p.no_rm || ' ' || p.name || ', NIK ' || p.nik || ', HP ' || p.phone || '. ' || v.notes,
  'clinical', lower(p.no_rm)
FROM visits v JOIN patients p ON p.no_rm = v.patient_no
WHERE true
ON CONFLICT DO NOTHING;

INSERT INTO source_access (uri, staff_id)
SELECT 'emr://patient/' || v.patient_no || '/visit/' || v.n, p.dentist_id
FROM visits v JOIN patients p ON p.no_rm = v.patient_no
UNION
SELECT 'emr://patient/' || patient_no || '/visit/' || n, assistant_id
FROM visits WHERE assistant_id IS NOT NULL
ON CONFLICT DO NOTHING;

-- November appointments: the ones kept, then today (Jumat 27 November) and the weeks ahead.
-- P-0004, P-0009, P-0032, P-0034, P-0035 and P-0039 have none booked: they stay Due for Recall.
INSERT INTO appointments (id, patient_no, dentist_id, starts_at) VALUES
  (8, 'P-0023', 'maya', '2026-11-10T11:00:00Z'),
  (9, 'P-0024', 'maya', '2026-11-10T12:00:00Z'),
  (10, 'P-0025', 'maya', '2026-11-12T09:00:00Z'),
  (11, 'P-0026', 'maya', '2026-11-12T10:00:00Z'),
  (12, 'P-0032', 'maya', '2026-11-12T11:00:00Z'),
  (13, 'P-0041', 'andi', '2026-11-13T03:00:00Z'),
  (14, 'P-0034', 'maya', '2026-11-17T10:00:00Z'),
  (15, 'P-0042', 'rina', '2026-11-16T03:00:00Z'),
  (16, 'P-0015', 'andi', '2026-11-16T04:00:00Z'),
  (17, 'P-0027', 'maya', '2026-11-17T09:00:00Z'),
  (18, 'P-0043', 'andi', '2026-11-18T03:00:00Z'),
  (19, 'P-0030', 'maya', '2026-11-19T09:00:00Z'),
  (20, 'P-0031', 'maya', '2026-11-19T10:00:00Z'),
  (21, 'P-0001', 'andi', '2026-11-20T03:00:00Z'),
  (22, 'P-0037', 'rina', '2026-11-20T07:00:00Z'),
  (23, 'P-0045', 'andi', '2026-11-23T04:00:00Z'),
  (24, 'P-0033', 'maya', '2026-11-24T09:00:00Z'),
  (25, 'P-0043', 'andi', '2026-11-25T03:00:00Z'),
  (26, 'P-0044', 'maya', '2026-11-26T09:00:00Z'),
  (27, 'P-0041', 'andi', '2026-11-27T03:00:00Z'),
  (28, 'P-0005', 'andi', '2026-11-27T05:00:00Z'),
  (29, 'P-0045', 'andi', '2026-11-27T07:00:00Z'),
  (30, 'P-0019', 'andi', '2026-11-27T11:00:00Z'),
  (31, 'P-0042', 'rina', '2026-11-28T03:00:00Z'),
  (32, 'P-0038', 'rina', '2026-11-28T04:00:00Z'),
  (33, 'P-0043', 'andi', '2026-12-02T03:00:00Z'),
  (34, 'P-0023', 'maya', '2026-12-08T09:00:00Z'),
  (35, 'P-0024', 'maya', '2026-12-08T10:00:00Z'),
  (36, 'P-0028', 'maya', '2026-12-08T11:00:00Z'),
  (37, 'P-0029', 'maya', '2026-12-08T12:00:00Z'),
  (38, 'P-0025', 'maya', '2026-12-10T09:00:00Z'),
  (39, 'P-0026', 'maya', '2026-12-10T10:00:00Z')
ON CONFLICT DO NOTHING;

-- The WhatsApp group, the sterilisation log, an SOP update and the running books.
INSERT INTO sources (uri, author_id, dated, body) VALUES
  ('chat://wa/grup-klinik/msg-2208', 'nina', '2026-11-09T00:45:00Z',
    'Mulai hari ini jadwal ortodonti drg. Maya, Sp.Ort setiap Selasa dan Kamis pukul 16.00–20.00.'),
  ('task://sterilisasi/119', 'tari', '2026-11-09T01:15:00Z',
    'Uji indikator biologis autoclave Senin 9 November 2026: lulus, dicatat di log sterilisasi.'),
  ('chat://wa/grup-klinik/msg-2209', 'rina', '2026-11-13T12:30:00Z',
    'Klinik tutup tanggal 24–26 Desember 2026 untuk cuti bersama dan libur Natal, buka kembali Senin 28 Desember. Pasien yang terjadwal di tanggal itu mohon dihubungi untuk jadwal ulang.'),
  ('task://sterilisasi/120', 'tari', '2026-11-16T01:10:00Z',
    'Uji indikator biologis autoclave Senin 16 November 2026: lulus, dicatat di log sterilisasi.'),
  ('chat://wa/grup-klinik/msg-2210', 'nina', '2026-11-16T09:00:00Z',
    'drg. Andi cuti tanggal 14–18 Desember 2026. Pasien drg. Andi di tanggal itu dijadwalkan ke drg. Rina atau sesudah 21 Desember.'),
  ('doc://sop/recall#pengingat', 'rina', '2026-11-20T02:00:00Z',
    'Pengingat kontrol lewat WhatsApp hanya dikirim ke pasien yang memberi WA Opt-in, setelah disetujui drg. yang merawat atau Pemilik.'),
  ('task://sterilisasi/121', 'tari', '2026-11-23T01:20:00Z',
    'Uji indikator biologis autoclave Senin 23 November 2026: lulus, dicatat di log sterilisasi.'),
  ('chat://wa/grup-klinik/msg-2212', 'andi', '2026-11-24T05:00:00Z',
    'Berkas perpanjangan SIP drg. Andi sudah diserahkan ke Dinas Kesehatan Kota Depok tanggal 24 November 2026, menunggu SIP baru terbit.'),
  ('chat://wa/grup-klinik/msg-2213', 'rina', '2026-11-25T13:00:00Z',
    'Stok opname bulanan November dilakukan Senin 30 November setelah praktik, dikoordinasi Tari. Semua item di kartu stok dihitung.'),
  ('chat://wa/grup-klinik/msg-2214', 'nina', '2026-11-27T01:00:00Z',
    'Pagi semua, hari ini Jumat 27 November ada 4 pasien terjadwal, semuanya pasien drg. Andi. drg. Maya tidak praktik hari ini.')
ON CONFLICT DO NOTHING;

-- The running November books: finance, so only the Pemilik sees them.
INSERT INTO sources (uri, author_id, dated, body, area) VALUES
  ('task://keuangan/berjalan-2026-11', 'rina', '2026-11-26T14:00:00Z',
    'Penerimaan berjalan 1–26 November 2026: Rp67.900.000; overhead tercatat Rp41.300.000. Pembukuan November ditutup 30 November.',
    'finance')
ON CONFLICT DO NOTHING;
