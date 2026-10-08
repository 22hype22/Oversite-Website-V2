# Oversite

Live dispatch map for ER:LC private servers: 2D and 3D Liberty County map, unit cards, calls board,
Fire Department MDT, and an admin panel that links the dashboard to the ER:LC API.

## Run it

```
node server.mjs
```

Opens on http://localhost:8080. Set `ERLC_SERVER_KEY` and the relay at `/api/v2/server` uses it, so the
browser never sees the key. Without it, the key typed into the admin panel (gear icon) is forwarded instead.

## Deploy on Railway

1. New project, deploy from this GitHub repo. Railway detects Node and runs `node server.mjs`.
2. Variables: add `ERLC_SERVER_KEY` (from the in-game Settings, ER:LC API section). Never commit it.
3. Settings, Networking: add the custom domain `oversitescad.com` (and `www.oversitescad.com`) and create the
   CNAME records Railway shows at the registrar.
4. In the dashboard admin panel leave Relay URL empty: when the page is served over https it uses `/api` on
   the same origin automatically.

## Rebuild the pages

Edits go in `preview/live-map.html` and the generator scripts; then:

```
python3 preview/build-rail.py && python3 preview/build-3d.py
```

`preview/newmap/` holds the map pipeline (terrain, buildings, roads, routes) and the photo reference ledger.
