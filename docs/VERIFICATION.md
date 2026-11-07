# Verification

## Recorded result — 2026-11-07

- Production build: **PASS** (Vite 7.3.7; bundle-size advisory only).
- Simulation regressions: **6/6 PASS**.
- Local Chromium production-bundle smoke test: **PASS**, including sound toggling and pointer-operated mobile gas control; no JavaScript or console errors.
- Hosted deployment: **not performed**.

## Automated simulation checks

`npm test` runs six Node tests covering:

1. Acceleration and speed caps for all four vehicle classes.
2. Nitrous consumption, stronger acceleration and recharge.
3. Building collision separation and impact damage.
4. Wet traction degradation.
5. Open-direction checkpoint distance detection.
6. Save validation, corrupted-data fallback and owned-vehicle restoration.

## Browser smoke check

The included Playwright script exercises the actual application, not a mocked renderer. Install Chromium once:

```sh
npm ci
npx playwright install chromium
npm run dev -- --port 4173
```

In a second terminal:

```sh
npm run test:browser
```

For a production-bundle check, run `npm run build`, then `npm run preview -- --port 4173` instead of the dev server. Set `BASE_URL` to use a different localhost port. Use a fresh browser context: the script expects the starting $1,500 balance.

The script covers entry, keyboard acceleration, FX toggle, garage class/paint/suspension selection, buying an engine upgrade, balance deduction, saved-state reload, accepting Flash Flood Escape, Zone activation, abandoning the race, map waypoint setting, pause/resume, and a 390×844 layout with pointer-operated gas control. It rejects JavaScript runtime errors and console errors and saves three PNGs in the operating system temporary directory.

For sandbox repeatability it uses headless Chromium with software WebGL and no browser sandbox. Those flags are **test-only**, not instructions for everyday browsing. Software rendering is much slower than a real GPU. This is not a frame-rate benchmark or verification on an actual phone.

## Not covered

- A complete human-played win through every race, the full cash/REP progression loop, and all pursuit edge cases.
- Browser/device compatibility beyond the local Chromium check, real mobile GPU performance or controller support.
- Audio quality or suitability for a commercial soundtrack.
- A Vercel deployment or any other hosted runtime. No public deployment was created.

The build emits an advisory about the approximately 506 kB minified Three.js core chunk (about 130 kB gzip); this is not a build failure. The application separates its own code and effects for caching, but still needs a future performance pass for low-end mobile hardware.
