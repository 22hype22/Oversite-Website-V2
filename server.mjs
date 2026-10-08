#!/usr/bin/env node
// Oversite web server: serves the dashboard from preview/ and relays /api/v2/server to the ER:LC API.
// Railway runs `npm start`; set ERLC_SERVER_KEY in the service variables so the key never touches the browser.
import http from 'node:http';
import { createReadStream, statSync, existsSync } from 'node:fs';
import { join, extname, normalize } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHmac, timingSafeEqual } from 'node:crypto';
import { readFileSync } from 'node:fs';

const ROOT = join(fileURLToPath(new URL('.', import.meta.url)), 'preview');
const PORT = +(process.env.PORT || 8080);
const KEY = process.env.ERLC_SERVER_KEY || '';
const CODE = (process.env.ACCESS_CODE || '').trim();          // preview lock: digits visitors must enter; empty = site is open
const LOGO = readFileSync(join(ROOT, 'logo.png')).toString('base64');
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

// ── preview lock: a numeric access code, remembered in a cookie for 30 days ──
const sign = v => createHmac('sha256', 'oversite-preview:' + CODE).update(v).digest('hex');
const COOKIE = 'ov_access';
const hasAccess = req => { if (!CODE) return true; const m = /(?:^|;\s*)ov_access=([0-9a-f]{64})/.exec(req.headers.cookie || ''); if (!m) return false;
  const want = Buffer.from(sign(CODE)), got = Buffer.from(m[1]); return want.length === got.length && timingSafeEqual(want, got); };
const attempts = new Map();                                                  // ip -> { n, until }
const ipOf = req => (req.headers['x-forwarded-for'] || req.socket.remoteAddress || '').split(',')[0].trim();
const lockPage = (msg = '') => `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Oversite</title>
<link rel="icon" type="image/png" href="data:image/png;base64,${LOGO}">
<style>
:root{color-scheme:dark}*{box-sizing:border-box}body{margin:0;min-height:100dvh;display:grid;place-items:center;background:#0B0B0C;color:#F0F2F5;font:15px/1.45 "Geist",system-ui,-apple-system,"Segoe UI",sans-serif;padding:16px}
.card{width:min(360px,100%);padding:28px 24px 24px;border:1px solid rgba(240,242,245,.1);border-radius:16px;background:#131316}
.mark{width:40px;height:40px;border-radius:10px;background:#1C1C1F;border:1px solid rgba(240,242,245,.1);display:grid;place-items:center;margin-bottom:18px}.mark img{width:22px;height:22px}
h1{margin:0 0 4px;font-size:18px;font-weight:600;letter-spacing:-.01em}p{margin:0 0 18px;color:#8C9098;font-size:13px}
input{width:100%;padding:14px 16px;font:inherit;font-size:24px;letter-spacing:.32em;text-align:center;color:#F0F2F5;background:#0B0B0C;border:1px solid rgba(240,242,245,.16);border-radius:10px;outline:none;font-variant-numeric:tabular-nums}
input:focus{border-color:rgba(240,242,245,.5)}button{margin-top:12px;width:100%;padding:12px;font:inherit;font-size:14px;font-weight:600;color:#0B0B0C;background:#F0F2F5;border:0;border-radius:10px;cursor:pointer}
button:active{transform:translateY(1px)}.err{margin:12px 0 0;color:#F0A0A0;font-size:13px}.foot{margin-top:18px;color:#5B5F66;font-size:12px}
</style></head><body><form class="card" method="post" action="/unlock" autocomplete="off">
<div class="mark"><img src="data:image/png;base64,${LOGO}" alt=""></div>
<h1>Oversite</h1><p>This dashboard is in private preview. Enter the access code to continue.</p>
<input name="code" inputmode="numeric" pattern="[0-9]*" maxlength="12" placeholder="••••••" autofocus aria-label="Access code">
<button type="submit">Unlock</button>${msg ? `<p class="err">${msg}</p>` : ''}
<div class="foot">Codes are issued by the Oversite team.</div></form></body></html>`;
const unlock = (req, res, code) => { const ip = ipOf(req), a = attempts.get(ip) || { n: 0, until: 0 };
  if (Date.now() < a.until) { res.writeHead(429, { 'content-type': 'text/html; charset=utf-8' }); return res.end(lockPage('Too many tries. Wait a minute and try again.')); }
  if (code && code === CODE) { attempts.delete(ip); const secure = (req.headers['x-forwarded-proto'] || '').startsWith('https') ? '; Secure' : '';
    res.writeHead(303, { location: '/', 'set-cookie': `${COOKIE}=${sign(CODE)}; Path=/; Max-Age=2592000; HttpOnly; SameSite=Lax${secure}` }); return res.end(); }
  a.n++; if (a.n >= 5) { a.n = 0; a.until = Date.now() + 60000; } attempts.set(ip, a);
  res.writeHead(401, { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-store' }); res.end(lockPage('That code is not right.')); };
const gate = (req, res, next) => {
  const [path, qs] = req.url.split('?');
  if (path === '/health') return next();
  if (path === '/unlock' && req.method === 'POST') { let body = ''; req.on('data', c => { body += c; if (body.length > 1e4) req.destroy(); }); req.on('end', () => unlock(req, res, decodeURIComponent((body.match(/(?:^|&)code=([^&]*)/) || [])[1] || '').trim())); return; }
  if (path === '/lock') { res.writeHead(200, { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-store', 'set-cookie': `${COOKIE}=; Path=/; Max-Age=0` }); return res.end(lockPage()); }
  const q = new URLSearchParams(qs || '').get('code'); if (q && CODE) return unlock(req, res, q.trim());
  if (hasAccess(req)) return next();
  if (path.startsWith('/api/')) { res.writeHead(401, { 'content-type': 'application/json' }); return res.end('{"message":"locked"}'); }
  res.writeHead(401, { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-store' }); res.end(lockPage());
};

http.createServer((req, res) => gate(req, res, () => (req.url.startsWith('/api/') ? relay(req, res) : serve(req, res))))
  .listen(PORT, () => console.log(`Oversite on http://localhost:${PORT} (${KEY ? 'server key from env' : 'no server key set, the dashboard must supply one'}; ${CODE ? 'preview lock on' : 'no access code, site is open'})`));
