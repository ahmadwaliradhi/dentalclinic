import { env, exports } from "cloudflare:workers";
import { expect, it } from "vitest";

// Vitest exposes scheduled events on its loopback stub; generated Fetcher types do not.
const worker = exports.default as typeof exports.default & {
  scheduled(options: { cron: string }): Promise<void>;
};

it("completes the nightly scheduled event", async () => {
  await env.DB.prepare("CREATE TABLE cron_probe (value TEXT)").run();
  await env.DB.prepare("INSERT INTO cron_probe VALUES (?)").bind("unchanged").run();

  await expect(worker.scheduled({ cron: "0 17 * * *" })).resolves.toBeUndefined();
  expect(await env.DB.prepare("SELECT value FROM cron_probe").all()).toMatchObject({
    results: [{ value: "unchanged" }],
  });
});
