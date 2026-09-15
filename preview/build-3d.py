import base64, json, re, sys
S='/tmp/claude-0/-home-user-Oversite-Website-V2/12077a2b-514d-5869-a336-49444aaa4631/scratchpad/3d/'
src=open('preview/live-map.html').read()
css=open(S+'3d.css').read(); js=open(S+'3d.js').read()
geo=open('preview/liberty-county-3d.json').read()

view3d='''<!-- ─────────── 3D map (shares the view with the 2D world) ─────────── -->
<link id="mapsrc" rel="preload" as="image" href="liberty-county.jpg">
<link id="mapsrc-dark" rel="preload" as="image" href="liberty-county-dark.jpg">
<div class="loading" id="loading">BUILDING CITY…</div>
<div class="pins" id="pins3d" aria-hidden="true">
  <div class="pin" id="tip" style="transform:none;left:-999px">
    <div class="tip">
      <div class="k">PD 6023</div>
      <div class="s">22hype22, sppoklex, relukt</div>
      <div class="v">10-8<small>available</small></div>
    </div>
  </div>
</div>

'''
out=src.replace('  <div class="vig"></div>\n</div>','  <div class="view3d" id="view3d"></div>\n  <div class="vig"></div>\n</div>',1)
assert 'id="view3d"' in out
out=out.replace('<img src="liberty-county-dark.jpg" data-light="liberty-county.jpg" data-dark="liberty-county-dark.jpg" alt="">','<img alt="">')
assert '<img alt="">' in out
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
const state = { dim: '3d', theme: 'light' };
const body = document.body, picker = document.getElementById('layers'), zfit = document.getElementById('zfit');
const L = document.getElementById('mapsrc').getAttribute('href'), D = document.getElementById('mapsrc-dark').getAttribute('href');
const img2d = document.querySelector('.view img'); img2d.dataset.light = L; img2d.dataset.dark = D;
for (const t of picker.querySelectorAll('.thumb i')) t.style.backgroundImage = `url("${t.parentElement.classList.contains('dark') ? D : L}")`;
const apply = () => {
  body.classList.toggle('mode-3d', state.dim === '3d'); body.classList.toggle('mode-2d', state.dim === '2d');
  body.classList.toggle('theme-dark', state.theme === 'dark'); body.classList.toggle('theme-light', state.theme === 'light');
  window.map3d.setTheme(state.theme); window.map3d.setActive(state.dim === '3d'); window.map2d.setTheme(state.theme);
  for (const b of picker.querySelectorAll('[data-dim]')) b.setAttribute('aria-checked', b.dataset.dim === state.dim && b.dataset.theme === state.theme);
  zfit.setAttribute('aria-label', state.dim === '3d' ? 'Follow PD 6023' : 'Recenter');
  dispatchEvent(new CustomEvent('maptheme', { detail: { ...state } }));
};
picker.addEventListener('click', e => { const b = e.target.closest('[data-dim]'); if (!b) return; state.dim = b.dataset.dim; state.theme = b.dataset.theme; apply(); });
document.getElementById('zin').onclick = () => (state.dim === '3d' ? window.map3d : window.map2d).zoomIn();
document.getElementById('zout').onclick = () => (state.dim === '3d' ? window.map3d : window.map2d).zoomOut();
zfit.onclick = () => state.dim === '3d' ? window.map3d.toggleFollow() : window.map2d.fit();
apply();
</script>'''
j=out.index('</script>\n</body>')
out=out[:j+len('</script>')]+'\n<script id="geo" type="application/json">'+geo+'</script>\n<script type="module">\n'+js+'</script>\n'+ctl+out[j+len('</script>'):]
open('preview/live-map-3d.html','w').write(out)
# standalone: embed the texture (WebGL cannot read a file:// image), link to the standalone 2D page
b64=base64.b64encode(open('preview/liberty-county.jpg','rb').read()).decode()
d=lambda f:'data:text/javascript;base64,'+base64.b64encode(open(f,'rb').read()).decode()
oc=open('preview/vendor/controls/OrbitControls.js').read().replace("from 'three'","from 'three'")
imp='{"imports":{"three":"'+d('preview/vendor/three.module.js')+'","three/addons/controls/OrbitControls.js":"'+d('preview/vendor/controls/OrbitControls.js')+'"}}'
sa=out.replace('{"imports":{"three":"./vendor/three.module.js","three/addons/":"./vendor/"}}',imp)
b64d=base64.b64encode(open('preview/liberty-county-dark.jpg','rb').read()).decode()
sa=sa.replace('href="liberty-county.jpg"','href="data:image/jpeg;base64,'+b64+'"').replace('href="liberty-county-dark.jpg"','href="data:image/jpeg;base64,'+b64d+'"')
sa=sa.replace('href="live-map.html"','href="live-map-standalone.html"').replace('href="live-map-3d.html"','href="live-map-3d-standalone.html"')
open('preview/live-map-3d-standalone.html','w').write(sa)
print('built', len(out), len(sa))
