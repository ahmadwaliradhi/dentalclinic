import { exports } from "cloudflare:workers";
import { expect, it } from "vitest";
import { inbox } from "../src/brain/proposals";
import type { Staff } from "../src/brain/staff";
import { callTool, demoLogin, mcp, pair, SITE } from "./site";

// Recall end to end over HTTP: an agent proposes over MCP, a person decides in the web app.

const rina: Staff = { id: "rina", name: "drg. Rina", role: "Pemilik" };

function decide(id: number, decision: string, headers: Record<string, string>) {
  const body = new FormData();
  body.set("decision", decision);
  return exports.default.fetch(`${SITE}/persetujuan/${id}`, {
    method: "POST",
    headers,
    body,
    redirect: "manual",
  });
}

async function inboxPage(cookie: string) {
  return (await exports.default.fetch(`${SITE}/persetujuan`, { headers: { cookie } })).text();
}

it("offers MCP tools to find and propose, and none to accept, decline or send", async () => {
  for (const staffId of ["rina", "andi", "tari", "nina"]) {
    const { result } = await (
      await mcp(await pair(staffId), "tools/list")
    ).json<{
      result: { tools: { name: string }[] };
    }>();
    const names = result.tools.map((tool) => tool.name);

    expect(names).toEqual(expect.arrayContaining(["due_for_recall", "propose_recall_message"]));
    expect(names.join(" ")).not.toMatch(/accept|decline|decide|approve|send|kirim/);
  }
});

it("lists Due for Recall over MCP with reasons and Sources, marking who has no WA Opt-in", async () => {
  const { text, patients } = await callTool(await pair("andi"), "due_for_recall", {});

  expect(text).toContain("P-0004 Rudi Hartono, drg. Andi: PSA gigi 17 baru 1 dari 3 kunjungan");
  expect(text).toMatch(/P-0009 Wulan Purnama.*Tanpa WA Opt-in/);
  expect(text).toContain("emr://patient/P-0004/visit/1");
  expect(patients.every((patient: { dentist: string }) => patient.dentist === "drg. Andi")).toBe(
    true,
  );
});

it('turns "kirim pengingat ke semua pasien" into Proposals only, nothing sendable (T10)', async () => {
  const { text, proposals } = await callTool(await pair("rina"), "propose_recall_message", {});

  expect(proposals.length).toBeGreaterThan(0);
  expect(text).toContain("Belum ada yang terkirim");
  expect(JSON.stringify({ text, proposals })).not.toContain("wa.me");
  const proposed = (await inbox(rina)).filter((p) =>
    proposals.some((q: { id: number }) => q.id === p.id),
  );
  expect(proposed.every((p) => p.status === "pending" && p.whatsapp === null)).toBe(true);
});

it("lets no MCP token decide a Proposal", async () => {
  await callTool(await pair("rina"), "propose_recall_message", {});
  const [proposal] = (await inbox(rina)).filter((p) => p.status === "pending");

  const token = await pair("rina");
  const response = await decide(proposal.id, "accepted", { Authorization: `Bearer ${token}` });

  expect(response.status).toBe(401);
  expect((await inbox(rina)).find((p) => p.id === proposal.id)?.status).toBe("pending");
});

it("shows the full text and recipient, then a wa.me link once drg. Rina accepts", async () => {
  await callTool(await pair("rina"), "propose_recall_message", {});
  const cookie = await demoLogin("rina");
  const [proposal] = (await inbox(rina)).filter((p) => p.status === "pending");

  const before = await inboxPage(cookie);
  expect(before).toContain(proposal.name);
  expect(before).toContain(proposal.phone);
  expect(before).toContain(proposal.text);

  const response = await decide(proposal.id, "accepted", { cookie });
  expect(response.status).toBe(303);
  expect(response.headers.get("location")).toBe("/persetujuan");
  const accepted = (await inbox(rina)).find((p) => p.id === proposal.id);
  expect(accepted?.whatsapp).toMatch(/^https:\/\/wa\.me\/62\d+\?text=Halo%20/);
  expect(await inboxPage(cookie)).toContain(`href="${accepted?.whatsapp}"`);
});

it("leaves no wa.me link after a decline (T11)", async () => {
  await callTool(await pair("rina"), "propose_recall_message", {});
  const cookie = await demoLogin("rina");
  const [proposal] = (await inbox(rina)).filter((p) => p.status === "pending");

  await decide(proposal.id, "declined", { cookie });

  expect((await inbox(rina)).find((p) => p.id === proposal.id)).toMatchObject({
    status: "declined",
    whatsapp: null,
  });
});

it("shows the seeded expired Proposal as expired (T12)", async () => {
  expect(await inboxPage(await demoLogin("rina"))).toContain("Kedaluwarsa");
});

it("gives Nina no inbox and no way to decide", async () => {
  await callTool(await pair("rina"), "propose_recall_message", {});
  const cookie = await demoLogin("nina");
  const [proposal] = (await inbox(rina)).filter((p) => p.status === "pending");

  expect(await inboxPage(cookie)).not.toContain('href="/persetujuan"');
  await decide(proposal.id, "accepted", { cookie });

  expect((await inbox(rina)).find((p) => p.id === proposal.id)?.status).toBe("pending");
});
