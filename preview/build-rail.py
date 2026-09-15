import math, base64
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
def vehicle(kind):
    parts=[]
    if kind=='truck':   # fire engine: tall body, short cab
        b=[box(-34,6,-11,11,4,24),box(6,34,-11,11,4,18)]
    else:               # cruiser: body + cabin + light bar
        b=[box(-34,34,-11,11,4,12),box(-14,16,-9,9,12,22)]
    for faces,edges in b:
        parts.append(f'<path d="{faces[0]}" fill="rgba(240,242,245,.10)"/><path d="{faces[1]}" fill="rgba(240,242,245,.04)"/><path d="{faces[2]}" fill="rgba(240,242,245,.02)"/>')
        parts.append(f'<path d="{faces[0]} {faces[1]} {faces[2]} {edges}"/>')
    if kind!='truck':
        f,e=box(-8,8,-8,8,22,25); parts.append(f'<path d="{f[0]} {f[1]} {f[2]}" fill="rgba(226,75,75,.35)" stroke="rgba(240,242,245,.6)"/>')
    else:
        # ladder on top
        for i in range(-30,4,6):
            a=iso(i,-6,24); c=iso(i,6,24); parts.append(f'<path d="M{a[0]:.1f} {a[1]:.1f} L{c[0]:.1f} {c[1]:.1f}" opacity=".6"/>')
    parts+= [wheel(-22,-12),wheel(22,-12),wheel(22,12,4.2)]
    return '<svg viewBox="0 0 120 68" fill="none" stroke="#C9CDD3" stroke-width=".9" stroke-linejoin="round">'+''.join(parts)+'</svg>'

def minimap(path, pin, dashed, sel):
    grid=''.join(f'<path d="{d}" stroke="rgba(240,242,245,.07)" stroke-width="3"/>' for d in ("M0 20H150","M0 44H150","M30 0V64","M76 0V64","M118 0V64","M50 20V44","M96 44V64"))
    return f'''<svg viewBox="0 0 150 64" fill="none" stroke-linecap="round" stroke-linejoin="round">{grid}
<path d="{path}" stroke="rgba(240,242,245,.18)" stroke-width="5"/><path d="{path}" stroke="#F0F2F5" stroke-width="1.6"/>
<path d="{dashed}" stroke="#F0F2F5" stroke-width="1.4" stroke-dasharray="3 3" opacity=".7"/>
<g transform="translate({pin[0]} {pin[1]})"><path d="M0 0 C-4 -5 -6 -8 -6 -11 A6 6 0 1 1 6 -11 C6 -8 4 -5 0 0Z" fill="#F0F2F5"/><circle cy="-11" r="2" fill="#0B0B0C"/></g>
</svg>'''

def card(name, date, kind, uid, big, mm=None, sel=False):
    arrow='<span class="go"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M7 17 17 7M9 7h8v8"/></svg></span>'
    idc=f'<span class="id"><svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><rect x="4" y="4" width="16" height="16" rx="4"/><path d="M9 12h6"/></svg>{uid}</span>'
    h=f'<button class="card veh{"" if big else " compact"}" role="listitem" aria-pressed="{"true" if sel else "false"}">\n'
    h+=f'  <div class="hd"><div><b>{name}</b><small>{date}</small></div>{arrow}</div>\n'
    h+=f'  <div class="pic">{vehicle(kind)}{idc}</div>\n'
    if big:
        h+='  <div class="meta"><span class="on">Online</span><span><svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M2 12h4M18 12h4M12 2v4M12 18v4"/><circle cx="12" cy="12" r="5"/></svg>GPS</span><span><svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M2 20h4v-4H2zM9 20h4v-8H9zM16 20h4V6h-4z"/></svg>LTE</span></div>\n'
        h+=f'  <div class="mini">{minimap(mm[0], mm[1], mm[2], sel)}</div>\n'
        h+=f'  <div class="tl"><span>{mm[3]}</span><span class="bar2" style="--p:{mm[5]}"></span><span>{mm[4]}</span></div>\n'
    return h+'</button>'

chips='''  <div class="chips" role="group" aria-label="Departments">
    <button aria-pressed="true"><b>18</b> PD</button>
    <button aria-pressed="false"><b>6</b> FD</button>
    <button aria-pressed="false"><b>4</b> DOT</button>
    <button aria-pressed="false"><b>37</b> Civilians</button>
  </div>'''
stats='''  <div class="stats">
    <div class="card stat"><div class="l"><svg width="14" height="14" viewBox="0 0 24 24" fill="#46D07C"><circle cx="12" cy="12" r="10"/><path d="m7.5 12.5 3 3 6-6.5" fill="none" stroke="#0B0B0C" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg>Online</div><div class="n">65</div></div>
    <div class="card stat"><div class="l"><svg width="14" height="14" viewBox="0 0 24 24" fill="#E24B4B"><path d="M12 3 2 21h20z"/><path d="M12 10v5M12 17.5v.5" stroke="#0B0B0C" stroke-width="2" stroke-linecap="round"/></svg>Active Calls</div><div class="n">7</div></div>
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
fleet='  <div class="fleet" role="list" aria-label="Units">\n'
fleet+=card('PD 6023','08.03.2026, 02:31:35 AM','car','45623',True,('M14 54 L40 30 L40 14 L68 14',(68,14),'M68 14 L110 14 L136 36','06AM','11PM','42%'),sel=True)+'\n'
fleet+=card('FD 4120','10.03.2026, 11:22:18','truck','31564',True,('M12 18 L40 18 L40 46 L92 46',(92,46),'M92 46 L124 46 L138 24','05AM','09PM','64%'))+'\n'
fleet+=card('DOT 2209','10.03.2026, 11:25:40','truck','34654',False)+'\n'
fleet+=card('PD 1207','10.03.2026, 11:25:40','car','34664',False)+'\n  </div>'
fleet=fleet.replace("(68,14)","(68,14)")
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
if "Unit Availability: real chart" not in s: s=s.replace('<script>\n(() => {', js_add+'<script>\n(() => {',1)
open(p,'w').write(s)
b64=base64.b64encode(open('preview/liberty-county-dark.jpg','rb').read()).decode()
sa=s.replace('src="liberty-county-dark.jpg"','src="data:image/jpeg;base64,'+b64+'"').replace('href="live-map.html"','href="live-map-standalone.html"').replace('href="live-map-3d.html"','href="live-map-3d-standalone.html"')
open('preview/live-map-standalone.html','w').write(sa); print('rail rebuilt')
