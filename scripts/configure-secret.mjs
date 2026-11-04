import { readFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { spawn } from "node:child_process";
import path from "node:path";
const password = readFileSync(".private/access.txt", "utf8").trim();
const hash = createHash("sha256").update(password).digest("hex");
const child = spawn(
  process.execPath,
  [
    "node_modules/wrangler/bin/wrangler.js",
    "pages",
    "secret",
    "put",
    "WORKSPACE_PASSWORD_HASH",
    "--project-name",
    "trayaam-sales-office",
  ],
  {
    env: {
      ...process.env,
      CLOUDFLARE_ACCOUNT_ID: "6003bf1b053a122140b87234eb24587b",
      WRANGLER_LOG_PATH: path.resolve(".private/secret-config.log"),
    },
    stdio: ["pipe", "inherit", "inherit"],
  },
);
child.stdin.end(hash + "\n");
child.on("exit", (code) => process.exit(code || 0));
