import test from "node:test";
import assert from "node:assert/strict";
import { DatabaseSync } from "node:sqlite";
import { createHash } from "node:crypto";
import { onRequest } from "../functions/api/[[path]].js";
import { readObjectBody } from "../functions/request-body.js";
import { EMPLOYEES } from "../src/model.js";
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
      raw,
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
        ...(raw !== undefined ? { body: raw, duplex: "half" } : body !== undefined ? { body: JSON.stringify(body) } : {}),
      }),
      env,
      params: { path: path.split("/") },
    });
  return { db, call, DB };
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

const office = () => ({
  theme: "penthouse", lighting: "daylight", floor: "oak", wall: "ivory",
  objects: [], employees: {}, positions: {},
});

test("office is owner-only, persists and atomically rejects stale creation/update", async () => {
  const { call } = setup();
  assert.equal((await call("office")).status, 401);
  assert.equal((await call("office", { runtime: true })).status, 401);
  assert.equal((await call("office", { method: "PATCH", runtime: true, body: { version: 0, config: office() } })).status, 401);
  const cookie = await login(call);
  assert.deepEqual(await (await call("office", { cookie })).json(), { config: null, version: 0 });
  assert.equal((await call("office", { method: "PATCH", cookie, body: { version: 2, config: office() } })).status, 409);
  const payload = { version: 0, config: office() };
  assert.equal((await call("office", { method: "PATCH", cookie, origin: "https://evil.example", body: payload })).status, 403);
  const results = await Promise.all([call("office", { method: "PATCH", cookie, body: payload }), call("office", { method: "PATCH", cookie, body: payload })]);
  assert.deepEqual(results.map((r) => r.status).sort(), [200, 409]);
  assert.deepEqual(await (await call("office", { cookie })).json(), { config: payload.config, version: 1 });
  payload.version = 1;
  payload.config.theme = "midnight";
  assert.equal((await call("office", { method: "PATCH", cookie, body: payload })).status, 200);
  assert.equal((await call("office", { method: "PATCH", cookie, body: payload })).status, 409);
});

test("office accepts bounded full roster and furniture; rejects unsafe schema", async () => {
  const { call } = setup(), cookie = await login(call);
  const config = office();
  config.objects = Array.from({ length: 300 }, (_, i) => ({ id: `obj-${i}`, type: "desk", x: 1, z: 1, rotation: 0, color: "#123456" }));
  for (const e of EMPLOYEES) {
    config.employees[e.id] = { displayName: e.name, skin: "#abcdef", hair: "#123456", outfit: "#123456", hairStyle: "bob", accessory: "glasses" };
    config.positions[e.id] = { x: 0, z: 0 };
  }
  assert.ok(JSON.stringify(config).length > 32768);
  assert.equal((await call("office", { method: "PATCH", cookie, body: { version: 0, config } })).status, 200);
  for (const alter of [
    c => c.objects.push({ ...c.objects[0], id: "extra" }),
    c => c.objects[0].x = 41,
    c => c.objects[0].rotation = 7,
    c => c.objects[0].color = "url(evil)",
    c => c.objects[1].id = c.objects[0].id,
    c => c.employees.unknown = { displayName: "Unknown" },
    c => c.employees[EMPLOYEES[0].id].script = "bad",
    c => c.positions[EMPLOYEES[0].id].x = 41,
    c => c.theme = "unknown",
    c => c.extra = true,
  ]) {
    const invalid = structuredClone(config); alter(invalid);
    assert.equal((await call("office", { method: "PATCH", cookie, body: { version: 1, config: invalid } })).status, 400);
  }
  assert.equal((await call("office", { method: "PATCH", cookie, body: { version: Number.MAX_SAFE_INTEGER, config } })).status, 400);
});

test("stream limits stop missing/understated-length bodies before materializing the rest", async () => {
  for (const declared of [undefined, "1", "invalid"]) {
    let pulls = 0, cancelled = false;
    const stream = new ReadableStream({
      pull(controller) { pulls++; controller.enqueue(new Uint8Array(17000).fill(32)); },
      cancel() { cancelled = true; },
    }, { highWaterMark: 0 });
    const request = new Request("https://sales.example/api/login", { method: "POST", body: stream, duplex: "half", headers: declared ? { "Content-Length": declared } : {} });
    await assert.rejects(readObjectBody(request), e => e.status === 413);
    assert.equal(cancelled, true);
    assert.equal(pulls, 2);
  }
});

