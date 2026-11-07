const { chromium } = require("playwright");
const assert = require("node:assert/strict");
const { tmpdir } = require("node:os");
const { join } = require("node:path");
let browser;
(async () => {
  browser = await chromium.launch({
    headless: true,
    args: [
      "--no-sandbox",
      "--use-angle=swiftshader",
      "--enable-unsafe-swiftshader",
    ],
  });
  const page = await browser.newPage({
    viewport: { width: 800, height: 600 },
  });
  page.setDefaultTimeout(60000);
  const errors = [];
  page.on("pageerror", (e) => errors.push(String(e)));
  page.on("console", (m) => {
    if (m.type() === "error") errors.push(m.text());
  });
  await page.goto(process.env.BASE_URL || "http://localhost:4173");
  await page.waitForTimeout(2500);
  await page.screenshot({ path: join(tmpdir(), "crescent-city-title.png") });
  console.log("Title rendered");
  assert.equal(await page.locator("#start").isVisible(), true);
  await page.click("#start");
  await page.click("#quality");
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.keyboard.down("w");
  await page.waitForTimeout(3500);
  await page.keyboard.up("w");
  assert.ok(
    Number(await page.locator("#speed").innerText()) > 0,
    "car accelerates",
  );
  await page.click("#garage-button");
  await page.getByRole("button", { name: "Bayou Tuner" }).click();
  await page.selectOption("#stance", "2");
  await page.getByRole("button", { name: "Paint teal", exact: true }).click();
  await page.getByRole("button", { name: "$700 ↗" }).first().click();
  await page.click('[data-close="garage"]');
  const saved = await page.evaluate(() =>
    JSON.parse(localStorage.getItem("crescent-city-save")),
  );
  assert.equal(saved.vehicle, 1);
  assert.equal(saved.stance, 2);
  assert.equal(saved.color, 1);
  assert.equal(saved.upgrades.engine, 1);
  assert.equal(saved.cash, 800);
  console.log("Garage and saving passed");
  await page.click("#missions-button");
  await page.locator(".race-card button").nth(1).click();
  assert.equal(
    await page.locator("#mission-title").innerText(),
    "Flash Flood Escape",
  );
  await page.locator('[data-ability="zone"]').click();
  await page.waitForTimeout(500);
  await page.waitForFunction(
    () => document.getElementById("zone-cool").textContent !== "READY",
  );
  await page.locator("#abandon").click();
  await page.click("#map", { position: { x: 200, y: 90 } });
  await page.waitForFunction(
    () =>
      document.getElementById("waypoint-distance").textContent !== "FREE ROAM",
  );
  await page.keyboard.press("p");
  assert.equal(await page.locator("#pause-menu").isVisible(), true);
  await page.keyboard.press("Escape");
  await page.click("#audio");
  assert.equal(
    await page.locator("#audio").getAttribute("aria-pressed"),
    "true",
  );
  await page.click("#audio");
  await page.screenshot({ path: join(tmpdir(), "crescent-city-gameplay.png") });
  await page.setViewportSize({ width: 800, height: 600 });
  await page.reload();
  await page.click("#start");
  await page.click("#quality");
  await page.click("#garage-button");
  assert.equal(await page.locator("#stance").inputValue(), "2");
  await page.click('[data-close="garage"]');
  await page.setViewportSize({ width: 390, height: 844 });
  await page.evaluate(() => document.body.classList.add("touch"));
  await page.screenshot({ path: join(tmpdir(), "crescent-city-mobile.png") });
  assert.equal(await page.locator("#touch").isVisible(), true);
  const gas = await page.locator('[data-key="w"]').boundingBox();
  await page.mouse.move(gas.x + 20, gas.y + 20);
  await page.mouse.down();
  await page.waitForTimeout(1500);
  await page.mouse.up();
  await page.waitForFunction(
    () => Number(document.getElementById("speed").textContent) > 0,
  );
  assert.deepEqual(errors, [], "no browser runtime errors");
  console.log(
    "PASS desktop: launch, acceleration, garage, upgrade, persistence, mission, ability, abandon, waypoint, pause; mobile: layout and controls visible.",
  );
  await browser.close();
})().catch(async (e) => {
  console.error(e);
  if (browser) await browser.close();
  process.exitCode = 1;
});
