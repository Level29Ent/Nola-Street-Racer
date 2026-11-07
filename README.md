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
npm test        # six headless simulation regression tests
npm run build  # production static bundle in dist/
npm run preview
```

The production output is a static Vite application: build with `npm run build`, serve `dist/`. No API keys, accounts, backend, or paid assets are needed. No environment variables are required.

## Play

Click **Enter the City**. Drive with **WASD** or **arrow keys**. **Shift** boosts; **Space** drifts; **T** recovers your car. **G** opens the garage, **R** opens the race board, **M** expands the map, **P/Escape** pauses. **H** hops when hydraulic suspension is fitted. **1/2/3** trigger Zone/Roar/EMP. Sound starts muted; click **Sound Off** to enable original synthesized engine/bounce audio. Touch controls appear on coarse-pointer devices; garage, missions, abilities and map also work by touch.

Set a waypoint by clicking/tapping the map. Pass race checkpoints in order, but choose your own route between them. The map route is a guide, not a restricted track. Click **Abandon Race** to quit; wager entry fees are not returned. Performance upgrades and the exotic cost race cash; cosmetic options are free. Cash, REP, wins, owned vehicles and customization save automatically in browser localStorage. Clearing site data resets the game. Runs, position, health and cooldowns are not saved.

### Implemented

- Procedural, compressed city grid: French Quarter-style low-rise facades and balconies, Tremé, St. Claude signs, industrial yards, riverfront, muddy outskirts, and two bridge decks.
- Four fictional vehicle silhouettes with different acceleration, top speed, traction and ride height. Three are available initially; the exotic unlocks for $6,000.
- Arcade momentum/slip, reverse/braking, building collisions, damage, nitrous, drift, wet traction and flood-zone slowdown; trucks retain better wet grip.
- Six candy paint choices, three chrome wheel sizes, rotating wheels/spinners, stance selection, hydraulic hops, pulsing underglow, three-stage engine/tires/nitrous tuning.
- Camera-follow driving; bloom, fog, rain, wet materials, emissive signs, real planar reflection patch outside the garage. **FX Low** disables the reflector and postprocessing and reduces pixel density.
- Three checkpoint missions with cash/REP rewards. Flood Escape adds a heavy storm, four interceptors and a scripted roadblock/spike hazard. Clash adds a route-following rival and a $500 wager.
- Free-roam speed/collision heat; police pursue on a simple intersection grid and cause contact damage. Zone slows simulation; Roar stops nearby traffic; EMP temporarily disables nearby police.
- Pause, recovery, browser-storage validation, north-up clickable minimap and touch pedals/steering.

### Important scope limits

This is **not AAA**, not a 1:1 surveyed map, not a production driving simulator and not a finished commercial game. Geometry is procedural/block-based; car designs are fictional. The prototype has no licensed vehicles, sampled music, dialogue, multiplayer, true tire/suspension simulation, garage interiors, traversable hotel interiors, destructible scenery, animated rising water, road-network police pathfinding beyond the city grid, tactical police AI, three-wheeling, body-kit editor, or real pink-slip inventory transfer. Flooding is represented by weather, zone handling and HUD warnings, not a fluid simulation. Only one puddle patch uses real-time planar reflection; other streets use wet-look shading. The sound is a simple original synthesized loop, not the requested commercial-quality soundtrack. Read [the design catalog](docs/GAME-DESIGN.md) for the broader production vision and clear separation from implemented features.

## Validation

See [verification notes](docs/VERIFICATION.md). WebGL performance varies by device; use FX Low on integrated GPUs/mobile. No public deployment or remote PR is included in this download.

## Repository delivery

Source was prepared against repository base commit `152caa6f67e0cac2e3cc8c913ac389dc5b411ab4`. The session could clone the public repository, but its GitHub publishing tools require that repository to be linked to an accessible Vercel project. This ZIP is the complete source handoff, not a claim that changes were pushed. Extract into your repository, review, and commit normally. The download omits `.git` and `node_modules`; its `dist/` folder is a ready-built static bundle for convenience. The source remains the authoritative version.
