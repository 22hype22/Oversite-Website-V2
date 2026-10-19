// The Civilian tab as a phone instead of a tablet: a phone frame with a home screen of app icons (Wallet, Bills, Vehicles,
// Housing, Shops, Work, Business, My ID, Record, Server). Tapping one opens that app full screen; the bar at the bottom (or Esc)
// goes back to the home screen. The apps themselves are the Civilian screens as they were; this only changes the device around
// them. On a phone the frame goes and it fills the screen.
(() => { const page = document.getElementById('civMdt'), tabs = document.getElementById('cvTabs'); if (!page || !tabs) return;
  const css = document.createElement('style'); css.textContent = `
#civMdt.phone{width:min(calc(100vw - 2*var(--gap)),calc((100vh - var(--barh) - 2*var(--gap)) * .485))}
#civMdt.phone .tablet{aspect-ratio:9/18.6;width:100%;height:auto;max-height:100%;border-radius:52px;padding:11px;background:#141518;
  box-shadow:0 30px 70px rgba(0,0,0,.6),0 0 0 1px rgba(255,255,255,.08) inset,0 0 0 4px #0B0C0E inset}
#civMdt.phone .tablet .screen{border-radius:42px}
#civMdt.phone .tablet .cam{top:20px;width:96px;height:28px;margin-left:-48px;border-radius:16px;background:#000;box-shadow:none;z-index:9}
#civMdt.phone .sbar{padding:16px 30px 8px;min-height:50px}#civMdt.phone .sbar .sb-mid{visibility:hidden}
#civMdt.phone .tbody{position:relative;display:block}
#civMdt.phone .tscreens{position:absolute;inset:0 0 26px}
#civMdt.phone .tside{position:absolute;inset:0 0 26px;width:auto;border:0;padding:18px 18px 10px;display:grid;grid-template-columns:repeat(4,1fr);grid-auto-rows:max-content;
  gap:18px 6px;align-content:start;overflow-y:auto;z-index:3;background:radial-gradient(120% 70% at 50% 0%,rgba(63,191,138,.16),transparent 60%),#0C0D0F;
  opacity:0;visibility:hidden;transform:scale(1.04);transition:opacity .2s ease,transform .25s cubic-bezier(.2,.8,.2,1),visibility 0s .25s}
#civMdt.phone.home .tside{opacity:1;visibility:visible;transform:none;transition:opacity .2s ease,transform .25s cubic-bezier(.2,.8,.2,1),visibility 0s}
#civMdt.phone .tside .crest{grid-column:1/-1;justify-content:center;font-size:12px;letter-spacing:.06em;text-transform:uppercase;color:var(--mute);margin:2px 0 4px}
#civMdt.phone .tside button[data-p]{flex-direction:column;align-items:center;gap:7px;padding:0;background:none!important;color:#E9EAEC;font-size:11.5px;font-weight:500;text-align:center;line-height:1.2}
#civMdt.phone .tside button[data-p] svg{width:58px;height:58px;padding:15px;border-radius:16px;color:#fff;background:var(--app,#3A3D45);box-shadow:0 6px 14px rgba(0,0,0,.35),inset 0 1px 0 rgba(255,255,255,.18)}
#civMdt.phone .tside button[data-p]:hover svg{filter:brightness(1.1)}
#civMdt.phone .tside button[data-p]:active svg{transform:scale(.94)}
#civMdt.phone .tside button[data-p] .badge{position:absolute;top:-5px;right:calc(50% - 36px);margin:0}
#civMdt.phone .tside [data-p="home"]{--app:linear-gradient(160deg,#3FBF8A,#1F7D58)}#civMdt.phone .tside [data-p="bills"]{--app:linear-gradient(160deg,#F2994A,#C2581A)}
#civMdt.phone .tside [data-p="cars"]{--app:linear-gradient(160deg,#4C8DFF,#2457C5)}#civMdt.phone .tside [data-p="home2"]{--app:linear-gradient(160deg,#E9C24C,#B88A12)}
#civMdt.phone .tside [data-p="shops"]{--app:linear-gradient(160deg,#EC6FA6,#B3346B)}#civMdt.phone .tside [data-p="jobs"]{--app:linear-gradient(160deg,#8C7BFF,#5440D6)}
#civMdt.phone .tside [data-p="biz"]{--app:linear-gradient(160deg,#2EC4C9,#13868A)}#civMdt.phone .tside [data-p="id"]{--app:linear-gradient(160deg,#9AA3B2,#5D6676)}
#civMdt.phone .tside [data-p="record"]{--app:linear-gradient(160deg,#E24B4B,#A82424)}#civMdt.phone .tside [data-p="server"]{--app:linear-gradient(160deg,#5A5F6B,#30333B)}
#civMdt.phone .tside .tuser{grid-column:1/-1;margin-top:8px;border-radius:14px;border:1px solid var(--line);padding:10px 12px}
#civMdt.phone .tmenu{left:18px;right:18px;width:auto;bottom:70px}
#civMdt.phone .ph-bar{position:absolute;left:0;right:0;bottom:0;height:26px;display:flex;align-items:center;justify-content:center;z-index:4;background:none;border:0;cursor:pointer}
#civMdt.phone .ph-bar::before{content:"";width:120px;height:5px;border-radius:3px;background:rgba(255,255,255,.55);transition:background .15s,width .2s}
#civMdt.phone .ph-bar:hover::before{background:#fff;width:134px}#civMdt.phone.home .ph-bar{pointer-events:none}#civMdt.phone.home .ph-bar::before{background:rgba(255,255,255,.3)}
#civMdt.phone .ph-back{display:inline-flex;align-items:center;gap:2px;margin:0 0 -6px 14px;padding:4px 8px 0;font-size:13px;font-weight:500;color:var(--fd);background:none;border:0;cursor:pointer}
#civMdt.phone.home .ph-back{visibility:hidden}
/* the apps at phone width */
#civMdt.phone .thead{flex-wrap:wrap;gap:8px}
#civMdt.phone .cv-form .grid3{grid-template-columns:1fr 1fr}
#civMdt.phone .cv-car .cv-pills{order:3;flex-basis:100%;padding-left:0}
@media (max-width:760px){#civMdt.phone{width:100vw}#civMdt.phone .tablet{aspect-ratio:auto;height:100%;border-radius:0;padding:0;box-shadow:none}
  #civMdt.phone .tablet .screen{border-radius:0}#civMdt.phone .tablet .cam{display:none}#civMdt.phone .sbar{padding:10px 18px 6px;min-height:0}}
@media (prefers-reduced-motion:reduce){#civMdt.phone .tside,#civMdt.phone.home .tside{transition:none;transform:none}}`;
  document.head.appendChild(css);
  page.classList.add('phone', 'home');
  const screen = page.querySelector('.screen'), screens = page.querySelector('.tscreens');
  const bar = document.createElement('button'); bar.type = 'button'; bar.className = 'ph-bar'; bar.setAttribute('aria-label', 'Home screen');
  screen.appendChild(bar);
  const back = document.createElement('button'); back.type = 'button'; back.className = 'ph-back'; back.innerHTML = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="m15 18-6-6 6-6"/></svg>Apps';
  screens.parentNode.insertBefore(back, screens);
  // the back link sits above the open app, so the app starts a little lower
  const fit = () => { screens.style.top = page.classList.contains('home') ? '' : (back.offsetHeight + 2) + 'px'; };
  const home = v => { page.classList.toggle('home', v); fit(); };
  tabs.addEventListener('click', e => { if (e.target.closest('[data-p]')) home(false); });
  bar.addEventListener('click', () => home(true)); back.addEventListener('click', () => home(true));
  page.addEventListener('keydown', e => { if (e.key === 'Escape' && !page.classList.contains('home') && !e.target.closest('input,textarea,select,dialog')) { e.stopPropagation(); home(true); } });
  // opening the Civilian tab starts on the home screen
  document.querySelector('.menu [data-view="civ"]')?.addEventListener('click', () => home(true));
  fit();
})();
