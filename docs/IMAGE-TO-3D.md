# Image-to-3D workflow

Updated 12 November 2026. The account is on Meshy's free web plan; no paid subscription, payment method or API credential was configured. Meshy's API requires a paid plan. This integration therefore imports reviewed GLB exports; it does not call the paid API or automate authenticated scraping.

Official references: https://help.meshy.ai/en/articles/15696428-what-is-included-on-the-free-plan and https://www.meshy.ai/api . Free usage has credit/download limits and CC BY 4.0 attribution requirements. The interface enforced a subscription for new auto-rigging on 12 November. Recheck vendor terms rather than assuming features stay free.

## Current assets

The reference studio shows the four existing data-research seats: Ananya Shah, Meera Nair, Kavya Park and Arjun Bennett. All four have unique image-derived geometry and embedded textures. Ananya and Arjun have Mixamo-compatible skeletons. Ananya supplies the walking rotation clip shared with Arjun's matching skeleton, preserving his own proportions. Meera and Kavya are currently unrigged A-pose models: they can be selected, positioned, assigned and moved, but have no articulated walking animation. The UI labels this limitation. Their rigging was stopped at the subscription gate.

Desk, chair and sofa are also actual image-derived textured models, used throughout the office. Architectural shell, monitor/desk props and other furnishings remain original procedural geometry. The other 124 seats retain procedural playable figures and unique reference portraits. This is a seven-asset pilot, not 128 completed image-derived characters or a finished life-simulation game. Outfit/hair variants for imported characters require new modeled assets; the UI does not pretend color sliders rebuild their texture/geometry.

## Add a reviewed export

1. Generate a clean full-body character or isolated furniture reference. Preserve stable employee IDs and official brand assets. Do not upload prospect records or private source data.
2. Use the vendor web interface within its available free allowance. Download a self-contained textured GLB. Rigging/animation is optional and must be honestly recorded. Do not subscribe or enable API access without separate authorization.
3. Save the raw export under ignored `.private/model-assets/`. Optimize locally, for example `node scripts/optimize-model.mjs .private/model-assets/character.glb public/office/models/character-v1.glb .65`. Furniture can use a lower simplification ratio after visual review. The script preserves embedded textures, uses WebP and Meshopt, and rejects output outside the reviewed public model folder.
4. Register the fixed local URL and rigging status in `src/office/model-catalog.js`. Add the reference image and credits. Never take a model URL from a task, fetched page or prospect field.
5. Run tests/build, inspect desktop/mobile browser rendering, movement, furniture fit and console errors, then deploy and verify the actual production CSP and model responses.

The model pool clones skeletons, reuses immutable geometry/materials/textures and releases resources on room disposal. Assets are fetched only from the same-origin fixed catalog. CSP allows blob URLs narrowly for GLB embedded texture decoding; it grants no external model hosts. Models remain public fictional presentation assets, while company data stays behind authenticated APIs.
