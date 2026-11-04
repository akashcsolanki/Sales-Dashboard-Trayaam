import test from "node:test";
import assert from "node:assert/strict";
import { DatabaseSync } from "node:sqlite";
import { createHash } from "node:crypto";
import { onRequest } from "../functions/api/[[path]].js";
function setup() {
  const db = new DatabaseSync(":memory:");
  db.exec(
    "CREATE TABLE records(id TEXT PRIMARY KEY,data TEXT,version INTEGER DEFAULT 0);CREATE TABLE metadata(id TEXT PRIMARY KEY,data TEXT);CREATE TABLE events(id TEXT PRIMARY KEY,data TEXT);CREATE TABLE tasks(id TEXT PRIMARY KEY,data TEXT,version INTEGER DEFAULT 0);CREATE TABLE sessions(id TEXT PRIMARY KEY,expires INTEGER);CREATE TABLE login_attempts(id TEXT PRIMARY KEY,attempts INTEGER,reset INTEGER);",
  );
  function prepare(sql, args = []) {
    return {
      bind(...a) {
        return prepare(sql, a);
      },
      async first() {
        return db.prepare(sql).get(...args) || null;
      },
      async all() {
        return { results: db.prepare(sql).all(...args) };
      },
      async run() {
        return {
          meta: { changes: Number(db.prepare(sql).run(...args).changes) },
        };
      },
    };
  }
  const DB = {
    prepare,
    async batch(s) {
      const out = [];
      for (const item of s) out.push(await item.run());
      return out;
    },
  };
  const env = {
    DB,
    WORKSPACE_PASSWORD_HASH: createHash("sha256")
      .update("a-random-test-secret-password")
      .digest("hex"),
    AGENT_RUNTIME_TOKEN: "test-runtime-token",
  };
  const call = async (
    path,
    {
      method = "GET",
      body,
      cookie,
      origin = "https://sales.example",
      runtime = false,
    } = {},
  ) =>
    onRequest({
      request: new Request("https://sales.example/api/" + path, {
        method,
        headers: {
          ...(origin ? { Origin: origin } : {}),
          ...(cookie ? { Cookie: cookie } : {}),
          ...(runtime ? { Authorization: "Bearer test-runtime-token" } : {}),
        },
        ...(body ? { body: JSON.stringify(body) } : {}),
      }),
      env,
      params: { path: path.split("/") },
    });
  return { db, call };
}
async function login(call) {
  const res = await call("login", {
    method: "POST",
    body: { password: "a-random-test-secret-password" },
  });
  assert.equal(res.status, 200);
  return res.headers.get("Set-Cookie").split(";")[0];
}
test("unauthenticated data and cross-origin login are rejected", async () => {
  const { call } = setup();
  assert.equal((await call("snapshot")).status, 401);
  assert.equal(
    (
      await call("login", {
        method: "POST",
        body: { password: "x" },
        origin: "https://evil.example",
      })
    ).status,
    403,
  );
});
test("session login grants access; logout revokes it", async () => {
  const { call } = setup(),
    cookie = await login(call);
  assert.equal((await call("snapshot", { cookie })).status, 200);
  await call("logout", { method: "POST", body: {}, cookie });
  assert.equal((await call("snapshot", { cookie })).status, 401);
});
test("login attempts are throttled", async () => {
  const { call } = setup();
  for (let i = 0; i < 10; i++)
    assert.equal(
      (await call("login", { method: "POST", body: { password: "wrong" } }))
        .status,
      401,
    );
  assert.equal(
    (await call("login", { method: "POST", body: { password: "wrong" } }))
      .status,
    429,
  );
});
test("prospect edit persists and stale version fails", async () => {
  const { db, call } = setup();
  db.prepare("INSERT INTO records(id,data) VALUES(?,?)").run(
    "p1",
    JSON.stringify({ id: "p1", name: "Example agency" }),
  );
  const cookie = await login(call);
  const b = {
    version: 0,
    stage: "Qualified",
    channel: "Email",
    owner: "Owner",
    value: 2000,
    nextAction: "Review",
    nextDate: "2026-11-10",
    notes: "Evidence",
    eligibility: "Needs review",
    suppressed: false,
  };
  assert.equal(
    (await call("prospects/p1", { method: "PATCH", body: b, cookie })).status,
    200,
  );
  assert.equal(
    (await call("prospects/p1", { method: "PATCH", body: b, cookie })).status,
    409,
  );
  const snap = await (await call("snapshot", { cookie })).json();
  assert.equal(snap.prospects[0].value, 2000);
  assert.equal(snap.events[0].type, "record_update");
});
test("opt-out atomically suppresses prospect", async () => {
  const { db, call } = setup();
  db.prepare("INSERT INTO records(id,data) VALUES(?,?)").run(
    "p1",
    JSON.stringify({ id: "p1", name: "Example" }),
  );
  const cookie = await login(call);
  const res = await call("events", {
    method: "POST",
    cookie,
    body: {
      prospectId: "p1",
      type: "outreach",
      outcome: "Opted out",
      channel: "Email",
      note: "Recipient requested removal",
    },
  });
  assert.equal(res.status, 201);
  const p = JSON.parse(db.prepare("SELECT data FROM records").get().data);
  assert.equal(p.suppressed, true);
  assert.equal(p.stage, "Do not contact");
});
test("runtime claims use version checks and cannot access prospect snapshot", async () => {
  const { call } = setup(),
    cookie = await login(call);
  const created = await (
    await call("tasks", {
      method: "POST",
      cookie,
      body: {
        title: "Research company",
        description: "Check official source",
        agentId: "research-1",
        role: "research",
      },
    })
  ).json();
  assert.equal(created.status, "Queued");
  assert.equal(
    (
      await call("tasks/" + created.id, {
        method: "PATCH",
        cookie,
        body: { version: 0, status: "Working" },
      })
    ).status,
    400,
  );
  assert.equal(
    (
      await call("runtime/tasks/" + created.id, {
        method: "PATCH",
        runtime: true,
        origin: null,
        body: {
          version: 0,
          status: "Working",
          progress: 10,
          step: "Checking official site",
          runtimeId: "r1",
        },
      })
    ).status,
    200,
  );
  assert.equal(
    (
      await call("runtime/tasks/" + created.id, {
        method: "PATCH",
        runtime: true,
        origin: null,
        body: { version: 0, status: "Done", progress: 100, step: "Done" },
      })
    ).status,
    409,
  );
  assert.equal((await call("snapshot", { runtime: true })).status, 401);
});
