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
| Studs per world unit | TBD | needs one measured object + its map footprint |

## Photo log

Columns: id, file, postal / street, facing, what it shows, what it changes in the model.

| id | file | where | facing | shows | model change |
|---|---|---|---|---|---|

## How to shoot useful photos

- Stand next to the thing (building, bridge, sign) so the player is in frame for scale.
- Say the postal code or the street, and roughly which way you are facing.
- One wide shot plus one close shot per landmark beats many angles of the same wall.
- Vehicles: one side view with the player beside it, one front view.
- Terrain: shoot the hills from the road below, and from the top looking down.
