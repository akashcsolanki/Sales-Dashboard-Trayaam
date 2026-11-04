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
- 4 November 2026: all 12 model/backend checks passed (role seats, reply denominators, cohort deduplication, filtering, CSV protection, safe URLs, authentication, CSRF rejection, throttling, session revocation, persisted edits, concurrency conflicts, opt-out suppression and runtime update boundaries).
- 4 November 2026: Pages Functions bundle compiled successfully.
- 4 November 2026: local authenticated Overview and Sales Office inspected in internal browser.
- 4 November 2026: production deployed at https://trayaam-sales-office.pages.dev/. Live API verification passed: unauthenticated snapshot 401/no-store; authenticated 1,549 companies/100 shortlist; starter records readable; two retained drafts for the first priority account; two manually verified open and two confirmed closed hiring pages; four useful queued preparation assignments persisted across refetch. Evidence is in ignored `.private/live-verification.json`.
- GitHub source pushed to main. Initial commit `1065e1e`. Subsequent handoff/performance changes are recorded in Git history.
- Browser QA: local authenticated desktop/mobile Overview, Sales Office and task creation checked; production sign-in and real directory rendering observed. Later browser reconnection attempts timed out in the automation runtime; do not claim an additional full final browser regression pass.

## Current queue and hiring freshness

Four preparation tasks are queued for hiring review, first-ten qualification, Feny asset refresh and channel-readiness review. None is executing until a real runtime connects. All 100 official vacancy URLs were fetched in a bounded six-worker review: 73 pages mentioned title tokens, 10 left the role unconfirmed and 17 failed retrieval. These automatic outcomes are not verified openings. Manual official-page review additionally confirmed Fifteen/PPC Manager and Beyond Co./Senior Web Developer currently advertised with application routes, with explicit fit gaps; Rak Design and The Digital Maze currently show no openings. Their historical priority records remain preserved.

## Access and retention

One shared owner password, no user-level permissions. Use a long random value. Failed login throttled per hashed IP in D1 (10 attempts per 15 minutes). Sessions last 12 hours and are stored hashed. Mutation requests require same Origin; runtime bearer endpoints are separate. Cache-Control no-store on every API response. All app data is server-side; no localStorage fallback. Future account-based SSO is recommended before expanding beyond the trusted sales team.

Preserve opt-outs and historical evidence. Data deletion/retention requires a deliberate policy; source records are not automatically fresh. Marking Eligible is an internal assessment field, not permission to send. No send endpoints exist.

## Local security and office persistence update — 4 November 2026

The local source review added bounded streaming JSON parsing: normal request bodies are limited to 32 KiB and authenticated office saves to 128 KiB. Limits count actual bytes even without a trustworthy Content-Length. Oversized input returns 413; malformed UTF-8/JSON and non-object roots return 400. The QA adapter also caps its earlier Node request buffering and now preserves the actual Origin header, matching the production handler's rejection of missing-origin mutations.

`GET /api/office` requires an owner session and returns `{config,version}`; before the first save this is `{config:null,version:0}`. `PATCH /api/office` replaces the full config using the expected version and returns the new version. A single D1 statement enforces first-save and subsequent compare-and-swap conflicts (409). Metadata key `office-v2` is separate from imported data. Runtime bearer credentials grant no office access.

The office schema permits only the documented theme, lighting, floor and wall choices; at most 300 uniquely identified furniture objects; known employee IDs; bounded coordinates (±40), radians (±6.3), hex colors and employee customization fields. No arbitrary URLs or executable fields are stored. A first save creates version 1. Refresh before retrying a stale save.

Backend regression coverage verifies authentication, CSRF, runtime separation, schema rejection, full-roster/furniture persistence, concurrent creation and stale update conflicts, streamed cancellation and byte/UTF-8 boundaries. These local Node/SQLite checks do not establish effective production Cloudflare limits, secret configuration or deployed headers. No production network security tests were performed in this update. Source changes require a separate deployment before they protect the live site.

