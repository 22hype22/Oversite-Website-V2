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
 dict(id='pd-6023',model='Explorer PPV',dept='pd',name='PD 6023',crew=['22hype22','sppoklex','relukt'],ranks=['Chief of Police', 'Sergeant', 'Officer'],kind='cruiser',uid='45623',route='B',t=0.42,dir=1,speed=0.011,since=6137),
 dict(id='fd-4120',model='Pierce Engine',dept='fd',name='FD 4120',crew=['marlowe_j','ttx_ash'],ranks=['Captain', 'Firefighter'],kind='engine',uid='31564',route='A',t=0.28,dir=1,speed=0.008,since=2711),
 dict(id='dot-2209',model='F-350 Arrow Board',dept='dot',name='DOT 2209',crew=['cone_daddy'],ranks=['Supervisor'],kind='dot',uid='34654',route='A',t=0.88,dir=-1,speed=0.007,since=10422),
 dict(id='pd-1207',model='Charger Pursuit',dept='pd',name='PD 1207',crew=['nova.k','bryce_v'],ranks=['Lieutenant', 'Officer'],kind='cruiser',uid='34664',route='B',t=0.61,dir=-1,speed=0.010,since=1503),
 dict(id='pd-3310',model='Tahoe PPV',dept='pd',name='PD 3310',crew=['ghostrider44'],ranks=['Corporal'],kind='cruiser',uid='38812',route='A',t=0.12,dir=1,speed=0.012,since=4290),
 dict(id='fd-2201',model='Rescue 1',dept='fd',name='FD 2201',crew=['ember_lux','dan.holt','mk_ruiz'],ranks=['Battalion Chief', 'Firefighter', 'Probationary'],kind='engine',uid='29907',route='B',t=0.05,dir=1,speed=0.007,since=8004),
 dict(id='dot-1180',model='Plow Truck',dept='dot',name='DOT 1180',crew=['plow_king','ash_dot'],ranks=['Operator', 'Operator'],kind='dot',uid='36012',route='B',t=0.85,dir=-1,speed=0.006,since=13355),
 dict(id='pd-4501',model='Explorer PPV',dept='pd',name='PD 4501',crew=['kzz_mike'],ranks=['Trainee'],kind='cruiser',uid='41155',route='A',t=0.66,dir=-1,speed=0.011,since=622),
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
    <div class="card stat"><div class="l"><svg width="14" height="14" viewBox="0 0 24 24" fill="#46D07C"><circle cx="12" cy="12" r="10"/><path d="m7.5 12.5 3 3 6-6.5" fill="none" stroke="#0B0B0C" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg>Online</div><div class="n">65</div></div>
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
  const ROUTES = { A: [[1332,275],[1340,520],[1350,760],[1350,1000],[1352,1452],[300,1452]],
                   B: [[188,792],[660,792],[660,988],[1180,988],[1240,1040],[1240,1330],[1350,1330]] };
  const units = JSON.parse(document.getElementById('units').textContent);
  const seg = {}; for (const k in ROUTES) { const r = ROUTES[k], L = [0]; for (let i = 1; i < r.length; i++) L.push(L[i-1] + Math.hypot(r[i][0]-r[i-1][0], r[i][1]-r[i-1][1])); seg[k] = L; }
  const at = (k, t) => { const r = ROUTES[k], L = seg[k], d = t * L[L.length-1]; let i = 1; while (i < L.length-1 && L[i] < d) i++;
    const f = (d - L[i-1]) / (L[i] - L[i-1] || 1), a = r[i-1], b = r[i];
    return { x: a[0] + (b[0]-a[0]) * f, y: a[1] + (b[1]-a[1]) * f, heading: Math.atan2(b[1]-a[1], b[0]-a[0]) }; };
  const now0 = Date.now();
  for (const u of units) { u.startedAt = now0 - u.since * 1000; Object.assign(u, at(u.route, u.t)); }
  window.UNITS = units;

  // department chips: counts from the unit list, click to filter the cards
  const counts = { all: units.length, pd: 0, fd: 0, dot: 0 }; for (const u of units) counts[u.dept]++;
  for (const el of document.querySelectorAll('[data-count]')) el.textContent = counts[el.dataset.count] ?? 0;
  const chips = [...document.querySelectorAll('.chips button[data-filter]')];
  chips.forEach(c => c.addEventListener('click', () => {
    chips.forEach(x => x.setAttribute('aria-pressed', x === c));
    const f = c.dataset.filter;
    for (const card of document.querySelectorAll('.veh[data-unit]')) card.hidden = f !== 'all' && !card.classList.contains('dept-' + f);
  }));

  const MAP = document.getElementById('mapsrc')?.getAttribute('href') || document.querySelector('.view img')?.getAttribute('src');
  const minis = [...document.querySelectorAll('.mini.live')].map(el => ({ el, u: units.find(x => x.id === el.dataset.unit) }));
  const timers = [...document.querySelectorAll('.timer[data-unit]')].map(el => ({ el, u: units.find(x => x.id === el.dataset.unit) }));
  const spds = [...document.querySelectorAll('.spd[data-unit]')].map(el => ({ el, u: units.find(x => x.id === el.dataset.unit) }));
  const bars = [...document.querySelectorAll('.veh[data-unit]')].map(el => ({ el: el.querySelector('.bar2'), u: units.find(x => x.id === el.dataset.unit) }));
  const VIEW = 300;                                   // world units visible across a mini map
  if (MAP) for (const m of minis) m.el.style.backgroundImage = `url("${MAP}")`;
  let w = 0, h = 0; const measure = () => { const r = minis[0]?.el.getBoundingClientRect(); if (r) { w = r.width; h = r.height; } };
  measure(); addEventListener('resize', measure);

  let last = performance.now(), tick = 0;
  const loop = (ts) => {
    const dt = Math.min((ts - last) / 1000, 0.05); last = ts;
    for (const u of units) { u.t += u.dir * u.speed * dt; if (u.t > 1) { u.t = 1; u.dir = -1; } if (u.t < 0) { u.t = 0; u.dir = 1; }
      const p = at(u.route, u.t); u.x = p.x; u.y = p.y; if (u.dir < 0) p.heading += Math.PI; u.heading = p.heading; }
    if (w) { const sc = w / VIEW; const size = 2000 * sc;
      for (const { el, u } of minis) { el.style.backgroundSize = `${size}px ${size}px`; el.style.backgroundPosition = `${w/2 - u.x*sc}px ${h/2 - u.y*sc}px`;
        el.querySelector('.pin').style.transform = `rotate(${u.heading + Math.PI/2}rad)`; } }
    if (++tick % 20 === 0) { const now = Date.now();
      for (const { el, u } of spds) el.textContent = Math.round(u.speed * seg[u.route][seg[u.route].length-1] * 2.237 * (0.92 + 0.16 * Math.abs(Math.sin(ts / 4000 + u.t * 9))));
      for (const { el, u } of timers) { const s = Math.floor((now - u.startedAt) / 1000);
        el.textContent = `${Math.floor(s/3600)}:${String(Math.floor(s/60)%60).padStart(2,'0')}:${String(s%60).padStart(2,'0')}`; }
      for (const { el, u } of bars) if (el) el.style.setProperty('--p', Math.min(100, (now - u.startedAt) / 36e5 / 8 * 100).toFixed(1) + '%'); }
    requestAnimationFrame(loop);
  };
  requestAnimationFrame(loop);
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
  for (let h = START; h <= END; h += STEP) {
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
s=s.replace(anchor, units_js+js_add+anchor,1)
open(p,'w').write(s)
b64=base64.b64encode(open('preview/liberty-county-dark.jpg','rb').read()).decode()
sa=s.replace('src="liberty-county-dark.jpg"','src="data:image/jpeg;base64,'+b64+'"').replace('href="live-map.html"','href="live-map-standalone.html"').replace('href="live-map-3d.html"','href="live-map-3d-standalone.html"')
open('preview/live-map-standalone.html','w').write(sa); print('rail rebuilt')
