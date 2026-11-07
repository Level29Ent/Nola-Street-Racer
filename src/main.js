import "./style.css";
import {
  createLighting,
  createSmoke,
  createPedestrians,
} from "./atmosphere.js";
import { createCockpit } from "./cockpit.js";
import { createDrivingSound } from "./sound.js";
import { setupPhone } from "./phone.js";
import {
  createCollisionQuery,
  vehicleBounds,
  advanceHeat,
  interceptorCount,
  pursuitSpawn,
  joystickAxis,
  SAFEHOUSES,
  BOSSES,
} from "./dynamics.js";
import * as THREE from "three";
import { EffectComposer } from "three/addons/postprocessing/EffectComposer.js";
import { RenderPass } from "three/addons/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "three/addons/postprocessing/UnrealBloomPass.js";
import { OutputPass } from "three/addons/postprocessing/OutputPass.js";
import {
  scene,
  boxes,
  createWorld,
  createCar,
  disposeCar,
  getDistrict,
  random,
  block,
} from "./world.js";
import {
  CLASSES,
  COLORS,
  MISSIONS,
  clamp,
  initialCar,
  stepCar,
  reachedCheckpoint,
  loadSave,
} from "./simulation.js";
const $ = (id) => document.getElementById(id);
let renderer;
try {
  renderer = new THREE.WebGLRenderer({
    canvas: $("world"),
    antialias: false,
    powerPreference: "high-performance",
  });
} catch {
  $("intro").innerHTML =
    "<h1>WebGL unavailable</h1><p>This prototype needs a browser with WebGL2 and hardware acceleration enabled.</p>";
  throw new Error("WebGL2 is required");
}
const mobile = matchMedia("(pointer: coarse)").matches || innerWidth < 600;
renderer.setPixelRatio(Math.min(devicePixelRatio, mobile ? 1 : 1.5));
renderer.setSize(innerWidth, innerHeight);
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.15;
const camera = new THREE.PerspectiveCamera(
  62,
  innerWidth / innerHeight,
  0.2,
  1800,
);
const world = createWorld();
const pedestrians = createPedestrians(scene);
const lighting = createLighting(renderer, scene, camera, mobile);
const smoke = createSmoke(scene, mobile);
const cockpit = createCockpit(scene, camera, renderer, mobile);
const collisionQuery = createCollisionQuery(boxes);
const phone = setupPhone($);
const composer = new EffectComposer(renderer);
composer.addPass(new RenderPass(scene, camera));
const bloom = new UnrealBloomPass(
  new THREE.Vector2(innerWidth, innerHeight),
  0.5,
  0.55,
  1.1,
);
composer.addPass(bloom);
composer.addPass(new OutputPass());
let highFX = !mobile;
world.reflection.visible = highFX;
$("quality").textContent = highFX ? "FX HIGH" : "FX LOW";
$("quality").setAttribute("aria-pressed", String(highFX));
let save;
try {
  save = loadSave(localStorage.getItem("crescent-city-save"));
} catch {
  save = loadSave(null);
}
function persist() {
  try {
    localStorage.setItem("crescent-city-save", JSON.stringify(save));
  } catch {
    toast("Storage unavailable: this run cannot be saved.");
  }
}
let car = initialCar(),
  player = createCar(CLASSES[save.vehicle], COLORS[save.color], save.rims);
scene.add(player);
lighting.register(player);
player.userData.headlight.castShadow = highFX;
player.userData.headlight.shadow.mapSize.set(
  mobile ? 512 : 1024,
  mobile ? 512 : 1024,
);
let started = false,
  heat = 0,
  heatState = { heat: 0, evidence: 0, escape: 0 },
  elapsed = 0,
  storm = 0.25,
  manualWaypoint = null;
let mission = null,
  missionIndex = -1,
  stage = 0,
  raceTime = 0,
  missionRivalStage = 0;
let toastTimer = 0,
  nextStorm = 35,
  audioEnabled = false,
  hop = 0,
  safePosition = { x: 0, z: 20 },
  safeTimer = 0;
const keys = new Set(),
  cooldown = { zone: 0, roar: 0, emp: 0 },
  active = { zone: 0, roar: 0, emp: 0 };
let input = {
  throttle: 0,
  steer: 0,
  brake: false,
  boost: false,
  handbrake: false,
};
const clock = new THREE.Clock(),
  follow = new THREE.Vector3(),
  lookAt = new THREE.Vector3(),
  cameraTarget = new THREE.Vector3();
function isPaused() {
  return !started || Boolean(document.querySelector("dialog[open]"));
}
function toast(text) {
  $("toast").textContent = text;
  $("toast").classList.add("show");
  toastTimer = 5;
}
function flash(color = "#47ebcb") {
  $("flash").style.background = color;
  $("flash").style.opacity = ".2";
  setTimeout(() => ($("flash").style.opacity = "0"), 120);
}
function refreshCar() {
  disposeCar(player);
  player = createCar(CLASSES[save.vehicle], COLORS[save.color], save.rims);
  scene.add(player);
  lighting.register(player);
  player.userData.headlight.castShadow = highFX;
  player.userData.headlight.shadow.mapSize.set(
    mobile ? 512 : 1024,
    mobile ? 512 : 1024,
  );
  car.speed = car.vx = car.vz = 0;
  persist();
}
let joystickSteer = 0,
  stickPointer = null;
function clearInput() {
  joystickSteer = 0;
  stickPointer = null;
  if ($("joystick-knob")) $("joystick-knob").style.transform = "";
  $("joystick").setAttribute("aria-valuenow", "0");
  keys.clear();
  document
    .querySelectorAll("#touch .pressed")
    .forEach((el) => el.classList.remove("pressed"));
}
function openPanel(id) {
  if (!started) return;
  clearInput();
  if (id === "garage") renderGarage();
  $(id).showModal();
}
function closePanel(id) {
  $(id).close();
  clearInput();
}
for (const b of document.querySelectorAll("[data-close]"))
  b.addEventListener("click", () => closePanel(b.dataset.close));
