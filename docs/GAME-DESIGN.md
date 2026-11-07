# Crescent City: After Dark — Design Catalog

## North star

A modern Southern street-racing fantasy: expensive candy paint against humid midnight streets, booming trunks, tight historic blocks and wide-open river roads. Start as an unknown Eastbank driver, assemble a crew and defeat three neighborhood kings. This is an **original IP**, not a Midnight Club sequel. Manufacturer names below are visual research references only; production vehicles need licensing or original designs.

The eventual map should feel geographically grounded rather than promise a literal 1:1 city: French Quarter alleys/courtyards, St. Claude, Tremé, Mississippi warehouses, Twin Span vistas and soft levee backroads. Traversable hotel lobbies, real flood-depth transitions, calibrated landmarks and streamed district detail are future production work. The current map is a compressed stylized grid with no invisible perimeter walls; the river is a recovery hazard away from the bridges.

## Vehicle classes

| Class                      | Research references, not included models                                           | Identity / weakness                                                                   | Starting fictional ride | Prototype stats                                          |
| -------------------------- | ---------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------- | ----------------------- | -------------------------------------------------------- |
| Dirty South Sedans / Donks | 1971 Impala, 1987 Regal Grand National; Durango as an adjacent heavy SUV reference | Torque, mass and visual presence; body roll and wet cornering weakness                | Crescent Classic        | 23 m/s² nominal acceleration, 65 m/s cap, grip 2.4       |
| Bayou Tuners               | Skyline R34, Civic EG6, Supra Mk4                                                  | Quick direction changes and high-RPM tuning; less impact tolerance in the full design | Satsuma R-34            | 21 acceleration, 72 cap, grip 3.5                        |
| Swamp Trucks & SUVs        | Tahoe, Raptor, Syclone                                                             | AWD flood/levee specialist; weight and lower top speed                                | Levee Runner            | 18 acceleration, 60 cap, grip 2.8; reduced storm penalty |
| River Exotics              | Original mid-engine supercar studies                                               | Highest speed and cost; low clearance and slick-road vulnerability                    | Specter V12             | 26 acceleration, 82 cap, grip 3.1; $6,000 unlock         |

Caps are arcade tuning values, not real manufacturer specifications. The prototype applies a shared collision-damage formula; class-specific impact resistance, actual AWD torque distribution and detailed suspension are later features.

## Customization catalog

| Category               | Production catalog                                                               | Prototype implementation                                                                                               |
| ---------------------- | -------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------- |
| Finish                 | Candy layers, pearl, metallic flake, wraps, gold-leaf crew art                   | Six physical-material paint colors; no wrap editor                                                                     |
| Wheels                 | 20–30″ forged deep-dish chrome, multi-piece faces, floating centers and spinners | Three radius presets with stylized chrome spokes and rotation; wheel sizes are visual labels, not measured tire models |
| Suspension             | Ride height, camber, hydraulic hop, three-wheel pose, coilover damping           | Street/slammed/hydraulic height presets and H hop; no camber/damping or three-wheeling                                 |
| Body & aero            | Wide-body flares, carbon hood, splitters, ducktail/wing, exhaust tips            | Class-specific body silhouettes, tuner/exotic spoilers; configurable kits are future work                              |
| Lighting               | Underglow color/pulse, headlight temperature, interior/trunk LEDs                | Paint-linked pulsing underglow and working player headlights                                                           |
| Forced induction / ECU | Three engine stages, boost map, launch control                                   | Three stages, each +12% nominal acceleration/top-speed limit; no drivetrain simulation                                 |
| Tires                  | Street, wet, drag and drift compounds                                            | Three grip upgrades, each +15% traction coefficient                                                                    |
| Nitrous                | Capacity, recharge, dual purge jets, colored plumes                              | Recharge stages; Shift boost, charge meter and purple rear exhaust flames (not a physical purge system)                |
| Sound                  | Exhaust/headers, speaker trunk, bass response                                    | Synthesized engine pitch and original bounce-style rhythm; no sample library or exhaust customization                  |

Prototype economy: start with $1,500; cosmetics are free, upgrades cost $700/$1,400/$2,100 per category; repairs cost $250. Vehicle disablement removes up to $300. Free emergency recovery gets the player unstuck rather than soft-locking progression.

## Mission design

### 1. Levee Sprint

**Fantasy:** Find the fastest open line along the river and through port yards.

**Current:** Five ordered checkpoints, 120-second opening timer, +5 seconds per intermediate gate, $1,800 and 350 REP for a win. No prescribed track barriers.

**Production expansion:** Multiple river routes, moving cranes, container shortcuts, dirt/asphalt transitions and rival ghost splits.

### 2. Flash Flood Escape

