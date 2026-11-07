import { exports } from "cloudflare:workers";
import { expect, it } from "vitest";

it("serves the Indonesian DentalClinic Brain page from the Worker", async () => {
  const response = await exports.default.fetch("https://dentalclinic.test/");
  const html = await response.text();

  expect(response.status).toBe(200);
  expect(response.headers.get("content-type")).toContain("text/html");
  expect(html).toContain('<html lang="id">');
  expect(html).toContain("<title>DentalClinic Brain</title>");
  expect(html).toMatch(/<h1[^>]*>DentalClinic Brain<\/h1>/);
  expect(html).toContain("/assets/");
});
