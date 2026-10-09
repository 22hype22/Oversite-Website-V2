/* Oversite opener. Plays once per browser session on the first page someone opens:
   a white route sweeps in, laps the logo faster and faster, the beam fades out while the logo fills,
   then the page fades in and the logo glides into the page's own logo. A click or key press skips it.
   The page's <head> adds html.ov-intro (a dark cover) before first paint; this script takes over from it. */
(() => {
  const root = document.documentElement;
  if (!root.classList.contains('ov-intro')) return;
  try { sessionStorage.setItem('ov_intro_seen', '1'); } catch (e) {}
  const ROUTE = 'M-80 640 C 200 640 330 380 470 330 C 560 300 648.9 330 648.9 445.9', OUTLINE = 'M648.9 445.9 L649.3 456.5 L650.6 465.6 L653.3 475.8 L657.1 486.0 L664.2 500.2 L669.0 508.1 L676.4 518.9 L686.3 530.8 L715.1 560.7 L745.0 588.9 L758.2 600.4 L766.0 605.8 L779.0 611.9 L787.8 614.0 L795.6 614.7 L806.1 614.0 L816.0 611.9 L826.1 608.2 L835.0 603.8 L845.8 597.0 L857.7 588.2 L884.9 564.8 L900.8 549.5 L925.6 523.3 L936.5 509.4 L942.3 499.9 L947.3 487.7 L949.7 478.2 L950.7 469.0 L950.7 462.6 L949.7 453.4 L946.3 442.9 L943.6 437.8 L938.9 431.7 L934.8 427.6 L927.0 421.5 L912.0 413.0 L899.1 407.6 L896.8 407.2 L887.6 403.8 L862.1 398.1 L834.6 394.3 L805.1 393.0 L803.1 393.3 L802.0 394.3 L802.0 395.3 L818.0 412.7 L860.1 454.8 L860.1 456.8 L816.0 500.6 L803.1 514.2 L800.7 513.5 L786.1 497.2 L738.9 446.9 L738.9 443.2 L875.7 304.7 L875.7 302.7 L872.3 300.3 L846.5 292.1 L825.1 287.0 L810.9 285.0 L793.5 285.0 L783.0 286.7 L770.8 290.8 L763.0 294.5 L756.5 298.6 L744.0 308.8 L717.8 332.9 L698.5 352.2 L681.9 370.6 L674.7 379.7 L666.9 391.3 L659.1 405.9 L653.3 421.1 L651.0 430.3 Z';
  const TARGETS = ['.hero .mark img', '.wrap .mark img', '.brand img'];                     // landing, access screen, everything else
  const GLYPH = { x: 0.3061, y: 0.2371, w: 0.3915 };                                          // where the mark sits inside logo.png (the tablet-frame logo)
  const LOGO = { delay: .25, T: 2.6, laps: 4, accel: 6, fade: .55 };
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;

  const css = document.createElement('style');
  css.textContent = `
.ov-splash{position:fixed;inset:0;z-index:2147483647;pointer-events:auto;cursor:default}
.ov-splash .bw{position:absolute;inset:0;transition:opacity .75s ease-out}
.ov-splash .bf{position:absolute;inset:0;background:#07080A}
.ov-splash .mp{position:absolute;inset:0;background:url(/liberty-county.jpg) center/cover;filter:brightness(.32) saturate(.7);opacity:0;transition:opacity .8s ease-out}
.ov-splash.go .mp{opacity:1}
.ov-splash.leave .bw{opacity:0}
.ov-splash svg{position:absolute;inset:0;width:100%;height:100%;overflow:visible;transform-origin:0 0}
.ov-splash .rt{fill:none;stroke:#fff;stroke-width:4;stroke-linecap:round;filter:drop-shadow(0 0 6px rgba(255,255,255,.65));transition:opacity .8s ease-out}
.ov-splash.onlogo .rt{opacity:0}
.ov-splash .ob{fill:none;stroke:rgba(255,255,255,.26);stroke-width:2.5;stroke-linejoin:round}
.ov-splash .cm{filter:drop-shadow(0 0 var(--gr,6px) rgba(255,255,255,.8))}
.ov-splash .oc{fill:none;stroke-linecap:round;stroke-linejoin:round;opacity:0}
.ov-splash .c1{stroke:rgba(255,255,255,.28);stroke-width:6}.ov-splash .c2{stroke:rgba(255,255,255,.7);stroke-width:4.5}.ov-splash .c3{stroke:#fff;stroke-width:3.5}
.ov-splash .dt{fill:#fff;filter:drop-shadow(0 0 9px #fff);opacity:0}
.ov-splash .sd{fill:#fff;opacity:0;transform:scale(.985);transform-box:fill-box;transform-origin:center;transition:opacity .55s ease-out,transform .55s cubic-bezier(0.23,1,0.32,1)}
.ov-splash.lit .sd{opacity:1;transform:none;animation:ovBloom .9s ease-out both}
.ov-splash.landed svg{opacity:0;transition:opacity .2s ease-out}
.ov-splash.skip{opacity:0;transition:opacity .3s ease-out}
@keyframes ovBloom{from{filter:drop-shadow(0 0 26px rgba(255,255,255,.9))}to{filter:drop-shadow(0 0 0 rgba(255,255,255,0))}}`;
  document.head.appendChild(css);

  const el = document.createElement('div'); el.className = 'ov-splash'; el.setAttribute('aria-hidden', 'true');
  el.innerHTML = '<div class="bw"><div class="bf"></div><div class="mp"></div></div><svg viewBox="0 0 1600 900" preserveAspectRatio="xMidYMid slice">'
    + '<path class="sd" d="' + OUTLINE + '"/><path class="rt" d="' + ROUTE + '"/><path class="ob" d="' + OUTLINE + '"/>'
    + '<g class="cm"><path class="oc c1" d="' + OUTLINE + '"/><path class="oc c2" d="' + OUTLINE + '"/><path class="oc c3" d="' + OUTLINE + '"/></g>'
    + '<circle class="dt" r="6.5" cx="-80" cy="640"/></svg>';
  document.body.appendChild(el);
  root.classList.remove('ov-intro');                                                     // the splash now covers the page itself

  const q = s => el.querySelector(s), svg = q('svg'), route = q('.rt'), base = q('.ob'), cs = [...el.querySelectorAll('.oc')], dot = q('.dt');
  const timers = []; let raf = 0, hid = null, finished = false;
  const later = (fn, ms) => timers.push(setTimeout(fn, ms));
  const finish = () => { if (finished) return; finished = true; cancelAnimationFrame(raf); timers.forEach(clearTimeout); if (hid) hid.style.visibility = ''; el.remove(); css.remove();
    removeEventListener('keydown', skip, true); };
  const skip = () => { if (finished || el.classList.contains('skip')) return; cancelAnimationFrame(raf); timers.forEach(clearTimeout); if (hid) hid.style.visibility = '';
    el.classList.add('skip'); setTimeout(finish, 320); };
  el.addEventListener('pointerdown', skip); addEventListener('keydown', skip, true);

  // the solid logo glides onto the page's own logo while the dark background fades, then hands off to it
  const fly = () => {
    const img = TARGETS.map(s => document.querySelector(s)).find(i => i && i.getBoundingClientRect().width > 0);
    el.classList.add('leave');
    if (!img) { later(() => el.classList.add('landed'), 500); later(finish, 800); return; }
    const S = q('.sd').getBoundingClientRect(), O = svg.getBoundingClientRect(), r = img.getBoundingClientRect();
    const k = r.width * GLYPH.w / S.width, gx = r.left + r.width * GLYPH.x, gy = r.top + r.height * GLYPH.y;
    hid = img; img.style.visibility = 'hidden';
    svg.style.transition = 'transform .8s cubic-bezier(0.65, 0, 0.35, 1)';
    svg.style.transform = 'translate(' + (gx - O.left - k * (S.left - O.left)) + 'px,' + (gy - O.top - k * (S.top - O.top)) + 'px) scale(' + k + ')';
    later(() => { img.style.visibility = ''; hid = null; el.classList.add('landed'); }, 820);
    later(finish, 1100);
  };

  if (reduce) { el.classList.add('go', 'onlogo', 'lit'); later(() => { el.classList.add('leave', 'landed'); }, 900); later(finish, 1700); return; }

  requestAnimationFrame(() => el.classList.add('go'));
  const Lr = route.getTotalLength(), Lo = base.getTotalLength(), end = Lr + LOGO.laps * Lo, T = LOGO.T, a = LOGO.accel, v0 = 3 * end / ((a + 2) * T), vTop = a * v0;
  route.style.strokeDasharray = Lr + ' ' + Lr; route.style.strokeDashoffset = Lr; base.style.strokeDasharray = Lo + ' ' + Lo; base.style.strokeDashoffset = Lo;
  const t0 = performance.now() + LOGO.delay * 1000;
  // speed builds as v(t) = v0 + (v1 - v0)(t/T)^2; tail length and glow follow it; after the last lap the beam keeps its top speed and fades
  const frame = now => {
    const tt = Math.max(0, (now - t0) / 1000), t = Math.min(T, tt), over = Math.max(0, tt - T);
    const s = v0 * t + (a - 1) * v0 * t * t * t / (3 * T * T) + vTop * over, v = v0 + (a - 1) * v0 * (t / T) ** 2;
    const fade = (1 - Math.min(1, over / LOGO.fade)) ** 1.5;
    let pt;
    if (s <= Lr) { route.style.strokeDashoffset = Lr - s; pt = route.getPointAtLength(s); }
    else {
      if (!el.classList.contains('onlogo')) { el.classList.add('onlogo'); route.style.strokeDashoffset = 0; }
      const u = s - Lr, pos = u % Lo, k = Math.min(1, Math.max(0, (t / T - .8) / .2)), ramp = k * k * (3 - 2 * k);
      base.style.strokeDashoffset = Lo - Math.min(u, Lo); base.style.opacity = fade;
      const Lc = Math.min(Lo, u, (36 + v * .12) * (1 - ramp) + Lo * ramp);
      [1, .55, .22].forEach((f, i) => { const L = Math.max(.5, Lc * f), c = cs[i]; c.style.opacity = fade; c.style.strokeDasharray = L + ' ' + (Lo - L + .01); c.style.strokeDashoffset = L - pos; });
      pt = base.getPointAtLength(pos);
    }
    dot.setAttribute('cx', pt.x); dot.setAttribute('cy', pt.y); dot.style.opacity = fade;
    svg.style.setProperty('--gr', (4 + 14 * (v / vTop)).toFixed(1) + 'px');
    if (over > .12) el.classList.add('lit');
    if (over < LOGO.fade) raf = requestAnimationFrame(frame); else later(fly, 350);
  };
  raf = requestAnimationFrame(frame);
})();
