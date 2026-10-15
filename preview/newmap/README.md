# New-map build pipeline (ER:LC map update, Oct 2026)

Source: the official 5355x5355 map from https://api.erlc.gg/maps/fall_blank.png (not committed; ~17 MB).

1. `build-masks.py <fall_blank.png> <out.png>` – sea / water / land / rock / road masks (saved as `<out>_masks.npy`)
2. `build-heightmap.py <masks.npy> <height.png> <target_height> <fall_blank.png>` – height = rock crossed from the sea
3. `build-base.py <scratch dir>` – texture (`liberty-county.jpg`), dark-mode map, copies the heightmap
4. `extract-3d.py <scratch dir>` – building footprints and trees → `liberty-county-3d.json`
5. `../build-rail.py`, then `../build-3d.py` – regenerate the pages
6. `tame-terrain.py height-base.png <masks.npy> ../liberty-county-height.png` – rolling hills at measured heights (guessed ones under ~50 studs),
   smooth roads, a level pad under every building; written 16-bit (red = high byte, green = low byte) for `3d.js`.
   `height-base.png` is the 8-bit heightmap from steps 2 + `apply-heights.py`, kept as the input.
7. `build-darkmap.py ../liberty-county-darkmode.jpg 4096` – the 2D dark map: white roads (from `roadnet.json`) and coast, grey
   buildings, contour lines every 2.5 units. Run it after step 6 so the contours match the 3D terrain.

World grid is still 0..2000 units = the full map image; 1 world unit = 2.6775 official px.
The old `survey/` stop map refers to the previous map and needs redoing.
