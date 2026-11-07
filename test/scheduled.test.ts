import { env, exports } from "cloudflare:workers";
import { expect, it } from "vitest";
import { auditFor } from "../src/brain/jejak-audit";
import { decide, inbox, proposeRecallMessages } from "../src/brain/recall";
import type { Staff } from "../src/brain/staff";

// Vitest exposes scheduled events on its loopback stub; generated Fetcher types do not.
const worker = exports.default as typeof exports.default & {
  scheduled(options: { cron: string }): Promise<void>;
};

const rina: Staff = { id: "rina", name: "drg. Rina", role: "Pemilik" };

it("restores the demo seed nightly and declines the seeded expired Proposal", async () => {
  const { proposals } = await proposeRecallMessages(rina);
  await decide(rina, proposals[0].id, "accepted");
  await env.DB.prepare("DELETE FROM appointments WHERE id = 1").run();

  await worker.scheduled({ cron: "0 17 * * *" });
  await worker.scheduled({ cron: "0 17 * * *" });

  expect(
    await env.DB.prepare(
      "SELECT id, patient_no, decision, decided_by FROM proposals ORDER BY id",
    ).all(),
  ).toMatchObject({
    results: [{ id: 1, patient_no: "P-0035", decision: "declined", decided_by: null }],
  });
  expect(await env.DB.prepare("SELECT patient_no FROM appointments WHERE id = 1").first()).toEqual({
    patient_no: "P-0002",
  });
  expect((await inbox(rina)).map((proposal) => proposal.status)).toEqual(["expired"]);
  // Logged once, however many nights pass.
  expect(
    (await auditFor(rina)).filter(
      (row) => row.question === "Recall Message P-0035" && row.reason === "expired",
    ),
  ).toEqual([expect.objectContaining({ decision: "declined" })]);
});
