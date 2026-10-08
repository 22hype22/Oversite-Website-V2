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
    <button aria-pressed="false" data-filter="pd"><b data-count="pd">0</b> PD</button>
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
    for (let r = 1; r < 24; r++) for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) if ((Math.abs(dx) === r || Math.abs(dy) === r) && road(cx + dx, cy + dy)) return [cx + dx, cy + dy]; return null; };
  const roadRoute = (ax, ay, bx, by) => { const A = snap(ax, ay), B = snap(bx, by); if (!A || !B) return [[ax, ay], [bx, by]];
    const key = (x, y) => y * GN + x, g = new Map(), came = new Map(), open = [[0, A[0], A[1]]], closed = new Set(); g.set(key(A[0], A[1]), 0);
    const h = (x, y) => Math.hypot(x - B[0], y - B[1]);
    while (open.length) { let bi = 0; for (let i = 1; i < open.length; i++) if (open[i][0] < open[bi][0]) bi = i; const [, x, y] = open.splice(bi, 1)[0]; const k = key(x, y); if (closed.has(k)) continue; closed.add(k);
      if (x === B[0] && y === B[1]) break;
      for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) { if (!dx && !dy) continue; const nx = x + dx, ny = y + dy; if (!road(nx, ny)) continue; const nk = key(nx, ny); if (closed.has(nk)) continue;
        const ng = g.get(k) + (dx && dy ? 1.414 : 1); if (ng < (g.get(nk) ?? Infinity)) { g.set(nk, ng); came.set(nk, k); open.push([ng + h(nx, ny), nx, ny]); } }
      if (closed.size > 40000) break; }
    let k = key(B[0], B[1]); if (!came.has(k) && k !== key(A[0], A[1])) return [[ax, ay], [bx, by]];
    const cells = []; while (k !== undefined) { cells.push([(k % GN + 0.5) * CELL, (Math.floor(k / GN) + 0.5) * CELL]); k = came.get(k); } cells.reverse();
    const pts = [[ax, ay]]; for (let i = 1; i < cells.length - 1; i++) { const [px, py] = cells[i - 1], [cx, cy] = cells[i], [qx, qy] = cells[i + 1]; if ((cx - px) * (qy - cy) !== (cy - py) * (qx - cx)) pts.push(cells[i]); } pts.push([bx, by]);
    const sm = [pts[0]]; for (let i = 1; i < pts.length - 1; i++) { const [a, b, c] = [pts[i - 1], pts[i], pts[i + 1]]; sm.push([b[0] * 0.5 + (a[0] + c[0]) * 0.25, b[1] * 0.5 + (a[1] + c[1]) * 0.25]); } sm.push(pts[pts.length - 1]);
    return sm; };
  window.roadRoute = roadRoute;
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
    for (const card of document.querySelectorAll('.veh[data-unit]')) card.hidden = f !== 'all' && !card.classList.contains('dept-' + f);
  }));

  const MAP = document.getElementById('mapsrc-mini')?.getAttribute('href') || document.getElementById('mapsrc')?.getAttribute('href') || document.querySelector('.view img')?.getAttribute('src');
  let minis = [], timers = [], spds = [], bars = [];
  const bind = () => { const find = el => units.find(x => x.id === el.dataset.unit);
    minis = [...document.querySelectorAll('.mini.live')].map(el => ({ el, u: find(el) })).filter(m => m.u);
    timers = [...document.querySelectorAll('.timer[data-unit]')].map(el => ({ el, u: find(el) })).filter(m => m.u);
    spds = [...document.querySelectorAll('.spd[data-unit]')].map(el => ({ el, u: find(el) })).filter(m => m.u);
    bars = [...document.querySelectorAll('.veh[data-unit]')].map(el => ({ el: el.querySelector('.bar2'), u: find(el) })).filter(m => m.u); };
  bind(); addEventListener('rebind', () => { bind(); measure(); });
  setTimeout(() => addEventListener('units', () => { units = window.UNITS || []; countUnits(); bind(); if (MAP) setMini(MAP); measure(); const f = document.querySelector('.chips [aria-pressed="true"]')?.dataset.filter || 'all';
    for (const card of document.querySelectorAll('.veh[data-unit]')) card.hidden = f !== 'all' && !card.classList.contains('dept-' + f); }), 0);
  const VIEW = 300;                                   // world units visible across a mini map
  const setMini = url => { for (const m of minis) m.el.style.backgroundImage = `url("${url}")`; };
  if (MAP) setMini(MAP);
  addEventListener('maptheme', e => { const l = document.getElementById('mapsrc-mini')?.getAttribute('href') || document.getElementById('mapsrc')?.getAttribute('href'), d = document.getElementById('mapsrc-dark')?.getAttribute('href') || document.querySelector('.view img')?.dataset.dark; setMini(e.detail.theme === 'dark' ? (d || l) : (l || d)); });
  let w = 0, h = 0; const measure = () => { for (const m of minis) { const r = m.el.getBoundingClientRect(); m.w = r.width; m.h = r.height; m.view = m.el.classList.contains('tmap') ? 520 : VIEW; } w = minis[0]?.w || 0; h = minis[0]?.h || 0; };
  measure(); addEventListener('resize', measure); addEventListener('mdt', () => setTimeout(measure, 650)); addEventListener('viewchange', () => setTimeout(measure, 50));

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
      for (const m of minis) { const { el, u } = m; if (el.hidden || el.closest('[hidden]') || !m.w) continue; if (!m.w) continue; const s2 = m.w / m.view, size2 = 2000 * s2;
        el.style.backgroundSize = `${size2}px ${size2}px`; el.style.backgroundPosition = `${m.w/2 - u.x*s2}px ${m.h/2 - u.y*s2}px`;
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
      const c = CALLS.find(c => c.unit === u.name);
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
    const slot = data[idx]; slot.onduty = U.length; slot.avail = U.filter(u => !C.some(c => c.unit === u.name)).length; const last = data[data.length - 1]; if (slot !== last) { last.onduty = slot.onduty; last.avail = slot.avail; } render(); };
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
s=s.replace(anchor, units_js.replace('__ROUTES__', open('preview/newmap/routes.json').read())+js_add+anchor,1)
import sys, os; sys.path.insert(0, os.path.dirname(os.path.abspath(__file__))); import live_block; s = live_block.apply(s, ICON)
open(p,'w').write(s)
b64=base64.b64encode(open('preview/liberty-county-dark.jpg','rb').read()).decode()
b64l=base64.b64encode(open('preview/liberty-county.jpg','rb').read()).decode()
b64m=base64.b64encode(open('preview/liberty-county-darkmode.jpg','rb').read()).decode()
sa=s.replace('src="liberty-county-dark.jpg"','src=""').replace('data-light="liberty-county.jpg"','data-light="data:image/jpeg;base64,'+b64l+'"').replace('data-dark="liberty-county-darkmode.jpg"','data-dark="data:image/jpeg;base64,'+b64m+'"').replace('href="live-map.html"','href="live-map-standalone.html"').replace('href="live-map-3d.html"','href="live-map-3d-standalone.html"')
open('preview/live-map-standalone.html','w').write(sa); print('rail rebuilt')
