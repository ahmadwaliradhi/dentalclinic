import { env } from "cloudflare:workers";
import { expect, it } from "vitest";
import plugin from "../expert/dira-cepat/.codebuddy-plugin/plugin.json";
import agent from "../expert/dira-cepat/agents/dira-cepat.md?raw";
import { ask } from "../src/brain/ask";
import type { Staff } from "../src/brain/staff";
import release from "../src/data/release.json";

const nina: Staff = { id: "nina", name: "Nina", role: "Front Office" };

it("follows WorkBuddy's single-agent Expert rules", () => {
  expect(plugin).toMatchObject({
    name: "dira-cepat",
    plugin: "dira-cepat",
    expertType: "agent",
    agentName: "dira-cepat",
    agents: ["./agents/dira-cepat.md"],
    avatar: "avatars/expert.png",
    displayName: { en: "Dira Cepat", zh: "Dira Cepat" },
  });
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

  const frontmatter = agent.match(/^---\n([\s\S]*?)\n---\n/)?.[1];
  expect(frontmatter).toContain("name: dira-cepat\n");
  expect(frontmatter).not.toContain("tools:");
});

it("reaches the Dental Clinic Brain over MCP with a staff token typed into WorkBuddy's connect form", () => {
  const server = plugin.mcpServers["dental-clinic-brain"];

  // WorkBuddy imports the server with `new URL(url)`, then fills ${KEY} from the form fields.
  expect(new URL(server.url).href).toBe("https://dentalclinic.ahmadwaliradhi.workers.dev/mcp");
  expect(server.headers).toEqual({ Authorization: "Bearer ${DENTALCLINIC_TOKEN}" });
  expect(server["x-workbuddy"].auth).toMatchObject({
    type: "token",
    tokenSchema: { fields: [{ key: "DENTALCLINIC_TOKEN", type: "password", required: true }] },
  });
  expect(JSON.stringify(plugin) + agent).not.toMatch(/demo-(rina|andi|tari|nina)/);
});

it("answers each quick prompt from its own SOP section", async () => {
  const cited = [];
  for (const prompt of plugin.quickPrompts) {
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

it("serves the Expert zip where the landing page links to it", async () => {
  expect(release.expertZipUrl).toBe("/dira-cepat.zip");
  const response = await env.ASSETS.fetch(`https://dentalclinic.test${release.expertZipUrl}`);

  expect(response.status).toBe(200);
  expect(response.headers.get("content-type")).toBe("application/zip");
  // A zip starts with the local file header signature PK\x03\x04.
  expect([...new Uint8Array(await response.arrayBuffer()).slice(0, 4)]).toEqual([
    0x50, 0x4b, 0x03, 0x04,
  ]);
});
