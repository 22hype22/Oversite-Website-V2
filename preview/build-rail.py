import math, base64, json
# ── isometric wireframe vehicles (generated so the geometry is exact) ──
K=1.18
def iso(x,y,z,ox=60,oy=40):
    return (ox+(x-y)*0.866*K, oy+(x+y)*0.5*K-z*K)
def box(x0,x1,y0,y1,z0,z1):
    c=lambda x,y,z:iso(x,y,z)
    pts=[c(x0,y0,z0),c(x1,y0,z0),c(x1,y1,z0),c(x0,y1,z0),c(x0,y0,z1),c(x1,y0,z1),c(x1,y1,z1),c(x0,y1,z1)]
    f=lambda i:f"{pts[i][0]:.1f} {pts[i][1]:.1f}"
    faces=[f"M{f(4)} L{f(5)} L{f(6)} L{f(7)}Z",   # top
           f"M{f(0)} L{f(1)} L{f(5)} L{f(4)}Z",   # front (y0)
           f"M{f(1)} L{f(2)} L{f(6)} L{f(5)}Z"]   # right (x1)
    edges=f"M{f(0)} L{f(1)} L{f(2)} M{f(1)} L{f(5)} M{f(0)} L{f(4)} M{f(2)} L{f(6)}"
    return faces,edges
def wheel(x,y,r=5):
    cx,cy=iso(x,y,4); return f'<ellipse cx="{cx:.1f}" cy="{cy:.1f}" rx="{r*1.1:.1f}" ry="{r*0.7:.1f}" transform="rotate(30 {cx:.1f} {cy:.1f})" fill="rgba(240,242,245,.06)"/><ellipse cx="{cx:.1f}" cy="{cy:.1f}" rx="{r*0.45:.1f}" ry="{r*0.28:.1f}" transform="rotate(30 {cx:.1f} {cy:.1f})"/>'

# side-view wireframe vehicles (viewBox 0 0 120 48); accent parts use currentColor
ICON={
 'car':'<path d="M19 17h2c.6 0 1-.4 1-1v-3c0-.9-.7-1.7-1.5-1.9C18.7 10.6 16 10 16 10s-1.3-1.4-2.2-2.3c-.5-.4-1.1-.7-1.8-.7H5c-.6 0-1.1.4-1.4.9l-1.4 2.9A3.7 3.7 0 0 0 2 12v4c0 .6.4 1 1 1h2"/><circle cx="7" cy="17" r="2"/><path d="M9 17h6"/><circle cx="17" cy="17" r="2"/>',
 'truck':'<path d="M14 18V6a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v11a1 1 0 0 0 1 1h2"/><path d="M15 18H9"/><path d="M19 18h2a1 1 0 0 0 1-1v-3.65a1 1 0 0 0-.22-.62l-3.48-4.35A1 1 0 0 0 17.52 8H14"/><circle cx="17" cy="18" r="2"/><circle cx="7" cy="18" r="2"/>',
}
def vehicle(kind):
    ic=ICON['car' if kind=='cruiser' else 'truck']
    return '<span class="badge"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">'+ic+'</svg></span>'

UNITS=[
 dict(id='pd-6023',model='Explorer PPV',dept='pd',name='PD 6023',crew=['22hype22','sppoklex','relukt'],ranks=['Chief of Police', 'Sergeant', 'Officer'],kind='cruiser',uid='45623',route='R0',t=0.42,dir=1,speed=0.011,since=6137),
 dict(id='fd-4120',model='Pierce Engine',dept='fd',name='FD 4120',crew=['marlowe_j','ttx_ash'],ranks=['Captain', 'Firefighter'],kind='engine',uid='31564',route='R1',t=0.28,dir=1,speed=0.008,since=2711),
 dict(id='dot-2209',model='F-350 Arrow Board',dept='dot',name='DOT 2209',crew=['cone_daddy'],ranks=['Supervisor'],kind='dot',uid='34654',route='R2',t=0.88,dir=-1,speed=0.007,since=10422),
 dict(id='pd-1207',model='Charger Pursuit',dept='pd',name='PD 1207',crew=['nova.k','bryce_v'],ranks=['Lieutenant', 'Officer'],kind='cruiser',uid='34664',route='R3',t=0.61,dir=-1,speed=0.010,since=1503),
 dict(id='pd-3310',model='Tahoe PPV',dept='pd',name='PD 3310',crew=['ghostrider44'],ranks=['Corporal'],kind='cruiser',uid='38812',route='R4',t=0.12,dir=1,speed=0.012,since=4290),
 dict(id='fd-2201',model='Rescue 1',dept='fd',name='FD 2201',crew=['ember_lux','dan.holt','mk_ruiz'],ranks=['Battalion Chief', 'Firefighter', 'Probationary'],kind='engine',uid='29907',route='R5',t=0.05,dir=1,speed=0.007,since=8004),
 dict(id='dot-1180',model='Plow Truck',dept='dot',name='DOT 1180',crew=['plow_king','ash_dot'],ranks=['Operator', 'Operator'],kind='dot',uid='36012',route='R6',t=0.85,dir=-1,speed=0.006,since=13355),
 dict(id='pd-4501',model='Explorer PPV',dept='pd',name='PD 4501',crew=['kzz_mike'],ranks=['Trainee'],kind='cruiser',uid='41155',route='R7',t=0.66,dir=-1,speed=0.011,since=622),
]
def card(u, sel=False):
    arrow='<span class="go"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M7 17 17 7M9 7h8v8"/></svg></span>'
    idc=f'<span class="id"><svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><rect x="4" y="4" width="16" height="16" rx="4"/><path d="M9 12h6"/></svg>{u["uid"]}</span>'
    crew=', '.join(u['crew'])
    return f"""<button class="card veh dept-{u['dept']}" role="listitem" data-unit="{u['id']}" aria-pressed="{'true' if sel else 'false'}">
  <div class="hd"><div><b>{u['name']}</b><small class="crew" title="{crew}">{crew}</small></div>{idc}</div>
  <div class="pic">{vehicle(u['kind'])}<div class="vinfo"><b>{u['model']}</b><small><span class="code">10-8</span> · <span class="spd" data-unit="{u['id']}">0</span> mph</small></div></div>
  <div class="meta"><span class="on">Online</span><span><svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M2 12h4M18 12h4M12 2v4M12 18v4"/><circle cx="12" cy="12" r="5"/></svg>GPS</span><span><svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M2 20h4v-4H2zM9 20h4v-8H9zM16 20h4V6h-4z"/></svg>LTE</span></div>
  <div class="mini live" data-unit="{u['id']}" aria-label="Live position of {u['name']}"><span class="ring"></span><span class="pin"></span></div>
  <div class="tl"><span>Active</span><span class="bar2"></span><span class="timer" data-unit="{u['id']}">0:00:00</span></div>
</button>"""
chips='''  <div class="chips" role="group" aria-label="Filter units by department">
    <button aria-pressed="true" data-filter="all"><b data-count="all">0</b> All Units</button>
    <button aria-pressed="false" data-filter="pd"><b data-count="pd">0</b> LE</button>
    <button aria-pressed="false" data-filter="fd"><b data-count="fd">0</b> FD</button>
    <button aria-pressed="false" data-filter="dot"><b data-count="dot">0</b> DOT</button>
  </div>'''
stats='''  <div class="stats">
    <div class="card stat"><div class="l"><svg width="14" height="14" viewBox="0 0 24 24" fill="#46D07C"><circle cx="12" cy="12" r="10"/><path d="m7.5 12.5 3 3 6-6.5" fill="none" stroke="#0B0B0C" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg>Online<small class="feed" id="statFeed" hidden></small></div><div class="n">65</div></div>
    <div class="card stat"><div class="l"><svg width="14" height="14" viewBox="0 0 24 24" fill="#E24B4B"><path d="M12 3 2 21h20z"/><path d="M12 10v5M12 17.5v.5" stroke="#0B0B0C" stroke-width="2" stroke-linecap="round"/></svg>Active Calls</div><div class="n" id="callCount">7</div></div>
  </div>'''
eff='''  <div class="card eff" id="avail">
    <h3>Unit Availability <span class="go"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M7 17 17 7M9 7h8v8"/></svg></span></h3>
    <div class="big"><span id="avNum">—</span><small>%</small></div>
    <div class="tgt">Target: <b>80%</b><span class="sep">·</span><span id="avSub">—</span></div>
    <div class="plot" id="avPlot" tabindex="0" aria-label="Unit availability over the shift">
      <svg id="avSvg" viewBox="0 0 300 86" preserveAspectRatio="none" aria-hidden="true"></svg>
      <div class="ax"><span>100%</span><span>75%</span><span>50%</span><span>25%</span></div>
      <div class="xs" id="avXs"></div>
      <div class="hov" id="avHov" hidden></div>
    </div>
  </div>'''
fleet='  <div class="fleet" role="list" aria-label="Units">\n'+'\n'.join(card(u, i==0) for i,u in enumerate(UNITS))+'\n  </div>'
rail='<aside class="rail" aria-label="Dispatch overview">\n'+chips+'\n\n'+stats+'\n\n'+eff+'\n\n'+fleet+'\n</aside>'

