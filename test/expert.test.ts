import { env } from "cloudflare:workers";
import { expect, it } from "vitest";
import cepat from "../expert/dira-cepat/.codebuddy-plugin/plugin.json";
import cepatPrompt from "../expert/dira-cepat/agents/dira-cepat.md?raw";
import team from "../expert/dentalclinic-team/.codebuddy-plugin/plugin.json";
import diraPrompt from "../expert/dentalclinic-team/agents/dentalclinic-team-lead.md?raw";
import bimaPrompt from "../expert/dentalclinic-team/agents/keuangan-aset.md?raw";
import sariPrompt from "../expert/dentalclinic-team/agents/pasien-recall.md?raw";
import wulanPrompt from "../expert/dentalclinic-team/agents/peninjau.md?raw";
import teamSettings from "../expert/dentalclinic-team/settings.json";
import { ask } from "../src/brain/ask";
import { mask } from "../src/brain/mask";
import { dueForRecall, proposeRecallMessages } from "../src/brain/recall";
import { refusal } from "../src/brain/reply";
import type { Staff } from "../src/brain/staff";
import release from "../src/data/release.json";

const rina: Staff = { id: "rina", name: "drg. Rina", role: "Pemilik" };
const nina: Staff = { id: "nina", name: "Nina", role: "Front Office" };

/** The seed's "today": 7 November 2026, 10.00 WIB. */
const NOW = new Date("2026-11-07T03:00:00Z");

const experts = [
  { plugin: cepat, prompts: { "dira-cepat": cepatPrompt } },
  {
    plugin: team,
    prompts: {
      "dentalclinic-team-lead": diraPrompt,
      "pasien-recall": sariPrompt,
      "keuangan-aset": bimaPrompt,
      peninjau: wulanPrompt,
    },
  },
];

const avatars = Object.keys(import.meta.glob("../expert/*/avatars/*.png"));

for (const { plugin, prompts } of experts) {
  it(`${plugin.name} follows WorkBuddy's Expert rules`, () => {
    expect(plugin.plugin).toBe(plugin.name);
    expect(plugin.agents).toEqual(Object.keys(prompts).map((id) => `./agents/${id}.md`));
    expect(Object.keys(prompts)).toContain(plugin.agentName);
    for (const field of ["displayName", "profession", "displayDescription", "defaultInitPrompt"]) {
      expect(plugin[field as keyof typeof plugin]).toEqual({
        en: expect.any(String),
        zh: expect.any(String),
      });
    }
    // WorkBuddy wants the Chinese description at 40–50 characters.
    expect([...plugin.displayDescription.zh].length).toBeGreaterThanOrEqual(40);
    expect([...plugin.displayDescription.zh].length).toBeLessThanOrEqual(50);
    expect(plugin.tags).toHaveLength(3);
    expect(plugin.quickPrompts).toHaveLength(3);
    expect(plugin.defaultInitPrompt).toEqual(plugin.quickPrompts[0]);
    expect(avatars).toContain(`../expert/${plugin.name}/${plugin.avatar}`);

    for (const [id, prompt] of Object.entries(prompts)) {
      const frontmatter = prompt.match(/^---\n([\s\S]*?)\n---\n/)?.[1];
      expect(frontmatter, id).toContain(`name: ${id}\n`);
      expect(frontmatter, id).not.toContain("tools:");
    }
  });
}

it("leads the DentalClinic Team with Dira, who hands work to Sari, Bima and Wulan", () => {
  const members = ["pasien-recall", "keuangan-aset", "peninjau"];

  expect(team).toMatchObject({
    expertType: "team",
    agentName: "dentalclinic-team-lead",
    teamInfo: { leadAgent: "dentalclinic-team-lead", memberAgents: members },
    displayName: { en: "DentalClinic Team" },
  });
  // WorkBuddy shows a team's profession as its name.
  expect(team.profession).toEqual(team.displayName);
  expect(teamSettings).toEqual({ agent: team.agentName });
  expect(team.members.map(({ id, displayName, role }) => [id, displayName.en, role])).toEqual([
    ["dentalclinic-team-lead", "Dira", "lead"],
    ["pasien-recall", "Sari", "member"],
    ["keuangan-aset", "Bima", "member"],
    ["peninjau", "Wulan", "member"],
  ]);
  for (const member of team.members) {
    expect(member.displayName.zh).toBe(member.displayName.en);
    expect(member.profession).toEqual({ en: expect.any(String), zh: expect.any(String) });
    expect(avatars).toContain(`../expert/dentalclinic-team/${member.avatar}`);
  }
  // Dira spawns each member by its Agent ID.
  for (const id of members) expect(diraPrompt).toContain(`\`${id}\``);
});

it("reaches the Dental Clinic Brain over MCP with a staff token typed into WorkBuddy's connect form", () => {
  const server = cepat.mcpServers["dental-clinic-brain"];

  // WorkBuddy imports the server with `new URL(url)`, then fills ${KEY} from the form fields.
  expect(new URL(server.url).href).toBe("https://dentalclinic.ahmadwaliradhi.workers.dev/mcp");
  expect(server.headers).toEqual({ Authorization: "Bearer ${DENTALCLINIC_TOKEN}" });
  expect(server["x-workbuddy"].auth).toMatchObject({
    type: "token",
    tokenSchema: { fields: [{ key: "DENTALCLINIC_TOKEN", type: "password", required: true }] },
  });
  // The team connects the same way, so one token serves both Experts.
  expect(team.mcpServers).toEqual(cepat.mcpServers);
  for (const { plugin, prompts } of experts) {
    expect(JSON.stringify(plugin) + Object.values(prompts).join()).not.toMatch(
      /demo-(rina|andi|tari|nina)/,
    );
  }
});

