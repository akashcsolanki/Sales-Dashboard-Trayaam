# Operations

## Rebuild and import

`npm ci`, `python scripts/import-data.py`, `npm test`, `npm run build`.

Import writes `.private/snapshot.json`, `seed.sql` and `starter-sources.sql`. They are ignored and must never enter the public repo. Original company records are insert-if-missing; rerunning seed does not overwrite stage edits. Supporting metadata updates. Starter row identity is source path + row number.

For local QA, `node scripts/local-server.mjs` serves production assets at http://127.0.0.1:4173 using the SAME Pages function and a local SQLite D1 adapter. Credential in `.private/access.txt`. Never expose this local QA server to public networks. Stop the process after testing. It is a development adapter, not the production server.

## Cloudflare

Pages project `trayaam-sales-office`; D1 binding DB in wrangler.jsonc. Use Wrangler authenticated to the intended existing account. Set WRANGLER_LOG_PATH into ignored `.private/` if host logging permissions require it. Import sequentially:

`npx wrangler d1 execute trayaam-sales-office --remote --file .private/seed.sql --yes`

`npx wrangler d1 execute trayaam-sales-office --remote --file .private/starter-sources.sql --yes`

Set server password hash with `node scripts/configure-secret.mjs`. This pipes only a hash to the Pages secret; it does not print the password. Deploy `npx wrangler pages deploy dist --project-name trayaam-sales-office --branch main` after checks. Cloudflare Pages Functions compile from functions/. D1 and secrets remain outside public assets.

Direct upload was selected for initial deployment. Source is in the requested GitHub repo; this is not automatically a GitHub-integrated Pages build. Configure GitHub Actions secrets and a least-privilege token before enabling automated deployments. Do not claim automatic Git-to-Pages synchronization without setting it up and verifying it.

## Verification record

- 4 November 2026: React production build passed.
- 4 November 2026: six model checks passed (role seats, reply denominator, dedup cohort, filters, CSV formula protection, URL scheme protection).
- 4 November 2026: Pages Functions bundle compiled successfully.
- 4 November 2026: local authenticated Overview and Sales Office inspected in internal browser.
- Cloud deployment and final verification: in progress; update this section before handoff.

## Access and retention

One shared owner password, no user-level permissions. Use a long random value. Failed login throttled per hashed IP in D1 (10 attempts per 15 minutes). Sessions last 12 hours and are stored hashed. Mutation requests require same Origin; runtime bearer endpoints are separate. Cache-Control no-store on every API response. All app data is server-side; no localStorage fallback. Future account-based SSO is recommended before expanding beyond the trusted sales team.

Preserve opt-outs and historical evidence. Data deletion/retention requires a deliberate policy; source records are not automatically fresh. Marking Eligible is an internal assessment field, not permission to send. No send endpoints exist.
