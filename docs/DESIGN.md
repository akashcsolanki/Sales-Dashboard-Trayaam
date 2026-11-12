# Trayaam dashboard design

Official identity comes from the existing Trayaam portfolio source (`../folio-deploy/src/components/Logo.astro`): the gold column/lotus emblem, Cormorant Garamond 600 wordmark, charcoal #0A0A0B, champagne gold #C9A86A and warm ivory #F4F1E8. Assets and fonts are self-hosted in public/brand and public/fonts. Inter Tight supports dense UI, Fraunces headings and JetBrains Mono metadata. Reference: https://trayaam.com/.

The dashboard retains the real source hierarchy, prospect evidence, hiring dates, channel eligibility, pipeline and analytics. Dark surfaces, restrained gold, readable type and responsive navigation replace the earlier visual system. Motion uses GSAP and respects reduced motion. The lazy-loaded Three.js office is separate from the main dashboard bundle. WebGL is needed for the rendered scene; roster/task controls remain ordinary HTML.

Office inspiration: the selectable characters, cutaway perspective and live/build modes of https://www.ea.com/games/the-sims/the-sims-4. All room geometry and character models are original procedural work; no EA models, textures or branding are copied. This is not a full Sims implementation or a claim of equivalent production scope.

The sales taxonomy was expanded using Salesforce's sales team/career and SDR references: https://www.salesforce.com/company/careers/teams/sales/ , https://www.salesforce.com/ap/sales/tech-sales-career/ and https://www.salesforce.com/blog/sales/sales-development-representative/ . The 32-role structure in src/model.js adapts these functions to Trayaam's research, delivery-partner and multichannel workflow; four seats per specialty are a capacity model, not four running AI processes.

Characters support name, skin, outfit, hair color/style, accessory and persisted movement. Workstations and catalog furniture support placement, movement, rotation, material colors and removal. Architecture, lighting, floor and wall palettes are configurable. Structural shell and bundled furniture details are intentionally model components, not an unrestricted 3D editor. AI execution requires the separately authorized orchestrator described in AGENT-RUNTIME.md.


## Individual cast and departmental rooms

The 5 November iteration replaces repeated name/number combinations and CSS silhouettes with 128 original fictional full names and generated reference portraits, with 96 women and 32 men distributed three/one per role. Names and image cells are mapped explicitly in src/office/identities.js; the first atlas uses an interleaved cell map. Eight WebP character atlases total approximately 2.1 MB; the architectural reference is loaded when its gallery opens. See IMAGE-PROMPTS.md for the built-in GPT generation prompts. Raw originals are kept privately and excluded from the public repository.

The office directory provides eight departments and eight platforms. Cards show real membership, unassigned capacity and task load. Each workspace has a separate saved room, scene accent and furnishing plan. Data cabinets, idea boards and acoustic pods complement the original editable catalog. Smaller studios include collaboration seating. Three.js figures have varied stature/build, face proportions, eye colors, hairstyles (including long, braid, ponytail, pixie and hijab), wardrobe and accessories. Reference portraits remain static and are labeled as such; they are not claimed to mirror every live edit or to be fully rigged generated 3D assets.

## Image-derived assets — 12 November 2026

The reference studio uses four individual full-body image-to-3D models. Ananya and Arjun are rigged; Meera and Kavya retain A-pose geometry pending rigging. Furniture imports cover the sculpted oak/brass desk, upholstered chair and curved sofa. Remaining architecture/props and 124 figures retain procedural geometry. No EA game assets were used. Official agency emblem/wordmark are separate from generated meshes. The eight revised casting atlases have 12 women followed by four men; the obsolete first-sheet interleaving is no longer applied. Model resource ownership and fixed-catalog loading live in imported-models.js. See IMAGE-TO-3D.md for accurate customization and free-plan limitations.
