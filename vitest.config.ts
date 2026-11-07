import { cloudflareTest, readD1Migrations } from "@cloudflare/vitest-plugin";
import { defineConfig } from "vitest/config";
import { getPlatformProxy } from "wrangler";

export default defineConfig(async () => {
  // Read the actual local D1 prepared by db:migrate / db:seed, not a test copy.
  const local = await getPlatformProxy<Env>({
    configPath: "wrangler.jsonc",
    remoteBindings: false,
  });

  // The test D1 gets the same migrations and seed as production, applied in test/setup.ts.
  const migrations = [
    ...(await readD1Migrations("db/migrations")),
    ...(await readD1Migrations({ migrationsDir: "db", migrationsPattern: "db/seed.sql" })),
  ];

  return {
    plugins: [
      cloudflareTest({
        main: "./dist/server/index.js",
        wrangler: { configPath: "./wrangler.jsonc" },
        remoteBindings: false,
        miniflare: {
          bindings: { TEST_MIGRATIONS: migrations },
          serviceBindings: {
            async LOCAL_D1() {
              const row = await local.env.DB.prepare("SELECT name, role FROM staff WHERE id = ?")
                .bind("nina")
                .first();
              return Response.json(row);
            },
          },
        },
      }),
      { name: "dispose-local-d1", closeBundle: () => local.dispose() },
    ],
    test: { include: ["test/**/*.test.ts"], setupFiles: ["test/setup.ts"] },
  };
});
