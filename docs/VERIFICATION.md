# Verification

## Nightlife upgrade validation

Local production-bundle checks passed: 13/13 unit tests and the extended Chromium smoke flow (Low FX, 1280×800 desktop layout and 390×844 touch layout). Headless software rendering is slow and is not a hardware performance claim.

- Unit tests now cover rotated Box3 bounds, poles/buildings/traffic, high-speed substeps, witnessed offenses, five-star cap/escape, interceptor counts/spawn placement and joystick limits in addition to the baseline tests (13 total).
- Browser smoke coverage now also includes cockpit toggle/mirror rendering, music phone and a local WAV playlist import, wanted stars, eight-sector coordinates, joystick pointer-cancel reset, and Exit driving.
- Production build is checked with `npm run build`; Three.js still emits a bundle-size advisory.
- Headless software rendering is not a mobile frame-rate benchmark. Real iOS/Android hardware, full race wins, long police chases, audio quality and official media assets remain unverified or unavailable.

## Automated simulation checks

`npm test` runs thirteen Node tests. Baseline coverage includes:

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

The script additionally exercises cockpit, phone/local-audio import, radar sector labels, pursuit stars, thumbstick reset and exit-driving. Baseline coverage includes entry, keyboard acceleration, FX toggle, garage class/paint/suspension selection, buying an engine upgrade, balance deduction, saved-state reload, accepting Flash Flood Escape, Zone activation, abandoning the race, map waypoint setting, pause/resume, and a 390×844 layout with pointer-operated gas control. It rejects JavaScript runtime errors and console errors and saves three PNGs in the operating system temporary directory.

For sandbox repeatability it uses headless Chromium with software WebGL and no browser sandbox. Those flags are **test-only**, not instructions for everyday browsing. Software rendering is much slower than a real GPU. This is not a frame-rate benchmark or verification on an actual phone.

## Not covered

- A complete human-played win through every race, the full cash/REP progression loop, and all pursuit edge cases.
- Browser/device compatibility beyond the local Chromium check, real mobile GPU performance or controller support.
- Audio quality or suitability for a commercial soundtrack.
- A Vercel deployment or any other hosted runtime. No public deployment was created.

The build emits an advisory about the approximately 511 kB minified Three.js core chunk (about 130 kB gzip); this is not a build failure. The application separates its own code and effects for caching, but still needs a future performance pass for low-end mobile hardware.
