# Trayaam dashboard design

Official identity comes from the existing Trayaam portfolio source (`../folio-deploy/src/components/Logo.astro`): the gold column/lotus emblem, Cormorant Garamond 600 wordmark, charcoal #0A0A0B, champagne gold #C9A86A and warm ivory #F4F1E8. Assets and fonts are self-hosted in public/brand and public/fonts. Inter Tight supports dense UI, Fraunces headings and JetBrains Mono metadata. Reference: https://trayaam.com/.

The dashboard retains the real source hierarchy, prospect evidence, hiring dates, channel eligibility, pipeline and analytics. Dark surfaces, restrained gold, readable type and responsive navigation replace the earlier visual system. Motion uses GSAP and respects reduced motion. The lazy-loaded Three.js office is separate from the main dashboard bundle. WebGL is needed for the rendered scene; roster/task controls remain ordinary HTML.

Office inspiration: the selectable characters, cutaway perspective and live/build modes of https://www.ea.com/games/the-sims/the-sims-4. All room geometry and character models are original procedural work; no EA models, textures or branding are copied. This is not a full Sims implementation or a claim of equivalent production scope.

The sales taxonomy was expanded using Salesforce's sales team/career and SDR references: https://www.salesforce.com/company/careers/teams/sales/ , https://www.salesforce.com/ap/sales/tech-sales-career/ and https://www.salesforce.com/blog/sales/sales-development-representative/ . The 32-role structure in src/model.js adapts these functions to Trayaam's research, delivery-partner and multichannel workflow; four seats per specialty are a capacity model, not four running AI processes.

Characters support name, skin, outfit, hair color/style, accessory and persisted movement. Workstations and catalog furniture support placement, movement, rotation, material colors and removal. Architecture, lighting, floor and wall palettes are configurable. Structural shell and bundled furniture details are intentionally model components, not an unrestricted 3D editor. AI execution requires the separately authorized orchestrator described in AGENT-RUNTIME.md.
