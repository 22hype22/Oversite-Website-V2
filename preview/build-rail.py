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
eff='''  <div class="card eff">
    <h3>Operational Efficiency <span class="go"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M7 17 17 7M9 7h8v8"/></svg></span></h3>
    <div class="big">78.<span class="d">3</span><small>%</small></div>
    <div class="tgt">Target:</div>
    <div class="plot">
      <svg viewBox="0 0 300 86" preserveAspectRatio="none" aria-hidden="true">
        <g stroke="rgba(240,242,245,.07)" stroke-width="1"><line x1="0" y1="8" x2="252" y2="8" stroke-dasharray="2 3"/><line x1="0" y1="27" x2="252" y2="27"/><line x1="0" y1="46" x2="252" y2="46"/><line x1="0" y1="65" x2="252" y2="65"/><line x1="0" y1="84" x2="252" y2="84"/></g>
        <g fill="rgba(240,242,245,.09)">
          <rect x="2" y="52" width="7" height="32"/><rect x="16" y="46" width="7" height="38"/><rect x="30" y="58" width="7" height="26"/><rect x="44" y="48" width="7" height="36"/><rect x="58" y="40" width="7" height="44"/><rect x="72" y="54" width="7" height="30"/><rect x="86" y="44" width="7" height="40"/><rect x="100" y="36" width="7" height="48"/><rect x="114" y="50" width="7" height="34"/><rect x="128" y="42" width="7" height="42"/><rect x="142" y="30" width="7" height="54"/><rect x="156" y="48" width="7" height="36"/><rect x="170" y="38" width="7" height="46"/><rect x="184" y="44" width="7" height="40"/><rect x="198" y="34" width="7" height="50"/><rect x="212" y="46" width="7" height="38"/><rect x="226" y="40" width="7" height="44"/><rect x="240" y="50" width="7" height="34"/>
        </g>
        <rect x="98" y="8" width="12" height="76" fill="rgba(240,242,245,.10)"/><rect x="194" y="8" width="12" height="76" fill="rgba(240,242,245,.10)"/>
        <path d="M0 58 L10 52 L22 60 L34 50 L46 55 L58 44 L70 50 L82 40 L94 46 L104 26 L116 50 L128 40 L140 48 L152 36 L164 44 L176 34 L188 42 L200 22 L212 44 L226 38 L240 46 L252 36" fill="none" stroke="#F0F2F5" stroke-width="1.3" stroke-linejoin="round"/>
        <path d="M0 66 L10 62 L20 68 L30 60 L40 64 L50 58" fill="none" stroke="#E9A24C" stroke-width="1.3" stroke-dasharray="3 2"/>
        <circle cx="104" cy="26" r="2.4" fill="#F0F2F5"/><circle cx="200" cy="22" r="2.4" fill="#F0F2F5"/>
      </svg>
      <div class="ax"><span>+80%</span><span>100%</span><span>75%</span><span>50%</span><span>25%</span></div>
      <div class="xs"><span>09:00</span><span>12:00</span><span>15:00</span><span>18:00</span><span>21:00</span></div>
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
open(p,'w').write(s)
b64=base64.b64encode(open('preview/liberty-county-dark.jpg','rb').read()).decode()
sa=s.replace('src="liberty-county-dark.jpg"','src="data:image/jpeg;base64,'+b64+'"').replace('href="live-map.html"','href="live-map-standalone.html"').replace('href="live-map-3d.html"','href="live-map-3d-standalone.html"')
open('preview/live-map-standalone.html','w').write(sa); print('rail rebuilt')
