import { exports } from "cloudflare:workers";
import { expect } from "vitest";

// HTTP helpers that drive the compiled Worker the way a browser and WorkBuddy do.

export const SITE = "https://dentalclinic.test";

/** Signs in through Demo Login and returns the session cookie. */
export async function demoLogin(id: string): Promise<string> {
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

export function get(path: string, cookie?: string) {
  return exports.default.fetch(`${SITE}${path}`, {
    headers: cookie ? { cookie } : {},
    redirect: "manual",
  });
}

/** Submits a form on the site as the signed-in staff member. */
export function submit(path: string, cookie: string, fields: Record<string, string>) {
  return exports.default.fetch(`${SITE}${path}`, {
    method: "POST",
    headers: { cookie },
    body: new URLSearchParams(fields),
    redirect: "manual",
  });
}

export interface Pairing {
  code: string;
  secret: string;
  url: string;
}

/** What WorkBuddy does first: asks for a pairing code. */
export async function requestPairing(): Promise<Pairing> {
  const response = await exports.default.fetch(`${SITE}/pairing`, { method: "POST" });
  expect(response.status).toBe(201);
  return response.json<Pairing>();
}

/** What WorkBuddy polls with until the code is confirmed. */
export function pollPairing(secret: string) {
  return exports.default.fetch(`${SITE}/pairing/token`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ secret }),
  });
}

/** Confirms a pairing code on the site as the signed-in staff member. */
export function confirmCode(cookie: string, code: string) {
  return submit("/perangkat", cookie, { kode: code });
}

/** Identity Pairing end to end: returns a token bound to the staff member. */
export async function pair(staffId: string): Promise<string> {
  const { code, secret } = await requestPairing();
  const confirmed = await confirmCode(await demoLogin(staffId), code);
  expect(confirmed.status).toBe(303);
  expect(confirmed.headers.get("location")).toBe("/perangkat?terhubung=1");
  const response = await pollPairing(secret);
  expect(response.status).toBe(200);
  return (await response.json<{ token: string }>()).token;
}

/** One JSON-RPC call to the MCP endpoint. */
export function mcp(token: string | null, method: string, params?: object) {
  return exports.default.fetch(`${SITE}/mcp`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json, text/event-stream",
      ...(token && { Authorization: `Bearer ${token}` }),
    },
    body: JSON.stringify({ jsonrpc: "2.0", id: 1, method, params }),
  });
}

export async function callTool(token: string, name: string, args: object) {
  const response = await mcp(token, "tools/call", { name, arguments: args });
  expect(response.status).toBe(200);
  const { result } = await response.json<{ result: { content: { text: string }[] } }>();
  return JSON.parse(result.content[0].text);
}