**Fantasy:** Outrun the storm and a police net on the way to the bridge.

**Current:** Six checkpoints, 150-second opening timer, heavy rain, low-zone traction penalty, four chasing police agents and a scripted roadblock/spike-damage zone. Truck wet handling gives a practical advantage. Win pays $2,400 and 350 REP.

**Production expansion:** Visibly rising water, hydroplaning based on tire speed/depth, flooded shortcuts that close over time, adaptive roadblocks, helicopter search and district escape objectives.

### 3. Sound System Clash

**Fantasy:** Crew pride on the line in a bass-heavy point-to-point wager.

**Current:** $500 entry, route-following Tuba Tone rival, five checkpoints, 120-second opening timer, $3,000 gross payout and 350 REP for winning. First to the final gate wins; timeout also loses. The wager is cash only.

**Production expansion:** Crew callouts, original commissioned bounce tracks, parts stakes, licensed or fictional pink-slip inventory transfer with explicit player confirmation, tournament brackets.

### Future open-world activities

- **Second Line Convoy:** Keep the crew together through a moving street celebration without contact.
- **Port Runner:** Pick up three randomized freight tags; choose your order and route.
- **Levee Drift Session:** Maintain linked drifts between light poles and muddy switchbacks.
- **Eastbank Delivery:** Borrow a rival-class build and deliver it without condition loss.
- **King's Challenge:** A three-leg finale combining urban precision, flood escape and river speed.

These activities are design proposals, not hidden playable modes.

## Boss crews & territory

| Crew                 | Territory                            | Leader and signature concept                                                                                | Driving personality / unlock vision                                           |
| -------------------- | ------------------------------------ | ----------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------- |
| St. Claude Syndicate | Downtown, French Quarter, St. Claude | “Vieux Carré” Vance — carbon-bodied, gold-leaf GT-R reference; final vehicle should be licensed or original | Precise alley lines, feints, late braking; gold-leaf wrap and precision tires |
| Bayou Mud Militia    | New Orleans East, levees             | “Gator” Gauthier — supercharged 1970 Chevelle reference with dirt-capable drag stance                       | Straight-line power and loose-surface drift; rally suspension and torque kit  |
| Brass Band Boosters  | Tremé, Warehouse District            | Tuba Tone — hydraulic 1974 Coupe de Ville reference with trunk system                                       | Showmanship, hopping, nitrous ambush; hydraulics and trunk audio cosmetics    |

In the prototype, each crew has a race-board identity and tracked wins. Only Tuba Tone has an active rival agent; the other two encounters are timed challenges. There is no actual crew roster, recruitment or territory takeover system yet. At 1,050 REP the HUD recognizes Crescent City royalty; progression is not a story campaign.

## Abilities

- **Zone:** Five seconds of 45%-speed simulation for precision inputs; 22-second activation cooldown. The race clock stays real-time.
- **Roar:** Stops traffic within 70 m for four seconds and emits a visual ring; 18-second cooldown. It does not physically launch vehicles.
- **EMP:** Disables police within 130 m for seven seconds; 28-second cooldown. New arrivals outside the pulse remain active.

All abilities are fictional arcade mechanics; no real-world vehicle-control instructions are included.

## Production roadmap

1. Validate controller handling, chase camera and frame-time targets on desktop/mobile hardware.
2. Build a single high-fidelity French Quarter block with original art, PBR materials, optimized lighting and licensed/commissioned audio.
3. Replace simple intersection agents with road-network navigation and obstacle-aware pursuit; add recruitment/progression persistence to a backend.
4. Stream detailed districts, model road elevation and water depth, and author accessible interiors.
5. Add production-quality vehicle rigs, tuning, accessibility, controller support, campaign content and multiplayer security as separate milestones.

AAA production requires a multidisciplinary team, significant art/audio production, vehicle/music rights where applicable and sustained optimization. This prototype is a vertical-slice starting point, not a substitute for that work.

## Nightlife upgrade implementation notes

The renderer now uses procedural physical surface maps, generated environment lighting, bounded camera-relative cascaded moon shadows and nearby lamp/headlight shadows. Cockpit and rearview rendering, Box3 pole/traffic collision, drift/nitro smoke, sidewalk pedestrians, five-star witnessed pursuits, an eight-sector radar, three restorative safehouses, local-file music phone and analog touch steering extend the baseline above. Earlier prototype limitations in the tables describe the initial vertical slice; this section supersedes those items where noted. Generated Level 29 text branding is not a reproduction of official supplied artwork. There are no bundled official instrumentals, remote streaming feed, on-foot exit mode, real city-scale reflection probes, arbitrary-lamp shadow maps or validated native mobile builds.
