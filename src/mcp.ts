import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { WebStandardStreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js";
import { z } from "zod";
import { ask } from "./brain/ask";
import { kpi } from "./brain/kpi";
import { staffForToken } from "./brain/pairing";
import { dueForRecall, proposeRecallMessages } from "./brain/recall";
import { proposeStokOpname } from "./brain/stok-opname";

/** Stateless MCP endpoint. The bearer token alone decides who is calling. */
export async function handleMcp(request: Request): Promise<Response> {
  const token = request.headers.get("Authorization")?.match(/^Bearer (.+)$/i)?.[1];
  const caller = token ? await staffForToken(token) : null;
  if (!caller) {
    return new Response(null, { status: 401, headers: { "WWW-Authenticate": "Bearer" } });
  }

  const server = new McpServer({ name: "dentalclinic", version: "1.0.0" });

  server.registerTool(
    "who_am_i",
    {
      description: "The staff member and Role this connection acts as.",
      annotations: { readOnlyHint: true },
    },
    () => toolResult({ name: caller.name, role: caller.role }),
  );

  server.registerTool(
    "ask",
    {
      description:
        "Answer a question about Klinik Gigi Senyum Sejahtera from its Sources. Show `text` to the user exactly as returned.",
      inputSchema: { question: z.string().min(1) },
      annotations: { readOnlyHint: true },
    },
    async ({ question }) => toolResult(await ask(caller, question)),
  );

  server.registerTool(
    "due_for_recall",
    {
      description:
        "Patients Due for Recall that this staff member may see, each with the reason and its Source. Show `text` to the user exactly as returned.",
      annotations: { readOnlyHint: true },
    },
    async () => toolResult(await dueForRecall(caller)),
  );

  // Proposing is as far as an agent goes: no tool accepts, declines or sends a Proposal.
  server.registerTool(
    "propose_recall_message",
    {
      description:
        "Prepare a Recall Message Proposal for each patient Due for Recall with WA Opt-in, or only the given No RM. Nothing is sent: a human accepts each one on the site within 24 hours, then sends it. Show `text` to the user exactly as returned.",
      inputSchema: { patients: z.array(z.string()).optional() },
      annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: true },
    },
    async ({ patients }) => toolResult(await proposeRecallMessages(caller, new Date(), patients)),
  );

  server.registerTool(
    "propose_stok_opname",
    {
      description:
        "Prepare a Stok Opname Request: a physical count of a stock card item whose Sources disagree on its stock. Only when the staff member asks for one. Never a reorder, and stock does not change: the Pemilik or a Perawat Gigi accepts it on the site within 24 hours. Show `text` to the user exactly as returned.",
      inputSchema: { item: z.string().min(1) },
      annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: true },
    },
    async ({ item }) => toolResult(await proposeStokOpname(caller, item)),
  );

  // Finance tools register for the Pemilik alone; T18 pins the rest.
  if (caller.role === "Pemilik") {
    server.registerTool(
      "kpi",
      {
        description:
          "Keuangan & Aset: Payback per Aset, Margin per Tindakan and overhead %, with formula and Sources. Show `text` to the user exactly as returned.",
        inputSchema: { query: z.string().min(1) },
        annotations: { readOnlyHint: true },
      },
      async ({ query }) => toolResult(await kpi(caller, query)),
    );
  }

  const transport = new WebStandardStreamableHTTPServerTransport({ enableJsonResponse: true });
  await server.connect(transport);
  return transport.handleRequest(request);
}

/** An MCP tool result carrying `value` as JSON text. */
function toolResult(value: unknown) {
  return { content: [{ type: "text" as const, text: JSON.stringify(value) }] };
}