for (const dialog of document.querySelectorAll("dialog"))
  dialog.addEventListener("close", clearInput);
$("garage-button").onclick = () => openPanel("garage");
$("missions-button").onclick = () => openPanel("race-board");
$("pause").onclick = $("brand").onclick = (e) => {
  e.preventDefault();
  openPanel("pause-menu");
};
$("heat").onclick = () =>
  toast(
    heat
      ? `WANTED ${heat}/5 · ${agents.filter((a) => a.police && !a.patrol).length} interceptors. Stay over 180m from police to shed a star.`
      : "No active warrant. Speeding or drifting near patrols attracts NOPD attention.",
  );
$("phone-button").onclick = () => openPanel("phone");
$("exit-driving").onclick = () => openPanel("pause-menu");
function toggleCamera() {
  const enabled = cockpit.toggle();
  document.body.classList.toggle("cockpit", enabled);
  $("camera-toggle").setAttribute("aria-pressed", String(enabled));
  $("camera-toggle").textContent = enabled ? "CHASE / C" : "COCKPIT / C";
  player.visible = true;
  player.userData.bodyGroup.visible = !enabled;
}
$("camera-toggle").onclick = toggleCamera;
$("map-button").onclick = () => document.body.classList.toggle("map-expanded");
$("quality").onclick = () => {
  highFX = !highFX;
  world.reflection.visible = highFX;
  lighting.setQuality(highFX);
  player.userData.headlight.castShadow = highFX;
  renderer.setPixelRatio(highFX ? Math.min(devicePixelRatio, 1.5) : 1);
  renderer.setSize(innerWidth, innerHeight);
  composer.setPixelRatio(renderer.getPixelRatio());
  composer.setSize(innerWidth, innerHeight);
  $("quality").textContent = highFX ? "FX HIGH" : "FX LOW";
  $("quality").setAttribute("aria-pressed", String(highFX));
};
$("start").onclick = () => {
  started = true;
  $("intro").style.display = "none";
  $("hud").hidden = false;
  player.position.set(car.x, 0, car.z);
  follow.set(car.x - 9, 7, car.z + 17);
  camera.position.copy(follow);
  toast("Welcome to the Eastbank. Open the race board with R.");
};
$("recover").onclick = () => recover();
function recover(penalty = false) {
  car.x = safePosition.x;
  car.z = safePosition.z;
  car.speed = car.vx = car.vz = 0;
  heatState.evidence = 0;
  car.health = penalty
    ? Math.max(15, car.health - 15)
    : Math.max(30, car.health);
  toast(
    penalty
      ? "River recovery · condition reduced"
      : "Back on the road. Keep it moving.",
  );
}
addEventListener("keydown", (e) => {
  if (
    e.target instanceof HTMLInputElement ||
    e.target instanceof HTMLSelectElement
  )
    return;
  const key = e.key.toLowerCase();
  if (
    [" ", "arrowup", "arrowdown", "arrowleft", "arrowright"].includes(key) &&
    started
  )
    e.preventDefault();
  if (e.repeat) return;
  if (!started) return;
  if (document.querySelector("dialog[open]")) return;
  keys.add(key);
  if (key === "g") {
    if (mission)
      toast("Finish or abandon your race before entering the garage.");
    else openPanel("garage");
  }
  if (key === "r") openPanel("race-board");
  if (key === "m") openPanel("phone");
  if (key === "v") {
    e.preventDefault();
    document.body.classList.toggle("map-expanded");
  }
  if (key === "c") toggleCamera();
  if (key === "f") openPanel("pause-menu");
  if (key === "p" || key === "escape") openPanel("pause-menu");
  if (key === "t") recover();
  if (key === "h" && save.stance === 2) hop = 1;
  if (["1", "2", "3"].includes(key))
    ability(["zone", "roar", "emp"][Number(key) - 1]);
});
addEventListener("keyup", (e) => keys.delete(e.key.toLowerCase()));
addEventListener("blur", () => {
  clearInput();
  if (started && !isPaused()) openPanel("pause-menu");
});
document.addEventListener("visibilitychange", () => {
  if (document.hidden && started && !isPaused()) openPanel("pause-menu");
});
if (matchMedia("(pointer: coarse)").matches)
  document.body.classList.add("touch");
for (const b of document.querySelectorAll("[data-key]")) {
  b.onpointerdown = (e) => {
    e.preventDefault();
    b.setPointerCapture(e.pointerId);
    keys.add(b.dataset.key);
    b.classList.add("pressed");
  };
  const release = () => {
    keys.delete(b.dataset.key);
    b.classList.remove("pressed");
  };
  b.onpointerup = b.onpointercancel = b.onlostpointercapture = release;
}
const stick = $("joystick");
function moveStick(e) {
  if (e.pointerId !== stickPointer) return;
  const r = stick.getBoundingClientRect();
  joystickSteer = joystickAxis(
    e.clientX - r.left - r.width / 2,
    r.width * 0.36,
  );
  $("joystick-knob").style.transform =
    `translateX(${joystickSteer * r.width * 0.28}px)`;
  stick.setAttribute("aria-valuenow", String(Math.round(joystickSteer * 100)));
}
stick.onpointerdown = (e) => {
  e.preventDefault();
  stickPointer = e.pointerId;
  stick.setPointerCapture(e.pointerId);
  moveStick(e);
};
stick.onpointermove = moveStick;
const resetStick = () => {
  stickPointer = null;
  joystickSteer = 0;
  $("joystick-knob").style.transform = "";
  stick.setAttribute("aria-valuenow", "0");
};
stick.onpointerup =
  stick.onpointercancel =
  stick.onlostpointercapture =
    resetStick;
stick.onkeydown = (e) => {
  if (["ArrowLeft", "ArrowRight"].includes(e.key)) {
    e.preventDefault();
    e.stopPropagation();
    joystickSteer = e.key === "ArrowLeft" ? -1 : 1;
    stick.setAttribute("aria-valuenow", String(joystickSteer * 100));
  }
};
stick.onkeyup = resetStick;
stick.onblur = resetStick;
for (const b of document.querySelectorAll("[data-ability]"))
  b.onclick = () => ability(b.dataset.ability);
