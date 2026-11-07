# Crescent City: After Dark

An original, playable Three.js/WebGL2 street-racing **prototype** inspired by New Orleans car culture. Built from an empty repository for Level29Ent. No assets or code from Midnight Club are used.

## Run

Requires Node.js 20.19+ (22.12+ if using Node 22) and a modern, hardware-accelerated WebGL2 browser.

```sh
npm ci
npm run dev
```

Open the localhost URL printed by Vite. Do not double-click `index.html`; ES modules require a server.

```sh
npm test        # thirteen headless simulation/dynamics regression tests
npm run build  # production static bundle in dist/
npm run preview
```

The production output is a static Vite application: build with `npm run build`, serve `dist/`. No API keys, accounts, backend, or paid assets are needed. No environment variables are required.

## Play

Click **Enter the City**. Drive with **WASD** or **arrow keys**. **Shift** boosts; **Space** drifts; **T** recovers your car. **G** opens the garage, **R** opens the race board, **V** expands the map; **C** toggles cockpit/chase camera, **M** opens the music phone and **F** exits driving to the pause menu, **P/Escape** pauses. **H** hops when hydraulic suspension is fitted. **1/2/3** trigger Zone/Roar/EMP. Sound starts muted; click **Sound Off** to enable original synthesized engine/bounce audio. Touch controls appear on coarse-pointer devices; garage, missions, abilities and map also work by touch.

Set a waypoint by clicking/tapping the map. Pass race checkpoints in order, but choose your own route between them. The map route is a guide, not a restricted track. Click **Abandon Race** to quit; wager entry fees are not returned. Performance upgrades and the exotic cost race cash; cosmetic options are free. Cash, REP, wins, owned vehicles and customization save automatically in browser localStorage. Clearing site data resets the game. Runs, position, health and cooldowns are not saved.

### Implemented

- Procedural, compressed city grid: French Quarter-style low-rise facades and balconies, Tremé, St. Claude signs, industrial yards, riverfront, muddy outskirts, and two bridge decks.
- Four fictional vehicle silhouettes with different acceleration, top speed, traction and ride height. Three are available initially; the exotic unlocks for $6,000.
- Arcade momentum/slip, reverse/braking, building collisions, damage, nitrous, drift, wet traction and flood-zone slowdown; trucks retain better wet grip.
- Six candy paint choices, three chrome wheel sizes, rotating wheels/spinners, stance selection, hydraulic hops, pulsing underglow, three-stage engine/tires/nitrous tuning.
- Chase/cockpit cameras with steering wheel, live speed display and a throttled rear-camera mirror. Procedural paint/asphalt roughness maps, PMREM environment reflections, irregular nearby planar puddle reflections, bloom, rain and storm-dependent bayou fog. **FX Low** disables shadows, planar reflections and postprocessing; mobile starts in Low FX.
- Three checkpoint missions with cash/REP rewards. Flood Escape adds a heavy storm, four interceptors and a scripted roadblock/spike hazard. Clash adds a route-following rival and a $500 wager.
- Witnessed speed/drift offenses and police contact raise a five-star NOPD wanted level. Two roaming patrols and 3–7 dynamically spawned interceptors pursue on the grid; lose police distance to shed stars. Zone slows simulation; Roar stops nearby traffic; EMP temporarily disables nearby police.
- Box3 collisions with full car dimensions against buildings, poles, traffic and roadblock cruisers; 120 Hz physics substeps. Bounded burnout/nitrous smoke pool and 24 animated, scattering pedestrians.
- Top-right eight-sector GPS radar with coordinates, crew boss locations, police and three safehouses (slow passive repairs/refill when stopped and not wanted).
- Touch thumbstick, arrow fallback, gas, brake/reverse, drift, boost and exit-driving controls; release/cancel/blur reset.
- Engine pitch, tire screech, boost noise and distance-attenuated siren synthesis. The M-key phone imports multiple local audio files with playlist, next, play/pause and volume controls. No network streaming catalog is configured.

### Important scope limits

This is **not AAA**, not a 1:1 surveyed map, not a production driving simulator and not a finished commercial game. Geometry is procedural/block-based; car designs are fictional. The prototype has no licensed vehicles, sampled music, dialogue, multiplayer, true tire/suspension simulation, garage interiors, traversable hotel interiors, destructible scenery, animated rising water, road-network police pathfinding beyond the city grid, tactical police AI, three-wheeling, body-kit editor, or real pink-slip inventory transfer. Flooding is represented by weather, zone handling and HUD warnings, not a fluid simulation. A single nearby irregular puddle patch uses real-time planar reflection; other roads use mapped wet-look PBR shading. The environment reflection is a static generated studio environment, not a per-frame city cubemap. Sound effects and a simple original synthesized beat are provided, not a commercial-quality soundtrack. **No official Level 29 logo artwork or recordings were supplied**: Canvas-generated text decals are placeholders; the phone plays only local files you choose and does not invent or stream official tracks. Files are never uploaded and must be reselected after reload. Read [the design catalog](docs/GAME-DESIGN.md) for the broader production vision and clear separation from implemented features.

## Validation

See [verification notes](docs/VERIFICATION.md). WebGL performance varies by device; use FX Low on integrated GPUs/mobile. The baseline was published in PR #1. Upgrade checks and remaining limitations are described in the verification notes.

## Graphics budget and controls

High FX enables two 2,048px moonlight CSM cascades (512px on mobile), two nearby 1,024px streetlight shadow spots (256px mobile), one player headlight shadow (1,024px desktop / 512px mobile), and at most two 512px traffic headlight shadows. Geometry casts/receives shadows; distant lights do not each allocate a shadow map. This is intentional: unbounded high-resolution shadow maps for every lamp/vehicle would be prohibitive on phones. Desktop pixel density is capped at 1.5, mobile at 1 by default. Smoke is capped at 180 particles desktop / 64 mobile. The mirror is 384×120 desktop / 256×80 mobile and updates at a throttled rate.

This remains a browser app, not a native iOS/Android package. Actual-device Safari/Chrome performance and the complete campaign still need testing. F/Exit pauses driving; it is not an on-foot mode. Pedestrians are stylized, non-damageable scenery with simple sidewalk/crossing motion and proximity scattering, not a full crowd-navigation system. Boss radar markers represent crew locations; only Tuba Tone has the active wager-race rival agent.
