#!/usr/bin/env node
// Oversite web server: serves the dashboard from preview/ and relays /api/v2/server to the ER:LC API.
// Railway runs `npm start`; set ERLC_SERVER_KEY in the service variables so the key never touches the browser.
import http from 'node:http';
import { createReadStream, statSync, existsSync, writeFileSync } from 'node:fs';
import { join, extname, normalize, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHmac, timingSafeEqual } from 'node:crypto';
import { readFileSync } from 'node:fs';

const ROOT = join(fileURLToPath(new URL('.', import.meta.url)), 'preview');
const PORT = +(process.env.PORT || 8080);
const KEY_FILE = process.env.KEY_FILE || (existsSync('/data') ? '/data/erlc.key' : join(ROOT, '..', '.erlc.key'));   // Railway volume at /data keeps it across deploys
let KEY = process.env.ERLC_SERVER_KEY || '';                      // can also be saved from the admin panel (POST /admin/key)
if (!KEY) { try { KEY = readFileSync(KEY_FILE, 'utf8').trim(); } catch (e) {} }
const CAL_FILE = process.env.CAL_FILE || join(dirname(KEY_FILE), existsSync('/data') ? 'cal.json' : '.oversite-cal.json');
let CAL = { auto: {}, manual: [] };                                  // auto: postal -> mean stud position seen there; manual: hand-placed points
try { CAL = { ...CAL, ...JSON.parse(readFileSync(CAL_FILE, 'utf8')) }; } catch (e) {}
let calDirty = false, calSaved = 0; const seenAt = new Map();
const learn = body => { let j; try { j = JSON.parse(body); } catch (e) { return; } const now = Date.now();
  for (const p of j.Players || []) { const L = p.Location, code = String(L?.PostalCode || '').trim(); if (!L || !code || !Number.isFinite(L.LocationX) || !Number.isFinite(L.LocationZ)) continue;
    const prev = seenAt.get(p.Player); if (prev && Math.hypot(L.LocationX - prev.x, L.LocationZ - prev.z) < 8 && now - prev.t < 15000) continue;   // count a spot once, not every snapshot
    seenAt.set(p.Player, { x: L.LocationX, z: L.LocationZ, t: now });
    const a = CAL.auto[code] || { sx: 0, sz: 0, n: 0 }, n = Math.min(a.n + 1, 400); a.sx += (L.LocationX - a.sx) / n; a.sz += (L.LocationZ - a.sz) / n; a.n = n; CAL.auto[code] = a; calDirty = true; }
  if (calDirty && now - calSaved > 20000) saveCal(); };
const saveCal = () => { calDirty = false; calSaved = Date.now(); try { writeFileSync(CAL_FILE, JSON.stringify(CAL)); } catch (e) {} };
const saveKey = k => { try { writeFileSync(KEY_FILE, k + '\n', { mode: 0o600 }); return true; } catch (e) { return false; } };
const RW = process.env.RAILWAY_TOKEN || '', RW_IDS = { project: process.env.RAILWAY_PROJECT_ID, env: process.env.RAILWAY_ENVIRONMENT_ID, service: process.env.RAILWAY_SERVICE_ID };
const CODE = (process.env.ACCESS_CODE || '').trim();          // preview lock: digits visitors must enter; empty = site is open
const CANON = (process.env.CANONICAL_HOST || 'www.oversitescad.com').toLowerCase();   // apex requests are sent here so every visit shares one origin (and one saved key)
const LOGO = readFileSync(join(ROOT, 'logo.png')).toString('base64');
const UPSTREAM = process.env.ERLC_UPSTREAM || 'https://api.erlc.gg', MIN_GAP = 600;   // fastest the feed will ever ask the API, whatever the headers say
const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.mjs': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png', '.webp': 'image/webp', '.svg': 'image/svg+xml', '.ico': 'image/x-icon', '.md': 'text/plain; charset=utf-8', '.txt': 'text/plain; charset=utf-8', '.woff2': 'font/woff2' };
const cache = new Map();
const RL = ['x-ratelimit-limit', 'x-ratelimit-remaining', 'x-ratelimit-reset', 'retry-after'];
const pickRL = h => { const out = {}; for (const k of RL) if (h.get(k)) out[k] = h.get(k); return out; };

