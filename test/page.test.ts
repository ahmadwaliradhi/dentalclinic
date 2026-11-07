import { env, exports } from "cloudflare:workers";
import { expect, it } from "vitest";
import release from "../src/data/release.json";
import testResults from "../src/data/test-results.json";

async function landingHtml() {
  const response = await exports.default.fetch("https://dentalclinic.test/");
  return { response, html: await response.text() };
}

function escapeHtml(text: string) {
  return text
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

it("serves the Indonesian Dental Clinic Brain landing page from the Worker", async () => {
  const { response, html } = await landingHtml();

  expect(response.status).toBe(200);
  expect(response.headers.get("content-type")).toContain("text/html");
  expect(html).toContain('<html lang="id">');
  expect(html).toContain("<title>Dental Clinic Brain</title>");
  expect(html).toMatch(/<h1[^>]*>[^<]*menyebut sumbernya/);
  expect(html).toContain("/assets/");
});

it("renders every section in the order the spec lists", async () => {
  const { html } = await landingHtml();
  const ids = [
    "hero",
    "demo-login",
    "tim",
    "prinsip",
    "akuntabilitas",
    "hasil-uji",
    "arsitektur",
    "video",
    "mulai",
    "faq",
    "footer",
  ];

  const positions = ids.map((id) => html.indexOf(`id="${id}"`));
  expect(positions.every((position) => position > -1)).toBe(true);
  expect(positions).toEqual([...positions].sort((a, b) => a - b));
});

it("shows the launch link, Expert zips and video from data", async () => {
  const { html } = await landingHtml();

  // Empty data means "not published yet": the page says so instead of linking nowhere.
  const expectLink = (url: string, attribute: "href" | "src") =>
    url
      ? expect(html).toContain(`${attribute}="${escapeHtml(url)}"`)
      : expect(html).toContain("Segera tersedia");

  expectLink(release.launchUrl, "href");
  expectLink(release.expertZipUrl, "href");
  expectLink(release.videoEmbedUrl, "src");
  expect(html).not.toMatch(/href=""|src=""/);
});

it("names the three principles and the four agents, with the team's zip", async () => {
  const { html } = await landingHtml();
  const team = html.slice(html.indexOf('id="tim"'), html.indexOf('id="prinsip"'));

  for (const word of ["Sumber", "Izin", "Jejak"]) expect(html).toContain(word);
  for (const agent of ["Dira", "Sari", "Bima", "Wulan"]) expect(team).toContain(agent);
  expect(team).toContain(`href="${release.teamZipUrl}"`);
});

it("offers Demo Login as each of the four seeded staff members", async () => {
  const { html } = await landingHtml();

  for (const name of ["drg. Rina", "drg. Andi", "Tari", "Nina"]) expect(html).toContain(name);
  for (const id of ["rina", "andi", "tari", "nina"]) {
    expect(html).toMatch(new RegExp(`<form (?=[^>]*method="post")[^>]*action="/demo/${id}"`));
  }
});

it("states the accountability sheet from the spec", async () => {
  const { html } = await landingHtml();
  const sheet = html.slice(html.indexOf('id="akuntabilitas"'), html.indexOf('id="hasil-uji"'));

  for (const heading of ["Bisa sendiri", "Perlu persetujuan", "Tidak pernah"]) {
    expect(sheet).toContain(heading);
  }
  expect(sheet).toContain("Recall Message");
  expect(sheet).toContain("Stok Opname Request");
  expect(sheet).toContain("tanpa persetujuan");
  expect(sheet).toContain("25 tahun");
  expect(sheet).toContain("pajak");
  expect(sheet).toContain("SATUSEHAT");
});

it("renders one test results row per data entry, failures included", async () => {
  const { html } = await landingHtml();
  const table = html.slice(html.indexOf('id="hasil-uji"'), html.indexOf('id="arsitektur"'));
  const rows = table.match(/<tr data-test-id="[^"]+"/g) ?? [];

  expect(rows).toHaveLength(testResults.length);
  for (const result of testResults) {
    expect(table).toContain(`data-test-id="${result.id}"`);
    expect(table).toContain(escapeHtml(result.case));
  }
  const labels = { lulus: "Lulus", gagal: "Gagal", belum: "Belum diuji" } as Record<string, string>;
  for (const result of testResults) expect(table).toContain(labels[result.status]);
});

it("gives every image alt text and every frame a title", async () => {
  const { html } = await landingHtml();

  for (const tag of html.match(/<img\b[^>]*>/g) ?? []) expect(tag).toMatch(/alt="[^"]+"/);
  for (const tag of html.match(/<iframe\b[^>]*>/g) ?? []) expect(tag).toMatch(/title="[^"]+"/);
  expect(html).toMatch(/<img\b[^>]*src="\/arsitektur\.svg"/);
});

it("has no pricing, testimonials or client logos", async () => {
  const { html } = await landingHtml();

  expect(html).not.toMatch(/harga|testimoni|klien kami|\/bulan/i);
});

it("shows the tooth favicon in the browser tab", async () => {
  const { html } = await landingHtml();

  expect(html).toMatch(
    /<link (?=[^>]*rel="icon")(?=[^>]*type="image\/svg\+xml")[^>]*href="\/favicon\.svg"/,
  );
  const icon = await env.ASSETS.fetch("https://dentalclinic.test/favicon.svg");
  expect(icon.status).toBe(200);
  expect(icon.headers.get("content-type")).toContain("image/svg+xml");
  for (const png of ["/favicon.png", "/apple-touch-icon.png"]) {
    expect(html).toContain(`href="${png}"`);
    expect((await env.ASSETS.fetch(`https://dentalclinic.test${png}`)).status).toBe(200);
  }
});

it("walks a newcomer from Buka di WorkBuddy to the Refusal-then-answer check", async () => {
  const { html } = await landingHtml();
  const steps = html.slice(html.indexOf('id="mulai"'), html.indexOf('id="faq"'));

  expect(steps).toContain("Buka di WorkBuddy");
  expect(steps).toContain("DentalClinic Team");
  expect(steps).toContain("Hubungkan WorkBuddy");
  expect(steps).toContain("dental-clinic-brain");
  expect(steps).toContain("New Task");
  // Same question twice: Refusal as Nina, then the cited answer as drg. Rina.
  const order = [
    "Buka di WorkBuddy",
    "Nina",
    "P-0007",
    "Connectors",
    "sebagai drg. Rina",
    "emr://",
  ];
  const positions = order.map((text) => steps.indexOf(text));
  expect(positions.every((position) => position > -1)).toBe(true);
  expect(positions).toEqual([...positions].sort((a, b) => a - b));
});
