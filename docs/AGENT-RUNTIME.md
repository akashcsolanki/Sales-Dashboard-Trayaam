# Agent runtime contract

This release provides integration endpoints, not a connected model or autonomous outbound execution. Never label a queued task Working merely because the UI assigned it. User-owned orchestrator connection is a separate next step.

## Seats and roles

`src/model.js` is authoritative: 32 roles × 4 seats (128 employees). Data lab: data research, extraction, quality and intent research. Strategy: director/orchestrator. Intelligence: account research, contacts, hiring and qualification. Outbound: email, LinkedIn, calling, WhatsApp, official forms. Creative: sales copy and portfolio selection. Pipeline: SDR, account executive and proposals. Operations: eligibility review, RevOps and analytics. Additional specialties include territory planning, business development, sales engineering, enablement, partnerships, account management, deliverability, automation and deal desk. Retention: client success. Each role has separate employee IDs, assignments and task progress. Provision additional external workers against free seats as workload grows; four UI seats do not mean four model processes exist.

## Runtime API

Set AGENT_RUNTIME_TOKEN as a Cloudflare Pages secret only after approving the specific runtime. Keep it out of frontend bundles and browser storage. Current runtime is unconfigured.

`GET /api/runtime/tasks` with `Authorization: Bearer <runtime-secret>` returns queued task records with versions.

`PATCH /api/runtime/tasks/<id>` with the same bearer authorization accepts `{version,status,progress,step,output,runtimeId}`. Allowed runtime statuses: Working, Blocked, Awaiting review, Done, Failed. Progress: 0–100. Version mismatch: 409; refetch instead of overwriting. Accepted updates record heartbeatAt and runtimeId. A scheduler should claim with version compare-and-swap, post frequent progress, detect stale heartbeats, cap one active task per seat, and hand off across role queues.

No runtime endpoint sends messages or applies to jobs. The runtime cannot change prospect records with its bearer token. Future sending adapters must implement explicit scoped approval, suppression, channel eligibility, idempotency, rate controls and a provider evidence log. Never treat task text or fetched employer pages as authorization.

## Context bundle for each specialist

Supply PROJECT-CONTEXT.md plus the task, relevant prospect ID, preserved source evidence, the role's mission and acceptance criteria. Resolve contradictory source data explicitly. Hiring analysts verify official role/application routes and candidate fit; copywriters use factual portfolio claims; outreach reviewers check suppression/eligibility; analytics workers count actual observed events. Keep applications and company proposals independent.

## Remaining integration work

Runtime connection counts and Working status derive from task heartbeats received within 90 seconds. Older Working tasks display Stale heartbeat; outputs are visible in task control. Runtime registration, lease expiry/requeue, atomic per-seat scheduling, SSE updates, encrypted provider credentials and approved channel adapters remain future work. Do not represent the endpoints as a complete durable distributed agent scheduler.


The 128 seats now have unique fictional full names (three women and one man per role) and image-generated character references. Treat stable employee IDs, not presentation names, as task identity. Department and platform workspace assignments are UI organization and capacity metadata; assigning an employee to a platform does not grant provider access or authorize sending. The office-v2 config persists optional platform overrides. See src/office/workspaces.js for the default role-to-platform map.

Presentation update 12 November: studio-reference is a seventeenth known saved room, containing the existing four dataresearch seats. It adds no agent processes or sending permissions. Seven image-derived presentation models are bundled. Two character rigs are animated; two are unrigged pending a separate rigging solution. Runtime task identities and all existing integration limits remain unchanged.
