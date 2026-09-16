# Liberty County terrain survey

Goal: measured heights for the 3D map. The ER:LC v2 API gives your exact X/Z position; a screenshot at each stop with your car in frame gives the height. Together they replace guesswork.

## One-time setup (your PC)
1. Install Node 18 or newer (https://nodejs.org).
2. Get your private server key from the ER:LC server settings. Keep it to yourself; the script only ever sends it to api.erlc.gg.
3. In this folder run (PowerShell):
   ```powershell
   $env:ERLC_SERVER_KEY = "your-key-here"
   node survey/track.js --player YourRobloxName
   ```
   (macOS/Linux: `ERLC_SERVER_KEY=your-key node survey/track.js --player YourRobloxName`)

It prints your position every 3 seconds and appends it to `survey/track.jsonl`.

## The run (about 30 minutes)
Open `survey/stops-map.png`. Drive the stops in order. At each stop:
1. Park facing the thing you are measuring.
2. In the tracker window type a short note (e.g. `1 tunnel`) and press Enter. That writes a marker with your exact position.
3. Take your screenshot in Roblox (F12 saves to Pictures/Roblox) within a few seconds, so its timestamp matches the marker.
4. For hills: one shot side-on from the bottom with the car in frame, then drive to the top, drop another marker, and shoot back down.

Stops 3 (fountain plaza) and 4 (water tower) are calibration points: stand right at the object and drop the marker. Those two readings let me convert API coordinates to the model exactly.

## Stops
| # | Stop | What to capture |
|---|---|---|
| 1 | Tunnel entrance (west of gas station) | shoot the portal side-on from the road, then from on top of the hill looking down |
| 2 | Fire station (postal 401, Fairfax Road) | side-on with your car in front |
| 3 | Fountain plaza pool (postal 216) — calibration point A | stand at the fountain; log a marker |
| 4 | Water tower (postal 405) — calibration point B | stand at the base; log a marker; one shot side-on from 30 m |
| 5 | West hill top | drive up if you can; shot looking back down at downtown |
| 6 | South bridge (Freedom Ave) | shot along the river from mid-bridge, both directions |
| 7 | Riverside cave | stand at the mouth; shot from across the river |
| 8 | North bridge (Orchard Blvd) | shot along the river |
| 9 | Hospital | side-on with car |
| 10 | West suburb centre | one shot toward the rock rim, one toward the water tower |
| 11 | North lake shore (south-west bank, postal 903) | shot across the lake toward the highway bridge |
| 12 | Highway 55 north end | shot south along the highway |
| 13 | Eastern highlands: bottom of the trail | shot up the hill side-on |
| 14 | Eastern highlands: top | shot back down toward the highway, car in frame |
| 15 | Industrial area (north-east) | one wide shot of the yards |
| 16 | Mesa top (north-west) | shot along the edge showing the drop |

## What to send back
- `survey/track.jsonl`
- The screenshots, three or four per message here, named or captioned with the stop number.

Do not send the server key.
