import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { RoundedBoxGeometry } from "three/addons/geometries/RoundedBoxGeometry.js";
import { deskPosition, employeeStyle, boundedPosition } from "./config";
import { obstaclesFor, canStand, findPath } from "./navigation";
import {acquireModel,fitModel,inPlace} from "./imported-models";
import {CHARACTER_MODELS,FURNITURE_MODELS} from "./model-catalog";

// Original interactive office with reviewed local image-derived assets and procedural fallbacks.
export function createOfficeEngine(
  host,
  {
    employees,
    config,
    selectedId,
    onSelect,
    onMove,
    onObjectSelect,
    onPlace,
    mode,
    tool,
    playing,
  },
) {
  const scene = new THREE.Scene(),
    clock = new THREE.Clock();
  let disposed = false,
    raf,
    selection = selectedId,
    followId = null,
    simPlaying = playing,
    activeMode = mode,
    activeTool = tool,
    moveTarget = null,
    pointerStart = null;
  const renderer = new THREE.WebGLRenderer({
    antialias: true,
    alpha: false,
    powerPreference: "high-performance",
  });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 1.6));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.15;
  host.appendChild(renderer.domElement);
  renderer.domElement.setAttribute(
    "aria-label",
    "Interactive 3D sales office. Select a character or click the floor to move. Drag to orbit, scroll to zoom.",
  );
  renderer.domElement.setAttribute("tabindex", "0");
  const camera = new THREE.PerspectiveCamera(38, 1, 0.1, 200);
  camera.position.set(34, 31, 40);
  const controls = new OrbitControls(camera, renderer.domElement);
  controls.target.set(0, 0, 0);
  controls.enableDamping = true;
  controls.dampingFactor = 0.08;
  controls.minDistance = 3.5;
  controls.maxDistance = 78;
  controls.maxPolarAngle = Math.PI / 2.15;
  controls.minPolarAngle = 0.2;
  controls.maxTargetRadius = 30;
  controls.mouseButtons = {
    LEFT: THREE.MOUSE.ROTATE,
    MIDDLE: THREE.MOUSE.DOLLY,
    RIGHT: THREE.MOUSE.PAN,
  };
  controls.touches = { ONE: THREE.TOUCH.ROTATE, TWO: THREE.TOUCH.DOLLY_PAN };
  const night = config.lighting === "night",
    sunset = config.lighting === "sunset";
  scene.background = new THREE.Color(
    night ? "#19212c" : sunset ? "#dac5b3" : "#c7d3d8",
  );
  scene.fog = new THREE.Fog(scene.background, 70, 150);
  scene.add(
    new THREE.HemisphereLight(
      night ? "#92a9c7" : "#f8f1e5",
      "#8b887d",
      night ? 1.3 : 2.1,
    ),
  );
  const sun = new THREE.DirectionalLight(
    sunset ? "#ffd0a1" : "#fff6e7",
    night ? 0.4 : 3.2,
  );
  sun.position.set(-15, 30, 16);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  sun.shadow.camera.left = -28;
  sun.shadow.camera.right = 28;
  sun.shadow.camera.top = 25;
  sun.shadow.camera.bottom = -25;
  sun.shadow.normalBias = 0.025;
  sun.shadow.bias = -0.00008;
  sun.shadow.camera.far = 80;
  scene.add(sun);
  const fill = new THREE.DirectionalLight("#bdc9dd", 1.3);
  fill.position.set(15, 10, -15);
  scene.add(fill);
  const materials = new Map(),
    geometry = new Map(),
    textures = [], assetLeases=[];
  const mat = (color, metalness = 0, roughness = 0.65) => {
    const key = color + "|" + metalness + "|" + roughness;
    if (!materials.has(key))
      materials.set(
        key,
        new THREE.MeshStandardMaterial({ color, metalness, roughness }),
      );
    return materials.get(key);
  };
  function box(w, h, d, color, x = 0, y = 0, z = 0, parent = scene, r = 0.04) {
    const key = [w, h, d, r].join(",");
    if (!geometry.has(key))
      geometry.set(
        key,
        r
          ? new RoundedBoxGeometry(w, h, d, 2, Math.min(r, w / 3, h / 3, d / 3))
          : new THREE.BoxGeometry(w, h, d),
      );
    const mesh = new THREE.Mesh(geometry.get(key), mat(color));
    mesh.position.set(x, y, z);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    parent.add(mesh);
    return mesh;
  }
  function sphere(
    radius,
    color,
    x,
    y,
    z,
    parent = scene,
    sx = 1,
    sy = 1,
    sz = 1,
  ) {
    const key = "sphere" + radius;
    if (!geometry.has(key))
      geometry.set(key, new THREE.SphereGeometry(radius, 16, 12));
    const mesh = new THREE.Mesh(geometry.get(key), mat(color));
    mesh.position.set(x, y, z);
    mesh.scale.set(sx, sy, sz);
    mesh.castShadow = true;
    parent.add(mesh);
    return mesh;
  }
  function cylinder(rt, rb, height, color, x, y, z, parent = scene) {
    const key = ["cyl", rt, rb, height].join();
    if (!geometry.has(key))
      geometry.set(key, new THREE.CylinderGeometry(rt, rb, height, 16));
    const mesh = new THREE.Mesh(geometry.get(key), mat(color));
    mesh.position.set(x, y, z);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    parent.add(mesh);
    return mesh;
  }
  function textPlane(
    text,
    width,
    height,
    color = "#d6b779",
    background = "transparent",
    font = "500 110px Georgia",
  ) {
    const canvas = document.createElement("canvas");
    canvas.width = 1024;
    canvas.height = 256;
    const ctx = canvas.getContext("2d");
    const texture = new THREE.CanvasTexture(canvas);
    const draw=()=>{
      ctx.clearRect(0,0,1024,256);
      if(background!=="transparent"){ctx.fillStyle=background;ctx.fillRect(0,0,1024,256);}
      ctx.fillStyle=color;ctx.textAlign="center";ctx.textBaseline="middle";ctx.font=font;
      ctx.fillText(text,512,128,970);texture.needsUpdate=true;
    };
    draw();document.fonts.load(font).then(()=>{if(!disposed)draw();});
    texture.colorSpace = THREE.SRGBColorSpace;
    textures.push(texture);
    const material = new THREE.MeshBasicMaterial({
      map: texture,
      transparent: true,
      side: THREE.DoubleSide,
      depthWrite: false,
    });
    const mesh = new THREE.Mesh(
      new THREE.PlaneGeometry(width, height),
      material,
    );
    scene.add(mesh);
    return mesh;
  }
  const wallColor =
    { ivory: "#e7e1d4", charcoal: "#34373b", sage: "#a8b2a3" }[config.wall] ||
    "#e7e1d4";
  const floorColor =
    { oak: "#ae9274", marble: "#d4d1c7", slate: "#555c62" }[config.floor] ||
    "#ae9274";
  box(36, 0.55, 27, "#4d4a43", 0, -0.34, 0, scene, 0.1);
  box(35.8, 0.12, 26.8, floorColor, 0, -0.02, 0, scene, 0.02);
  // Plank joints and perimeter brass inlay anchor the architectural scale.
  for (let x = -17.5; x < 18; x += 0.9) {
    const line = box(
      0.018,
      0.012,
      26.6,
      config.floor === "marble" ? "#a7a7a0" : "#8d7861",
      x,
      0.05,
      0,
      scene,
      0,
    );
    line.castShadow = false;
    for (let z = -12; z < 13; z += 4.5)
      box(
        0.87,
        0.012,
        0.012,
        "#93816a",
        x + 0.44,
        0.052,
        z + (Math.round(x) % 2 ? 1.7 : 0),
        scene,
        0,
      ).castShadow = false;
  }
  box(35.8, 0.025, 0.07, "#c9a86a", 0, 0.06, 12.8);
  box(0.07, 0.025, 25.6, "#c9a86a", 17.5, 0.06, 0);
  box(36, 5, 0.28, wallColor, 0, 2.45, -13.2);
  box(0.28, 5, 26.4, wallColor, -17.9, 2.45, 0);
  box(36, 0.13, 0.16, "#b5965b", 0, 0.22, -13);
  box(0.13, 0.13, 26, "#b5965b", -17.7, 0.22, 0);
  // Tall glazed curtain wall, skyline and recessed light rails.
  const glass = new THREE.MeshPhysicalMaterial({
    color: "#c3d8de",
    metalness: 0.1,
    roughness: 0.05,
    transparent: true,
    opacity: 0.18,
    side: THREE.DoubleSide,
  });
  materials.set("glass", glass);
  for (let x = -15; x < 18; x += 4) {
    const pane = new THREE.Mesh(new THREE.BoxGeometry(3.8, 4, 0.07), glass);
    pane.position.set(x, 2.7, -12.95);
    scene.add(pane);
    box(0.06, 4.8, 0.1, "#3b4244", x - 1.95, 2.6, -12.8);
    box(3.8, 0.06, 0.1, "#3b4244", x, 1, -12.8);
  }
  for (let i = 0; i < 25; i++) {
    const height = 2 + ((i * 7) % 11),
      x = -35 + i * 3;
    const building = box(
      2.1,
      height,
      2.1,
      night ? "#303d50" : "#9cadb7",
      x,
      height / 2 - 4,
      -22 - (i % 4) * 3,
      scene,
      0,
    );
    building.castShadow = false;
    if (night)
      for (let y = -2; y < height - 4; y += 1)
        box(1.4, 0.12, 0.02, "#b9a66f", x, y, -20.94 - (i % 4) * 3, scene, 0);
  }
  for (let x = -12; x <= 12; x += 8) {
    box(5, 0.05, 0.1, "#d8c69d", x, 4.9, -12.7);
    const lamp = new THREE.PointLight("#ffe4ad", night ? 18 : 3, 12, 2);
    lamp.position.set(x, 4, -11);
    scene.add(lamp);
  }
  const wordmark = textPlane("Trayaam", 7, 1.5, "#9b793b", "transparent", "600 110px Cormorant Garamond");
  wordmark.position.set(-17.69, 3.2, -5);
  wordmark.rotation.y = Math.PI / 2;
  const slogan = textPlane("YOUR BRAND. OUR DELIVERY.", 5.7, 0.5, "#6d6b64");
  slogan.position.set(-17.65, 1.8, -5);
  slogan.rotation.y = Math.PI / 2;
  const logoTexture = new THREE.TextureLoader().load(
    "/brand/trayaam-emblem.webp",
  );
  logoTexture.colorSpace = THREE.SRGBColorSpace;
  textures.push(logoTexture);
  const emblem = new THREE.Mesh(
    new THREE.PlaneGeometry(1.6, 1.9),
    new THREE.MeshBasicMaterial({
      map: logoTexture,
      transparent: true,
      side: THREE.DoubleSide,
      depthWrite: false,
    }),
  );
  emblem.position.set(-17.66, 3.1, 0);
  emblem.rotation.y = Math.PI / 2;
  scene.add(emblem);
  // Official self-hosted emblem and typographic wordmark remain separate from generated meshes.
  const backplate=box(12,2.1,.09,"#252726",0,4,-12.61,scene,.08);
  const backEmblem=emblem.clone();backEmblem.position.set(-4.3,4,-12.5);backEmblem.rotation.y=0;backEmblem.scale.setScalar(.8);scene.add(backEmblem);
  const backWordmark=textPlane("Trayaam",6,1.3,"#c9a86a","transparent","600 110px Cormorant Garamond");backWordmark.position.set(.4,4,-12.48);
  const roomAccent=config.room?.accent || "#a5a69c";
  const roomKind=config.room?.kind || "lab";
  // Layered textiles and low architectural elements define each department.
  const rugColor='#'+new THREE.Color(roomAccent).lerp(new THREE.Color('#d4cebf'),.55).getHexString();
  box(25, 0.025, employees.length<=8?12:18, rugColor, -3, 0.07, employees.length<=8?-4:-1.5, scene, 0.15);
  for(let i=0;i<9;i++) {
    box(.12,3.7,.16,"#c6af84",-17.61,2.1,2+i*.65);
  }
  if(roomKind==='operations'||roomKind==='lab') {
    for(let i=0;i<4;i++) {
      box(3.8,1.8,.1,'#26363e',-10+i*4.5,3,-12.6);
      for(let j=0;j<4;j++) box(.45,.15+j*.13,.03,roomAccent,-11.2+i*4.5+j*.6,2.75+j*.065,-12.52);
    }
  }
  const roomSign=textPlane(config.room?.name || "THE DISCOVERY LAB",10,1,"#6a5840");
  roomSign.position.set(-2,2.55,-12.63);
  // Suspended linear pendants above the work zones, kept high enough for clear sightlines.
  for(const x of [-10,2]) {
    box(6,.12,.35,"#514c42",x,5.5,-3);
    box(5.8,.025,.25,"#f1d8aa",x,5.42,-3);
    for(const dx of [-2.2,2.2]) cylinder(.012,.012,1.1,"#bca36f",x+dx,6,-3);
  }
  for (let x = -15; x < 10; x += 0.3)
    box(0.015, 0.01, 17.6, "#aaa99e", x, 0.09, -1.5, scene, 0).castShadow =
      false;
  function installFurniture(parent,entry,fallback,fit,rotation=0) {
    if(!entry)return;
    const lease=acquireModel(entry.url);assetLeases.push(lease);
    lease.ready.then(({scene:asset})=>{
      if(disposed)return;
      const furniture=fitModel(asset,fit);furniture.rotation.y=rotation;
      fallback.visible=false;parent.add(furniture);
      let ancestor=parent;while(ancestor&&!ancestor.userData.objectId)ancestor=ancestor.parent;
      const objectId=ancestor?.userData.objectId;
      if(objectId)asset.traverse(o=>{if(o.isMesh){o.userData.objectId=objectId;pickables.push(o);}});
    }).catch(e=>console.error('Furniture model could not load:',e.message));
  }
  function desk(x, z, parent = scene, color = "#bca080") {
    const g = new THREE.Group();
    parent.add(g);
    g.position.set(x, 0, z);
    const shell=new THREE.Group();g.add(shell);
    box(3.6, 0.16, 1.75, color, 0, 1.35, 0, shell, 0.08);
    box(3.3, 0.06, 1.4, "#55595a", 0, 1.23, 0, shell);
    for (const xx of [-1.5, 1.5]) {
      box(0.07, 1.24, 0.9, "#414747", xx, 0.62, 0, shell);
      box(0.6, 0.07, 1.3, "#414747", xx, 0.08, 0, shell);
    }
    box(1.45, 0.85, 0.08, "#272e31", -0.12, 2.02, -0.36, g, 0.06);
    const screen = box(
      1.34,
      0.73,
      0.015,
      night ? "#537a8e" : "#8ba7a8",
      -0.12,
      2.02,
      -0.307,
      g,
      0.01,
    );
    screen.material = new THREE.MeshStandardMaterial({
      color: "#5b828a",
      emissive: "#608c99",
      emissiveIntensity: 0.35,
    });
    materials.set("screen" + x + z, screen.material);
    for (let i = 0; i < 5; i++)
      box(
        0.8 - i * 0.1,
        0.025,
        0.02,
        i % 2 ? "#c4b386" : "#b3c9c5",
        -0.22,
        2.24 - i * 0.095,
        -0.292,
        g,
        0,
      );
    cylinder(0.06, 0.08, 0.35, "#434c50", -0.12, 1.6, -0.36, g);
    box(0.6, 0.04, 0.3, "#434c50", -0.12, 1.46, -0.25, g);
    box(1.05, 0.035, 0.36, "#394346", -0.12, 1.47, 0.4, g, 0.02);
    box(0.2, 0.04, 0.3, "#343f42", 0.65, 1.48, 0.4, g);
    cylinder(0.12, 0.1, 0.2, "#ddd5c4", 1.25, 1.54, 0.4, g);
    cylinder(0.08, 0.08, 0.012, "#5a3c27", 1.25, 1.65, 0.4, g);
    box(0.4, 0.03, 0.55, "#d9d4c6", -1.26, 1.48, 0.25, g);
    box(0.18, 0.025, 0.33, "#282e31", -1.2, 1.51, 0.28, g);
    chair(0, 1.5, g);
    installFurniture(g,FURNITURE_MODELS.desk,shell,{width:3.6});
    return g;
  }
  function chair(x, z, parent) {
    const g = new THREE.Group();
    g.position.set(x, 0, z);
    parent.add(g);
    const shell=new THREE.Group();g.add(shell);
    cylinder(0.06, 0.09, 0.65, "#606965", 0, 0.4, 0, shell);
    for (let i = 0; i < 5; i++) {
      const leg = box(0.07, 0.05, 0.7, "#525c59", 0, 0.1, 0, shell);
      leg.rotation.y = (i * Math.PI) / 2.5;
    }
    box(0.85, 0.18, 0.85, "#68766f", 0, 0.85, 0, shell, 0.12);
    box(0.85, 1, 0.17, "#718078", 0, 1.35, 0.38, shell, 0.12);
    for (const side of [-0.48, 0.48])
      box(0.09, 0.1, 0.6, "#596760", side, 1.1, 0, shell);
    installFurniture(g,FURNITURE_MODELS.chair,shell,{height:1.85},Math.PI);
    return g;
  }
  const obstacles = obstaclesFor(employees, config.objects || [], deskPosition);
  const avatars = new Map(),
    pickables = [],
    objectGroups = new Map();
  function avatar(employee, index) {
    const style = {
      ...employeeStyle(employee.id),
      ...config.employees?.[employee.id],
    };
    const root = new THREE.Group();
    root.userData.employeeId = employee.id;
    const body = new THREE.Group();
    root.add(body);
    const identityIndex=employee.portrait;
    const female=employee.gender === "woman";
    const build=.88+(identityIndex%5)*.055;
    const stature=.91+(Math.floor(identityIndex/5)%6)*.035;
    root.scale.set(build,stature,build);
    body.position.y = 0.01;
    // Tapered jacket, collar, buttons and articulated limbs.
    const torso = box(female ? .54 : .64, 0.76, 0.33, style.outfit, 0, 1.17, 0, body, 0.16);
    if(style.wardrobe === "dress") {
      const skirt = cylinder(.24,.39,.62,style.outfit,0,.77,0,body);
      skirt.scale.z=.8;
    }
    if(style.wardrobe === "blazer") {
      for(const side of [-1,1]) {
        const lapel=box(.12,.4,.035,"#d5cabb",side*.11,1.42,.18,body,.01);
        lapel.rotation.z=side*.2;
      }
    }
    if(style.wardrobe === "knit") for(let y=1;y<1.48;y+=.055) box(.48,.008,.015,style.hair,0,y,.171,body,0);
    if(style.wardrobe === "shirt") box(.025,.62,.025,"#eee8da",0,1.18,.18,body,.003);
    sphere(0.22, style.outfit, -0.31, 1.44, 0, body, 0.55, 1, 0.7);
    sphere(0.22, style.outfit, 0.31, 1.44, 0, body, 0.55, 1, 0.7);
    box(0.11, 0.37, 0.035, "#e8e2d6", 0, 1.4, 0.175, body, 0.01);
    box(0.035, 0.27, 0.025, "#a18a55", 0, 1.4, 0.2, body, 0.005);
    for (let i = 0; i < 3; i++)
      sphere(0.017, "#b9a373", 0.09, 1.15 + i * 0.1, 0.182, body);
    const faceWidth=.83+(identityIndex%4)*.055;
    const faceLength=1.02+(Math.floor(identityIndex/4)%4)*.065;
    const head = sphere(0.23, style.skin, 0, 1.91, 0, body, faceWidth, faceLength, 0.86);
    // Cheek and chin profiles vary independently across the cast.
    sphere(.14,style.skin,0,1.79,.035,body,.85+(identityIndex%3)*.1,.5,.84);
    cylinder(0.09, 0.09, 0.18, style.skin, 0, 1.65, 0, body);
    sphere(0.05, style.skin, -0.21, 1.91, 0, body, 0.5, 1, 0.7);
    sphere(0.05, style.skin, 0.21, 1.91, 0, body, 0.5, 1, 0.7);
    sphere(0.045, style.skin, 0, 1.91, 0.19, body, 0.6, 0.9, 1);
    const eyeSpacing=.071+(identityIndex%4)*.006;
    for (const x of [-eyeSpacing, eyeSpacing]) {
      sphere(0.034, "#f0ece1", x, 1.95, 0.18, body, 1, 0.7, 0.35);
      sphere(0.019, ["#302b25","#5a6c58","#526775","#786149"][identityIndex%4], x, 1.95, 0.193, body, 0.8, 1, 0.5);
      sphere(.006,"#ffffff",x-.004,1.959,.202,body);
      box(0.07, 0.019, 0.015, style.hair, x, 2.02, 0.18, body, 0.008);
    }
    box(0.08, 0.012, 0.015, "#9d6e5c", 0, 1.8, 0.18, body, 0.004);
    if (style.hairStyle !== "bald") {
      sphere(0.235, style.hair, 0, 2.075, -0.02, body, 0.94, 0.55, 0.89);
      if (style.hairStyle === "pixie") {
        const sweep=sphere(.2,style.hair,.06,2.1,.04,body,.95,.4,.9);sweep.rotation.z=.22;
      }
      if (["long","ponytail","braid"].includes(style.hairStyle)) {
        if(style.hairStyle==='long') {
          for(const x of [-.2,.2])sphere(.18,style.hair,x,1.86,-.09,body,.52,2.1,.85);
          sphere(.24,style.hair,0,1.87,-.15,body,1.05,1.7,.45);
        } else if(style.hairStyle==='ponytail') {
          sphere(.16,style.hair,.04,1.94,-.27,body,.7,1.9,.7);
          sphere(.09,'#c9a86a',.02,2.1,-.24,body,1,.3,1);
        } else for(let i=0;i<6;i++)sphere(.085,style.hair,Math.sin(i*2)*.025,2.06-i*.085,-.26,body,.9,1,.7);
      }
      if(style.hairStyle==='hijab') {
        sphere(.27,style.outfit,0,2.04,-.06,body,1.05,.83,1);
        for(const x of [-.23,.23])sphere(.12,style.outfit,x,1.9,-.02,body,.7,1.8,.75);
        sphere(.25,style.outfit,0,1.62,-.1,body,1.15,.5,.8);
      }
      if (style.hairStyle === "bob")
        box(0.43, 0.36, 0.27, style.hair, 0, 1.99, -0.12, body, 0.12);
      if (style.hairStyle === "bun")
        sphere(0.13, style.hair, 0, 2.16, -0.14, body);
      if (style.hairStyle === "curly")
        for (let i = 0; i < 9; i++)
          sphere(
            0.095,
            style.hair,
            Math.cos(i * 2.4) * 0.17,
            2.08 + Math.sin(i) * 0.04,
            Math.sin(i * 2.4) * 0.15,
            body,
          );
    }
    if (style.accessory === "glasses")
      for (const x of [-0.08, 0.08]) {
        const lens = new THREE.Mesh(
          new THREE.TorusGeometry(0.061, 0.009, 5, 16),
          mat("#51483f"),
        );
        lens.position.set(x, 1.95, 0.203);
        body.add(lens);
      }
    if(style.accessory==='earrings') for(const x of [-.23,.23]) {
      const hoop=new THREE.Mesh(new THREE.TorusGeometry(.045,.009,5,14),mat('#c9a86a',.7));
      hoop.position.set(x,1.82,.01);body.add(hoop);
    }
    if(style.accessory==='headset') {
      for(const x of [-.25,.25])sphere(.075,'#363c42',x,1.94,0,body,.5,1,.8);
      const band=new THREE.Mesh(new THREE.TorusGeometry(.26,.015,5,20,Math.PI),mat('#363c42'));
      band.position.set(0,1.96,0);body.add(band);
      box(.15,.014,.014,'#363c42',.18,1.82,.18,body,.003);
    }
    if(!female && identityIndex%3!==0) sphere(.17,style.hair,0,1.79,.08,body,.95,.46,.7);
    const arms = [],
      legs = [];
    for (const side of [-1, 1]) {
      const arm = new THREE.Group();
      arm.position.set(side * 0.36, 1.45, 0);
      body.add(arm);
      cylinder(0.085, 0.075, 0.48, style.outfit, 0, -0.22, 0, arm);
      cylinder(0.065, 0.06, 0.33, style.skin, 0, -0.58, 0, arm);
      sphere(0.076, style.skin, 0, -0.77, 0, arm, 0.8, 1.2, 0.7);
      arms.push(arm);
      const leg = new THREE.Group();
      leg.position.set(side * 0.17, 0.8, 0);
      body.add(leg);
      cylinder(0.115, 0.09, 0.65, "#3b4246", 0, -0.29, 0, leg);
      box(0.21, 0.16, 0.4, "#363334", 0, -0.68, 0.08, leg, 0.065);
      legs.push(leg);
    }
    const assignedDesk = config.objects.find(
      (o) => o.id === `workstation-${index + 1}`,
    );
    const station = assignedDesk || deskPosition(index);
    const pos = config.positions?.[employee.id] || {
      x: station.x - Math.sin(assignedDesk?.rotation || 0) * (CHARACTER_MODELS[employee.id]?3.3:2.05),
      z: station.z + Math.cos(assignedDesk?.rotation || 0) * (CHARACTER_MODELS[employee.id]?3.3:2.05),
    };
    root.position.set(pos.x, 0.1, pos.z);
    root.rotation.y = Math.PI;
    scene.add(root);
    root.traverse((o) => {
      if (o.isMesh) {
        o.userData.employeeId = employee.id;
        pickables.push(o);
      }
    });
    avatars.set(employee.id, {
      root,
      body,
      arms,
      legs,
      target: null,
      phase: index * 0.6,
    });
    const catalog=CHARACTER_MODELS[employee.id];
    if(catalog) {
      const lease=acquireModel(catalog.url);assetLeases.push(lease);
      const motionLease=catalog.motion?acquireModel(catalog.motion):null;
      if(motionLease)assetLeases.push(motionLease);
      Promise.all([lease.ready,motionLease?.ready]).then(([{scene:asset,animations},motion])=>{
        if(disposed)return;
        const figure=fitModel(asset,{height:catalog.height});
        const actor=avatars.get(employee.id);
        actor.body.visible=false;root.scale.set(1,1,1);root.add(figure);
        asset.traverse(o=>{if(o.isMesh){o.userData.employeeId=employee.id;pickables.push(o);}});
        // Matching Mixamo skeletons share rotations; keep each character's own bone lengths and root height.
        const clips=(motion?motion.animations.map(c=>new THREE.AnimationClip('Walking',c.duration,c.tracks.filter(t=>t.name.endsWith('.quaternion')).map(t=>t.clone()))):animations).map(inPlace), mixer=new THREE.AnimationMixer(asset);
        const idle=clips.find(c=>/idle|stand|breath/i.test(c.name));
        const walk=clips.find(c=>/walking_woman|walking woman/i.test(c.name)) || clips.find(c=>/walk|running/i.test(c.name));
        actor.model={mixer,root:asset,idle:idle?mixer.clipAction(idle):null,walk:walk?mixer.clipAction(walk):null,state:null};
        // A walking clip's first frame is also a safe neutral pose if no idle was exported.
        if(!idle&&walk){actor.model.walk.play();actor.model.walk.paused=true;mixer.update(0);}
      }).catch(e=>console.error('Character model could not load:',e.message));
    }
  }
  employees.forEach((e, i) => {
    avatar(e, i);
  });
  // Department-specific furniture is modeled from the room's saved catalog.
  function furniture(obj) {
    const group = new THREE.Group();
    group.position.set(obj.x, 0, obj.z);
    group.rotation.y = obj.rotation || 0;
    group.userData.objectId = obj.id;
    scene.add(group);
    const color = obj.color || "#a58a67";
    if (obj.type === "desk") desk(0, 0, group, color);
    if(obj.type==='booth') {
      box(3.2,3.6,.18,color,0,1.8,-1.5,group,.1);
      for(let i=0;i<10;i++)box(.05,3.2,.05,'#bda882',-1.3+i*.29,1.85,-1.38,group,.01);
      for(const x of [-1.5,1.5])box(.16,3.6,3,color,x,1.8,0,group,.06);
      box(3.2,.15,3,color,0,3.55,0,group,.04);
      box(2.7,.12,.8,'#c5b49b',0,1.3,-.7,group,.12);
      box(.8,.65,.06,'#2c404b',0,1.7,-1.05,group,.04);
      box(2.6,.025,.1,'#edd6aa',0,3.4,-.8,group,.01);
      chair(0,.6,group);
    }
    if(obj.type==='whiteboard') {
      box(3.8,2.1,.12,color,0,2.4,0,group,.08);
      for(const x of [-1.65,1.65])cylinder(.035,.035,2.4,'#b09a70',x,1.2,0,group);
      for(let i=0;i<9;i++)box(.42,.31,.025,['#d3b68b','#a9b9aa','#bc9bad'][i%3],-1.3+(i%3)*.65,2.9-Math.floor(i/3)*.48,.08,group,.015);
    }
    if(obj.type==='server') {
      box(2.8,3.3,1.1,color,0,1.7,0,group,.1);
      for(let i=0;i<6;i++) {
        box(2.5,.36,.04,'#263338',0,.45+i*.49,.57,group,.03);
        for(let j=0;j<3;j++)sphere(.025,j===0?'#91baaa':'#d8b575',.85+j*.12,.45+i*.49,.61,group);
      }
    }
    if (obj.type === "plant") {
      cylinder(0.38, 0.29, 0.7, "#d5cbbb", 0, 0.4, 0, group);
      cylinder(0.26, 0.26, 0.03, "#4a3a28", 0, 0.77, 0, group);
      for (let i = 0; i < 9; i++) {
        const a = i * 2.4;
        const stem = cylinder(
          0.018,
          0.022,
          1.6,
          color,
          Math.cos(a) * 0.15,
          1.45,
          Math.sin(a) * 0.15,
          group,
        );
        stem.rotation.z = Math.sin(a) * 0.25;
        const leaf = sphere(
          0.42,
          color,
          Math.cos(a) * 0.4,
          1.5 + (i % 3) * 0.4,
          Math.sin(a) * 0.4,
          group,
          0.35,
          1.15,
          0.55,
        );
        leaf.rotation.z = Math.cos(a) * 0.7;
      }
    }
    if (obj.type === "sofa") {
      const sofaShell=new THREE.Group();group.add(sofaShell);
      box(3.5, 0.55, 1.4, color, 0, 0.65, 0, sofaShell, 0.2);
      box(3.5, 0.9, 0.32, color, 0, 1.12, -0.6, sofaShell, 0.15);
      for (const x of [-1.65, 1.65]) {
        box(0.3, 0.7, 1.5, color, x, 0.9, 0, sofaShell, 0.12);
        box(0.13, 0.3, 0.13, "#ad935e", x, 0.2, 0.5, sofaShell);
      }
      for (const x of [-1.05, 0, 1.05]) {
        box(0.98, 0.22, 1.1, color, x, 1, 0, sofaShell, 0.12);
        box(0.64, 0.55, 0.18, "#d9bc7d", x, 1.4, -0.38, sofaShell, 0.1);
      }
      installFurniture(group,FURNITURE_MODELS.sofa,sofaShell,{width:3.5});
    }
    if (obj.type === "table") {
      const boardroom = obj.id === "table-board";
      if(boardroom) for(let i=0;i<3;i++) {const left=chair(-1.8,-2.3+i*2.3,group);left.rotation.y=Math.PI/2;const right=chair(1.8,-2.3+i*2.3,group);right.rotation.y=-Math.PI/2;}
      const w = boardroom ? 2.2 : 2.1,
        d = boardroom ? 7.5 : 1.2;
      box(w, 0.16, d, color, 0, boardroom ? 1.35 : 0.65, 0, group, 0.25);
      for (const x of [-w * 0.35, w * 0.35])
        for (const z of [-d * 0.35, d * 0.35])
          cylinder(
            0.06,
            0.08,
            boardroom ? 1.25 : 0.58,
            "#a98e5b",
            x,
            boardroom ? 0.68 : 0.32,
            z,
            group,
          );
      box(0.4, 0.02, 0.6, "#d9d6cb", 0, boardroom ? 1.45 : 0.76, 0, group);
    }
    if (obj.type === "lamp") {
      cylinder(0.42, 0.42, 0.07, "#9b855e", 0, 0.08, 0, group);
      cylinder(0.035, 0.035, 3, color, 0, 1.55, 0, group);
      cylinder(0.43, 0.7, 0.65, "#ece0bb", 0, 3.05, 0, group);
      const light = new THREE.PointLight("#ffce88", night ? 10 : 1.5, 7, 2);
      light.position.set(0, 2.8, 0);
      group.add(light);
    }
    if (obj.type === "bookshelf") {
      box(3.3, 3.2, 0.6, color, 0, 1.65, 0, group);
      for (let level = 0; level < 4; level++) {
        box(3.2, 0.07, 0.7, "#c3aa81", 0, 0.5 + level * 0.8, 0.02, group);
        for (let j = 0; j < 9; j++)
          box(
            0.12 + (j % 3) * 0.05,
            0.35 + (j % 4) * 0.08,
            0.29,
            ["#d5c6a3", "#697c73", "#72595b", "#344d59"][j % 4],
            -1.35 + j * 0.31,
            0.73 + level * 0.8,
            0.24,
            group,
          );
      }
    }
    if (obj.type === "partition") {
      box(0.12, 2.5, 4, color, 0, 1.3, 0, group);
      box(0.25, 0.12, 4.2, "#baa16c", 0, 2.6, 0, group);
    }
    if (obj.type === "art") {
      box(2, 0.1, 1.3, color, 0, 0.14, 0, group);
      const sculpture = new THREE.Mesh(
        new THREE.TorusKnotGeometry(0.55, 0.13, 64, 8),
        mat("#c9a86a", 0.7, 0.22),
      );
      sculpture.position.y = 1.1;
      group.add(sculpture);
    }
    group.traverse((o) => {
      if (o.isMesh) {
        o.userData.objectId = obj.id;
        pickables.push(o);
      }
    });
    objectGroups.set(obj.id, group);
  }
  (config.objects || []).forEach(furniture);
  const marker = new THREE.Mesh(
    new THREE.OctahedronGeometry(0.2, 0),
    new THREE.MeshStandardMaterial({
      color: "#e2bb70",
      emissive: "#ad7c2b",
      emissiveIntensity: 0.35,
      metalness: 0.6,
      roughness: 0.3,
    }),
  );
  scene.add(marker);
  const ring = new THREE.Mesh(
    new THREE.RingGeometry(0.45, 0.51, 48),
    new THREE.MeshBasicMaterial({
      color: "#d9b679",
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.9,
    }),
  );
  ring.rotation.x = -Math.PI / 2;
  scene.add(ring);
  const targetRing = new THREE.Mesh(
    new THREE.RingGeometry(0.28, 0.33, 32),
    new THREE.MeshBasicMaterial({ color: "#c9a86a", side: THREE.DoubleSide }),
  );
  targetRing.rotation.x = -Math.PI / 2;
  targetRing.visible = false;
  scene.add(targetRing);
  const raycaster = new THREE.Raycaster(),
    pointer = new THREE.Vector2(),
    ground = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0),
    keys = new Set();
  function click(e) {
    if (
      !pointerStart ||
      Math.hypot(e.clientX - pointerStart[0], e.clientY - pointerStart[1]) > 5
    )
      return;
    const rect = renderer.domElement.getBoundingClientRect();
    pointer.set(
      ((e.clientX - rect.left) / rect.width) * 2 - 1,
      (-(e.clientY - rect.top) / rect.height) * 2 + 1,
    );
    raycaster.setFromCamera(pointer, camera);
    const hits = raycaster.intersectObjects(pickables, false);
    const hit = hits[0]?.object;
    if (activeMode === "build") {
      if (activeTool === "select" && hit?.userData.objectId) {
        onObjectSelect(hit.userData.objectId);
        return;
      }
      const point = new THREE.Vector3();
      if (raycaster.ray.intersectPlane(ground, point))
        onPlace(boundedPosition(point.x, point.z));
      return;
    }
    if (hit?.userData.employeeId) {
      selection = hit.userData.employeeId;
      onSelect(selection);
      return;
    }
    const point = new THREE.Vector3();
    if (selection && raycaster.ray.intersectPlane(ground, point)) {
      const dest = boundedPosition(point.x, point.z);
      const avatar = avatars.get(selection);
      if (avatar) {
        avatar.path = findPath(
          { x: avatar.root.position.x, z: avatar.root.position.z },
          dest,
          obstacles,
        );
        avatar.target = avatar.path.shift() || null;
        moveTarget = dest;
        targetRing.position.set(dest.x, 0.12, dest.z);
        targetRing.visible = !!avatar.target;
      }
    }
  }
  const down = (e) => {
    pointerStart = [e.clientX, e.clientY];
    renderer.domElement.focus({ preventScroll: true });
  };
  const keyDown = (e) => {
    if (
      [
        "w",
        "a",
        "s",
        "d",
        "ArrowUp",
        "ArrowDown",
        "ArrowLeft",
        "ArrowRight",
      ].includes(e.key)
    ) {
      e.preventDefault();
      keys.add(e.key);
    }
  };
  const flush = () => {
    const a = avatars.get(selection);
    if (a?.changed) {
      a.changed = false;
      onMove(selection, { x: a.root.position.x, z: a.root.position.z });
    }
  };
  const keyUp = (e) => {
    keys.delete(e.key);
    flush();
  };
  const blur = () => {
    keys.clear();
    flush();
  };
  renderer.domElement.addEventListener("pointerdown", down);
  renderer.domElement.addEventListener("pointerup", click);
  renderer.domElement.addEventListener("keydown", keyDown);
  renderer.domElement.addEventListener("keyup", keyUp);
  renderer.domElement.addEventListener("blur", blur);
  const resize = new ResizeObserver(() => {
    const width = host.clientWidth,
      height = host.clientHeight;
    renderer.setSize(width, height);
    camera.aspect = width / Math.max(1, height);
    camera.updateProjectionMatrix();
  });
  resize.observe(host);
  let lastSaved = 0;
  function animate() {
    if (disposed) return;
    const dt = Math.min(clock.getDelta(), 0.05),
      t = clock.elapsedTime;
    controls.update();
    for (const [id, a] of avatars) {
      const before=a.root.position.clone();
      let moving = false;
      if (id === selection && activeMode === "live" && simPlaying) {
        const dx =
            (keys.has("d") || keys.has("ArrowRight") ? 1 : 0) -
            (keys.has("a") || keys.has("ArrowLeft") ? 1 : 0),
          dz =
            (keys.has("s") || keys.has("ArrowDown") ? 1 : 0) -
            (keys.has("w") || keys.has("ArrowUp") ? 1 : 0);
        if (dx || dz) {
          a.target = null;
          a.path = [];
          const position = boundedPosition(
            a.root.position.x + dx * dt * 3.1,
            a.root.position.z + dz * dt * 3.1,
          );
          if (canStand(position.x, position.z, obstacles))
            a.root.position.set(position.x, 0.1, position.z);
          else if (canStand(position.x, a.root.position.z, obstacles))
            a.root.position.x = position.x;
          else if (canStand(a.root.position.x, position.z, obstacles))
            a.root.position.z = position.z;
          a.root.rotation.y = Math.atan2(dx, dz);
          moving = true;
        } else if (a.target) {
          const delta = new THREE.Vector2(
            a.target.x - a.root.position.x,
            a.target.z - a.root.position.z,
          );
          if (delta.length() > 0.08) {
            delta.normalize();
            a.root.position.x += delta.x * dt * 3.1;
            a.root.position.z += delta.y * dt * 3.1;
            a.root.rotation.y = Math.atan2(delta.x, delta.y);
            moving = true;
          } else {
            a.target = a.path?.shift() || null;
            targetRing.visible = !!a.target;
            onMove(id, { x: a.root.position.x, z: a.root.position.z });
          }
        }
        if (moving && t - lastSaved > 2) {
          lastSaved = t;
          onMove(id, { x: a.root.position.x, z: a.root.position.z });
        }
        if (moving) a.changed = true;
      }
      if(followId===id&&moving){const delta=a.root.position.clone().sub(before);camera.position.add(delta);controls.target.add(delta);}
      if(a.model){
        const {mixer,idle,walk}=a.model, state=moving?'walk':'idle';
        if(a.model.state!==state){
          if(idle&&walk){const to=moving?walk:idle,from=moving?idle:walk;to.reset().fadeIn(.18).play();from.fadeOut(.18);}
          else if(walk){walk.play();walk.paused=!moving;if(!moving){walk.time=0;mixer.update(0);}}
          a.model.state=state;
        }
        if(simPlaying)mixer.update(dt);
      }
      a.legs.forEach(
        (leg, i) =>
          (leg.rotation.x = moving ? Math.sin(t * 9 + i * Math.PI) * 0.5 : 0),
      );
      a.arms.forEach(
        (arm, i) =>
          (arm.rotation.x = moving
            ? -Math.sin(t * 9 + i * Math.PI) * 0.4
            : simPlaying
              ? Math.sin(t * 0.8 + a.phase) * 0.025
              : 0),
      );
      a.body.position.y = moving
        ? 0.025 + Math.abs(Math.sin(t * 9)) * 0.04
        : 0.01;
    }
    const selected = avatars.get(selection);
    marker.visible = ring.visible = !!selected;
    if (selected) {
      marker.position
        .copy(selected.root.position)
        .add(new THREE.Vector3(0, 2.75 + Math.sin(t * 2) * 0.05, 0));
      marker.rotation.y = t * 0.7;
      ring.position.copy(selected.root.position);
      ring.position.y = 0.12;
    }
    renderer.render(scene, camera);
    raf = requestAnimationFrame(animate);
  }
  animate();
  return {
    getPositions() {
      return Object.fromEntries(
        [...avatars].map(([id, a]) => [
          id,
          { x: a.root.position.x, z: a.root.position.z },
        ]),
      );
    },
    flushPositions() {
      flush();
    },
    getCamera() {
      return {
        position: camera.position.toArray(),
        target: controls.target.toArray(),
      };
    },
    restoreCamera(value) {
      camera.position.fromArray(value.position);
      controls.target.fromArray(value.target);
      controls.update();
    },
    select(id) {
      flush();
      selection = id;
    },
    setMode(m, tool) {
      flush();
      activeMode = m;
      activeTool = tool;
    },
    play(value) {
      if (!value) flush();
      simPlaying = value;
    },
    zoom(delta) {
      const direction = camera.position.clone().sub(controls.target);
      direction.multiplyScalar(delta);
      camera.position.copy(controls.target).add(direction);
    },
    reset() {
      followId=null;
      camera.position.set(34, 31, 40);
      controls.target.set(0, 0, 0);
    },
    focus(id) {
      const avatar = avatars.get(id);
      if (avatar) {
        const offset = camera.position
          .clone()
          .sub(controls.target)
          .normalize()
          .multiplyScalar(5.8);
        controls.target
          .copy(avatar.root.position)
          .add(new THREE.Vector3(0, 1, 0));
        camera.position.copy(controls.target).add(offset);
        avatar.root.rotation.y=Math.atan2(offset.x,offset.z);
        followId=id;
        controls.update();renderer.render(scene,camera);
      }
    },
    view(type) {
      followId=null;
      if (type === "top") {
        camera.position.set(0, 50, 0.01);
        controls.target.set(0, 0, 0);
      } else this.reset();
    },
    dispose() {
      disposed = true;
      cancelAnimationFrame(raf);
      resize.disconnect();
      controls.dispose();
      renderer.domElement.removeEventListener("pointerdown", down);
      renderer.domElement.removeEventListener("pointerup", click);
      renderer.domElement.removeEventListener("keydown", keyDown);
      renderer.domElement.removeEventListener("keyup", keyUp);
      renderer.domElement.removeEventListener("blur", blur);
      scene.traverse((o) => {
        if (o.isMesh && !o.userData.importedAsset) {
          o.geometry?.dispose();
          if (![...materials.values()].includes(o.material))
            o.material?.dispose();
        }
      });
      for(const a of avatars.values())if(a.model){a.model.mixer.stopAllAction();a.model.mixer.uncacheRoot(a.model.root);}
      assetLeases.forEach(l=>l.release());
      materials.forEach((m) => m.dispose());
      textures.forEach((t) => t.dispose());
      renderer.dispose();
      renderer.domElement.remove();
    },
  };
}
