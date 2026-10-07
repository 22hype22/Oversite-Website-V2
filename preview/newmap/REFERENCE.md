# Liberty County 3D reference ledger

Every photo the user sends gets a row here. The model is rebuilt from this ledger,
not from memory. Nothing in the 3D scene should contradict a logged photo.

## Shoot plan (fastest route to a finished map)

The 2D map already gives every footprint. Only heights and silhouettes are missing, and most of the map
is seen from 500+ studs up on the dispatch view, so street-level detail only matters at a few landmarks.

1. **Helicopter lap, one session.** Fly a loop at a steady height with the minimap open. One wide shot per hill,
   per district and per bridge, about 25 to 30 shots total. Each shot gives heights for everything in frame
   at once (storey counts, hill tops against known buildings, bridge decks).
2. **Downtown street level, ten shots.** One per tall building from across the street, player in frame.
3. **Landmarks, two shots each.** Water tower, both river bridges, the tunnel, hospitals, PD and FD stations, airport.

After each batch the model is rebuilt straight away. Expected: two sessions of about 30 minutes.

## Scale anchors (working values, corrected as photos come in)

| Anchor | Value | Source / status |
|---|---|---|
| World grid | 0..2000 units = full 5355 px official map; 1 unit = 2.6775 px | pipeline, fixed |
| Player (R15 avatar) | ~5 studs tall | Roblox default, to confirm against a doorway photo |
| Door height | ~7 studs | to confirm |
| Single storey | ~12 studs floor to floor | to confirm |
| Sedan (police cruiser) | ~17 x 7.5 x 5.5 studs (L x W x H) | to confirm from a photo next to the player |
| Fire engine | ~34 x 10 x 12 studs | to confirm |
| Road lane width | ~12 studs | to confirm |
| Studs per world unit | 3.5 (STUD = 1/3.5 units, used by apply-heights.py and 3d.js) | pier width 21 units on the map vs ~70 studs in photo 010, pier length 70 units vs ~280 studs in photo 012. Confirm with a cruiser photo |
| Sea level | 0 units; flat land 1.43 units (5 studs) | beach photos 004-021: sand meets the water with no step. The generated heightmap had land 22 units above the sea, apply-heights.py rebases it |
| SUV (civ, blue) | ~17 x 8 x 6.5 studs | photos 002/003, player beside it |
| Bridge deck (road to underside) | ~3 studs slab + ~4 stud parapet | photo 001/002 |
| Bridge clearance (water to underside) | ~13 studs | photo 001, player on the abutment rock is ~0.4 of it |
| Apartment storey | ~11 studs, ground floor retail ~14 | photo 003, Brookstone Apartments |
| Palm | ~40 studs | photo 007, level with a 3-storey roof |
| Lifeguard tower | ~12 studs incl. stilts | photos 017-020 |
| Billboard | ~25 studs to the top | photo 019 |

## Applied so far (build 2026-10-07, Bayside pass)

Files: `heights.json` + `apply-heights.py` (terrain), `landmarks.json` (objects), rendered by `../live-map-3d.src.js`.
Rebuild: `python3 preview/newmap/apply-heights.py <generated height png> preview/liberty-county-height.png`, then the usual `build-rail.py` and `build-3d.py`.

