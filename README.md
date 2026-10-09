# Oversite

A live CAD for ER:LC private servers. Anyone can create a server on the front page with their own owner code; members
sign in with the member code the owner gives them. Each server connects its ER:LC key and gets its own live 2D/3D map
of Liberty County, dispatch board and department MDTs at `/c/<address>`.

Codes: the owner code gives full control, the member code normal access. Both are unique across the site (so a code
alone finds its server), ignore case and spacing, and can be changed in Settings. People link their Roblox account once
(dashboard); signing in on a second device and linking the same Roblox account folds the two accounts together.

## How it fits together

- `server.mjs`: routes, private-preview lock, community API under `/c/<address>/api/...`.
- `app/db.mjs`: SQLite (Node's built-in driver) in `DATA_DIR` (`/data` on Railway). Server keys are encrypted at rest.
- `app/feed.mjs`: one live ER:LC feed per community, paced by the API's rate-limit headers, streamed to members.
- `app/auth.mjs`: Discord sign-in, owner-code sign-in, sessions, Roblox account linking (profile phrase check).
- `app/pages.mjs`: landing, dashboard, community settings and invite pages.
- `preview/`: the CAD page itself (built by the generators below); the server injects each community's settings.

## Run it

```
npm start        # node --experimental-sqlite server.mjs (Node 22.5 or newer)
```

Opens on http://localhost:8080.

| Variable | What it does |
|---|---|
| `ACCESS_CODE` | Puts the whole site behind a numeric preview code. Also the owner sign-in code unless `OWNER_CODE` is set. |
| `OWNER_CODE`, `OWNER_LOGIN=1` | Optional site-wide owner sign-in (off by default; server codes replace it). |
| `DISCORD_CLIENT_ID`, `DISCORD_CLIENT_SECRET` | Turn on "Continue with Discord". |
| `DISCORD_BOT_TOKEN` | With the two above: owners can link their Discord server and give access by role. |
| `ROBLOX_CLIENT_ID`, `ROBLOX_CLIENT_SECRET` | Turn on "Link with Roblox" and "Sign in with Roblox" (replaces typing a username). |
| `PUBLIC_URL` | Optional, e.g. `https://www.oversitescad.com`; used for the Discord redirect and invite links. |
| `APP_SECRET` | Optional; encrypts server keys. Without it a random secret is created next to the database. |
| `DATA_DIR` | Where the database lives (default `/data` if present, else `./.data`). |

## Discord server linking (access by role)

1. In the same Discord application: **Bot**, reset/copy the token into `DISCORD_BOT_TOKEN`. No privileged intents are needed.
2. **OAuth2, Redirects**: add both `https://www.oversitescad.com/auth/discord/callback` and `https://www.oversitescad.com/auth/discord/guild`.
3. An owner opens Settings, Discord server, Connect Discord server, picks their server, then ticks which roles mean Member, Staff and Admin.
   Anyone who signs in with Discord gets the highest access their roles give (checked live, cached for a minute).

## Roblox account linking

Players link their Roblox account by signing in on roblox.com (OAuth), so the link is always the right account.

1. In the Roblox Creator Dashboard (create.roblox.com), switch the owner at the top left to the **Oversite Customs** group, then open **Credentials, OAuth 2.0 Apps** and create an app.
2. Redirect URL: `https://www.oversitescad.com/auth/roblox/callback`. Scopes: `openid` and `profile`.
3. Add `ROBLOX_CLIENT_ID` and `ROBLOX_CLIENT_SECRET` to the Railway service variables and redeploy.

Until those are set, the dashboard falls back to verifying a phrase on the player's Roblox profile.

## Discord sign-in

1. https://discord.com/developers/applications, New Application, name it Oversite.
2. OAuth2: copy the Client ID and reset/copy the Client Secret. Add the redirect
   `https://www.oversitescad.com/auth/discord/callback`.
3. Add `DISCORD_CLIENT_ID` and `DISCORD_CLIENT_SECRET` to the Railway service variables and redeploy.
   An owner who signed in with the code can then press "Link Discord" on the dashboard.

## Deploy on Railway

Railway builds with Nixpacks on Node 22 (`.nixpacks.toml`) and needs a volume mounted at `/data` for the database.
Custom domains: `oversitescad.com` redirects to `www.oversitescad.com`.

## Rebuild the pages

Edits go in `preview/live-map.html` and the generator scripts; then:

```
npm run pages   # or: python3 preview/build-rail.py && python3 preview/build-3d.py
```

`preview/newmap/` holds the map pipeline (terrain, buildings, roads, routes) and the photo reference ledger.
