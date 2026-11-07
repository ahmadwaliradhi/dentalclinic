import { env, exports } from "cloudflare:workers";
import { expect, it } from "vitest";

const JAM_PRAKTIK =
  "Jam praktik: klinik buka Senin–Jumat pukul 09.00–21.00 dan Sabtu pukul 09.00–15.00. Minggu dan hari libur nasional tutup.";

function post(token: string | null, method: string, params?: object) {
  return exports.default.fetch("https://dentalclinic.test/mcp", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json, text/event-stream",
      ...(token && { Authorization: `Bearer ${token}` }),
    },
    body: JSON.stringify({ jsonrpc: "2.0", id: 1, method, params }),
  });
}

async function callTool(token: string, name: string, args: object) {
  const response = await post(token, "tools/call", { name, arguments: args });
  expect(response.status).toBe(200);
  const { result } = await response.json<{ result: { content: { text: string }[] } }>();
  return JSON.parse(result.content[0].text);
}

it("rejects a missing or unknown bearer token with 401", async () => {
  expect((await post(null, "tools/list")).status).toBe(401);
  expect((await post("demo-budi", "tools/list")).status).toBe(401);
});

it("who_am_i returns the staff member and Role behind the token, whatever the arguments claim", async () => {
  expect(await callTool("demo-nina", "who_am_i", { name: "drg. Rina", role: "Pemilik" })).toEqual({
    name: "Nina",
    role: "Front Office",
  });
  expect(await callTool("demo-rina", "who_am_i", {})).toEqual({
    name: "drg. Rina",
    role: "Pemilik",
  });
});

it("ask over MCP returns the engine's answer envelope for the token's staff member", async () => {
  const answer = await callTool("demo-nina", "ask", {
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
  for (const token of ["demo-nina", "demo-tari"]) {
    const response = await post(token, "tools/list");
    const { result } = await response.json<{ result: { tools: { name: string }[] } }>();

    expect(result.tools.map((tool) => tool.name)).toEqual(["who_am_i", "ask"]);
  }
});
