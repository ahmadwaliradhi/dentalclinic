import { env } from "cloudflare:workers";
import { expect, it } from "vitest";
import { ask } from "../src/brain/ask";
import { auditFor } from "../src/brain/jejak-audit";
import { decide, inbox } from "../src/brain/proposals";
import type { Staff } from "../src/brain/staff";
import { proposeStokOpname } from "../src/brain/stok-opname";
import { callTool, demoLogin, get, pair, submit } from "./site";

const rina: Staff = { id: "rina", name: "drg. Rina", role: "Pemilik" };
const andi: Staff = { id: "andi", name: "drg. Andi", role: "Dokter Gigi Mitra" };
const tari: Staff = { id: "tari", name: "Tari", role: "TGM" };
const nina: Staff = { id: "nina", name: "Nina", role: "Front Office" };

const NOW = new Date("2026-11-07T03:00:00Z");

/** The undecided Stok Opname Request, proposing one first if none waits. */
async function pendingRequest(caller: Staff) {
  await proposeStokOpname(caller, "Resin komposit A2", NOW);
  return (await inbox(rina, NOW)).find((p) => p.kind === "stok_opname" && p.status === "pending")!;
}

const stockCard = async () =>
  (await env.DB.prepare("SELECT * FROM stock_items ORDER BY item").all()).results;

it("calls the stock uncertain, cites both Sources and only offers a Stok Opname Request (T22)", async () => {
  const proposals = () => env.DB.prepare("SELECT count(*) AS n FROM proposals").first<number>("n");
  const before = await proposals();

  const answer = await ask(tari, "Stok resin komposit A2 berapa?");

  expect(answer.decision).toBe("answered");
  expect(answer.text).toBe(
    "Stok Resin komposit A2 tidak pasti: [1] dan [2] berbeda. " +
      "Kartu stok resin komposit A2: 4 tube. [1] Stok resin komposit A2 tinggal 1 tube, ya. [2] " +
      "Hanya hitung fisik yang memastikan; minta saya mengajukan Stok Opname Request.\n\n" +
      "[1] task://kartu-stok/resin-komposit-a2 (31 Oktober 2026)\n" +
      "[2] chat://wa/grup-klinik/msg-2207 (6 November 2026)",
  );
  expect(answer.text).not.toMatch(/pesan ulang|reorder|memesan/i);
  expect(await proposals()).toBe(before);
});

it("proposes one Stok Opname Request for the disputed item, citing both Sources, for drg. Rina and Tari to decide", async () => {
  const { text, proposal } = await proposeStokOpname(nina, "resin komposit a2", NOW);

  expect(proposal).toMatchObject({ item: "Resin komposit A2" });
  expect(text).toBe(
    "Stok Opname Request Resin komposit A2 menunggu persetujuan di halaman Persetujuan.",
  );
  for (const caller of [rina, tari]) {
    expect((await inbox(caller, NOW)).find((p) => p.id === proposal?.id)).toMatchObject({
      kind: "stok_opname",
      name: "Resin komposit A2",
      phone: null,
      status: "pending",
      whatsapp: null,
      text: "Hitung fisik Resin komposit A2. Kartu stok resin komposit A2: 4 tube. Stok resin komposit A2 tinggal 1 tube, ya.",
    });
  }
  for (const caller of [andi, nina]) {
    expect((await inbox(caller, NOW)).map((p) => p.id)).not.toContain(proposal?.id);
  }
  expect(
    (await auditFor(rina)).find(
      (row) =>
        row.question === "Stok Opname Request Resin komposit A2" && row.decision === "proposed",
    ),
  ).toMatchObject({
    cited: ["task://kartu-stok/resin-komposit-a2", "chat://wa/grup-klinik/msg-2207"],
  });

  // A repeat request adds none while one is undecided.
  expect((await proposeStokOpname(tari, "Resin komposit A2", NOW)).proposal).toBeNull();
});

it("proposes nothing for an item whose stock no Source disputes, or that is not on the stock card", async () => {
  for (const item of ["Masker medis", "Implant titanium"]) {
    const { text, proposal } = await proposeStokOpname(tari, item, NOW);
    expect(proposal).toBeNull();
    expect(text).toBe(`Tidak ada Source yang berbeda tentang stok ${item}.`);
  }
});

it("records accept and decline in the Jejak Audit and changes no stock; Nina cannot decide", async () => {
  const card = await stockCard();
  const { id } = await pendingRequest(tari);

  expect(await decide(nina, id, "accepted", NOW)).toBeNull();
  expect(await decide(andi, id, "accepted", NOW)).toBeNull();
  expect(await decide(tari, id, "accepted", NOW)).toMatchObject({
    status: "accepted",
    whatsapp: null,
  });

  const next = await pendingRequest(rina);
  expect(await decide(rina, next.id, "declined", NOW)).toMatchObject({ status: "declined" });

  const decisions = (await auditFor(rina))
    .filter((row) => row.question === "Stok Opname Request Resin komposit A2")
    .map((row) => [row.staff, row.decision]);
  expect(decisions).toEqual(
    expect.arrayContaining([
      ["Tari", "accepted"],
      ["drg. Rina", "declined"],
    ]),
  );
  expect(await stockCard()).toEqual(card);
});

it("takes a Stok Opname Request over MCP and lets Tari, never Nina, decide it in the web app", async () => {
  const { text } = await callTool(await pair("nina"), "propose_stok_opname", {
    item: "Resin komposit A2",
  });
  expect(text).toMatch(/^Stok Opname Request Resin komposit A2 (menunggu|sudah menunggu)/);
  const { id } = (await inbox(rina)).find(
    (p) => p.kind === "stok_opname" && p.status === "pending",
  )!;

  const nina = await demoLogin("nina");
  await submit(`/persetujuan/${id}`, nina, { decision: "accepted" });
  expect((await inbox(rina)).find((p) => p.id === id)?.status).toBe("pending");

  const tari = await demoLogin("tari");
  const page = await (await get("/persetujuan", tari)).text();
  expect(page).toContain('href="/persetujuan"');
  expect(page).toContain("Hitung fisik Resin komposit A2.");
  const response = await submit(`/persetujuan/${id}`, tari, { decision: "accepted" });
  expect(response.status).toBe(303);
  expect((await inbox(rina)).find((p) => p.id === id)?.status).toBe("accepted");
});
