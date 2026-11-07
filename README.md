# Dental Clinic Brain

Live: [dentalclinic.ahmadwaliradhi.workers.dev](https://dentalclinic.ahmadwaliradhi.workers.dev)

One TanStack Start application on one Cloudflare Worker, with D1. The site is Indonesian; staff talk to Dental Clinic Brain only through WorkBuddy, over MCP at `/mcp`. Domain vocabulary lives in [GLOSSARY.md](GLOSSARY.md), architecture in [docs/adr](docs/adr/).

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

`npm test` builds the real Worker, migrates and seeds local D1 with the commands above, then runs Vitest **inside workerd**, not Node or jsdom. The database test reads that actual persistent local D1 through a test-only service binding backed by Wrangler's local platform proxy. Every other test runs against an isolated D1 that `test/setup.ts` loads with the same migrations and seed. Engine tests call `ask` in `src/brain/` directly; HTTP and scheduled tests invoke the compiled Worker. Tests never access remote D1.

For a focused test after a source change:

```sh
npm run build
npx vitest run test/page.test.ts
```

`npm run format` formats maintained files. Generated routes and runtime types are excluded. Run `npm run cf:types` after changing Worker bindings; the build regenerates `src/routeTree.gen.ts`. Generated types and route tree are committed so typecheck works immediately after install.

## MCP

`POST /mcp` is a stateless Streamable HTTP MCP server with three tools:

- `who_am_i` returns the staff member and Role behind the bearer token.
- `ask` returns the answer envelope: `text` (final, cited, shown verbatim), `decision` (`answered`, `unknown_routed` or `refusal`), `citations` (URI, date, quoted text), `flags` (instruction-like sentences found in retrieved Sources and not followed) and `auditId`. Every call writes one Jejak Audit row.
- `kpi`, listed for the Pemilik only, returns the same envelope for Keuangan & Aset: Payback per Aset, Margin per Tindakan and overhead % against the 59% international reference, each with its formula and Sources. `ask` routes these questions to it too, so every other Role gets the Refusal either way. Tax grouping of an Aset is always "saya tidak tahu".

`ask` searches only what the caller's Role may see (`src/brain/access.ts`, applied in SQL). Restricted data and data that does not exist get the same Refusal, byte for byte; only the Jejak Audit row records the true reason (`restricted` or `not_found`). NIK and phone numbers keep their last 4 digits and email keeps its domain in everything `ask` returns. A cited Source with an expiry date, such as a SIP, adds a warning from 90 days before it ends. `test/mcp.test.ts` pins every Role's tool list.

The caller comes only from the bearer token, which Identity Pairing binds to one staff member:

1. `POST /pairing` returns `code` (8 characters, valid 10 minutes), `url` (`/perangkat?kode=…`) and `secret`.
2. The staff member opens `url`, signs in and presses **Hubungkan WorkBuddy**.
3. `POST /pairing/token` with `{"secret": "…"}` answers `202` until then, `200` with `token` once, and `401` for an unknown, used or expired pairing.

The token has scope `read propose` and expires after 90 days. Under **Perangkat terhubung** on `/perangkat` the staff member can unpair it. Tokens and secrets are stored as SHA-256 hashes only, and a missing, unknown, expired or unpaired token gets 401.

```sh
npx @modelcontextprotocol/inspector --cli http://localhost:5173/mcp --transport http \
  --header "Authorization: Bearer $TOKEN" \
  --method tools/call --tool-name ask --tool-arg "question=Jam praktik klinik?"
```

## WorkBuddy Expert

Two Experts reach the Dental Clinic Brain only through the `dental-clinic-brain` MCP server declared in their `plugin.json`, and show the engine's `text` unchanged. Neither package holds a token: the first time one is used, it runs Identity Pairing, and WorkBuddy's connect card fills the resulting token into `Bearer ${DENTALCLINIC_TOKEN}`. One token serves both.

- `expert/dira-cepat/` is **Dira Cepat**, a single agent that calls one tool per question. Use it for everyday questions.
- `expert/dentalclinic-team/` is the **DentalClinic Team** for complex requests. Dira leads and pairs but fetches nothing herself. Bima (`keuangan-aset`) answers Keuangan & Aset with `ask`; Sari (`pasien-recall`) answers Pasien & Recall and everything else with the same tools as Dira Cepat. Wulan (`peninjau`) reviews every result for citations, masking and the exact Refusal before Dira shows it. After a third failed review Dira shows nothing and points the staff member to the Pemilik and the Jejak Audit.

`npm run build` zips each package to `/<name>.zip`, except Dira Cepat, which ships as `/dental-clinic-expert.zip`: the landing page links `/dental-clinic-expert.zip` in the hero and `/dentalclinic-team.zip` under Tim. To build only the zips, run `npm run expert:zip`.

To install both into WorkBuddy on this Mac, validated and registered by WorkBuddy's own expert-manager scripts:

```sh
npm run expert:install
```

`npm run expert:install -- dentalclinic-team` installs one. Then open Experts → My Experts → Dira Cepat and ask "Jam praktik klinik?", or the DentalClinic Team and ask "Siapa yang belum selesai PSA bulan lalu? Buatkan pengingat." as drg. Rina. The Expert gives a pairing link: open it, sign in with Demo Login, press Hubungkan WorkBuddy and say it is done. Paste the token it returns when WorkBuddy asks to connect `dental-clinic-brain`. To switch staff member, remove `dental-clinic-brain` under Connectors, pair again and start a New Task.

From a downloaded zip: unzip it into `~/.workbuddy-ai/plugins/marketplaces/my-experts/plugins/` and ask WorkBuddy to "validate and register the expert dentalclinic-team" (or `dira-cepat`), which runs the same expert-manager scripts. To share one, use ⋯ → Share → Copy link on the Expert in WorkBuddy and put the link in `launchUrl` in `src/data/release.json`.

## Database

`db/migrations/` holds the schema: staff, token and pairing hashes, patients, visits, Rencana Perawatan, fee rules, Sources (`emr://`, `doc://`, `chat://`, `task://`) with an FTS5 keyword index kept in sync by triggers, who may see each Restricted Source, and the Jejak Audit. Sources stating the same fact share a `fact` key; the engine resolves them as a Source Conflict. The seed derives one `emr://` Source per visit. `db/seed.sql` loads the fictional Klinik Gigi Senyum Sejahtera without overwriting existing rows. Both commands are safe to repeat.

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

Tailwind v4 uses neutral shadcn/ui tokens, a system font, and `components.json` aliases rooted at `src`. Add shadcn components only when a real screen needs one.

## Landing page

`/` is the Indonesian landing page. Its links and test results are data, not code:

- `src/data/release.json`: WorkBuddy launch link, Expert zips and video embed URL. An empty value shows "Segera tersedia"; an empty `teamZipUrl` hides its button.
- `src/data/test-results.json`: one row per test case. `status` is `lulus`, `gagal` or `belum`; `evidenceUrl` links the status to a screenshot.

Edit the JSON and redeploy.
