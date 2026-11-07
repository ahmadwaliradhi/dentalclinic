import { env, exports } from "cloudflare:workers";
import { expect, it, vi } from "vitest";
import {
  callTool,
  confirmCode,
  demoLogin,
  get,
  mcp,
  pair,
  pollPairing,
  requestPairing,
  SITE,
  submit,
} from "./site";

it("pairs WorkBuddy with the staff member who confirms the code", async () => {
  const { code, url } = await requestPairing();

  expect(code).toMatch(/^[A-Z2-9]{8}$/);
  expect(url).toBe(`${SITE}/perangkat?kode=${code}`);
  expect(await callTool(await pair("andi"), "who_am_i", {})).toEqual({
    name: "drg. Andi",
    role: "Dokter Gigi Mitra",
  });
});

it("keeps polling pending until the code is confirmed, then hands the token out once", async () => {
  const { code, secret } = await requestPairing();

  expect((await pollPairing(secret)).status).toBe(202);
  await confirmCode(await demoLogin("tari"), code);
  expect((await pollPairing(secret)).status).toBe(200);
  expect((await pollPairing(secret)).status).toBe(401);
});

it("refuses an expired code on the site and 401s WorkBuddy's poll", async () => {
  const { code, secret } = await requestPairing();
  await env.DB.prepare("UPDATE pairings SET expires_at = ? WHERE code = ?")
    .bind(new Date(Date.now() - 1000).toISOString(), code)
    .run();

  const response = await confirmCode(await demoLogin("nina"), code);
  expect(response.headers.get("location")).toBe(`/perangkat?kode=${code}&galat=1`);
  expect((await pollPairing(secret)).status).toBe(401);
});

it("401s an unknown code and a missing secret", async () => {
  const response = await confirmCode(await demoLogin("nina"), "ZZZZZZZZ");

  expect(response.headers.get("location")).toBe("/perangkat?kode=ZZZZZZZZ&galat=1");
  expect((await pollPairing("not-a-secret")).status).toBe(401);
  expect((await exports.default.fetch(`${SITE}/pairing/token`, { method: "POST" })).status).toBe(
    401,
  );
});

it("401s a token its staff member unpaired under Perangkat terhubung", async () => {
  const token = await pair("nina");
  const cookie = await demoLogin("nina");
  const html = await (await get("/perangkat", cookie)).text();
  const device = html
    .match(/name="putuskan" value="(\d+)"/g)
    ?.at(-1)
    ?.match(/\d+/)?.[0];

  expect(device).toBeDefined();
  expect((await submit("/perangkat", cookie, { putuskan: device! })).status).toBe(303);
  expect((await mcp(token, "tools/list")).status).toBe(401);
});

it("lets no one unpair another staff member's device", async () => {
  const token = await pair("andi");
  const { id } = (await env.DB.prepare(
    "SELECT id FROM tokens WHERE staff_id = 'andi' ORDER BY id DESC",
  ).first<{ id: number }>())!;

  await submit("/perangkat", await demoLogin("nina"), { putuskan: String(id) });
  expect((await mcp(token, "tools/list")).status).toBe(200);
});

it("401s a token 90 days after pairing", async () => {
  const token = await pair("tari");
  await env.DB.prepare("UPDATE tokens SET expires_at = ? WHERE staff_id = 'tari'")
    .bind(new Date(Date.now() - 1000).toISOString())
    .run();

  expect((await mcp(token, "tools/list")).status).toBe(401);
});

it("expires codes after 10 minutes and tokens after 90 days", async () => {
  const before = Date.now();
  const { code } = await requestPairing();
  const pairing = await env.DB.prepare("SELECT expires_at FROM pairings WHERE code = ?")
    .bind(code)
    .first<string>("expires_at");
  const token = await pair("rina");
  const paired = await env.DB.prepare(
    "SELECT paired_at, expires_at, scope FROM tokens ORDER BY id DESC",
  ).first<{ paired_at: string; expires_at: string; scope: string }>();

  expect(Date.parse(pairing!) - before).toBeGreaterThanOrEqual(600_000);
  expect(Date.parse(pairing!) - before).toBeLessThan(605_000);
  expect(Date.parse(paired!.expires_at) - Date.parse(paired!.paired_at)).toBe(90 * 86_400_000);
  expect(paired!.scope).toBe("read propose");
  expect(token).toBeTruthy();
});

it("answers with the access of whoever paired last (T20)", async () => {
  const question = { question: "Apa diagnosis pasien P-0007?" };

  expect((await callTool(await pair("nina"), "ask", question)).decision).toBe("refusal");
  expect((await callTool(await pair("andi"), "ask", question)).decision).toBe("answered");
});

it("never stores or logs a token or pairing secret in plain text", async () => {
  const logged: unknown[] = [];
  for (const level of ["log", "info", "warn", "error", "debug"] as const) {
    vi.spyOn(console, level).mockImplementation((...args) => logged.push(...args));
  }
  const { code, secret } = await requestPairing();
  const stored = async () =>
    JSON.stringify([
      (await env.DB.prepare("SELECT * FROM pairings").all()).results,
      (await env.DB.prepare("SELECT * FROM tokens").all()).results,
    ]);
  const whilePending = await stored();
  await confirmCode(await demoLogin("nina"), code);
  const token = (await (await pollPairing(secret)).json<{ token: string }>()).token;
  await callTool(token, "who_am_i", {});
  const afterPairing = await stored();
  vi.restoreAllMocks();

  for (const plain of [secret, token]) {
    expect(whilePending + afterPairing + JSON.stringify(logged)).not.toContain(plain);
  }
});

it("gives WorkBuddy 10 more minutes to collect the token once the code is confirmed", async () => {
  const { code } = await requestPairing();
  await env.DB.prepare("UPDATE pairings SET expires_at = ? WHERE code = ?")
    .bind(new Date(Date.now() + 1000).toISOString(), code)
    .run();
  await confirmCode(await demoLogin("nina"), code);
  const expiresAt = await env.DB.prepare("SELECT expires_at FROM pairings WHERE code = ?")
    .bind(code)
    .first<string>("expires_at");

  expect(Date.parse(expiresAt!) - Date.now()).toBeGreaterThan(599_000);
});