// ── live feed: one upstream loop paced by the API's rate-limit headers, fanned out to every open dashboard over server-sent events ──
const QUERY = '/v2/server?Players=true&Vehicles=true&EmergencyCalls=true&JoinLogs=true';
const QUERY_FAST = '/v2/server?Players=true&Vehicles=true&EmergencyCalls=true';   // join logs only change on joins: fetched every 20th request and reused
const IDLE_STOP = 30000;                                            // keep polling this long after the last dashboard closes
const FLOOR = +(process.env.FEED_FLOOR_MS || 250);                  // never ask more often than this, whatever the headers allow
const feed = { snap: null, clients: new Set(), timer: null, inflight: 0, lastClient: 0, nextAt: 0, seq: 0, shown: 0, rl: null, rlSeq: 0, holdUntil: 0, penaltyUntil: 0, n: 0, joins: null, sent: [] };
const NOKEY = '{"code":2000,"message":"No server key: set ERLC_SERVER_KEY on the server or enter it in the admin panel"}';
const bcast = (ev, data, id) => { const msg = `event: ${ev}\n${id ? `id: ${id}\n` : ''}data: ${data}\n\n`; for (const c of feed.clients) c.write(msg); };
// time between requests: spread what the rate limit has left evenly until it resets, keep 3 in reserve, and count requests still in flight
const pace = () => { let g = 700; const h = feed.rl;
  if (h && Number.isFinite(h.left) && Number.isFinite(h.reset) && h.reset > 0) { const left = h.left - feed.inflight, win = Math.max(0, (h.reset > 1e12 ? h.reset : h.reset * 1000) - Date.now()) + 300; g = left <= 3 ? win : win / (left - 3); }
  const floor = Date.now() < feed.penaltyUntil ? FLOOR * 3 : FLOOR;   // after a 429, stay well clear for five minutes
  return Math.min(15000, Math.max(floor, g)); };
const takeRL = (headers, seq) => { if (seq < feed.rlSeq) return; feed.rlSeq = seq; feed.rl = { left: +headers['x-ratelimit-remaining'], reset: +headers['x-ratelimit-reset'] }; };
// requests go out on a steady beat (up to two in flight) instead of waiting for each answer: the API takes 0.4 to 0.8 s to reply
const tick = async () => {
  feed.timer = null; const now = Date.now();
  if (!feed.clients.size && now - feed.lastClient > IDLE_STOP) return;
  if (!KEY) { bcast('err', NOKEY); feed.timer = setTimeout(tick, 3000); return; }
  if (now < feed.holdUntil) { feed.timer = setTimeout(tick, feed.holdUntil - now); return; }
  if (feed.inflight >= 2) { feed.timer = setTimeout(tick, 40); return; }
  const seq = ++feed.seq, full = !feed.joins || feed.n++ % 20 === 0;
  feed.inflight++; feed.nextAt = now + pace(); feed.timer = setTimeout(tick, feed.nextAt - now);
  feed.sent.push(now); while (feed.sent.length && now - feed.sent[0] > 60000) feed.sent.shift();
  try {
    const up = await fetch(UPSTREAM + (full ? QUERY : QUERY_FAST), { headers: { 'server-key': KEY } }); const body = await up.text(); const headers = pickRL(up.headers);
    const taken = Math.round((now + Date.now()) / 2);                  // best guess at when the API read the positions: halfway through the request
    takeRL(headers, seq);
    if (up.status === 429) { feed.holdUntil = Date.now() + (+headers['retry-after'] || 30) * 1000; feed.penaltyUntil = Date.now() + 300000;
      bcast('err', JSON.stringify({ status: 429, retry_after: +headers['retry-after'] || 30 })); }
    else if (up.ok) { if (seq > feed.shown) { feed.shown = seq; let out = body;                       // an older answer arriving late is dropped
        if (full) { try { feed.joins = JSON.parse(body).JoinLogs || []; } catch (e) {} }
        else if (feed.joins) out = body.replace(/}\s*$/, `,"JoinLogs":${JSON.stringify(feed.joins)}}`);
        feed.snap = { t: Date.now(), taken, status: up.status, body: out, headers }; cache.set(QUERY, feed.snap); bcast('server', out, taken); learn(body); } }
    else { let j = {}; try { j = JSON.parse(body); } catch (e) {} bcast('err', JSON.stringify({ status: up.status, ...j })); if (up.status >= 400) feed.holdUntil = Date.now() + 3000; }
  } catch (e) { bcast('err', JSON.stringify({ status: 502, message: 'relay could not reach api.erlc.gg: ' + e.message })); feed.holdUntil = Date.now() + 3000; }
  finally { feed.inflight--; } };