- Sea level rebase: flat land now sits 5 studs above the water everywhere (was a 76-stud cliff at every shoreline).
- West headland: plateau 115 studs with a 165 stud peak at the east end, polygon from the map's rock outline (photos 004, 005, 013). Known rough spot: the spit tip renders jagged because the terrain mesh (10.5 units per segment) is coarser than the spit is wide.
- East bluff (the postal 205 hill behind Oceanside Drive): set to 33 studs (photos 017, 019, 020, 021). Knoll at the east end of the beach: 20 studs.
- Bayside pier: deck 15 studs, shore section on timber trestle, water section and end platform on concrete piles, teal rails, shop row on the east edge (two trailers, pink arcade, blue Surf's Up, red shed, green Crab Shack), Bayside Grill with red hip roof, tower block with two 59 stud masts, arch posts.
- Beach office block 40 studs with the red stair tower, tan retail row 18 studs, two lifeguard towers, palm lines along the back of both beaches (40 studs).
- Trees: pines 33 studs, broadleaf 22 studs (were about twice that).
- Extracted buildings and trees inside the landmark boxes and on the headland are dropped (`clear` in landmarks.json).

Not yet applied: river bridge (001-003), downtown tower heights, water tower position, Chinatown pagoda roof, beach guardrail, beach road sea wall.

## Postal grid (from in-game minimap shots)

| postal | area | world position |
|---|---|---|
| 2001 | Bayside Boardwalk pier tip | ~ (560, 1672) |
| 2002-2004 | pier, tip to entrance | ~ (560, 1660-1600) |
| 2011-2016 | Chinatown, north of the boardwalk | TBD |
| 2031 | beach road west of the boardwalk | TBD |

Note: the API's own postal map (`api.erlc.gg/maps`, fall_postals) labels this area 201 (pier), 202 (east beach), 203 (west beach), 204 (Bayside block), 205 (the bluff hill), 206-208 (Southern Avenue), 300 (across the river mouth), with streets Oceanside Drive, Liberty Way, Southern Avenue. The in-game minimap shows 4-digit codes, so one of the two is stale. Log which one the live API returns before wiring units to postals.

## Photo log

Columns: id, file, postal / street, facing, what it shows, what it changes in the model.

| id | file | where | facing | shows | model change |
|---|---|---|---|---|---|
| 001 | refs/001-river-bridge.jpg | south of the downtown river bridge, in the channel; map px ~1115,1830 (world ~871,1430) | N | two-span concrete bridge, one centre pier, river ~37 units wide; Brookstone Apartments (4 storeys + roof tower, brick ground floor) on the west bank just north of the road; rocky abutments both sides | TODO: bridge as its own object (deck 3 + parapet 4 studs, 13 stud clearance, pier ~4 studs wide); apartment block ~50 studs + 10 stud tower |
| 002 | refs/002-river-bridge.jpg | east abutment rock, below the bridge | SW | bridge side on with hammerhead pier; west knoll south of the bridge, grassy with rock faces, ~20-25 studs above water; pines ~30-35, palms ~35-40, cherry ~20 studs; sea horizon beyond | TODO: knoll heights, tree species per knoll (pine + palm + cherry mix), palms along the coast |
| 003 | refs/003-river-bridge.jpg | on the bridge, east end | W | road cross-section: sidewalk, 2 lanes WB, centre median/turn, 2 lanes EB, right-turn-only lane peeling north on the east bank; SUV ~17 x 8 x 6.5 studs; teal glass tower ~10 storeys further west; 3-storey pink commercial block NW of the bridge | TODO: lane count on the main downtown road, tower height, bridge parapets |
| 004 | refs/004-southwest-beach.jpg | south-west beach, east of the pier, on the sand | W | the west headland: sheer grey cliff on the sea side, flat-ish top with grass patches, small sea arch at the water line; palms along the back of the beach, loungers and umbrellas; SUV on the sand for scale | TODO: headland height. Cliff top ~20 SUV heights above the sand = 120-150 studs; arch at the base on the south face; palms 35-40 studs; sand runs right up to the rock, no grass band |
| 005 | refs/005-southwest-beach.jpg | in the sea south of the beach, by the red buoy | NW | the whole headland side on: long flat plateau ~100-120 studs, one peak at the east end ~150-180 studs, sheer faces straight into the water, dark cave mouth at the base; town skyline low behind the palms | TODO: plateau + peak profile for the west spit (world x 227-398, y 1445-1664); red channel buoy south of the beach; shallow sand shelf visible under the water near the beach |
| 006 | refs/006-bayside-boardwalk.jpg | west beach, on the sand west of the pier | E | Bayside Boardwalk pier side on: timber deck on piles, deck ~10 studs above the sand at the shore and ~12-15 over the water; row of single-storey shops (12-14 studs), Bayside Grill 2 storeys (~25) at the end with a radio mast (~60); beach road with sea wall and railing on the left, palms behind the road | TODO: pier as deck + piles + shop row + grill block; beach road sea wall ~4 studs |
| 007 | refs/007-bayside-boardwalk.jpg | boardwalk entrance plaza, street side (postal 2003/2004 area) | NE | BOARDWALK Bayside timber arch ~15 studs; 3-storey glass office (grey with red fin, ~40 studs, player is 1/8 of it); row of tan single-storey retail with arched parapets ~18 studs; palms ~40 studs, level with the office roof; bollards ~3 studs; 2-lane street, speed 50, stop sign, crosswalk | TODO: office block 40 studs, retail row 18 studs with parapet, bollard/planter detail skipped |
| 008 | refs/008-bayside-boardwalk.jpg | dunes north-west of the office, looking back | SE | same office from the beach side: red stair tower on the corner rises ~6 studs above the roof; retail row behind; dunes are low mounds 3-5 studs with grass tufts and bare earth; orange autumn trees and the town skyline behind | TODO: dune bumps 3-5 studs in the beach back strip; office stair tower |
| 009 | refs/009-bayside-boardwalk.jpg | boardwalk entrance, standing on the plaza (in-game minimap in frame) | S | pier runs south from the plaza: deck ~3 studs above the plaza, white barriers at the edge, kiosk under the arch, Bayside Grill at the far end; postal minimap: 2001 pier tip, 2002-2004 along the pier, 2011-2016 Chinatown north, 2031 west, ocean east, beach west | TODO: build a postal-to-world table from minimap shots like this (the API reports PostalCode, so this is how live units land on the right block) |
| 010 | refs/010-bayside-boardwalk.jpg | on the pier, near the entrance | S | pier is ~40 studs wide (player 1/8 of it), teal railings ~3.5 studs, yellow edge line, kiosks ~10 studs, arcade ~14 studs, two food trailers, benches; sand right, bay left | TODO: pier width 40 studs; railing colour teal; shop heights as listed |
| 011 | refs/011-bayside-pier-end.jpg | mid pier, postal 2002, at the east railing (minimap in frame) | SE | pier over water on round concrete piles ~4 studs across; deck 12-15 studs above the water; Liberty Apparel kiosk with awning, blue shed, Crab Shack (green, ~16 studs), Bayside Grill (2 storeys, ~25) and a square 2-storey block beside it (~24) carrying a lattice radio mast ~45 studs above its roof; teal railings, yellow edge line, picnic tables and red-white umbrellas | TODO: grill + tower block + mast as the pier-end landmark; pile spacing ~20 studs |
| 012 | refs/012-bayside-pier-end.jpg | above the pier end, looking back to shore | NW | pier end is a wider square platform ~70 studs across; Bayside Grill has a red hip roof and two outside stair flights up to a first-floor deck; the pier runs ~280 studs from shore; office block with the red fin is the first building on shore; the west headland reads as a flat mesa on the horizon | TODO: pier end platform wider than the pier; grill stairs; pier length check against the map |
| 013 | refs/013-bayside-pier-end.jpg | in the water south-west of the pier end | NE | pier end from the water: deck ~10 studs above the sea, piles ~8 showing; two stair flights, umbrellas and benches on the end deck; the west headland behind: long flat top with one peak at the east end, same as 004/005 | TODO: confirms headland profile; pier end deck height |
| 014 | refs/014-bayside-pier-end.jpg | beside the pier end, east side, low | W | tower block carries two masts ~35 studs above its roof with cables between; Crab Shack green with a red roller-door shed in front and a blue shed; concrete piles over water, timber trestle under the shore section; headland again on the horizon | TODO: two masts not one; timber vs concrete pile split at the shoreline |
| 015 | refs/015-bayside-pier-end.jpg | on the pier, postal 2002, looking back to shore (minimap in frame) | N | pier deck is ~2 SUV heights (~12 studs) above the sand; shop row along the east edge of the pier: food trailers, pink arcade, blue Surf's Up, red shed, green Crab Shack; pier ~45 studs wide clear of the shops; low rocky hill with trees NE of the town behind the boardwalk; office block on shore | TODO: shops on the east edge only, west edge is open railing; low hill NE of Bayside |
| 016 | refs/016-east-beach.jpg | east beach, just east of the pier, at the water line | W | pier side on from the east: shore section on timber trestle, water section on concrete piles, deck ~12 studs over the sand; shop row backs onto the beach; office block with red fin and the tan retail row behind; palms ~40 studs; hills on the horizon west and north | TODO: nothing new, confirms pier heights from the east side |
| 017 | refs/017-east-beach.jpg | east beach, in the shallows | N | beach road with white guardrail along the back of the beach; lifeguard tower on stilts ~12 studs; rocky bluff behind the road, ~30 studs, rough grey rock with grass patches and a billboard on top; palms spaced ~60 studs apart along the back of the beach | TODO: bluff behind the east beach road ~30 studs; lifeguard towers x2; guardrail line |
| 018 | refs/018-east-beach.jpg | above the east beach, looking back over Bayside | NW | overview: shop row and pier at left, two lifeguard towers, office block, Bayside retail, downtown behind with one dark tower ~10 storeys and two ~8 storey blocks; the west headland on the far left reads as a flat mesa ~2x the height of the town hills; the east bluff with the billboard runs along the right | TODO: downtown tower heights 8-10 storeys (~90-110 studs); mesa vs hill ratio |
| 019 | refs/019-east-beach.jpg | east beach, mid way along | N | the bluff square on: ~30-35 studs (5 SUV heights), rough faces, flat grassy top, billboard ~25 studs on a pole; a blue water tower tank with masts shows above the bluff to the NE; pagoda-roof building (Chinatown) left of the bluff; lifeguard tower ~12 studs | TODO: water tower is NE of the east beach behind the bluff, find it on the map; Chinatown pagoda roof |
| 020 | refs/020-east-beach.jpg | east beach, further east, from the shallows | N | same bluff full length, ~30 studs, with a cutting through it; water tower and antenna masts behind; brown 3-storey block (~40 studs) with masts at the right, by the river mouth; palms ~40; a second lifeguard tower | TODO: bluff runs the full length of the east beach (world x ~586-742, y ~1484-1574) with a gap; 3-storey block near the river mouth |
| 021 | refs/021-east-beach.jpg | in the sea off the east beach | N | full east beach: bluff behind the road, a grassy knoll with autumn trees at the east end (~20 studs), lifeguard tower, palms; the west headland mesa on the far left horizon | APPLIED: knoll polygon 20 studs |
| 022 | refs/022-bayside-freecam.jpg | free cam above the pier, ~120 studs up | N | the reference angle for the lap: whole of Bayside in one frame. Office block, retail row, Liberty Way running north into downtown; bluff with billboard and Oceanside Drive at right; downtown skyline: dark glass tower ~12 storeys, blue glass tower ~9, brown office ~5, hotel block ~5; two flat-top mesas to the west, the far one bigger than the headland | TODO: downtown tower storeys (12 / 9 / 5); second mesa west of town; roof colours along Liberty Way (tan, brick red) |
| 023-027 | refs/023..027-freecam-bayside-downtown.jpg | free cam: over the pier (N), Bayside block from the east beach (NW), the park west of Bayside (NE, two frames), the west massif from the park (W) | | downtown skyline: dark glass tower 12 storeys, blue glass tower 10, brown office 5, hotel 6; retail row along Oceanside Drive is 2-storey brick; DMV, white 2-storey office, tan single-storey shop; the west massif is a broad grey rock mass with grass patches, peak ~200 studs, ridge ~120 | APPLIED: tower heights 135 / 110 studs, massif ridge 115 + peak 190 |
| 028-032 | not saved (sent mid-turn) | free cam: headland from above (W), east beach from the park lot (SE), downtown west from the park (NE), big retail store + DMV (E), fire station + retail store (E) | | headland is a long flat plateau with a second rise at the west tip; the fenced lot by the beach is a parking lot, not a building; fire station is red brick with a hip roof, cupola and 5 bays, ~30 studs to the ridge, cupola ~45; big retail store ~25 studs; FD training tower ~60 studs | APPLIED: headland tip rise 140; training tower 60. TODO: fire station roof and cupola, retail store |
| 033-037 | not saved (sent mid-turn) | free cam: along the massif ridge (N), massif from the north (S), fire station block (E), water tower and terraced hills (NW), coastal ridge with the highway at its foot (N) | | the coastal ridge continues north of the massif at ~110-120 studs with the highway along its east foot; three terraced hills NW of downtown, 35-55 studs, stepped; the water tower (white bulb on a column, ~90 studs) stands just north-east of the big terraced hill at world (501, 1149); curved 4-storey grey office near the fire station | APPLIED: massif polygon extended north to y 1000; terraced hills 55 / 40 / 35; water tower already at (498, 1145) |

| 038-042 | not saved (sent mid-turn) | free cam: terraced hill by the training lot (W), downtown from that hill (E), NW residential from the top of the water tower (N, two frames), the west escarpment from the residential (W) | | the west escarpment is one continuous cliff wall ~100-110 studs behind the NW residential with two table-top peaks ~125-130; roads run along its foot; residential is 1-2 storey houses on low 10-15 stud terraces; curved office 4 storeys, white office 5 | APPLIED: escarpment polygon y 620-1000 at 105 + two table tops; office heights 45 / 60; fire station 30 |

| 043-051 | not saved (sent mid-turn) | free cam: downtown west from the terraced hill (N, three frames), water tower and NW residential (N, three frames), big retail / hotel row on the NW edge of downtown (N), the river north of the residential (N) | | confirms the applied heights: curved office 4 storeys, white office 5, hotel on the NW edge 4 storeys (~50), big retail stores ~25, houses 1-2 storeys, the three terraced hills 35-55. New: the river north of the residential has low stepped terraces on both banks, 10-25 studs, grass tops with rock risers; the whole west and north horizon is flat-top mesas ~110-130 | TODO: river terraces (10-25 studs) once the north is shot; hotel 50 |

| 052-054 | refs/052..054-freecam-downtown-east.jpg | free cam: river north of downtown with the hotel (NE), Brookstone and the highway from the east bank (NW), terraced hill NE of downtown (N) | | hotel 4 storeys (~50) with a 3-storey red brick office beside it; red brick 3-storey block in a fenced lot east of the 6-lane highway; terraced hill NE of downtown ~45 studs with four grass terraces; low terraces along the river banks 10-20 | APPLIED: hotel 50, brick block 40 (placed by eye at 882,1395), NE hill 45 |

Caveat from the user: objects far from the camera do not load fully in free cam, so terrain can appear to cut through distant buildings. Heights are only read from things near the camera.

## How to shoot useful photos

- Stand next to the thing (building, bridge, sign) so the player is in frame for scale.
- Say the postal code or the street, and roughly which way you are facing.
- One wide shot plus one close shot per landmark beats many angles of the same wall.
- Vehicles: one side view with the player beside it, one front view.
- Terrain: shoot the hills from the road below, and from the top looking down.

## Recorded drives

Record with Xbox Game Bar (Win+Alt+R) or OBS at 1080p, 30 fps. Drive slowly, look at the
things that matter (hills, bridges, building fronts), and say in the commit or message where
the drive starts and ends. Clips go in `video/`; `frames.py` extracts one frame per second,
drops near-duplicates, and writes a contact sheet.

| clip | route | frames kept | notes |
|---|---|---|---|
