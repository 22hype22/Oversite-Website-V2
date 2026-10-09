import base64, json, re, sys
S='/tmp/claude-0/-home-user-Oversite-Website-V2/12077a2b-514d-5869-a336-49444aaa4631/scratchpad/3d/'
src=open('preview/live-map.html').read()
css=open(S+'3d.css').read(); js=open(S+'3d.js').read()
geo=open('preview/liberty-county-3d.json').read()
landmarks=open('preview/newmap/landmarks.json').read()

view3d='''<!-- ─────────── 3D map (shares the view with the 2D world) ─────────── -->
<link id="mapsrc" rel="preload" as="image" href="liberty-county-4k.jpg">
<link id="mapsrc-dark" rel="preload" as="image" href="liberty-county-darkmode.jpg">
<link id="heightsrc" rel="preload" as="image" href="liberty-county-height.png">
<link id="mapsrc-mini" rel="preload" as="image" href="liberty-county-mini.jpg">
<div class="loading" id="loading">BUILDING CITY…</div>
<div class="pins" id="pins3d" aria-hidden="true">
  <div class="pin" id="tip" style="transform:none;left:-999px;display:none">
    <div class="tip">
      <div class="k"></div>
      <div class="s"></div>
      <div class="v"></div>
    </div>
  </div>
</div>

'''
out=src.replace('  <div class="vig"></div>\n</div>','  <div class="view3d" id="view3d"></div>\n  <div class="vig"></div>\n</div>',1)
assert 'id="view3d"' in out
out=out.replace('<img src="liberty-county-dark.jpg" data-light="liberty-county.jpg" data-hd="liberty-county-hd.jpg" data-dark="liberty-county-darkmode.jpg" alt="">','<img alt="" data-hd="liberty-county-hd.jpg">')
assert '<img alt="" data-hd' in out
b=out.index('<!-- ─────────── top bar ─────────── -->'); out=out[:b]+view3d+out[b:]
out=out.replace('<title>Oversite Live Map</title>','<title>Oversite Live Map 3D</title>')
out=out.replace('</style>',css+'</style>')
out=out.replace('<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Geist:wght@300;400;500;600&display=swap">',
 '<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Geist:wght@300;400;500;600&display=swap">\n<script type="importmap">{"imports":{"three":"./vendor/three.module.js","three/addons/":"./vendor/"}}</script>')
# view switch chip

out=out.replace('<button id="zfit" aria-label="Recenter">','<button id="zfit" aria-label="Follow PD 6023" aria-pressed="false">')
old_layers=out[out.index('<button id="zout" aria-label="Layers">'):out.index('</button>',out.index('<button id="zout"'))+len('</button>')]
picker='''<button id="zout" aria-label="Zoom out"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M5 12h14"/></svg></button>
    <div class="layers" id="layers">
      <button id="zlayers" aria-label="Map style" aria-haspopup="true"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="m12 3 9 5-9 5-9-5zM3 13l9 5 9-5"/></svg></button>
      <div class="fly"><div class="flyout" role="group" aria-label="Map style">
        <button role="menuitemradio" data-dim="3d" data-theme="light" aria-checked="true"><span class="thumb t3d light"><i></i></span>3D</button>
        <button role="menuitemradio" data-dim="3d" data-theme="dark" aria-checked="false"><span class="thumb t3d dark"><i></i></span>3D Dark</button>
        <button role="menuitemradio" data-dim="2d" data-theme="light" aria-checked="false"><span class="thumb light"><i></i></span>2D</button>
        <button role="menuitemradio" data-dim="2d" data-theme="dark" aria-checked="false"><span class="thumb dark"><i></i></span>2D Dark</button>
      </div></div>
    </div>'''