const wake = () => { if (!feed.timer) feed.timer = setTimeout(tick, Math.max(0, feed.nextAt - Date.now())); };
const stream = (req, res) => {
  res.writeHead(200, { 'content-type': 'text/event-stream', 'cache-control': 'no-store', connection: 'keep-alive', 'x-accel-buffering': 'no' });
  res.write('retry: 2000\n\n'); res.write(`event: cal\ndata: ${JSON.stringify(CAL)}\n\n`);
  if (feed.snap && Date.now() - feed.snap.t < 10000) res.write(`event: server\nid: ${feed.snap.taken}\ndata: ${feed.snap.body}\n\n`); else if (!KEY) res.write(`event: err\ndata: ${NOKEY}\n\n`);
  feed.clients.add(res); feed.lastClient = Date.now();
  const ka = setInterval(() => res.write(': ping\n\n'), 15000);
  req.on('close', () => { clearInterval(ka); feed.clients.delete(res); feed.lastClient = Date.now(); });
  wake();
};

const relay = async (req, res) => {
  res.setHeader('access-control-expose-headers', RL.join(', '));
  const path = req.url.replace(/^\/api/, '');
  if (req.method === 'GET' && path === '/stream') return stream(req, res);
  if (path === '/cal') {                                              // shared calibration: every browser draws units with the same transform
    if (req.method === 'GET') { res.writeHead(200, { 'content-type': 'application/json', 'cache-control': 'no-store' }); return res.end(JSON.stringify(CAL)); }
    if (req.method === 'POST') { let body = ''; req.on('data', c => { body += c; if (body.length > 2e5) req.destroy(); }); req.on('end', () => { let j = {}; try { j = JSON.parse(body || '{}'); } catch (e) {}
        const num = v => typeof v === 'number' && Number.isFinite(v);
        if (j.clear) CAL = { auto: {}, manual: [] };
        if (Array.isArray(j.manual)) CAL.manual = j.manual.filter(p => p && num(p.sx) && num(p.sz) && num(p.wx) && num(p.wy)).slice(0, 20).map(p => ({ name: String(p.name || 'Point').slice(0, 60), sx: p.sx, sz: p.sz, wx: p.wx, wy: p.wy }));
        saveCal(); bcast('cal', JSON.stringify(CAL)); res.writeHead(200, { 'content-type': 'application/json', 'cache-control': 'no-store' }); res.end(JSON.stringify(CAL)); }); return; } }
  if (req.method !== 'GET' || !path.startsWith('/v2/server')) { res.writeHead(404, { 'content-type': 'application/json' }); return res.end('{"message":"only GET /api/v2/server... is relayed"}'); }
  const key = KEY || req.headers['server-key'];
  if (!key) { res.writeHead(401, { 'content-type': 'application/json' }); return res.end(NOKEY); }
  const hit = cache.get(path); if (hit && Date.now() - hit.t < (feed.clients.size ? 5000 : MIN_GAP)) return send(res, hit);   // the feed loop keeps the snapshot fresh
  try {
    const up = await fetch(UPSTREAM + path, { headers: { 'server-key': key } }); const body = await up.text(); const headers = pickRL(up.headers);
    const out = { t: Date.now(), status: up.status, body, headers }; if (up.ok) cache.set(path, out); if (key === KEY) takeRL(headers, feed.seq); send(res, out);
  } catch (e) { res.writeHead(502, { 'content-type': 'application/json' }); res.end(JSON.stringify({ message: 'relay could not reach api.erlc.gg: ' + e.message })); }
};
const send = (res, r) => { res.writeHead(r.status, { 'content-type': 'application/json', 'cache-control': 'no-store', ...r.headers }); res.end(r.body); };