function ability(name) {
  if (isPaused()) return;
  if (cooldown[name] > 0)
    return toast(
      `${name.toUpperCase()} recharging · ${Math.ceil(cooldown[name])}s`,
    );
  cooldown[name] = { zone: 22, roar: 18, emp: 28 }[name];
  active[name] = { zone: 5, roar: 1.2, emp: 7 }[name];
  if (name === "roar")
    for (const a of agents)
      if (Math.hypot(a.x - car.x, a.z - car.z) < 70) a.stunned = 4;
  if (name === "emp")
    for (const a of agents)
      if (a.police && Math.hypot(a.x - car.x, a.z - car.z) < 130) a.stunned = 7;
  flash(name === "roar" ? "#ffc76b" : "#47bfff");
  toast(
    {
      zone: "ZONE · precision time engaged",
      roar: "ROAR · nearby traffic scattered",
      emp: "EMP · nearby interceptors disabled",
    }[name],
  );
}
// Garage and persistent, capped three-stage performance upgrades.
function renderGarage() {
  $("vehicle-list").replaceChildren();
  CLASSES.forEach((v, i) => {
    const b = document.createElement("button");
    b.classList.toggle("selected", save.vehicle === i);
    b.innerHTML = `<b>${v.name}</b><small>${v.model}</small><small>${save.owned.includes(i) ? v.tag : `UNLOCK · $${v.price.toLocaleString()}`}</small>`;
    b.onclick = () => {
      if (!save.owned.includes(i)) {
        if (save.cash < v.price)
          return toast("Not enough cash. Win races to unlock the exotic.");
        save.cash -= v.price;
        save.owned.push(i);
      }
      save.vehicle = i;
      refreshCar();
      renderGarage();
    };
    $("vehicle-list").append(b);
  });
  $("paints").replaceChildren();
  COLORS.forEach((color, i) => {
    const b = document.createElement("button");
    b.style.background = color;
    b.setAttribute(
      "aria-label",
      `Paint ${["purple", "teal", "cherry", "gold", "blue", "pearl"][i]}`,
    );
    b.classList.toggle("selected", save.color === i);
    b.onclick = () => {
      save.color = i;
      refreshCar();
      renderGarage();
    };
    $("paints").append(b);
  });
  $("rims").value = save.rims;
  $("stance").value = save.stance;
  $("glow").checked = save.glow;
  $("upgrades").replaceChildren();
  for (const [key, title, desc] of [
    ["engine", "Twin-turbo / ECU", "+12% acceleration & top speed"],
    ["tires", "Street compound", "+15% wet & dry grip"],
    ["nitro", "Dual purge system", "Faster nitrous recharge"],
  ]) {
    const level = save.upgrades[key],
      cost = 700 * (level + 1),
      row = document.createElement("div");
    row.className = "upgrade";
    row.innerHTML = `<div>${title}<small>${desc} · ${level}/3</small></div>`;
    const b = document.createElement("button");
    b.textContent = level === 3 ? "MAXED" : `$${cost.toLocaleString()} ↗`;
    b.disabled = level === 3 || save.cash < cost;
    b.onclick = () => {
      if (save.cash < cost || save.upgrades[key] >= 3) return;
      save.cash -= cost;
      save.upgrades[key]++;
      persist();
      renderGarage();
    };
    row.append(b);
    $("upgrades").append(row);
  }
}
for (const key of ["rims", "stance", "glow"])
  $(key).onchange = (e) => {
    save[key] = key === "glow" ? e.target.checked : Number(e.target.value);
    refreshCar();
  };
$("repair").onclick = () => {
  if (save.cash < 250)
    return toast("Repairs cost $250. Recover with T for an emergency restart.");
  save.cash -= 250;
  car.health = 100;
  car.nitro = 100;
  persist();
  renderGarage();
  toast("Repaired. Refilled. Ready for trouble.");
};
// Garage entry is disabled during a wager/race, including touch entry.
$("garage-button").onclick = () =>
  mission
    ? toast("Finish or abandon the race before tuning.")
    : openPanel("garage");
// Traffic follows intersections; police choose grid nodes toward the player.
const agents = [];
function makeAgent(x, z, police = false, patrol = false) {
  const mesh = createCar(
    CLASSES[police ? 0 : Math.floor(random() * 3)],
    police ? "#162537" : COLORS[Math.floor(random() * COLORS.length)],
    0,
  );
  mesh.userData.glow.visible = false;
  mesh.userData.headlight.visible = false;
  const a = {
    mesh,
    x,
    z,
    tx: x,
    tz: z,
    heading: 0,
    police,
    patrol,
    bounds: new THREE.Box3(),
    stunned: 0,
    hitTimer: 0,
    speed: police ? 31 : 12 + random() * 8,
  };
  if (police) {
    const bar = new THREE.Group();
    block(
      0.8,
      0.16,
      0.35,
      new THREE.MeshBasicMaterial({ color: "#ff2461" }),
      -0.5,
      2,
      0,
      bar,
    );
    block(
      0.8,
      0.16,
      0.35,
      new THREE.MeshBasicMaterial({ color: "#227aff" }),
      0.5,
      2,
      0,
      bar,
    );
    mesh.add(bar);
    a.bar = bar;
  }
  mesh.position.set(x, 0, z);
  mesh.visible = !police || patrol;
  lighting.register(mesh);
  scene.add(mesh);
  agents.push(a);
  return a;
}
for (let i = 0; i < 14; i++)
  makeAgent(
    (Math.floor(random() * 8) - 4) * 100,
    (Math.floor(random() * 8) - 4) * 100,
  );
