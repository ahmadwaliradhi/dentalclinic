import { cloudflareTest } from "@cloudflare/vitest-plugin";
import { defineConfig } from "vitest/config";
import { getPlatformProxy } from "wrangler";

export default defineConfig(async () => {
  // Read the actual local D1 prepared by db:migrate / db:seed, not a test copy.
  const local = await getPlatformProxy<Env>({
    configPath: "wrangler.jsonc",
    remoteBindings: false,
  });

  return {
    plugins: [
      cloudflareTest({
        main: "./dist/server/index.js",
        wrangler: { configPath: "./wrangler.jsonc" },
        remoteBindings: false,
        miniflare: {
          serviceBindings: {
            async LOCAL_D1() {
              const row = await local.env.DB.prepare("SELECT value FROM scaffold WHERE key = ?")
                .bind("product")
                .first();
              return Response.json(row);
            },
          },
        },
      }),
      { name: "dispose-local-d1", closeBundle: () => local.dispose() },
    ],
    test: { include: ["test/**/*.test.ts"] },
  };
});
