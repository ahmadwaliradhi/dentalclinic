import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import release from "@/data/release.json";
import testResultsData from "@/data/test-results.json";

export const Route = createFileRoute("/")({
  head: () => ({ meta: [{ title: "Dental Clinic Brain" }] }),
  component: Landing,
});

interface Term {
  title: string;
  body: string;
}

type TestStatus = "lulus" | "gagal" | "belum";

interface TestResult {
  id: string;
  case: string;
  expected: string;
  status: TestStatus;
  evidenceUrl: string;
}

const testResults = testResultsData as TestResult[];

const statusLabel: Record<TestStatus, string> = {
  lulus: "Lulus",
  gagal: "Gagal",
  belum: "Belum diuji",
};

const principles: Term[] = [
  { title: "Sumber", body: "Setiap jawaban mengutip rekam medis, dokumen, log tugas atau chat." },
  { title: "Izin", body: "Hanya mencari data yang boleh dilihat Role penanya." },
  { title: "Jejak", body: "Setiap pertanyaan, jawaban dan keputusan tercatat di Jejak Audit." },
];

const team: Term[] = [
  { title: "Dira", body: "Memimpin dan membagi tugas" },
  { title: "Sari", body: "Pasien & Recall" },
  { title: "Bima", body: "Keuangan & Aset" },
  { title: "Wulan", body: "Memeriksa sitasi, masking dan Refusal" },
];

const staff = [
  { slug: "rina", name: "drg. Rina", role: "Pemilik" },
  { slug: "andi", name: "drg. Andi", role: "Dokter Gigi Mitra" },
  { slug: "tari", name: "Tari", role: "TGM" },
  { slug: "nina", name: "Nina", role: "Front Office" },
];

const accountability = [
  {
    title: "Bisa sendiri",
    items: [
      "Mencari data sesuai Role",
      "Menjawab dengan sumber",
      "Menjawab “saya tidak tahu” dan menyebut Topic Owner",
      "Menyiapkan Proposal",
      "Mencatat ke Jejak Audit",
    ],
  },
  {
    title: "Perlu persetujuan",
    items: [
      "Mengirim Recall Message lewat WhatsApp, berlaku 24 jam",
      "Menjalankan Stok Opname Request, berlaku 24 jam",
    ],
  },
  {
    title: "Tidak pernah",
    items: [
      "Mengirim pesan tanpa persetujuan",
      "Menyetujui Proposal sendiri",
      "Menampilkan NIK utuh",
      "Menampilkan fee dokter kepada Dokter Gigi Mitra lain",
      "Menghapus rekam medis (retensi 25 tahun)",
      "Mengoreksi rekam medis atau menjadwalkan perawatan",
      "Mengakses SATUSEHAT atau BPJS",
      "Memberi nasihat pajak atau hukum",
      "Menjalankan instruksi di dalam dokumen",
    ],
  },
];

const quickStart = [
  "Pasang Expert DentalClinic di WorkBuddy.",
  "Minta kode pairing 8 karakter dari Expert.",
  "Masuk di situs ini dan konfirmasi kode dalam 10 menit.",
  "Tempel token dari Expert saat WorkBuddy meminta koneksi.",
  "Untuk ganti Role, pairing ulang lalu mulai New Task.",
];

const faq = [
  {
    question: "Apakah ini memakai data pasien sungguhan?",
    answer:
      "Tidak. Klinik Gigi Senyum Sejahtera dan semua datanya fiktif, dan direset setiap malam.",
  },
  {
    question: "Bisakah Dental Clinic Brain mengirim WhatsApp sendiri?",
    answer:
      "Tidak. Ia hanya menyiapkan Recall Message. Staf menyetujuinya di situs lalu mengirim sendiri lewat tautan wa.me.",
  },
  {
    question: "Bagaimana Dental Clinic Brain tahu siapa saya?",
    answer:
      "Dari Identity Pairing, bukan dari isi chat. Token hanya boleh membaca dan mengajukan Proposal, dan berlaku 90 hari.",
  },
  {
    question: "Mengapa data yang tidak ada dan data terlarang dijawab sama?",
    answer: "Agar tidak ada yang bisa menebak pasien atau data mana yang ada.",
  },
  {
    question: "Bisakah saya mengobrol dengan Dental Clinic Brain di situs ini?",
    answer:
      "Tidak. Percakapan hanya lewat WorkBuddy. Situs ini untuk persetujuan, Jejak Audit dan data baca saja.",
  },
];