makeAgent(0, -100, true, true);
makeAgent(-200, 100, true, true);
function syncInterceptors() {
  const interceptors = agents.filter((a) => a.police && !a.patrol),
    wanted = interceptorCount(heat);
  while (interceptors.length > wanted) {
    const a = interceptors.pop();
    agents.splice(agents.indexOf(a), 1);
    disposeCar(a.mesh);
  }
  while (interceptors.length < wanted) {
    const p = pursuitSpawn(car, interceptors.length);
    const a = makeAgent(p.x, p.z, true);
    interceptors.push(a);
  }
}
let rival = null;
function chooseNode(a, target) {
  if (target) {
    const tx = Math.round(target.x / 100) * 100,
      tz = Math.round(target.z / 100) * 100;
    if (Math.abs(tx - a.x) > Math.abs(tz - a.z)) {
      a.tx = a.x + Math.sign(tx - a.x) * 100;
      a.tz = a.z;
    } else if (Math.abs(tz - a.z) > 1) {
      a.tz = a.z + Math.sign(tz - a.z) * 100;
      a.tx = a.x;
    } else {
      a.tx = a.x + 100;
      a.tz = a.z;
    }
  } else {
    const axis = random() > 0.5 ? "x" : "z",
      dir = random() > 0.5 ? 100 : -100;
    a.tx = clamp(a.x + (axis === "x" ? dir : 0), -400, 400);
    a.tz = clamp(a.z + (axis === "z" ? dir : 0), -400, 400);
  }
}
function updateAgents(dt) {
  let shadowCars = 0;
  for (const a of agents) {
    a.stunned = Math.max(0, a.stunned - dt);
    a.hitTimer = Math.max(0, a.hitTimer - dt);
    a.mesh.visible = !a.police || a.patrol || heat > 0;
    if (!a.mesh.visible) continue;
    if (a === rival && !mission) continue;
    const target =
      a === rival && mission
        ? {
            x: mission.checkpoints[missionRivalStage][0],
            z: mission.checkpoints[missionRivalStage][1],
          }
        : a.police && heat > 0
          ? { x: clamp(car.x, -400, 400), z: clamp(car.z, -400, 400) }
          : null;
    if (Math.hypot(a.tx - a.x, a.tz - a.z) < 1) chooseNode(a, target);
    const oldX = a.x,
      oldZ = a.z;
    const dx = a.tx - a.x,
      dz = a.tz - a.z,
      length = Math.hypot(dx, dz);
    const speed =
      a.stunned > 0
        ? 0
        : a === rival
          ? 24
          : a.speed + (a.police ? heat * 2 : 0);
    if (length) {
      a.x += (dx / length) * Math.min(length, speed * dt);
      a.z += (dz / length) * Math.min(length, speed * dt);
      a.heading = Math.atan2(dx, dz);
    }
    a.mesh.position.set(a.x + (a.police || a === rival ? 0 : 3), 0, a.z);
    a.mesh.rotation.y = a.heading;
    if (a.bar) {
      a.bar.children[0].visible = Math.sin(elapsed * 17) > 0;
      a.bar.children[1].visible = !a.bar.children[0].visible;
    }
    const dim = a.mesh.userData.dimensions;
    vehicleBounds(
      a.mesh.position.x,
      a.mesh.position.z,
      a.heading,
      dim.width,
      dim.length,
      a.bounds,
    );
    const playerBox = vehicleBounds(
      car.x,
      car.z,
      car.heading,
      CLASSES[save.vehicle].width,
      CLASSES[save.vehicle].length,
    );
    if (a.bounds.intersectsBox(playerBox)) {
      // Agents cannot move through the player between physics substeps.
      a.x = oldX;
      a.z = oldZ;
      a.mesh.position.set(oldX + (a.police || a === rival ? 0 : 3), 0, oldZ);
      car.speed *= 0.45;
      car.vx *= 0.4;
      car.vz *= 0.4;
      if (!a.hitTimer) {
        a.hitTimer = 2;
        car.health = Math.max(0, car.health - (a.police ? 7 : 3));
        if (a.police) heat = Math.min(5, Math.max(1, heat + 1));
        flash("#eb4166");
      }
    }
    // At most two nearby traffic headlights cast spot shadows in high FX.
    const lamp = a.mesh.userData.headlight;
    lamp.visible =
      highFX && Math.hypot(a.x - car.x, a.z - car.z) < 65 && shadowCars++ < 2;
    lamp.castShadow = lamp.visible;
    lamp.shadow.mapSize.set(512, 512);
    if (
      a === rival &&
      reachedCheckpoint(a, mission.checkpoints[missionRivalStage])
    ) {
      missionRivalStage++;
      if (missionRivalStage >= mission.checkpoints.length) {
        finishMission(false, "Tuba Tone took the wager. Get that rematch.");
        return;
      }
    }
  }
}
// Race markers are non-solid: the route between checkpoints remains open.
const marker = new THREE.Group();
scene.add(marker);
const markerMaterial = new THREE.MeshBasicMaterial({
  color: "#ffc76b",
  transparent: true,
  opacity: 0.8,
});
const torus = new THREE.Mesh(
  new THREE.TorusGeometry(12, 0.13, 8, 64),
  markerMaterial,
);
torus.rotation.x = Math.PI / 2;
torus.position.y = 0.2;
marker.add(torus);
const beacon = new THREE.Mesh(
  new THREE.CylinderGeometry(0.35, 0.35, 65, 8),
  new THREE.MeshBasicMaterial({
    color: "#ffc76b",
    transparent: true,
    opacity: 0.2,
    depthWrite: false,
  }),
);
beacon.position.y = 32;
marker.add(beacon);
marker.visible = false;
const shockwave = new THREE.Mesh(
  new THREE.TorusGeometry(1, 0.02, 8, 64),
  new THREE.MeshBasicMaterial({
    color: "#80f6ec",
    transparent: true,
    opacity: 0.6,
  }),
);
shockwave.rotation.x = Math.PI / 2;
scene.add(shockwave);
shockwave.visible = false;
// One roadblock and spike strip is active in the flood pursuit.
const roadblock = new THREE.Group();
scene.add(roadblock);
roadblock.visible = false;
for (const x of [-6, 6]) {
  const m = createCar(CLASSES[0], "#152435", 0);
  m.userData.headlight.visible = false;
  m.userData.glow.visible = false;
  m.position.set(x, 0, 0);
  m.rotation.y = Math.PI / 2;
  lighting.register(m);
  roadblock.add(m);
}
roadblock.position.set(-300, 0, -300);
const spikes = new THREE.Group();
for (let x = -9; x <= 9; x += 1) {
  const m = new THREE.Mesh(
    new THREE.ConeGeometry(0.18, 0.35, 4),
    new THREE.MeshStandardMaterial({
      color: "#d0d8dd",
      metalness: 0.9,
      roughness: 0.2,
    }),
  );
  m.position.set(x, 0.2, 9);
  spikes.add(m);
}
roadblock.add(spikes);
let spikeCooldown = 0;
function updateRaceBoard() {
  $("race-list").replaceChildren();
  MISSIONS.forEach((m, i) => {
    const card = document.createElement("article");
    card.className = "race-card";
    card.style.setProperty("--crew", m.color);
    card.innerHTML = `<div><h3>${m.crew}</h3><h4>${m.name}</h4><p>${m.desc}</p><small>${m.boss} · ${save.wins[i] ? `${save.wins[i]} WINS` : "UNDEFEATED"} · $${m.reward.toLocaleString()} PAYOUT</small></div>`;
    const b = document.createElement("button");
    b.textContent = i === 2 ? "WAGER $500 ↗" : "ACCEPT RACE ↗";
    b.onclick = () => startMission(i);
    card.append(b);
    $("race-list").append(card);
  });
}
updateRaceBoard();
function startMission(index) {
  if (mission)
    return toast("Abandon your current race before starting another.");
  if (index === 2 && save.cash < 500)
    return toast("You need $500 for this wager.");
  if (index === 2) save.cash -= 500;
  mission = MISSIONS[index];
  missionIndex = index;
  stage = 0;
  missionRivalStage = 0;
  raceTime = mission.time;
  Object.assign(car, initialCar());
  safePosition = { x: 0, z: 20 };
  persist();
  if (index === 1) {
    heat = 4;
    storm = 1;
    nextStorm = elapsed + 180;
    roadblock.visible = true;
  }
  if (index === 2) {
    rival = makeAgent(0, 0);
    rival.speed = 24;
    rival.mesh.userData.paint.color.set("#d59cff");
  }
  markerMaterial.color.set(mission.color);
  beacon.material.color.set(mission.color);
  $("race-progress").hidden = false;
  $("abandon").hidden = false;
  $("mission-label").textContent = mission.crew;
  $("mission-title").textContent = mission.name;
  closePanel("race-board");
  toast(`${mission.name} · GO!`);
}
function finishMission(won, message) {
  if (won) {
    save.cash += mission.reward;
    save.rep += 350;
    save.wins[missionIndex]++;
    heat = Math.max(0, heat - 2);
    flash("#ffc76b");
  }
  if (rival) {
    const i = agents.indexOf(rival);
    if (i !== -1) agents.splice(i, 1);
    disposeCar(rival.mesh);
    rival = null;
  }
  toast(
    message ||
      (won
        ? `CREW DEFEATED · +$${mission.reward.toLocaleString()} · +350 REP`
        : "Race lost. The city always offers another shot."),
  );
  mission = null;
  missionIndex = -1;
  roadblock.visible = false;
  marker.visible = false;
  $("race-progress").hidden = true;
  $("abandon").hidden = true;
  $("mission-label").textContent = "THE CITY IS YOURS";
  $("mission-title").textContent = "Make a name for yourself.";
  $("mission-desc").innerHTML =
    "Open the race board to challenge a crew.<br>Click the map to set your own waypoint.";
  persist();
  updateRaceBoard();
}
$("abandon").onclick = () =>
  finishMission(false, "Race abandoned. Wager entry fees are not refunded.");
