# Liberty County 3D reference ledger

Every photo the user sends gets a row here. The model is rebuilt from this ledger,
not from memory. Nothing in the 3D scene should contradict a logged photo.

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
| Studs per world unit | ~4 (tentative) | bridge road: ~6 lanes over ~21 units on the map, lane ~12 studs. Confirm with a cruiser photo |
| SUV (civ, blue) | ~17 x 8 x 6.5 studs | photos 002/003, player beside it |
| Bridge deck (road to underside) | ~3 studs slab + ~4 stud parapet | photo 001/002 |
| Bridge clearance (water to underside) | ~13 studs | photo 001, player on the abutment rock is ~0.4 of it |
| Apartment storey | ~11 studs, ground floor retail ~14 | photo 003, Brookstone Apartments |

## Postal grid (from in-game minimap shots)

| postal | area | world position |
|---|---|---|
| 2001 | Bayside Boardwalk pier tip | ~ (560, 1672) |
| 2002-2004 | pier, tip to entrance | ~ (560, 1660-1600) |
| 2011-2016 | Chinatown, north of the boardwalk | TBD |
| 2031 | beach road west of the boardwalk | TBD |

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
