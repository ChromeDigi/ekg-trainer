# Step 5: Campus research and blockout

Spec source: `docs/future/3d-campus.md`. Status: see the bottom of this file.

## What it does
Research first, model second. This step collects verified facts per building (name,
position, height, connections) and logs everything unverified. Then comes a simple
massing blockout of priorities 1A to 1C (main hospital with St. John, "the Pavilion",
Helena Theurer Pavilion): plain boxes with correct footprints, heights and connections,
on its own page that loads only when opened. The nurse reviews it ("does this look like
work?") before any detail.

## Who it's for
The nurse who works on 5 St. John. The campus becomes the place where mastery numbers
from step 3 (`progress.groupMastery()`, `progress.mastery()`) show up as lit buildings.
That wiring is step 6, not this step.

## Not in this version
- No textures, facades, glass, landscaping, lighting moods, people or cars.
- No mastery lighting (step 6). No fountain until one is verified.
- No buildings beyond 1A to 1C in the blockout (others may appear as grey context boxes
  only if their position is verified).
- No interiors, entrances beyond public main entrances, security, loading docks.
- No HMH logos or branding. Building names are used as plain place names.
- Nothing in the trainer changes: no new script on the trainer pages, no change to the
  service worker's trainer cache.

## How similar tools do it, and where this can be better
| Tool | How it works | Weak spot | What we do instead |
|---|---|---|---|
| University 3D campus maps (Concept3D-style) | Hosted 3D map with clickable buildings, built from surveys and photos | Online only, heavy, generic boxes for most buildings | Offline after first load, few buildings, each checked against sources |
| OSM 3D viewers (F4map, OSM Buildings) | Extrude OpenStreetMap footprints by height or level tags | Accuracy depends on volunteers; missing heights become default boxes | Use OSM as a starting footprint only, cross-check with the official map, log gaps |
| Google Earth 3D | Photogrammetry mesh, very realistic | Can't be cached, extracted or used offline (terms) | Not usable; we model from scratch |

## Reference boards
Facts below have a source. "Map" means the official 2024 HUMC campus map (HMH copyright,
reference only, never committed; URL in `docs/future/3d-campus.md`). The map is a
schematic with north up; it shows positions and adjacency, not exact sizes.

### 1A. Main hospital, 30 Prospect Ave, including St. John
- Address 30 Prospect Avenue, Hackensack, NJ 07601: map header.
- One connected complex between Prospect Ave (west) and Second St (east), Atlantic St
  (north) and Essex St (south): map.
- Sections named on the map, north to south along the east side: St. John Building,
  Strawbridge Building, Main Building, Conklin Building, Schlesinger Pavilion (south end,
  near Second St and Essex St). Emergency and Trauma Center and Imaging Center sit west of
  St. John; Link Lobby faces the main entrance loop: map.
- "Parking Division Located Ground Floor St. John next to the Cashiers Office": HMH
  patient and visitor information page (fetched 2026-11-19).
- Helena Theurer Pavilion sits directly east of St. John and Strawbridge, between them
  and Second St: map.
- Height of St. John: **not verified** (owner says about 6 stories).

### 1B. "The Pavilion" = Schlesinger Pavilion (owner, 2026-11-19)
- Owner confirmed Schlesinger Pavilion. Height still not verified (owner says about 9
  stories). Candidates that were considered:
  - **Schlesinger Pavilion**: the only other building labeled "Pavilion" in the complex
    on the 2024 map, at the south end by Second St. Height not found anywhere.
  - **George Link Jr. Pavilion**: listed as a campus building (houses the Banta Lobby,
    the Emil Buehler Helipad and a surgical suite) in the Wikipedia article on HUMC as
    mirrored around 2007. Secondary source only. The map's "Link Lobby" is likely named
    for it; that link is my inference, not a source.
  - "The Patient Pavilion": same Wikipedia mirror, an older list. Unclear what it is now.
- Height: not verified for any candidate.

### 1C. Helena Theurer Pavilion
- "Nine-story surgical and intensive care tower", 530,000 sq ft, located at 1888 2nd
  Street: HMH Helena Theurer Pavilion page (fetched 2026-11-19).
- Opened early 2023; architects RSC Architects and Page: trade press (Becker's Hospital
  Review, Building Design + Construction, 2023). Secondary, consistent with HMH.
- Map: curved west face, long north-south footprint along Second St, own parking
  structure across Second St ("Helena Theurer Pavilion Parking").
- Blue glass, columns, elevated structure: owner description; still to confirm from
  photos (photos are reference only, never shipped).

### 2. Medical Plaza
- Map label: "Justice Marie Garabaldi Medical Plaza" (spelling as printed), west side on
  Prospect Ave, south of the main entrance loop, north of the Main Parking Garage.
- HMH lists valet service at "Medical Plaza": patient and visitor information page.
- Nine stories, 276,000 sq ft, built 1998: Wikipedia article on HUMC (mirror, about
  2007). **Secondary only**; needs a primary source.
- Address 20 Prospect Ave: not verified.

### 3. Research tower
- Map: "David & Alice Jurist Research Center", northwest corner at Prospect Ave and
  Atlantic St. Address 40 Prospect Ave: not verified.

## Ambiguity log
| # | Question | What the sources say | Who can settle it | Until then |
|---|---|---|---|---|
| A1 | ~~Which building is "the Pavilion"?~~ Settled: Schlesinger Pavilion (owner) | Schlesinger Pavilion is the only map "Pavilion" besides Helena Theurer; George Link Jr. Pavilion exists per an old Wikipedia copy; Medical Plaza is reported as nine stories, the height the owner remembers | Nurse | Leave 1B out of the blockout, or block Schlesinger as a grey box marked "unconfirmed" |
| A2 | How tall is St. John? | Nothing found | Nurse (count floors), own photo, or lidar | Use 6 stories (owner's estimate), marked as an estimate in the code |
| A3 | Which way does 5 St. John face? | Nothing found | Nurse | No unit-level detail |
| A4 | Is there a fountain, and where? | Map shows an oval island in the main entrance loop off Prospect Ave; nothing says it is a fountain | Nurse or a street-level photo | No fountain |
| A5 | Medical Plaza: 20 Prospect Ave, 9 stories? | Height from secondary source only; address not found | HMH page or nurse | Map position only, height marked secondary |
| A6 | Jurist Research Center = research tower at 40 Prospect? | Map position fits; address not found | HMH page or nurse | Map position only |
| A7 | Footprints for 1A to 1C | OSM lumps the main hospital into one 2017 polygon and lacks Helena Theurer Pavilion | Aerial imagery (public NJ or USGS orthophotos), owner photos | Not modeled until traced from imagery |
| A8 | Heights for every section except Helena Theurer (9) | Nothing found; OSM has no heights | Lidar or photos | Not modeled in detail |

## Data access (2026-11-19)
- `www.hackensackmeridianhealth.org` reachable (map and pages read).
- OpenStreetMap: `api.openstreetmap.org` works (owner allowed it); `overpass-api.de` and
  `overpass.kumi.systems` cut or time out. Data pulled for the campus area on 2026-11-19.

## What OpenStreetMap has (and doesn't)
- **No heights or floor counts** on any campus building (`height` / `building:levels`
  absent everywhere).
- Streets match the official map: Prospect Ave, Atlantic St, 2nd Street, Essex St.
- Usable, recently edited footprints: Medical Plaza ("Hackensack University Medical
  Plaza", edited 2022), Women's and Children's Pavilion (2024), Don Imus/WFAN Pediatric
  Center (2023), Employee Parking Garage across 2nd St (2023, likely the map's "Helena
  Theurer Pavilion Parking"), Jurist Research Center, John Theurer Cancer Center,
  Hillcrest Building, Visitors Parking (= map's Main Parking Garage).
- **Stale where it matters most.** The east half of the main hospital is one polygon
  named "Patient Pavilion", last edited 2017-12-02. It lumps St. John, Strawbridge, Main,
  Conklin and Schlesinger into one shape with no internal splits. "George Link Jr.
  Pavilion" (2017) sits west of it, by the main entrance.
- **Helena Theurer Pavilion is missing.** It opened in 2023; the strip between the
  "Patient Pavilion" polygon and 2nd Street is empty in OSM.
- No fountain is mapped anywhere on campus.
- So OSM gives priority 2 to 4 footprints and the streets, but not 1A to 1C.

## Plan once unblocked
1. Pull OSM footprints, `height` and `building:levels` tags for the block bounded by
   Prospect Ave, Atlantic St, Second St and Essex St. Credit "© OpenStreetMap
   contributors" (ODbL) on the campus page.
2. Cross-check each footprint against the map; log disagreements here.
3. Blockout page `campus.html` + `js/campus/*.js`, linked from the trainer but never
   loaded by it. Three.js vendored as one file (only after owner approval).
4. Screenshot at 390 px, test orbit and pinch, measure load size and frame rate.

## Status
- Research and ambiguity log: done for what public, allowed sources give.
- Three.js approved; 1B = Schlesinger Pavilion (owner, 2026-11-19).
- OSM pulled: good for streets and priorities 2 to 4, stale for 1A to 1C (see above).
- Blockout: not started. Needs footprints for 1A to 1C from aerial imagery and heights
  (lidar or nurse/photos).
