import { env } from "cloudflare:workers";
import { expect, it } from "vitest";

it("reads the scaffold seed from the migrated local D1", async () => {
  const response = await env.LOCAL_D1.fetch("https://local-d1.test");
  expect(response.status, await response.clone().text()).toBe(200);
  const row = await response.json();

  expect(row).toEqual({ value: "DentalClinic Brain" });
});