function Landing() {
  return (
    <div className="mx-auto max-w-3xl px-4 sm:px-6">
      <div className="flex items-center justify-between py-5 font-semibold">
        <span>Dental Clinic Brain</span>
        <a href="#demo-login" className="text-sm font-medium text-primary">
          Masuk sebagai staf
        </a>
      </div>
      <main>
        <Hero />
        <Section id="prinsip" title="Setiap jawaban">
          <Terms terms={principles} className="sm:grid-cols-3" />
        </Section>
        <Section id="akuntabilitas" title="Batas yang dipegang">
          <div className="divide-y">
            {accountability.map((column) => (
              <div key={column.title} className="grid gap-1 py-4 sm:grid-cols-[11rem_1fr] sm:gap-4">
                <h3 className="font-semibold">{column.title}</h3>
                <ul className="space-y-1 text-muted-foreground">
                  {column.items.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </Section>
        <Section id="hasil-uji" title="Hasil uji di WorkBuddy">
          <TestResults />
        </Section>
        <Section id="tim" title="Tim">
          <Terms terms={team} className="grid-cols-2 sm:grid-cols-4" />
          {release.teamZipUrl && (
            <Button asChild variant="outline" className="mt-8">
              <a href={release.teamZipUrl}>Unduh Tim</a>
            </Button>
          )}
        </Section>
        <Section id="arsitektur" title="Arsitektur">
          <img
            src="/arsitektur.svg"
            alt="WorkBuddy Expert memanggil tool MCP di Cloudflare Worker. Engine Dental Clinic Brain memeriksa izin, mencari di D1, menyamarkan data, mendeteksi injeksi, memvalidasi sitasi dan menulis Jejak Audit. Situs web menampilkan persetujuan dan Jejak Audit dari D1 yang sama."
            width={720}
            height={360}
            className="h-auto w-full"
          />
        </Section>
        <Section id="video" title="Video">
          {release.videoEmbedUrl ? (
            <iframe
              src={release.videoEmbedUrl}
              title="Demo Dental Clinic Brain"
              allow="encrypted-media; picture-in-picture"
              allowFullScreen
              className="aspect-video w-full rounded-xl border"
            />
          ) : (
            <p className="flex aspect-video items-center justify-center rounded-xl border text-muted-foreground">
              Segera tersedia
            </p>
          )}
        </Section>
        <Section id="mulai" title="Mulai">
          <ol className="list-decimal space-y-2 pl-5">
            {quickStart.map((step) => (
              <li key={step}>{step}</li>
            ))}
          </ol>
        </Section>
        <Section id="faq" title="FAQ">
          <div className="divide-y border-y">
            {faq.map((item) => (
              <details key={item.question} className="py-4">
                <summary className="cursor-pointer font-medium">{item.question}</summary>
                <p className="mt-2 text-muted-foreground">{item.answer}</p>
              </details>
            ))}
          </div>
        </Section>
      </main>
      <footer id="footer" className="flex flex-wrap justify-between gap-2 border-t py-8 text-sm">
        <span>Dental Clinic Brain</span>
        <a href={release.githubUrl} className="underline underline-offset-4">
          GitHub
        </a>
      </footer>
    </div>
  );
}

function Hero() {
  const hasLink = release.launchUrl || release.expertZipUrl;

  return (
    <header id="hero" className="pt-12 pb-14 sm:pt-16">
      <h1 className="max-w-[16ch] text-4xl leading-[1.08] font-semibold tracking-tight sm:text-5xl">
        Otak klinik yang selalu menyebut sumbernya
      </h1>
      <p className="mt-5 max-w-[56ch] text-lg text-muted-foreground">
        Staf Klinik Gigi Senyum Sejahtera bertanya lewat WorkBuddy. Dental Clinic Brain menjawab
        hanya dari data yang boleh mereka lihat, dan tidak bertindak tanpa persetujuan.
      </p>

      {/* One real answer (T07) shows the product better than a description of it. */}
      <figure className="mt-10 rounded-2xl border bg-card p-5 sm:p-6">
        <figcaption className="flex flex-wrap items-baseline gap-x-3 gap-y-1 text-sm text-muted-foreground">
          <span className="text-base font-medium text-foreground">
            Berapa tarif scaling sekarang?
          </span>
          <span>Nina, Front Office</span>
        </figcaption>
        <p className="mt-3 max-w-[52ch] text-xl leading-snug">
          Rp200.000. Daftar tarif masih menulis Rp150.000, tetapi drg. Rina mengubahnya di chat
          tanggal 2 Oktober.
        </p>
        <ul className="mt-4 flex flex-wrap gap-2 text-sm text-primary" aria-label="Sumber">
          <li className="rounded-md bg-chip px-2 py-0.5">chat://pemilik/2026-10-02</li>
          <li className="rounded-md bg-chip px-2 py-0.5">
            <s className="text-muted-foreground">doc://daftar-tarif-2025</s> usang
          </li>
        </ul>
      </figure>

      <div id="demo-login" className="mt-8 scroll-mt-6">
        <h2 className="font-medium">Coba sebagai</h2>
        <ul className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
          {staff.map((s) => (
            <li key={s.slug}>
              <form method="post" action={`/demo/${s.slug}`}>
                <button
                  type="submit"
                  className="w-full rounded-xl border bg-card p-3 text-left outline-none hover:border-primary focus-visible:ring-[3px] focus-visible:ring-ring/50"
                >
                  {s.name}
                  <span className="block text-sm text-muted-foreground">{s.role}</span>
                </button>
              </form>
            </li>
          ))}
        </ul>
      </div>

      <div className="mt-6 flex flex-wrap items-center gap-3">
        {release.launchUrl && (
          <Button asChild>
            <a href={release.launchUrl}>Buka di WorkBuddy</a>
          </Button>
        )}
        {release.expertZipUrl && (
          <Button asChild variant="outline">
            <a href={release.expertZipUrl}>Unduh Expert</a>
          </Button>
        )}
        {!hasLink && <p className="text-muted-foreground">Segera tersedia</p>}
      </div>
    </header>
  );
}

const toothStyle: Record<TestStatus, string> = {
  lulus: "border-primary bg-chip text-primary",
  gagal: "border-destructive bg-destructive/10 text-destructive",
  belum: "border-border bg-card text-muted-foreground",
};

/** The 25 test cases as teeth in two arches; picking one shows its case and its evidence. */
function TestResults() {
  const [picked, setPicked] = useState(0);
  const result = testResults[picked];
  const upper = testResults.slice(0, Math.ceil(testResults.length / 2));
  const lower = testResults.slice(upper.length);
  const count = (status: TestStatus) => testResults.filter((r) => r.status === status).length;

  const tooth = (r: TestResult, index: number, arch: "upper" | "lower") => (
    <button
      key={r.id}
      type="button"
      aria-pressed={index === picked}
      aria-label={`${r.id}: ${r.case}, ${statusLabel[r.status]}`}
      onClick={() => setPicked(index)}
      className={cn(
        "flex h-9 min-w-0 flex-1 justify-center border-[1.5px] text-[11px] tabular-nums outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50 sm:h-14 sm:max-w-11",
        arch === "upper"
          ? "items-end rounded-t-[40%] rounded-b-[50%] pb-1.5"
          : "items-start rounded-t-[50%] rounded-b-[40%] pt-1.5",
        toothStyle[r.status],
        index === picked && "ring-2 ring-foreground ring-offset-2",
      )}
    >
      <span className="hidden sm:inline">{r.id}</span>
    </button>
  );

  return (
    <>
      <p className="mb-5 text-muted-foreground">
        {count("lulus")} lulus, {count("gagal")} gagal, {count("belum")} belum diuji. Pilih gigi
        untuk melihat kasusnya.
      </p>
      <div className="rounded-2xl border bg-card px-3 py-6 sm:px-6">
        <div className="flex justify-center gap-1 sm:gap-1.5">
          {upper.map((r, i) => tooth(r, i, "upper"))}
        </div>
        <div className="mt-2 flex justify-center gap-1 sm:mt-3 sm:gap-1.5">
          {lower.map((r, i) => tooth(r, upper.length + i, "lower"))}
        </div>
        <div aria-live="polite" className="mt-6 grid gap-5 border-t pt-5 sm:grid-cols-[1fr_15rem]">
          <div>
            <h3 className="text-lg font-semibold">{result.id}</h3>
            <p className="mt-1">{result.case}</p>
            <p className="mt-1 text-muted-foreground">Diharapkan: {result.expected}</p>
            <p
              className={cn(
                "mt-3 font-medium",
                result.status === "lulus" && "text-primary",
                result.status === "gagal" && "text-destructive",
                result.status === "belum" && "text-muted-foreground",
              )}
            >
              {statusLabel[result.status]}
            </p>
          </div>
          {result.evidenceUrl ? (
            <a href={result.evidenceUrl} className="block overflow-hidden rounded-xl border">
              <img
                src={result.evidenceUrl}
                alt={`Tangkapan layar WorkBuddy untuk ${result.id}`}
                className="aspect-[16/10] w-full object-cover object-top"
              />
            </a>
          ) : (
            <p className="flex aspect-[16/10] items-center justify-center rounded-xl border border-dashed bg-muted p-3 text-center text-sm text-muted-foreground">
              Belum ada tangkapan layar
            </p>
          )}
        </div>
      </div>
      <details className="mt-6">
        <summary className="cursor-pointer font-medium">Semua {testResults.length} kasus</summary>
        <table className="mt-3 w-full text-left text-sm">
          <thead className="border-b">
            <tr>
              <th scope="col" className="py-2 pr-3 font-medium">
                ID
              </th>
              <th scope="col" className="py-2 pr-3 font-medium">
                Kasus
              </th>
              <th scope="col" className="py-2 font-medium">
                Status
              </th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {testResults.map((r) => (
              <tr key={r.id} data-test-id={r.id} className="align-top">
                <td className="py-2 pr-3 tabular-nums">{r.id}</td>
                <td className="py-2 pr-3">
                  {r.case}
                  <span className="block text-muted-foreground">{r.expected}</span>
                </td>
                <td
                  className={cn(
                    "py-2 whitespace-nowrap",
                    r.status === "lulus" && "text-primary",
                    r.status === "gagal" && "font-medium text-destructive",
                  )}
                >
                  {r.evidenceUrl ? (
                    <a href={r.evidenceUrl} className="underline underline-offset-4">
                      {statusLabel[r.status]}
                    </a>
                  ) : (
                    statusLabel[r.status]
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </details>
    </>
  );
}

function Terms({ terms, className }: { terms: Term[]; className: string }) {
  return (
    <dl className={`grid gap-6 ${className}`}>
      {terms.map((term) => (
        <div key={term.title}>
          <dt className="font-semibold">{term.title}</dt>
          <dd className="mt-1 text-muted-foreground">{term.body}</dd>
        </div>
      ))}
    </dl>
  );
}

function Section({ id, title, children }: { id: string; title: string; children: ReactNode }) {
  return (
    <section id={id} aria-labelledby={`${id}-title`} className="border-t py-12">
      <h2 id={`${id}-title`} className="mb-6 text-2xl font-semibold tracking-tight">
        {title}
      </h2>
      {children}
    </section>
  );
}