test("protected and cross-origin requests reject before reading attacker streams", async () => {
  const { call } = setup();
  const cookie = await login(call);
  for (const options of [
    { method: "PATCH" },
    { method: "PATCH", cookie, origin: "https://evil.example" },
    { method: "PATCH", runtime: true },
  ]) {
    let reads = 0;
    const raw = new ReadableStream({ pull(c) { reads++; c.enqueue(new Uint8Array(200000)); } }, { highWaterMark: 0 });
    const response = await call("office", { ...options, raw });
    assert.equal(response.status, options.origin ? 403 : 401);
    assert.equal(reads, 0);
    await raw.cancel();
  }
});

test("byte limit handles exact boundary, multibyte text, malformed roots and endpoint errors", async () => {
  const text = JSON.stringify({ note: "é".repeat(15) });
  const bytes = new TextEncoder().encode(text);
  const request = () => new Request("https://sales.example", { method: "POST", body: bytes });
  assert.deepEqual(await readObjectBody(request(), bytes.length), { note: "é".repeat(15) });
  await assert.rejects(readObjectBody(request(), bytes.length - 1), e => e.status === 413);
  const split = new ReadableStream({ start(c) { for (const b of bytes) c.enqueue(Uint8Array.of(b)); c.close(); } });
  assert.deepEqual(await readObjectBody(new Request("https://sales.example", { method: "POST", body: split, duplex: "half" })), { note: "é".repeat(15) });
  const { call } = setup();
  for (const raw of ["null", "[]", "true", '"x"', "{", "", Uint8Array.of(255)])
    assert.equal((await call("login", { method: "POST", raw })).status, 400);
  assert.equal((await call("login", { method: "POST", raw: " ".repeat(32769) })).status, 413);
  const cookie = await login(call);
  assert.equal((await call("office", { method: "PATCH", cookie, raw: " ".repeat(131073) })).status, 413);
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

test("opt-out preserves edits committed after its prospect read", async () => {
  const { db, call, DB } = setup();
  db.prepare("INSERT INTO records(id,data) VALUES(?,?)").run("p1", JSON.stringify({ id: "p1", name: "Example", notes: "old" }));
  const cookie = await login(call);
  const original = DB.prepare;
  DB.prepare = (sql) => {
    const statement = original(sql);
    if (sql !== "SELECT data FROM records WHERE id=?") return statement;
    const bind = statement.bind;
    statement.bind = (...args) => {
      const bound = bind(...args), first = bound.first;
      bound.first = async () => {
        const row = await first();
        db.prepare("UPDATE records SET data=json_set(data,'$.notes','concurrent edit'),version=version+1 WHERE id='p1'").run();
        return row;
      };
      return bound;
    };
    return statement;
  };
  const response = await call("events", { method: "POST", cookie, body: { prospectId: "p1", type: "outreach", outcome: "Opted out", channel: "Email", note: "Requested removal" } });
  assert.equal(response.status, 201);
  const row = db.prepare("SELECT data,version FROM records WHERE id='p1'").get();
  assert.equal(JSON.parse(row.data).notes, "concurrent edit");
  assert.equal(JSON.parse(row.data).suppressed, true);
  assert.equal(JSON.parse(row.data).stage, "Do not contact");
  assert.equal(row.version, 2);
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

test('department room edits and platform assignments persist without changing another room', async()=>{
 const {call}=setup(), cookie=await login(call), config=office();
 config.rooms={
  'dept-data-lab':{objects:[{id:'lab-desk',type:'desk',x:1,z:2,rotation:0,color:'#abcdef'}],positions:{'dataresearch-1':{x:2,z:3}}},
  'platform-email':{objects:[{id:'email-pod',type:'booth',x:10,z:-5,rotation:0,color:'#abcdef'}],positions:{}}
 };
 config.employees['dataresearch-1']={platform:'linkedin',hairStyle:'braid',accessory:'earrings',wardrobe:'dress'};
 assert.equal((await call('office',{method:'PATCH',cookie,body:{version:0,config}})).status,200);
 assert.deepEqual((await (await call('office',{cookie})).json()).config,config);
 const next=structuredClone(config);next.rooms['dept-data-lab'].objects[0].x=4;
 assert.equal((await call('office',{method:'PATCH',cookie,body:{version:1,config:next}})).status,200);
 const saved=(await (await call('office',{cookie})).json()).config;
 assert.equal(saved.rooms['dept-data-lab'].objects[0].x,4);
 assert.deepEqual(saved.rooms['platform-email'],config.rooms['platform-email']);
 const invalid=structuredClone(saved);invalid.rooms['other-room']={objects:[],positions:{}};
 assert.equal((await call('office',{method:'PATCH',cookie,body:{version:2,config:invalid}})).status,400);
});
