import { createFileRoute } from "@tanstack/react-router";
import { requestPairing } from "@/brain/pairing";

/** Identity Pairing, step 1: WorkBuddy asks for a code and shows the staff member `url`. */
export const Route = createFileRoute("/pairing")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const { code, secret } = await requestPairing();
        const url = new URL(`/perangkat?kode=${code}`, request.url).href;
        return Response.json({ code, secret, url }, { status: 201 });
      },
    },
  },
});
