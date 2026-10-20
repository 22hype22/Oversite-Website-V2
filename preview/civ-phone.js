// The Civilian tab as a phone that looks like an iPhone: a wallpaper, the status bar with the Dynamic Island, widgets (the
// weather where the server is, the wallet balance, today's date), the apps as rounded icons with red badges, a Search pill that
// narrows the apps, and the dock. Tapping an app opens it full screen; "Apps" at the top, the bar at the bottom (or Esc) goes back
// home. The Settings app picks the wallpaper, which widgets show and the device: this phone, or a tablet like an iPad (wider, more
// apps to a row, the widgets side by side, the dock centred); all kept on this device. More apps (Messages, Maps, News) plug in
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
  let prefs = { wall: 'blue', widgets: ['weather', 'wallet'], device: 'phone' };
  try { const p = JSON.parse(localStorage.getItem(KEY) || 'null'); if (p) prefs = { wall: WALLS[p.wall] ? p.wall : 'blue', widgets: (p.widgets || []).filter(w => WIDGETS.includes(w)), device: p.device === 'tablet' ? 'tablet' : 'phone' }; } catch (e) {}
  const save = () => { try { localStorage.setItem(KEY, JSON.stringify(prefs)); } catch (e) {} };

  const css = document.createElement('style'); css.textContent = `
#civMdt.phone{width:min(calc(100vw - 2*var(--gap)),calc((100vh - var(--barh) - 2*var(--gap)) * .485))}
#civMdt.phone .tablet{aspect-ratio:9/18.6;width:100%;height:auto;max-height:100%;border-radius:56px;padding:10px;background:linear-gradient(145deg,#3A3C42,#18191C 40%,#2B2D33);
  box-shadow:0 30px 70px rgba(0,0,0,.6),0 0 0 1px rgba(255,255,255,.12) inset,0 0 0 4px #050506 inset}
#civMdt.phone .tablet .screen{border-radius:47px;font-family:-apple-system,BlinkMacSystemFont,"SF Pro Text","Inter","Segoe UI",system-ui,sans-serif;background:#05070D}
#civMdt.phone .tablet .cam{top:19px;width:100px;height:30px;margin-left:-50px;border-radius:16px;background:#000;box-shadow:none;z-index:9}
#civMdt.phone .sbar{position:relative;z-index:6;padding:17px 28px 6px 34px;min-height:52px;font-size:15px;font-weight:600;color:#fff;letter-spacing:-.01em}
#civMdt.phone .sbar .sb-mid,#civMdt.phone .sbar #cvTopBal{display:none}
#civMdt.phone .sb-ic{display:flex;align-items:center;gap:6px}#civMdt.phone .sb-ic svg{display:block}
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
#civMdt.phone .ph-wx b{font-size:40px;font-weight:300;line-height:1.05;letter-spacing:-.02em}#civMdt.phone .ph-wx i{margin-top:auto;font-style:normal;font-size:12px;font-weight:600;line-height:1.35}
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
#civMdt.phone .tside button[data-p]:hover svg{filter:brightness(1.08)}#civMdt.phone .tside button[data-p]:active svg{transform:scale(.92);filter:brightness(.85)}
#civMdt.phone .tside button[data-p] .badge{position:absolute;top:-7px;left:calc(50% + 17px);right:auto;margin:0;min-width:24px;height:24px;padding:0 7px;border-radius:12px;
  background:#FF3B30;color:#fff;font:600 13px/24px -apple-system,BlinkMacSystemFont,"Inter",system-ui,sans-serif;text-shadow:none;box-shadow:0 1px 3px rgba(0,0,0,.3)}
#civMdt.phone .tside [data-p="home"]{--app:linear-gradient(180deg,#34D178,#18A058)}#civMdt.phone .tside [data-p="bills"]{--app:linear-gradient(180deg,#FFB340,#FF8A00)}
#civMdt.phone .tside [data-p="cars"]{--app:linear-gradient(180deg,#3FA0FF,#0A6CFF)}#civMdt.phone .tside [data-p="home2"]{--app:linear-gradient(180deg,#FFD84D,#F5B400)}
#civMdt.phone .tside [data-p="shops"]{--app:linear-gradient(180deg,#FF6FA4,#F2306F)}#civMdt.phone .tside [data-p="jobs"]{--app:linear-gradient(180deg,#A07CFF,#6B47F0)}
#civMdt.phone .tside [data-p="biz"]{--app:linear-gradient(180deg,#3AD6DA,#0FA3B0)}#civMdt.phone .tside [data-p="id"]{--app:linear-gradient(180deg,#B9C0CC,#7D8594)}
#civMdt.phone .tside [data-p="record"]{--app:linear-gradient(180deg,#FF5A50,#E0241A)}#civMdt.phone .tside [data-p="server"]{--app:linear-gradient(180deg,#5D6BF2,#3A3FC4)}
#civMdt.phone .tside [data-p="phset"]{--app:linear-gradient(180deg,#A3A8B1,#6E737C)}
#civMdt.phone .ph-search{align-self:center;display:flex;align-items:center;gap:6px;margin:auto 0 12px;padding:7px 14px;border-radius:999px;background:rgba(255,255,255,.14);
  -webkit-backdrop-filter:blur(16px) saturate(1.4);backdrop-filter:blur(16px) saturate(1.4);color:rgba(255,255,255,.9);font-size:14px;font-weight:500;flex:none}
#civMdt.phone .ph-search input{width:62px;background:none;border:0;outline:0;color:#fff;font:inherit;padding:0;transition:width .2s ease}
#civMdt.phone .ph-search input:focus,#civMdt.phone .ph-search input:not(:placeholder-shown){width:150px}#civMdt.phone .ph-search input::placeholder{color:rgba(255,255,255,.85)}
#civMdt.phone .tside button[data-p].ph-miss{display:none}
#civMdt.phone .ph-dock{flex:none;align-self:stretch;position:sticky;bottom:34px;z-index:2;display:grid;grid-template-columns:repeat(4,1fr);margin:0 -8px 34px;padding:14px 8px;border-radius:34px;background:rgba(255,255,255,.12);
  -webkit-backdrop-filter:blur(22px) saturate(1.5);backdrop-filter:blur(22px) saturate(1.5);box-shadow:inset 0 1px 0 rgba(255,255,255,.12)}
#civMdt.phone .ph-dock button[data-p]{font-size:0!important;gap:0!important}#civMdt.phone .ph-dock button[data-p] .badge{font-size:13px}
#civMdt.phone .ph-bar{position:absolute;left:0;right:0;bottom:0;height:26px;display:flex;align-items:center;justify-content:center;z-index:7;background:none;border:0;cursor:pointer}
#civMdt.phone .ph-bar::before{content:"";width:134px;height:5px;border-radius:3px;background:rgba(255,255,255,.75);transition:background .15s,width .2s}
#civMdt.phone .ph-bar:hover::before{background:#fff;width:144px}#civMdt.phone.home .ph-bar{pointer-events:none;bottom:4px}
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
  #civMdt.phone .tablet .screen{border-radius:0}#civMdt.phone .tablet .cam{display:none}#civMdt.phone .sbar{padding:10px 20px 6px;min-height:0}
  #civMdt.phone .tside button[data-p] svg{width:56px;height:56px;padding:14px}#civMdt.phone .ph-dock{margin-bottom:30px}}
@media (prefers-reduced-motion:reduce){#civMdt.phone .tside,#civMdt.phone.home .tside{transition:none;transform:none}}
/* the tablet, above phone width: the same home screen and apps on an iPad, landscape, a thin bezel with a camera dot in it (on a phone it stays the phone) */
@media (min-width:761px){#civMdt.phone.pad{width:min(calc(100vw - 2*var(--gap)),calc((100vh - var(--barh) - 2*var(--gap)) * 1.36))}
#civMdt.phone.pad .tablet{aspect-ratio:4/3;border-radius:34px;padding:12px}
#civMdt.phone.pad .tablet .screen{border-radius:23px}
#civMdt.phone.pad .tablet .cam{top:4px;width:6px;height:6px;margin-left:-3px;border-radius:50%;background:#14161B;box-shadow:0 0 0 1px rgba(255,255,255,.06)}
#civMdt.phone.pad .sbar{padding:9px 26px 4px;min-height:32px;font-size:13.5px}#civMdt.phone.pad .sb-ic{gap:5px}
#civMdt.phone.pad .tside{padding:22px max(56px,8%) 0}
#civMdt.phone.pad .ph-wid{grid-template-columns:repeat(3,minmax(0,1fr));gap:18px 24px;max-width:860px;width:100%;align-self:center;margin:4px 0 0}
#civMdt.phone.pad .ph-w>div{aspect-ratio:2.1/1;border-radius:24px;padding:15px 18px}
#civMdt.phone.pad .ph-wid>.ph-w:nth-child(3){grid-column:auto;flex-direction:column;justify-content:normal;gap:6px}#civMdt.phone.pad .ph-wid>.ph-w:nth-child(3)>span{display:block}
#civMdt.phone.pad .ph-wid>.ph-w:nth-child(3)>div{aspect-ratio:2.1/1;height:auto;flex-direction:column;align-items:stretch;gap:0;padding:15px 18px;border-radius:24px}
#civMdt.phone.pad .ph-wid>.ph-w:nth-child(3)>div b{font-size:44px;margin:2px 0 0;order:0}#civMdt.phone.pad .ph-wid>.ph-w:nth-child(3)>div>:last-child{margin-left:0;margin-top:auto!important}
#civMdt.phone.pad .ph-wid>.ph-w:nth-child(3) .ph-wx svg{display:inline}#civMdt.phone.pad .ph-wid>.ph-w:nth-child(3) .ph-wx b{font-size:40px}
#civMdt.phone.pad .ph-apps{grid-template-columns:repeat(auto-fill,minmax(104px,1fr));gap:26px 8px;margin-top:28px;max-width:960px;width:100%;align-self:center}
#civMdt.phone.pad .tside button[data-p] svg{width:68px;height:68px;padding:17px}#civMdt.phone.pad .tside button[data-p]{font-size:12.5px}
#civMdt.phone.pad .tside button[data-p] .badge{left:calc(50% + 21px)}
#civMdt.phone.pad .ph-search{margin:auto 0 14px}
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
  const applyDevice = () => { page.classList.toggle('pad', prefs.device === 'tablet'); dispatchEvent(new CustomEvent('ovphonedevice', { detail: { device: prefs.device } })); };
  applyWall(); applyDevice();

  // status bar: signal, Wi-Fi and battery on the right, like the real thing
  const ic = document.createElement('span'); ic.className = 'sb-ic'; ic.setAttribute('aria-hidden', 'true');
  ic.innerHTML = '<svg width="18" height="12" viewBox="0 0 18 12" fill="#fff"><rect x="0" y="8" width="3" height="4" rx="1"/><rect x="5" y="5.5" width="3" height="6.5" rx="1"/><rect x="10" y="3" width="3" height="9" rx="1"/><rect x="15" y="0" width="3" height="12" rx="1"/></svg>'
    + '<svg width="16" height="12" viewBox="0 0 16 12" fill="#fff"><path d="M8 2.6c2.3 0 4.4.9 6 2.4l1.3-1.4A10.4 10.4 0 0 0 8 .6 10.4 10.4 0 0 0 .7 3.6L2 5c1.6-1.5 3.7-2.4 6-2.4Zm0 3.6c1.3 0 2.5.5 3.4 1.3l1.4-1.4A6.7 6.7 0 0 0 8 4.2c-1.8 0-3.5.7-4.8 1.9l1.4 1.4C5.5 6.7 6.7 6.2 8 6.2Zm0 3.4L6 11.7 8 12l2-.3-2-2.1Z"/></svg>'
    + '<svg width="27" height="13" viewBox="0 0 27 13" fill="none"><rect x=".5" y=".5" width="23" height="12" rx="3.8" stroke="rgba(255,255,255,.45)"/><rect x="2" y="2" width="17" height="9" rx="2.4" fill="#fff"/><path d="M25 4.5v4c.8-.3 1.3-1.1 1.3-2s-.5-1.7-1.3-2Z" fill="rgba(255,255,255,.45)"/></svg>';
  sbar.appendChild(ic);

  // home screen: widgets, the apps, search, the dock
  const wid = document.createElement('div'); wid.className = 'ph-wid';
  const apps = document.createElement('div'); apps.className = 'ph-apps';
  const dock = document.createElement('div'); dock.className = 'ph-dock';
  const search = document.createElement('label'); search.className = 'ph-search';
  search.innerHTML = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round"><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></svg><input type="search" placeholder="Search" aria-label="Search apps" autocomplete="off">';
  const DOCK = ['msgs', 'home', 'maps', 'bills'];
  for (const b of [...tabs.querySelectorAll('button[data-p]')]) apps.appendChild(b);
  tabs.prepend(wid); wid.after(apps); apps.after(search); search.after(dock);
  const placeDock = () => { for (const p of DOCK) { const b = tabs.querySelector(`button[data-p="${p}"]`); if (b && b.parentNode !== dock) dock.appendChild(b); }
    for (const b of [...dock.querySelectorAll('button[data-p]')].sort((a, b) => DOCK.indexOf(a.dataset.p) - DOCK.indexOf(b.dataset.p))) dock.appendChild(b); };
  placeDock();

  // adding an app: an icon on the home screen and its own screen, which `render` fills the first time it opens
  const added = new Map();
  const addApp = ({ id, name, icon, color, render, onOpen, before }) => {
    const b = document.createElement('button'); b.type = 'button'; b.setAttribute('role', 'tab'); b.dataset.p = id; b.setAttribute('aria-selected', 'false');
    b.style.setProperty('--app', color); b.innerHTML = `${icon}${esc(name)}<i class="badge" id="phBadge-${id}" hidden>0</i>`;
    const at = before && apps.querySelector(`button[data-p="${before}"]`); at ? apps.insertBefore(b, at) : apps.appendChild(b);
    const sec = document.createElement('section'); sec.className = 'tscreen cv-pane'; sec.dataset.p = id; screens.appendChild(sec);
    added.set(id, { render, onOpen, sec, done: false }); placeDock(); return { button: b, section: sec, badge: n => { const el = $('phBadge-' + id); el.textContent = n; el.hidden = !n; } }; };
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
      : `<button type="button" class="ph-w" data-open="bills"><div class="ph-cal"><small>${esc(now.toLocaleDateString([], { weekday: 'long' }))}</small><b>${now.getDate()}</b><em>${n ? `${n} bill${n > 1 ? 's' : ''} due` : 'No bills due'}</em></div><span>Calendar</span></button>`).join(''); };
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
      <h3>Widgets</h3><div class="ps-g">${WIDGETS.map(w => `<label class="ps-r"><i class="ps-ic" style="background:${SW[w][1]}">${SW[w][2]}</i><span>${SW[w][0]}</span><span class="ps-sw"><input type="checkbox" data-wid="${w}"${prefs.widgets.includes(w) ? ' checked' : ''}><i></i></span></label>`).join('')}</div>
      <h3>Weather</h3><div class="ps-g"><div class="ps-r"><i class="ps-ic" style="background:#2A84F0">${WX.sun}</i><span>${wx && !wx.error ? esc(wx.full) : 'Not found yet'}<small>${wx && !wx.error ? (wx.set ? 'Where this server is' : 'Guessed from the server’s name') : esc(wx?.error || '')}</small></span></div>
        ${wx?.canSet ? `<form class="ps-in" id="psPlace"><input id="psPlaceIn" name="q" placeholder="City, like Miami or Atlanta, Georgia" maxlength="80"><button>Set</button></form>` : ''}</div>
      ${wx?.canSet ? `<p class="ps-note${placeMsg?.err ? ' err' : ''}" id="psNote">${esc(placeMsg?.t || 'You run this server, so you can set where it is. Everyone’s weather follows it.')}</p>` : ''}</div>`;
    if (keep && $(keep)) $(keep).focus(); };
  const settings = addApp({ id: 'phset', name: 'Settings', icon: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/></svg>',
    color: 'linear-gradient(180deg,#A3A8B1,#6E737C)', render: sec => { setSec = sec; drawSettings(); }, onOpen: () => loadWx(true) });
  settings.section.addEventListener('click', e => { const d = e.target.closest('[data-dev]'); if (d) { prefs.device = d.dataset.dev; save(); applyDevice(); drawSettings(); fit(); return; }
    const w = e.target.closest('[data-wall]'); if (!w) return; prefs.wall = w.dataset.wall; save(); applyWall(); drawSettings(); });
  settings.section.addEventListener('change', e => { const t = e.target; if (!t.dataset.wid) return;
    prefs.widgets = WIDGETS.filter(w => w === t.dataset.wid ? t.checked : prefs.widgets.includes(w)); save(); drawWidgets(); });
  settings.section.addEventListener('submit', async e => { e.preventDefault(); const q = e.target.q.value.trim(); placeMsg = { t: 'Looking that up…' }; drawSettings();
    try { wx = await call('/weather/place', { q }); wxAt = Date.now(); placeMsg = { t: `Set. Everyone in this server now sees the weather in ${wx.full}.` }; } catch (x) { placeMsg = { t: x.message, err: true }; }
    drawSettings(); drawWidgets(); });

  // search: only the apps whose name matches
  const q = search.querySelector('input');
  q.addEventListener('input', () => { const v = q.value.trim().toLowerCase(); for (const b of apps.querySelectorAll('button[data-p]')) b.classList.toggle('ph-miss', !!v && !b.textContent.toLowerCase().includes(v)); });

  const bar = document.createElement('button'); bar.type = 'button'; bar.className = 'ph-bar'; bar.setAttribute('aria-label', 'Home screen'); screen.appendChild(bar);
  const back = document.createElement('button'); back.type = 'button'; back.className = 'ph-back';
  back.innerHTML = '<svg width="12" height="18" viewBox="0 0 12 20" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"><path d="M10 2 2 10l8 8"/></svg>Apps';
  screens.parentNode.insertBefore(back, screens);
  // the back link sits above the open app, so the app starts a little lower
  const fit = () => { screens.style.top = page.classList.contains('home') ? '' : (back.offsetHeight + 2) + 'px'; };
  const home = v => { page.classList.toggle('home', v); fit(); if (v) { q.value = ''; q.dispatchEvent(new Event('input')); drawWidgets(); loadWx(); } dispatchEvent(new CustomEvent('ovphone', { detail: { home: v } })); };
  tabs.addEventListener('click', e => { const w = e.target.closest('[data-open]'); if (w) { tabs.querySelector(`button[data-p="${w.dataset.open}"]`)?.click(); return; }
    const b = e.target.closest('button[data-p]'); if (b) { home(false); opened(b.dataset.p); } });
  bar.addEventListener('click', () => home(true)); back.addEventListener('click', () => home(true));
  page.addEventListener('keydown', e => { if (e.key === 'Escape' && !page.classList.contains('home') && !e.target.closest('input,textarea,select,dialog')) { e.stopPropagation(); home(true); } });
  // opening the Civilian tab starts on the home screen
  document.querySelector('.menu [data-view="civ"]')?.addEventListener('click', () => home(true));
  window.ovPhone = { addApp, call, esc, home, open: id => tabs.querySelector(`button[data-p="${id}"]`)?.click(), isOpen: id => !page.classList.contains('home') && !!added.get(id)?.sec.classList.contains('on') };
  drawWidgets(); loadWx(); fit();
  dispatchEvent(new CustomEvent('ovphoneready'));
})();
