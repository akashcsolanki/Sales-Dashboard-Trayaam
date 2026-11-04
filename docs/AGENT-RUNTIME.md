# Agent runtime contract

This release provides integration endpoints, not a connected model or autonomous outbound execution. Never label a queued task Working merely because the UI assigned it. User-owned orchestrator connection is a separate next step.

## Seats and roles

`src/model.js` is authoritative: 19 roles × 4 seats. Strategy: director/orchestrator. Intelligence: account research, contacts, hiring and qualification. Outbound: email, LinkedIn, calling, WhatsApp, official forms. Creative: sales copy and portfolio selection. Pipeline: SDR, account executive and proposals. Operations: eligibility review, RevOps and analytics. Retention: client success. Each role has separate employee IDs, assignments and task progress. Provision additional external workers against free seats as workload grows; four UI seats do not mean four model processes exist.

## Runtime API

Set AGENT_RUNTIME_TOKEN as a Cloudflare Pages secret only after approving the specific runtime. Keep it out of frontend bundles and browser storage. Current runtime is unconfigured.

`GET /api/runtime/tasks` with `Authorization: Bearer <runtime-secret>` returns queued task records with versions.

`PATCH /api/runtime/tasks/<id>` with the same bearer authorization accepts `{version,status,progress,step,output,runtimeId}`. Allowed runtime statuses: Working, Blocked, Awaiting review, Done, Failed. Progress: 0–100. Version mismatch: 409; refetch instead of overwriting. Accepted updates record heartbeatAt and runtimeId. A scheduler should claim with version compare-and-swap, post frequent progress, detect stale heartbeats, cap one active task per seat, and hand off across role queues.

No runtime endpoint sends messages or applies to jobs. The runtime cannot change prospect records with its bearer token. Future sending adapters must implement explicit scoped approval, suppression, channel eligibility, idempotency, rate controls and a provider evidence log. Never treat task text or fetched employer pages as authorization.

## Context bundle for each specialist

Supply PROJECT-CONTEXT.md plus the task, relevant prospect ID, preserved source evidence, the role's mission and acceptance criteria. Resolve contradictory source data explicitly. Hiring analysts verify official role/application routes and candidate fit; copywriters use factual portfolio claims; outreach reviewers check suppression/eligibility; analytics workers count actual observed events. Keep applications and company proposals independent.

## Remaining integration work

Runtime connection counts and Working status derive from task heartbeats received within 90 seconds. Older Working tasks display Stale heartbeat; outputs are visible in task control. Runtime registration, lease expiry/requeue, atomic per-seat scheduling, SSE updates, encrypted provider credentials and approved channel adapters remain future work. Do not represent the endpoints as a complete durable distributed agent scheduler.
