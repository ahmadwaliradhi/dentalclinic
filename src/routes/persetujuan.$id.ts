import { createFileRoute } from "@tanstack/react-router";
import { decide } from "@/brain/proposals";
import { signedIn } from "@/session";

/**
 * An Approval Decision, posted by a plain form in the approvals inbox. Only a web session decides:
 * an MCP bearer token never reaches this.
 */
export const Route = createFileRoute("/persetujuan/$id")({
  server: {
    handlers: {
      POST: async ({ params, request }) => {
        const caller = await signedIn();
        if (!caller) return new Response(null, { status: 401 });
        const decision = (await request.formData()).get("decision");
        if (decision !== "accepted" && decision !== "declined") {
          return new Response(null, { status: 400 });
        }
        // A Proposal the caller may not decide, or no longer can, is left as it is.
        await decide(caller, Number(params.id), decision);
        return new Response(null, { status: 303, headers: { Location: "/persetujuan" } });
      },
    },
  },
});