p='preview/live-map.html'; s=open(p).read()
a=s.index('<aside class="rail"'); b=s.index('</aside>')+len('</aside>')
s=s[:a]+rail+s[b:]
css_rep=[
 ("--sel:rgba(44,44,48,.80);","--sel:rgba(58,58,63,.82);"),
 (".stat .l i{width:8px;height:8px;border-radius:50%;background:var(--green);display:block}",".stat .l svg{display:block}"),
 (".eff .big small{font-size:12px;color:var(--dim);margin-left:3px;letter-spacing:0}",".eff .big .d{color:var(--dim)}\n  .eff .big small{font-size:12px;color:var(--dim);margin-left:3px;letter-spacing:0}"),
 (".veh .meta .on{color:var(--green);display:flex;align-items:center;gap:4px}\n  .veh .meta .on i{width:6px;height:6px;border-radius:50%;background:var(--green);display:block}",".veh .meta .on{color:var(--dim)}"),
 (".veh .pic>svg{height:56px;width:auto;flex:none;max-width:70%;margin-top:-6px}",".veh .pic>svg{height:66px;width:auto;flex:none;max-width:74%;margin-top:-8px}"),
 (".veh.compact .pic{height:44px}\n  .veh.compact .pic>svg{height:48px}",".veh.compact .pic{height:48px}\n  .veh.compact .pic>svg{height:56px}"),
 (".veh .tl .bar2::after{content:\"\";position:absolute;left:0;top:0;bottom:0;width:var(--p,40%);background:#C9CDD3;border-radius:2px}",
  ".veh .tl .bar2::after{content:\"\";position:absolute;left:0;top:0;bottom:0;width:var(--p,40%);background:#C9CDD3;border-radius:2px}\n  .veh .tl .bar2::before{content:\"\";position:absolute;right:0;top:0;bottom:0;width:22%;background:repeating-linear-gradient(90deg,rgba(240,242,245,.35) 0 3px,transparent 3px 6px)}"),
]
for x,y in css_rep:
    # rules that add lines next to an existing one: undo earlier builds first so they never pile up
    if x in y:
        while y in s: s=s.replace(y,x)
    s=s.replace(x,y)
