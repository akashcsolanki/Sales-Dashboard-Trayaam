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

React/Vite, GSAP scoped animation, custom WebGL shader gradient, COBE globe, Lucide icons. Official charcoal, champagne gold and warm ivory brand; original emblem and Cormorant Garamond wordmark from the Trayaam portfolio source. Tabs: Overview, Prospects, Pipeline, Hiring signals, Sales Office, World view, Analytics, Asset library, Data & settings. Four dedicated seats for each of 32 specialties (128 seats), including data research, extraction, quality, intent, territory, channel-specific outbound, sales engineering, enablement, partnerships, deliverability, automation and deal desk. Eight department sections and eight platform studios, each with its own furniture and character positions. Larger workspaces use numbered wings of up to 16 visible colleagues. Every specialty has three women and one man: 128 unique fictional full names and reference portraits, 96 women/32 men. Stable employee IDs keep existing assignments intact. Tasks are queued until an actual AI runtime connects. No fictional sent emails, deals or conversion results.

## Acceptance and limitations

Confirm actual final checks in OPERATIONS.md. Local checks do not establish live production verification. Real multi-user identity/RBAC and SSO are not implemented; the initial workspace uses one owner password. Offline edits are not supported. Snapshot refresh every 30 seconds when no dialog is open. Concurrent edit versions prevent silent overwrites. The globe requires WebGL and has a text location fallback. External portfolio links remain external references; only Feny was fetched in this build. The Sales Office is an original Three.js cutaway studio with playable characters, pathfinding, camera controls, editable furniture, appearance customization and shared versioned saves. Use Live mode to select and walk (floor click or WASD), Build mode for furnishing/environment, and People to find every seat. Save office commits layout and characters across devices; save before leaving the tab. Visual movement is independent of actual AI work. This is a sales workspace with simulation controls, not a complete commercial life-simulation game. See DESIGN.md for provenance and SECURITY-REVIEW.md for the bounded security assessment.


## Department and character update — 5 November 2026

The Office directory has Departments and Platforms sections. Department rooms differ in purpose and furnishing (discovery lab, research library, conversation floor, client studio, operations suite, strategy/creative ateliers and partnership lounge). Platform studios cover research, email, LinkedIn, calls, WhatsApp, official forms, CRM/operations and creative tools. Each colleague has a default platform by role; Work profile can override it, and shared saves retain the assignment. Department membership remains their specialist role. Counts and available capacity use actual task records, not simulated activity.

GPT's built-in image generation produced eight 16-person casting atlases and one architectural reference. Optimized project assets: public/office/. Full prompts and provenance: IMAGE-PROMPTS.md. Generated portraits are reference artwork, not live rendered previews of subsequent appearance edits. The playable characters remain procedural Three.js models; name, colors, hair, accessories and wardrobe are customizable. This does not convert a portrait into a production-quality rigged mesh.

Office config now accepts optional rooms keyed by the 16 known workspace IDs, each containing at most 80 furniture items and known-employee positions; aggregate room furniture is capped at 600. Existing global objects/positions are retained for backward compatibility, while new workspace edits use rooms. Prior explicit name/appearance edits are preserved. Save before leaving the Office tab. The configured runtime remains disconnected.

## Image-derived studio — 12 November 2026

This supersedes the earlier portrait-only statement for the four data-research seats. Seven actual Meshy image-derived GLBs are bundled: four unique people, a desk, a chair and a sofa. Ananya/Arjun have compatible rigs; Meera/Kavya are textured static models because new auto-rigging is paid. The other 124 characters and the architecture remain procedural. See IMAGE-TO-3D.md for exact scope, the free import workflow and limits. No subscription/API purchase was made. The reference studio adds a seventeenth known room key without duplicating employees or changing their IDs, tasks or department membership. Revised casting atlases use uniform row ordering; model-reference portraits override the four pilot identities. Official emblem and self-hosted wordmark typography appear on office walls.
