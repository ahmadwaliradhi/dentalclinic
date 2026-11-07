import { exports } from "cloudflare:workers";
import { expect, it } from "vitest";
import { ask } from "../src/brain/ask";
import type { Staff } from "../src/brain/staff";
import { demoLogin, get, SITE } from "./site";

const andi: Staff = { id: "andi", name: "drg. Andi", role: "Dokter Gigi Mitra" };
const nina: Staff = { id: "nina", name: "Nina", role: "Front Office" };

it.each([
  ["rina", "drg. Rina", "Pemilik"],
  ["andi", "drg. Andi", "Dokter Gigi Mitra"],
  ["tari", "Tari", "Perawat Gigi"],
  ["nina", "Nina", "Front Office"],
])("signs in as %s through Demo Login and shows their name and Role", async (id, name, role) => {
  const response = await get("/pasien", await demoLogin(id));
  const html = await response.text();

  expect(response.status).toBe(200);
  expect(html).toContain(name);
  expect(html).toContain(role);
});

it("offers Demo Login only for the four seeded staff members", async () => {
  const response = await exports.default.fetch(`${SITE}/demo/maya`, { method: "POST" });

  expect(response.status).toBe(404);
  expect(response.headers.get("set-cookie")).toBeNull();
});

it.each(["/pasien", "/jadwal", "/stok", "/aset", "/jejak-audit", "/perangkat"])(
  "sends a logged-out visitor of %s to the Demo Login",
  async (path) => {
    const response = await get(path);

    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toBe("/#demo-login");
  },
);

it("sends a visitor whose session was closed by Keluar to the Demo Login", async () => {
  const cookie = await demoLogin("nina");
  await exports.default.fetch(`${SITE}/keluar`, {
    method: "POST",
    headers: { cookie },
    redirect: "manual",
  });

  expect((await get("/pasien", cookie)).headers.get("location")).toBe("/#demo-login");
});

it("shows Nina masked patients and no clinical notes on the patient page", async () => {
  const html = await (await get("/pasien", await demoLogin("nina"))).text();

  expect(html).toContain("************0007");
  expect(html).toContain("****-****-2371");
  expect(html).not.toContain("Diagnosis");
  expect(html).not.toMatch(/\d{16}|08\d\d-\d{4}-\d{4}/);
});

/** Calls the `aset` server function directly, as a script would, bypassing the page. */
function asetServerFn(cookie?: string) {
  return exports.default.fetch(`${SITE}/_serverFn/aset`, {
    headers: {
      "sec-fetch-site": "same-origin",
      "x-tsr-serverfn": "true",
      ...(cookie && { cookie }),
    },
  });
}

it.each(["tari", "nina"])(
  "never gives %s Aset finance figures, even called directly",
  async (id) => {
    const response = await asetServerFn(await demoLogin(id));
    const body = await response.text();

    expect(response.status).toBe(200);
    expect(body).toContain("Dental unit");
    expect(body).not.toMatch(/45000000|45_000_000|4\.5e7/);
  },
);

it("gives drg. Rina Aset finance figures through the same server function", async () => {
  expect(await (await asetServerFn(await demoLogin("rina"))).text()).toContain("45000000");
});

it("refuses the server function without a session", async () => {
  expect((await asetServerFn()).status).toBe(401);
});

it("shows Nina her own Jejak Audit rows, a Refusal without its reason, and a verified chain", async () => {
  await ask(nina, "Apa diagnosis pasien P-0007?");
  await ask(andi, "Tarif scaling?");

  const html = await (await get("/jejak-audit", await demoLogin("nina"))).text();

  expect(html).toContain("Rantai terverifikasi");
  expect(html).toContain("Apa diagnosis pasien P-0007?");
  expect(html).toContain("Refusal");
  expect(html).not.toContain("Tarif scaling?");
  expect(html).not.toMatch(/restricted|not_found/);
});

it("shows drg. Rina every Jejak Audit row with its Refusal reason", async () => {
  await ask(nina, "Apa diagnosis pasien P-0007?");

  const html = await (await get("/jejak-audit", await demoLogin("rina"))).text();

  expect(html).toContain("Rantai terverifikasi");
  expect(html).toContain("Apa diagnosis pasien P-0007?");
  expect(html).toContain("restricted");
});
