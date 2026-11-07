import { createFileRoute } from "@tanstack/react-router";
import { openSession } from "@/brain/staff";
import { sessionCookie } from "@/session";

/** Demo Login: one click signs in as one of four seeded staff members. */
export const Route = createFileRoute("/demo/$id")({
  server: {
    handlers: {
      POST: async ({ params }) => {
        const secret = await openSession(params.id);
        if (!secret) return new Response(null, { status: 404 });
        return new Response(null, {
          status: 303,
          headers: {
            Location: "/pasien",
            "Set-Cookie": sessionCookie(secret),
          },
        });
      },
    },
  },
});
