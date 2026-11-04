# Project context and handoff

Requested 4 November 2026 by Akash Solanki. Build an operational outreach dashboard for Trayaam using all existing extracted records and their established priority, responsive on every device, in the supplied GitHub repo and Cloudflare Pages account. Include agency industry, channel, stage, progress, performance analytics, current hiring signals aligned to Trayaam skills, Feny's latest portfolio, a geographic globe, and an enterprise-style sales office with specialist agents and four employees per role. Agents will later connect to the user's own AI orchestrator. This initial build provides task assignment, persistence and runtime API boundaries; it does not falsely simulate autonomous work.

## Identity and deployment

- GitHub: https://github.com/akashcsolanki/Sales-Dashboard-Trayaam (public; application source only).
- Local checkout: `X:/Claude Code Projects/Trayaam/sales-dashboard`.
- Cloudflare account: existing selected account; do not modify unrelated projects or ERP.
- Pages: `trayaam-sales-office`, production branch `main`.
- D1: `trayaam-sales-office`, binding `DB`, ID in wrangler.jsonc.
- Expected production host: https://trayaam-sales-office.pages.dev/ (verify before reporting live).
- Authentication: high-entropy workspace password; only its SHA-256 hash in Pages secret WORKSPACE_PASSWORD_HASH. Hashed opaque 12-hour session IDs in D1; HttpOnly/Secure/SameSite Strict cookie. Password is in ignored `.private/access.txt`, never publish it.

## Source hierarchy

Primary business context: parent `TRAYAAM_POSITIONING_SESSION_BRIEF.md` (read the full brief for outreach work), `WHITE_LABEL_OUTSOURCING_STRATEGY.md`, `Agency-Services-and-Outreach-Notes.md`.

1. `outputs/hiring-expansion-2026-10-08/Trayaam-Hiring-Agencies.csv`: 100 immediate campaign companies, all linked to master IDs.
2. `outreach/refined-uk-gmb-2026-10-07/agencies_master.csv`: 1,549 canonical unique companies. Original research priority preserved behind shortlist priority.
3. Locations, published contacts, decision-maker enrichment, role demand/evidence, coverage, review queue, duplicate aliases and application registers are supporting evidence.
4. `outputs/additional-b2b-starters-2026-10-08`: 44 CSV tabs, 18,539 source rows (18,462 nonempty rows imported; includes overlapping/historical/B2C records). Imported separately to `source_rows`, never automatically send-ready. Original README says seven workbooks/44 tabs captured, USA calling workbook's three tabs remain unavailable. Do not claim absent data was imported.
5. Generated proposals/applications are drafts and supporting assets. Campaign README saying no submissions is superseded by APPLICATION_RESULTS.md: two official form acceptances, GLO/Feny and Inspire Digital/Akash. Confirmation email receipts are unverified. Company proposal emails unsent.

Full CSV source register: 137 files with hashes and row counts. `scripts/import-data.py` reproduces ignored snapshot/SQL seeds. Source-listed coordinate records: 1,565 across canonical companies; multiple locations belong to one company. No geocoding is invented. Search-city is not always legal headquarters; coordinates retain source listing basis.

`scripts/import-supporting.py` adds the fuller 1,549-row decision-maker research export, campaign fields and 200 retained drafts to protected storage. Profile Evidence and Drafts tabs expose them. `scripts/recheck-hiring.py` captures bounded live source text privately; `scripts/apply-rechecks.py` applies dated outcomes and preserves the two known form acceptances. Run supporting and hiring updates after the base import. The overview endpoint excludes large research/original fields; selecting a prospect loads its full protected profile on demand.

## Positioning

UK first; Ireland second; continental Europe third. Agency employers, not technical recruiters, are the active target. Vacancy evidence does not establish outsourcing demand. Two offers: real personal resource applications, and fixed-price white-label delivery. No revenue share. Your brand, your client relationship, our engineering delivery. Verify scope, available capacity and inputs before delivery promises.

## Feny

Latest reviewed résumé: `X:/Claude Code Projects/Resume/feny/variants/Feny-Solanki-Resume-Portfolio-2026-11-03.md`. Current portfolio https://feny.trayaam.com/. Local portfolio `X:/Claude Code Projects/Resume/feny/Portfolio Learning/performance-marketing-portfolio`. Paid Meta/LinkedIn, organic social, content and reporting are evidenced. Portfolio results are platform-attributed leads/conversations, not verified qualified leads or revenue. Do not infer Google/Microsoft Ads proficiency merely from Meta results. Last working day 27 November 2026 supersedes old October availability.

## Interface

React/Vite, GSAP scoped animation, custom WebGL shader gradient, COBE globe, Lucide icons. Restrained forest/ivory/lime design. Tabs: Overview, Prospects, Pipeline, Hiring signals, Sales Office, World view, Analytics, Asset library, Data & settings. Four dedicated seats for each of 19 specialties (76 seats); channel-specific outbound employees. Office floor and roster views. Tasks are queued until an actual AI runtime connects. No fictional sent emails, deals or conversion results.

## Acceptance and limitations

Confirm actual final checks in OPERATIONS.md. Local checks do not establish live production verification. Real multi-user identity/RBAC and SSO are not implemented; the initial workspace uses one owner password. Offline edits are not supported. Snapshot refresh every 30 seconds when no dialog is open. Concurrent edit versions prevent silent overwrites. The globe requires WebGL and has a text location fallback. External portfolio links remain external references; only Feny was fetched in this build. The Sales Office is a CSS-rendered overhead room rather than a 3D game engine.