out=out.replace(old_layers,picker)
# keep the 2D script; add the 3D module and a mode controller after it
ctl='''<script type="module">
/* ── map style controller: 3D / 3D Dark / 2D / 2D Dark ── */
const body = document.body, picker = document.getElementById('layers'), zfit = document.getElementById('zfit');
// 3D needs graphics acceleration: without it every frame is copied back through the main thread and clicks lag by close to a second.
// The browser can tell us (failIfMajorPerformanceCaveat); then the CAD starts on the 2D map without glass blur. A person's own choice is remembered.
const slow = (() => { try { const c = document.createElement('canvas'), g = c.getContext('webgl2', { failIfMajorPerformanceCaveat: true }) || c.getContext('webgl', { failIfMajorPerformanceCaveat: true }); if (!g) return true;
  const d = g.getExtension('WEBGL_debug_renderer_info'), r = d ? String(g.getParameter(d.UNMASKED_RENDERER_WEBGL)) : ''; g.getExtension('WEBGL_lose_context')?.loseContext();
  return /swiftshader|llvmpipe|softpipe|software|basic render/i.test(r); } catch (e) { return false; } })();   // software drawing (Chrome's SwiftShader, Mesa llvmpipe, Windows' basic driver)
let saved = null; try { saved = JSON.parse(localStorage.getItem('ov.mapstyle') || 'null'); } catch (e) {}
const state = saved && (saved.dim === '2d' || saved.dim === '3d') ? { dim: saved.dim, theme: saved.theme === 'dark' ? 'dark' : 'light' } : { dim: slow ? '2d' : '3d', theme: 'light' };
const lowgpu = () => { if (body.classList.contains('lowgpu')) return; body.classList.add('lowgpu'); const st = document.createElement('style');
  st.textContent = 'body.lowgpu{--blur:none;--glass:rgba(13,13,15,.88);--glass2:rgba(20,20,23,.9)}.gpu-note{position:fixed;left:50%;bottom:22px;transform:translateX(-50%);z-index:90;display:flex;align-items:center;gap:12px;max-width:min(640px,calc(100vw - 32px));padding:12px 14px 12px 16px;border-radius:14px;background:#17181B;border:1px solid rgba(240,242,245,.14);box-shadow:0 18px 40px -12px rgba(0,0,0,.6);color:#C9CDD3;font-size:13px;line-height:1.45}.gpu-note b{color:#F0F2F5}.gpu-note button{flex:none;font:inherit;font-size:12.5px;font-weight:500;padding:7px 12px;border-radius:999px;border:1px solid rgba(240,242,245,.18);background:rgba(240,242,245,.06);color:#F0F2F5;cursor:pointer}.gpu-note button.x{padding:7px 10px}';
  document.head.appendChild(st); };
if (slow) lowgpu();
const remember = () => { try { localStorage.setItem('ov.mapstyle', JSON.stringify(state)); } catch (e) {} };
const L = document.getElementById('mapsrc').getAttribute('href'), D = document.getElementById('mapsrc-dark').getAttribute('href');
const img2d = document.querySelector('.view img'); img2d.dataset.light = L; img2d.dataset.dark = D;

for (const t of picker.querySelectorAll('.thumb i')) t.style.backgroundImage = `url("${t.parentElement.classList.contains('dark') ? D : L}")`;
const apply = () => {
  body.classList.toggle('mode-3d', state.dim === '3d'); body.classList.toggle('mode-2d', state.dim === '2d');
  body.classList.toggle('theme-dark', state.theme === 'dark'); body.classList.toggle('theme-light', state.theme === 'light');
  window.map3d.setTheme(state.theme); window.map3d.setActive(state.dim === '3d'); window.map2d.setTheme(state.theme);
  for (const b of picker.querySelectorAll('[data-dim]')) b.setAttribute('aria-checked', b.dataset.dim === state.dim && b.dataset.theme === state.theme);
  dispatchEvent(new CustomEvent('maptheme', { detail: { ...state } }));
};
addEventListener('viewchange', e => { window.map3d.setActive(e.detail === 'dispatch' && state.dim === '3d'); });
picker.addEventListener('click', e => { const b = e.target.closest('[data-dim]'); if (!b) return; state.dim = b.dataset.dim; state.theme = b.dataset.theme; remember(); apply(); });
document.getElementById('zin').onclick = () => (state.dim === '3d' ? window.map3d : window.map2d).zoomIn();
document.getElementById('zout').onclick = () => (state.dim === '3d' ? window.map3d : window.map2d).zoomOut();
if (zfit) zfit.onclick = () => state.dim === '3d' ? window.map3d.toggleFollow() : window.map2d.fit();
apply();
let noted = false; try { noted = localStorage.getItem('ov.gpunote') === '1'; } catch (e) {}
const note = () => { if (noted || document.querySelector('.gpu-note')) return; const n = document.createElement('div'); n.className = 'gpu-note'; n.setAttribute('role', 'status');
  n.innerHTML = '<span><b>Showing the 2D map.</b> Your browser is not using graphics acceleration, so the 3D map would make the CAD lag. Turn on hardware acceleration in your browser settings to use 3D smoothly.</span><button type="button" data-g="3d">Use 3D anyway</button><button type="button" class="x" data-g="x" aria-label="Dismiss">&times;</button>';
  n.addEventListener('click', e => { const g = e.target.closest('[data-g]'); if (!g) return; if (g.dataset.g === '3d') { state.dim = '3d'; remember(); apply(); } try { localStorage.setItem('ov.gpunote', '1'); } catch (x) {} n.remove(); });
  body.appendChild(n); };
if (slow && !saved) note();
// and if 3D turns out to make this computer lag anyway (a weak graphics chip), drop to 2D once, unless the person picked 3D themselves
if (!saved && state.dim === '3d') { let n = 0, bad = 0; const ping = () => { if (state.dim !== '3d' || document.hidden) return setTimeout(ping, 1000); const t0 = performance.now();
    setTimeout(() => { n++; if (performance.now() - t0 > 120) bad++; if (n < 12) setTimeout(ping, 250); else if (bad >= 6) { lowgpu(); state.dim = '2d'; apply(); note(); } }, 0); };
  setTimeout(ping, 3500); }
</script>'''
j=out.index('</script>\n</body>')
out=out[:j+len('</script>')]+'\n<script id="geo" type="application/json">'+geo+'</script>\n<script id="landmarks" type="application/json">'+landmarks+'</script>\n<script type="module">\n'+js+'</script>\n'+ctl+out[j+len('</script>'):]
open('preview/live-map-3d.html','w').write(out)
# standalone: embed the texture (WebGL cannot read a file:// image), link to the standalone 2D page
b64=base64.b64encode(open('preview/liberty-county.jpg','rb').read()).decode()
d=lambda f:'data:text/javascript;base64,'+base64.b64encode(open(f,'rb').read()).decode()
oc=open('preview/vendor/controls/OrbitControls.js').read().replace("from 'three'","from 'three'")
imp='{"imports":{"three":"'+d('preview/vendor/three.module.js')+'","three/addons/controls/OrbitControls.js":"'+d('preview/vendor/controls/OrbitControls.js')+'"}}'
sa=out.replace('{"imports":{"three":"./vendor/three.module.js","three/addons/":"./vendor/"}}',imp)
b64d=base64.b64encode(open('preview/liberty-county-darkmode.jpg','rb').read()).decode()
b64h=base64.b64encode(open('preview/liberty-county-height.png','rb').read()).decode()
b64m=base64.b64encode(open('preview/liberty-county-mini.jpg','rb').read()).decode()
sa=sa.replace('href="liberty-county-4k.jpg"','href="data:image/jpeg;base64,'+b64+'"').replace('href="liberty-county.jpg"','href="data:image/jpeg;base64,'+b64+'"').replace('href="liberty-county-darkmode.jpg"','href="data:image/jpeg;base64,'+b64d+'"').replace('href="liberty-county-height.png"','href="data:image/png;base64,'+b64h+'"').replace('href="liberty-county-mini.jpg"','href="data:image/jpeg;base64,'+b64m+'"')
sa=sa.replace('href="live-map.html"','href="live-map-standalone.html"').replace('href="live-map-3d.html"','href="live-map-3d-standalone.html"')
open('preview/live-map-3d-standalone.html','w').write(sa)
print('built', len(out), len(sa))
