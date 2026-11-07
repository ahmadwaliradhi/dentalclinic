import handler from "@tanstack/react-start/server-entry";
import { nightly } from "./brain/nightly";
import { handleMcp } from "./mcp";

export default {
  fetch(request) {
    // Agents reach the Klinik Brain over MCP; people use the web app.
    if (new URL(request.url).pathname === "/mcp") return handleMcp(request);
    return handler.fetch(request);
  },
  async scheduled(_event, _env, _ctx) {
    await nightly();
  },
} satisfies ExportedHandler<Env>;