// Rain is camera-local to keep the open world uncaged by a weather volume.
const rainCount = 2600,
  rainPositions = new Float32Array(rainCount * 6);
for (let i = 0; i < rainCount; i++) {
  const k = i * 6;
  rainPositions[k] = (random() - 0.5) * 170;
  rainPositions[k + 1] = random() * 80;
  rainPositions[k + 2] = (random() - 0.5) * 170;
  rainPositions[k + 3] = rainPositions[k] + 0.3;
  rainPositions[k + 4] = rainPositions[k + 1] - 1.7;
  rainPositions[k + 5] = rainPositions[k + 2];
}
const rainGeometry = new THREE.BufferGeometry();
rainGeometry.setAttribute(
  "position",
  new THREE.BufferAttribute(rainPositions, 3),
);
const rain = new THREE.LineSegments(
  rainGeometry,
  new THREE.LineBasicMaterial({
    color: "#93bcd0",
    transparent: true,
    opacity: 0.22,
    depthWrite: false,
  }),
);
rain.frustumCulled = false;
scene.add(rain);
function updateWeather(dt) {
  if (elapsed > nextStorm && missionIndex !== 1) {
    storm = storm > 0.5 ? 0.25 : 1;
    nextStorm = elapsed + 35 + random() * 40;
    toast(
      storm > 0.5
        ? "Tropical downpour incoming. Watch for hydroplaning."
        : "Storm easing. Streets are still slick.",
    );
  }
  const amount = storm > 0.5 ? rainCount : Math.floor(rainCount * 0.35);
  rainGeometry.setDrawRange(0, amount * 2);
  for (let i = 0; i < amount; i++) {
    const k = i * 6;
    rainPositions[k + 1] -= dt * (40 + storm * 25);
    rainPositions[k] -= dt * 6;
    if (rainPositions[k + 1] < -5) {
      rainPositions[k + 1] = 80;
      rainPositions[k] = (random() - 0.5) * 170;
    }
    rainPositions[k + 3] = rainPositions[k] + 0.3;
    rainPositions[k + 4] = rainPositions[k + 1] - 1.7;
    rainPositions[k + 5] = rainPositions[k + 2];
  }
  rainGeometry.attributes.position.needsUpdate = true;
  rain.position.set(car.x, 0, car.z);
  if (storm > 0.5 && random() < dt * 0.018) flash("#bbc8ff");
  $("weather").textContent =
    `00:${String(42 + (Math.floor(elapsed / 60) % 18)).padStart(2, "0")} AM / ${storm > 0.5 ? "TROPICAL DOWNPOUR" : "LIGHT RAIN"}`;
}
// User-gesture Web Audio initialization; soundtrack files use a separate volume control.
let audio = null,
  drivingSound,
  beatClock = 0,
  beatIndex = 0;
