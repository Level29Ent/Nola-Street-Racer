export const CLASSES = [
  {
    id: "donk",
    name: "Dirty South",
    model: "Crescent Classic",
    tag: "HEAVY MUSCLE / DONK",
    acceleration: 23,
    maxSpeed: 65,
    grip: 2.4,
    clearance: 0.32,
    width: 2.4,
    length: 5.5,
    price: 0,
  },
  {
    id: "tuner",
    name: "Bayou Tuner",
    model: "Satsuma R-34",
    tag: "TURBO / PRECISION",
    acceleration: 21,
    maxSpeed: 72,
    grip: 3.5,
    clearance: 0.14,
    width: 2.1,
    length: 4.6,
    price: 0,
  },
  {
    id: "truck",
    name: "Swamp Truck",
    model: "Levee Runner",
    tag: "AWD / FLOOD SPECIALIST",
    acceleration: 18,
    maxSpeed: 60,
    grip: 2.8,
    clearance: 0.7,
    width: 2.7,
    length: 5.6,
    price: 0,
  },
  {
    id: "exotic",
    name: "River Exotic",
    model: "Specter V12",
    tag: "SUPERCAR / HIGH SPEED",
    acceleration: 26,
    maxSpeed: 82,
    grip: 3.1,
    clearance: 0.1,
    width: 2.3,
    length: 4.9,
    price: 6000,
  },
];
export const COLORS = [
  "#ab29ff",
  "#1ddbc2",
  "#e2345e",
  "#efb951",
  "#237bff",
  "#eeeeee",
];
export const MISSIONS = [
  {
    id: "levee",
    name: "Levee Sprint",
    crew: "BAYOU MUD MILITIA",
    boss: "“Gator” Gauthier",
    desc: "Follow the river. Cut through the yards. Beat the clock.",
    time: 120,
    reward: 1800,
    checkpoints: [
      [100, 0],
      [300, 0],
      [300, -300],
      [400, -300],
      [400, 200],
    ],
    color: "#ffc76b",
  },
  {
    id: "flood",
    name: "Flash Flood Escape",
    crew: "ST. CLAUDE SYNDICATE",
    boss: "“Vieux Carré” Vance",
    desc: "Survive the downpour and reach the bridge with the police on your tail.",
    time: 150,
    reward: 2400,
    checkpoints: [
      [0, -200],
      [-300, -200],
      [-300, -400],
      [200, -400],
      [400, -400],
      [600, -400],
    ],
    color: "#40e8d0",
  },
  {
    id: "clash",
    name: "Sound System Clash",
    crew: "BRASS BAND BOOSTERS",
    boss: "Tuba Tone",
    desc: "A $500 wager. Beat Tone through Tremé and the Warehouse District.",
    time: 120,
    reward: 3000,
    checkpoints: [
      [-200, 0],
      [-200, 200],
      [100, 200],
      [100, 400],
      [300, 400],
    ],
    color: "#d59cff",
  },
];
export const clamp = (n, a, b) => Math.min(b, Math.max(a, n));
export function initialCar() {
  return {
    x: 0,
    z: 20,
    heading: Math.PI,
    speed: 0,
    vx: 0,
    vz: 0,
    nitro: 100,
    health: 100,
  };
}
export function collide(x, z, boxes, radius = 1.6) {
  return boxes.some(
    (b) =>
      x > b.x - b.w / 2 - radius &&
      x < b.x + b.w / 2 + radius &&
      z > b.z - b.d / 2 - radius &&
      z < b.z + b.d / 2 + radius,
  );
}
// dt is capped and the renderer substeps at 120 Hz to avoid tunneling at racing speed.
export function stepCar(
  car,
  input,
  vehicle,
  dt,
  wet,
  boxes = [],
  upgrades = {},
) {
  const t = clamp(dt, 0, 1 / 60);
  const boost = input.boost && car.nitro > 0 && input.throttle > 0;
  const engine = 1 + (upgrades.engine || 0) * 0.12;
  const max = vehicle.maxSpeed * engine * (boost ? 1.38 : 1);
  let acceleration =
    input.throttle * vehicle.acceleration * engine * (boost ? 1.7 : 1);
  if (input.brake) acceleration -= Math.sign(car.speed) * 48;
  if (input.throttle < 0 && car.speed > 1) acceleration -= 24;
  car.speed = clamp(
    car.speed + (acceleration - car.speed * 0.16) * t,
    -15,
    max,
  );
  if (Math.abs(car.speed) < 0.07 && !input.throttle) car.speed = 0;
  const speedRatio = Math.min(Math.abs(car.speed) / 16, 1);
  const grip =
    vehicle.grip *
    (1 + (upgrades.tires || 0) * 0.15) *
    (1 - wet * (vehicle.id === "truck" ? 0.14 : 0.44));
  car.heading -=
    input.steer *
    speedRatio *
    (input.handbrake ? 2.5 : 1.45) *
    Math.sign(car.speed) *
    t;
  const targetX = Math.sin(car.heading) * car.speed;
  const targetZ = Math.cos(car.heading) * car.speed;
  const traction = Math.min(1, grip * (input.handbrake ? 0.35 : 1) * t);
  car.vx += (targetX - car.vx) * traction;
  car.vz += (targetZ - car.vz) * traction;
  let impact = 0;
  const nx = car.x + car.vx * t,
    nz = car.z + car.vz * t;
  const hits = (x, z) =>
    typeof boxes === "function"
      ? boxes(x, z, car.heading, vehicle.width, vehicle.length)
      : collide(x, z, boxes);
  if (hits(nx, nz)) {
    impact = Math.hypot(car.vx, car.vz);
    // Resolve independently to allow sliding along a facade.
    if (!hits(nx, car.z)) car.x = nx;
    if (!hits(car.x, nz)) car.z = nz;
    car.speed *= -0.24;
    car.vx *= -0.3;
    car.vz *= -0.3;
    car.health = Math.max(0, car.health - impact * 0.32);
  } else {
    car.x = nx;
    car.z = nz;
  }
  car.nitro = clamp(
    car.nitro + (boost ? -24 : 8 + (upgrades.nitro || 0) * 2) * t,
    0,
    100,
  );
  return { boost, impact };
}
export function reachedCheckpoint(car, point) {
  return Math.hypot(car.x - point[0], car.z - point[1]) < 19;
}
export function defaultSave() {
  return {
    version: 1,
    cash: 1500,
    rep: 0,
    vehicle: 0,
    color: 0,
    rims: 1,
    stance: 0,
    glow: true,
    upgrades: { engine: 0, tires: 0, nitro: 0 },
    wins: [0, 0, 0],
    owned: [0, 1, 2],
  };
}
export function loadSave(raw) {
  const base = defaultSave();
  try {
    const data = JSON.parse(raw);
    if (data?.version !== 1) return base;
    for (const k of ["cash", "rep"])
      if (Number.isFinite(data[k])) base[k] = clamp(data[k], 0, 1e9);
    for (const [key, max] of [
      ["vehicle", 3],
      ["color", 5],
      ["rims", 2],
      ["stance", 2],
    ])
      if (Number.isInteger(data[key])) base[key] = clamp(data[key], 0, max);
    if (typeof data.glow === "boolean") base.glow = data.glow;
    for (const k of ["engine", "tires", "nitro"])
      if (Number.isInteger(data.upgrades?.[k]))
        base.upgrades[k] = clamp(data.upgrades[k], 0, 3);
    if (Array.isArray(data.wins))
      base.wins = base.wins.map((_, i) =>
        clamp(Math.floor(Number(data.wins[i])) || 0, 0, 999),
      );
    if (Array.isArray(data.owned) && data.owned.includes(3)) base.owned.push(3);
    if (!base.owned.includes(base.vehicle)) base.vehicle = 0;
  } catch {
    /* Private mode, corrupt saves and older saves fall back safely. */
  }
  return base;
}
