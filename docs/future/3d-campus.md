# Future feature: 3D HUMC campus mastery environment

Status: **documented only, not scheduled.** Comes after phases 2 to 4 (clinical content
first). Nothing here changes the current app or adds dependencies yet.

## The vision (owner, 2026-11-19)
A premium, interactive 3D miniature of the real Hackensack University Medical Center
campus that reacts to rhythm mastery. Someone who works at HUMC should recognize it.

Priorities, in order:
1. Main campus around 30 Prospect Avenue, including the actual St. John building or wing.
2. Helena Theurer Pavilion, with its recognizable glass architecture and its real
   relationship to the main campus.
3. Other relevant buildings, entrances, connecting roads, landscaping, garages.
4. John Theurer Cancer Center, accurate but lower priority.

Look: architectural-visualization quality, realistic lighting, a beautiful night mode
(default, matches the app and night shift).

Game layer: a central fountain (clearly fictional) whose lights grow with mastery, and
campus areas that illuminate or unlock as proficiency improves.

**Real vs fictional rule:** buildings, footprints, proportions, placement, roads and
facades must be real. Only the fountain, glow effects and unlock visuals are invented,
and the app labels them as game elements.

## Verified so far
| Fact | Source |
|---|---|
| Address 30 Prospect Avenue, Hackensack NJ 07601; location pin 40.883701, -74.056320 | HMH official location page (hackensackmeridianhealth.org/en/locations/hackensack-university-medical-center) |
| Campus names on that page: Helena Theurer Pavilion (24/7 entrance), John Theurer Cancer Center, Medical Plaza, Essex St. Garage, Women and Children's garage, Emergency Trauma Center | Same page |
| Helena Theurer Pavilion: 530,000 sq ft surgical and ICU tower, 24 ORs, 50 ICU beds, opened February 2023; architects RSC Architects (architect of record, core and shell) and Page (design and medical planning) | Healthcare Design Magazine, NJB Magazine, ENR, RSC Architects |

## Not verified yet (must be before modeling)
- **"St. John" as a building.** "5 St. John" is a unit name. No public source found that
  names a St. John building or wing. Ask the nurse which building 5 St. John is in.
- **Pavilion height.** Sources disagree: 8 (Stantec), 9 (most trade press), 11 (hospital
  release). Settle from photos and the official map.
- **Curved glass facade.** The owner's description; not confirmed in sources read so far.
  Confirm from photos.
- **Official campus map.** HMH pages link to one, not yet retrieved.
- Footprints and heights of every other building.

## Reference data and licensing
| Source | Use | Rules |
|---|---|---|
| Official HUMC campus map | Layout reference, building names | HMH copyright. Use as a reference to model from; don't copy or redistribute the map image |
| OpenStreetMap building footprints | Starting footprints, roads | ODbL: credit "© OpenStreetMap contributors"; a derived database stays ODbL. Check the OSM coverage and accuracy for this campus |
| USGS 3DEP lidar (if coverage exists) | Building heights, terrain | US government data, generally public domain; check coverage for Hackensack |
| Own photos from public sidewalks | Facades, materials, glass, lighting | Best option: we own them. Exterior and public areas only |
| Architect and press photos | Visual reference only | Copyrighted. Don't ship them or trace them into textures |
| Google Photorealistic 3D Tiles | Not usable as a model source | Google's Map Tiles API policy bans caching, data extraction, offline use and content created from Google Maps content |

## Tools (researched 2026-11-19)
- **Three.js (recommended engine).** Plain JavaScript WebGL library. Can be shipped as one
  vendored module file with no build step, which keeps this repo's no-build architecture.
  Loads glTF models, does night lighting, bloom and emissive "glow" for mastery.
- **React Three Fiber.** React wrapper for Three.js. Good ergonomics, but needs React and a
  bundler, which means rebuilding the app around a build step. Only worth it if the app
  moves to React for other reasons.
- **Blender + glTF.** Model the campus procedurally from footprints (extrude, then hand
  detail the key facades), export glTF with Draco or meshopt compression. Blender GIS
  add-on can import OSM footprints and terrain.
- **Remotion.** A React framework that renders videos. `@remotion/three` renders React
  Three Fiber scenes frame by frame, and animation must be driven by the frame number
  (`useCurrentFrame`), not live input. Right for cinematic sequences (an unlock fly-through
  rendered to MP4, a trailer), **not** for the interactive campus.
- **HyperFrames by HeyGen** (connected to this account) and **Canva** (connected): HTML
  and design-based video and graphics. Fine for promo clips; neither is an interactive
  3D engine.

## Similar "mastery world" designs
- **Duolingo path:** nodes unlock in a line. Clear, but abstract; no sense of place.
- **Forest (focus app):** a forest grows as you succeed. Strong emotional pull from a
  growing world.
- **Khan Academy mastery levels:** honest skill tracking, no world.

Where ours can be better: the world is his real workplace, and every light is tied to a
measured skill (accuracy and speed per rhythm from `ekg.progress.v1`), not just time spent.

## Mastery mapping (draft)
- A rhythm counts as mastered at 90% or better on its last 20 strips with average correct
  time under 10 s (tune with the nurse).
- Each rhythm group lights a part of the campus (example: sinus rhythms light the main
  building windows, lethal rhythms light the Emergency Trauma Center, blocks light the
  Pavilion floors). The fountain gains a ring of light per mastered rhythm.
- Lights fade slowly if skills go stale (no practice in 14 days), so it rewards review.

## Technical budget (iPhone)
- Campus loads only when its tab is opened; the trainer never depends on it.
- Target under 5 MB compressed glTF, under 150k triangles, 60 fps on a recent iPhone,
  lower-detail fallback when WebGL is missing or slow.
- Must still work offline once cached.

## Safety, privacy, branding
- Exteriors and public areas only. No interiors, no security posts, cameras, staff-only
  entrances, loading docks, helipad operations or anything that helps someone get around
  hospital security. The repo is public.
- No HMH or HUMC logos, wordmarks or brand colors without written authorization from HMH.
  Building names are used only as factual place names.
- Disclaimer on the campus screen and About: "Independent study tool. Not affiliated with,
  sponsored by or endorsed by Hackensack Meridian Health or Hackensack University Medical
  Center. Fountain and lighting effects are fictional game elements."
- If it's ever distributed beyond friends, get HMH's written permission first. (Not
  legal advice; trademark and building-likeness questions need a lawyer or HMH.)

## Decisions needed before building
1. Approve one vendored dependency (Three.js) as an exception to "no dependencies".
2. Who takes the reference photos (public exteriors only).
3. Whether to ask HMH for permission now or keep it a private study tool.

## Open questions for the nurse
- Which building is 5 St. John in? Which parts of campus does he actually use?
- Would the campus motivate him, or is it a distraction from studying?
