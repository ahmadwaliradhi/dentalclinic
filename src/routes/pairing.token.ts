import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { claimToken } from "@/brain/pairing";

const Poll = z.object({ secret: z.string() });

/**
 * Identity Pairing, step 3: WorkBuddy polls with its secret. 202 until the staff member confirms
 * the code, then 200 with the token, once. 401 for an unknown, used or expired pairing.
 */
export const Route = createFileRoute("/pairing/token")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const body = Poll.safeParse(await request.json().catch(() => null));
        const claim = body.success ? await claimToken(body.data.secret) : null;
        if (claim === "pending") return new Response(null, { status: 202 });
        if (!claim) return new Response(null, { status: 401 });
        return Response.json(claim);
      },
    },
  },
});
