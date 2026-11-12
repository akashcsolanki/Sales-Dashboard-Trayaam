# Trayaam Sales Office

Responsive private outreach workspace: prospects, pipeline, hiring signals, globe, assets, analytics and a specialist Sales Office with 128 seats.

Production: [sales.trayaam.com](https://sales.trayaam.com/). Sign in with the workspace password. Source is maintained in this repository; Cloudflare Pages deployments currently use Wrangler direct upload rather than automatic GitHub builds.

React · Vite · GSAP · WebGL gradient · COBE · Cloudflare Pages Functions · D1.

Start with [project context](docs/PROJECT-CONTEXT.md), [operations](docs/OPERATIONS.md), and [agent runtime contract](docs/AGENT-RUNTIME.md). Contributor instructions: [AGENTS.md](AGENTS.md).

Run `npm ci`, `npm test`, and `npm run build`. Real data is imported privately using `scripts/import-data.py` from the existing Trayaam workspace; it is never bundled or committed to this public repository. A fresh clone without the private source directory cannot recreate the prospect dataset. Configure D1 and server authentication before deployment.

AI execution and outbound sending are not connected. Tasks can be queued and tracked; specialized external workers will use the documented runtime boundary.
