# DentalClinic Brain

Live: [dentalclinic.ahmadwaliradhi.workers.dev](https://dentalclinic.ahmadwaliradhi.workers.dev)

One TanStack Start application on one Cloudflare Worker, with D1. The placeholder is Indonesian; clinic features land in later tickets. Domain vocabulary lives in [GLOSSARY.md](GLOSSARY.md), architecture in [docs/adr](docs/adr/).

## Run

Node 22.12+ and npm:

```sh
npm ci
npm run db:migrate -- --local
npm run db:seed -- --local
npm run dev
```

Open the localhost URL printed by Vite. Local data stays in `.wrangler/state`; no Cloudflare login is required for local development or tests. `npm run preview` serves the production build locally after `npm run build`.

## Check

```sh
npm run lint
npm run format:check
npm run typecheck
npm test
```

`npm run check` runs those four in order, which is what CI runs.

`npm test` builds the real Worker, migrates and seeds local D1 with the commands above, then runs Vitest **inside workerd**, not Node or jsdom. The database test reads that actual persistent local D1 through a test-only service binding backed by Wrangler's local platform proxy. HTTP and scheduled tests invoke the compiled Worker; scheduled tests use an isolated D1 binding. Tests never access remote D1.

For a focused test after a source change:

```sh
npm run build
npx vitest run test/page.test.ts
```

`npm run format` formats maintained files. Generated routes and runtime types are excluded. Run `npm run cf:types` after changing Worker bindings; the build regenerates `src/routeTree.gen.ts`. Generated types and route tree are committed so typecheck works immediately after install.

## Database

`db/migrations/0001_scaffold.sql` creates only an infrastructure marker table. `db/seed.sql` inserts one marker without overwriting existing data. Both commands are safe to repeat; clinic schema and fictional records belong to later tickets.

```sh
npm run db:migrate -- --local
npm run db:seed -- --local
npm run db:migrate -- --remote
npm run db:seed -- --remote
```

Remote commands use the `dentalclinic` D1 binding in `wrangler.jsonc` and may briefly make the database unavailable. They require an authorized Cloudflare account. Keep future schema changes in new migration files; do not edit applied migrations.

## Cron

`0 17 * * *` is midnight WIB (UTC+7). The handler deliberately does nothing; it does not reset data yet. With `npm run dev` running:

```sh
curl --fail "http://localhost:5173/cdn-cgi/local/scheduled?cron=0+17+*+*+*"
```

Use the port printed by Vite if 5173 is occupied. `test/scheduled.test.ts` also verifies completion and unchanged database contents.

## CI/CD

`.github/workflows/ci.yml` is the only path to production, and `docs/adr/0003-deploy-on-merge-with-github-actions.md` records why it is shaped this way.

Every pull request runs two jobs:

- **Lint, format and types** — `npm run lint`, `format:check`, `typecheck`.
- **Worker build, tests and package** — `npm test`, then `wrangler deploy --dry-run` to prove the Worker still packages and resolves its bindings without publishing.

A push to `main` runs both jobs and then **Deploy to Cloudflare Workers**, which is skipped on pull requests and on any other branch. It builds, applies pending D1 migrations to the remote database, uploads the Worker, then smoke-tests the `workers.dev` URL and fails the run if the page is not served. It never seeds: run `npm run db:seed -- --remote` yourself when seed data changes.

To redeploy `main` without a new commit, run the workflow from the Actions tab or `gh workflow run ci.yml --ref main`.

Two repository secrets are required; the deploy job stops with an explicit error if either is missing. Secrets reach only the steps that call Wrangler, never `npm ci`.

| Secret                  | Value                                                                                                                                                     |
| ----------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `CLOUDFLARE_API_TOKEN`  | API token from <https://dash.cloudflare.com/profile/api-tokens>; start from the **Edit Cloudflare Workers** template and add **D1 → Edit** for migrations |
| `CLOUDFLARE_ACCOUNT_ID` | Account ID from the dashboard, or `id` in `npx wrangler whoami`                                                                                           |

```sh
gh secret set CLOUDFLARE_API_TOKEN
gh secret set CLOUDFLARE_ACCOUNT_ID
```

The deploy job runs in the `production` GitHub environment, so a required reviewer or a deployment branch rule can be added there without editing the workflow. Enable branch protection on `main` and require both check jobs before merging; without it, a direct push to `main` still deploys, just after the checks pass.

`.github/dependabot.yml` opens weekly grouped pull requests for npm and Actions updates, which then go through the same checks.

## Deploy

The repository is bound to the existing `dentalclinic` D1 database. For the authorized project account:

```sh
npx wrangler whoami
npm run db:migrate -- --remote
npm run db:seed -- --remote
npm run deploy
```

If no login exists, run `npx wrangler login` from your terminal first. Deployment prints the `workers.dev` URL. No custom domain or other project is changed.

`npm run deploy` builds before uploading. Let Wrangler use `.wrangler/deploy/config.json`, generated by the Cloudflare Vite plugin; **do not** force the source configuration with `--config wrangler.jsonc` when deploying. For packaging verification without publishing:

```sh
npm run build
npx wrangler deploy --dry-run
```

For a separate Cloudflare account, create its D1 database and replace only `database_id` in `wrangler.jsonc` before migrating and deploying. Database identifiers are public configuration, not credentials. Never commit `.dev.vars`, `.env` or tokens.

## UI

Tailwind v4 uses neutral shadcn/ui tokens, a system font, and `components.json` aliases rooted at `src`. Add shadcn components only when a real screen needs one; this placeholder needs no buttons, labels or component library examples.
