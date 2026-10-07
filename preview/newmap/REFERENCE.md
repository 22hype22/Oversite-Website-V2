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

## Photo log

Columns: id, file, postal / street, facing, what it shows, what it changes in the model.

| id | file | where | facing | shows | model change |
|---|---|---|---|---|---|
| 001 | refs/001-river-bridge.jpg | south of the downtown river bridge, in the channel; map px ~1115,1830 (world ~871,1430) | N | two-span concrete bridge, one centre pier, river ~37 units wide; Brookstone Apartments (4 storeys + roof tower, brick ground floor) on the west bank just north of the road; rocky abutments both sides | TODO: bridge as its own object (deck 3 + parapet 4 studs, 13 stud clearance, pier ~4 studs wide); apartment block ~50 studs + 10 stud tower |
| 002 | refs/002-river-bridge.jpg | east abutment rock, below the bridge | SW | bridge side on with hammerhead pier; west knoll south of the bridge, grassy with rock faces, ~20-25 studs above water; pines ~30-35, palms ~35-40, cherry ~20 studs; sea horizon beyond | TODO: knoll heights, tree species per knoll (pine + palm + cherry mix), palms along the coast |
| 003 | refs/003-river-bridge.jpg | on the bridge, east end | W | road cross-section: sidewalk, 2 lanes WB, centre median/turn, 2 lanes EB, right-turn-only lane peeling north on the east bank; SUV ~17 x 8 x 6.5 studs; teal glass tower ~10 storeys further west; 3-storey pink commercial block NW of the bridge | TODO: lane count on the main downtown road, tower height, bridge parapets |

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