function initAudio() {
  if (audio) return;
  audio = new (window.AudioContext || window.webkitAudioContext)();
  drivingSound = createDrivingSound(audio);
}
$("audio").onclick = async () => {
  try {
    initAudio();
    await audio.resume();
    audioEnabled = !audioEnabled;
    $("audio").textContent = audioEnabled ? "SOUND ON" : "SOUND OFF";
    $("audio").setAttribute("aria-pressed", String(audioEnabled));
  } catch {
    toast("Audio is not supported in this browser.");
  }
};
function drum(frequency, duration, volume, type = "sine") {
  const osc = audio.createOscillator(),
    gain = audio.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(frequency, audio.currentTime);
  osc.frequency.exponentialRampToValueAtTime(
    Math.max(28, frequency * 0.35),
    audio.currentTime + duration,
  );
  gain.gain.setValueAtTime(volume, audio.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, audio.currentTime + duration);
  osc.connect(gain);
  gain.connect(audio.destination);
  osc.start();
  osc.stop(audio.currentTime + duration);
  osc.onended = () => {
    osc.disconnect();
    gain.disconnect();
  };
}
function updateAudio(dt) {
  if (!audio) return;
  const on = audioEnabled && !isPaused();
  const nearestCop = Math.min(
    ...agents
      .filter((a) => a.police && a.mesh.visible)
      .map((a) => Math.hypot(a.x - car.x, a.z - car.z)),
  );
  drivingSound.update({ on, car, input, heat, nearestCop, time: elapsed });
  if (!on) return;
  beatClock += dt;
  if (beatClock > 60 / 106 / 2) {
    beatClock = 0;
    beatIndex++;
    if ([0, 3, 6].includes(beatIndex % 8)) drum(120, 0.18, 0.16);
    if (beatIndex % 4 === 2) drum(220, 0.09, 0.035, "triangle");
    drum(2700, 0.025, 0.007, "square");
  }
}
// Map is north-up. Pointer coordinates map exactly to the displayed city bounds.
const mapCanvas = $("map"),
  mapContext = mapCanvas.getContext("2d");
const mapBounds = { left: -660, top: -600, width: 2000, height: 1500 };
const mx = (x) => ((x - mapBounds.left) / mapBounds.width) * mapCanvas.width,
  mz = (z) => ((z - mapBounds.top) / mapBounds.height) * mapCanvas.height;
