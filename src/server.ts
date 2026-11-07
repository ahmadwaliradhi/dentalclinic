import handler from "@tanstack/react-start/server-entry";
import { handleMcp } from "./mcp";

export default {
  fetch(request) {
    // Agents reach the Klinik Brain over MCP; people use the web app.
    if (new URL(request.url).pathname === "/mcp") return handleMcp(request);
    return handler.fetch(request);
  },
  async scheduled(_event, _env, _ctx) {
    // Nightly seed reset belongs to a later ticket.
  },
} satisfies ExportedHandler<Env>;