css_add = """  /* unit render backdrop + availability chart */
  .veh .pic::before{content:"";position:absolute;left:-2px;right:34%;top:-6px;bottom:-4px;border-radius:12px;
    background:radial-gradient(ellipse 70% 80% at 48% 55%,rgba(240,242,245,.13),rgba(240,242,245,.03) 60%,rgba(240,242,245,0) 100%);
    pointer-events:none}
  .veh.compact .pic::before{right:40%}
  .veh .pic>svg{position:relative}
  .veh[aria-pressed="true"] .pic::before{background:radial-gradient(ellipse 70% 80% at 48% 55%,rgba(240,242,245,.18),rgba(240,242,245,.05) 60%,rgba(240,242,245,0) 100%)}
  .eff .tgt b{color:var(--dim);font-weight:500}
  .eff .tgt .sep{margin:0 6px;color:var(--faint)}
  .plot{cursor:crosshair;outline:0}
  .plot .hov{position:absolute;top:0;transform:translate(-50%,-4px);padding:5px 8px;border-radius:7px;white-space:nowrap;
    background:rgba(20,20,23,.92);border:1px solid var(--hair2);font-size:10px;color:var(--dim);pointer-events:none;z-index:2}
  .plot .hov b{color:var(--ink);font-weight:500}
  .plot .hov[hidden]{display:none}
"""
if '.veh .pic::before' not in s: s=s.replace('</style>',css_add+'</style>')
rail_css = """  /* rail backdrop: map → dark panel → cards */
  .rail{background:rgba(12,12,14,.76);backdrop-filter:var(--blur);-webkit-backdrop-filter:var(--blur);
    border-right:1px solid var(--hair);box-shadow:12px 0 40px rgba(0,0,0,.25)}
  .rail .card{background:rgba(30,30,34,.66);border-color:rgba(240,242,245,.07);backdrop-filter:none;-webkit-backdrop-filter:none;box-shadow:none}
  .rail .chips button{background:rgba(30,30,34,.66);border-color:rgba(240,242,245,.07);backdrop-filter:none;-webkit-backdrop-filter:none}
  .rail .chips button[aria-pressed="true"]{background:rgba(40,40,45,.8);border-color:var(--hair2)}
  .rail .veh[aria-pressed="true"]{background:rgba(64,64,70,.78)}
  .rail .veh .mini{background:rgba(240,242,245,.035)}
  .vig{background:none}
"""
if 'rail backdrop: map' not in s: s=s.replace('</style>',rail_css+'</style>')
float_css = """  /* the rail floats as its own rounded box, inset from the edges */
  .rail{top:calc(var(--barh) + var(--gap));left:var(--gap);bottom:var(--gap);border-radius:18px;
    border:1px solid var(--hair);box-shadow:0 20px 60px rgba(0,0,0,.35);padding:12px}
  .stage{left:calc(var(--rail) + var(--gap))}
  @media (max-width:980px){.stage{left:0}}
"""
if 'the rail floats as its own rounded box' not in s: s=s.replace('</style>',float_css+'</style>')
units_css = """  /* live unit cards, coloured by department */
  .veh{--acc:#C9CDD3;position:relative;overflow:hidden}
  .veh.dept-pd{--acc:#4C8DFF} .veh.dept-fd{--acc:#E24B4B} .veh.dept-dot{--acc:#E9C24C}
  .veh::after{content:"";position:absolute;left:0;right:0;top:0;height:1px;background:linear-gradient(90deg,var(--acc),transparent 70%);opacity:.55}
  .veh .hd .crew{color:var(--dim);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:118px}
  .veh .pic{height:50px}
  .veh .pic>svg{height:48px;max-width:70%;margin-top:0;color:var(--acc)}
  .veh .pic::before{right:32%;background:radial-gradient(ellipse 70% 80% at 48% 55%,color-mix(in srgb,var(--acc) 22%,rgba(240,242,245,.10)),rgba(240,242,245,.03) 60%,transparent 100%)}
  .veh .id svg{color:var(--acc)}
  .veh .mini.live{background:#0E1013 center/cover no-repeat;position:relative;image-rendering:auto}
  .veh .mini.live::after{content:"";position:absolute;inset:0;box-shadow:inset 0 0 24px rgba(0,0,0,.55);pointer-events:none}
  .veh .mini .pin{position:absolute;left:50%;top:50%;width:10px;height:10px;margin:-5px 0 0 -5px;border-radius:50%;background:var(--acc);
    box-shadow:0 0 0 2px #0B0B0C,0 0 10px var(--acc)}
  .veh .mini .pin::after{content:"";position:absolute;left:50%;top:-9px;margin-left:-3px;border:3px solid transparent;border-bottom:6px solid var(--acc);transform-origin:50% 14px}
  .veh .mini .ring{position:absolute;left:50%;top:50%;width:22px;height:22px;margin:-11px 0 0 -11px;border-radius:50%;border:1px solid var(--acc);opacity:.5;
    animation:ringpulse 2.2s cubic-bezier(.32,.72,0,1) infinite}
  @keyframes ringpulse{0%{transform:scale(.6);opacity:.7}100%{transform:scale(1.8);opacity:0}}
  .veh .tl .bar2::after{background:var(--acc);opacity:.85}
  .veh .tl .bar2::before{display:none}
  .veh .tl .timer{color:var(--ink);font-variant-numeric:tabular-nums}
  @media (prefers-reduced-motion:reduce){.veh .mini .ring{animation:none}}
"""
if 'live unit cards, coloured by department' not in s: s=s.replace('</style>',units_css+'</style>')
units_js = r"""<script id="units" type="application/json">""" + json.dumps(UNITS,separators=(',',':')) + r"""</script>
<script>
/* a call's units: c.unit leads it, c.more lists the units sent to help (a big fire can need several) */
window.onIt = (c, n) => !!n && !!c && (c.unit === n || (c.more || []).some(m => m.name === n));
window.callUnits = c => c && c.unit ? [c.unit, ...(c.more || []).map(m => m.name)] : [];
/* a unit's map tag: callsign, players, the unit they picked (or their department) and whether they are free */
window.UNIT_OF = (window.OVERSITE && window.OVERSITE.unitOf) || {};
window.RIDE_WITH = (window.OVERSITE && window.OVERSITE.rideWith) || {};   // Roblox id -> the teammate's Roblox id they ride with
window.unitOf = u => (u && u.uid && window.UNIT_OF[String(u.uid)]) || '';
window.tagHTML = u => { if (!u) return ''; const e = t => String(t ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const unit = window.unitOf(u), dn = (window.OVERSITE && window.OVERSITE.depts && window.OVERSITE.depts[u.dept] && window.OVERSITE.depts[u.dept].name) || ({ pd: 'Law Enforcement', fd: 'Fire Department', dot: 'Department of Transportation' })[u.dept] || '';
  const call = (window.CALLS || []).find(k => onIt(k, u.name)), st = (window.UNIT_STATUS || {})[u.name];   // the status the unit set in its MDT, e.g. 10-76
  const ST = { '10-8': 'Available', '10-76': 'En route', '10-23': 'On scene', '10-19': 'Returning', '10-7': 'Out of service', '10-6': 'Busy' };
  const label = st && ST[st] ? ST[st] + (call && st !== '10-8' ? ' · ' + e(call.code) : '') : call ? 'On call · ' + e(call.code) : 'Available', busy = st ? st !== '10-8' : !!call;
  return `<div class="k">${e(u.name)}</div><div class="s">${e((u.crew || []).join(', '))}</div><div class="v un${unit ? '' : ' none'}">${e(unit || dn)}</div><div class="av${busy ? ' busy' : ''}">${label}</div>`; };
if (window.OVERSITE && window.OVERSITE.api) { const pullUnits = () => fetch(window.OVERSITE.api + '/units', { credentials: 'same-origin' }).then(r => r.ok ? r.json() : null).then(j => { if (!j) return; window.UNIT_OF = j.of || {}; window.RIDE_WITH = j.ride || {};
    for (const d of ['pd', 'fd', 'dot']) if (window.OVERSITE.depts && window.OVERSITE.depts[d]) window.OVERSITE.depts[d].units = (j.units || {})[d] || []; dispatchEvent(new CustomEvent('unitassign')); }).catch(() => {});
  setInterval(pullUnits, 30000); }
/* ── shared unit simulation: positions for cards, 2D pins and the 3D scene ── */
(() => {
  const ROUTES = __ROUTES__;   // patrol routes along real roads, preview/newmap/routes.json
  window.ROUTES = ROUTES;
  // ── road grid + A*: drive a unit to any point along the roads ──
  const GRID = ROUTES._grid; delete ROUTES._grid;
  const GN = GRID.n, GB = Uint8Array.from(atob(GRID.bits), c => c.charCodeAt(0)), CELL = 2000 / GN;
  const road = (cx, cy) => cx >= 0 && cy >= 0 && cx < GN && cy < GN && (GB[(cy * GN + cx) >> 3] >> (7 - ((cy * GN + cx) & 7))) & 1;
  window.roadAt = (x, y) => { const cx = Math.round(x / CELL - 0.5), cy = Math.round(y / CELL - 0.5); if (road(cx, cy)) return 1; return (road(cx + 1, cy) || road(cx - 1, cy) || road(cx, cy + 1) || road(cx, cy - 1)) ? 0.5 : 0; };
  const snap = (x, y) => { const cx = Math.round(x / CELL - 0.5), cy = Math.round(y / CELL - 0.5); if (road(cx, cy)) return [cx, cy];
    for (let r = 1; r < 70; r++) for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) if ((Math.abs(dx) === r || Math.abs(dy) === r) && road(cx + dx, cy + dy)) return [cx + dx, cy + dy]; return null; };
  // Like a satnav: grow the search outward from the start and from the destination at the same time, one road cell at a
  // time, always extending whichever side is cheaper so far. When the two meet, the cheapest meeting cell joins them into
  // the quickest route; once neither side can beat it the search stops (bidirectional Dijkstra on the road grid).
  const N = GN * GN, D8 = [[1, 0, 1], [-1, 0, 1], [0, 1, 1], [0, -1, 1], [1, 1, 1.414], [1, -1, 1.414], [-1, 1, 1.414], [-1, -1, 1.414]];
  const hpush = (h, d, k) => { h.push([d, k]); let i = h.length - 1; while (i > 0) { const p = (i - 1) >> 1; if (h[p][0] <= h[i][0]) break; const t = h[p]; h[p] = h[i]; h[i] = t; i = p; } };
  const hpop = h => { const top = h[0], last = h.pop(); if (h.length) { h[0] = last; let i = 0; for (;;) { const l = 2 * i + 1, r = l + 1; let m = i; if (l < h.length && h[l][0] < h[m][0]) m = l; if (r < h.length && h[r][0] < h[m][0]) m = r; if (m === i) break; const t = h[m]; h[m] = h[i]; h[i] = t; i = m; } } return top; };
  // open asphalt (parking lots, plazas, wide forecourts): how far each road cell is from the nearest edge, in cells. Ordinary roads
  // are at most ~5 cells from an edge; deeper than that costs 3x, so routes keep to the streets and only enter a lot to reach it
  let WD = null; const wideness = () => { if (WD) return WD; const d = new Uint8Array(N);
    for (let y = 0; y < GN; y++) for (let x = 0; x < GN; x++) d[y * GN + x] = road(x, y) ? 255 : 0;
    for (let y = 0; y < GN; y++) for (let x = 0; x < GN; x++) { const k = y * GN + x; if (!d[k]) continue; let m = d[k];
      m = Math.min(m, x > 0 ? d[k - 1] + 1 : 1, y > 0 ? d[k - GN] + 1 : 1, x > 0 && y > 0 ? d[k - GN - 1] + 1 : 1, x < GN - 1 && y > 0 ? d[k - GN + 1] + 1 : 1); d[k] = m; }
    for (let y = GN - 1; y >= 0; y--) for (let x = GN - 1; x >= 0; x--) { const k = y * GN + x; if (!d[k]) continue; let m = d[k];
      m = Math.min(m, x < GN - 1 ? d[k + 1] + 1 : 1, y < GN - 1 ? d[k + GN] + 1 : 1, x < GN - 1 && y < GN - 1 ? d[k + GN + 1] + 1 : 1, x > 0 && y < GN - 1 ? d[k + GN - 1] + 1 : 1); d[k] = m; }
    return (WD = d); };
  // keep right: ER:LC drives on the right, so on a divided road the median belongs on your left. Looking to the right of the way
  // you're heading, a short gap with more road just past it means a median on your right: you're on the wrong side (cost 4x).
  // Ordinary two-way roads have no such gap, so they are never penalised. Worked out once per cell and heading, then cached.
  const DIRS = D8.map(([dx, dy]) => { const L = Math.hypot(dx, dy); return [-dy / L, dx / L]; });
  let WW = null; const wrongWay = (x, y, di) => { if (!WW) WW = new Uint8Array(N * 8); const c = (y * GN + x) * 8 + di; if (WW[c]) return WW[c] === 2;
    // a side looks divided when, past the edge of this road, a short gap leads to more road. A real divided road shows that on one
    // side only; a downtown street with sidewalks and lots or other streets on both sides shows it on both, which says nothing
    const [rx, ry] = DIRS[di], divided = sgn => { let gap = -1; for (let o = 1; o <= 14; o++) { const on = road(Math.round(x + rx * o * sgn), Math.round(y + ry * o * sgn)); if (gap < 0) { if (!on) gap = o; } else if (on) return o - gap <= 6; } return false; };
    const wrong = divided(1) && !divided(-1);
    WW[c] = wrong ? 2 : 1; return wrong; };
  let RT = null, gen = 0;   // search arrays are made once and reused; a cell counts only if it was touched in this search (gen)
  // direction index of each step: the forward search travels the step as it is, the backward search travels it in reverse
  const D8i = [0, 1].map(s => [-1, 0, 1].map(dx => [-1, 0, 1].map(dy => D8.findIndex(([ex, ey]) => ex === (s ? -dx : dx) && ey === (s ? -dy : dy)))));
  const meetRoute = (a, b) => { if (!RT) RT = { g: [new Float32Array(N), new Float32Array(N)], p: [new Int32Array(N), new Int32Array(N)], seen: [new Uint32Array(N), new Uint32Array(N)], fin: [new Uint32Array(N), new Uint32Array(N)] };
    gen++; const { seen, fin } = RT, heap = [[], []], WDc = wideness();
    const g = [0, 1].map(s => ({ get: k => seen[s][k] === gen ? RT.g[s][k] : Infinity })), prev = [0, 1].map(s => ({ get: k => seen[s][k] === gen ? RT.p[s][k] : -1 }));
    const set = (s, k, d, p) => { seen[s][k] = gen; RT.g[s][k] = d; RT.p[s][k] = p; };
    set(0, a, 0, -1); set(1, b, 0, -1); hpush(heap[0], 0, a); hpush(heap[1], 0, b); let best = a === b ? 0 : Infinity, meet = a === b ? a : -1, steps = 0;
    while (heap[0].length && heap[1].length && steps++ < 300000) {
      if (heap[0][0][0] + heap[1][0][0] >= best) break;                       // neither side can find a shorter join any more
      const s = heap[0][0][0] <= heap[1][0][0] ? 0 : 1, o = 1 - s, [d, k] = hpop(heap[s]); if (fin[s][k] === gen) continue; fin[s][k] = gen;
      const x = k % GN, y = (k - x) / GN;
      for (const [dx, dy, w] of D8) { const nx = x + dx, ny = y + dy; if (!road(nx, ny)) continue; const nk = ny * GN + nx, di = D8i[s][dx + 1][dy + 1], nd = d + (WDc[nk] > 6 ? w * 3 : w) * (wrongWay(x, y, di) ? 4 : 1);
        if (nd < g[s].get(nk)) { set(s, nk, nd, k); hpush(heap[s], nd, nk); }
        const go = g[o].get(nk); if (go < Infinity && g[s].get(nk) + go < best) { best = g[s].get(nk) + go; meet = nk; } } }
    if (meet < 0) return null;
    const out = []; for (let k = meet; k >= 0; k = prev[0].get(k)) out.push(k); out.reverse(); for (let k = prev[1].get(meet); k >= 0; k = prev[1].get(k)) out.push(k); return out; };
  let roadRoute = (ax, ay, bx, by) => { const A = snap(ax, ay), B = snap(bx, by); if (!A || !B) return [[ax, ay], [bx, by]];
    const path = meetRoute(A[1] * GN + A[0], B[1] * GN + B[0]); if (!path) return [[ax, ay], [bx, by]];
    const cells = path.map(k => [(k % GN + 0.5) * CELL, (Math.floor(k / GN) + 0.5) * CELL]);
    const pts = [[ax, ay]]; for (let i = 1; i < cells.length - 1; i++) { const [px, py] = cells[i - 1], [cx, cy] = cells[i], [qx, qy] = cells[i + 1]; if ((cx - px) * (qy - cy) !== (cy - py) * (qx - cx)) pts.push(cells[i]); } pts.push([bx, by]);
    const sm = [pts[0]]; for (let i = 1; i < pts.length - 1; i++) { const [a, b, c] = [pts[i - 1], pts[i], pts[i + 1]]; sm.push([b[0] * 0.5 + (a[0] + c[0]) * 0.25, b[1] * 0.5 + (a[1] + c[1]) * 0.25]); } sm.push(pts[pts.length - 1]);
    return sm; };
  // ── GPS on the road network: every junction and road piece traced from the map (preview/newmap/roadnet.json, built by
  // preview/newmap/roads/build-roadnet.py). Like a satnav it looks for the quickest drive, not the shortest line: each road
  // piece costs its length at that road's speed, every junction a moment, a right turn a little more and a left turn more
  // again, and a U-turn is only made where the road ends. One-way carriageways (divided roads: keep right) are only driven
  // their way, parking lots only when the trip starts or ends in them, tunnels and roads hidden under bridges join the road
  // ends they connect, an underpass never lets you turn onto the highway above it, and the server owner's fixes (blocked,
  // one-way, not a road, a lot, a tunnel they added) apply on top. If the network can't join the two ends, the older
  // road-grid search above answers instead.
  const NET = __ROADNET__;
  const gridRoute = roadRoute;
  (() => {
    const NV = NET.nodes, V = mph => mph * 0.45, VMAX = V(45);          // map units per second
    const piece = (a, b, mph, lot, ow, p, tun, own) => { const c = [0]; for (let i = 1; i < p.length; i++) c.push(c[i - 1] + Math.hypot(p[i][0] - p[i - 1][0], p[i][1] - p[i - 1][1]));
      return { a, b, mph, lot0: lot, ow0: ow, lot, ow, off: 0, p, c, L: c[c.length - 1] || 0.01, tun: !!tun, own: own || '' }; };
    const BASE = NET.edges.map(([a, b, , mph, lot, ow, f, tun]) => { const p = []; for (let i = 0; i < f.length; i += 2) p.push([f[i], f[i + 1]]); return piece(a, b, mph, lot, ow, p, tun); });
    const NT = new Map((NET.nt || []).map(([n, road]) => [n, new Set(road)]));   // underpasses: no turn between these legs and the others
    const at = (e, s) => { const { p, c } = e; let i = 1; while (i < c.length - 1 && c[i] < s) i++; const t = (s - c[i - 1]) / ((c[i] - c[i - 1]) || 1); return [p[i - 1][0] + (p[i][0] - p[i - 1][0]) * t, p[i - 1][1] + (p[i][1] - p[i - 1][1]) * t]; };
    const key = e => e.own || (([x, y]) => Math.round(x) + '_' + Math.round(y))(at(e, e.L / 2));   // a fix is stored by where the road is, so it survives a rebuilt network
    const ang = (u, v) => Math.atan2(v[1] - u[1], v[0] - u[0]);
    const baseDeg = NV.map(() => 0); for (const e of BASE) { baseDeg[e.a]++; baseDeg[e.b]++; }
    // a tunnel the owner adds: from the road end (junction) nearest each click, curving out along the road it continues
    const nearNode = (x, y) => { let best = -1, bd = 30; NV.forEach(([nx, ny], i) => { const d = Math.hypot(nx - x, ny - y); if (d < bd && baseDeg[i]) { bd = d; best = i; } }); return best; };
    const outDir = n => { const e = BASE.find(e => e.a === n || e.b === n); if (!e || baseDeg[n] !== 1) return null; const q = e.a === n ? at(e, Math.min(15, e.L)) : at(e, Math.max(0, e.L - 15)), d = Math.hypot(NV[n][0] - q[0], NV[n][1] - q[1]) || 1; return [(NV[n][0] - q[0]) / d, (NV[n][1] - q[1]) / d]; };
    const ownTunnel = k => { const m = /^t_(\d+)_(\d+)_(\d+)_(\d+)$/.exec(k); if (!m) return null; const a = nearNode(+m[1], +m[2]), b = nearNode(+m[3], +m[4]); if (a < 0 || b < 0 || a === b) return null;
      const A = NV[a], B = NV[b], D = Math.hypot(B[0] - A[0], B[1] - A[1]), ha = outDir(a) || [(B[0] - A[0]) / D, (B[1] - A[1]) / D], hb = outDir(b) || [(A[0] - B[0]) / D, (A[1] - B[1]) / D];
      const c1 = [A[0] + ha[0] * D / 3, A[1] + ha[1] * D / 3], c2 = [B[0] + hb[0] * D / 3, B[1] + hb[1] * D / 3], p = [];
      for (let i = 0; i <= 12; i++) { const t = i / 12, u = 1 - t; p.push([u * u * u * A[0] + 3 * u * u * t * c1[0] + 3 * u * t * t * c2[0] + t * t * t * B[0], u * u * u * A[1] + 3 * u * u * t * c1[1] + 3 * u * t * t * c2[1] + t * t * t * B[1]]); }
      return piece(a, b, 25, 0, 0, p, 1, k); };
    const CS = 25, GW = Math.ceil(2000 / CS);
    let E = [], adj = [], cells = new Map(), S = 0, G, P, seen, done, gen = 0;
    const build = links => { E = BASE.concat(links); adj = NV.map(() => []); cells = new Map();
      E.forEach((e, i) => { e.key = key(e); adj[e.a].push(i); if (e.b !== e.a) adj[e.b].push(i); const k = Math.min(8, e.L / 2); e.ha = ang(e.p[0], at(e, k)); e.hb = ang(e.p[e.p.length - 1], at(e, e.L - k));   // heading leaving each end
        for (let j = 1; j < e.p.length; j++) { const [x0, y0] = e.p[j - 1], [x1, y1] = e.p[j];   // nearest road piece to a point, through a coarse grid of the pieces' segments
          for (let cx = Math.floor(Math.min(x0, x1) / CS); cx <= Math.floor(Math.max(x0, x1) / CS); cx++) for (let cy = Math.floor(Math.min(y0, y1) / CS); cy <= Math.floor(Math.max(y0, y1) / CS); cy++) { const k = cy * GW + cx; if (!cells.has(k)) cells.set(k, []); cells.get(k).push(i * 4096 + j); } } });
      S = 2 * E.length; G = new Float64Array(S); P = new Int32Array(S); seen = new Uint32Array(S); done = new Uint32Array(S); gen = 0; };
    // the owner's fixes: { "x_y": { o: 1 | -1 | 0, b: 1, x: 1, l: 1 | 0 }, "t_x1_y1_x2_y2": { t: 1 } } = one-way along / against how the piece was
    // traced, blocked, not a road, lot; and a tunnel they added between two road ends
    let OVR = {}, linksKey = null;
    const setOv = ov => { OVR = ov && typeof ov === 'object' ? ov : {};
      const lk = Object.keys(OVR).filter(k => k.startsWith('t_')).sort().join('|'); if (lk !== linksKey) { linksKey = lk; build(lk ? lk.split('|').map(ownTunnel).filter(Boolean) : []); }
      const byKey = new Map(E.map((e, i) => [e.key, i])); for (const e of E) { e.ow = e.ow0; e.lot = e.lot0; e.off = 0; }
      for (const [k, o] of Object.entries(OVR)) { if (k.startsWith('t_')) continue; let i = byKey.get(k);
        if (i === undefined) { const [x, y] = k.split('_').map(Number); let bd = 8; for (let j = 0; j < E.length; j++) { const [mx, my] = at(E[j], E[j].L / 2), d = Math.hypot(mx - x, my - y); if (d < bd) { bd = d; i = j; } } }
        if (i === undefined || !o) continue; const e = E[i]; if (o.o === 1 || o.o === -1 || o.o === 0) e.ow = o.o; if (o.l === 1) e.lot = e.lot || 99999; if (o.l === 0) e.lot = 0; e.off = o.x ? 2 : o.b ? 1 : 0; }
      window.ROUTE_GEN = (window.ROUTE_GEN || 0) + 1; dispatchEvent(new CustomEvent('roadschange')); };
    const near = (x, y, maxR = 150, ok = e => !e.off) => { let best = null; const cx0 = Math.floor(x / CS), cy0 = Math.floor(y / CS);
      for (let r = 0; r * CS <= maxR + CS; r++) { for (let cy = cy0 - r; cy <= cy0 + r; cy++) for (let cx = cx0 - r; cx <= cx0 + r; cx++) { if (Math.max(Math.abs(cx - cx0), Math.abs(cy - cy0)) !== r) continue;
          for (const v of cells.get(cy * GW + cx) || []) { const i = Math.floor(v / 4096), j = v % 4096, e = E[i]; if (!ok(e)) continue; const [ax, ay] = e.p[j - 1], [bx, by] = e.p[j], dx = bx - ax, dy = by - ay, L2 = dx * dx + dy * dy || 1;
            const t = Math.max(0, Math.min(1, ((x - ax) * dx + (y - ay) * dy) / L2)), qx = ax + dx * t, qy = ay + dy * t, d = Math.hypot(x - qx, y - qy);
            if (d <= maxR && (!best || d < best.d)) best = { i, s: e.c[j - 1] + Math.sqrt(L2) * t, q: [qx, qy], d }; } }
        if (best && best.d < r * CS) break; }
      return best; };
    // ── the search: states are "just drove piece i in direction d" (0 = a->b), so turns and one-ways are known at every junction ──
    const ok = (e, d) => !e.off && (d === 0 ? e.ow !== -1 : e.ow !== 1);
    const endOf = (e, d) => d === 0 ? e.b : e.a, inHd = (e, d) => (d === 0 ? e.hb : e.ha) + Math.PI, outHd = (e, d) => d === 0 ? e.ha : e.hb;
    const turnOf = (e1, d1, e2, d2) => { const t = outHd(e2, d2) - inHd(e1, d1); return Math.atan2(Math.sin(t), Math.cos(t)); };   // > 0 turns right (y grows down)
    const turnCost = (t, junction) => { const a = Math.abs(t) * 180 / Math.PI; return (junction ? 1 : 0) + (a < 25 ? 0 : a < 60 ? 0.8 : a > 150 ? 6 : t > 0 ? 2 : 3.5); };
    const allowed = (n, i1, i2) => { const g = NT.get(n); return !g || g.has(i1) === g.has(i2); };   // under a bridge: road to road, highway to highway
    const hpush = (h, f, k) => { h.push([f, k]); let i = h.length - 1; while (i > 0) { const p = (i - 1) >> 1; if (h[p][0] <= h[i][0]) break; [h[p], h[i]] = [h[i], h[p]]; i = p; } };
    const hpop = h => { const top = h[0], last = h.pop(); if (h.length) { h[0] = last; let i = 0; for (;;) { const l = 2 * i + 1, r = l + 1; let m = i; if (l < h.length && h[l][0] < h[m][0]) m = l; if (r < h.length && h[r][0] < h[m][0]) m = r; if (m === i) break; [h[m], h[i]] = [h[i], h[m]]; i = m; } } return top; };
    const netRoute = (ax, ay, bx, by) => { const A = near(ax, ay), B = near(bx, by); if (!A || !B) return null;
      const lots = new Set([E[A.i].lot, E[B.i].lot].filter(Boolean));
      const cost = (e, len) => { const t = len / V(e.lot ? 10 : e.mph); return e.lot && !lots.has(e.lot) ? t * 4 + 20 : t; };   // other lots: only as a last resort
      gen++; const heap = [], tx = (NV[E[B.i].a][0] + NV[E[B.i].b][0]) / 2, ty = (NV[E[B.i].a][1] + NV[E[B.i].b][1]) / 2, h = n => Math.max(0, Math.hypot(NV[n][0] - tx, NV[n][1] - ty) - E[B.i].L) / VMAX;
      const relax = (k, g, from) => { if (seen[k] === gen && G[k] <= g) return; seen[k] = gen; G[k] = g; P[k] = from; hpush(heap, g + h(endOf(E[k >> 1], k & 1)), k); };
      const ea = E[A.i], eb = E[B.i]; let best = Infinity, bestK = -2, bestEnd = null;
      if (A.i === B.i) { const d = B.s >= A.s ? 0 : 1; if (ok(ea, d)) { best = cost(ea, Math.abs(B.s - A.s)); bestK = -1; } }
      if (ok(ea, 0)) relax(A.i * 2, cost(ea, ea.L - A.s), -1); if (ok(ea, 1)) relax(A.i * 2 + 1, cost(ea, A.s), -1);
      while (heap.length) { const [f, k] = hpop(heap); if (f >= best) break; if (done[k] === gen) continue; done[k] = gen;
        const i1 = k >> 1, e = E[i1], d = k & 1, n = endOf(e, d), g = G[k], junction = adj[n].length > 2;
        for (const d2 of [0, 1]) { if ((d2 === 0 ? eb.a : eb.b) !== n || !ok(eb, d2) || (i1 === B.i && d2 !== d) || !allowed(n, i1, B.i)) continue;   // finish along the destination's piece
          const t = i1 === B.i ? 0 : turnCost(turnOf(e, d, eb, d2), junction), tot = g + t + cost(eb, d2 === 0 ? B.s : eb.L - B.s); if (tot < best) { best = tot; bestK = k; bestEnd = d2; } }
        for (const i2 of adj[n]) for (const d2 of [0, 1]) { const e2 = E[i2]; if ((d2 === 0 ? e2.a : e2.b) !== n || !ok(e2, d2) || !allowed(n, i1, i2)) continue;
          if (i2 === i1 && d2 !== d) { if (adj[n].length > 1) continue; }            // U-turns only where the road ends
          else if (i2 === i1) continue;
          relax(i2 * 2 + d2, g + turnCost(turnOf(e, d, e2, d2), junction) + cost(e2, e2.L), k); } }
      if (bestK === -2) return null;
      // the drive as points, with the turns at real junctions marked for spoken directions
      const chain = []; for (let k = bestK; k >= 0; k = P[k]) chain.push(k); chain.reverse();
      const pts = [[ax, ay]], turns = [], add = q => { const l = pts[pts.length - 1]; if (Math.hypot(q[0] - l[0], q[1] - l[1]) > 0.3) pts.push(q); };
      const along = (e, s0, s1) => { add(at(e, s0)); if (s1 > s0) { for (let j = 0; j < e.c.length; j++) if (e.c[j] > s0 && e.c[j] < s1) add(e.p[j]); } else { for (let j = e.c.length - 1; j >= 0; j--) if (e.c[j] < s0 && e.c[j] > s1) add(e.p[j]); } add(at(e, s1)); };
      if (bestK === -1) along(ea, A.s, B.s);
      else { along(ea, A.s, (chain[0] & 1) ? 0 : ea.L);
        const legs = [...chain.map(k => [k >> 1, k & 1]), [B.i, bestEnd]];
        for (let j = 1; j < legs.length; j++) { const [i1, d1] = legs[j - 1], [i2, d2] = legs[j], e2 = E[i2], n = endOf(E[i1], d1);
          if (adj[n].length > 2) { const t = turnOf(E[i1], d1, e2, d2), lt = turns[turns.length - 1], here = pts[pts.length - 1];
            if (lt && Math.hypot(here[0] - pts[lt.i][0], here[1] - pts[lt.i][1]) < 14) { lt.d += t; lt.d = Math.atan2(Math.sin(lt.d), Math.cos(lt.d)); }   // a wide junction traced as two: one turn
            else turns.push({ i: pts.length - 1, d: t }); }
          const last = j === legs.length - 1; along(e2, d2 === 0 ? 0 : e2.L, last ? B.s : d2 === 0 ? e2.L : 0); } }
      add([bx, by]); pts.turns = turns.filter(t => Math.abs(t.d) * 180 / Math.PI >= 25); pts.secs = best; return pts; };
    // ── where a moving car is about to be: carry on along the road it is on, through each junction the way it most likely goes ──
    // At a junction the pick is the road nearest `prefer` (the unit's GPS route to its call, or the way it drove here before),
    // else the straightest legal road. Returns the points ahead, kept in the car's lane, or null when it isn't on a road.
    const distTo = (q, poly) => { let b = Infinity; for (let j = 1; j < poly.length; j++) { const [ax, ay] = poly[j - 1], [bx, by] = poly[j], dx = bx - ax, dy = by - ay, L2 = dx * dx + dy * dy || 1,
      t = Math.max(0, Math.min(1, ((q[0] - ax) * dx + (q[1] - ay) * dy) / L2)), d = Math.hypot(ax + dx * t - q[0], ay + dy * t - q[1]); if (d < b) b = d; } return b; };
    // the road piece it is driving along: close by and running the way it heads (at a junction the nearest piece is often the cross street)
    const onto = (x, y, h) => { let best = null; const cx0 = Math.floor(x / CS), cy0 = Math.floor(y / CS), hx = Math.cos(h), hy = Math.sin(h);
      for (let cy = cy0 - 1; cy <= cy0 + 1; cy++) for (let cx = cx0 - 1; cx <= cx0 + 1; cx++) for (const v of cells.get(cy * GW + cx) || []) { const i = Math.floor(v / 4096), j = v % 4096, e = E[i]; if (e.off) continue;
        const [ax, ay] = e.p[j - 1], [bx, by] = e.p[j], dx = bx - ax, dy = by - ay, L = Math.hypot(dx, dy) || 1, t = Math.max(0, Math.min(1, ((x - ax) * dx + (y - ay) * dy) / (L * L))), qx = ax + dx * t, qy = ay + dy * t, d = Math.hypot(x - qx, y - qy);
        const c = (dx * hx + dy * hy) / L; if (d > 12 || Math.abs(c) < 0.64) continue; const sc = d + 12 * (1 - Math.abs(c));
        if (!best || sc < best.sc) best = { sc, i, s: e.c[j - 1] + L * t, q: [qx, qy], c, ta: Math.atan2(dy, dx) }; }
      return best; };
    const follow = (x, y, h, len, prefer) => { const hit = onto(x, y, h); if (!hit) return null; const e = E[hit.i], ta = hit.ta, c = hit.c;   // not on a road, or crossing it
      const off = (x - hit.q[0]) * -Math.sin(ta) + (y - hit.q[1]) * Math.cos(ta);   // how far off the centre line: its lane
      let out = [hit.q.slice()], total = 0;
      const add = q => { const l = out[out.length - 1], dd = Math.hypot(q[0] - l[0], q[1] - l[1]); if (dd > 0.3) { out.push(q); total += dd; } };
      const walk = (e, s0, s1) => { if (s1 > s0) { for (let j = 0; j < e.c.length; j++) if (e.c[j] > s0 && e.c[j] < s1) add(e.p[j]); } else { for (let j = e.c.length - 1; j >= 0; j--) if (e.c[j] < s0 && e.c[j] > s1) add(e.p[j]); } add(at(e, s1)); };
      let i1 = hit.i, d1 = c > 0 ? 0 : 1, guard = 0, hIn = null;
      // right at a junction (just past it on the piece ahead): the turn is still being decided, so decide it there
      if ((d1 === 0 ? hit.s : e.L - hit.s) < 7 && adj[d1 === 0 ? e.a : e.b].length > 2) { hIn = h; i1 = hit.i; d1 = 1 - d1; add(at(e, d1 === 1 ? 0 : e.L)); }
      else walk(e, hit.s, d1 === 0 ? e.L : 0);
      while (total < len && guard++ < 40) { const n = endOf(E[i1], d1); let best = null, bs = Infinity;
        for (const i2 of adj[n]) for (const d2 of [0, 1]) { const e2 = E[i2]; if ((d2 === 0 ? e2.a : e2.b) !== n || e2.off || (i2 === i1 && hIn == null) || !allowed(n, i1, i2)) continue;
          let t = hIn == null ? turnOf(E[i1], d1, e2, d2) : outHd(e2, d2) - hIn; t = Math.atan2(Math.sin(t), Math.cos(t)); if (hIn != null && Math.abs(t) > 2.4) continue;   // not back the way it came
          let sc = Math.abs(t) + (ok(e2, d2) ? 0 : 3);
          if (prefer && prefer.length > 1) { const pd = distTo(at(e2, d2 === 0 ? Math.min(15, e2.L) : Math.max(0, e2.L - 15)), prefer); if (pd < 12) sc = pd / 12 - 10 + sc * 0.1; }
          if (sc < bs) { bs = sc; best = [i2, d2]; } }
        if (!best) break; [i1, d1] = best; hIn = null; const e2 = E[i1]; walk(e2, d1 === 0 ? 0 : e2.L, d1 === 0 ? e2.L : 0); }
      if (Math.abs(off) > 0.2 && Math.abs(off) < 10) out = out.map((p, k) => { const a = out[Math.max(0, k - 1)], b = out[Math.min(out.length - 1, k + 1)], L = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1;
        return [p[0] - (b[1] - a[1]) / L * off, p[1] + (b[0] - a[0]) / L * off]; });
      return out; };
    roadRoute = (ax, ay, bx, by) => netRoute(ax, ay, bx, by) || gridRoute(ax, ay, bx, by);
    window.roadRoute = roadRoute;
    build([]);
    window.ROADNET = { get E() { return E; }, nodes: NV, near, setOv, ov: () => OVR, nearNode, deg: baseDeg, follow };
    const OVS = window.OVERSITE; if (OVS && OVS.roads) setOv(OVS.roads.ov);
    else if (!/^https?:$/.test(location.protocol)) { try { setOv(JSON.parse(localStorage.getItem('oversite-roads') || '{}')); } catch (e) {} }
  })();
  const HOSTED = window.HOSTED = /^https?:$/.test(location.protocol);   // the hosted site has no demo: units come from the server only
  let units = HOSTED ? [] : JSON.parse(document.getElementById('units').textContent);
  if (HOSTED) { const fl = document.querySelector('.fleet'); if (fl) fl.innerHTML = '<div class="empty" style="padding:18px 6px;color:var(--dim);font-size:12.5px;line-height:1.5">No units on duty. Players on a mapped team appear here as soon as the server link is set up.</div>';
    const on = document.getElementById('statOnline'); if (on) on.textContent = '0'; }
  const seg = {}; for (const k in ROUTES) { const r = ROUTES[k], L = [0]; for (let i = 1; i < r.length; i++) L.push(L[i-1] + Math.hypot(r[i][0]-r[i-1][0], r[i][1]-r[i-1][1])); seg[k] = L; }
  const at = (k, t) => { const r = ROUTES[k], L = seg[k], d = t * L[L.length-1]; let i = 1; while (i < L.length-1 && L[i] < d) i++;
    const f = (d - L[i-1]) / (L[i] - L[i-1] || 1), a = r[i-1], b = r[i];
    return { x: a[0] + (b[0]-a[0]) * f, y: a[1] + (b[1]-a[1]) * f, heading: Math.atan2(b[1]-a[1], b[0]-a[0]) }; };
  const now0 = Date.now();
  const CRUISE = { pd: 38, fd: 30, dot: 26 };                                  // demo cruising speed, mph
  for (const u of units) { u.startedAt = now0 - u.since * 1000; u.speed = (CRUISE[u.dept] || 30) / (2.237 * seg[u.route][seg[u.route].length - 1]); Object.assign(u, at(u.route, u.t)); }
  window.UNITS = units; window.DEMO_UNITS = units;

  // department chips: counts from the unit list, click to filter the cards
  const countUnits = () => { const counts = { all: units.length, pd: 0, fd: 0, dot: 0 }; for (const u of units) counts[u.dept]++;
    for (const el of document.querySelectorAll('[data-count]')) el.textContent = counts[el.dataset.count] ?? 0; }; countUnits();
  const chips = [...document.querySelectorAll('.chips button[data-filter]')];
  chips.forEach(c => c.addEventListener('click', () => {
    chips.forEach(x => x.setAttribute('aria-pressed', x === c));
    const f = c.dataset.filter;
    // one page-wide filter: the cards, the 2D pins and the 3D map all follow it, so a live redraw can't bring other teams back
    window.DEPT_FILTER = f === 'all' ? null : f; if (f === 'all') delete document.body.dataset.filter; else document.body.dataset.filter = f; dispatchEvent(new CustomEvent('deptfilter'));
    for (const card of document.querySelectorAll('.veh[data-unit]')) card.hidden = f !== 'all' && !card.classList.contains('dept-' + f);
  }));

  const MAP = document.getElementById('mapsrc-mini')?.getAttribute('href') || document.getElementById('mapsrc')?.getAttribute('href') || document.querySelector('.view img')?.getAttribute('src');
  let minis = [], timers = [], spds = [], bars = [];
  // a map box can change size after it was measured (the MDT home grows when a call is assigned); the picture must follow, or the
  // map slides out from under the dots, so every box is watched and re-measured when it resizes
  const ro = window.ResizeObserver ? new ResizeObserver(es => { for (const e of es) { const m = minis.find(x => x.el === e.target); if (!m) continue; const r = e.target.getBoundingClientRect(); m.w = r.width; m.h = r.height; } if (minis[0]) { w = minis[0].w || 0; h = minis[0].h || 0; } }) : null;
  const bind = () => { const find = el => units.find(x => x.id === el.dataset.unit);
    minis = [...document.querySelectorAll('.mini.live')].map(el => ({ el, u: find(el) })).filter(m => m.u); if (ro) { ro.disconnect(); for (const m of minis) ro.observe(m.el); }
    timers = [...document.querySelectorAll('.timer[data-unit]')].map(el => ({ el, u: find(el) })).filter(m => m.u);
    spds = [...document.querySelectorAll('.spd[data-unit]')].map(el => ({ el, u: find(el) })).filter(m => m.u);
    bars = [...document.querySelectorAll('.veh[data-unit]')].map(el => ({ el: el.querySelector('.bar2'), u: find(el) })).filter(m => m.u); };
  bind(); addEventListener('rebind', () => { bind(); if (curMap) setMini(curMap); measure(); });
  setTimeout(() => addEventListener('units', () => { units = window.UNITS || []; countUnits(); bind(); if (MAP) setMini(MAP); measure(); const f = document.querySelector('.chips [aria-pressed="true"]')?.dataset.filter || 'all';
    for (const card of document.querySelectorAll('.veh[data-unit]')) card.hidden = f !== 'all' && !card.classList.contains('dept-' + f); }), 0);
  const VIEW = 300;                                   // world units visible across a mini map
  // past the edge of the map picture is open water, in the same colour as the picture's own sea
  const seaOf = url => /darkmode/.test(url) ? '#111113' : /-dark\./.test(url) ? '#04070E' : '#3E6972';
  // close-up MDT maps use the high-detail picture (light map on the hosted site), so streets stay sharp when zoomed right in
  const HD = 'liberty-county-hd.jpg', hdOk = url => /^https?:$/.test(location.protocol) && !/dark/.test(url);
  const bgFor = m => m.el.classList.contains('tmap') && m.view < 700 && hdOk(curMap) ? HD : curMap;
  let curMap = MAP; const setMini = url => { curMap = url; for (const m of minis) { m.bg = bgFor(m); m.el.style.backgroundImage = `url("${m.bg}")`; m.el.style.backgroundColor = seaOf(url); } };
  if (MAP) setMini(MAP);
  addEventListener('maptheme', e => { const l = document.getElementById('mapsrc-mini')?.getAttribute('href') || document.getElementById('mapsrc')?.getAttribute('href'), d = document.getElementById('mapsrc-dark')?.getAttribute('href') || document.querySelector('.view img')?.dataset.dark; setMini(e.detail.theme === 'dark' ? (d || l) : (l || d)); });
  let w = 0, h = 0; const measure = () => { for (const m of minis) { const r = m.el.getBoundingClientRect(); m.w = r.width; m.h = r.height; m.view = m.el.classList.contains('tmap') ? 520 : VIEW; m.base = m.view; } w = minis[0]?.w || 0; h = minis[0]?.h || 0; };
  measure(); addEventListener('resize', measure); addEventListener('mdt', () => setTimeout(measure, 650)); addEventListener('viewchange', () => setTimeout(measure, 50));

  // GPS on the MDT maps: the road route from your unit to the call you're on, redrawn as you drive, zoomed so both fit
  const gps = (m, ts) => { const { el, u } = m, c = (window.CALLS || []).find(k => window.onIt ? window.onIt(k, u.name) : k.unit === u.name);
    let svg = el.querySelector('svg.gps');
    if (!c || !Number.isFinite(c.x)) { if (svg) svg.remove(); m.view = m.base; m.route = null; m.cx = m.cy = null; return; }
    if (!svg) { svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg'); svg.setAttribute('class', 'gps'); svg.innerHTML = '<path class="r2"/><path class="r1"/><circle class="dst" r="0"/>'; el.insertBefore(svg, el.querySelector('.pin')); }
    const moved = m.route && Math.hypot(u.x - m.route[0][0], u.y - m.route[0][1]);
    if (!m.route || m.routeFor !== c.startedAt || m.rGen !== window.ROUTE_GEN || (moved > 10 && ts - m.routeAt > 500)) { m.route = window.roadRoute ? window.roadRoute(u.x, u.y, c.x, c.y) : [[u.x, u.y], [c.x, c.y]]; m.routeFor = c.startedAt; m.routeAt = ts; m.rGen = window.ROUTE_GEN; }
    const pts = [[u.x, u.y], ...m.route.slice(1)], d = 'M' + pts.map(p => p[0].toFixed(1) + ' ' + p[1].toFixed(1)).join('L');
    // frame the whole trip: centre between you and the call, zoomed in until both (and the road between) just fit
    const xs = pts.map(p => p[0]), ys = pts.map(p => p[1]), x0 = Math.min(...xs), x1 = Math.max(...xs), y0 = Math.min(...ys), y1 = Math.max(...ys), ar = m.w / m.h || 1;
    m.cx = (x0 + x1) / 2; m.cy = (y0 + y1) / 2; m.view = Math.min(2600, Math.max(140, (x1 - x0) * 1.35 + 40, ((y1 - y0) * 1.35 + 40) * ar));
    const vw = m.view, vh = vw * m.h / m.w; svg.setAttribute('viewBox', `${(m.cx - vw / 2).toFixed(1)} ${(m.cy - vh / 2).toFixed(1)} ${vw.toFixed(1)} ${vh.toFixed(1)}`);
    const sw = (vw / m.w).toFixed(3); svg.querySelector('.r1').setAttribute('d', d); svg.querySelector('.r2').setAttribute('d', d); svg.style.setProperty('--sw', sw);
    const dst = svg.querySelector('.dst'); dst.setAttribute('cx', c.x); dst.setAttribute('cy', c.y); dst.setAttribute('r', (7 * sw).toFixed(2)); };
  let last = performance.now(), tick = 0, miniT = 0;   // tick = last timer refresh (ms)
  const loop = (ts) => {
    const dt = Math.min((ts - last) / 1000, 0.05); last = ts;
    for (const u of units) { if (u.live) { window.liveStep?.(u, ts); continue; }        // live units: speed-and-turn prediction between snapshots (live block)
      if (u.task) { const T = u.task; let left = T.mps * dt;
        while (left > 0 && T.i < T.path.length - 1) { const [bx, by] = T.path[T.i + 1], d = Math.hypot(bx - u.x, by - u.y); if (d <= left) { u.x = bx; u.y = by; T.i++; left -= d; } else { u.x += (bx - u.x) / d * left; u.y += (by - u.y) / d * left; left = 0; } }
        const nx = T.path[Math.min(T.i + 1, T.path.length - 1)]; if (Math.hypot(nx[0] - u.x, nx[1] - u.y) > 0.5) u.heading = Math.atan2(nx[1] - u.y, nx[0] - u.x);
        if (T.i >= T.path.length - 1) { if (T.call) { if (T.call.stage < 2) { T.call.stage = 2; dispatchEvent(new CustomEvent('calls')); } } else { u.task = null; } }
        continue; }
      u.t += u.dir * u.speed * dt; if (u.t > 1) { u.t = 1; u.dir = -1; } if (u.t < 0) { u.t = 0; u.dir = 1; }
      const p = at(u.route, u.t); u.x = p.x; u.y = p.y; if (u.dir < 0) p.heading += Math.PI; u.heading = p.heading; }
    if (w && ts - miniT >= 33 && document.body.dataset.view !== 'status' && document.body.dataset.view !== 'fire') { miniT = ts; const sc = w / VIEW; const size = 2000 * sc;
      for (const m of minis) { const { el, u } = m; if (el.hidden || el.closest('[hidden]') || !m.w) continue; if (!m.w) continue; if (m.base && el.classList.contains('tmap')) gps(m, ts); const s2 = m.w / m.view, size2 = 2000 * s2;
        el.style.backgroundSize = `${size2}px ${size2}px`; if (curMap && m.bg !== bgFor(m)) { m.bg = bgFor(m); el.style.backgroundImage = `url("${m.bg}")`; } const fx = m.cx ?? u.x, fy = m.cy ?? u.y; el.style.backgroundPosition = `${m.w/2 - fx*s2}px ${m.h/2 - fy*s2}px`; el.style.setProperty('--ox', ((u.x - fx) * s2).toFixed(1) + 'px'); el.style.setProperty('--oy', ((u.y - fy) * s2).toFixed(1) + 'px');
        el.querySelector('.pin').style.transform = `rotate(${u.heading + Math.PI/2}rad)`; const nh = !!u.live && !u.headingKnown; if (el.classList.contains('nohead') !== nh) el.classList.toggle('nohead', nh); } }
    if (ts - tick >= 1000) { tick = ts; const now = Date.now();
      for (const { el, u } of spds) el.textContent = u.live ? u.mph : (u.task ? (u.task.i >= u.task.path.length - 1 ? 0 : Math.round(u.task.mps * 2.237)) : Math.round(u.speed * seg[u.route][seg[u.route].length-1] * 2.237 * (0.92 + 0.16 * Math.abs(Math.sin(ts / 4000 + u.t * 9)))));
      for (const { el, u } of timers) { const s = Math.floor((now - u.startedAt) / 1000);
        el.textContent = `${Math.floor(s/3600)}:${String(Math.floor(s/60)%60).padStart(2,'0')}:${String(s%60).padStart(2,'0')}`; }
      for (const { el, u } of bars) if (el) el.style.setProperty('--p', Math.min(100, (now - u.startedAt) / 36e5 / 8 * 100).toFixed(1) + '%'); }
    requestAnimationFrame(loop);
  };
  requestAnimationFrame(loop);

  // ── dispatch: a demo unit assigned to a call drives there along the roads; when the call is cleared it drives back to its patrol ──
  const CRUISE_MPS = { pd: 22, fd: 16, dot: 14 };                              // response speed, world units per second
  const onCalls = () => { const CALLS = window.CALLS || [];
    for (const u of units) { if (u.live) continue;
      const c = CALLS.find(c => onIt(c, u.name));
      if (c && (!u.task || u.task.call !== c)) { u.task = { path: roadRoute(u.x, u.y, c.x, c.y), i: 0, mps: CRUISE_MPS[u.dept] || 18, call: c }; if (c.stage < 1) c.stage = 1; }
      else if (!c && u.task && u.task.call) { const home = at(u.route, u.t); u.task = { path: roadRoute(u.x, u.y, home.x, home.y), i: 0, mps: CRUISE_MPS[u.dept] || 18, call: null }; } } };
  addEventListener('calls', onCalls); setTimeout(onCalls, 0);
})();
</script>
"""
tile_css = """  /* unit tile: icon badge + vehicle model + live status, no drawn vehicles */
  .veh .pic{height:auto;min-height:44px;align-items:center;gap:10px;padding:6px 8px 6px 6px;border-radius:10px}
  .veh .pic::before{inset:0;right:0;border-radius:10px;background:linear-gradient(90deg,color-mix(in srgb,var(--acc) 14%,rgba(240,242,245,.05)),rgba(240,242,245,.03) 70%)}
  .veh .badge{position:relative;flex:none;width:34px;height:34px;border-radius:9px;display:flex;align-items:center;justify-content:center;
    color:var(--acc);background:color-mix(in srgb,var(--acc) 16%,rgba(11,11,12,.6));border:1px solid color-mix(in srgb,var(--acc) 35%,transparent)}
  .veh .vinfo{position:relative;flex:1;min-width:0;line-height:1.25}
  .veh .vinfo b{display:block;font-weight:500;font-size:11.5px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
  .veh .vinfo small{display:block;font-size:9.5px;color:var(--dim);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
  .veh .vinfo .code{color:var(--acc);font-weight:500}
  .veh .hd .id{margin-top:1px}
"""
if 'unit tile: icon badge' not in s: s=s.replace('</style>',tile_css+'</style>')
js_add = r"""<script>
/* ── Unit Availability: real chart over shift data ── */
(() => {
  const svg = document.getElementById('avSvg'), num = document.getElementById('avNum'), sub = document.getElementById('avSub'),
        xs = document.getElementById('avXs'), hov = document.getElementById('avHov'), plot = document.getElementById('avPlot');
  if (!svg) return;
  const TARGET = 80, START = 9, END = 21, STEP = 0.5;           // shift window, half-hour samples
  const PLOT_W = 252, TOP = 8, BOT = 84;                          // drawing area inside the 300x86 viewBox
  let seed = 23; const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  // one sample per half hour: units on duty and how many of them are free (not on a call)
  const data = [];
  for (let h = START; h <= END; h += STEP) { if (window.HOSTED) { data.push({ h, onduty: 0, avail: 0 }); continue; }
    const onduty = Math.round(17 + 9 * Math.sin((h - 8) / 14 * Math.PI) + rnd() * 3);
    const busy = Math.round(2 + rnd() * 5 + (h >= 17 && h <= 19 ? 3 : 0));
    data.push({ h, onduty, avail: Math.max(0, onduty - busy) });
  }
  const pct = d => d.onduty ? d.avail / d.onduty * 100 : 0;
  const X = i => i / (data.length - 1) * PLOT_W;
  const Y = v => BOT - (v / 100) * (BOT - TOP);
  const fmt = h => String(Math.floor(h)).padStart(2, '0') + ':' + (h % 1 ? '30' : '00');

  const render = () => {
    const maxOn = Math.max(...data.map(d => d.onduty)) || 1;
    const bw = PLOT_W / data.length * 0.55;
    let g = '<g stroke="rgba(240,242,245,.07)" stroke-width="1">';
    for (const v of [100, 75, 50, 25]) g += `<line x1="0" y1="${Y(v)}" x2="${PLOT_W}" y2="${Y(v)}"/>`;
    g += '</g><g fill="rgba(240,242,245,.09)">';
    data.forEach((d, i) => { const h = (d.onduty / maxOn) * (BOT - TOP) * 0.8; g += `<rect x="${X(i) - bw / 2}" y="${BOT - h}" width="${bw}" height="${h}"/>`; });
    g += '</g>';
    // highlight the two best half-hours
    const top2 = [...data.keys()].sort((a, b) => pct(data[b]) - pct(data[a])).slice(0, 2);
    for (const i of top2) g += `<rect x="${X(i) - bw}" y="${TOP}" width="${bw * 2}" height="${BOT - TOP}" fill="rgba(240,242,245,.10)"/>`;
    // target
    g += `<line x1="0" y1="${Y(TARGET)}" x2="${PLOT_W}" y2="${Y(TARGET)}" stroke="#E9A24C" stroke-width="1" stroke-dasharray="3 3" opacity=".8"/>`;
    g += `<text x="${PLOT_W - 2}" y="${Y(TARGET) - 3}" font-size="7.5" fill="#E9A24C" text-anchor="end" font-family="inherit">${TARGET}%</text>`;
    // availability line
    const pts = data.map((d, i) => `${X(i)} ${Y(pct(d))}`);
    g += `<path d="M${pts.join(' L')}" fill="none" stroke="#F0F2F5" stroke-width="1.3" stroke-linejoin="round"/>`;
    for (const i of top2) g += `<circle cx="${X(i)}" cy="${Y(pct(data[i]))}" r="2.4" fill="#F0F2F5"/>`;
    g += '<line id="avCur" x1="-10" y1="' + TOP + '" x2="-10" y2="' + BOT + '" stroke="rgba(240,242,245,.35)" stroke-width="1"/>';
    svg.innerHTML = g;
    const last = data[data.length - 1], p = pct(last);
    num.innerHTML = Math.floor(p) + '.<span class="d">' + Math.round((p % 1) * 10) + '</span>';
    sub.textContent = `${last.avail} of ${last.onduty} units free`;
    num.style.color = p < TARGET - 15 ? 'var(--red)' : '';
    xs.innerHTML = [9, 12, 15, 18, 21].map(h => `<span>${fmt(h)}</span>`).join('');
  };

  // hover / keyboard readout
  const show = i => { const d = data[i], r = plot.getBoundingClientRect();
    const px = X(i) / 300 * r.width;
    hov.innerHTML = `<b>${fmt(d.h)}</b> · <b>${Math.round(pct(d))}%</b> · ${d.avail}/${d.onduty} free`; hov.style.left = Math.min(Math.max(px, 44), r.width - 60) + 'px'; hov.hidden = false;
    const cur = svg.querySelector('#avCur'); cur.setAttribute('x1', X(i)); cur.setAttribute('x2', X(i)); };
  const hide = () => { hov.hidden = true; const cur = svg.querySelector('#avCur'); cur.setAttribute('x1', -10); cur.setAttribute('x2', -10); };
  plot.addEventListener('pointermove', e => { const r = plot.getBoundingClientRect(); const x = (e.clientX - r.left) / r.width * 300;
    if (x > PLOT_W) return hide(); show(Math.round(x / PLOT_W * (data.length - 1))); });
  plot.addEventListener('pointerleave', hide);
  // live data: the current half-hour reflects the real roster (units on duty, minus those on a call)
  const liveSample = () => { const U = window.UNITS || []; if (!window.HOSTED && !(U.length && U[0].live)) return; if (U.length && !U[0].live) return; const C = window.CALLS || [];
    const now = new Date(), hh = now.getHours() + (now.getMinutes() >= 30 ? 0.5 : 0), idx = Math.max(0, Math.min(data.length - 1, Math.round((hh - START) / STEP)));
    const slot = data[idx]; slot.onduty = U.length; slot.avail = U.filter(u => !C.some(c => onIt(c, u.name))).length; const last = data[data.length - 1]; if (slot !== last) { last.onduty = slot.onduty; last.avail = slot.avail; } render(); };
  addEventListener('units', liveSample); addEventListener('calls', liveSample); if (window.HOSTED) { render(); sub.textContent = 'No units on duty'; }
  let ki = data.length - 1;
  plot.addEventListener('keydown', e => { if (e.key === 'ArrowLeft') ki = Math.max(0, ki - 1); else if (e.key === 'ArrowRight') ki = Math.min(data.length - 1, ki + 1); else return; e.preventDefault(); show(ki); });

  // live feed: the current half-hour keeps moving as units take and clear calls
  setInterval(() => { const d = data[data.length - 1]; d.avail = Math.max(0, Math.min(d.onduty, d.avail + (rnd() < 0.5 ? -1 : 1))); render(); }, 4000);
  render();
})();
</script>
"""
import re
s=re.sub(r'<script id="units" type="application/json">.*?shared unit simulation.*?</script>\n', '', s, flags=re.S)
s=re.sub(r'<script>\n/\* ── Unit Availability: real chart.*?</script>\n', '', s, flags=re.S)
anchor='<script>\n/* ── bottom panels' if '<script>\n/* ── bottom panels' in s else '<script>\n(() => {'
s=s.replace(anchor, units_js.replace('__ROUTES__', open('preview/newmap/routes.json').read()).replace('__ROADNET__', open('preview/newmap/roadnet.json').read())+js_add+anchor,1)
import sys, os; sys.path.insert(0, os.path.dirname(os.path.abspath(__file__))); import live_block; s = live_block.apply(s, ICON)
import staff_block; s = staff_block.apply(s)
open(p,'w').write(s)
b64=base64.b64encode(open('preview/liberty-county-dark.jpg','rb').read()).decode()
b64l=base64.b64encode(open('preview/liberty-county.jpg','rb').read()).decode()
b64m=base64.b64encode(open('preview/liberty-county-darkmode.jpg','rb').read()).decode()
sa=s.replace('src="liberty-county-dark.jpg"','src=""').replace('data-light="liberty-county.jpg"','data-light="data:image/jpeg;base64,'+b64l+'"').replace('data-dark="liberty-county-darkmode.jpg"','data-dark="data:image/jpeg;base64,'+b64m+'"').replace('href="live-map.html"','href="live-map-standalone.html"').replace('href="live-map-3d.html"','href="live-map-3d-standalone.html"')
open('preview/live-map-standalone.html','w').write(sa); print('rail rebuilt')