it("pairs through the same Worker that serves its MCP server, the same way in both Experts", () => {
  const origin = new URL(cepat.mcpServers["dental-clinic-brain"].url).origin;
  // The numbered pairing steps, from "1. Run" to the end of the prompt.
  const steps = (prompt: string) => prompt.slice(prompt.indexOf("\n1. Run `curl"));

  expect(steps(cepatPrompt)).toContain(`curl -s -X POST ${origin}/pairing\``);
  expect(steps(cepatPrompt)).toContain(`${origin}/pairing/token`);
  expect(steps(diraPrompt)).toBe(steps(cepatPrompt));
});

it("answers each Dira Cepat quick prompt from its own SOP section", async () => {
  const cited = [];
  for (const prompt of cepat.quickPrompts) {
    for (const question of [prompt.en, prompt.zh]) {
      const answer = await ask(nina, question);
      expect(answer.decision, question).toBe("answered");
      cited.push(answer.citations[0].uri);
    }
  }

  expect(cited).toEqual([
    "doc://sop/jam-operasional#jam-praktik",
    "doc://sop/jam-operasional#jam-praktik",
    "doc://sop/sterilisasi#instrumen",
    "doc://sop/sterilisasi#instrumen",
    "doc://sop/pendaftaran#janji-temu",
    "doc://sop/pendaftaran#janji-temu",
  ]);
});

it("gives the PSA quick prompt, as Sari calls it, the list and Recall Messages for PSA patients", async () => {
  const [psa] = team.quickPrompts;
  expect(psa.en).toBe("Siapa yang belum selesai PSA bulan lalu? Buatkan pengingat.");

  const due = await dueForRecall(rina, NOW);
  const unfinished = due.patients.filter((patient) => patient.reason.startsWith("PSA"));

  expect(unfinished.map((patient) => patient.noRm)).toEqual(["P-0004", "P-0009", "P-0015"]);
  expect(due.text).toContain(
    "P-0004 Rudi Hartono, drg. Andi: PSA gigi 17 baru 1 dari 3 kunjungan, terakhir 5 Agustus 2026.",
  );
  expect(due.text).toContain("[1] emr://patient/P-0004/visit/1");

  const proposed = await proposeRecallMessages(
    rina,
    NOW,
    unfinished.map((patient) => patient.noRm),
  );

  // P-0009 and P-0015 have no WA Opt-in, so they are named but get no Recall Message.
  expect(proposed.proposals.map((proposal) => proposal.noRm)).toEqual(["P-0004"]);
  expect(proposed.text).toBe(
    "1 Recall Message menunggu persetujuan di halaman Persetujuan. Belum ada yang terkirim.\n\n" +
      "Tanpa WA Opt-in, tidak dihubungi lewat WhatsApp: P-0009 Wulan Purnama, P-0015 Yuni Astuti.",
  );
});

it("answers the Keuangan & Aset quick prompts, as Bima asks them, with formula and Sources", async () => {
  const [, scaler, both] = team.quickPrompts;
  expect(scaler.en).toBe("Scaler ultrasonik balik modal kapan?");

  const payback = await ask(rina, scaler.en);
  expect(payback.decision).toBe("answered");
  expect(payback.text).toMatch(/^Scaler ultrasonik: Payback 4,7 bulan/);
  expect(payback.text).toContain("\n\nRumus: Payback = harga Aset ÷ margin per bulan");
  expect(payback.text).toContain("[1] doc://aset/scaler-ultrasonik (3 Agustus 2026)");

  // The combined prompt goes to Sari and Bima at once; Bima's part is the margin.
  const margin = await ask(rina, both.en);
  expect(margin.decision).toBe("answered");
  expect(margin.text).toContain("PSA, drg. Andi: Rp800.000 − Rp120.000 − Rp320.000 = Rp360.000");
  expect(margin.text).toContain("Rumus: Margin per Tindakan = tarif − BMHP − fee dokter.");

  // Any other Role gets the Refusal from the same call, which Wulan then checks.
  expect((await ask(nina, scaler.en)).decision).toBe("refusal");
});

it("has Wulan hold results to the engine's own Refusal and masking", () => {
  expect(wulanPrompt).toContain(refusal({ id: "", name: "<name>", role: "Pemilik" }));
  for (const shown of ["3201011234561234", "0857-1148-2212", "rudi.h@gmail.com"]) {
    expect(wulanPrompt).toContain(`\`${mask(shown)}\``);
  }
});

it("serves each Expert zip where the landing page links to it", async () => {
  expect(release.expertZipUrl).toBe("/dentalclinic-expert.zip");
  expect(release.teamZipUrl).toBe("/dentalclinic-team.zip");

  for (const url of [release.expertZipUrl, release.teamZipUrl]) {
    const response = await env.ASSETS.fetch(`https://dentalclinic.test${url}`);

    expect(response.status, url).toBe(200);
    expect(response.headers.get("content-type")).toBe("application/zip");
    // A zip starts with the local file header signature PK\x03\x04.
    expect([...new Uint8Array(await response.arrayBuffer()).slice(0, 4)]).toEqual([
      0x50, 0x4b, 0x03, 0x04,
    ]);
  }
});
