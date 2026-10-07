# Oversite relay

The dashboard can call `api.erlc.gg` straight from the browser. If the browser blocks that (CORS), or you
would rather keep the server key off the dashboard entirely, run this relay on your own machine or a small VPS.

```
ERLC_SERVER_KEY=your-private-server-key node preview/relay/relay.mjs
```

Then open the dashboard, click the gear, and set **Relay URL** to `http://localhost:8787`. Leave the server key
field empty when the key is set on the relay. Never commit the key to this repo.

Options: `PORT` (default 8787), `ALLOW_ORIGIN` (default `*`). Responses are cached for 4 seconds so several
open dashboards share one request. Rate-limit headers from the API are passed through.
