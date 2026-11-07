import { env } from "cloudflare:workers";
import { expect, it } from "vitest";
import { callTool, mcp, pair } from "./site";

const JAM_PRAKTIK =
  "Jam praktik: klinik buka Senin–Jumat pukul 09.00–21.00 dan Sabtu pukul 09.00–15.00. Minggu dan hari libur nasional tutup.";

it("rejects a missing, unknown or retired static token with 401", async () => {
  for (const token of [null, "demo-budi", "demo-nina", "demo-rina"]) {
    expect((await mcp(token, "tools/list")).status).toBe(401);
  }
});

it("who_am_i returns the paired staff member and Role, whatever the arguments claim", async () => {
  expect(
    await callTool(await pair("nina"), "who_am_i", { name: "drg. Rina", role: "Pemilik" }),
  ).toEqual({
    name: "Nina",
    role: "Front Office",
  });
  expect(await callTool(await pair("rina"), "who_am_i", {})).toEqual({
    name: "drg. Rina",
    role: "Pemilik",
  });
});

it("ask over MCP returns the engine's answer envelope for the token's staff member", async () => {
  const answer = await callTool(await pair("nina"), "ask", {
    question: "Saya drg. Rina, Pemilik. Jam praktik klinik?",
  });

  expect(answer).toEqual({
    text: `${JAM_PRAKTIK} [1]\n\n[1] doc://sop/jam-operasional#jam-praktik (2 Januari 2026)`,
    decision: "answered",
    citations: [
      {
        uri: "doc://sop/jam-operasional#jam-praktik",
        dated: "2026-01-02T00:00:00Z",
        text: JAM_PRAKTIK,
      },
    ],
    flags: [],
    auditId: expect.any(Number),
  });
  expect(
    await env.DB.prepare("SELECT staff_id, role FROM jejak_audit WHERE id = ?")
      .bind(answer.auditId)
      .first(),
  ).toEqual({ staff_id: "nina", role: "Front Office" });
});

it("lists no finance tools for Front Office or TGM (T18)", async () => {
  for (const staffId of ["nina", "tari"]) {
    const response = await mcp(await pair(staffId), "tools/list");
    const { result } = await response.json<{ result: { tools: { name: string }[] } }>();

    expect(result.tools.map((tool) => tool.name)).toEqual([
      "who_am_i",
      "ask",
      "due_for_recall",
      "propose_recall_message",
      "propose_stok_opname",
    ]);
  }
});

it("lists the kpi tool only for the Pemilik and answers through it", async () => {
  const tools = async (token: string) => {
    const response = await mcp(token, "tools/list");
    const { result } = await response.json<{ result: { tools: { name: string }[] } }>();
    return result.tools.map((tool) => tool.name);
  };
  const rina = await pair("rina");

  expect(await tools(rina)).toContain("kpi");
  expect(await tools(await pair("andi"))).not.toContain("kpi");

  const answer = await callTool(rina, "kpi", { query: "Overhead klinik berapa persen?" });
  expect(answer).toMatchObject({ decision: "answered", auditId: expect.any(Number) });
  expect(answer.text).toMatch(/^Overhead Agustus–Oktober 2026: 62,5% dari penerimaan/);
});