const serve = (req, res) => {
  let url = decodeURIComponent(req.url.split('?')[0]);
  if (url === '/' || url === '/index.html') url = '/live-map-3d.html';
  if (url === '/health') { res.writeHead(200, { 'content-type': 'text/plain' }); return res.end(`ok ${feed.sent.length}/min ${feed.rl ? feed.rl.left + ' left' : ''}`); }
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
  if (path === '/admin/key' && hasAccess(req)) {                                      // save the ER:LC key on the server so every browser gets live data
    if (req.method === 'GET') { res.writeHead(200, { 'content-type': 'application/json', 'cache-control': 'no-store' }); return res.end(JSON.stringify({ hasKey: !!KEY, persistent: !!process.env.ERLC_SERVER_KEY || existsSync(KEY_FILE) })); }
    if (req.method === 'POST') { let body = ''; req.on('data', c => { body += c; if (body.length > 1e4) req.destroy(); }); req.on('end', async () => {
      let k = ''; try { k = String(JSON.parse(body || '{}').key || '').trim(); } catch (e) {} if (!/^[A-Za-z0-9_\-]{8,200}$/.test(k)) { res.writeHead(400, { 'content-type': 'application/json' }); return res.end('{"message":"that does not look like a server key"}'); }
      const changed = k !== KEY; KEY = k; cache.clear(); feed.snap = null; let saved = saveKey(k), err = ''; if (changed) { feed.nextAt = 0; wake(); }
      if (RW && RW_IDS.project) { try { const r = await fetch('https://backboard.railway.app/graphql/v2', { method: 'POST', headers: { 'Project-Access-Token': RW, 'content-type': 'application/json' },
          body: JSON.stringify({ query: 'mutation($i: VariableUpsertInput!) { variableUpsert(input: $i) }', variables: { i: { projectId: RW_IDS.project, environmentId: RW_IDS.env, serviceId: RW_IDS.service, name: 'ERLC_SERVER_KEY', value: k } } }) });
          const j = await r.json(); saved = !!(j.data && j.data.variableUpsert); if (!saved) err = JSON.stringify(j.errors || j).slice(0, 200); } catch (e) { err = e.message; } }
      res.writeHead(200, { 'content-type': 'application/json', 'cache-control': 'no-store' }); res.end(JSON.stringify({ ok: true, persistent: saved, error: err })); }); return; } }
  if (path === '/unlock' && req.method === 'POST') { let body = ''; req.on('data', c => { body += c; if (body.length > 1e4) req.destroy(); }); req.on('end', () => unlock(req, res, decodeURIComponent((body.match(/(?:^|&)code=([^&]*)/) || [])[1] || '').trim())); return; }
  if (path === '/lock') { res.writeHead(200, { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-store', 'set-cookie': `${COOKIE}=; Path=/; Max-Age=0` }); return res.end(lockPage()); }
  const q = new URLSearchParams(qs || '').get('code'); if (q && CODE) return unlock(req, res, q.trim());
  if (hasAccess(req)) return next();
  if (path.startsWith('/api/')) { res.writeHead(401, { 'content-type': 'application/json' }); return res.end('{"message":"locked"}'); }
  res.writeHead(401, { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-store' }); res.end(lockPage());
};

http.createServer((req, res) => {
  const host = (req.headers.host || '').toLowerCase().replace(/:\d+$/, '');
  if (CANON.startsWith('www.') && host === CANON.slice(4)) { res.writeHead(301, { location: `https://${CANON}${req.url}`, 'cache-control': 'no-store' }); return res.end(); }
  gate(req, res, () => (req.url.startsWith('/api/') ? relay(req, res) : serve(req, res))); })
  .listen(PORT, () => console.log(`Oversite on http://localhost:${PORT} (${process.env.ERLC_SERVER_KEY ? 'server key from env' : KEY ? 'server key from ' + KEY_FILE : 'no server key set, the dashboard must supply one'}; ${CODE ? 'preview lock on' : 'no access code, site is open'})`));
