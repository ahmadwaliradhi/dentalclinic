import { exports } from "cloudflare:workers";
import { expect, it } from "vitest";

const SITE = "https://dentalclinic.test";

/** Signs in through Demo Login and returns the session cookie. */
async function demoLogin(id: string): Promise<string> {
  const response = await exports.default.fetch(`${SITE}/demo/${id}`, {
    method: "POST",
    redirect: "manual",
  });
  expect(response.status).toBe(303);
  expect(response.headers.get("location")).toBe("/pasien");
  const cookie = response.headers.get("set-cookie") ?? "";
  expect(cookie).toMatch(/HttpOnly/);
  return cookie.split(";")[0];
}

function get(path: string, cookie?: string) {
  return exports.default.fetch(`${SITE}${path}`, {
    headers: cookie ? { cookie } : {},
    redirect: "manual",
  });
}

it.each([
  ["rina", "drg. Rina", "Pemilik"],
  ["andi", "drg. Andi", "Dokter Gigi Mitra"],
  ["tari", "Tari", "TGM"],
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

it.each(["/pasien", "/jadwal", "/stok", "/aset"])(
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
