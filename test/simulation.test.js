import { test } from "node:test";
import assert from "node:assert/strict";
import {
  CLASSES,
  initialCar,
  stepCar,
  collide,
  loadSave,
  defaultSave,
  reachedCheckpoint,
} from "../src/simulation.js";
const input = { throttle: 1, steer: 0 };
function drive(vehicle, wet = 0, options = input) {
  const car = initialCar();
  for (let i = 0; i < 1200; i++) stepCar(car, options, vehicle, 1 / 120, wet);
  return car;
}
test("all four classes accelerate and remain speed-limited", () => {
  for (const v of CLASSES) {
    const car = drive(v);
    assert.ok(Math.abs(car.z - 20) > 200);
    assert.ok(car.speed <= v.maxSpeed);
    assert.ok(car.speed > 40);
  }
});
test("nitrous consumes charge, accelerates faster, and recharges", () => {
  const boosted = drive(CLASSES[0], 0, { ...input, boost: true });
  assert.ok(boosted.nitro >= 0 && boosted.nitro < 100);
  const c = initialCar();
  stepCar(c, { ...input, boost: true }, CLASSES[0], 1 / 120, 0);
  assert.ok(c.nitro < 100);
  const speed = c.speed;
  const normal = initialCar();
  stepCar(normal, input, CLASSES[0], 1 / 120, 0);
  assert.ok(speed > normal.speed);
  stepCar(c, {}, CLASSES[0], 1 / 60, 0);
  assert.ok(c.nitro > 99.8);
});
test("building collision prevents penetrating the facade and damages car", () => {
  const car = initialCar();
  car.heading = 0;
  const boxes = [{ x: 0, z: 65, w: 30, d: 15 }];
  let hit = false;
  for (let i = 0; i < 600; i++) {
    const r = stepCar(car, input, CLASSES[0], 1 / 120, 0, boxes);
    if (r.impact) hit = true;
    assert.equal(collide(car.x, car.z, boxes), false);
  }
  assert.ok(hit);
  assert.ok(car.health < 100);
});
test("storm reduces traction more on sedans than trucks", () => {
  for (const v of [CLASSES[0], CLASSES[2]]) {
    const dry = drive(v);
    const wet = drive(v, 1);
    assert.ok(Math.abs(wet.z) < Math.abs(dry.z));
  }
});
test("checkpoint uses distance, not a fixed road or direction", () => {
  assert.ok(reachedCheckpoint({ x: 10, z: 10 }, [0, 0]));
  assert.ok(!reachedCheckpoint({ x: 30, z: 0 }, [0, 0]));
});
test("save validates untrusted storage and keeps purchases", () => {
  assert.deepEqual(loadSave("{bad"), defaultSave());
  const save = loadSave(
    JSON.stringify({
      version: 1,
      cash: -999,
      vehicle: 99,
      color: -4,
      owned: [],
      upgrades: { engine: 1000 },
    }),
  );
  assert.equal(save.cash, 0);
  assert.equal(save.vehicle, 0);
  assert.equal(save.color, 0);
  assert.equal(save.upgrades.engine, 3);
  assert.equal(
    loadSave(
      JSON.stringify({ ...defaultSave(), owned: [0, 1, 2, 3], vehicle: 3 }),
    ).vehicle,
    3,
  );
});
