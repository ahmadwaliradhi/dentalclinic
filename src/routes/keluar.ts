import { createFileRoute } from "@tanstack/react-router";
import { closeSession } from "@/brain/staff";
import { sessionCookie, sessionSecret } from "@/session";

export const Route = createFileRoute("/keluar")({
  server: {
    handlers: {
      POST: async () => {
        const secret = sessionSecret();
        if (secret) await closeSession(secret);
        return new Response(null, {
          status: 303,
          headers: {
            Location: "/",
            "Set-Cookie": sessionCookie(null),
          },
        });
      },
    },
  },
});
