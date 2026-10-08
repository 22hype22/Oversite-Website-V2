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
const lockPage = (msg = '') => { const n = Math.min(8, Math.max(4, CODE.length || 4)); return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Oversite</title>
<link rel="icon" type="image/png" href="data:image/png;base64,${LOGO}">
<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin><link href="https://fonts.googleapis.com/css2?family=Geist:wght@300;400;500;600&display=swap" rel="stylesheet">
<style>
:root{color-scheme:dark;--ink:#F0F2F5;--dim:#8C9098;--faint:#5B5F66;--hair2:rgba(240,242,245,.14)}*{box-sizing:border-box}html,body{height:100%;margin:0}
body{font:15px/1.45 "Geist",system-ui,-apple-system,"Segoe UI",sans-serif;color:var(--ink);background:#386069;overflow:hidden}
.map{position:fixed;inset:0;background:#386069 url(/liberty-county.jpg) center/cover no-repeat;filter:brightness(.55) saturate(.9)}
.map::after{content:"";position:absolute;inset:0;background:radial-gradient(ellipse at 50% 40%,rgba(11,11,12,.35),rgba(11,11,12,.78))}
.wrap{position:fixed;inset:0;display:grid;place-items:center;padding:16px}
form{text-align:center;width:min(440px,100%)}
.mark{width:40px;height:40px;border-radius:10px;background:rgba(28,28,31,.66);border:1px solid rgba(240,242,245,.08);display:grid;place-items:center;margin:0 auto 18px;backdrop-filter:blur(40px) saturate(1.25)}.mark img{width:22px;height:22px}
h1{margin:0;font-size:22px;font-weight:300;letter-spacing:-.02em}h1 b{font-weight:600}
p{margin:6px 0 0;color:var(--dim);font-size:13px}
.boxes{display:flex;gap:10px;justify-content:center;margin:26px 0 18px;cursor:text}
.boxes i{width:52px;height:64px;border-radius:12px;background:rgba(13,13,15,.62);border:1px solid var(--hair2);backdrop-filter:blur(40px) saturate(1.25);display:grid;place-items:center;font-style:normal;font-size:28px;font-weight:500;transition:border-color .15s}
.boxes i.on{border-color:rgba(240,242,245,.5)}.boxes i.cur{border-color:var(--ink);box-shadow:inset 0 0 0 1px var(--ink)}
form.err .boxes i{border-color:#E24B4B}form.shake .boxes{animation:shake .4s}
@keyframes shake{20%{transform:translateX(-6px)}40%{transform:translateX(6px)}60%{transform:translateX(-4px)}80%{transform:translateX(4px)}}
input{position:absolute;opacity:0;width:1px;height:1px;left:-9999px}
.hint{color:var(--faint);font-size:12px}.msg{color:#F0A0A0;font-size:13px;margin:0 0 8px}
@media (max-width:420px){.boxes{gap:6px}.boxes i{width:44px;height:56px;font-size:24px}}
@media (prefers-reduced-motion:reduce){form.shake .boxes{animation:none}}
</style></head><body><div class="map"></div><div class="wrap">
<form method="post" action="/unlock" autocomplete="off" id="f" class="${msg ? 'err shake' : ''}">
<div class="mark"><img src="data:image/png;base64,${LOGO}" alt=""></div>
<h1><b>Oversite</b> is in private preview</h1><p>Enter your ${['four','five','six','seven','eight'][n - 4]}-digit access code.</p>
<label class="boxes" id="boxes" for="code">${'<i></i>'.repeat(n)}</label>
<input id="code" name="code" inputmode="numeric" pattern="[0-9]*" maxlength="${n}" autofocus aria-label="Access code">
${msg ? `<p class="msg">${msg}</p>` : ''}<span class="hint">Remembered on this browser for 30 days.</span></form></div>
<script>
const f=document.getElementById('f'),inp=document.getElementById('code'),cells=[...document.querySelectorAll('#boxes i')],N=${n};
const paint=()=>{const v=inp.value.replace(/\\D/g,'').slice(0,N);inp.value=v;cells.forEach((c,i)=>{c.textContent=v[i]||'';c.className=v[i]?'on':(i===v.length?'cur':'');});if(v.length===N)f.submit();};
inp.addEventListener('input',paint);document.getElementById('boxes').addEventListener('click',()=>inp.focus());document.addEventListener('click',()=>inp.focus());
f.addEventListener('animationend',()=>f.classList.remove('shake'));paint();inp.focus();
</script></body></html>`; };
const unlock = (req, res, code) => { const ip = ipOf(req), a = attempts.get(ip) || { n: 0, until: 0 };
  if (Date.now() < a.until) { res.writeHead(429, { 'content-type': 'text/html; charset=utf-8' }); return res.end(lockPage('Too many tries. Wait a minute and try again.')); }
  if (code && code === CODE) { attempts.delete(ip); const secure = (req.headers['x-forwarded-proto'] || '').startsWith('https') ? '; Secure' : '';
    res.writeHead(303, { location: '/', 'set-cookie': `${COOKIE}=${sign(CODE)}; Path=/; Max-Age=2592000; HttpOnly; SameSite=Lax${secure}` }); return res.end(); }
  a.n++; if (a.n >= 5) { a.n = 0; a.until = Date.now() + 60000; } attempts.set(ip, a);
  res.writeHead(401, { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-store' }); res.end(lockPage('That code is not right.')); };
const gate = (req, res, next) => {
  const [path, qs] = req.url.split('?');
  if (path === '/health' || path === '/liberty-county.jpg') return next();           // the lock page shows the map behind it
  if (path === '/unlock' && req.method === 'POST') { let body = ''; req.on('data', c => { body += c; if (body.length > 1e4) req.destroy(); }); req.on('end', () => unlock(req, res, decodeURIComponent((body.match(/(?:^|&)code=([^&]*)/) || [])[1] || '').trim())); return; }
  if (path === '/lock') { res.writeHead(200, { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-store', 'set-cookie': `${COOKIE}=; Path=/; Max-Age=0` }); return res.end(lockPage()); }
  const q = new URLSearchParams(qs || '').get('code'); if (q && CODE) return unlock(req, res, q.trim());
  if (hasAccess(req)) return next();
  if (path.startsWith('/api/')) { res.writeHead(401, { 'content-type': 'application/json' }); return res.end('{"message":"locked"}'); }
  res.writeHead(401, { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-store' }); res.end(lockPage());
};

http.createServer((req, res) => gate(req, res, () => (req.url.startsWith('/api/') ? relay(req, res) : serve(req, res))))
  .listen(PORT, () => console.log(`Oversite on http://localhost:${PORT} (${KEY ? 'server key from env' : 'no server key set, the dashboard must supply one'}; ${CODE ? 'preview lock on' : 'no access code, site is open'})`));
