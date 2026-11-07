import * as THREE from "three";
import { surfaceTexture, brandingTexture } from "./atmosphere.js";
import { SAFEHOUSES } from "./dynamics.js";
import { Reflector } from "three/addons/objects/Reflector.js";
export const scene = new THREE.Scene();
scene.background = new THREE.Color("#10142b");
scene.fog = new THREE.FogExp2("#131b32", 0.00165);
export const boxes = [];
const mat = (
  color,
  metalness = 0,
  roughness = 0.7,
  emissive = "#000000",
  intensity = 0,
) =>
  new THREE.MeshStandardMaterial({
    color,
    metalness,
    roughness,
    emissive,
    emissiveIntensity: intensity,
  });
const asphalt = mat("#18212b", 0.45, 0.24),
  curb = mat("#5b6366"),
  grass = mat("#152a24");
const chrome = mat("#a9c4d0", 1, 0.15),
  rubber = mat("#070a0d", 0.1, 0.92),
  glass = mat("#18374b", 0.8, 0.12);
const roadSurface = surfaceTexture("road"),
  paintSurface = surfaceTexture("paint");
asphalt.roughnessMap = roadSurface;
asphalt.bumpMap = roadSurface;
asphalt.bumpScale = 0.07;
asphalt.metalness = 0.12;
asphalt.roughness = 0.5;
const decalMaterial = new THREE.MeshStandardMaterial({
  map: brandingTexture(),
  roughness: 0.5,
  metalness: 0.2,
  polygonOffset: true,
  polygonOffsetFactor: -2,
});
const decalGeometry = new THREE.PlaneGeometry(1, 0.5);
const unit = new THREE.BoxGeometry(1, 1, 1);
export function block(w, h, d, material, x = 0, y = 0, z = 0, parent = scene) {
  const mesh = new THREE.Mesh(unit, material);
  mesh.scale.set(w, h, d);
  mesh.position.set(x, y, z);
  parent.add(mesh);
  return mesh;
}
const objects = [];
function instanced(material, items) {
  const mesh = new THREE.InstancedMesh(unit, material, items.length);
  const dummy = new THREE.Object3D();
  items.forEach((v, i) => {
    dummy.position.set(v.x, v.y, v.z);
    dummy.scale.set(v.w, v.h, v.d);
    dummy.rotation.set(0, v.r || 0, 0);
    dummy.updateMatrix();
    mesh.setMatrixAt(i, dummy.matrix);
  });
  scene.add(mesh);
  return mesh;
}
let seed = 29;
export function random() {
  seed = (seed * 1664525 + 1013904223) >>> 0;
  return seed / 4294967296;
}
function facade(color) {
  const c = document.createElement("canvas");
  c.width = c.height = 128;
  const ctx = c.getContext("2d");
  ctx.fillStyle = color;
  ctx.fillRect(0, 0, 128, 128);
  for (let x = 9; x < 128; x += 32)
    for (let y = 10; y < 128; y += 32) {
      ctx.fillStyle =
        random() > 0.35
          ? ["#d09d5b", "#766d4a", "#c69360"][Math.floor(random() * 3)]
          : "#111e2b";
      ctx.fillRect(x, y, 13, 20);
      ctx.fillStyle = "#171f2a";
      ctx.fillRect(x + 6, y, 1, 20);
      ctx.fillRect(x, y + 9, 13, 2);
    }
  const texture = new THREE.CanvasTexture(c);
  texture.colorSpace = THREE.SRGBColorSpace;
  return new THREE.MeshStandardMaterial({
    map: texture,
    color: "#8899aa",
    roughness: 0.75,
    emissiveMap: texture,
    emissive: "#e7b98b",
    emissiveIntensity: 0.28,
  });
}
export function sign(
  text,
  x,
  y,
  z,
  color = "#45ebcd",
  rotation = 0,
  width = 15,
) {
  const c = document.createElement("canvas");
  c.width = 512;
  c.height = 128;
  const ctx = c.getContext("2d");
  ctx.fillStyle = "#070e18";
  ctx.fillRect(0, 0, 512, 128);
  ctx.strokeStyle = color;
  ctx.lineWidth = 4;
  ctx.strokeRect(8, 8, 496, 112);
  ctx.fillStyle = color;
  ctx.shadowColor = color;
  ctx.shadowBlur = 15;
  ctx.font = "bold 42px sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(text, 256, 66, 475);
  const texture = new THREE.CanvasTexture(c);
  texture.colorSpace = THREE.SRGBColorSpace;
  const material = new THREE.MeshBasicMaterial({
    map: texture,
    side: THREE.DoubleSide,
  });
  const mesh = new THREE.Mesh(
    new THREE.PlaneGeometry(width, width / 4),
    material,
  );
  mesh.position.set(x, y, z);
  mesh.rotation.y = rotation;
  scene.add(mesh);
  return mesh;
}
export function createWorld() {
  scene.add(new THREE.HemisphereLight("#7189cd", "#15232d", 2.0));
  const moon = new THREE.DirectionalLight("#8fabf8", 0.8);
  moon.position.set(-100, 200, -200);
  scene.add(moon);
  block(6000, 0.2, 6000, grass, 0, -0.3, 0);
  // The playable street grid is compressed and deliberately not a geographic replica.
  const roads = [],
    sidewalks = [],
    stripes = [],
    lamps = [],
    bulbs = [],
    balconies = [];
  for (let n = -400; n <= 400; n += 100) {
    roads.push(
      { x: n, y: 0, z: 0, w: 22, h: 0.08, d: 1000 },
      { x: 0, y: 0, z: n, w: 1000, h: 0.08, d: 22 },
    );
    for (let s = -480; s < 490; s += 12)
      if (Math.abs(s % 100) > 17 && Math.abs(s % 100) < 83) {
        stripes.push(
          { x: n, y: 0.06, z: s, w: 0.18, h: 0.02, d: 5 },
          { x: s, y: 0.06, z: n, w: 5, h: 0.02, d: 0.18 },
        );
      }
  }
  const palettes = [
    "#4b454f",
    "#635f5a",
    "#3f514e",
    "#645052",
    "#535870",
    "#6c665b",
  ].map(facade);
  const structures = palettes.map(() => []);
  for (let x = -400; x < 400; x += 100)
    for (let z = -400; z < 400; z += 100) {
      sidewalks.push({ x: x + 50, y: 0.1, z: z + 50, w: 78, h: 0.22, d: 78 });
      for (let ix = 0; ix < 2; ix++)
        for (let iz = 0; iz < 2; iz++) {
          // Back alleys and internal courtyards remain drivable between separate buildings.
          const bx = x + 30 + ix * 39,
            bz = z + 30 + iz * 39;
          const industrial = x > 150 || z > 150;
          const h = industrial ? 9 + random() * 14 : 9 + random() * 11;
          const w = 24 + random() * 7,
            d = 24 + random() * 7;
          boxes.push({ x: bx, z: bz, w, d });
          structures[Math.floor(random() * structures.length)].push({
            x: bx,
            y: h / 2 + 0.25,
            z: bz,
            w,
            h,
            d,
          });
          if (!industrial) {
            balconies.push({
              x: bx,
              y: 4.4,
              z: bz - d / 2 - 1,
              w: w + 1,
              h: 0.25,
              d: 3,
            });
            balconies.push({
              x: bx,
              y: 5.8,
              z: bz - d / 2 - 2,
              w,
              h: 0.12,
              d: 0.15,
            });
            for (let a = -w / 2; a < w / 2; a += 2)
              balconies.push({
                x: bx + a,
                y: 5.1,
                z: bz - d / 2 - 2,
                w: 0.1,
                h: 1.4,
                d: 0.1,
              });
          }
        }
      for (const [lx, lz] of [
        [x + 13, z + 14],
        [x + 87, z + 86],
      ]) {
        boxes.push({ x: lx, z: lz, w: 0.4, d: 0.4, h: 6 });
        lamps.push({ x: lx, y: 3, z: lz, w: 0.18, h: 6, d: 0.18 });
        bulbs.push({ x: lx, y: 6.1, z: lz, w: 0.8, h: 1, d: 0.8 });
      }
    }
  instanced(asphalt, roads);
  instanced(curb, sidewalks);
  instanced(mat("#c7b88c", 0.2, 0.5), stripes);
  structures.forEach((data, i) => instanced(palettes[i], data));
  instanced(mat("#15282c", 0.6, 0.3), balconies);
  instanced(mat("#172b30", 0.7, 0.3), lamps);
  instanced(mat("#f4ba6e", 0.1, 0.4, "#ffc071", 2.8), bulbs);
  // Riverfront, containers, levee, and two drivable bridge decks.
  const water = mat("#092737", 0.75, 0.15, "#0a2433", 0.3);
  block(900, 0.1, 4000, water, 930, -0.18, 0);
  block(22, 0.18, 1200, asphalt, 450, 0, 0);
  for (const z of [-400, -370]) {
    block(800, 0.3, 19, asphalt, 830, 0.01, z);
    for (let x = 480; x < 1230; x += 60) {
      block(3, 13, 3, curb, x, -5, z);
      block(58, 1.3, 0.3, chrome, x + 29, 1, z - 10);
      block(58, 1.3, 0.3, chrome, x + 29, 1, z + 10);
    }
  }
  const containerMats = ["#763f48", "#285d68", "#64614c"].map((c) =>
    mat(c, 0.4, 0.6),
  );
  for (let i = 0; i < 18; i++) {
    const x = 419 + (i % 2) * 19,
      z = -260 + Math.floor(i / 2) * 65;
    block(12, 5, 26, containerMats[i % 3], x, 2.5, z);
    boxes.push({ x, z, w: 12, d: 26 });
  }
  for (let z = -350; z < 500; z += 70) {
    // Cypress trees along the muddy outskirts, outside the city grid.
    for (const x of [-540, -600]) {
      block(1, 14, 1, mat("#28392b"), x, 7, z);
      const canopy = new THREE.Mesh(new THREE.ConeGeometry(8, 20, 7), grass);
      canopy.position.set(x, 18, z);
      scene.add(canopy);
    }
  }
  sign("BOURBON • JAZZ", -30, 8, -13, "#ec6cba", 0, 20);
  sign("EASTBANK CUSTOMS", 31, 7, 13.2, "#45ebcd", Math.PI, 22);
  sign("ST. CLAUDE", -230, 7, -213, "#f6b16d", 0, 18);
  sign("THE BRASS ROOM", -131, 9, 213, "#cc78ff", Math.PI, 20);
  sign("PORT OF NEW ORLEANS", 330, 10, 313, "#45ebcd", Math.PI, 23);
  sign("I-10 • TWIN SPAN →", 440, 9, -413, "#b4e2b7", 0, 23);
  for (const [x, z, color] of [
    [-24, -8, "#f26ab6"],
    [22, 8, "#45ebcd"],
    [-225, -207, "#ffc670"],
    [-130, 207, "#ba66ef"],
  ]) {
    const light = new THREE.PointLight(color, 70, 35, 1.5);
    light.position.set(x, 5, z);
    scene.add(light);
    objects.push(light);
  }
  for (const home of SAFEHOUSES) {
    sign(
      "SAFEHOUSE / " + home.name.toUpperCase(),
      home.x - 23,
      5,
      home.z + 13,
      "#54efba",
      Math.PI,
      18,
    );
  }
  for (const [x, z] of [
    [-30, -13.1],
    [-230, -213.1],
    [330, 313.1],
  ]) {
    const tag = new THREE.Mesh(decalGeometry, decalMaterial);
    tag.scale.set(12, 12, 12);
    tag.position.set(x, 3.5, z);
    scene.add(tag);
  }
  const moonMesh = new THREE.Mesh(
    new THREE.SphereGeometry(13, 20, 20),
    new THREE.MeshBasicMaterial({ color: "#a9b9d2" }),
  );
  moonMesh.position.set(-200, 250, -650);
  scene.add(moonMesh);
  // A real planar reflection patch outside the garage; high quality only.
  const reflection = new Reflector(new THREE.PlaneGeometry(17, 85), {
    color: "#536a7c",
    textureWidth: 512,
    textureHeight: 512,
    clipBias: 0.003,
  });
  // Irregular puddle mask avoids turning the whole road into a perfect mirror.
  reflection.material.vertexShader = reflection.material.vertexShader
    .replace("varying vec4 vUv;", "varying vec4 vUv; varying vec2 puddleUv;")
    .replace("vUv = textureMatrix", "puddleUv = uv; vUv = textureMatrix");
  reflection.material.fragmentShader = reflection.material.fragmentShader
    .replace("varying vec4 vUv;", "varying vec4 vUv; varying vec2 puddleUv;")
    .replace(
      "vec4 base =",
      "float edge=length((puddleUv-.5)*vec2(2.,2.)); if(edge>.91+.045*sin(puddleUv.y*69.)) discard; vec4 base =",
    );
  reflection.rotation.x = -Math.PI / 2;
  reflection.position.set(0, 0.065, -45);
  scene.add(reflection);
  return {
    reflection,
    lights: objects,
    setWet(value, car) {
      asphalt.roughness = 0.75 - value * 0.56;
      scene.fog.density = 0.0016 + value * 0.0011;
      if (car) {
        const alongX = Math.abs(Math.sin(car.heading)) > 0.7;
        reflection.rotation.z = alongX ? Math.PI / 2 : 0;
        reflection.position.x = alongX
          ? Math.round(car.x / 60) * 60
          : Math.round(car.x / 100) * 100;
        reflection.position.z = alongX
          ? Math.round(car.z / 100) * 100
          : Math.round(car.z / 60) * 60;
      }
    },
  };
}
export function createCar(type, color, rim = 1) {
  const root = new THREE.Group(),
    bodyGroup = new THREE.Group();
  root.add(bodyGroup);
  const paint = new THREE.MeshPhysicalMaterial({
    color,
    metalness: 0.75,
    roughness: 0.22,
    clearcoat: 1,
    clearcoatRoughness: 0.09,
    roughnessMap: paintSurface,
    metalnessMap: paintSurface,
    envMapIntensity: 1.2,
  });
  const w = type.width,
    l = type.length,
    truck = type.id === "truck",
    exotic = type.id === "exotic";
  const ride = truck ? 1.15 : 0.82;
  block(w, 0.65, l, paint, 0, ride, 0, bodyGroup);
  block(
    w * 0.84,
    exotic ? 0.55 : 0.85,
    l * 0.48,
    paint,
    0,
    ride + 0.59,
    -0.25,
    bodyGroup,
  );
  block(w * 0.78, 0.48, 0.08, glass, 0, ride + 0.69, l * 0.2, bodyGroup);
  block(w * 0.78, 0.45, 0.08, glass, 0, ride + 0.69, -l * 0.28, bodyGroup);
  for (const x of [-1, 1])
    block(
      0.04,
      0.43,
      l * 0.39,
      glass,
      x * w * 0.426,
      ride + 0.68,
      -0.25,
      bodyGroup,
    );
  block(w + 0.1, 0.18, 0.25, chrome, 0, ride - 0.12, l / 2, bodyGroup);
  block(w + 0.1, 0.18, 0.25, chrome, 0, ride - 0.12, -l / 2, bodyGroup);
  const headMaterial = mat("#c6e9ff", 0.2, 0.2, "#c4e8ff", 4),
    tailMaterial = mat("#d42151", 0.2, 0.2, "#ff1455", 3);
  for (const x of [-1, 1]) {
    block(
      w * 0.27,
      0.15,
      0.07,
      headMaterial,
      x * w * 0.3,
      ride + 0.03,
      l / 2 + 0.03,
      bodyGroup,
    );
    block(
      w * 0.28,
      0.13,
      0.07,
      tailMaterial,
      x * w * 0.3,
      ride + 0.03,
      -l / 2 - 0.03,
      bodyGroup,
    );
  }
  if (type.id === "tuner" || exotic) {
    block(w + 0.3, 0.12, 0.45, paint, 0, ride + 0.8, -l * 0.43, bodyGroup);
  }
  if (truck)
    block(w * 0.75, 0.25, l * 0.3, rubber, 0, ride + 0.4, -l * 0.31, bodyGroup);
  const wheels = [],
    radius = 0.43 + rim * 0.065;
  for (const x of [-1, 1])
    for (const z of [-1, 1]) {
      const wheel = new THREE.Group();
      wheel.position.set(x * (w / 2 + 0.02), radius, z * l * 0.32);
      const tire = new THREE.Mesh(
        new THREE.CylinderGeometry(radius, radius, 0.32, 20),
        rubber,
      );
      tire.rotation.z = Math.PI / 2;
      wheel.add(tire);
      const hub = new THREE.Mesh(
        new THREE.CylinderGeometry(radius * 0.8, radius * 0.8, 0.34, 16),
        chrome,
      );
      hub.rotation.z = Math.PI / 2;
      wheel.add(hub);
      for (let j = 0; j < 5; j++) {
        const a = (j / 5) * Math.PI * 2;
        const spoke = block(0.37, 0.07, radius * 1.4, chrome, 0, 0, 0, wheel);
        spoke.rotation.x = a;
      }
      bodyGroup.add(wheel);
      wheels.push(wheel);
    }
  for (const side of [-1, 1]) {
    const decal = new THREE.Mesh(decalGeometry, decalMaterial);
    decal.scale.set(1.7, 1.7, 1.7);
    decal.rotation.y = (side * Math.PI) / 2;
    decal.position.set(side * (w / 2 + 0.012), ride + 0.05, -0.1);
    bodyGroup.add(decal);
  }
  const glow = new THREE.PointLight(color, 16, 7, 2);
  glow.position.set(0, 0.3, 0);
  root.add(glow);
  const headlight = new THREE.SpotLight("#c9e6ff", 160, 65, 0.48, 0.6, 1.5);
  headlight.position.set(0, 1.1, l * 0.45);
  headlight.target.position.set(0, 0.1, 30);
  root.add(headlight, headlight.target);
  const flames = new THREE.Group();
  for (const x of [-0.65, 0.65]) {
    const flame = new THREE.Mesh(
      new THREE.ConeGeometry(0.19, 2.8, 8),
      mat("#b65bff", 0, 0.4, "#b951ff", 5),
    );
    flame.rotation.x = -Math.PI / 2;
    flame.position.set(x, 0.6, -l / 2 - 1);
    flames.add(flame);
  }
  flames.visible = false;
  root.add(flames);
  root.userData = {
    bodyGroup,
    wheels,
    glow,
    paint,
    headlight,
    flames,
    dimensions: { width: w, length: l },
  };
  return root;
}
export function disposeCar(car) {
  const materials = new Set(),
    geometries = new Set();
  car.traverse((o) => {
    if (o.isLight && o.shadow?.map) o.shadow.map.dispose();
    if (o.isMesh) {
      if (o.geometry !== unit && o.geometry !== decalGeometry)
        geometries.add(o.geometry);
      if (![chrome, rubber, glass, decalMaterial].includes(o.material))
        materials.add(o.material);
    }
  });
  materials.forEach((m) => m.dispose());
  geometries.forEach((g) => g.dispose());
  scene.remove(car);
}
export function getDistrict(x, z) {
  if (x > 490 && z < -340) return "I-10 / TWIN SPAN";
  if (x > 400) return "MISSISSIPPI RIVERFRONT";
  if (x < -450 || z < -470) return "BAYOU / BACKROAD LEVEES";
  if (z > 140 && x > 0) return "WAREHOUSE DISTRICT";
  if (z > 90 && x < 0) return "TREMÉ";
  if (x > 150 && z < -140) return "NEW ORLEANS EAST";
  if (z < -140) return "ST. CLAUDE AVENUE";
  return "FRENCH QUARTER";
}
