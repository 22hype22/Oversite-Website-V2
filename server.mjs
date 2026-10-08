#!/usr/bin/env node
// Oversite web server: serves the dashboard from preview/ and relays /api/v2/server to the ER:LC API.
// Railway runs `npm start`; set ERLC_SERVER_KEY in the service variables so the key never touches the browser.
import http from 'node:http';
import { createReadStream, statSync, existsSync } from 'node:fs';
import { join, extname, normalize } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(fileURLToPath(new URL('.', import.meta.url)), 'preview');
const PORT = +(process.env.PORT || 8080);
const KEY = process.env.ERLC_SERVER_KEY || '';
const UPSTREAM = 'https://api.erlc.gg', MIN_GAP = 4000;
const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.mjs': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png', '.webp': 'image/webp', '.svg': 'image/svg+xml', '.ico': 'image/x-icon', '.md': 'text/plain; charset=utf-8', '.txt': 'text/plain; charset=utf-8', '.woff2': 'font/woff2' };
const cache = new Map();

const relay = async (req, res) => {
  res.setHeader('access-control-expose-headers', 'x-ratelimit-limit, x-ratelimit-remaining, x-ratelimit-reset, retry-after');
  const path = req.url.replace(/^\/api/, '');
  if (req.method !== 'GET' || !path.startsWith('/v2/server')) { res.writeHead(404, { 'content-type': 'application/json' }); return res.end('{"message":"only GET /api/v2/server... is relayed"}'); }
  const key = KEY || req.headers['server-key'];
  if (!key) { res.writeHead(401, { 'content-type': 'application/json' }); return res.end('{"code":2000,"message":"No server key: set ERLC_SERVER_KEY on the server or enter it in the admin panel"}'); }
  const hit = cache.get(path); if (hit && Date.now() - hit.t < MIN_GAP) return send(res, hit);
  try {
    const up = await fetch(UPSTREAM + path, { headers: { 'server-key': key } }); const body = await up.text();
    const headers = {}; for (const h of ['x-ratelimit-limit', 'x-ratelimit-remaining', 'x-ratelimit-reset', 'retry-after']) if (up.headers.get(h)) headers[h] = up.headers.get(h);
    const out = { t: Date.now(), status: up.status, body, headers }; if (up.ok) cache.set(path, out); send(res, out);
  } catch (e) { res.writeHead(502, { 'content-type': 'application/json' }); res.end(JSON.stringify({ message: 'relay could not reach api.erlc.gg: ' + e.message })); }
};
const send = (res, r) => { res.writeHead(r.status, { 'content-type': 'application/json', 'cache-control': 'no-store', ...r.headers }); res.end(r.body); };

const serve = (req, res) => {
  let url = decodeURIComponent(req.url.split('?')[0]);
  if (url === '/' || url === '/index.html') url = '/live-map-3d.html';
  if (url === '/health') { res.writeHead(200, { 'content-type': 'text/plain' }); return res.end('ok'); }
  const file = normalize(join(ROOT, url));
  if (!file.startsWith(ROOT) || !existsSync(file) || !statSync(file).isFile()) { res.writeHead(404, { 'content-type': 'text/plain' }); return res.end('Not found'); }
  const ext = extname(file).toLowerCase();
  const headers = { 'content-type': TYPES[ext] || 'application/octet-stream', 'cache-control': ext === '.html' ? 'no-cache' : 'public, max-age=86400' };
  if (ext === '.html') headers['x-frame-options'] = 'SAMEORIGIN';
  res.writeHead(200, headers); createReadStream(file).pipe(res);
};

http.createServer((req, res) => (req.url.startsWith('/api/') ? relay(req, res) : serve(req, res)))
  .listen(PORT, () => console.log(`Oversite on http://localhost:${PORT} (${KEY ? 'server key from env' : 'no server key set, the dashboard must supply one'})`));