Static and API responses add transport/referrer controls; static CSP allows self-hosted fonts and disallows embedded objects. The identity model remains one shared trusted owner password. Private import files, local QA SQLite and explicit CSV downloads still exist; “server-side data” refers to the absence of a browser persistence fallback, not a lack of local business-data copies.

## Redesign verification — 5 November 2026

All 20 model/backend/navigation tests pass and the production build passes. The lazily loaded 3D office chunk is 552 kB minified (144 kB gzip); Vite reports its advisory size warning. Desktop and narrow-screen browser QA checked official branding, character customization, keyboard and floor-click movement, saved name/load, furniture placement/rotation/removal, roster search and both Pipeline wings. The checked narrow viewport had no document-width overflow. No browser console errors were recorded in the checked office session.

The security scan completed with one low-severity streamed-body finding fixed; see SECURITY-REVIEW.md. This supersedes the earlier pending-review state. Deployment and live verification for this revision are recorded below when completed.

Production redesign deployed 5 November 2026 (IST), source commit a82899e, Pages deployment 1dc3c0cc. Normal live API verification passed on the production alias: anonymous snapshot 401/no-store, 1,549 companies/100 priority records, retained draft/source access, two verified-open/two closed hiring records and four persisted queued tasks. Static security headers and owner-only office access were observed. A legitimate character-name save created office version 1 and survived a browser reload. Every dashboard tab rendered in the live browser; no console errors were recorded during this check. Private evidence: .private/live-verification.json, .private/redesign-live-verification.json and .private/redesign-office.png. Public GitHub main contains the source; deployment remains direct Wrangler upload rather than an automatic GitHub build.


## Individual cast and workspace sections — 5 November 2026

The current iteration adds 128 unique fictional names/reference cells (96 women, 32 men; three/one per specialty), eight department rooms and eight platform studios. Default platform mapping is editable per employee without changing their specialist role or granting a real integration. Workspace membership, free capacity and task counts derive from the configured roster and real tasks. Independent furniture/positions are saved in optional `rooms` under office-v2. Old root-level furniture/positions remain retained for backward compatibility. Up to 80 objects per room, 600 aggregate, 16 known room keys; the existing 128 KiB authenticated save limit still applies.

GPT built-in image generation produced eight casting atlases and an architectural reference, optimized as WebP in public/office. Raw PNGs and QA contact sheets are ignored/private. See IMAGE-PROMPTS.md for prompts/provenance. Portraits are static art references; live customization changes the original procedural 3D figures. No real prospect data was sent to generation.

Local verification: all 24 tests pass, including roster uniqueness/composition, department/platform partitioning, platform reassignment, room isolation, strict schema rejection and API save/refetch. Production build passes with the existing lazy-office chunk size advisory. Browser QA checked desktop department cards, platform studios, real staffing count changes on reassignment, new hair/wardrobe saves, and phone navigation. At the checked 390px viewport the document width was 384px, with no horizontal page overflow. Deployment verification is recorded below after publishing.

The QA server now reads response bodies before writing headers, avoiding a double-header crash when a build replaces dist during a request, and returns 404 for missing asset paths rather than serving HTML as an image. Stop the local server after verification.

Production published from commit 14ea9f2 as Pages deployment 6be7618a on 5 November 2026 (IST). Live checks confirmed all eight WebP atlases and the architectural reference serve successfully as images, and the original protected dataset/priority queue remain intact. A legitimate production save updated the first colleague to Ananya Shah and created the Data lab room at office version 2; a fresh browser tab read the saved name successfully. Switching into Creative left Save office disabled (no spurious dirty state). The new creative room, unique roster portraits and assigned platform were inspected live with no recorded console errors. Private evidence: cast-live-verification.json, cast-directory-live.png and cast-studio-live.png under .private/. Source is pushed to the existing public GitHub main branch.
