import { STAGES, CHANNELS, EMPLOYEES } from "../../src/model.js";
const headers = {
  "Content-Type": "application/json",
  "Cache-Control": "no-store",
  "X-Content-Type-Options": "nosniff",
};
const json = (data, status = 200, extra = {}) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { ...headers, ...extra },
  });
const hash = async (value) =>
  [
    ...new Uint8Array(
      await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value)),
    ),
  ]
    .map((n) => n.toString(16).padStart(2, "0"))
    .join("");
const cookie = (id) =>
  `trayaam_session=${id}; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=43200`;
const str = (s, max = 10000) => typeof s === "string" && s.length <= max;
async function authenticated(request, env) {
  const id = request.headers
    .get("Cookie")
    ?.match(/(?:^|;\s*)trayaam_session=([a-f0-9]{64})/)?.[1];
  if (!id) return false;
  const session = await env.DB.prepare(
    "SELECT expires FROM sessions WHERE id=?",
  )
    .bind(await hash(id))
    .first();
  return session?.expires > Date.now();
}
async function body(request) {
  if (Number(request.headers.get("Content-Length") || 0) > 32000)
    throw new Error("Body too large");
  const text = await request.text();
  if (text.length > 32000) throw new Error("Body too large");
  return JSON.parse(text);
}
export async function onRequest({ request, env, params }) {
  try {
    if (!env.DB)
      return json(
        { error: "Database not configured. Complete Cloudflare D1 setup." },
        503,
      );
    const path =
      (Array.isArray(params.path) ? params.path.join("/") : params.path) || "";
    const method = request.method;
    if (!["GET", "POST", "PATCH"].includes(method))
      return json({ error: "Method not supported" }, 405);
    const validRuntime =
      path.startsWith("runtime/") &&
      env.AGENT_RUNTIME_TOKEN &&
      request.headers.get("Authorization") ===
        `Bearer ${env.AGENT_RUNTIME_TOKEN}`;
    if (
      method !== "GET" &&
      !validRuntime &&
      request.headers.get("Origin") !== new URL(request.url).origin
    )
      return json({ error: "Same-origin request required" }, 403);
    if (path === "login" && method === "POST") {
      if (!env.WORKSPACE_PASSWORD_HASH)
        return json(
          {
            error:
              "Workspace password has not been configured. Complete deployment setup.",
          },
          503,
        );
      const ip = await hash(request.headers.get("CF-Connecting-IP") || "local");
      const now = Date.now();
      await env.DB.prepare(
        "INSERT INTO login_attempts(id,attempts,reset) VALUES(?,1,?) ON CONFLICT(id) DO UPDATE SET attempts=CASE WHEN reset<? THEN 1 ELSE attempts+1 END,reset=CASE WHEN reset<? THEN excluded.reset ELSE reset END",
      )
        .bind(ip, now + 900000, now, now)
        .run();
      const limit = await env.DB.prepare(
        "SELECT attempts FROM login_attempts WHERE id=?",
      )
        .bind(ip)
        .first();
      if (limit.attempts > 10)
        return json(
          { error: "Too many attempts. Try again in 15 minutes." },
          429,
        );
      const b = await body(request);
      if (
        !str(b.password, 256) ||
        (await hash(b.password)) !== env.WORKSPACE_PASSWORD_HASH
      )
        return json({ error: "Incorrect workspace password" }, 401);
      const token = [...crypto.getRandomValues(new Uint8Array(32))]
        .map((n) => n.toString(16).padStart(2, "0"))
        .join("");
      await env.DB.batch([
        env.DB.prepare("INSERT INTO sessions VALUES(?,?)").bind(
          await hash(token),
          now + 43200000,
        ),
        env.DB.prepare("DELETE FROM sessions WHERE expires<?").bind(now),
        env.DB.prepare("DELETE FROM login_attempts WHERE id=?").bind(ip),
      ]);
      return json({ ok: true }, 200, { "Set-Cookie": cookie(token) });
    }
    if (
      path === "runtime/tasks" &&
      env.AGENT_RUNTIME_TOKEN &&
      request.headers.get("Authorization") ===
        `Bearer ${env.AGENT_RUNTIME_TOKEN}` &&
      method === "GET"
    )
      return json({
        tasks: (
          await env.DB.prepare(
            "SELECT data,version FROM tasks WHERE json_extract(data,'$.status')='Queued'",
          ).all()
        ).results.map((r) => ({ ...JSON.parse(r.data), version: r.version })),
      });
    const runtime =
      path.startsWith("runtime/") &&
      env.AGENT_RUNTIME_TOKEN &&
      request.headers.get("Authorization") ===
        `Bearer ${env.AGENT_RUNTIME_TOKEN}`;
    if (!runtime && !(await authenticated(request, env)))
      return json({ error: "Sign in to your private workspace." }, 401);
    if (path === "logout" && method === "POST") {
      const token = request.headers
        .get("Cookie")
        ?.match(/trayaam_session=([a-f0-9]{64})/)?.[1];
      if (token)
        await env.DB.prepare("DELETE FROM sessions WHERE id=?")
          .bind(await hash(token))
          .run();
      return json({ ok: true }, 200, {
        "Set-Cookie":
          "trayaam_session=; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=0",
      });
    }
    if (path === "snapshot" && method === "GET") {
      const [records, metadata, events, tasks] = await Promise.all([
        env.DB.prepare("SELECT data,version FROM records").all(),
        env.DB.prepare(
          "SELECT id,data FROM metadata WHERE id LIKE 'inventory::%' OR id IN ('importedAt','shortlistCount','applicationResults')",
        ).all(),
        env.DB.prepare(
          "SELECT data FROM events ORDER BY rowid DESC LIMIT 10000",
        ).all(),
        env.DB.prepare(
          "SELECT data,version FROM tasks ORDER BY rowid DESC",
        ).all(),
      ]);
      const meta = {};
      for (const r of metadata.results.sort((a, b) =>
        a.id.localeCompare(b.id),
      )) {
        if (r.id.includes("::")) {
          const key = r.id.split("::")[0];
          (meta[key] ??= []).push(JSON.parse(r.data));
        } else meta[r.id] = JSON.parse(r.data);
      }
      return json({
        ...meta,
        prospects: records.results
          .map((r) => {
            const p = JSON.parse(r.data);
            delete p.original;
            delete p.decisionMakerResearch;
            delete p.contacts;
            delete p.decisionMaker;
            return { ...p, version: r.version };
          })
          .sort(
            (a, b) =>
              b.shortlist - a.shortlist ||
              Number(a.application?.number || 9999) -
                Number(b.application?.number || 9999) ||
              a.name.localeCompare(b.name),
          ),
        events: events.results.map((r) => JSON.parse(r.data)),
        tasks: tasks.results.map((r) => ({
          ...JSON.parse(r.data),
          version: r.version,
        })),
        runtimeConnected: tasks.results.some((r) => {
          const t = JSON.parse(r.data);
          return (
            t.heartbeatAt && Date.now() - Date.parse(t.heartbeatAt) < 90000
          );
        }),
      });
    }
    if (path.startsWith("prospects/") && method === "GET") {
      const result = await env.DB.prepare(
        "SELECT data,version FROM records WHERE id=?",
      )
        .bind(path.split("/")[1])
        .first();
      if (!result) return json({ error: "Prospect not found" }, 404);
      return json({ ...JSON.parse(result.data), version: result.version });
    }
    if (path === "source" && method === "GET") {
      const url = new URL(request.url),
        source = url.searchParams.get("path") || "",
        page = Math.max(
          0,
          Math.min(100000, Number(url.searchParams.get("page")) || 0),
        );
      const result = await env.DB.prepare(
        "SELECT row_number,data FROM source_rows WHERE source=? ORDER BY row_number LIMIT 50 OFFSET ?",
      )
        .bind(source, page * 50)
        .all();
      const total = await env.DB.prepare(
        "SELECT COUNT(*) as count FROM source_rows WHERE source=?",
      )
        .bind(source)
        .first();
      return json({
        rows: result.results.map((r) => ({
          row: r.row_number,
          values: JSON.parse(r.data),
        })),
        total: total.count,
        page,
      });
    }
    if (path === "documents" && method === "GET") {
      const companyId = new URL(request.url).searchParams.get("companyId");
      const result = await env.DB.prepare(
        "SELECT kind,data FROM documents WHERE company_id=?",
      )
        .bind(companyId)
        .all();
      return json({
        documents: result.results.map((r) => ({
          kind: r.kind,
          ...JSON.parse(r.data),
        })),
      });
    }
    if (path.startsWith("prospects/") && method === "PATCH") {
      const id = path.split("/")[1],
        b = await body(request);
      const existing = await env.DB.prepare(
        "SELECT data,version FROM records WHERE id=?",
      )
        .bind(id)
        .first();
      if (!existing) return json({ error: "Prospect not found" }, 404);
      if (b.version !== existing.version)
        return json(
          {
            error:
              "This record changed on another device. Refresh before editing.",
          },
          409,
        );
      if (
        !STAGES.includes(b.stage) ||
        !CHANNELS.includes(b.channel) ||
        !Number.isFinite(b.value) ||
        b.value < 0 ||
        b.value > 1e12
      )
        return json({ error: "Invalid stage, channel or value" }, 400);
      for (const key of [
        "owner",
        "nextAction",
        "nextDate",
        "notes",
        "eligibility",
      ])
        if (!str(b[key] ?? "", 10000))
          return json({ error: "Invalid field" }, 400);
      if (b.nextDate && !/^\d{4}-\d{2}-\d{2}$/.test(b.nextDate))
        return json({ error: "Invalid next-action date" }, 400);
      const updated = {
        ...JSON.parse(existing.data),
        ...Object.fromEntries(
          [
            "stage",
            "channel",
            "owner",
            "nextAction",
            "nextDate",
            "notes",
            "value",
            "suppressed",
            "eligibility",
          ].map((k) => [k, b[k]]),
        ),
        updatedAt: new Date().toISOString(),
      };
      if (updated.stage === "Do not contact") updated.suppressed = true;
      const audit = {
        id: crypto.randomUUID(),
        type: "record_update",
        prospectId: id,
        companyName: updated.name,
        note: `Stage: ${updated.stage}; channel: ${updated.channel}; owner: ${updated.owner || "unassigned"}`,
        at: new Date().toISOString(),
        actor: "Workspace owner",
      };
      const result = await env.DB.prepare(
        "UPDATE records SET data=?,version=version+1 WHERE id=? AND version=?",
      )
        .bind(JSON.stringify(updated), id, b.version)
        .run();
      if (!result.meta.changes)
        return json({ error: "Concurrent edit. Refresh and retry." }, 409);
      await env.DB.prepare("INSERT INTO events VALUES(?,?)")
        .bind(audit.id, JSON.stringify(audit))
        .run();
      return json({ ...updated, version: b.version + 1 });
    }
    if (path === "events" && method === "POST") {
      const b = await body(request);
      if (
        !["note", "outreach"].includes(b.type) ||
        ![
          "Note",
          "Sent",
          "Replied",
          "Bounced",
          "Meeting",
          "Opted out",
        ].includes(b.outcome) ||
        !CHANNELS.includes(b.channel) ||
        !str(b.note) ||
        !b.note.trim()
      )
        return json({ error: "Invalid activity" }, 400);
      const p = await env.DB.prepare("SELECT data FROM records WHERE id=?")
        .bind(b.prospectId)
        .first();
      if (!p) return json({ error: "Prospect not found" }, 404);
      const prospect = JSON.parse(p.data);
      const event = {
        id: crypto.randomUUID(),
        prospectId: b.prospectId,
        companyName: prospect.name,
        type: b.type,
        outcome: b.outcome,
        channel: b.channel,
        note: b.note,
        at: new Date().toISOString(),
        actor: "Workspace owner",
        source: "Manual observation; not a sending action",
      };
      if (b.outcome === "Opted out") {
        prospect.suppressed = true;
        prospect.stage = "Do not contact";
        prospect.suppressionReason = b.note;
        await env.DB.batch([
          env.DB.prepare("INSERT INTO events VALUES(?,?)").bind(
            event.id,
            JSON.stringify(event),
          ),
          env.DB.prepare(
            "UPDATE records SET data=?,version=version+1 WHERE id=?",
          ).bind(JSON.stringify(prospect), b.prospectId),
        ]);
      } else
        await env.DB.prepare("INSERT INTO events VALUES(?,?)")
          .bind(event.id, JSON.stringify(event))
          .run();
      return json(event, 201);
    }
    if (path === "tasks" && method === "POST") {
      const b = await body(request);
      if (
        !str(b.title, 180) ||
        !b.title.trim() ||
        !str(b.description, 10000) ||
        !EMPLOYEES.some((e) => e.id === b.agentId && e.role === b.role) ||
        (b.due && !/^\d{4}-\d{2}-\d{2}$/.test(b.due))
      )
        return json({ error: "Invalid assignment" }, 400);
      if (
        b.prospectId &&
        !(await env.DB.prepare("SELECT id FROM records WHERE id=?")
          .bind(b.prospectId)
          .first())
      )
        return json({ error: "Prospect not found" }, 404);
      const task = {
        id: crypto.randomUUID(),
        title: b.title,
        description: b.description,
        agentId: b.agentId,
        role: b.role,
        prospectId: b.prospectId || "",
        due: b.due || "",
        status: "Queued",
        progress: 0,
        step: "Awaiting AI runtime",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        version: 0,
      };
      await env.DB.prepare("INSERT INTO tasks(id,data) VALUES(?,?)")
        .bind(task.id, JSON.stringify(task))
        .run();
      return json(task, 201);
    }
    if (
      (path.startsWith("tasks/") ||
        (runtime && path.startsWith("runtime/tasks/"))) &&
      method === "PATCH"
    ) {
      const id = path.split("/").at(-1),
        b = await body(request),
        existing = await env.DB.prepare(
          "SELECT data,version FROM tasks WHERE id=?",
        )
          .bind(id)
          .first();
      if (!existing) return json({ error: "Task not found" }, 404);
      if (b.version !== existing.version)
        return json({ error: "Task changed. Refresh and retry." }, 409);
      const allowed = runtime
        ? ["Working", "Blocked", "Awaiting review", "Done", "Failed"]
        : ["Queued", "Blocked", "Awaiting review", "Done", "Cancelled"];
      if (!allowed.includes(b.status))
        return json(
          { error: "Invalid status. Working requires a runtime heartbeat." },
          400,
        );
      const task = JSON.parse(existing.data);
      task.status = b.status;
      task.updatedAt = new Date().toISOString();
      if (runtime) {
        if (
          !Number.isFinite(b.progress) ||
          b.progress < 0 ||
          b.progress > 100 ||
          !str(b.step, 1000) ||
          (b.output !== undefined && !str(b.output, 10000))
        )
          return json({ error: "Invalid runtime progress" }, 400);
        task.progress = b.progress;
        task.step = b.step;
        task.output = b.output || "";
        task.heartbeatAt = task.updatedAt;
        task.runtimeId = String(b.runtimeId || "external").slice(0, 100);
      } else if (b.status === "Done") {
        task.progress = 100;
        task.step = "Marked done by workspace owner";
      }
      const result = await env.DB.prepare(
        "UPDATE tasks SET data=?,version=version+1 WHERE id=? AND version=?",
      )
        .bind(JSON.stringify(task), id, b.version)
        .run();
      if (!result.meta.changes)
        return json({ error: "Concurrent task update" }, 409);
      return json({ ...task, version: b.version + 1 });
    }
    return json({ error: "Not found" }, 404);
  } catch (error) {
    return json(
      {
        error:
          error instanceof SyntaxError
            ? "Invalid JSON"
            : "Request could not be completed. Check backend configuration.",
      },
      error instanceof SyntaxError ? 400 : 500,
    );
  }
}
