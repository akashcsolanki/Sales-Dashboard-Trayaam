// Local QA server uses the same Pages function with a SQLite-backed D1 adapter.
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { DatabaseSync } from "node:sqlite";
import { onRequest } from "../functions/api/[[path]].js";
import { createHash, randomBytes } from "node:crypto";
const db = new DatabaseSync(".private/local.db");
db.exec("BEGIN");
db.exec(fs.readFileSync(".private/seed.sql", "utf8"));
db.exec(fs.readFileSync(".private/starter-sources.sql", "utf8"));
if (fs.existsSync(".private/supporting.sql"))
  db.exec(fs.readFileSync(".private/supporting.sql", "utf8"));
if (fs.existsSync(".private/hiring-updates.sql"))
  db.exec(fs.readFileSync(".private/hiring-updates.sql", "utf8"));
db.exec("COMMIT");
const password = fs.existsSync(".private/access.txt")
  ? fs.readFileSync(".private/access.txt", "utf8").trim()
  : randomBytes(24).toString("base64url");
fs.writeFileSync(".private/access.txt", password);
function statement(sql, args = []) {
  return {
    bind(...values) {
      return statement(sql, values);
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
  prepare: statement,
  async batch(items) {
    db.exec("BEGIN");
    try {
      const results = [];
      for (const s of items) results.push(await s.run());
      db.exec("COMMIT");
      return results;
    } catch (e) {
      db.exec("ROLLBACK");
      throw e;
    }
  },
};
const server = http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url, "http://127.0.0.1:4173");
    if (url.pathname.startsWith("/api/")) {
      const chunks = [];
      let size = 0;
      for await (const chunk of req) {
        size += chunk.length;
        if (size > 131072) {
          res.writeHead(413, { "Content-Type": "application/json", "Cache-Control": "no-store" });
          res.end(JSON.stringify({ error: "Request body too large" }));
          return;
        }
        chunks.push(chunk);
      }
      const body = Buffer.concat(chunks);
      const request = new Request(url, {
        method: req.method,
        headers: req.headers,
        ...(req.method !== "GET" ? { body } : {}),
      });
      const result = await onRequest({
        request,
        env: {
          DB,
          WORKSPACE_PASSWORD_HASH: createHash("sha256")
            .update(password)
            .digest("hex"),
        },
        params: { path: url.pathname.slice(5).split("/") },
      });
      const responseBody=Buffer.from(await result.arrayBuffer());
      res.writeHead(result.status, Object.fromEntries(result.headers));
      res.end(responseBody);
      return;
    }
    const relative = decodeURIComponent(url.pathname).replace(/^\/+/, ""),
      base = path.resolve("dist");
    let filename = path.resolve(base, relative);
    if (!filename.startsWith(base + path.sep) && filename !== base) {
      res.writeHead(403);
      res.end();
      return;
    }
    if (!fs.existsSync(filename) || fs.statSync(filename).isDirectory()) {
      if(path.extname(filename)){res.writeHead(404);res.end('Not found');return;}
      filename = path.join(base, "index.html");
    }
    const types = {
      ".html": "text/html",
      ".js": "text/javascript",
      ".css": "text/css",
      ".svg": "image/svg+xml", ".webp":"image/webp", ".png":"image/png", ".woff2":"font/woff2",
    };
    const responseBody=fs.readFileSync(filename);
    res.writeHead(200, {
      "Content-Type":
        types[path.extname(filename)] || "application/octet-stream",
    });
    res.end(responseBody);
  } catch (e) {
    if(!res.headersSent)res.writeHead(500);
    if(!res.writableEnded)res.end("Local QA server error");
    console.error(e.message);
  }
});
server.listen(4173, "127.0.0.1", () =>
  console.log(
    "Local QA ready: http://127.0.0.1:4173 · access in .private/access.txt",
  ),
);
