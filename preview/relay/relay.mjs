#!/usr/bin/env node
// Tiny relay for the Oversite dashboard: forwards /v2/server requests to api.erlc.gg, adds CORS,
// and keeps the server key out of the browser. Node 18+ required, no dependencies.
//
//   ERLC_SERVER_KEY=xxxx node preview/relay/relay.mjs
//   PORT=8787 ALLOW_ORIGIN=* are optional. Then set "Relay URL" in the dashboard admin panel to http://localhost:8787
//
// If ERLC_SERVER_KEY is not set, the key typed in the dashboard is forwarded instead (header server-key).
import http from 'node:http';
const KEY = process.env.ERLC_SERVER_KEY || '', PORT = +(process.env.PORT || 8787), ORIGIN = process.env.ALLOW_ORIGIN || '*';
const UPSTREAM = 'https://api.erlc.gg', MIN_GAP = 4000;
const cache = new Map();   // url -> { t, status, body, headers }
http.createServer(async (req, res) => {
  res.setHeader('access-control-allow-origin', ORIGIN); res.setHeader('access-control-allow-headers', 'server-key, content-type'); res.setHeader('access-control-expose-headers', 'x-ratelimit-limit, x-ratelimit-remaining, x-ratelimit-reset, retry-after');
  if (req.method === 'OPTIONS') { res.writeHead(204); return res.end(); }
  if (req.method !== 'GET' || !req.url.startsWith('/v2/server')) { res.writeHead(404, { 'content-type': 'application/json' }); return res.end('{"message":"only GET /v2/server... is relayed"}'); }
  const key = req.headers['server-key'] || KEY; if (!key) { res.writeHead(401, { 'content-type': 'application/json' }); return res.end('{"code":2000,"message":"No server key: set ERLC_SERVER_KEY or type it in the dashboard"}'); }
  const hit = cache.get(req.url); if (hit && Date.now() - hit.t < MIN_GAP) return send(res, hit);
  try { const up = await fetch(UPSTREAM + req.url, { headers: { 'server-key': key } }); const body = await up.text();
    const headers = {}; for (const h of ['x-ratelimit-limit', 'x-ratelimit-remaining', 'x-ratelimit-reset', 'retry-after']) if (up.headers.get(h)) headers[h] = up.headers.get(h);
    const out = { t: Date.now(), status: up.status, body, headers }; if (up.ok) cache.set(req.url, out); send(res, out); }
  catch (e) { res.writeHead(502, { 'content-type': 'application/json' }); res.end(JSON.stringify({ message: 'relay could not reach api.erlc.gg: ' + e.message })); }
}).listen(PORT, () => console.log(`Oversite relay on http://localhost:${PORT} -> ${UPSTREAM} (${KEY ? 'key from env' : 'key from the dashboard'})`));
function send(res, r) { res.writeHead(r.status, { 'content-type': 'application/json', ...r.headers }); res.end(r.body); }
