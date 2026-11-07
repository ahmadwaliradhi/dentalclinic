import { createFileRoute } from "@tanstack/react-router";
import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import release from "@/data/release.json";
import testResultsData from "@/data/test-results.json";

export const Route = createFileRoute("/")({
  head: () => ({ meta: [{ title: "DentalClinic Brain" }] }),
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
    question: "Bisakah Klinik Brain mengirim WhatsApp sendiri?",
    answer:
      "Tidak. Ia hanya menyiapkan Recall Message. Staf menyetujuinya di situs lalu mengirim sendiri lewat tautan wa.me.",
  },
  {
    question: "Bagaimana Klinik Brain tahu siapa saya?",
    answer:
      "Dari Identity Pairing, bukan dari isi chat. Token hanya boleh membaca dan mengajukan Proposal, dan berlaku 90 hari.",
  },
  {
    question: "Mengapa data yang tidak ada dan data terlarang dijawab sama?",
    answer: "Agar tidak ada yang bisa menebak pasien atau data mana yang ada.",
  },
  {
    question: "Bisakah saya mengobrol dengan Klinik Brain di situs ini?",
    answer:
      "Tidak. Percakapan hanya lewat WorkBuddy. Situs ini untuk persetujuan, Jejak Audit dan data baca saja.",
  },
];

function Landing() {
  return (
    <main className="mx-auto max-w-3xl px-4 sm:px-6">
      <Hero />
      <Section id="prinsip" title="Prinsip">
        <Terms terms={principles} className="sm:grid-cols-3" />
      </Section>
      <Section id="tim" title="Tim">
        <Terms terms={team} className="grid-cols-2 sm:grid-cols-4" />
        {release.teamZipUrl && (
          <Button asChild variant="outline" className="mt-8">
            <a href={release.teamZipUrl}>Unduh Tim</a>
          </Button>
        )}
      </Section>
      <Section id="demo-login" title="Demo Login">
        <ul className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {staff.map((s) => (
            <li key={s.slug}>
              <form method="post" action={`/demo/${s.slug}`}>
                <Button
                  type="submit"
                  variant="outline"
                  className="h-auto w-full flex-col items-start p-3"
                >
                  <span>{s.name}</span>
                  <span className="font-normal text-muted-foreground">{s.role}</span>
                </Button>
              </form>
            </li>
          ))}
        </ul>
      </Section>
      <Section id="akuntabilitas" title="Akuntabilitas">
        <div className="grid gap-6 sm:grid-cols-3">
          {accountability.map((column) => (
            <div key={column.title}>
              <h3 className="font-medium">{column.title}</h3>
              <ul className="mt-2 space-y-1.5 text-muted-foreground">
                {column.items.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </Section>
      <Section id="hasil-uji" title="Hasil uji">
        <TestResults />
      </Section>
      <Section id="arsitektur" title="Arsitektur">
        <img
          src="/arsitektur.svg"
          alt="WorkBuddy Expert memanggil tool MCP di Cloudflare Worker. Engine Klinik Brain memeriksa izin, mencari di D1, menyamarkan data, mendeteksi injeksi, memvalidasi sitasi dan menulis Jejak Audit. Situs web menampilkan persetujuan dan Jejak Audit dari D1 yang sama."
          width={720}
          height={360}
          className="h-auto w-full"
        />
      </Section>
      <Section id="video" title="Video">
        {release.videoEmbedUrl ? (
          <iframe
            src={release.videoEmbedUrl}
            title="Demo DentalClinic Brain"
            allow="encrypted-media; picture-in-picture"
            allowFullScreen
            className="aspect-video w-full rounded-lg border"
          />
        ) : (
          <p className="flex aspect-video items-center justify-center rounded-lg border text-muted-foreground">
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
      <footer id="footer" className="flex flex-wrap justify-between gap-2 border-t py-8 text-sm">
        <span>DentalClinic Brain</span>
        <a href={release.githubUrl} className="underline underline-offset-4">
          GitHub
        </a>
      </footer>
    </main>
  );
}

function Hero() {
  const hasLink = release.launchUrl || release.expertZipUrl;

  return (
    <header id="hero" className="py-20 sm:py-28">
      <h1 className="text-4xl font-semibold tracking-tight sm:text-5xl">DentalClinic Brain</h1>
      <div className="mt-8 flex flex-wrap gap-3">
        {release.launchUrl && (
          <Button asChild size="lg">
            <a href={release.launchUrl}>Buka di WorkBuddy</a>
          </Button>
        )}
        {release.expertZipUrl && (
          <Button asChild size="lg" variant="outline">
            <a href={release.expertZipUrl}>Unduh Expert</a>
          </Button>
        )}
        {!hasLink && <p className="text-muted-foreground">Segera tersedia</p>}
      </div>
    </header>
  );
}

function TestResults() {
  return (
    <table className="w-full text-left text-sm">
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
        {testResults.map((result) => (
          <tr key={result.id} data-test-id={result.id} className="align-top">
            <td className="py-2 pr-3 font-mono">{result.id}</td>
            <td className="py-2 pr-3">
              {result.case}
              <span className="block text-muted-foreground">{result.expected}</span>
            </td>
            <td
              className={`py-2 whitespace-nowrap ${result.status === "gagal" ? "font-medium text-destructive" : ""}`}
            >
              {result.evidenceUrl ? (
                <a href={result.evidenceUrl} className="underline underline-offset-4">
                  {statusLabel[result.status]}
                </a>
              ) : (
                statusLabel[result.status]
              )}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function Terms({ terms, className }: { terms: Term[]; className: string }) {
  return (
    <dl className={`grid gap-6 ${className}`}>
      {terms.map((term) => (
        <div key={term.title}>
          <dt className="font-medium">{term.title}</dt>
          <dd className="mt-1 text-muted-foreground">{term.body}</dd>
        </div>
      ))}
    </dl>
  );
}

function Section({ id, title, children }: { id: string; title: string; children: ReactNode }) {
  return (
    <section id={id} aria-labelledby={`${id}-title`} className="border-t py-14">
      <h2 id={`${id}-title`} className="mb-6 text-2xl font-semibold tracking-tight">
        {title}
      </h2>
      {children}
    </section>
  );
}
