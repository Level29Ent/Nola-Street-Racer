import { test } from "node:test";
import assert from "node:assert/strict";
import {
  vehicleBounds,
  staticBounds,
  createCollisionQuery,
  advanceHeat,
  interceptorCount,
  pursuitSpawn,
  joystickAxis,
  SECTORS,
} from "../src/dynamics.js";
import { initialCar, CLASSES, stepCar } from "../src/simulation.js";
test("rotated vehicle Box3 respects full car length and width", () => {
  const b = vehicleBounds(0, 0, Math.PI / 2, 2, 6);
  assert.ok(Math.abs(b.max.x - 3) < 1e-6);
  assert.ok(Math.abs(b.max.z - 1) < 1e-6);
});
test("Box3 catches poles, buildings and dynamic traffic, and traffic can be removed", () => {
  const query = createCollisionQuery([{ x: 0, z: 10, w: 0.4, d: 0.4, h: 6 }]);
  assert.ok(query.intersects(0, 7.4, 0, 2, 5.5));
  assert.equal(query.intersects(5, 7.4, 0, 2, 5.5), false);
  query.setTraffic([vehicleBounds(5, 0, 0, 2, 5)]);
  assert.ok(query.intersects(5, 3, 0, 2, 5));
  query.setTraffic([]);
  assert.equal(query.intersects(5, 3, 0, 2, 5), false);
});
test("substepped car cannot tunnel through pole or stationary traffic at high speed", () => {
  for (const obstacle of [
    { x: 0, z: 20, w: 0.4, d: 0.4, h: 6 },
    { x: 0, z: 20, w: 2.4, d: 5.5, h: 3 },
  ]) {
    const car = initialCar();
    car.z = 0;
    car.heading = 0;
    car.speed = car.vz = 80;
    const q = createCollisionQuery([obstacle]);
    let hit = false;
    for (let i = 0; i < 60; i++) {
      const r = stepCar(
        car,
        { throttle: 1, steer: 0 },
        CLASSES[0],
        1 / 120,
        0,
        (...args) => q.intersects(...args),
      );
      if (r.impact) hit = true;
    }
    assert.ok(hit);
    assert.ok(car.z < 20);
    assert.ok(car.health < 100);
  }
});
test("unwitnessed speeding never creates heat; witnessed speeding or drift does", () => {
  let state = {};
  for (let i = 0; i < 200; i++)
    state = advanceHeat(state, { speed: 50, nearestCop: 300 }, 0.1);
  assert.equal(state.heat, 0);
  for (let i = 0; i < 21; i++)
    state = advanceHeat(
      state,
      { speed: 12, drifting: true, nearestCop: 60 },
      0.1,
    );
  assert.equal(state.heat, 1);
  assert.equal(interceptorCount(state.heat), 3);
});
test("heat caps at five and decays only after losing nearby units", () => {
  let s = { heat: 4 };
  for (let i = 0; i < 150; i++)
    s = advanceHeat(s, { speed: 50, nearestCop: 20 }, 0.1);
  assert.equal(s.heat, 5);
  assert.equal(interceptorCount(5), 7);
  for (let i = 0; i < 80; i++)
    s = advanceHeat(s, { speed: 0, nearestCop: 300 }, 0.1);
  assert.equal(s.heat, 4);
  assert.equal(interceptorCount(0), 0);
  assert.equal(
    advanceHeat({ heat: 0 }, { speed: 0, nearestCop: 999, force: 4 }, 0.1).heat,
    4,
  );
});
test("reinforcements spawn behind the car on a drivable grid segment", () => {
  const car = { x: 0, z: 0, heading: 0 };
  const p = pursuitSpawn(car, 0);
  assert.equal(p.x, 0);
  assert.ok(p.z < 0);
});
test("joystick clamps both directions and map defines eight sectors", () => {
  assert.equal(joystickAxis(1000, 30), 1);
  assert.equal(joystickAxis(-1000, 30), -1);
  assert.equal(joystickAxis(0, 30), 0);
  assert.equal(SECTORS.length, 8);
});
