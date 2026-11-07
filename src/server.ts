import handler from "@tanstack/react-start/server-entry";

export default {
  fetch(request) {
    return handler.fetch(request);
  },
  async scheduled(_event, _env, _ctx) {
    // Nightly seed reset belongs to a later ticket.
  },
} satisfies ExportedHandler<Env>;