mapCanvas.onclick = (e) => {
  const r = mapCanvas.getBoundingClientRect();
  manualWaypoint = [
    mapBounds.left + ((e.clientX - r.left) / r.width) * mapBounds.width,
    mapBounds.top + ((e.clientY - r.top) / r.height) * mapBounds.height,
  ];
  toast("Waypoint set. Find your own line.");
};
mapCanvas.onkeydown = (e) => {
  if (e.key === "Delete" || e.key === "Backspace") {
    e.preventDefault();
    manualWaypoint = null;
  }
};
function drawMap() {
  const ctx = mapContext;
  ctx.clearRect(0, 0, 320, 240);
  ctx.fillStyle = "#0d1c25";
  ctx.fillRect(0, 0, 320, 240);
  ctx.fillStyle = "#102e3d";
  ctx.fillRect(mx(480), 0, 160, 240);
  ctx.strokeStyle = "#41545e";
  ctx.lineWidth = 2;
  for (let n = -400; n <= 400; n += 100) {
    ctx.beginPath();
    ctx.moveTo(mx(n), mz(-500));
    ctx.lineTo(mx(n), mz(500));
    ctx.moveTo(mx(-500), mz(n));
    ctx.lineTo(mx(480), mz(n));
    ctx.stroke();
  }
  ctx.strokeStyle = "#68808b";
  ctx.beginPath();
  for (const z of [-400, -370]) {
    ctx.moveTo(mx(450), mz(z));
    ctx.lineTo(mx(1230), mz(z));
  }
  ctx.stroke();
  ctx.font = "7px sans-serif";
  ctx.fillStyle = "#698590";
  ctx.fillText("FRENCH QUARTER", mx(-300), mz(50));
  ctx.fillText("MISSISSIPPI", mx(670), mz(60));
  ctx.fillText("I-10", mx(820), mz(-450));
  ctx.fillText("WAREHOUSE", mx(20), mz(350));
  ctx.fillText("N ↑", 295, 17);
  ctx.fillText("TREMÉ", mx(-330), mz(280));
  ctx.fillText("ST CLAUDE", mx(-350), mz(-270));
  ctx.fillText("NOLA EAST", mx(120), mz(-330));
  ctx.fillText("BAYOU", mx(-620), mz(-400));
  const dot = (x, z, color, radius) => {
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(mx(x), mz(z), radius, 0, Math.PI * 2);
    ctx.fill();
  };
  for (const h of SAFEHOUSES) {
    ctx.fillStyle = "#60edb5";
    ctx.fillRect(mx(h.x) - 2, mz(h.z) - 2, 4, 4);
  }
  for (const b of BOSSES) {
    dot(b.x, b.z, b.color, 3);
    ctx.fillStyle = b.color;
    ctx.fillText(b.name, mx(b.x) + 4, mz(b.z) - 3);
  }
  $("radar-coordinates").textContent =
    `X ${car.x.toFixed(0)} / Z ${car.z.toFixed(0)} · 8 SECTORS`;
  if (mission) {
    ctx.strokeStyle = mission.color + "66";
    ctx.lineWidth = 1;
    ctx.setLineDash([3, 3]);
    ctx.beginPath();
    ctx.moveTo(mx(car.x), mz(car.z));
    mission.checkpoints
      .slice(stage)
      .forEach((p) => ctx.lineTo(mx(p[0]), mz(p[1])));
    ctx.stroke();
    ctx.setLineDash([]);
    mission.checkpoints
      .slice(stage)
      .forEach((p, i) => dot(...p, i ? "#9f874f" : mission.color, i ? 2 : 4));
  }
  if (manualWaypoint) {
    dot(...manualWaypoint, "#b994ff", 4);
  }
  for (const a of agents)
    if (a.police && a.mesh.visible)
      dot(a.x, a.z, a.stunned ? "#536b80" : "#ff4d72", 2);
  if (rival) dot(rival.x, rival.z, "#df9fff", 3);
  ctx.save();
  ctx.translate(mx(car.x), mz(car.z));
  ctx.rotate(-car.heading);
  ctx.fillStyle = "#54f3d5";
  ctx.beginPath();
  ctx.moveTo(0, 6);
  ctx.lineTo(-4, -4);
  ctx.lineTo(4, -4);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
  $("waypoint-distance").textContent = manualWaypoint
    ? `${Math.round(Math.hypot(car.x - manualWaypoint[0], car.z - manualWaypoint[1]))} M`
    : "FREE ROAM";
}
function updateGameplay(dt) {
  elapsed += dt;
  toastTimer -= dt;
  if (toastTimer < 0) $("toast").classList.remove("show");
  for (const k of Object.keys(cooldown)) {
    cooldown[k] = Math.max(0, cooldown[k] - dt);
    active[k] = Math.max(0, active[k] - dt);
    $(k + "-cool").textContent =
      cooldown[k] > 0 ? `${Math.ceil(cooldown[k])}s` : "READY";
  }
  input = {
    throttle:
      (keys.has("w") || keys.has("arrowup") ? 1 : 0) -
      (keys.has("s") || keys.has("arrowdown") ? 1 : 0),
    steer:
      (keys.has("d") || keys.has("arrowright") ? 1 : 0) -
      (keys.has("a") || keys.has("arrowleft") ? 1 : 0) +
      joystickSteer,
    boost: keys.has("shift"),
    handbrake: keys.has(" "),
    brake: keys.has("s") && car.speed > 2,
  };
  input.steer = clamp(input.steer, -1, 1);
  const simDt = active.zone > 0 ? dt * 0.45 : dt;
  const flooded = storm > 0.5 && car.z < -150 && Math.abs(car.x) < 450;
  const movingBounds = agents
    .filter((a) => a.mesh.visible)
    .map((a) => {
      const dim = a.mesh.userData.dimensions;
      return vehicleBounds(
        a.mesh.position.x,
        a.mesh.position.z,
        a.heading,
        dim.width,
        dim.length,
        a.bounds,
      );
    });
  if (roadblock.visible)
    for (const x of [-306, -294])
      movingBounds.push(vehicleBounds(x, -300, Math.PI / 2, 2.4, 5.5));
  collisionQuery.setTraffic(movingBounds);
  for (let i = 0, count = Math.ceil(simDt * 120); i < count; i++) {
    const result = stepCar(
      car,
      input,
      CLASSES[save.vehicle],
      simDt / count,
      storm,
      (x, z, h, w, l) => collisionQuery.intersects(x, z, h, w, l),
      save.upgrades,
    );
    player.userData.flames.visible = result.boost;
    if (result.impact > 12) flash("#f65b76");
  }
  if (flooded && save.vehicle !== 2 && Math.abs(car.speed) > 25)
    car.speed *= 1 - dt * 0.15;
  const nearestCop = Math.min(
    ...agents
      .filter((a) => a.police && a.mesh.visible)
      .map((a) => Math.hypot(a.x - car.x, a.z - car.z)),
  );
  const previousHeat = heat;
  heatState = advanceHeat(
    { ...heatState, heat },
    {
      speed: car.speed,
      drifting: input.handbrake,
      nearestCop,
      force: missionIndex === 1 ? 4 : 0,
    },
    dt,
  );
  heat = heatState.heat;
  if (heat > previousHeat)
    toast(`NOPD / WANTED ${heat} · Lose visual contact to escape.`);
  syncInterceptors();
  updateAgents(simDt);
  spikeCooldown = Math.max(0, spikeCooldown - dt);
  if (
    roadblock.visible &&
    Math.abs(car.x + 300) < 13 &&
    Math.abs(car.z + 300) < 12 &&
    !spikeCooldown
  ) {
    car.speed *= 0.35;
    car.health = Math.max(0, car.health - 18);
    spikeCooldown = 4;
    flash("#f65b76");
    toast("ROADBLOCK · spike strip damage!");
  }
  if (car.health <= 0) {
    if (mission)
      finishMission(false, "Ride disabled. Recovering to the Eastbank.");
    save.cash = Math.max(0, save.cash - 300);
    persist();
    safePosition = { x: 0, z: 20 };
    car.health = 50;
    heat = 0;
    heatState = { heat: 0, evidence: 0, escape: 0 };
    recover();
  }
  // River is a physical hazard, not an invisible map boundary.
  const onBridge =
    (Math.abs(car.z + 400) < 9 || Math.abs(car.z + 370) < 9) && car.x < 1230;
  if (car.x > 485 && car.x < 1380 && !onBridge) recover(true);
  safeTimer += dt;
  if (
    safeTimer > 2 &&
    car.x < 470 &&
    Math.abs(car.x % 100) < 9 &&
    Math.abs(car.speed) < 25
  ) {
    safePosition = { x: car.x, z: car.z };
    safeTimer = 0;
  }
  if (mission) {
    raceTime -= dt;
    $("race-time").textContent = `${Math.max(0, raceTime).toFixed(1)}s`;
    $("checkpoint-count").textContent =
      `${stage + 1} / ${mission.checkpoints.length} CHECKPOINTS`;
    $("mission-desc").textContent =
      missionIndex === 2
        ? "Beat Tuba Tone to the final checkpoint."
        : missionIndex === 1
          ? "Rising water. Roadblocks. Keep moving."
          : "Find your line. Every shortcut counts.";
    if (raceTime <= 0)
      finishMission(false, "Time is up. Tune your ride and try a new line.");
    else if (reachedCheckpoint(car, mission.checkpoints[stage])) {
      stage++;
      flash("#ffc76b");
      if (stage === mission.checkpoints.length) finishMission(true);
      else toast(`CHECKPOINT ${stage} · +5 SECONDS`);
      if (mission) raceTime += 5;
    }
  }
  const target = mission ? mission.checkpoints[stage] : manualWaypoint;
  marker.visible = Boolean(target);
  if (target) {
    marker.position.set(target[0], 0, target[1]);
    beacon.material.opacity = 0.14 + Math.sin(elapsed * 3) * 0.06;
  }
  if (!mission && manualWaypoint && reachedCheckpoint(car, manualWaypoint)) {
    manualWaypoint = null;
    toast("Waypoint reached. Where to next?");
  }
  hop = Math.max(0, hop - dt * 1.5);
  const data = player.userData;
  player.position.set(car.x, 0.03, car.z);
  player.rotation.y = car.heading;
  data.bodyGroup.position.y =
    (save.stance === 1 ? -0.13 : save.stance === 2 ? 0.12 : 0) +
    Math.sin(hop * Math.PI) * 1.2;
  data.bodyGroup.rotation.z =
    -input.steer * Math.min(Math.abs(car.speed) / 65, 1) * 0.07 +
    (hop > 0 ? Math.sin(hop * Math.PI) * 0.12 : 0);
  data.wheels.forEach(
    (w) =>
      (w.rotation.x += ((car.speed * dt) / 0.5) * (save.rims === 2 ? 1.5 : 1)),
  );
  data.glow.visible = save.glow;
  data.glow.intensity = 12 + Math.sin(elapsed * 3) * 4;
  shockwave.visible = active.roar > 0;
  if (shockwave.visible) {
    shockwave.position.set(car.x, 0.2, car.z);
    const radius = (1.2 - active.roar) * 60;
    shockwave.scale.setScalar(radius);
    shockwave.material.opacity = active.roar / 1.2;
  }
  smoke.update(simDt, car, input, player.userData.flames.visible);
  pedestrians.update(simDt, car);
  world.setWet(storm, car);
  updateWeather(dt);
  $("district").textContent = getDistrict(car.x, car.z);
  $("cash").textContent = `$${save.cash.toLocaleString()}`;
  $("rep").textContent = `${save.rep.toLocaleString()} REP`;
  $("speed").textContent = Math.round(Math.abs(car.speed) * 2.237)
    .toString()
    .padStart(3, "0");
  $("gear").textContent =
    car.speed < -1
      ? "R"
      : car.speed < 1
        ? "N"
        : Math.min(6, 1 + Math.floor(car.speed / 13));
  $("car-name").textContent = CLASSES[save.vehicle].model.toUpperCase();
  $("health").value = car.health;
  $("health-value").textContent = `${Math.round(car.health)}%`;
  $("nitro").value = car.nitro;
  $("heat").textContent = Array.from({ length: 5 }, (_, i) =>
    i < Math.floor(heat) ? "★" : "☆",
  ).join(" ");
  $("zone-status").textContent =
    active.zone > 0
      ? "ZONE / TIME DILATION"
      : flooded
        ? "FLASH FLOOD / LOW TRACTION"
        : heat >= 1
          ? `PURSUIT / HEAT ${Math.floor(heat)}`
          : save.rep >= 1050
            ? "CRESCENT CITY ROYALTY"
            : "EASTBANK UNDERGROUND";
  const safe = SAFEHOUSES.find(
    (h) => Math.hypot(h.x - car.x, h.z - car.z) < 18,
  );
  if (safe && !mission && heat === 0 && Math.abs(car.speed) < 1) {
    car.health = Math.min(100, car.health + dt * 5);
    car.nitro = Math.min(100, car.nitro + dt * 15);
  }
  drawMap();
}
function updateCamera(dt) {
  cockpit.update(car, input);
  player.visible = true;
  player.userData.bodyGroup.visible = !cockpit.enabled;
  if (cockpit.enabled) return;
  const speedFactor = Math.abs(car.speed) / 80;
  cameraTarget.set(
    car.x - Math.sin(car.heading) * (11 + speedFactor * 6),
    5.4 + speedFactor * 2.2,
    car.z - Math.cos(car.heading) * (11 + speedFactor * 6),
  );
  follow.lerp(cameraTarget, 1 - Math.exp(-dt * 5));
  camera.position.copy(follow);
  lookAt.set(
    car.x + Math.sin(car.heading) * 7,
    1.4,
    car.z + Math.cos(car.heading) * 7,
  );
  camera.lookAt(lookAt);
  camera.fov = THREE.MathUtils.lerp(
    camera.fov,
    62 + speedFactor * 12 + (input.boost ? 6 : 0),
    Math.min(1, dt * 3),
  );
  camera.updateProjectionMatrix();
}
function animate() {
  requestAnimationFrame(animate);
  const dt = Math.min(clock.getDelta(), 0.05);
  if (!started) {
    const time = performance.now() / 1000;
    player.position.set(car.x, 0, car.z);
    player.rotation.y = car.heading;
    camera.position.set(
      car.x + 12 + Math.sin(time * 0.12) * 4,
      4.8,
      car.z + 11,
    );
    camera.lookAt(car.x, 1.2, car.z);
  } else if (!isPaused()) {
    updateGameplay(dt);
    updateCamera(dt);
  }
  phone.pause(
    !started ||
      Boolean(document.querySelector("dialog[open]:not(#phone)")) ||
      document.hidden,
  );
  updateAudio(dt);
  lighting.update(car);
  if (started) cockpit.renderMirror(dt, car, player, world.reflection);
  if (highFX) composer.render();
  else renderer.render(scene, camera);
}
addEventListener("resize", () => {
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight);
  composer.setSize(innerWidth, innerHeight);
  lighting.resize();
});
$("world").addEventListener("webglcontextlost", (e) => {
  e.preventDefault();
  if (started && !isPaused()) openPanel("pause-menu");
  toast("Graphics context lost. Reload the page to resume your saved build.");
});
animate();
