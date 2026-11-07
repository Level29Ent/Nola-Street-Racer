import { Box3, Vector3 } from "three";
export const SECTORS = [
  "FRENCH QUARTER",
  "ST. CLAUDE AVENUE",
  "TREMÉ",
  "WAREHOUSE DISTRICT",
  "MISSISSIPPI RIVERFRONT",
  "I-10 / TWIN SPAN",
  "BAYOU / BACKROAD LEVEES",
  "NEW ORLEANS EAST",
];
export const SAFEHOUSES = [
  { name: "Eastbank Customs", x: 0, z: 20 },
  { name: "Tremé Hideout", x: -200, z: 200 },
  { name: "Port Garage", x: 400, z: 300 },
];
export const BOSSES = [
  { name: "Vance", x: -200, z: -200, color: "#40e8d0" },
  { name: "Gator", x: 400, z: 200, color: "#ffc76b" },
  { name: "Tuba Tone", x: -100, z: 200, color: "#d59cff" },
];
export function vehicleBounds(x, z, heading, width, length, out = new Box3()) {
  const c = Math.abs(Math.cos(heading)),
    s = Math.abs(Math.sin(heading));
  const hx = (width * c + length * s) / 2,
    hz = (width * s + length * c) / 2;
  out.min.set(x - hx, 0.1, z - hz);
  out.max.set(x + hx, 2.2, z + hz);
  return out;
}
export function staticBounds(b) {
  return new Box3(
    new Vector3(b.x - b.w / 2, 0, b.z - b.d / 2),
    new Vector3(b.x + b.w / 2, b.h || 30, b.z + b.d / 2),
  );
}
export function createCollisionQuery(obstacles) {
  const fixed = obstacles.map(staticBounds),
    probe = new Box3();
  let moving = [];
  return {
    setTraffic(traffic) {
      moving = traffic;
    },
    intersects(x, z, heading, width, length) {
      vehicleBounds(x, z, heading, width, length, probe);
      return (
        fixed.some((b) => probe.intersectsBox(b)) ||
        moving.some((b) => probe.intersectsBox(b))
      );
    },
  };
}
// Police must actually witness an offense. Once wanted, reinforcements maintain pressure.
export function advanceHeat(
  state,
  { speed, drifting, nearestCop, force = 0 },
  dt,
) {
  let { heat = 0, evidence = 0, escape = 0 } = state;
  const witnessed =
    nearestCop < 130 &&
    (Math.abs(speed) > 29 || (drifting && Math.abs(speed) > 9));
  evidence = witnessed ? evidence + dt : Math.max(0, evidence - dt * 0.6);
  if (evidence >= 2) {
    heat = Math.min(5, Math.max(1, heat + 1));
    evidence = 0;
  }
  escape = heat > 0 && nearestCop > 180 ? escape + dt : 0;
  if (escape >= 7) {
    heat = Math.max(0, heat - 1);
    escape = 0;
  }
  return { heat: Math.max(force, heat), evidence, escape };
}
export function interceptorCount(heat) {
  return heat > 0 ? Math.min(7, 3 + Math.floor(heat) - 1) : 0;
}
export function pursuitSpawn(car, index) {
  // Spawn on the nearest drivable grid segment, behind the player's travel direction.
  let x = car.x - Math.sin(car.heading) * (65 + index * 24),
    z = car.z - Math.cos(car.heading) * (65 + index * 24);
  if (Math.abs(Math.sin(car.heading)) > Math.abs(Math.cos(car.heading)))
    z = Math.round(z / 100) * 100;
  else x = Math.round(x / 100) * 100;
  return {
    x: Math.max(-400, Math.min(400, x)),
    z: Math.max(-400, Math.min(400, z)),
  };
}
export function joystickAxis(dx, radius) {
  return Math.max(-1, Math.min(1, dx / radius));
}
