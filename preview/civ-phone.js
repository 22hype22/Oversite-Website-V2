// The Civilian tab as a phone that looks like an iPhone: a wallpaper, the status bar with the Dynamic Island, widgets (the
// weather where the server is, the wallet balance, today's date), the apps as rounded icons with red badges on pages you swipe
// between (the dots under them), and the dock. Press and hold an app to move it: onto another page, or onto or off the dock. Pull
// down on the home screen to search. Tapping an app opens it full screen; "Apps" at the top, the bar at the bottom (or Esc) goes back
// home. The Settings app picks the wallpaper, which widgets show and the device: this phone, or a tablet like an iPad (wider, more
// apps to a row, the widgets side by side, the dock centred); all kept on this device, the layout included. More apps (Messages, Maps, News) plug in
// with window.ovPhone.addApp (civ-apps.js). On a phone it fills the screen, whichever device is picked.
(() => { const page = document.getElementById('civMdt'), tabs = document.getElementById('cvTabs'), OV = window.OVERSITE || {}; if (!page || !tabs) return;
  const $ = id => document.getElementById(id), API = OV.api || '';
  const esc = t => String(t ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const call = async (p, b) => { const r = await fetch(API + p, b ? { method: 'POST', headers: { 'content-type': 'application/json', 'x-oversite': '1' }, body: JSON.stringify(b) } : { cache: 'no-store' });
    const j = await r.json().catch(() => ({})); if (!r.ok) throw new Error(j.error || 'Something went wrong (' + r.status + ')'); return j; };
  // this device's choices for this server's phone
  const KEY = 'ov.phone:' + (OV.slug || ''), WIDGETS = ['weather', 'wallet', 'calendar'], WALLS = {
    blue: ['Blue', 'radial-gradient(140% 70% at 115% 18%,rgba(46,98,214,.6),transparent 52%),radial-gradient(110% 60% at -25% 92%,rgba(28,74,190,.55),transparent 58%),linear-gradient(170deg,#0C1222,#05070D 55%,#0A1230)'],
    sunset: ['Sunset', 'radial-gradient(120% 60% at 20% 0%,rgba(255,140,90,.75),transparent 60%),radial-gradient(120% 70% at 100% 100%,rgba(190,60,140,.7),transparent 60%),linear-gradient(170deg,#2A1236,#120A1C)'],
    aurora: ['Aurora', 'radial-gradient(90% 55% at 10% 10%,rgba(60,230,170,.55),transparent 60%),radial-gradient(90% 60% at 100% 50%,rgba(90,110,255,.55),transparent 60%),linear-gradient(170deg,#06141A,#060914)'],
    graphite: ['Graphite', 'radial-gradient(120% 60% at 50% 0%,rgba(255,255,255,.12),transparent 60%),linear-gradient(170deg,#2A2C31,#0E0F12)'],
    forest: ['Forest', 'radial-gradient(120% 60% at 0% 0%,rgba(120,200,110,.45),transparent 60%),radial-gradient(100% 60% at 100% 100%,rgba(30,120,90,.6),transparent 60%),linear-gradient(170deg,#0D1C14,#050C08)'],
    rose: ['Rose', 'radial-gradient(120% 60% at 100% 0%,rgba(255,150,190,.6),transparent 60%),radial-gradient(100% 60% at 0% 100%,rgba(160,90,255,.5),transparent 60%),linear-gradient(170deg,#2A1426,#120A16)'] };
  let prefs = { wall: 'blue', widgets: ['weather', 'wallet'], device: 'phone', layout: null };
  const ids = v => Array.isArray(v) ? v.filter(x => typeof x === 'string').slice(0, 200) : null;
  try { const p = JSON.parse(localStorage.getItem(KEY) || 'null'); if (p) prefs = { wall: WALLS[p.wall] ? p.wall : 'blue', widgets: (p.widgets || []).filter(w => WIDGETS.includes(w)), device: p.device === 'tablet' ? 'tablet' : 'phone',
    layout: ids(p.layout?.order) && ids(p.layout?.dock) ? { order: ids(p.layout.order), dock: ids(p.layout.dock), gone: ids(p.layout.gone) || [] } : null,
    vol: Number.isInteger(p.vol) && p.vol >= 0 && p.vol <= 16 ? p.vol : 10, silent: !!p.silent,
    cc: Object.fromEntries(Object.entries(p.cc && typeof p.cc === 'object' ? p.cc : {}).filter(([k, v]) => /^[a-z]{2,8}$/.test(k) && (typeof v === 'boolean' || (k === 'br' && Number.isFinite(v) && v >= .2 && v <= 1)))) }; } catch (e) {}
  // the home screen is laid out again when something it depends on changes (the device, the widgets, the size)
  let layoutFn = null, layoutQueued = false;
  const queueLayout = () => { if (!layoutFn || layoutQueued) return; layoutQueued = true; requestAnimationFrame(() => { layoutQueued = false; layoutFn(); }); };
  const save = () => { try { localStorage.setItem(KEY, JSON.stringify(prefs)); } catch (e) {} };

  const css = document.createElement('style'); css.textContent = `
#civMdt.phone{width:min(calc(100vw - 2*var(--gap)),calc((100vh - var(--barh) - 2*var(--gap)) * .4615))}
/* the frame: an iPhone Pro. A thin rounded titanium band (brushed, lighter where the light catches the edges), a black border round the
   glass, the Dynamic Island, the Action button and volume buttons on the left and the side button on the right */
#civMdt.phone .tablet{aspect-ratio:9/19.5;width:100%;height:auto;max-height:100%;border-radius:15.5%/7.2%;padding:3.4%;border:3.5px solid transparent;
  background:linear-gradient(#000,#000) padding-box,
    linear-gradient(135deg,#E3E1DC 0%,#9C9A95 14%,#6D6B67 32%,#B5B3AE 50%,#6D6B67 68%,#9C9A95 86%,#E3E1DC 100%) border-box;
  box-shadow:0 40px 90px rgba(0,0,0,.6),0 0 0 1px rgba(0,0,0,.55),inset 0 0 0 1px rgba(255,255,255,.08),inset 0 0 0 2px rgba(0,0,0,.9)}
/* the buttons on the frame work: the Action button (Silent mode) and volume buttons on the left, the side button (lock) on the right */
#civMdt.phone .ph-key{position:absolute;left:-7.5px;width:4px;padding:0;border:0;border-radius:3px 0 0 3px;background:linear-gradient(90deg,#5E5C58,#B9B7B2 45%,#77756F);cursor:pointer;transition:transform .08s ease}
#civMdt.phone .ph-key::before{content:"";position:absolute;inset:-3px -8px}#civMdt.phone .ph-key:active{transform:translateX(1.5px)}
#civMdt.phone .ph-key:focus-visible{outline:2px solid #0A84FF;outline-offset:2px}
#civMdt.phone .ph-key.act{top:17%;height:5%}#civMdt.phone .ph-key.up{top:25%;height:8.5%}#civMdt.phone .ph-key.down{top:35.5%;height:8.5%}
#civMdt.phone .ph-key.side{left:auto;right:-7.5px;top:25.5%;height:12%;border-radius:0 3px 3px 0;background:linear-gradient(270deg,#5E5C58,#B9B7B2 45%,#77756F)}#civMdt.phone .ph-key.side:active{transform:translateX(-1.5px)}
/* the volume, on a bar by the buttons */
#civMdt.phone .ph-hud{position:absolute;z-index:41;left:calc(3.4% + 7px);top:24%;width:7px;height:19%;border-radius:999px;background:rgba(40,40,44,.7);-webkit-backdrop-filter:blur(12px);backdrop-filter:blur(12px);
  overflow:hidden;opacity:0;transform:translateX(-6px);transition:opacity .18s ease,transform .25s cubic-bezier(.23,1,.32,1),width .2s ease;pointer-events:none}
#civMdt.phone .ph-hud.on{opacity:1;transform:none;width:9px}#civMdt.phone .ph-hud i{position:absolute;left:0;right:0;bottom:0;height:calc(var(--v,.6) * 100%);background:#fff;transition:height .12s ease}#civMdt.phone .ph-hud.mute i{background:rgba(255,255,255,.45)}
/* Silent mode, in the Dynamic Island as it stretches out */
#civMdt.phone .ph-isl{position:absolute;z-index:43;top:calc(var(--sw,344px) * .032);left:50%;width:32%;height:calc(var(--sw,344px) * .093);transform:translateX(-50%);border-radius:999px;background:#000;color:#fff;display:flex;align-items:center;justify-content:space-between;
  gap:8px;padding:0 14px;box-sizing:border-box;font:600 13px/1 -apple-system,BlinkMacSystemFont,"Inter",system-ui,sans-serif;opacity:0;pointer-events:none;overflow:hidden;white-space:nowrap;transition:width .4s cubic-bezier(.32,.72,0,1),opacity .2s ease}
#civMdt.phone .ph-isl.on{width:41%;opacity:1}#civMdt.phone .ph-isl svg{flex:none}#civMdt.phone .ph-isl b{color:#FF453A;font-weight:600}#civMdt.phone .ph-isl b.ring{color:#fff}
/* asleep: the screen dark; the Lock Screen: the date and a big time over the wallpaper, swiped up to open */
#civMdt.phone .ph-off{position:absolute;inset:0;z-index:40;background:#000;cursor:pointer;animation:ph-fade .25s ease}#civMdt.phone .ph-off[hidden],#civMdt.phone .ph-lock[hidden]{display:none}
#civMdt.phone .ph-lock{position:absolute;inset:0;z-index:8;display:flex;flex-direction:column;align-items:center;background:var(--wall);color:#fff;touch-action:none;cursor:grab;user-select:none;transition:transform .28s cubic-bezier(.32,.72,0,1),opacity .28s ease;animation:ph-fade .3s ease}
#civMdt.phone .ph-lock-top{margin-top:58px;opacity:.9}#civMdt.phone .ph-lock-t{text-align:center;margin-top:6px}#civMdt.phone .ph-lock-t small{display:block;font-size:17px;font-weight:600;opacity:.9}
#civMdt.phone .ph-lock-t b{display:block;font-size:84px;font-weight:600;letter-spacing:-.02em;line-height:1;margin-top:2px;font-variant-numeric:tabular-nums}
#civMdt.phone .ph-lock-b{margin-top:auto;width:100%;display:flex;justify-content:space-between;padding:0 44px;box-sizing:border-box}
#civMdt.phone .ph-lock-b span{width:48px;height:48px;border-radius:50%;display:grid;place-items:center;background:rgba(0,0,0,.35);-webkit-backdrop-filter:blur(14px);backdrop-filter:blur(14px)}
#civMdt.phone .ph-lock-h{margin:22px 0 34px;padding:6px 10px;border:0;background:none;color:#fff;font:500 13px/1 inherit;opacity:.85;cursor:pointer}
#civMdt.phone.ph-locked .sbar{z-index:9}#civMdt.phone.ph-locked .ph-back,#civMdt.phone.ph-locked .ph-bar{visibility:hidden}
@keyframes ph-fade{from{opacity:0}to{opacity:1}}
/* press and hold an app: a menu under it, over a blurred home screen */
#civMdt.phone .ph-menu{position:absolute;inset:0;z-index:12;background:rgba(0,0,0,.28);-webkit-backdrop-filter:blur(16px) saturate(1.2);backdrop-filter:blur(16px) saturate(1.2);opacity:0;transition:opacity .18s ease}
#civMdt.phone .ph-menu.on{opacity:1}#civMdt.phone .ph-menu[hidden]{display:none}
#civMdt.phone .ph-menu-ic{position:absolute;width:60px;height:60px;border-radius:22.5%;overflow:hidden;box-shadow:0 10px 30px rgba(0,0,0,.45);transform:scale(.96);transition:transform .25s cubic-bezier(.23,1,.32,1)}
#civMdt.phone .ph-menu.on .ph-menu-ic{transform:scale(1.06)}#civMdt.phone .ph-menu-ic svg{display:block;width:100%;height:100%;padding:0}
#civMdt.phone .ph-menu-card{position:absolute;min-width:220px;max-width:calc(100% - 24px);border-radius:14px;overflow:hidden;background:rgba(44,44,48,.82);-webkit-backdrop-filter:blur(30px);backdrop-filter:blur(30px);
  box-shadow:0 16px 40px rgba(0,0,0,.45);transform-origin:var(--o,top left);transform:scale(.9);opacity:0;transition:transform .22s cubic-bezier(.23,1,.32,1),opacity .15s ease}
#civMdt.phone .ph-menu.on .ph-menu-card{transform:none;opacity:1}
#civMdt.phone .ph-menu-card button{display:flex;align-items:center;justify-content:space-between;gap:14px;width:100%;padding:11px 15px;border:0;border-top:.5px solid rgba(255,255,255,.12);background:none;color:#fff;font:400 15px/1.2 inherit;text-align:left;cursor:pointer}
#civMdt.phone .ph-menu-card button:first-child{border-top:0}#civMdt.phone .ph-menu-card button:hover,#civMdt.phone .ph-menu-card button:focus-visible{background:rgba(255,255,255,.08);outline:none}#civMdt.phone .ph-menu-card button.dz{color:#FF453A}
/* edit mode: a minus on each app takes it off the Home Screen; Edit (top left) adds widgets or changes the wallpaper */
#civMdt.phone .ph-rm{display:none;position:absolute;top:-6px;left:calc(50% - 36px);width:21px;height:21px;border-radius:50%;background:rgba(90,90,96,.92);z-index:2;box-shadow:0 1px 3px rgba(0,0,0,.35)}
#civMdt.phone .ph-rm::after{content:"";position:absolute;left:5.5px;right:5.5px;top:9.5px;height:2px;border-radius:1px;background:#fff}
#civMdt.phone.ph-edit .ph-rm{display:block;cursor:pointer}#civMdt.phone .tside button[data-p].ph-gone{display:none}
#civMdt.phone .ph-editb{display:none;padding:5px 14px;border-radius:999px;border:0;background:rgba(255,255,255,.24);-webkit-backdrop-filter:blur(16px);backdrop-filter:blur(16px);color:#fff;font:600 13px/1.2 inherit;cursor:pointer}
#civMdt.phone.home.ph-edit .ph-editb{display:block}#civMdt.phone.home.ph-edit #cvClock,#civMdt.phone.home.ph-edit .sbar .sb-ic{display:none}#civMdt.phone.home.ph-edit .ph-editb,#civMdt.phone.home.ph-edit .ph-done{margin:0 calc(var(--sw,344px) * .07)}#civMdt.phone .tside:focus{outline:none}
/* Control Center, pulled down from the top right: dark glass over the blurred screen, controls on a four-column grid */
#civMdt.phone .ph-cc{position:absolute;inset:0;z-index:30;display:flex;flex-direction:column;padding:calc(var(--sw,344px) * .07) calc(var(--sw,344px) * .085) 20px;box-sizing:border-box;
  background:rgba(0,0,0,calc(var(--p,1) * .38));-webkit-backdrop-filter:blur(calc(var(--p,1) * 26px)) saturate(1.3);backdrop-filter:blur(calc(var(--p,1) * 26px)) saturate(1.3);color:#fff;overflow-y:auto;scrollbar-width:none;touch-action:none;
  font:500 13px/1.2 -apple-system,BlinkMacSystemFont,"Inter",system-ui,sans-serif;user-select:none}
#civMdt.phone .ph-cc[hidden]{display:none}#civMdt.phone .ph-cc::-webkit-scrollbar{display:none}
#civMdt.phone .ph-cc>*{opacity:var(--p,1);transform:translateY(calc((1 - var(--p,1)) * -26px)) scale(calc(.94 + var(--p,1) * .06));transform-origin:top right}
#civMdt.phone .ph-cc.anim>*{transition:opacity .28s ease,transform .38s cubic-bezier(.32,.72,0,1)}#civMdt.phone .ph-cc.anim{transition:background .28s ease,backdrop-filter .28s ease}
#civMdt.phone .cc-top{display:flex;justify-content:space-between;align-items:center;margin-bottom:calc(var(--sw,344px) * .05)}
#civMdt.phone .cc-top button{background:none;border:0;color:#fff;padding:4px;cursor:pointer;line-height:0}
#civMdt.phone .cc-stat{display:flex;justify-content:space-between;align-items:center;font-size:calc(var(--sw,344px) * .043);font-weight:600;margin:0 4px calc(var(--sw,344px) * .04)}
#civMdt.phone .cc-stat span{display:flex;align-items:center;gap:6px}#civMdt.phone .cc-stat svg{display:block}
#civMdt.phone .cc-g{--cell:calc((var(--sw,344px) * .83 - 3 * var(--sw,344px) * .045) / 4);display:grid;grid-template-columns:repeat(4,var(--cell));grid-auto-rows:var(--cell);gap:calc(var(--sw,344px) * .045);justify-content:center}
#civMdt.phone .cc-t{position:relative;display:grid;place-items:center;border:0;padding:0;border-radius:50%;background:rgba(120,120,128,.32);box-shadow:inset 0 0 0 1px rgba(255,255,255,.12),inset 0 1px 0 rgba(255,255,255,.18);color:#fff;cursor:pointer;
  transition:background .18s ease,transform .12s ease}
#civMdt.phone .cc-t:active{transform:scale(.94)}#civMdt.phone .cc-t:focus-visible{outline:2px solid #0A84FF;outline-offset:2px}
#civMdt.phone .cc-t.on{background:rgba(255,255,255,.94);color:#1C1C1E}#civMdt.phone .cc-t.on.red{color:#FF453A}#civMdt.phone .cc-t.on.yel{background:#FFD60A;color:#1C1C1E}#civMdt.phone .cc-t.rec.on{background:#FF453A;color:#fff}
#civMdt.phone .cc-mod{grid-column:span 2;grid-row:span 2;border-radius:calc(var(--cell) * .42);background:rgba(120,120,128,.3);box-shadow:inset 0 0 0 1px rgba(255,255,255,.12),inset 0 1px 0 rgba(255,255,255,.16);position:relative}
#civMdt.phone .cc-conn{display:grid;grid-template-columns:1fr 1fr;grid-template-rows:1fr 1fr;place-items:center;padding:calc(var(--cell) * .12)}
#civMdt.phone .cc-conn>.cc-t{width:calc(var(--cell) * .88);height:calc(var(--cell) * .88)}#civMdt.phone .cc-t.blue.on{background:#0A84FF;color:#fff}#civMdt.phone .cc-t.green.on{background:#30D158;color:#fff}#civMdt.phone .cc-t.orange.on{background:#FF9F0A;color:#fff}
#civMdt.phone .cc-mini{display:grid;grid-template-columns:1fr 1fr;gap:calc(var(--cell) * .08);width:calc(var(--cell) * .88)}#civMdt.phone .cc-mini .cc-t{width:calc(var(--cell) * .4);height:calc(var(--cell) * .4)}
#civMdt.phone .cc-music{display:flex;flex-direction:column;padding:calc(var(--cell) * .2)}#civMdt.phone .cc-art{width:calc(var(--cell) * .62);height:calc(var(--cell) * .62);border-radius:12px;background:rgba(255,255,255,.12)}
#civMdt.phone .cc-air{position:absolute;right:calc(var(--cell) * .18);top:calc(var(--cell) * .18);width:calc(var(--cell) * .5);height:calc(var(--cell) * .5)}
#civMdt.phone .cc-music b{margin-top:auto;font-size:calc(var(--sw,344px) * .043);font-weight:600;opacity:.85}#civMdt.phone .cc-ctl{display:flex;justify-content:space-between;align-items:center;margin-top:10px}
#civMdt.phone .cc-ctl button{background:none;border:0;color:#fff;padding:2px;cursor:pointer;line-height:0}#civMdt.phone .cc-ctl button:disabled{opacity:.4;cursor:default}
#civMdt.phone .cc-sl{grid-row:span 2;position:relative;overflow:hidden;border-radius:calc(var(--cell) * .5);background:rgba(120,120,128,.32);box-shadow:inset 0 0 0 1px rgba(255,255,255,.12);cursor:ns-resize;touch-action:none}
#civMdt.phone .cc-sl i{position:absolute;left:0;right:0;bottom:0;height:calc(var(--v,.5) * 100%);background:rgba(255,255,255,.94)}
#civMdt.phone .cc-sl svg{position:absolute;left:50%;bottom:calc(var(--cell) * .3);transform:translateX(-50%)}#civMdt.phone .cc-sl:focus-visible{outline:2px solid #0A84FF;outline-offset:2px}
#civMdt.phone .cc-focus{grid-column:span 2;border-radius:999px;display:flex;align-items:center;gap:12px;padding:0 calc(var(--cell) * .14);justify-content:flex-start;font-size:calc(var(--sw,344px) * .04);font-weight:600;white-space:nowrap;overflow:hidden}
#civMdt.phone .cc-focus i{display:grid;place-items:center;width:calc(var(--cell) * .66);height:calc(var(--cell) * .66);border-radius:50%;background:rgba(255,255,255,.16)}
#civMdt.phone .cc-focus.on{background:linear-gradient(110deg,#5E5CE6,#8A5CF6);color:#fff}#civMdt.phone .cc-focus.on i{background:#fff;color:#5E5CE6}
#civMdt.phone .cc-t small{position:absolute;bottom:calc(var(--cell) * .12);font-size:10px;font-weight:600;font-variant-numeric:tabular-nums}
#civMdt.phone .cc-tm{grid-column:1/-1;display:flex;gap:8px;justify-content:center;flex-wrap:wrap}#civMdt.phone .cc-tm[hidden]{display:none}
#civMdt.phone .cc-tm button{border:0;border-radius:999px;padding:8px 14px;background:rgba(120,120,128,.4);color:#fff;font:600 13px/1 inherit;cursor:pointer}#civMdt.phone .cc-tm button.dz{background:#FF453A}
#civMdt.phone .ph-dim{position:absolute;inset:0;z-index:29;background:#000;opacity:calc((1 - var(--br,1)) * .78);pointer-events:none}
/* a recording: the time in a red pill */
#civMdt.phone.ph-rec #cvClock{background:#FF453A;border-radius:999px;width:auto;padding:1px 9px;margin:0 calc(var(--sw,344px) * .07)}
#civMdt.phone.ph-low .tside button[data-p] svg{animation:none!important}
#civMdt.phone.pad .ph-cc{--sw:420px;align-items:flex-end;padding:22px 26px 20px}#civMdt.phone.pad .ph-cc>*{width:min(360px,100%)}
/* the Calculator app */
#civMdt.phone .calc{display:flex;flex-direction:column;justify-content:flex-end;height:100%;padding:0 4px 8px;box-sizing:border-box;background:#000}
#civMdt.phone .calc-d{color:#fff;font-size:64px;font-weight:300;text-align:right;padding:0 14px 8px;overflow:hidden;white-space:nowrap;font-variant-numeric:tabular-nums}
#civMdt.phone .calc-k{display:grid;grid-template-columns:repeat(4,1fr);gap:12px;padding:0 10px}
#civMdt.phone .calc-k button{aspect-ratio:1;border:0;border-radius:999px;background:#333;color:#fff;font:400 28px/1 -apple-system,BlinkMacSystemFont,"Inter",system-ui,sans-serif;cursor:pointer}
#civMdt.phone .calc-k button.f{background:#A5A5A5;color:#000}#civMdt.phone .calc-k button.o{background:#FF9F0A}#civMdt.phone .calc-k button.o.on{background:#fff;color:#FF9F0A}
#civMdt.phone .calc-k button.z{grid-column:span 2;aspect-ratio:auto;text-align:left;padding-left:30px}#civMdt.phone .calc-k button:active{filter:brightness(1.3)}
#civMdt.phone .tablet .screen{border-radius:12.6%/5.9%;font-family:-apple-system,BlinkMacSystemFont,"SF Pro Text","Inter","Segoe UI",system-ui,sans-serif;background:#05070D;
  box-shadow:inset 0 0 0 1px rgba(255,255,255,.04)}
#civMdt.phone .tablet .cam{top:calc(3.4% + 11px);width:31%;height:auto;aspect-ratio:3.4/1;margin-left:-15.5%;border-radius:999px;background:#000;
  box-shadow:inset 0 0 0 1px rgba(255,255,255,.04);z-index:9}
#civMdt.phone .tablet .cam::after{content:"";position:absolute;right:16%;top:50%;width:13%;aspect-ratio:1;transform:translateY(-50%);border-radius:50%;
  background:radial-gradient(circle at 35% 35%,#2B3A55,#0B1220 60%,#05080F)}
#civMdt.phone .sbar{position:relative;z-index:6;display:flex;align-items:center;justify-content:space-between;padding:calc(var(--sw,344px) * .032) 0 0;height:calc(var(--sw,344px) * .125);margin-bottom:calc(var(--sw,344px) * .025);min-height:0;box-sizing:border-box;font-size:15px;font-weight:600;color:#fff;letter-spacing:-.01em}
/* as on an iPhone: the time centred in the space left of the Dynamic Island, signal, Wi-Fi and battery in the space right of it */
#civMdt.phone #cvClock{flex:none;width:34%;text-align:center;font-size:calc(var(--sw,344px) * .046);font-variant-numeric:tabular-nums}
#civMdt.phone .sb-ic{width:34%;justify-content:center}
/* no camera cutout on the glass (nor a camera dot on the tablet): it does nothing here */
#civMdt.phone .tablet .cam{display:none}
#civMdt.phone .sbar .sb-mid,#civMdt.phone .sbar #cvTopBal{display:none}
#civMdt.phone .sb-ic{display:flex;align-items:center;gap:calc(var(--sw,344px) * .015)}#civMdt.phone .sb-ic svg{display:block;height:calc(var(--sw,344px) * .035);width:auto}#civMdt.phone .sb-ic svg:last-child{height:calc(var(--sw,344px) * .038)}#civMdt.phone .sb-ic .off{opacity:.35}
#civMdt.phone.home .screen{background:var(--wall)}
#civMdt.phone.home.wall-blue .screen::before{content:"";position:absolute;left:-30%;top:34%;width:150%;height:62%;border-radius:50%;border-top:2px solid rgba(110,160,255,.35);
  box-shadow:0 -14px 40px rgba(60,120,255,.18);transform:rotate(-24deg);pointer-events:none}
#civMdt.phone .tbody{position:relative;display:block}
#civMdt.phone .tscreens{position:absolute;inset:0 0 26px;background:#0C0D0F;transition:opacity .22s ease,transform .3s cubic-bezier(.2,.8,.2,1),visibility 0s}
#civMdt.phone.home .tscreens{opacity:0;visibility:hidden;transform:scale(.94);pointer-events:none;transition:opacity .18s ease,transform .25s ease,visibility 0s .25s}
#civMdt.phone .tside{position:absolute;inset:0;width:auto;border:0;padding:8px 20px 0;display:flex;flex-direction:column;overflow-x:hidden;overflow-y:auto;scrollbar-width:none;z-index:3;background:none;
  opacity:0;visibility:hidden;transform:scale(1.06);transition:opacity .22s ease,transform .3s cubic-bezier(.2,.8,.2,1),visibility 0s .3s}
#civMdt.phone .tside::-webkit-scrollbar{display:none}
#civMdt.phone.home .tside{opacity:1;visibility:visible;transform:none;transition:opacity .22s ease,transform .3s cubic-bezier(.2,.8,.2,1),visibility 0s}
#civMdt.phone .tside .crest,#civMdt.phone .tside .tuser,#civMdt.phone .tside .tmenu{display:none}
#civMdt.phone .ph-wid{align-self:stretch;display:grid;grid-template-columns:1fr 1fr;gap:16px 18px;margin:6px 0 2px}#civMdt.phone .ph-wid:empty{display:none}
#civMdt.phone .ph-w{display:flex;flex-direction:column;align-items:center;gap:6px;background:none;border:0;padding:0;color:#fff;cursor:pointer;font:inherit;min-width:0}
#civMdt.phone .ph-w>div{width:100%;aspect-ratio:1;border-radius:22px;padding:13px 14px;display:flex;flex-direction:column;text-align:left;overflow:hidden;min-width:0}
#civMdt.phone .ph-w>span{font-size:12px;font-weight:500;text-shadow:0 1px 3px rgba(0,0,0,.5)}
#civMdt.phone .ph-wx{background:linear-gradient(180deg,#3E86D9,#2A62B8);box-shadow:inset 0 1px 0 rgba(255,255,255,.2)}#civMdt.phone .ph-wx.night{background:linear-gradient(180deg,#26304F,#121A33)}
#civMdt.phone .ph-wx.grey{background:linear-gradient(180deg,#6D7B8F,#4A5568)}
#civMdt.phone .ph-wx small{font-size:13px;font-weight:600;display:flex;align-items:center;gap:4px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
#civMdt.phone .ph-wx>*{flex:none}#civMdt.phone .ph-wx b{font-size:36px;font-weight:300;line-height:1.05;letter-spacing:-.02em}#civMdt.phone .ph-wx i{margin-top:auto;font-style:normal;font-size:12px;font-weight:600;line-height:1.35}
#civMdt.phone .ph-bal{background:linear-gradient(165deg,#1F8F63,#0F4F38);box-shadow:inset 0 1px 0 rgba(255,255,255,.18)}
#civMdt.phone .ph-bal small{font-size:12.5px;font-weight:600;opacity:.9}#civMdt.phone .ph-bal b{font-size:26px;font-weight:600;letter-spacing:-.02em;margin-top:4px;line-height:1.05;word-break:break-all}
#civMdt.phone .ph-bal em{margin-top:auto;font-style:normal;font-size:12px;font-weight:500;opacity:.85}
#civMdt.phone .ph-cal{background:rgba(250,250,252,.96);color:#111;box-shadow:0 6px 18px rgba(0,0,0,.3)}
#civMdt.phone .ph-cal small{font-size:12.5px;font-weight:700;color:#FF3B30;text-transform:uppercase}#civMdt.phone .ph-cal b{font-size:44px;font-weight:300;line-height:1;margin-top:2px;letter-spacing:-.03em}
#civMdt.phone .ph-cal em{margin-top:auto;font-style:normal;font-size:12px;color:#6B6E75;font-weight:500}
/* a third widget lies across the row as a short strip, so the home screen still fits */
#civMdt.phone .ph-wid>.ph-w:nth-child(3){grid-column:1/-1;flex-direction:row-reverse;justify-content:flex-end;gap:0}#civMdt.phone .ph-wid>.ph-w:nth-child(3)>span{display:none}
#civMdt.phone .ph-wid>.ph-w:nth-child(3)>div{aspect-ratio:auto;height:64px;flex-direction:row;align-items:center;gap:12px;padding:0 16px;border-radius:18px}
#civMdt.phone .ph-wid>.ph-w:nth-child(3)>div b{font-size:30px;margin:0;order:-1}#civMdt.phone .ph-wid>.ph-w:nth-child(3)>div>*{margin-top:0!important}
#civMdt.phone .ph-wid>.ph-w:nth-child(3)>div>:last-child{margin-left:auto}#civMdt.phone .ph-wid>.ph-w:nth-child(3) .ph-wx svg{display:none}
#civMdt.phone .ph-apps{align-self:stretch;display:grid;grid-template-columns:repeat(4,1fr);gap:16px 0;margin-top:16px;align-content:start}
#civMdt.phone .tside button[data-p]{position:relative;display:flex;flex-direction:column;align-items:center;gap:6px;padding:0;background:none!important;color:#fff;font-size:12px;font-weight:500;text-align:center;line-height:1.15;
  text-shadow:0 1px 3px rgba(0,0,0,.55);letter-spacing:-.005em;-webkit-tap-highlight-color:transparent;border:0;cursor:pointer;font-family:inherit;min-width:0}
#civMdt.phone .tside button[data-p]:focus-visible{outline:none}#civMdt.phone .tside button[data-p]:focus-visible svg{outline:2px solid #fff;outline-offset:2px}
#civMdt.phone .tside button[data-p] svg{flex:none;width:60px;height:60px;padding:15px;border-radius:22.5%;color:#fff;background:var(--app,#3A3D45);
  box-shadow:0 4px 12px rgba(0,0,0,.35),inset 0 1px 0 rgba(255,255,255,.25),inset 0 -1px 0 rgba(0,0,0,.15);stroke-width:2;transition:transform .12s ease,filter .12s ease}
#civMdt.phone .tside button[data-p] svg.ai{padding:0;background:none;box-shadow:0 4px 12px rgba(0,0,0,.35)}
#civMdt.phone .tside button[data-p]:hover svg{filter:brightness(1.08)}#civMdt.phone .tside button[data-p]:active svg{transform:scale(.92);filter:brightness(.85)}
#civMdt.phone .tside button[data-p] .badge{position:absolute;top:-7px;left:calc(50% + 17px);right:auto;margin:0;min-width:24px;height:24px;padding:0 7px;border-radius:12px;
  background:#FF3B30;color:#fff;font:600 13px/24px -apple-system,BlinkMacSystemFont,"Inter",system-ui,sans-serif;text-shadow:none;box-shadow:0 1px 3px rgba(0,0,0,.3)}
#civMdt.phone .tside [data-p="home"]{--app:linear-gradient(180deg,#34D178,#18A058)}#civMdt.phone .tside [data-p="bills"]{--app:linear-gradient(180deg,#FFB340,#FF8A00)}
#civMdt.phone .tside [data-p="cars"]{--app:linear-gradient(180deg,#3FA0FF,#0A6CFF)}#civMdt.phone .tside [data-p="home2"]{--app:linear-gradient(180deg,#FFD84D,#F5B400)}
#civMdt.phone .tside [data-p="shops"]{--app:linear-gradient(180deg,#FF6FA4,#F2306F)}#civMdt.phone .tside [data-p="jobs"]{--app:linear-gradient(180deg,#A07CFF,#6B47F0)}
#civMdt.phone .tside [data-p="biz"]{--app:linear-gradient(180deg,#3AD6DA,#0FA3B0)}#civMdt.phone .tside [data-p="id"]{--app:linear-gradient(180deg,#B9C0CC,#7D8594)}
#civMdt.phone .tside [data-p="record"]{--app:linear-gradient(180deg,#FF5A50,#E0241A)}#civMdt.phone .tside [data-p="server"]{--app:linear-gradient(180deg,#5D6BF2,#3A3FC4)}
#civMdt.phone .tside [data-p="phset"]{--app:linear-gradient(180deg,#A3A8B1,#6E737C)}
#civMdt.phone.home .tside{overflow:hidden;touch-action:pan-x}
#civMdt.phone .tside button[data-p]{-webkit-touch-callout:none;-webkit-user-select:none;user-select:none}
#civMdt.phone .tside button[data-p][hidden]{display:none}
/* the pages of apps, swiped sideways, with a dot for each under them */
#civMdt.phone .ph-pages{flex:1 1 0;min-height:0;align-self:stretch;display:flex;overflow-x:auto;overflow-y:hidden;scroll-snap-type:x mandatory;scrollbar-width:none;overscroll-behavior-x:contain}
#civMdt.phone .ph-pages::-webkit-scrollbar{display:none}
#civMdt.phone .ph-page{flex:0 0 100%;min-width:0;scroll-snap-align:start;scroll-snap-stop:always;display:flex;flex-direction:column;overflow:hidden}
#civMdt.phone .ph-dots{flex:none;align-self:center;display:flex;gap:9px;height:8px;margin:10px 0 14px}
#civMdt.phone .ph-dots button{width:8px;height:8px;padding:0;border:0;border-radius:50%;background:rgba(255,255,255,.35);cursor:pointer;transition:background .2s}
#civMdt.phone .ph-dots button[aria-selected="true"]{background:#fff}
/* moving apps: they wiggle, the one being moved follows the pointer and leaves a faint copy where it will land */
@keyframes ph-jig{from{transform:rotate(-2.2deg)}to{transform:rotate(2.2deg)}}
#civMdt.phone.ph-edit .tside button[data-p] svg{animation:ph-jig .26s ease-in-out infinite alternate}
#civMdt.phone.ph-edit .tside button[data-p]:nth-child(2n) svg{animation-duration:.3s;animation-delay:-.15s}
#civMdt.phone.ph-edit .tside button[data-p]{touch-action:none;cursor:grab}
#civMdt.phone .tside button[data-p].ph-lift{opacity:.25}
#civMdt.phone .ph-ghost svg.ai,#civMdt.phone .ph-spot-app svg.ai{padding:0;background:none}
#civMdt.phone .ph-ghost{position:absolute;left:0;top:0;z-index:20;pointer-events:none;will-change:transform}
#civMdt.phone .ph-ghost svg{display:block;width:60px;height:60px;padding:15px;border-radius:22.5%;color:#fff;background:var(--app,#3A3D45);stroke-width:2;transform:scale(1.12);
  box-shadow:0 16px 32px rgba(0,0,0,.45),inset 0 1px 0 rgba(255,255,255,.25)}
#civMdt.phone .ph-done{display:none;margin-left:auto;padding:5px 14px;border-radius:999px;border:0;background:rgba(255,255,255,.24);-webkit-backdrop-filter:blur(16px);backdrop-filter:blur(16px);
  color:#fff;font-family:inherit;font-size:15px;font-weight:600;cursor:pointer}
#civMdt.phone.home.ph-edit .ph-done{display:block}#civMdt.phone.home.ph-edit .sbar .sb-ic{display:none}
/* search, pulled down from the home screen */
#civMdt.phone .ph-spot{position:absolute;inset:0;z-index:5;display:flex;flex-direction:column;padding:62px 18px 20px;background:rgba(8,10,16,.5);
  -webkit-backdrop-filter:blur(28px) saturate(1.3);backdrop-filter:blur(28px) saturate(1.3);opacity:0;transition:opacity .2s ease}
#civMdt.phone .ph-spot[hidden]{display:none}#civMdt.phone .ph-spot.open{opacity:1}#civMdt.phone .ph-spot.pulling{opacity:var(--pull,0);transition:none}
#civMdt.phone .ph-spot-top{display:flex;align-items:center;gap:12px;transform:translateY(calc((var(--pull,1) - 1) * 18px))}#civMdt.phone .ph-spot.open .ph-spot-top{transform:none;transition:transform .2s ease}
#civMdt.phone .ph-spot-in{flex:1;min-width:0;display:flex;align-items:center;gap:7px;padding:9px 12px;border-radius:12px;background:rgba(255,255,255,.16);color:rgba(255,255,255,.75)}
#civMdt.phone .ph-spot-in input{flex:1;min-width:0;background:none;border:0;outline:0;padding:0;color:#fff;font-family:inherit;font-size:17px}
#civMdt.phone .ph-spot-in input::placeholder{color:rgba(255,255,255,.65)}#civMdt.phone .ph-spot-in input::-webkit-search-cancel-button{-webkit-appearance:none;appearance:none}
#civMdt.phone .ph-spot-x{background:none;border:0;padding:0;color:#fff;font-family:inherit;font-size:17px;cursor:pointer}
#civMdt.phone .ph-spot-res{margin-top:22px;overflow-y:auto;scrollbar-width:none}
#civMdt.phone .ph-spot-res h4{margin:0 2px 12px;font-size:13px;font-weight:600;color:rgba(255,255,255,.7)}
#civMdt.phone .ph-spot-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:16px 0}
#civMdt.phone .ph-spot-app{display:flex;flex-direction:column;align-items:center;gap:6px;min-width:0;background:none;border:0;padding:0;color:#fff;font-family:inherit;font-size:12px;font-weight:500;line-height:1.15;cursor:pointer}
#civMdt.phone .ph-spot-app svg{width:56px;height:56px;padding:14px;border-radius:22.5%;background:var(--app,#3A3D45);color:#fff;stroke-width:2;box-shadow:0 4px 12px rgba(0,0,0,.3)}
#civMdt.phone .ph-spot-app:focus-visible{outline:none}#civMdt.phone .ph-spot-app:focus-visible svg{outline:2px solid #fff;outline-offset:2px}
#civMdt.phone .ph-spot-none{margin-top:30px;text-align:center;font-size:15px;color:rgba(255,255,255,.7)}
@media (prefers-reduced-motion:reduce){#civMdt.phone.ph-edit .tside button[data-p] svg{animation:none}#civMdt.phone .ph-spot,#civMdt.phone .ph-spot.open .ph-spot-top{transition:none}}
#civMdt.phone .ph-dock{flex:none;align-self:stretch;position:sticky;bottom:34px;z-index:2;display:grid;grid-template-columns:repeat(4,1fr);margin:0 -8px 34px;padding:14px 8px;border-radius:34px;background:rgba(255,255,255,.12);
  -webkit-backdrop-filter:blur(22px) saturate(1.5);backdrop-filter:blur(22px) saturate(1.5);box-shadow:inset 0 1px 0 rgba(255,255,255,.12)}
#civMdt.phone .ph-dock button[data-p]{font-size:0!important;gap:0!important}#civMdt.phone .ph-dock button[data-p] .badge{font-size:13px}
#civMdt.phone .ph-bar{position:absolute;left:0;right:0;bottom:0;height:30px;display:flex;align-items:center;justify-content:center;z-index:7;background:none;border:0;cursor:pointer;touch-action:none}
#civMdt.phone .ph-bar::before{content:"";width:134px;height:5px;border-radius:3px;background:rgba(255,255,255,.75);transition:background .15s,width .2s}
#civMdt.phone .ph-bar:hover::before{background:#fff;width:144px}#civMdt.phone.home .ph-bar{pointer-events:none;bottom:4px}
#civMdt.phone.peek .screen{background:var(--wall)}#civMdt.phone.peek .tside{visibility:visible;transition:none}#civMdt.phone.peek .tscreens{z-index:4;overflow:hidden;box-shadow:0 0 0 1px rgba(255,255,255,.1),0 24px 60px rgba(0,0,0,.6)}
#civMdt.phone .ph-back{display:inline-flex;align-items:center;gap:2px;margin:0 0 -6px 12px;padding:4px 8px 0;font-size:16px;font-weight:400;color:#0A84FF;background:none;border:0;cursor:pointer;font-family:inherit}
#civMdt.phone.home .ph-back{visibility:hidden}
/* Settings, iOS style */
#civMdt.phone .ps{padding:4px 16px 24px}#civMdt.phone .ps h3{margin:18px 4px 7px;font-size:12.5px;font-weight:400;text-transform:uppercase;letter-spacing:.02em;color:#8E8E93}
#civMdt.phone .ps-g{border-radius:12px;background:#1C1C1E;overflow:hidden}
#civMdt.phone .ps-r{display:flex;align-items:center;gap:12px;padding:11px 14px;font-size:15px;color:#fff;border-top:.5px solid rgba(255,255,255,.12)}#civMdt.phone .ps-r:first-child{border-top:0}
#civMdt.phone .ps-r span{flex:1;min-width:0}#civMdt.phone .ps-r small{display:block;font-size:12.5px;color:#8E8E93;margin-top:1px}
#civMdt.phone .ps-ic{width:29px;height:29px;border-radius:7px;display:grid;place-items:center;flex:none;color:#fff}
#civMdt.phone .ps-sw{position:relative;width:51px;height:31px;flex:none}#civMdt.phone .ps-sw input{position:absolute;inset:0;opacity:0;margin:0;cursor:pointer}
#civMdt.phone .ps-sw i{position:absolute;inset:0;border-radius:16px;background:#39393D;transition:background .2s;pointer-events:none}
#civMdt.phone .ps-sw i::after{content:"";position:absolute;top:2px;left:2px;width:27px;height:27px;border-radius:50%;background:#fff;box-shadow:0 2px 4px rgba(0,0,0,.3);transition:transform .22s cubic-bezier(.2,.8,.2,1)}
#civMdt.phone .ps-sw input:checked+i{background:#34C759}#civMdt.phone .ps-sw input:checked+i::after{transform:translateX(20px)}#civMdt.phone .ps-sw input:focus-visible+i{outline:2px solid #0A84FF;outline-offset:2px}
#civMdt.phone .ps-walls{display:grid;grid-template-columns:repeat(3,1fr);gap:12px;padding:14px}
#civMdt.phone .ps-walls button{aspect-ratio:9/16;border-radius:12px;border:2px solid transparent;background:var(--w);cursor:pointer;position:relative;padding:0}
#civMdt.phone .ps-walls button[aria-pressed="true"]{border-color:#0A84FF}#civMdt.phone .ps-walls button span{position:absolute;left:0;right:0;bottom:-20px;font-size:12px;color:#C7C7CC;text-align:center}
#civMdt.phone .ps-walls{padding-bottom:30px}
#civMdt.phone .ps-in{display:flex;gap:8px;padding:10px 14px;border-top:.5px solid rgba(255,255,255,.12)}
#civMdt.phone .ps-in input{flex:1;min-width:0;font:inherit;font-size:15px;color:#fff;background:#2C2C2E;border:0;border-radius:9px;padding:8px 11px;outline:0}
#civMdt.phone .ps-in button{font:inherit;font-size:15px;color:#0A84FF;background:none;border:0;cursor:pointer;padding:0 4px}
#civMdt.phone .ps-note{margin:7px 16px 0;font-size:12.5px;color:#8E8E93;line-height:1.4}#civMdt.phone .ps-note.err{color:#FF6961}
/* the apps at phone width */
#civMdt.phone .thead{flex-wrap:wrap;gap:8px}
#civMdt.phone .cv-form .grid3{grid-template-columns:1fr 1fr}
#civMdt.phone .cv-car .cv-pills{order:3;flex-basis:100%;padding-left:0}
@media (max-width:760px){#civMdt.phone{width:100vw}#civMdt.phone .tablet{aspect-ratio:auto;height:100%;border-radius:0;padding:0;box-shadow:none;background:#05070D}
  #civMdt.phone .tablet .screen{border-radius:0;box-shadow:none}#civMdt.phone .tablet .cam{display:none}#civMdt.phone .tablet::before,#civMdt.phone .tablet::after,#civMdt.phone .ph-key,#civMdt.phone .ph-hud,#civMdt.phone .ph-isl{display:none}#civMdt.phone .tablet{border:0}#civMdt.phone .sbar{padding:10px 20px 6px;min-height:0;height:auto;margin-bottom:0}
  #civMdt.phone .tside button[data-p] svg,#civMdt.phone .ph-ghost svg{width:56px;height:56px;padding:14px}#civMdt.phone .ph-dock{margin-bottom:30px}}
@media (prefers-reduced-motion:reduce){#civMdt.phone .tside,#civMdt.phone.home .tside{transition:none;transform:none}}
/* the tablet, above phone width: the same home screen and apps on an iPad, landscape, a thin bezel with a camera dot in it (on a phone it stays the phone) */
@media (min-width:761px){#civMdt.phone.pad{width:min(calc(100vw - 2*var(--gap)),calc((100vh - var(--barh) - 2*var(--gap)) * 1.36))}
/* the tablet: an iPad Air, held landscape. A thin sky-blue aluminium edge, an even black border round the screen with the camera in
   the middle of the top one, the top button and volume buttons standing up from the top edge */
#civMdt.phone.pad .tablet{aspect-ratio:4/3;border-radius:30px;padding:18px;border:3px solid transparent;
  background:linear-gradient(#050608,#050608) padding-box,linear-gradient(135deg,#E2F1F8 0%,#A9CCDC 16%,#86AFC3 38%,#C9E3EE 54%,#8AB3C7 74%,#D6EBF3 100%) border-box;
  box-shadow:0 40px 90px rgba(0,0,0,.6),0 0 0 1px rgba(0,0,0,.4),inset 0 0 0 1px rgba(255,255,255,.07)}
#civMdt.phone.pad .tablet .screen{border-radius:14px}#civMdt.phone.pad .tablet::before,#civMdt.phone.pad .tablet::after{display:none}
#civMdt.phone.pad .ph-key{left:auto;top:-6.5px;height:3.5px;border-radius:2px 2px 0 0;background:linear-gradient(180deg,#D3E8F1,#8CB2C4)}#civMdt.phone.pad .ph-key:active{transform:translateY(1.5px)}
#civMdt.phone.pad .ph-key::before{inset:-8px -3px}#civMdt.phone.pad .ph-key.act{display:none}#civMdt.phone.pad .ph-key.side{right:8%;width:7%}
#civMdt.phone.pad .ph-key.up{right:19%;width:5.5%}#civMdt.phone.pad .ph-key.down{right:25.5%;width:5.5%}
#civMdt.phone.pad .ph-hud{left:auto;right:19%;top:24px;width:12%;height:7px;transform:translateY(-6px)}#civMdt.phone.pad .ph-hud.on{transform:none;width:12%;height:9px}
#civMdt.phone.pad .ph-hud i{top:0;bottom:0;height:auto;width:calc(var(--v,.6) * 100%);transition:width .12s ease}#civMdt.phone.pad .ph-isl{display:none}
#civMdt.phone.pad .ph-lock-top{margin-top:40px}#civMdt.phone.pad .ph-lock-t b{font-size:96px}
#civMdt.phone.pad .tablet .cam{top:-12px;width:6px;height:6px;aspect-ratio:auto;margin-left:-3px;border-radius:50%;background:radial-gradient(circle at 35% 35%,#2B3A55,#0B1220 60%,#05080F);box-shadow:0 0 0 1px rgba(255,255,255,.06)}
#civMdt.phone.pad .tablet .cam::after{display:none}
#civMdt.phone.pad .sbar{padding:9px 26px 4px;min-height:32px;height:auto;margin-bottom:0;font-size:13.5px}#civMdt.phone.pad #cvClock{width:auto;text-align:left;font-size:inherit}#civMdt.phone.pad .sb-ic{width:auto;gap:5px}#civMdt.phone.pad .sb-ic svg,#civMdt.phone.pad .sb-ic svg:last-child{height:auto}#civMdt.phone.pad .sb-ic{gap:5px}
#civMdt.phone.pad .tside{padding:22px max(56px,8%) 0}
#civMdt.phone.pad .ph-wid{grid-template-columns:repeat(3,minmax(0,1fr));gap:18px 24px;max-width:860px;width:100%;align-self:center;margin:4px 0 0}
#civMdt.phone.pad .ph-wx b{font-size:32px}#civMdt.phone.pad .ph-w>div{aspect-ratio:1.75/1;border-radius:24px;padding:15px 18px}
#civMdt.phone.pad .ph-wid>.ph-w:nth-child(3){grid-column:auto;flex-direction:column;justify-content:normal;gap:6px}#civMdt.phone.pad .ph-wid>.ph-w:nth-child(3)>span{display:block}
#civMdt.phone.pad .ph-wid>.ph-w:nth-child(3)>div{aspect-ratio:2.1/1;height:auto;flex-direction:column;align-items:stretch;gap:0;padding:15px 18px;border-radius:24px}
#civMdt.phone.pad .ph-wid>.ph-w:nth-child(3)>div b{font-size:44px;margin:2px 0 0;order:0}#civMdt.phone.pad .ph-wid>.ph-w:nth-child(3)>div>:last-child{margin-left:0;margin-top:auto!important}
#civMdt.phone.pad .ph-wid>.ph-w:nth-child(3) .ph-wx svg{display:inline}#civMdt.phone.pad .ph-wid>.ph-w:nth-child(3) .ph-wx b{font-size:40px}
#civMdt.phone.pad .ph-apps{grid-template-columns:repeat(auto-fill,minmax(104px,1fr));gap:26px 8px;margin-top:28px;max-width:960px;width:100%;align-self:center}
#civMdt.phone.pad .tside button[data-p] svg{width:68px;height:68px;padding:17px}#civMdt.phone.pad .tside button[data-p] svg.ai{padding:0}#civMdt.phone.pad .tside button[data-p]{font-size:12.5px}
#civMdt.phone.pad .tside button[data-p] .badge{left:calc(50% + 21px)}
#civMdt.phone.pad .ph-ghost svg{width:68px;height:68px;padding:17px}
#civMdt.phone.pad .ph-spot{padding:46px max(56px,8%) 24px}#civMdt.phone.pad .ph-spot-top,#civMdt.phone.pad .ph-spot-res{width:100%;max-width:680px;align-self:center}
#civMdt.phone.pad .ph-spot-grid{grid-template-columns:repeat(auto-fill,minmax(96px,1fr))}
#civMdt.phone.pad .ph-dock{align-self:center;display:flex;gap:20px;margin:0 0 24px;padding:12px 18px;border-radius:30px;bottom:24px}
#civMdt.phone.pad .ph-bar::before{width:160px}#civMdt.phone.pad .ph-bar:hover::before{width:170px}
#civMdt.phone.pad .ph-back{margin-left:22px}
#civMdt.phone.pad .tscreen{padding-left:max(28px,4%);padding-right:max(28px,4%)}
#civMdt.phone.pad .cv-form .grid2{grid-template-columns:repeat(3,minmax(0,1fr))}#civMdt.phone.pad .cv-form .grid3{grid-template-columns:repeat(3,minmax(0,1fr))}
#civMdt.phone.pad .cv-car .cv-pills{order:0;flex-basis:auto}
#civMdt.phone.pad .ps{max-width:680px;margin:0 auto;padding:4px 0 28px}#civMdt.phone.pad .ps-walls{grid-template-columns:repeat(6,1fr)}}
#civMdt.phone .ps-chk{width:20px;height:20px;flex:none;color:#0A84FF;visibility:hidden}#civMdt.phone .ps-r[aria-pressed="true"] .ps-chk{visibility:visible}
#civMdt.phone button.ps-r{width:100%;background:none;border-left:0;border-right:0;border-bottom:0;font:inherit;font-size:15px;color:#fff;text-align:left;cursor:pointer}
#civMdt.phone .ps-r .ps-sw{flex:none}#civMdt.phone .ps-walls{row-gap:30px}#civMdt.phone button.ps-r:first-child{border-top:0}`;
  document.head.appendChild(css);
  page.classList.add('phone', 'home');
  const screen = page.querySelector('.screen'), screens = page.querySelector('.tscreens'), sbar = page.querySelector('.sbar');
  const applyWall = () => { for (const k of Object.keys(WALLS)) page.classList.toggle('wall-' + k, k === prefs.wall); page.style.setProperty('--wall', WALLS[prefs.wall][1]); };
  const applyDevice = () => { page.classList.toggle('pad', prefs.device === 'tablet'); dispatchEvent(new CustomEvent('ovphonedevice', { detail: { device: prefs.device } })); queueLayout(); };
  applyWall(); applyDevice();

  // status bar: signal, Wi-Fi and battery on the right, like the real thing
  const ic = document.createElement('span'); ic.className = 'sb-ic'; ic.setAttribute('aria-hidden', 'true');
  const SIG = '<svg width="17" height="12" viewBox="0 0 17 12" fill="#fff"><rect x="0" y="7.6" width="3.1" height="4.4" rx="1.2"/><rect x="4.6" y="5.3" width="3.1" height="6.7" rx="1.2"/><rect x="9.2" y="2.8" width="3.1" height="9.2" rx="1.2"/><rect x="13.8" y="0" width="3.1" height="12" rx="1.2"/></svg>';
  const WIFI = on => `<svg width="16" height="12" viewBox="0 0 16 12"${on ? '' : ' class="off"'}><g fill="none" stroke="#fff" stroke-width="2.1" stroke-linecap="round"><path d="M1.2 4.4a9.6 9.6 0 0 1 13.6 0"/><path d="M3.8 7a5.9 5.9 0 0 1 8.4 0"/></g><path d="M8 11.4 5.3 8.7a3.8 3.8 0 0 1 5.4 0Z" fill="#fff" stroke="#fff" stroke-width=".9" stroke-linejoin="round"/></svg>`;
  // the battery: this device's own charge when the browser tells it (green while charging, red when low), full otherwise
  const BAT = (lvl = 1, chg = false, low = false) => { const w = Math.max(1.5, 19.6 * lvl), c = low ? '#FFD60A' : chg ? '#34C759' : lvl <= .2 ? '#FF3B30' : '#fff';   // yellow in Low Power Mode
    return `<svg width="27" height="13" viewBox="0 0 27 13" fill="none"><rect x=".5" y=".5" width="23.5" height="12" rx="3.8" stroke="rgba(255,255,255,.4)"/><rect x="2.2" y="2.2" width="${w.toFixed(1)}" height="8.6" rx="2.2" fill="${c}"/>`
      + `<path d="M25.6 4.6v3.8c.8-.3 1.3-1.1 1.3-1.9s-.5-1.6-1.3-1.9Z" fill="rgba(255,255,255,.45)"/>${chg ? '<path d="m13.4 2.4-4 4.9h2.7l-1 3.4 4-4.9h-2.7Z" fill="#fff" stroke="#000" stroke-width=".6" stroke-linejoin="round"/>' : ''}</svg>`; };
  const MOON = '<svg width="12" height="12" viewBox="0 0 24 24" fill="#fff"><path d="M20.5 14.6A8.6 8.6 0 0 1 9.4 3.5a8.6 8.6 0 1 0 11.1 11.1Z"/></svg>';
  const ROT = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2" stroke-linecap="round"><path d="M19.5 9.5A8 8 0 1 0 20 13"/><path d="m20.5 5.5-.8 4.3-4.2-1"/><rect x="9" y="11" width="6" height="5" rx="1" fill="#fff" stroke="none"/><path d="M10 11V9.5a2 2 0 0 1 4 0V11"/></svg>';
  const PLANE = '<svg width="15" height="13" viewBox="0 0 24 24" fill="#fff"><path d="M21 15.5v-2l-8-5V3a1.5 1.5 0 0 0-3 0v5.5l-8 5v2l8-2.5V19l-2 1.5V22l3.5-1 3.5 1v-1.5L13 19v-5.5Z"/></svg>';
  let bat = [1, false]; const C = () => prefs.cc || (prefs.cc = {});
  const drawIc = () => { const c = C(); ic.innerHTML = (c.focus ? MOON : '') + (c.rot ? ROT : '') + (c.air ? PLANE : c.cell === false ? '' : SIG) + (c.wifi === false || (c.air && c.wifi !== true) ? '' : WIFI(navigator.onLine !== false)) + BAT(bat[0], bat[1], !!c.low); };
  drawIc(); addEventListener('online', drawIc); addEventListener('offline', drawIc);
  navigator.getBattery?.().then(B => { const up = () => { bat = [B.level, B.charging]; drawIc(); }; up(); B.addEventListener('levelchange', up); B.addEventListener('chargingchange', up); }).catch(() => {});
  // the status bar follows the screen's width (--sw)
  new ResizeObserver(() => { const w = page.querySelector('.screen').clientWidth; if (w) page.style.setProperty('--sw', w + 'px'); }).observe(page.querySelector('.screen'));
  sbar.appendChild(ic);

  // home screen: widgets and apps on pages, the dots, the dock
  const wid = document.createElement('div'); wid.className = 'ph-wid';
  const pager = document.createElement('div'); pager.className = 'ph-pages';
  const dots = document.createElement('div'); dots.className = 'ph-dots'; dots.setAttribute('role', 'tablist'); dots.setAttribute('aria-label', 'Home screen pages');
  const dock = document.createElement('div'); dock.className = 'ph-dock';
  const DOCK = ['msgs', 'home', 'maps', 'bills'];
  tabs.prepend(pager); pager.after(dots); dots.after(dock);
  const btns = () => [...tabs.querySelectorAll('button[data-p]')];
  const btn = id => tabs.querySelector(`button[data-p="${CSS.escape(id)}"]`);
  const shown = b => !!b && !b.hidden && getComputedStyle(b).display !== 'none';
  const appName = b => [...b.childNodes].filter(n => n.nodeType === 3).map(n => n.textContent).join('').trim();
  // The layout: the apps in order (the pages are that list cut to fit each page) and the dock. Until something is moved, an app
  // takes its usual place: the dock if it starts there, else after the others.
  const lay = prefs.layout ? { order: [...prefs.layout.order], dock: [...prefs.layout.dock], gone: [...(prefs.layout.gone || [])] } : { order: [], dock: [], gone: [] };   // gone: taken off the Home Screen (search still finds them)
  const dockMax = () => page.classList.contains('pad') && innerWidth > 760 ? 6 : 4;
  const learn = (before = {}) => { for (const b of btns()) { const id = b.dataset.p; if (lay.order.includes(id) || lay.dock.includes(id)) continue;
    if (!prefs.layout && DOCK.includes(id)) { lay.dock.push(id); lay.dock.sort((x, y) => DOCK.indexOf(x) - DOCK.indexOf(y)); continue; }
    const at = before[id] ? lay.order.indexOf(before[id]) : -1; at >= 0 ? lay.order.splice(at, 0, id) : lay.order.push(id); } };
  const keep = () => { prefs.layout = lay; save(); };
  let cur = 0, pagesN = 1, plan = '';
  const newPage = () => { const pg = document.createElement('div'); pg.className = 'ph-page'; const g = document.createElement('div'); g.className = 'ph-apps'; pg.appendChild(g); pager.appendChild(pg); return pg; };
  // how many apps fit on the first page (under the widgets) and on the others
  const measure = () => { const pg = pager.firstElementChild, g = pg.querySelector('.ph-apps'), H = pg.clientHeight, cs = getComputedStyle(g);
    const b = [...g.children].find(shown) || [...dock.children].find(shown), gap = parseFloat(cs.rowGap) || 0, rowH = (b?.offsetHeight || 0) + gap;
    const cols = cs.gridTemplateColumns.split(' ').filter(Boolean).length || 4;
    if (!H || rowH < 30) return { first: Infinity, rest: Infinity };
    const top = g.getBoundingClientRect().top - pg.getBoundingClientRect().top, mt = parseFloat(cs.marginTop) || 0;
    const rows = avail => Math.max(0, Math.floor((avail + gap + 0.5) / rowH));
    return { first: rows(H - top) * cols, rest: Math.max(1, rows(H - mt)) * cols }; };
  const layout = () => {
    learn();
    const here = new Set(btns().map(b => b.dataset.p)), max = dockMax();
    const inDock = lay.dock.filter(id => here.has(id)), dockIds = inDock.slice(0, max);
    // a dock too full for this device (a tablet layout on a phone) puts the rest first on the home screen
    const list = [...inDock.slice(max), ...lay.order.filter(id => here.has(id) && !dockIds.includes(id))];
    const fit = measure(), pages = [[]];
    let n = 0, cap = fit.first;
    for (const id of list) { if (shown(btn(id))) { if (n >= cap) { pages.push([]); cap = fit.rest; n = 0; } n++; } pages[pages.length - 1].push(id); }
    const sig = JSON.stringify([pages, dockIds]); if (sig === plan && pager.children.length === pages.length) return; plan = sig;
    while (pager.children.length < pages.length) newPage();
    pages.forEach((ids, i) => { const g = pager.children[i].querySelector('.ph-apps'); ids.forEach((id, k) => { const b = btn(id); if (g.children[k] !== b) g.insertBefore(b, g.children[k] || null); }); });
    dockIds.forEach((id, k) => { const b = btn(id); if (dock.children[k] !== b) dock.insertBefore(b, dock.children[k] || null); });
    while (pager.children.length > pages.length) pager.lastElementChild.remove();
    pagesN = pages.length; cur = Math.min(cur, pagesN - 1); drawDots(); pager.scrollLeft = cur * pager.clientWidth; };
  const drawDots = () => { dots.innerHTML = pagesN > 1 ? Array.from({ length: pagesN }, (_, i) => `<button type="button" role="tab" aria-label="Page ${i + 1} of ${pagesN}" aria-selected="${i === cur}"></button>`).join('') : ''; };
  const markDots = () => [...dots.children].forEach((d, i) => d.setAttribute('aria-selected', i === cur));
  const still = matchMedia('(prefers-reduced-motion: reduce)');
  const go = (i, smooth = true) => { cur = Math.max(0, Math.min(pagesN - 1, i)); pager.scrollTo({ left: cur * pager.clientWidth, behavior: smooth && !still.matches ? 'smooth' : 'auto' }); markDots(); };
  let swiping = false;
  pager.addEventListener('scroll', () => { const i = Math.round(pager.scrollLeft / (pager.clientWidth || 1)); if (i !== cur && !swiping) { cur = i; markDots(); } }, { passive: true });
  dots.addEventListener('click', e => { const d = e.target.closest('button'); if (d) go([...dots.children].indexOf(d)); });
  newPage().prepend(wid); learn();   // the apps already here, in the order they come
  layoutFn = layout; new ResizeObserver(queueLayout).observe(pager);
  // an app shown or hidden later (the Server app once the page knows you run it, a feature switched off) changes what fits
  new MutationObserver(queueLayout).observe(tabs, { attributes: true, attributeFilter: ['hidden', 'style'], subtree: true });
  new MutationObserver(queueLayout).observe(document.body, { attributes: true, attributeFilter: ['class'] });

  // ── app icons: each app drawn as a real icon (its own background, solid shaded artwork), in place of the line glyph ──
  // ai(): the shared parts: the background gradient, a white-to-silver fill ({W}), a soft drop shadow ({S}), a gold fill ({G}) and a light rim
  const ai = (id, top, bot, body) => { const k = 'ai-' + id;
    return `<svg class="ai" viewBox="0 0 60 60" width="60" height="60" aria-hidden="true"><defs><linearGradient id="${k}-b" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${top}"/><stop offset="1" stop-color="${bot}"/></linearGradient>`
      + `<linearGradient id="${k}-w" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff"/><stop offset="1" stop-color="#E3E7EE"/></linearGradient><linearGradient id="${k}-g" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#FFE7A0"/><stop offset="1" stop-color="#E2A42A"/></linearGradient>`
      + `<linearGradient id="${k}-r" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff" stop-opacity=".35"/><stop offset=".45" stop-color="#fff" stop-opacity="0"/></linearGradient>`
      + `<filter id="${k}-s" x="-30%" y="-30%" width="160%" height="160%"><feDropShadow dx="0" dy="1.4" stdDeviation="1.3" flood-color="#000" flood-opacity=".26"/></filter></defs>`
      + `<rect width="60" height="60" rx="13.5" fill="url(#${k}-b)"/>${body.replace(/\{W\}/g, `url(#${k}-w)`).replace(/\{G\}/g, `url(#${k}-g)`).replace(/\{S\}/g, `filter="url(#${k}-s)"`)}`
      + `<rect x=".5" y=".5" width="59" height="59" rx="13" fill="none" stroke="url(#${k}-r)"/></svg>`; };
  // a gear's outline: n teeth between radius r1 (root) and r2 (tip)
  const gear = (cx, cy, r1, r2, n) => { let d = ''; for (let i = 0; i < n; i++) { const a = i / n * Math.PI * 2, w = Math.PI / n;
      for (const [r, t] of [[r1, a - w * .62], [r2, a - w * .36], [r2, a + w * .36], [r1, a + w * .62]]) d += (d ? 'L' : 'M') + (cx + r * Math.cos(t)).toFixed(2) + ' ' + (cy + r * Math.sin(t)).toFixed(2); }
    return d + 'Z'; };
  const ART = {
    msgs: ai('msgs', '#6CF286', '#0DBE2D', '<path {S} fill="{W}" d="M30 13c-10.5 0-19 6.9-19 15.5 0 4.8 2.7 9.1 6.9 11.9-.4 2.6-1.7 5-3.6 6.9 3.6-.2 7-1.6 9.6-3.9 1.9.4 4 .6 6.1.6 10.5 0 19-6.9 19-15.5S40.5 13 30 13Z"/>'),
    home: ai('home', '#2C2C30', '#050506', '<g {S}><rect x="11" y="12" width="38" height="15" rx="3.5" fill="#3D9BFF"/><rect x="11" y="17" width="38" height="15" rx="3.5" fill="#34C759"/><rect x="11" y="22" width="38" height="15" rx="3.5" fill="#FFB320"/>'
      + '<rect x="11" y="27" width="38" height="15" rx="3.5" fill="#FF5A4E"/><path fill="{W}" d="M9 32h12.6c1.2 0 2.2.8 2.6 1.9a6.2 6.2 0 0 0 11.6 0c.4-1.1 1.4-1.9 2.6-1.9H51v12a4 4 0 0 1-4 4H13a4 4 0 0 1-4-4Z"/></g>'),
    bills: ai('bills', '#FFC24D', '#FF7A00', '<path {S} fill="{W}" d="M17 11h26a2 2 0 0 1 2 2v34l-3-2.5-3 2.5-3-2.5-3 2.5-3-2.5-3 2.5-3-2.5-3 2.5-3-2.5-3 2.5V13a2 2 0 0 1 2-2Z"/>'
      + '<rect x="20" y="16" width="13" height="3.2" rx="1.6" fill="#FF8A00"/><g fill="#CDD2DA"><rect x="20" y="23" width="12" height="2.4" rx="1.2"/><rect x="20" y="28" width="10" height="2.4" rx="1.2"/><rect x="20" y="33" width="12" height="2.4" rx="1.2"/></g>'
      + '<g fill="#8E949E"><rect x="35" y="23" width="5" height="2.4" rx="1.2"/><rect x="35" y="28" width="5" height="2.4" rx="1.2"/><rect x="35" y="33" width="5" height="2.4" rx="1.2"/></g><rect x="20" y="38.5" width="20" height="2.6" rx="1.3" fill="#2B2F36"/>'),
    cars: ai('cars', '#4AAEFF', '#0A60EE', '<g {S}><rect x="15" y="41" width="6.5" height="6" rx="1.8" fill="#1B2330"/><rect x="38.5" y="41" width="6.5" height="6" rx="1.8" fill="#1B2330"/>'
      + '<path fill="{W}" d="M18.3 30.5l3.2-8.6a3 3 0 0 1 2.8-1.9h11.4a3 3 0 0 1 2.8 1.9l3.2 8.6Z"/><path fill="{W}" d="M13 34.5a4.5 4.5 0 0 1 4.5-4.5h25a4.5 4.5 0 0 1 4.5 4.5V42a2 2 0 0 1-2 2H15a2 2 0 0 1-2-2Z"/></g>'
      + '<path fill="#6FB9FF" d="M21.4 29.5l2.4-6.3a1.5 1.5 0 0 1 1.4-1h9.6a1.5 1.5 0 0 1 1.4 1l2.4 6.3Z"/><circle cx="19.5" cy="36" r="2.7" fill="#FFD43B"/><circle cx="40.5" cy="36" r="2.7" fill="#FFD43B"/><rect x="25" y="35" width="10" height="3" rx="1.5" fill="#B5C0D0"/>'),
    home2: ai('home2', '#FFE36B', '#F4A300', '<g {S}><rect x="37" y="14" width="4.6" height="10" rx="1" fill="#B83A28"/><path fill="{W}" d="M15 31 30 18.5 45 31v15a2.5 2.5 0 0 1-2.5 2.5h-25A2.5 2.5 0 0 1 15 46Z"/>'
      + '<path fill="#E8513A" d="M30 11.5 8.8 29.3a1.6 1.6 0 0 0 2 2.5L30 15.6l19.2 16.2a1.6 1.6 0 0 0 2-2.5Z"/></g><rect x="25.5" y="35" width="9" height="13.5" rx="1.6" fill="#9A6234"/><circle cx="32.4" cy="42" r=".9" fill="#FFD27A"/>'
      + '<rect x="18" y="32" width="5.5" height="5.5" rx="1" fill="#74BFFF"/><rect x="36.5" y="32" width="5.5" height="5.5" rx="1" fill="#74BFFF"/>'),
    shops: ai('shops', '#FF80B2', '#E62468', '<path d="M23.5 26v-7a6.5 6.5 0 0 1 13 0v7" fill="none" stroke="#fff" stroke-width="3" stroke-linecap="round"/><path {S} fill="{W}" d="M15.5 22h29l-1.7 23.4a3 3 0 0 1-3 2.8H20.2a3 3 0 0 1-3-2.8Z"/>'
      + '<path d="M23.5 23v4M36.5 23v4" stroke="#fff" stroke-width="3" stroke-linecap="round"/><circle cx="23.5" cy="27" r="1.8" fill="#C81E5C"/><circle cx="36.5" cy="27" r="1.8" fill="#C81E5C"/>'
      + '<path fill="#FF4B8B" d="M30 43s-6.4-3.9-6.4-8a3.5 3.5 0 0 1 6.4-2 3.5 3.5 0 0 1 6.4 2c0 4.1-6.4 8-6.4 8Z"/>'),
    jobs: ai('jobs', '#B596FF', '#5A36E6', '<path d="M24 21v-3.5a3 3 0 0 1 3-3h6a3 3 0 0 1 3 3V21" fill="none" stroke="#fff" stroke-width="3.2"/><rect {S} x="10.5" y="20" width="39" height="27" rx="5" fill="{W}"/>'
      + '<path d="M10.5 32.5h39" stroke="#CFC6EE" stroke-width="2"/><rect x="25.5" y="29" width="9" height="7" rx="1.8" fill="#7552FF"/><rect x="28.3" y="31.2" width="3.4" height="2.6" rx=".8" fill="#C9BCFF"/>'),
    biz: ai('biz', '#48E1E4', '#0A92A6', '<g {S}><rect x="13.5" y="26" width="33" height="21.5" rx="1.8" fill="{W}"/><rect x="11" y="15" width="38" height="9" rx="2.2" fill="#FF5A4E"/>'
      + '<g fill="#fff"><rect x="17.3" y="15" width="6.3" height="9"/><rect x="29.9" y="15" width="6.3" height="9"/><rect x="42.5" y="15" width="4" height="9"/></g>'
      + '<g fill="#FF5A4E"><circle cx="14.2" cy="24" r="3.2"/><circle cx="26.8" cy="24" r="3.2"/><circle cx="39.4" cy="24" r="3.2"/></g><g fill="#fff"><circle cx="20.5" cy="24" r="3.2"/><circle cx="33.1" cy="24" r="3.2"/><circle cx="45.7" cy="24" r="3.2"/></g></g>'
      + '<rect x="17.5" y="32" width="12" height="8.5" rx="1.2" fill="#8FE3EE"/><rect x="33.5" y="32" width="9" height="15.5" rx="1.2" fill="#0B8FA2"/><circle cx="40.5" cy="40" r=".9" fill="#BFF4FA"/>'),
    id: ai('id', '#7487A3', '#3B475B', '<g {S}><rect x="8.5" y="15" width="43" height="30" rx="4.2" fill="{W}"/></g><path fill="#2F7BEA" d="M12.7 15h34.6a4.2 4.2 0 0 1 4.2 4.2V23h-43v-3.8a4.2 4.2 0 0 1 4.2-4.2Z"/>'
      + '<rect x="12.5" y="18" width="12" height="2" rx="1" fill="#BFD7FF"/><rect x="12.5" y="26.5" width="11.5" height="14" rx="2" fill="#CCD5E3"/><circle cx="18.25" cy="31.4" r="2.9" fill="#71809A"/><path fill="#71809A" d="M13.6 40.5c.5-3 2.3-4.6 4.65-4.6s4.15 1.6 4.65 4.6Z"/>'
      + '<rect x="27.5" y="27.5" width="19" height="2.6" rx="1.3" fill="#2B3445"/><rect x="27.5" y="32.5" width="15" height="2.2" rx="1.1" fill="#B4BDCB"/><rect x="27.5" y="36.8" width="17" height="2.2" rx="1.1" fill="#B4BDCB"/>'),
    record: ai('record', '#FF6D61', '#D22219', '<rect {S} x="15.5" y="14" width="29" height="35" rx="3.2" fill="{W}"/><rect x="23" y="10.5" width="14" height="7.5" rx="2.6" fill="#9BA4B4"/><rect x="27" y="12.4" width="6" height="2" rx="1" fill="#5E6676"/>'
      + '<g fill="#CDD2DA"><rect x="20.5" y="23" width="19" height="2.4" rx="1.2"/><rect x="20.5" y="28" width="14" height="2.4" rx="1.2"/><rect x="20.5" y="33" width="16" height="2.4" rx="1.2"/></g>'
      + '<circle cx="36" cy="41.5" r="5.6" fill="none" stroke="#E0241A" stroke-width="2"/><path d="M33.5 41.6l1.7 1.7 3.4-3.6" fill="none" stroke="#E0241A" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>'),
    transit: ai('transit', '#FFD35E', '#EE8600', '<g {S}><rect x="18" y="42" width="6" height="6" rx="1.6" fill="#1B2330"/><rect x="36" y="42" width="6" height="6" rx="1.6" fill="#1B2330"/><rect x="11.5" y="19" width="3" height="7" rx="1.2" fill="{W}"/><rect x="45.5" y="19" width="3" height="7" rx="1.2" fill="{W}"/>'
      + '<rect x="15" y="10.5" width="30" height="35" rx="6" fill="{W}"/></g><rect x="20.5" y="13.2" width="19" height="3" rx="1.5" fill="#1D2531"/><rect x="22" y="13.9" width="9" height="1.6" rx=".8" fill="#FFB020"/>'
      + '<rect x="18.5" y="19" width="23" height="13.5" rx="2.2" fill="#4A90F0"/><path d="M18.5 27 41.5 21v-.4a1.6 1.6 0 0 0-1.6-1.6H30Z" fill="#fff" opacity=".18"/><circle cx="21.5" cy="38.5" r="2.4" fill="#FFD43B"/><circle cx="38.5" cy="38.5" r="2.4" fill="#FFD43B"/><rect x="26" y="37.5" width="8" height="2.2" rx="1.1" fill="#BBC4D2"/>'),
    buses: ai('buses', '#68DD96', '#13914C', '<path {S} fill="{W}" d="M30 9.5c-8.6 0-15.5 6.7-15.5 15.1C14.5 35.8 30 50.5 30 50.5s15.5-14.7 15.5-25.9C45.5 16.2 38.6 9.5 30 9.5Z"/><circle cx="30" cy="24.5" r="9.6" fill="#17A055"/>'
      + '<rect x="24.6" y="18.4" width="10.8" height="11.4" rx="2.2" fill="#fff"/><rect x="26" y="20" width="8" height="4.4" rx=".9" fill="#17A055"/><circle cx="27.1" cy="27.4" r="1" fill="#17A055"/><circle cx="32.9" cy="27.4" r="1" fill="#17A055"/>'),
    boats: ai('boats', '#52C9FA', '#0C5FC0', '<g {S}><rect x="29.2" y="10.5" width="1.8" height="27" rx=".9" fill="#E9EDF3"/><path fill="{W}" d="M28 13.5 15.5 35.5H28Z"/><path fill="#FFD84D" d="M32.5 17v18.5h11.5Z"/>'
      + '<path fill="#E8513A" d="M11.5 37.5h37l-4.6 7.2a3 3 0 0 1-2.5 1.4H18.6a3 3 0 0 1-2.5-1.4Z"/></g><path d="M6 51c3 0 3-2.2 6-2.2s3 2.2 6 2.2 3-2.2 6-2.2 3 2.2 6 2.2 3-2.2 6-2.2 3 2.2 6 2.2 3-2.2 6-2.2 3 2.2 6 2.2" fill="none" stroke="#fff" stroke-opacity=".75" stroke-width="2.2" stroke-linecap="round"/>'),
    server: ai('server', '#7280FF', '#3131C4', '<g {S} fill="{W}"><rect x="13.5" y="12.5" width="33" height="10" rx="2.8"/><rect x="13.5" y="25" width="33" height="10" rx="2.8"/><rect x="13.5" y="37.5" width="33" height="10" rx="2.8"/></g>'
      + '<circle cx="19.5" cy="17.5" r="1.8" fill="#34C759"/><circle cx="19.5" cy="30" r="1.8" fill="#34C759"/><circle cx="19.5" cy="42.5" r="1.8" fill="#FFB320"/><g fill="#C7CCF4"><rect x="31" y="16.3" width="11" height="2.4" rx="1.2"/><rect x="31" y="28.8" width="11" height="2.4" rx="1.2"/><rect x="31" y="41.3" width="11" height="2.4" rx="1.2"/></g>'),
    phset: ai('phset', '#B9BEC6', '#6A6F78', `<path {S} fill="{W}" d="${gear(30, 30, 15.2, 18.4, 14)}"/><circle cx="30" cy="30" r="10.6" fill="#4C5159"/><path fill="#C9CDD4" d="${gear(30, 30, 6.2, 8, 8)}"/>`
      + '<g stroke="#C9CDD4" stroke-width="1.6"><path d="M30 20.2v5M30 34.8v5M20.2 30h5M34.8 30h5M23.1 23.1l3.5 3.5M33.4 33.4l3.5 3.5M36.9 23.1l-3.5 3.5M26.6 33.4l-3.5 3.5"/></g><circle cx="30" cy="30" r="2.8" fill="#4C5159"/>'),
    news: ai('news', '#FF6182', '#DE1C49', '<rect {S} x="11.5" y="13.5" width="37" height="33" rx="3.2" fill="{W}"/><rect x="15.5" y="17.5" width="29" height="4.4" rx="1.2" fill="#1F2229"/><rect x="15.5" y="25" width="12.5" height="10.5" rx="1.6" fill="#FF4A6E"/>'
      + '<g fill="#C8CDD5"><rect x="31" y="25" width="13.5" height="2.2" rx="1.1"/><rect x="31" y="29.2" width="13.5" height="2.2" rx="1.1"/><rect x="31" y="33.3" width="9.5" height="2.2" rx="1.1"/><rect x="15.5" y="38.5" width="29" height="2.2" rx="1.1"/><rect x="15.5" y="42.3" width="20" height="2.2" rx="1.1"/></g>'),
    court: ai('court', '#3D4E73', '#18213A', '<g {S} fill="{G}"><circle cx="30" cy="13.2" r="2.6"/><rect x="28.7" y="14" width="2.6" height="29.5" rx="1"/><rect x="21" y="43" width="18" height="3.6" rx="1.8"/><rect x="13" y="17.4" width="34" height="2.6" rx="1.3"/>'
      + '<path d="M9.5 31.5h13a6.5 6.5 0 0 1-13 0Z"/><path d="M37.5 31.5h13a6.5 6.5 0 0 1-13 0Z"/></g><g stroke="#E8B54A" stroke-width="1.1"><path d="M16 19.5 11 31.5M16 19.5l5 12M44 19.5l-5 12M44 19.5l5 12"/></g>'),
    maps: ai('maps', '#D9F3CF', '#B2E1A6', '<path fill="#78C6F6" d="M36 0h24v25c-5.6 1.6-11.2-.6-14.2-5.4C42.8 14.8 40 7 36 0Z"/><path fill="#9AD68C" d="M0 40c6-1.5 10.5 1.5 12.5 6S15 56 13 60H0Z"/>'
      + '<path d="M-2 41 62 17" stroke="#fff" stroke-width="6"/><path d="M19 -2 31 62" stroke="#fff" stroke-width="5"/><path d="M-2 53c16-6 33-5 64-18" stroke="#F2B21B" stroke-width="6.5" fill="none"/><path d="M-2 53c16-6 33-5 64-18" stroke="#FFD24A" stroke-width="4" fill="none"/>'
      + '<path {S} fill="#FF3B30" d="M27 13.5c-5.2 0-9.4 4-9.4 9.1 0 6.6 9.4 15.6 9.4 15.6s9.4-9 9.4-15.6c0-5.1-4.2-9.1-9.4-9.1Z"/><circle cx="27" cy="22.6" r="3.6" fill="#fff"/>'),
  };

  // an app with its own icon art gets it in place of the line glyph
  const paint = b => { const art = ART[b.dataset.p], g = b.querySelector('svg'); if (art && g && !g.classList.contains('ai')) g.outerHTML = art;
    if (!b.querySelector('.ph-rm')) b.insertAdjacentHTML('beforeend', '<span class="ph-rm" title="Remove from Home Screen"></span>'); };
  tabs.querySelectorAll('button[data-p]').forEach(paint);

  // adding an app: an icon on the home screen and its own screen, which `render` fills the first time it opens
  const added = new Map();
  const addApp = ({ id, name, icon, color, render, onOpen, before }) => {
    const b = document.createElement('button'); b.type = 'button'; b.setAttribute('role', 'tab'); b.dataset.p = id; b.setAttribute('aria-selected', 'false');
    b.style.setProperty('--app', color); b.innerHTML = `${icon}${esc(name)}<i class="badge" id="phBadge-${id}" hidden>0</i>`; paint(b);
    // straight onto a page, so it never sits under the dock taking room while the pages are measured
    pager.lastElementChild.querySelector('.ph-apps').appendChild(b); learn(before ? { [id]: before } : {}); layout();
    const sec = document.createElement('section'); sec.className = 'tscreen cv-pane'; sec.dataset.p = id; screens.appendChild(sec);
    added.set(id, { render, onOpen, sec, done: false }); return { button: b, section: sec, badge: n => { const el = $('phBadge-' + id); el.textContent = n; el.hidden = !n; } }; };
  const opened = id => { const a = added.get(id); if (!a) return; if (!a.done) { a.done = true; a.render?.(a.sec); } a.onOpen?.(a.sec); };

  // ── widgets ──
  const WX = { sun: '<svg width="22" height="22" viewBox="0 0 24 24" fill="#FFD60A"><circle cx="12" cy="12" r="5"/><g stroke="#FFD60A" stroke-width="2" stroke-linecap="round"><path d="M12 1.5v2.5M12 20v2.5M1.5 12H4M20 12h2.5M4.6 4.6l1.8 1.8M17.6 17.6l1.8 1.8M4.6 19.4l1.8-1.8M17.6 6.4l1.8-1.8"/></g></svg>',
    moon: '<svg width="22" height="22" viewBox="0 0 24 24" fill="#fff"><path d="M20 14.5A8.5 8.5 0 0 1 9.5 4a8.5 8.5 0 1 0 10.5 10.5Z"/></svg>',
    cloud: '<svg width="24" height="22" viewBox="0 0 24 24" fill="#fff"><path d="M7 19h10a4.5 4.5 0 0 0 .6-9A6 6 0 0 0 6.1 11 4 4 0 0 0 7 19Z"/></svg>',
    rain: '<svg width="24" height="22" viewBox="0 0 24 24" fill="#fff"><path d="M7 15h10a4.5 4.5 0 0 0 .6-9A6 6 0 0 0 6.1 7 4 4 0 0 0 7 15Z"/><g stroke="#8FD3FF" stroke-width="2" stroke-linecap="round"><path d="m8 18-1 3M12 18l-1 3M16 18l-1 3"/></g></svg>',
    snow: '<svg width="24" height="22" viewBox="0 0 24 24" fill="#fff"><path d="M7 15h10a4.5 4.5 0 0 0 .6-9A6 6 0 0 0 6.1 7 4 4 0 0 0 7 15Z"/><g fill="#fff"><circle cx="8" cy="19" r="1.3"/><circle cx="12" cy="21" r="1.3"/><circle cx="16" cy="19" r="1.3"/></g></svg>',
    storm: '<svg width="24" height="22" viewBox="0 0 24 24" fill="#fff"><path d="M7 14h10a4.5 4.5 0 0 0 .6-9A6 6 0 0 0 6.1 6 4 4 0 0 0 7 14Z"/><path d="m12 13-3 5h3l-1 4 4-6h-3l1-3Z" fill="#FFD60A"/></svg>' };
  const wxIcon = w => w.code >= 95 ? WX.storm : (w.code >= 71 && w.code <= 77) || w.code === 85 || w.code === 86 ? WX.snow : w.code >= 51 ? WX.rain : w.code >= 3 ? WX.cloud : w.day ? WX.sun : WX.moon;
  let wx = null, wxAt = 0;
  const loadWx = async (force) => { if (!API || (!force && Date.now() - wxAt < 10 * 60000)) return; wxAt = Date.now(); try { wx = await call('/weather'); } catch (e) { wx = { error: e.message }; } drawWidgets(); drawSettings(); };
  const arrow = '<svg width="11" height="11" viewBox="0 0 24 24" fill="#fff"><path d="M21 3 3 10.5l7.5 2 2 7.5Z"/></svg>';
  const drawWidgets = () => { const now = new Date(), bills = $('cvBillsN'), n = bills && !bills.hidden ? +bills.textContent || 0 : 0;
    wid.innerHTML = prefs.widgets.map(w => w === 'weather' ? `<button type="button" class="ph-w" data-open="phset"><div class="ph-wx${wx && !wx.error ? (wx.code >= 3 && wx.day ? ' grey' : wx.day ? '' : ' night') : ''}">${wx && !wx.error
        ? `<small>${esc(wx.place)} ${arrow}</small><b>${esc(wx.temp)}°</b><i>${wxIcon(wx)}<br>${esc(wx.text)}<br>H:${esc(wx.hi)}° L:${esc(wx.lo)}°</i>` : `<small>Weather</small><i>${esc(wx?.error || 'Loading…')}</i>`}</div><span>Weather</span></button>`
      : w === 'wallet' ? `<button type="button" class="ph-w" data-open="home"><div class="ph-bal"><small>Balance</small><b>${esc($('cvTopBal')?.textContent || '—')}</b><em>${esc($('cvSub')?.textContent || '')}</em></div><span>Wallet</span></button>`
      : `<button type="button" class="ph-w" data-open="bills"><div class="ph-cal"><small>${esc(now.toLocaleDateString([], { weekday: 'long' }))}</small><b>${now.getDate()}</b><em>${n ? `${n} bill${n > 1 ? 's' : ''} due` : 'No bills due'}</em></div><span>Calendar</span></button>`).join('');
    queueLayout(); };
  for (const id of ['cvTopBal', 'cvSub', 'cvBillsN']) { const el = $(id); if (el) new MutationObserver(() => drawWidgets()).observe(el, { childList: true, characterData: true, subtree: true, attributes: true }); }

  // ── Settings: wallpaper, widgets, and (for the owner) where the server is, for the weather ──
  const SW = { weather: ['Weather', '#2A84F0', WX.sun], wallet: ['Wallet', '#1FA563', '<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2"><rect x="3" y="6" width="18" height="13" rx="2"/><path d="M3 10h18"/></svg>'],
    calendar: ['Calendar', '#FF3B30', '<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2"><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18M8 3v4M16 3v4"/></svg>'] };
  let setSec = null, placeMsg = null;
  const drawSettings = () => { if (!setSec) return; const keep = document.activeElement?.id;
    setSec.innerHTML = `<div class="thead"><div><h2>Settings</h2><small>How your ${prefs.device === 'tablet' ? 'tablet' : 'phone'} looks. Kept on this device.</small></div></div><div class="ps">
      <h3>Device</h3><div class="ps-g">${[['phone', 'Phone', '#2F3136', '<svg width="15" height="17" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2"><rect x="6" y="2" width="12" height="20" rx="3"/><path d="M11 18h2"/></svg>'],
        ['tablet', 'Tablet', '#2F3136', '<svg width="18" height="16" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2"><rect x="2" y="4" width="20" height="16" rx="2.5"/><path d="M11 17h2"/></svg>']].map(([k, n, bg, svg]) =>
        `<button type="button" class="ps-r" data-dev="${k}" aria-pressed="${prefs.device === k}"><i class="ps-ic" style="background:${bg}">${svg}</i><span>${n}</span><svg class="ps-chk" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"><path d="m5 12 5 5 9-10"/></svg></button>`).join('')}</div>
      <h3>Wallpaper</h3><div class="ps-g"><div class="ps-walls">${Object.entries(WALLS).map(([k, [n, bg]]) => `<button type="button" data-wall="${k}" style="--w:${bg}" aria-pressed="${prefs.wall === k}" aria-label="${n}"><span>${n}</span></button>`).join('')}</div></div>
      <h3>Home Screen</h3><div class="ps-g"><button type="button" class="ps-r" data-relayout><i class="ps-ic" style="background:#5E5CE6"><svg width="16" height="16" viewBox="0 0 24 24" fill="#fff"><rect x="3" y="3" width="7" height="7" rx="2"/><rect x="14" y="3" width="7" height="7" rx="2"/><rect x="3" y="14" width="7" height="7" rx="2"/><rect x="14" y="14" width="7" height="7" rx="2"/></svg></i><span>Reset Home Screen Layout<small>Puts every app back where it started.</small></span></button></div>
      <p class="ps-note">Press and hold an app to move it: onto another page, or onto or off the dock. Pull down on the home screen to search.</p>
      <h3>Widgets</h3><div class="ps-g">${WIDGETS.map(w => `<label class="ps-r"><i class="ps-ic" style="background:${SW[w][1]}">${SW[w][2]}</i><span>${SW[w][0]}</span><span class="ps-sw"><input type="checkbox" data-wid="${w}"${prefs.widgets.includes(w) ? ' checked' : ''}><i></i></span></label>`).join('')}</div>
      <h3>Weather</h3><div class="ps-g"><div class="ps-r"><i class="ps-ic" style="background:#2A84F0">${WX.sun}</i><span>${wx && !wx.error ? esc(wx.full) : 'Not found yet'}<small>${wx && !wx.error ? (wx.set ? 'Where this server is' : 'Guessed from the server’s name') : esc(wx?.error || '')}</small></span></div>
        ${wx?.canSet ? `<form class="ps-in" id="psPlace"><input id="psPlaceIn" name="q" placeholder="City, like Miami or Atlanta, Georgia" maxlength="80"><button>Set</button></form>` : ''}</div>
      ${wx?.canSet ? `<p class="ps-note${placeMsg?.err ? ' err' : ''}" id="psNote">${esc(placeMsg?.t || 'You run this server, so you can set where it is. Everyone’s weather follows it.')}</p>` : ''}</div>`;
    if (keep && $(keep)) $(keep).focus(); };
  const settings = addApp({ id: 'phset', name: 'Settings', icon: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/></svg>',
    color: 'linear-gradient(180deg,#A3A8B1,#6E737C)', render: sec => { setSec = sec; drawSettings(); }, onOpen: () => loadWx(true) });
  settings.section.addEventListener('click', e => { if (e.target.closest('[data-relayout]')) { prefs.layout = null; lay.order.length = 0; lay.dock.length = 0; lay.gone.length = 0; markGone(); save(); plan = ''; layout(); return; }
    const d = e.target.closest('[data-dev]'); if (d) { prefs.device = d.dataset.dev; save(); applyDevice(); drawSettings(); fit(); return; }
    const w = e.target.closest('[data-wall]'); if (!w) return; prefs.wall = w.dataset.wall; save(); applyWall(); drawSettings(); });
  settings.section.addEventListener('change', e => { const t = e.target; if (!t.dataset.wid) return;
    prefs.widgets = WIDGETS.filter(w => w === t.dataset.wid ? t.checked : prefs.widgets.includes(w)); save(); drawWidgets(); });
  settings.section.addEventListener('submit', async e => { e.preventDefault(); const q = e.target.q.value.trim(); placeMsg = { t: 'Looking that up…' }; drawSettings();
    try { wx = await call('/weather/place', { q }); wxAt = Date.now(); placeMsg = { t: `Set. Everyone in this server now sees the weather in ${wx.full}.` }; } catch (x) { placeMsg = { t: x.message, err: true }; }
    drawSettings(); drawWidgets(); });

  // ── search, pulled down from the home screen (or / and Ctrl+K) ──
  const spot = document.createElement('div'); spot.className = 'ph-spot'; spot.hidden = true;
  spot.innerHTML = '<div class="ph-spot-top"><label class="ph-spot-in"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round"><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></svg>'
    + '<input type="search" placeholder="Search" aria-label="Search apps" autocomplete="off" enterkeyhint="go"></label><button type="button" class="ph-spot-x">Cancel</button></div><div class="ph-spot-res" aria-live="polite"></div>';
  screen.appendChild(spot);
  const sq = spot.querySelector('input'), res = spot.querySelector('.ph-spot-res');
  const hits = () => { const v = sq.value.trim().toLowerCase(), all = [...lay.dock, ...lay.order].map(btn).filter(b => shown(b) || (b && !b.hidden && b.classList.contains('ph-gone')));
    return v ? all.filter(b => appName(b).toLowerCase().includes(v)) : all.slice(0, 8); };
  const drawSpot = () => { const list = hits(), v = sq.value.trim();
    res.innerHTML = list.length ? `<h4>${v ? 'Apps' : 'Suggestions'}</h4><div class="ph-spot-grid">${list.map(b => `<button type="button" class="ph-spot-app" data-go="${esc(b.dataset.p)}" style="--app:${esc(getComputedStyle(b).getPropertyValue('--app').trim())}">${b.querySelector('svg')?.outerHTML || ''}<span>${esc(appName(b))}</span></button>`).join('')}</div>`
      : `<p class="ph-spot-none">No apps match “${esc(v)}”.</p>`; };
  const spotOpen = () => !spot.hidden && spot.classList.contains('open');
  const openSpot = () => { leaveEdit(); spot.hidden = false; spot.classList.remove('pulling'); spot.style.removeProperty('--pull'); void spot.offsetWidth; spot.classList.add('open'); drawSpot(); sq.focus(); };
  const closeSpot = () => { if (spot.hidden) return; spot.classList.remove('open', 'pulling'); sq.value = ''; sq.blur();
    setTimeout(() => { if (!spot.classList.contains('open') && !spot.classList.contains('pulling')) spot.hidden = true; }, still.matches ? 0 : 200); };
  sq.addEventListener('input', drawSpot);
  sq.addEventListener('keydown', e => { if (e.key === 'Enter') { const b = hits()[0]; if (b) { e.preventDefault(); closeSpot(); b.click(); } } });
  spot.addEventListener('click', e => { const g = e.target.closest('[data-go]'); if (g) { closeSpot(); btn(g.dataset.go)?.click(); return; }
    if (e.target.closest('.ph-spot-x') || e.target === spot || e.target === res) closeSpot(); });

  // ── moving apps: press and hold one (or anything in the edit mode it starts), drag it, let go; Done finishes ──
  const done = document.createElement('button'); done.type = 'button'; done.className = 'ph-done'; done.textContent = 'Done'; sbar.appendChild(done);
  const editing = () => page.classList.contains('ph-edit');
  const enterEdit = () => { if (!editing()) page.classList.add('ph-edit'); };
  const leaveEdit = () => { page.classList.remove('ph-edit'); };
  done.addEventListener('click', () => { leaveEdit(); tabs.focus({ preventScroll: true }); });   // Done hides itself, so the keyboard carries on from the Home Screen
  const listOf = id => lay.dock.includes(id) ? lay.dock : lay.order;
  const dockCount = () => lay.dock.filter(id => shown(btn(id))).length;
  const changed = before => { if (JSON.stringify(lay) === before) return false; prefs.layout = lay; layout(); return true; };
  // the moved app takes the place of the one it is over: after it when moving forward, before it when moving back. Onto a full dock it
  // swaps with the app it is over, which goes where the moved one was picked up from.
  const place = (id, tid, left) => { const was = JSON.stringify(lay), from = listOf(id), to = listOf(tid), at = from.indexOf(id);
    if (from === to) { const ti = to.indexOf(tid); from.splice(at, 1); const ni = to.indexOf(tid); to.splice(at <= ti ? ni + 1 : ni, 0, id); }
    else if (to === lay.dock) { from.splice(at, 1); if (dockCount() >= dockMax()) { const ti = lay.dock.indexOf(tid); lay.dock.splice(ti, 1, id); lay.order.splice(drag?.home ?? at, 0, tid); }
      else lay.dock.splice(lay.dock.indexOf(tid) + (left ? 0 : 1), 0, id); }
    else { from.splice(at, 1); const ti = lay.order.indexOf(tid); lay.order.splice(left ? ti : ti + 1, 0, id); }
    return changed(was); };
  const toDock = id => { if (lay.dock.includes(id) || dockCount() >= dockMax()) return; const was = JSON.stringify(lay); lay.order.splice(lay.order.indexOf(id), 1); lay.dock.push(id); changed(was); };
  // over the empty end of a page: the moved app goes after that page's last app
  const toPageEnd = (id, x, y) => { const g = pager.children[cur]?.querySelector('.ph-apps'); if (!g) return;
    const last = [...g.children].filter(b => shown(b) && b.dataset.p !== id).pop(); if (!last) return;
    const r = last.getBoundingClientRect(); if (!(y > r.bottom || (y > r.top && x > r.right))) return;
    const was = JSON.stringify(lay), from = listOf(id); from.splice(from.indexOf(id), 1); lay.order.splice(lay.order.indexOf(last.dataset.p) + 1, 0, id); changed(was); };
  let press = null, drag = null, mute = 0;
  const startDrag = e => { const b = press.b, icon = b.querySelector('svg'), ir = icon.getBoundingClientRect(), sr = screen.getBoundingClientRect();
    press.mode = 'drag'; enterEdit();
    const g = document.createElement('div'); g.className = 'ph-ghost'; g.style.setProperty('--app', getComputedStyle(b).getPropertyValue('--app')); g.appendChild(icon.cloneNode(true));
    // the screen may be drawn scaled; positions are worked out in its own pixels
    const k = screen.offsetWidth ? sr.width / screen.offsetWidth : 1;
    const home = lay.order.indexOf(b.dataset.p);
    drag = { id: b.dataset.p, g, ox: press.x - ir.left, oy: press.y - ir.top, sr, k, flipT: 0, flipDir: 0, home: home >= 0 ? home : undefined };
    screen.appendChild(g); b.classList.add('ph-lift'); moveDrag(e); };
  const flip = dir => { if (!drag) return; drag.flipDir = 0;
    if (cur + dir < 0) return;
    if (cur + dir >= pagesN) { const was = JSON.stringify(lay), from = listOf(drag.id); from.splice(from.indexOf(drag.id), 1); lay.order.push(drag.id); changed(was); }
    go(cur + dir); };
  const moveDrag = e => { const d = drag; d.g.style.transform = `translate(${(e.clientX - d.ox - d.sr.left) / d.k}px,${(e.clientY - d.oy - d.sr.top) / d.k}px)`;
    // held against the left or right edge: the next page
    const r = pager.getBoundingClientRect(), dir = e.clientX < r.left + 24 ? -1 : e.clientX > r.right - 24 ? 1 : 0;
    if (dir !== d.flipDir) { clearTimeout(d.flipT); d.flipDir = dir; if (dir) d.flipT = setTimeout(() => flip(dir), 600); }
    const el = document.elementFromPoint(e.clientX, e.clientY); if (!el || !tabs.contains(el)) return;
    const t = el.closest('button[data-p]');
    if (t && t.dataset.p !== d.id) place(d.id, t.dataset.p, e.clientX < t.getBoundingClientRect().left + t.getBoundingClientRect().width / 2);
    else if (!t && el.closest('.ph-dock')) toDock(d.id);
    else if (!t && el.closest('.ph-pages')) toPageEnd(d.id, e.clientX, e.clientY); };
  const dropDrag = () => { clearTimeout(drag.flipT); drag.g.remove(); btn(drag.id)?.classList.remove('ph-lift'); drag = null; keep(); };
  tabs.addEventListener('pointerdown', e => { if (!page.classList.contains('home') || e.button > 0 || press || e.target.closest('.ph-dots')) return;
    const b = e.target.closest('button[data-p]');
    press = { b, id: e.pointerId, x: e.clientX, y: e.clientY, left: pager.scrollLeft, from: cur, mouse: e.pointerType === 'mouse', mode: null, held: !!(b && editing()) };
    if (b && !editing()) press.t = setTimeout(() => { if (press && !press.mode) { press.held = true; appMenu(b); } }, 450); });
  addEventListener('pointermove', e => { const p = press; if (!p || e.pointerId !== p.id) return;
    const dx = e.clientX - p.x, dy = e.clientY - p.y, far = Math.hypot(dx, dy);
    if (!p.mode) {
      if (p.held && p.b && far > 5) { closeMenu(); startDrag(e); }
      else if (!p.held && far > 8) { clearTimeout(p.t);
        if (dy > 0 && dy > Math.abs(dx) * 1.2 && !editing()) { p.mode = 'pull'; spot.hidden = false; spot.classList.add('pulling'); }
        else if (p.mouse && Math.abs(dx) > Math.abs(dy)) { p.mode = 'swipe'; swiping = true; pager.style.scrollSnapType = 'none'; }
        else p.mode = 'none'; } }
    if (p.mode === 'drag') moveDrag(e);
    else if (p.mode === 'swipe') pager.scrollLeft = p.left - dx;
    else if (p.mode === 'pull') spot.style.setProperty('--pull', Math.max(0, Math.min(1, (dy - 8) / 90)).toFixed(3)); });
  const end = e => { const p = press; if (!p || e.pointerId !== p.id) return; press = null; clearTimeout(p.t);
    const dx = e.clientX - p.x, dy = e.clientY - p.y;
    if (p.mode === 'drag') dropDrag();
    else if (p.mode === 'swipe') { pager.style.scrollSnapType = ''; swiping = false; go(p.from + (Math.abs(dx) > 40 ? (dx < 0 ? 1 : -1) : 0)); }
    else if (p.mode === 'pull') { if (e.type === 'pointerup' && dy > 60) openSpot(); else closeSpot(); }
    if (p.held || p.mode) mute = Date.now() + 350; };
  addEventListener('pointerup', end); addEventListener('pointercancel', end);
  // while an app is held or the search is being pulled, the finger moves it rather than the page
  tabs.addEventListener('touchmove', e => { if (press && (press.held || press.mode === 'pull' || press.mode === 'drag')) e.preventDefault(); }, { passive: false });
  tabs.addEventListener('contextmenu', e => { if (e.target.closest('button[data-p]')) e.preventDefault(); });
  // in edit mode nothing opens; a tap on an empty spot ends it. Right after a hold or a drag, the click it ends with is not a tap.
  tabs.addEventListener('click', e => { const onApp = e.target.closest('button[data-p],[data-open]');
    if (editing() && e.target.closest('.ph-rm') && onApp?.dataset.p) { e.preventDefault(); e.stopImmediatePropagation(); removeApp(onApp.dataset.p); return; }
    if (Date.now() < mute || (editing() && onApp)) { e.preventDefault(); e.stopImmediatePropagation(); return; }
    if (editing() && !onApp && !e.target.closest('.ph-dots')) leaveEdit(); }, true);
  // with the keyboard: in edit mode the arrow keys move the focused app
  tabs.addEventListener('keydown', e => { const b = e.target.closest('button[data-p]'); if (editing() && b && (e.key === 'Delete' || e.key === 'Backspace')) { e.preventDefault(); removeApp(b.dataset.p); return; }
    if (!editing() || !b || !['ArrowLeft', 'ArrowRight'].includes(e.key)) return;
    e.preventDefault(); const id = b.dataset.p, list = listOf(id), i = list.indexOf(id), j = i + (e.key === 'ArrowLeft' ? -1 : 1);
    if (j < 0 || j >= list.length) return; const was = JSON.stringify(lay); [list[i], list[j]] = [list[j], list[i]]; if (changed(was)) { keep(); b.focus(); } });

  const bar = document.createElement('button'); bar.type = 'button'; bar.className = 'ph-bar'; bar.setAttribute('aria-label', 'Home screen'); screen.appendChild(bar);
  const back = document.createElement('button'); back.type = 'button'; back.className = 'ph-back';
  back.innerHTML = '<svg width="12" height="18" viewBox="0 0 12 20" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"><path d="M10 2 2 10l8 8"/></svg>Apps';
  screens.parentNode.insertBefore(back, screens);
  // the back link sits above the open app, so the app starts a little lower
  const fit = () => { screens.style.top = page.classList.contains('home') ? '' : (back.offsetHeight + 2) + 'px'; };
  const home = v => { page.classList.toggle('home', v); fit(); leaveEdit(); closeSpot(); if (v) { drawWidgets(); loadWx(); } dispatchEvent(new CustomEvent('ovphone', { detail: { home: v } })); };
  tabs.addEventListener('click', e => { const w = e.target.closest('[data-open]'); if (w) { tabs.querySelector(`button[data-p="${w.dataset.open}"]`)?.click(); return; }
    const b = e.target.closest('button[data-p]'); if (b) { home(false); opened(b.dataset.p); } });
  // swipe up from the home bar to go home, as on an iPhone: the app follows your finger, shrinking as it rises, and goes home once
  // it's swiped far enough or flicked; short of that it springs back. A tap still goes home.
  let swipe = null, swiped = false;
  bar.addEventListener('pointerdown', e => { if (page.classList.contains('home') || e.button) return; swipe = { y: e.clientY, t: performance.now(), dy: 0, v: 0 }; swiped = false; bar.setPointerCapture(e.pointerId); screens.style.transition = 'none'; });
  bar.addEventListener('pointermove', e => { if (!swipe) return; const dy = Math.max(0, swipe.y - e.clientY), t = performance.now(); swipe.v = (dy - swipe.dy) / Math.max(1, t - swipe.t); swipe.t = t; swipe.dy = dy; if (dy > 6) swiped = true;
    if (still.matches) return; const k = Math.min(1, dy / (screen.clientHeight * .55)); screens.style.transform = `translateY(${(-dy * .75).toFixed(1)}px) scale(${(1 - k * .3).toFixed(3)})`; screens.style.borderRadius = Math.round(k * 34) + 'px';
    page.classList.toggle('peek', dy > 6); tabs.style.opacity = Math.min(1, k * 1.6).toFixed(2); tabs.style.transform = `scale(${(1.06 - k * .06).toFixed(3)})`; });
  const endSwipe = () => { if (!swipe) return; const d = swipe; swipe = null; screens.style.transition = ''; screens.style.borderRadius = ''; screens.style.transform = ''; page.classList.remove('peek'); tabs.style.opacity = ''; tabs.style.transform = '';   // from where it is: home, or back into place
    if (swiped && (d.dy > Math.min(110, screen.clientHeight * .16) || d.v > .55)) home(true); };
  bar.addEventListener('pointerup', endSwipe); bar.addEventListener('pointercancel', endSwipe);
  bar.addEventListener('click', () => { if (swiped) { swiped = false; return; } home(true); }); back.addEventListener('click', () => home(true));
  page.addEventListener('keydown', e => {
    if (e.key === 'Escape' && !menu.hidden) { e.stopPropagation(); closeMenu(); return; }
    if (e.key === 'Escape' && spotOpen()) { e.stopPropagation(); closeSpot(); return; }
    if (e.key === 'Escape' && editing()) { e.stopPropagation(); leaveEdit(); return; }
    if (e.key === 'Escape' && !page.classList.contains('home') && !e.target.closest('input,textarea,select,dialog')) { e.stopPropagation(); home(true); return; }
    const typing = e.target.closest('input,textarea,select,[contenteditable]');
    if (page.classList.contains('home') && !typing && (e.key === '/' || ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k'))) { e.preventDefault(); openSpot(); } });
  // ── press and hold an app: a menu under it over the blurred Home Screen (Open, Edit Home Screen, Remove App). Moving the finger
  // from there starts moving apps, as on an iPhone. The same menu, from Edit in edit mode, adds a widget or changes the wallpaper. ──
  const menu = document.createElement('div'); menu.className = 'ph-menu'; menu.hidden = true; screen.appendChild(menu);
  const MI = { open: '<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M7 17 17 7M8 7h9v9"/></svg>',
    edit: '<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="5" y="2.5" width="14" height="19" rx="3"/><path d="M9 7h2M13 7h2M9 11h2M13 11h2"/></svg>',
    rm: '<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="9"/><path d="M8 12h8"/></svg>',
    wid: '<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"><rect x="3" y="3" width="8" height="8" rx="2"/><rect x="13" y="3" width="8" height="8" rx="2"/><rect x="3" y="13" width="18" height="8" rx="2"/></svg>',
    wall: '<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="3"/><path d="m3 16 5-5 4 4 3-3 6 6"/></svg>' };
  const at = r => { const sr = screen.getBoundingClientRect(), k = screen.offsetWidth ? sr.width / screen.offsetWidth : 1; return { x: (r.left - sr.left) / k, y: (r.top - sr.top) / k, w: r.width / k, h: r.height / k }; };
  const showMenu = (items, r, iconHTML = '') => { const W = screen.offsetWidth, H = screen.offsetHeight, cardW = 230, below = r.y + r.h + 10 + items.length * 44 < H - 30;
    const x = Math.max(12, Math.min(W - cardW - 12, r.x + (r.x + r.w / 2 > W / 2 ? r.w - cardW : 0))), y = below ? r.y + r.h + 10 : Math.max(12, r.y - 10 - items.length * 44);
    menu.innerHTML = (iconHTML ? `<div class="ph-menu-ic" style="left:${r.x}px;top:${r.y}px;width:${r.w}px;height:${r.w}px">${iconHTML}</div>` : '')
      + `<div class="ph-menu-card" role="menu" style="left:${x}px;top:${y}px;width:${cardW}px;--o:${below ? 'top' : 'bottom'} ${x > r.x ? 'left' : 'right'}">${items.map(([m, label, ic, dz]) => `<button type="button" role="menuitem" data-m="${m}"${dz ? ' class="dz"' : ''}><span>${esc(label)}</span>${MI[ic] || ''}</button>`).join('')}</div>`;
    menu.hidden = false; void menu.offsetWidth; menu.classList.add('on'); menu.querySelector('[data-m]')?.focus({ preventScroll: true }); };
  let menuFor = null;
  // closing it hands focus back to the app it was for (or the Home Screen), so the keyboard keeps working in the phone
  const closeMenu = () => { if (menu.hidden) return; menu.classList.remove('on'); const f = menuFor && btn(menuFor); menuFor = null; if (menu.contains(document.activeElement)) (f && shown(f) ? f : tabs).focus({ preventScroll: true }); setTimeout(() => { if (!menu.classList.contains('on')) menu.hidden = true; }, still.matches ? 0 : 170); };
  const appMenu = b => { const ic = b.querySelector('svg'); if (!ic) return; menuFor = b.dataset.p;
    showMenu([['open', 'Open ' + appName(b), 'open'], ['edit', 'Edit Home Screen', 'edit'], ['rm', 'Remove App', 'rm', true]], at(ic.getBoundingClientRect()), ic.outerHTML); };
  menu.addEventListener('click', e => { const a = e.target.closest('[data-m]'), id = menuFor; closeMenu(); if (!a) return;
    if (a.dataset.m === 'open') btn(id)?.click(); else if (a.dataset.m === 'edit') enterEdit(); else if (a.dataset.m === 'rm') removeApp(id);
    else if (a.dataset.m === 'wid' || a.dataset.m === 'wall') { leaveEdit(); btn('phset')?.click(); }
    if (!page.contains(document.activeElement) || !document.activeElement.offsetParent) tabs.focus({ preventScroll: true }); });
  if (!tabs.hasAttribute('tabindex')) tabs.tabIndex = -1;   // so focus can rest on the Home Screen itself
  const editB = document.createElement('button'); editB.type = 'button'; editB.className = 'ph-editb'; editB.textContent = 'Edit'; sbar.prepend(editB);
  editB.addEventListener('click', () => showMenu([['wid', 'Add Widget', 'wid'], ['wall', 'Wallpaper', 'wall']], at(editB.getBoundingClientRect())));
  // taking an app off the Home Screen: it hides there, search still finds it, and Settings → Reset Home Screen brings it back
  const markGone = () => btns().forEach(b => b.classList.toggle('ph-gone', lay.gone.includes(b.dataset.p)));
  const removeApp = id => { if (!id || lay.gone.includes(id)) return; lay.gone.push(id); markGone(); keep(); queueLayout(); };
  markGone();

  // ── the buttons on the frame, as on the real thing. Side button: the screen goes dark; pressed again (or a tap), the Lock Screen
  // with the date and time, and a swipe up opens the phone where it was. Volume buttons: the phone's volume, on a bar by the buttons,
  // with a click. Action button: Silent mode, shown as the Dynamic Island stretches. On the iPad the top button locks. Kept on this device.
  const tab = page.querySelector('.tablet');
  const key = (k, label) => { const b = document.createElement('button'); b.type = 'button'; b.className = 'ph-key ' + k; b.setAttribute('aria-label', label); tab.appendChild(b); return b; };
  const kAct = key('act', 'Action button: Silent mode'), kUp = key('up', 'Volume up'), kDown = key('down', 'Volume down'), kSide = key('side', 'Side button: lock');
  if (!Number.isFinite(prefs.vol)) prefs.vol = 10;
  let actx = null;
  const tick = () => { if (prefs.silent || !prefs.vol) return; try { actx = actx || new (window.AudioContext || window.webkitAudioContext)(); if (actx.state !== 'running') actx.resume();
    const t = actx.currentTime, o = actx.createOscillator(), g = actx.createGain(); o.frequency.value = 1500; g.gain.setValueAtTime(.1 * prefs.vol / 16, t); g.gain.exponentialRampToValueAtTime(.0001, t + .035);
    o.connect(g).connect(actx.destination); o.start(t); o.stop(t + .04); } catch (e) {} };
  const hud = document.createElement('div'); hud.className = 'ph-hud'; hud.setAttribute('role', 'status'); hud.innerHTML = '<i></i>'; tab.appendChild(hud);
  let hudT = 0;
  const showVol = () => { hud.style.setProperty('--v', (prefs.vol / 16).toFixed(3)); hud.classList.toggle('mute', !prefs.vol || !!prefs.silent); hud.setAttribute('aria-label', `Volume ${Math.round(prefs.vol / 16 * 100)}%`);
    hud.classList.add('on'); clearTimeout(hudT); hudT = setTimeout(() => hud.classList.remove('on'), 1500); };
  kUp.addEventListener('click', () => { prefs.vol = Math.min(16, prefs.vol + 1); save(); showVol(); tick(); });
  kDown.addEventListener('click', () => { prefs.vol = Math.max(0, prefs.vol - 1); save(); showVol(); tick(); });
  const isl = document.createElement('div'); isl.className = 'ph-isl'; isl.setAttribute('role', 'status'); screen.appendChild(isl);
  const BELL = on => `<svg width="17" height="17" viewBox="0 0 24 24" fill="${on ? '#FF453A' : '#fff'}"><path d="M12 22a2.5 2.5 0 0 0 2.4-2h-4.8a2.5 2.5 0 0 0 2.4 2Zm7-6V11a7 7 0 0 0-5.5-6.8V3.5a1.5 1.5 0 0 0-3 0v.7A7 7 0 0 0 5 11v5l-2 2v1h18v-1Z"/>${on ? '<path d="M3 3 21 21" stroke="#FF453A" stroke-width="2.4" stroke-linecap="round"/><path d="M3.6 1.6 22.4 20.4" stroke="#000" stroke-width="1.6" stroke-linecap="round"/>' : ''}</svg>`;
  let islT = 0;
  kAct.addEventListener('click', () => { prefs.silent = !prefs.silent; save();
    isl.innerHTML = BELL(prefs.silent) + (prefs.silent ? '<b>Silent</b>' : '<b class="ring">Ring</b>'); isl.setAttribute('aria-label', prefs.silent ? 'Silent mode on' : 'Silent mode off');
    isl.classList.add('on'); clearTimeout(islT); islT = setTimeout(() => isl.classList.remove('on'), 1700); });
  const off = document.createElement('div'); off.className = 'ph-off'; off.hidden = true; off.setAttribute('aria-label', 'Screen off. Tap to wake'); screen.appendChild(off);
  const lock = document.createElement('div'); lock.className = 'ph-lock'; lock.hidden = true;
  lock.innerHTML = '<div class="ph-lock-top"><svg width="16" height="20" viewBox="0 0 16 20" fill="#fff"><path d="M3 8V5.5a5 5 0 0 1 10 0V8h.5A1.5 1.5 0 0 1 15 9.5v8a1.5 1.5 0 0 1-1.5 1.5h-11A1.5 1.5 0 0 1 1 17.5v-8A1.5 1.5 0 0 1 2.5 8Zm2 0h6V5.5a3 3 0 0 0-6 0Z"/></svg></div>'
    + '<div class="ph-lock-t"><small></small><b></b></div><div class="ph-lock-b"></div>'
    + '<button type="button" class="ph-lock-h">Swipe up to open</button>';
  screen.appendChild(lock);
  let lockState = 'on', clockT = 0;
  const drawLock = () => { const d = new Date(); lock.querySelector('small').textContent = d.toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' });
    lock.querySelector('.ph-lock-t b').textContent = d.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' }).replace(/\s?[AP]M$/i, ''); };
  const setLock = s => { lockState = s; off.hidden = s !== 'off'; lock.hidden = s !== 'lock'; page.classList.toggle('ph-locked', s !== 'on'); clearInterval(clockT);
    if (s === 'lock') { lock.style.transform = ''; lock.style.opacity = ''; drawLock(); clockT = setInterval(drawLock, 15000); }
    if (s !== 'on') { closeMenu(); closeSpot(); leaveEdit(); } };
  kSide.addEventListener('click', () => setLock(lockState === 'off' ? 'lock' : 'off'));
  off.addEventListener('click', () => setLock('lock'));
  const unlock = () => { if (still.matches) { setLock('on'); return; } lock.style.transform = 'translateY(-100%)'; lock.style.opacity = '0'; setTimeout(() => setLock('on'), 260); };
  let lsw = null;
  lock.addEventListener('pointerdown', e => { if (e.button) return; lsw = { y: e.clientY, dy: 0 }; lock.setPointerCapture(e.pointerId); lock.style.transition = 'none'; });
  lock.addEventListener('pointermove', e => { if (!lsw) return; lsw.dy = Math.max(0, lsw.y - e.clientY); if (still.matches) return; lock.style.transform = `translateY(${-lsw.dy}px)`; lock.style.opacity = String(1 - Math.min(.7, lsw.dy / 360)); });
  const lockEnd = e => { if (!lsw) return; const d = lsw.dy; lsw = null; lock.style.transition = '';
    if (d > 70) unlock(); else { lock.style.transform = ''; lock.style.opacity = ''; if (d < 6 && e.type === 'pointerup' && e.target.closest('.ph-lock-h')) unlock(); } };
  lock.addEventListener('pointerup', lockEnd); lock.addEventListener('pointercancel', lockEnd);
  lock.querySelector('.ph-lock-h').addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); unlock(); } });

  // ── Control Center: pulled down from the top right of the screen (a click on the status icons opens it too), as on an iPhone.
  // Silent, the volume and the power button are the frame's own; brightness dims the screen; Airplane mode, Wi-Fi, mobile data, Focus,
  // Rotation Lock and Low Power show in the status bar; the timer counts down and rings; Screen Recording records this tab and saves
  // the video; Screen Mirroring shows the phone on the iPad. Bluetooth, AirDrop, the hotspot and Now Playing are for looks. ──
  const cc = document.createElement('div'); cc.className = 'ph-cc'; cc.hidden = true; cc.setAttribute('role', 'dialog'); cc.setAttribute('aria-label', 'Control Center');
  const dim = document.createElement('div'); dim.className = 'ph-dim'; screen.appendChild(dim); screen.appendChild(cc);
  const sv = (d, f = false, sz = 22) => `<svg width="${sz}" height="${sz}" viewBox="0 0 24 24" ${f ? 'fill="currentColor"' : 'fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"'} aria-hidden="true">${d}</svg>`;
  const I = { plus: sv('<path d="M12 5v14M5 12h14"/>', false, 24), power: sv('<path d="M12 3v8"/><path d="M6.3 6.3a8 8 0 1 0 11.4 0"/>', false, 24),
    plane: sv('<path d="M21 15.5v-2l-8-5V3a1.5 1.5 0 0 0-3 0v5.5l-8 5v2l8-2.5V19l-2 1.5V22l3.5-1 3.5 1v-1.5L13 19v-5.5Z"/>', true),
    drop: sv('<circle cx="12" cy="12" r="2"/><path d="M8.5 15.5a5 5 0 1 1 7 0M5.6 18.4a9 9 0 1 1 12.8 0"/>'),
    wifi: sv('<path d="M2.5 9a13.5 13.5 0 0 1 19 0M5.8 12.4a9 9 0 0 1 12.4 0M9.1 15.8a4.4 4.4 0 0 1 5.8 0"/><circle cx="12" cy="19" r="1.2" fill="currentColor"/>', false, 26),
    cell: sv('<rect x="3" y="14" width="3.4" height="6" rx="1"/><rect x="8.2" y="10.5" width="3.4" height="9.5" rx="1"/><rect x="13.4" y="7" width="3.4" height="13" rx="1"/><rect x="18.6" y="3.5" width="3.4" height="16.5" rx="1"/>', true, 15),
    bt: sv('<path d="m7 7 10 10-5 4V3l5 4L7 17"/>', false, 15), hot: sv('<path d="M10 13a4 4 0 0 0 5.6 0l3-3a4 4 0 0 0-5.6-5.6l-1 1M14 11a4 4 0 0 0-5.6 0l-3 3a4 4 0 0 0 5.6 5.6l1-1"/>', false, 15),
    vpn: sv('<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3a14 14 0 0 1 0 18M12 3a14 14 0 0 0 0 18"/>', false, 15),
    airplay: sv('<circle cx="12" cy="10" r="2"/><path d="M8.5 13.5a5 5 0 1 1 7 0M5.6 16.4a9 9 0 1 1 12.8 0"/><path d="M8 21h8l-4-5Z" fill="currentColor" stroke="none"/>', false, 20),
    rew: sv('<path d="M11 6 3 12l8 6Zm10 0-8 6 8 6Z"/>', true, 22), fwd: sv('<path d="m13 6 8 6-8 6Zm-10 0 8 6-8 6Z"/>', true, 22), play: sv('<path d="M7 4.5v15l13-7.5Z"/>', true, 30), pause: sv('<path d="M6 4h4v16H6Zm8 0h4v16h-4Z"/>', true, 30),
    rot: sv('<path d="M19.5 9.5A8 8 0 1 0 20 13"/><path d="m20.5 5.5-.8 4.3-4.2-1"/><rect x="9" y="11" width="6" height="5" rx="1" fill="currentColor" stroke="none"/><path d="M10 11V9.5a2 2 0 0 1 4 0V11"/>', false, 26),
    bell: on => sv('<path d="M12 22a2.5 2.5 0 0 0 2.4-2h-4.8a2.5 2.5 0 0 0 2.4 2Zm7-6V11a7 7 0 0 0-5.5-6.8V3.5a1.5 1.5 0 0 0-3 0v.7A7 7 0 0 0 5 11v5l-2 2v1h18v-1Z" fill="currentColor" stroke="none"/>' + (on ? '<path d="M3 3 21 21" stroke-width="2.4"/>' : ''), false, 26),
    moon: sv('<path d="M20.5 14.6A8.6 8.6 0 0 1 9.4 3.5a8.6 8.6 0 1 0 11.1 11.1Z"/>', true, 22), sun: '<svg width="24" height="24" viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="4.5" fill="#FFCC00"/><g stroke="#FFCC00" stroke-width="2" stroke-linecap="round"><path d="M12 2.5v2M12 19.5v2M2.5 12h2M19.5 12h2M5.3 5.3l1.4 1.4M17.3 17.3l1.4 1.4M5.3 18.7l1.4-1.4M17.3 6.7l1.4-1.4"/></g></svg>',
    spk: '<svg width="24" height="24" viewBox="0 0 24 24" aria-hidden="true"><path d="M4 9h3.5L12 5v14l-4.5-4H4Z" fill="#5AC8FA"/><path d="M15.5 9a4 4 0 0 1 0 6" fill="none" stroke="#5AC8FA" stroke-width="2" stroke-linecap="round"/></svg>',
    flash: sv('<path d="M8 3h8v3l-2 4v10a2 2 0 0 1-4 0V10L8 6Z"/><circle cx="12" cy="14" r="1" fill="currentColor"/>'), timer: sv('<circle cx="12" cy="13" r="8"/><path d="M12 13 9 9.5M10 2h4"/>'),
    calc: sv('<rect x="5" y="2.5" width="14" height="19" rx="2.5"/><rect x="8" y="5.5" width="8" height="3.5" rx="1" fill="currentColor" stroke="none"/><path d="M8.5 13h0M12 13h0M15.5 13h0M8.5 16.5h0M12 16.5h0M15.5 16.5h0" stroke-width="2.6"/>'),
    low: sv('<rect x="2.5" y="7" width="17" height="10" rx="3"/><path d="M22 10.5v3"/><rect x="5" y="9.5" width="4.5" height="5" rx="1" fill="currentColor" stroke="none"/>'),
    mirror: sv('<rect x="2.5" y="4" width="13" height="10" rx="2"/><rect x="8.5" y="9" width="13" height="10" rx="2" fill="none"/>'), rec: sv('<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="4.5" fill="currentColor"/>') };
  const wifiOn = () => { const c = C(); return !(c.wifi === false || (c.air && c.wifi !== true)); }, cellOn = () => !C().air && C().cell !== false, btOn = () => C().bt !== false;
  const isOn = k => k === 'wifi' ? wifiOn() : k === 'cell' ? cellOn() : k === 'bt' ? btOn() : !!C()[k];
  let timer = null, rec = null, playing = false;
  const mmss = ms => { const t = Math.max(0, Math.ceil(ms / 1000)); return `${Math.floor(t / 60)}:${String(t % 60).padStart(2, '0')}`; };
  const tile = (k, ic, label, cls = '') => `<button type="button" class="cc-t ${cls}${isOn(k) ? ' on' : ''}" data-k="${k}" aria-label="${label}" aria-pressed="${isOn(k)}">${ic}</button>`;
  const slider = (k, label, v, ic) => `<div class="cc-sl" data-s="${k}" role="slider" tabindex="0" aria-label="${label}" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${Math.round(v * 100)}" style="--v:${v.toFixed(3)}"><i></i>${ic}</div>`;
  const drawCC = () => { const c = C();
    cc.innerHTML = `<div class="cc-top"><button type="button" data-a="plus" aria-label="Settings">${I.plus}</button><button type="button" data-a="power" aria-label="Lock">${I.power}</button></div>
      <div class="cc-stat"><span>${c.air ? PLANE : cellOn() ? SIG : ''}<b>Oversite</b>${wifiOn() ? WIFI(navigator.onLine !== false) : ''}</span><span>${c.rot ? ROT : ''}<b>${Math.round(bat[0] * 100)}%</b>${BAT(bat[0], bat[1], !!c.low)}</span></div>
      <div class="cc-g"><div class="cc-mod cc-conn">${tile('air', I.plane, 'Airplane Mode', 'orange')}${tile('drop', I.drop, 'AirDrop', 'blue')}${tile('wifi', I.wifi, 'Wi-Fi', 'blue')}
          <div class="cc-mini">${tile('cell', I.cell, 'Mobile Data', 'green')}${tile('bt', I.bt, 'Bluetooth', 'blue')}${tile('hot', I.hot, 'Personal Hotspot', 'green')}${tile('vpn', I.vpn, 'VPN', 'blue')}</div></div>
        <div class="cc-mod cc-music"><span class="cc-art"></span><button type="button" class="cc-t cc-air" data-a="airplay" aria-label="AirPlay">${I.airplay}</button><b>Not Playing</b>
          <div class="cc-ctl"><button type="button" disabled aria-label="Previous">${I.rew}</button><button type="button" data-a="play" aria-label="${playing ? 'Pause' : 'Play'}">${playing ? I.pause : I.play}</button><button type="button" disabled aria-label="Next">${I.fwd}</button></div></div>
        ${tile('rot', I.rot, 'Rotation Lock', 'red')}<button type="button" class="cc-t red${prefs.silent ? ' on' : ''}" data-a="silent" aria-label="Silent Mode" aria-pressed="${!!prefs.silent}">${I.bell(prefs.silent)}</button>
        ${slider('br', 'Brightness', c.br ?? 1, I.sun)}${slider('vol', 'Volume', prefs.vol / 16, I.spk)}
        <button type="button" class="cc-t cc-focus${c.focus ? ' on' : ''}" data-k="focus" aria-pressed="${!!c.focus}"><i>${I.moon}</i>${c.focus ? 'Do Not Disturb' : 'Focus'}</button>
        ${tile('flash', I.flash, 'Flashlight')}<button type="button" class="cc-t${timer ? ' on' : ''}" data-a="timer" aria-label="Timer">${I.timer}${timer ? `<small>${mmss(timer.end - Date.now())}</small>` : ''}</button>
        <button type="button" class="cc-t" data-a="calc" aria-label="Calculator">${I.calc}</button>${tile('low', I.low, 'Low Power Mode', 'yel')}
        <button type="button" class="cc-t${prefs.device === 'tablet' ? ' on' : ''}" data-a="mirror" aria-label="Screen Mirroring: show it on the iPad">${I.mirror}</button><button type="button" class="cc-t rec${rec ? ' on' : ''}" data-a="rec" aria-label="${rec ? 'Stop recording' : 'Screen Recording'}">${I.rec}</button>
        <div class="cc-tm" hidden>${timer ? '<button type="button" class="dz" data-tm="stop">Cancel timer</button>' : [1, 3, 5, 10, 15, 30].map(m => `<button type="button" data-tm="${m}">${m} min</button>`).join('')}</div></div>`; };
  const setP = p => cc.style.setProperty('--p', p.toFixed(3));
  const settle = to => { if (still.matches) { setP(to); if (!to) cc.hidden = true; return; } cc.classList.add('anim'); setP(to); if (!to) setTimeout(() => { if (cc.style.getPropertyValue('--p') === '0.000') cc.hidden = true; }, 380); };
  const openCC = () => { closeMenu(); closeSpot(); drawCC(); cc.classList.remove('anim'); cc.hidden = false; };
  const closeCC = () => { if (!cc.hidden) settle(0); };
  // a little alert at the top, as the Silent switch shows
  const pill = (html, label, ms = 2200) => { isl.innerHTML = html; isl.setAttribute('aria-label', label); isl.classList.add('on'); clearTimeout(islT); islT = setTimeout(() => isl.classList.remove('on'), ms); };
  const beep = (n = 3) => { if (prefs.silent || !prefs.vol) return; try { actx = actx || new (window.AudioContext || window.webkitAudioContext)(); if (actx.state !== 'running') actx.resume();
    for (let i = 0; i < n; i++) { const t = actx.currentTime + i * .32, o = actx.createOscillator(), g = actx.createGain(); o.frequency.value = 880; g.gain.setValueAtTime(.0001, t); g.gain.exponentialRampToValueAtTime(.25 * prefs.vol / 16, t + .02); g.gain.exponentialRampToValueAtTime(.0001, t + .25); o.connect(g).connect(actx.destination); o.start(t); o.stop(t + .26); } } catch (e) {} };
  // pulled down from the right of the status bar, following the finger; a tap there opens it too
  let ccp = null;
  sbar.style.touchAction = 'none';
  sbar.addEventListener('pointerdown', e => { if (e.button || editing() || e.target.closest('button') || (rec && e.target.closest('#cvClock'))) return; const r = sbar.getBoundingClientRect(); if (e.clientX < r.left + r.width * .55) return;
    ccp = { y: e.clientY, dy: 0, t: performance.now(), moved: false }; sbar.setPointerCapture(e.pointerId); openCC(); setP(0); });
  sbar.addEventListener('pointermove', e => { if (!ccp) return; ccp.dy = Math.max(0, e.clientY - ccp.y); if (ccp.dy > 4) ccp.moved = true; setP(Math.min(1, ccp.dy / 170)); });
  const ccEnd = () => { if (!ccp) return; const p = ccp; ccp = null; settle(!p.moved || p.dy > 55 || p.dy / Math.max(1, performance.now() - p.t) > .5 ? 1 : 0); };
  sbar.addEventListener('pointerup', ccEnd); sbar.addEventListener('pointercancel', ccEnd);
  // swiped up (or a tap on an empty spot) to close
  let ccu = null;
  cc.addEventListener('pointerdown', e => { if (e.button || e.target.closest('button,.cc-sl,.cc-mod')) return; ccu = { y: e.clientY, up: 0 }; cc.setPointerCapture(e.pointerId); cc.classList.remove('anim'); });
  cc.addEventListener('pointermove', e => { if (!ccu) return; ccu.up = Math.max(0, ccu.y - e.clientY); if (!still.matches) setP(1 - Math.min(1, ccu.up / 220)); });
  const ccUp = () => { if (!ccu) return; const u = ccu.up; ccu = null; settle(u > 50 || u < 5 ? 0 : 1); };
  cc.addEventListener('pointerup', ccUp); cc.addEventListener('pointercancel', ccUp);
  page.addEventListener('keydown', e => { if (e.key === 'Escape' && !cc.hidden) { e.stopPropagation(); closeCC(); } }, true);
  // the sliders: brightness dims the screen, volume is the phone's
  const applyBr = () => page.style.setProperty('--br', String(C().br ?? 1));
  const slide = (el, v) => { v = Math.max(0, Math.min(1, v)); el.style.setProperty('--v', v.toFixed(3)); el.setAttribute('aria-valuenow', Math.round(v * 100));
    if (el.dataset.s === 'br') { C().br = Math.max(.2, Math.round(v * 100) / 100); applyBr(); } else { const n = Math.round(v * 16); if (n !== prefs.vol) { prefs.vol = n; tick(); } } save(); };
  let sl = null;
  cc.addEventListener('pointerdown', e => { const el = e.target.closest('.cc-sl'); if (!el || e.button) return; const r = el.getBoundingClientRect(); sl = { el, r }; el.setPointerCapture(e.pointerId); slide(el, 1 - (e.clientY - r.top) / r.height); });
  cc.addEventListener('pointermove', e => { if (sl) slide(sl.el, 1 - (e.clientY - sl.r.top) / sl.r.height); });
  const slEnd = () => { sl = null; }; cc.addEventListener('pointerup', slEnd); cc.addEventListener('pointercancel', slEnd);
  cc.addEventListener('keydown', e => { const el = e.target.closest('.cc-sl'); if (!el || !['ArrowUp', 'ArrowDown', 'ArrowRight', 'ArrowLeft'].includes(e.key)) return; e.preventDefault();
    slide(el, +el.style.getPropertyValue('--v') + (e.key === 'ArrowUp' || e.key === 'ArrowRight' ? 1 : -1) / 16); });
  // screen recording: this tab, through the browser's own screen recorder; the video is saved when it stops (a tap on the red time stops it)
  const stopRec = () => { if (rec && rec.state !== 'inactive') rec.stop(); };
  const startRec = async () => { closeCC(); let st;
    try { st = await navigator.mediaDevices.getDisplayMedia({ video: { frameRate: 30 }, audio: true, preferCurrentTab: true, selfBrowserSurface: 'include' }); }
    catch (e) { pill(`${I.rec}<b class="ring">Recording off</b>`, 'Screen recording was not started'); return; }
    const type = ['video/webm;codecs=vp9', 'video/webm', 'video/mp4'].find(t => window.MediaRecorder?.isTypeSupported?.(t)) || '', parts = [], mr = new MediaRecorder(st, type ? { mimeType: type } : undefined);
    mr.ondataavailable = e => { if (e.data.size) parts.push(e.data); };
    mr.onstop = () => { st.getTracks().forEach(t => t.stop()); rec = null; page.classList.remove('ph-rec'); if (!cc.hidden) drawCC();
      const blob = new Blob(parts, { type: type.split(';')[0] || 'video/webm' }), url = URL.createObjectURL(blob), a = document.createElement('a');
      a.href = url; a.download = `Oversite recording ${new Date().toISOString().slice(0, 19).replace(/[T:]/g, '-')}.${/mp4/.test(type) ? 'mp4' : 'webm'}`; document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(url), 60000);
      pill(`${I.rec}<b class="ring">Saved</b>`, 'Screen recording saved'); };
    st.getVideoTracks()[0]?.addEventListener('ended', stopRec);
    mr.start(1000); rec = mr; page.classList.add('ph-rec'); };
  $('cvClock')?.addEventListener('click', () => { if (rec) stopRec(); });
  // the timer: counts down on its control and rings at the top when it's done
  setInterval(() => { if (!timer) return; const left = timer.end - Date.now(), sm = cc.querySelector('[data-a="timer"] small'); if (sm) sm.textContent = mmss(left);
    if (left <= 0) { timer = null; if (!cc.hidden) drawCC(); pill(`${I.timer}<b class="ring">Timer done</b>`, 'Timer done', 4000); beep(); } }, 500);
  cc.addEventListener('click', e => { const t = e.target.closest('[data-k],[data-a],[data-tm]'); if (!t) return; const c = C(), k = t.dataset.k, a = t.dataset.a;
    if (k) { if (k === 'air') { c.air = !c.air; delete c.wifi; delete c.cell; } else if (k === 'wifi') c.wifi = !wifiOn(); else if (k === 'cell') { const on = !cellOn(); c.cell = on; if (on) c.air = false; } else if (k === 'bt') c.bt = !btOn(); else c[k] = !c[k];
      page.classList.toggle('ph-low', !!c.low); save(); drawIc(); drawCC(); cc.querySelector(`[data-k="${k}"]`)?.focus({ preventScroll: true }); return; }
    if (t.dataset.tm) { if (t.dataset.tm === 'stop') timer = null; else timer = { end: Date.now() + t.dataset.tm * 60000 }; drawCC(); return; }
    if (a === 'plus') { closeCC(); btn('phset')?.click(); }
    else if (a === 'power') { closeCC(); setLock('off'); }
    else if (a === 'airplay') t.classList.toggle('on');
    else if (a === 'play') { playing = !playing; drawCC(); }
    else if (a === 'silent') { kAct.click(); drawCC(); }
    else if (a === 'timer') { const tm = cc.querySelector('.cc-tm'); tm.hidden = !tm.hidden; }
    else if (a === 'calc') { closeCC(); btn('calc')?.click(); }
    else if (a === 'mirror') { closeCC(); prefs.device = prefs.device === 'tablet' ? 'phone' : 'tablet'; save(); applyDevice(); }
    else if (a === 'rec') rec ? stopRec() : startRec(); });
  page.classList.toggle('ph-low', !!C().low); applyBr();

  // ── Calculator: Control Center opens it, and it's on the Home Screen ──
  ART.calc = ai('calc', '#4A4A4E', '#1A1A1D', '<rect x="11" y="10" width="38" height="9" rx="2.6" fill="#2C2C2F"/><rect x="33" y="12.8" width="13" height="3.4" rx="1.7" fill="#fff"/>'
    + '<g fill="#D4D4D2">' + [16, 25, 34].flatMap(x => [27, 36.5, 46].map(y => `<circle cx="${x}" cy="${y}" r="3.6"/>`)).join('') + '</g><g fill="#FF9F0A">' + [27, 36.5, 46].map(y => `<circle cx="44" cy="${y}" r="3.6"/>`).join('') + '</g>');
  addApp({ id: 'calc', name: 'Calculator', color: 'linear-gradient(180deg,#4A4A4E,#1A1A1D)', icon: I.calc, render: sec => {
    const K = [['AC', 'f'], ['±', 'f'], ['%', 'f'], ['÷', 'o'], ['7'], ['8'], ['9'], ['×', 'o'], ['4'], ['5'], ['6'], ['−', 'o'], ['1'], ['2'], ['3'], ['+', 'o'], ['0', 'z'], ['.'], ['=', 'o']];
    sec.innerHTML = `<div class="calc"><div class="calc-d" aria-live="polite">0</div><div class="calc-k">${K.map(([k, c]) => `<button type="button" class="${c || ''}" data-c="${k}">${k}</button>`).join('')}</div></div>`;
    const d = sec.querySelector('.calc-d'); let cur = '0', acc = null, op = null, fresh = false;
    const run = (a, b, o) => o === '+' ? a + b : o === '−' ? a - b : o === '×' ? a * b : o === '÷' ? (b === 0 ? NaN : a / b) : b;
    const show = v => { const n = typeof v === 'number' ? v : parseFloat(v); d.textContent = typeof v === 'string' && !fresh ? v.replace(/^(-?)(\d+)/, (m, s, i) => s + (+i).toLocaleString('en-US'))
      : !Number.isFinite(n) ? 'Error' : Math.abs(n) >= 1e9 || (Math.abs(n) < 1e-6 && n) ? n.toExponential(4) : (+n.toPrecision(9)).toLocaleString('en-US', { maximumFractionDigits: 8 });
      d.style.fontSize = d.textContent.length > 9 ? '40px' : d.textContent.length > 7 ? '52px' : ''; sec.querySelector('[data-c="AC"]').textContent = cur !== '0' && !fresh ? 'C' : 'AC';
      sec.querySelectorAll('.o').forEach(b => b.classList.toggle('on', fresh && b.dataset.c === op)); };
    const press = k => { if (/^\d$/.test(k)) { cur = fresh || cur === '0' ? k : cur.length < 9 ? cur + k : cur; fresh = false; show(cur); return; }
      if (k === '.') { if (fresh) { cur = '0'; fresh = false; } if (!cur.includes('.')) cur += '.'; show(cur); return; }
      if (k === 'AC' || k === 'C') { if (k === 'C') { cur = '0'; show(cur); return; } cur = '0'; acc = null; op = null; fresh = false; show(cur); return; }
      if (k === '±') { cur = cur.startsWith('-') ? cur.slice(1) : cur === '0' ? cur : '-' + cur; show(fresh ? +cur : cur); return; }
      if (k === '%') { cur = String(+cur / 100); fresh = true; show(+cur); return; }
      if (k === '=') { if (op === null) return; const r = run(acc, +cur, op); acc = null; op = null; cur = String(r); fresh = true; show(r); return; }
      if (op !== null && !fresh) { acc = run(acc, +cur, op); cur = String(acc); } else if (acc === null || !fresh) acc = +cur; else acc = +cur; op = k; fresh = true; show(acc); };
    sec.addEventListener('click', e => { const b = e.target.closest('[data-c]'); if (b) press(b.dataset.c === 'AC' ? b.textContent : b.dataset.c); });   // AC reads C once something is typed
    sec.tabIndex = -1; sec.addEventListener('keydown', e => { const m = { '/': '÷', '*': '×', '-': '−', '+': '+', Enter: '=', '=': '=', Escape: 'AC', Backspace: 'C', '%': '%', '.': '.' }[e.key] || (/^\d$/.test(e.key) ? e.key : null); if (!m) return; e.preventDefault(); if (m === 'AC') e.stopPropagation(); press(m); }); },
    onOpen: sec => sec.focus({ preventScroll: true }) });

  // opening the Civilian tab starts on the home screen
  document.querySelector('.menu [data-view="civ"]')?.addEventListener('click', () => home(true));
  window.ovPhone = { addApp, call, esc, home, sound: () => ({ volume: prefs.vol / 16, silent: !!prefs.silent }), open: id => tabs.querySelector(`button[data-p="${id}"]`)?.click(), isOpen: id => !page.classList.contains('home') && !!added.get(id)?.sec.classList.contains('on') };
  drawWidgets(); loadWx(); fit(); layout();
  dispatchEvent(new CustomEvent('ovphoneready'));
})();
