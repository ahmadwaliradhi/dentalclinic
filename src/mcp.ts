import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { WebStandardStreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js";
import { z } from "zod";
import { ask } from "./brain/ask";
import { kpi } from "./brain/kpi";
import { staffForToken } from "./brain/pairing";

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
