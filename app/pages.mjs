// Server-rendered pages around the live map: landing, dashboard, community settings, invites. Same visual language as the map.
export const esc = t => String(t ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const CSS = `
:root{color-scheme:dark;--ink:#F0F2F5;--dim:#9A9EA6;--faint:#62666D;--hair:rgba(240,242,245,.08);--hair2:rgba(240,242,245,.14);--panel:rgba(16,16,18,.78);--field:rgba(255,255,255,.04);--acc:#4C8DFF;--ok:#46D07C;--warn:#E9B04C;--bad:#E24B4B}
*{box-sizing:border-box}html,body{margin:0;min-height:100%}
body{font:14px/1.5 "Geist",system-ui,-apple-system,"Segoe UI",sans-serif;color:var(--ink);background:#0d1416;-webkit-font-smoothing:antialiased}
.bg{position:fixed;inset:0;z-index:-1;background:#386069 url(/liberty-county.jpg) center/cover no-repeat;filter:brightness(.42) saturate(.85)}
.bg::after{content:"";position:absolute;inset:0;background:radial-gradient(ellipse at 50% 30%,rgba(11,11,12,.25),rgba(11,11,12,.85))}
a{color:inherit}
.top{display:flex;align-items:center;gap:12px;padding:16px 24px;max-width:1180px;margin:0 auto}
.brand{display:flex;align-items:center;gap:10px;text-decoration:none;font-weight:600;letter-spacing:-.01em}
.brand i{width:30px;height:30px;border-radius:9px;background:rgba(28,28,31,.8);border:1px solid var(--hair);display:grid;place-items:center}.brand img{width:17px;height:17px}
.top .sp{flex:1}
.who{display:flex;align-items:center;gap:8px;font-size:13px;color:var(--dim);text-decoration:none;padding:3px 10px 3px 3px;border-radius:999px;transition:background .15s,color .15s}.who:hover{background:rgba(255,255,255,.06);color:var(--ink)}
.sp-head{display:flex;align-items:center;gap:16px;margin:4px 0 14px}
.sp-icon{position:relative;width:76px;height:76px;flex:none;border-radius:18px;border:1px solid var(--hair2);background:linear-gradient(160deg,#2d3440,#1b1f26);color:var(--ink);font:600 28px/1 inherit;cursor:pointer;padding:0;overflow:hidden;display:grid;place-items:center}
.sp-icon img{position:absolute;inset:0;width:100%;height:100%;object-fit:cover}
.sp-icon i{position:absolute;inset:auto 0 0;font:500 10.5px/1 inherit;font-style:normal;padding:5px 0;background:rgba(0,0,0,.62);opacity:0;transition:opacity .15s}
.sp-icon:hover i,.sp-icon:focus-visible i{opacity:1}
.sp-id{min-width:0}.sp-id b{display:block;font-size:16px;font-weight:600}.sp-id small{display:block;color:var(--dim);font-size:12.5px;margin-top:2px}
.sp-erlc{border:1px solid var(--hair);border-radius:12px;padding:12px 14px;background:rgba(255,255,255,.02);margin-bottom:4px}
.sp-erlch{display:flex;justify-content:space-between;align-items:center;font-size:11px;letter-spacing:.06em;text-transform:uppercase;color:var(--faint)}
.sp-erlch .lnk{background:none;border:0;color:var(--dim);font:inherit;font-size:11.5px;letter-spacing:0;text-transform:none;cursor:pointer;padding:0;text-decoration:underline;text-underline-offset:3px}
.sp-facts{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px 16px;margin-top:10px}
.sp-facts small{display:block;color:var(--faint);font-size:11px}.sp-facts b{display:block;font-size:13px;font-weight:500;margin-top:2px;overflow-wrap:anywhere}
.sp-facts code{font-family:ui-monospace,"Geist Mono",monospace;font-size:12.5px}
.sp-inv{display:flex;align-items:center;background:var(--field);border:1px solid var(--hair2);border-radius:10px;transition:border-color .15s}.sp-inv:focus-within{border-color:rgba(240,242,245,.45)}
.sp-inv span{padding:0 0 0 12px;color:var(--faint);white-space:nowrap}.sp-inv input{border:0;background:none;padding-left:1px}
.sp-who{display:inline-flex;align-items:center;gap:6px}.sp-who img{width:18px;height:18px;border-radius:50%;background:#2a2d33}
#spForm textarea{width:100%;resize:vertical;min-height:72px}
label.chk{display:flex;align-items:center;gap:8px;margin-top:14px;font-size:13px;color:var(--dim);cursor:pointer}label.chk input{width:auto;margin:0}
.acct{max-width:980px}.prof{display:flex;align-items:center;gap:18px;margin:0 0 26px}.prof .pic{width:84px;height:84px;border-radius:50%;flex:none;background:#2a2d33 center/cover;border:1px solid var(--hair2);display:grid;place-items:center;font-size:30px;font-weight:600;overflow:hidden}.prof .pic{position:relative}.prof .pic img{position:absolute;inset:0;width:100%;height:100%;object-fit:cover}
.prof h1{margin:0}.prof p{margin:4px 0 0;color:var(--dim);font-size:13.5px}
.lrow{display:flex;align-items:center;gap:12px;padding:12px 0;border-top:1px solid var(--hair)}.lrow:first-of-type{border-top:0}.lrow .tx{flex:1;min-width:0}.lrow b{display:block;font-size:14px;font-weight:600}.lrow small{color:var(--dim);font-size:12.5px}
.lrow .ico{width:34px;height:34px;border-radius:10px;display:grid;place-items:center;flex:none;background:rgba(255,255,255,.06)}.who img,.who .av{width:26px;height:26px;border-radius:50%;object-fit:cover;background:#2a2d33;display:grid;place-items:center;font-size:11px;color:var(--ink)}
main{max-width:1180px;margin:0 auto;padding:8px 24px 64px}
h1{font-size:28px;font-weight:300;letter-spacing:-.02em;margin:18px 0 4px}h1 b{font-weight:600}
h2{font-size:15px;font-weight:600;margin:0 0 4px;letter-spacing:-.005em}
.lead{color:var(--dim);margin:0 0 22px;max-width:62ch}
.grid{display:grid;grid-template-columns:minmax(0,1.6fr) minmax(0,1fr);gap:18px;align-items:start}
@media (max-width:880px){.grid{grid-template-columns:1fr}}
.card{background:var(--panel);border:1px solid var(--hair);border-radius:16px;padding:18px;backdrop-filter:blur(18px);-webkit-backdrop-filter:blur(18px)}
.card+.card{margin-top:18px}
.card p.note{color:var(--dim);margin:2px 0 14px;font-size:13px}
.row{display:flex;align-items:center;gap:12px;flex-wrap:wrap}
.comm{display:flex;align-items:center;gap:14px;padding:12px;border-radius:12px;border:1px solid var(--hair);background:rgba(255,255,255,.02);text-decoration:none}
.comm+.comm{margin-top:10px}.comm:hover{border-color:var(--hair2);background:rgba(255,255,255,.04)}
.comm .ic{width:38px;height:38px;border-radius:11px;background:linear-gradient(160deg,#2d3440,#1b1f26);display:grid;place-items:center;font-weight:600;font-size:15px;flex:none}
.comm .tx{flex:1;min-width:0}.comm b{display:block;font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.comm small{display:block;color:var(--dim);font-size:12px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.tag{font-size:11px;padding:2px 8px;border-radius:999px;border:1px solid var(--hair2);color:var(--dim);white-space:nowrap}
.tag.ok{color:var(--ok);border-color:rgba(70,208,124,.35)}.tag.warn{color:var(--warn);border-color:rgba(233,176,76,.35)}
label{display:block;font-size:12px;color:var(--dim);margin:12px 0 6px}
input,select,textarea{width:100%;font:inherit;color:var(--ink);background:var(--field);border:1px solid var(--hair2);border-radius:10px;padding:10px 12px;outline:none;transition:border-color .15s}
input:focus,select:focus,textarea:focus{border-color:rgba(240,242,245,.45)}
select{appearance:none;background-image:linear-gradient(45deg,transparent 50%,var(--dim) 50%),linear-gradient(135deg,var(--dim) 50%,transparent 50%);background-position:calc(100% - 16px) 50%,calc(100% - 11px) 50%;background-size:5px 5px;background-repeat:no-repeat;padding-right:30px}
.hint{font-size:12px;color:var(--faint);margin-top:6px}
.btn{display:inline-flex;align-items:center;justify-content:center;gap:8px;font:inherit;font-weight:500;font-size:13.5px;padding:9px 16px;border-radius:999px;border:1px solid var(--hair2);background:rgba(255,255,255,.06);color:var(--ink);cursor:pointer;text-decoration:none;white-space:nowrap;transition:background .15s,transform .1s}
.btn:hover{background:rgba(255,255,255,.1)}.btn:active{transform:scale(.98)}.btn[disabled]{opacity:.5;pointer-events:none}
.btn.pri{background:#F0F2F5;color:#0B0B0C;border-color:#F0F2F5}.btn.pri:hover{background:#fff}
.btn.discord{background:#5865F2;border-color:#5865F2;color:#fff}.btn.discord:hover{background:#6873f5}
.btn.roblox{width:100%;padding:12px 16px;font-weight:600;background:#F0F2F5;color:#0B0B0C;border-color:#F0F2F5}.btn.roblox:hover{background:#fff}
.btn.danger{color:#F3A3A3;border-color:rgba(226,75,75,.4)}.btn.danger:hover{background:rgba(226,75,75,.12)}
.btn.sm{padding:6px 12px;font-size:12.5px}
.msg{font-size:13px;margin-top:10px;min-height:1em}.msg:empty{display:none}.msg.ok{color:var(--ok)}.msg.err{color:#F3A3A3}
.link1{max-width:560px}.link1 .lead{max-width:none}
.phrase{font:500 15px/1.4 ui-monospace,"Geist Mono",monospace;background:rgba(255,255,255,.05);border:1px dashed var(--hair2);border-radius:10px;padding:12px;margin:8px 0;user-select:all}
table{width:100%;border-collapse:collapse;font-size:13px}td,th{text-align:left;padding:9px 6px;border-top:1px solid var(--hair)}th{color:var(--faint);font-weight:500;font-size:12px;border-top:0}
td select{padding:6px 28px 6px 10px;font-size:12.5px;width:auto}
.cols{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:12px}@media (max-width:700px){.cols{grid-template-columns:1fr}}
.dept{border:1px solid var(--hair);border-radius:12px;padding:12px}.dept h3{margin:0 0 2px;font-size:13px;display:flex;align-items:center;gap:8px}.dept h3 i{width:9px;height:9px;border-radius:50%}
.teams{display:grid;grid-template-columns:1fr 1fr;gap:8px 12px;align-items:center}.teams span{font-size:13px}
.hero{min-height:calc(100dvh - 70px);display:grid;place-items:center;padding:24px}
.hero .box{width:min(460px,100%);text-align:center}
.hero .mark{width:52px;height:52px;border-radius:15px;background:rgba(28,28,31,.8);border:1px solid var(--hair);display:grid;place-items:center;margin:0 auto 20px}.hero .mark img{width:28px;height:28px}
.hero h1{font-size:34px;margin:0 0 8px}.hero .lead{margin:0 auto 26px}
.hero .actions{display:grid;gap:10px}
.hero.wide .box{width:min(820px,100%)}
.hero.notop{min-height:100dvh}
.paths{display:grid;grid-template-columns:1fr 1fr;gap:16px;text-align:left;align-items:start}.paths .card+.card{margin-top:0}.path{display:grid;gap:10px;align-content:start}.path h2{margin:0}.path .note{margin:0 0 4px}.path .hint{margin:-4px 0 0}.path .hint.addr{margin-top:-4px}
@media (max-width:720px){.paths{grid-template-columns:1fr}}
.or{display:flex;align-items:center;gap:10px;color:var(--faint);font-size:12px;margin:8px 0}.or::before,.or::after{content:"";flex:1;height:1px;background:var(--hair)}
.feats{display:grid;grid-template-columns:repeat(3,1fr);gap:10px;margin-top:30px;text-align:left}.feats div{font-size:12.5px;color:var(--dim)}.feats b{display:block;color:var(--ink);font-weight:500;margin-bottom:2px}
@media (max-width:520px){.feats{grid-template-columns:1fr}}
.danger-zone{border-color:rgba(226,75,75,.25)}
.dg-head{display:flex;align-items:center;gap:12px;padding:12px;border:1px solid var(--hair);border-radius:12px;background:rgba(255,255,255,.02);margin-bottom:14px}
.dg-head img,.dg-head .gi{width:36px;height:36px;border-radius:10px;background:#5865F2;display:grid;place-items:center;font-weight:600;flex:none}
.dg-head b{display:block}.dg-head small{color:var(--dim);font-size:12px}.dg-head .sp{flex:1}
.dg-lvl{margin-top:14px}.dg-lvl h3{margin:0 0 2px;font-size:13px}.dg-lvl p{margin:0 0 8px;font-size:12px;color:var(--dim)}
.dg-roles{display:flex;flex-wrap:wrap;gap:6px}
.dg-role{display:inline-flex;align-items:center;gap:7px;font:inherit;font-size:12.5px;padding:6px 11px;border-radius:999px;border:1px solid var(--hair2);background:rgba(255,255,255,.03);color:var(--dim);cursor:pointer;transition:background-color .15s,border-color .15s,color .15s}
.dg-role i{width:9px;height:9px;border-radius:50%;background:var(--c,#99AAB5);flex:none}
.dg-role[aria-pressed="true"]{color:var(--ink);border-color:rgba(240,242,245,.45);background:rgba(255,255,255,.09)}
@media (hover:hover) and (pointer:fine){.dg-role:hover{color:var(--ink)}}

.legal{max-width:780px}.legal .card h2{margin:18px 0 6px}.legal .card h2:first-child{margin-top:0}.legal .card p,.legal .card li{color:#C9CDD3;font-size:14px;line-height:1.65}
.legal ul{padding-left:18px;margin:6px 0}.legal li+li{margin-top:8px}.legal a{color:var(--ink)}
.foot{display:flex;gap:16px;justify-content:center;margin-top:26px;font-size:12px}.foot a{color:var(--faint);text-decoration:none}.foot a:hover{color:var(--dim)}
.srv{display:flex;align-items:center;gap:14px;padding:14px;border-radius:14px;border:1px solid var(--hair);background:rgba(255,255,255,.025)}
.srv+.srv{margin-top:10px}
.srv .ic img{position:absolute;inset:0;width:100%;height:100%;object-fit:cover}
.srv .ic{position:relative;overflow:hidden;width:44px;height:44px;border-radius:12px;background:linear-gradient(160deg,#2d3440,#1b1f26);display:grid;place-items:center;font-weight:600;font-size:17px;flex:none}
.srv .tx{flex:1;min-width:0}.srv b{display:block;font-size:15.5px;font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.srv small{display:flex;align-items:center;gap:7px;color:var(--dim);font-size:12.5px;margin-top:2px;white-space:nowrap}.srv .sep{color:var(--faint)}
.st{width:7px;height:7px;border-radius:50%;flex:none}.st.ok{background:var(--ok);box-shadow:0 0 0 3px rgba(70,208,124,.15)}.st.warn{background:var(--warn);box-shadow:0 0 0 3px rgba(233,176,76,.15)}
.srv .go{display:flex;gap:8px;flex:none}.srv .go .btn{padding:10px 18px}
.btn.ghost{background:transparent}
@media (max-width:620px){.srv{flex-wrap:wrap}.srv .go{width:100%}.srv .go .btn{flex:1}}
.hrow{display:flex;align-items:center;justify-content:space-between;gap:10px}
details.mk{margin-top:14px;border-top:1px solid var(--hair);padding-top:12px}
details.mk summary{cursor:pointer;color:var(--dim);font-size:13px;list-style:none;display:flex;align-items:center;gap:8px;width:max-content}
details.mk summary::-webkit-details-marker{display:none}
details.mk summary::before{content:"";width:6px;height:6px;border-right:1.5px solid currentColor;border-bottom:1.5px solid currentColor;transform:rotate(-45deg);transition:transform .2s cubic-bezier(0.23,1,0.32,1)}
details.mk[open] summary::before{transform:rotate(45deg)}
@media (hover:hover) and (pointer:fine){details.mk summary:hover{color:var(--ink)}}
details.mk[open] summary{margin-bottom:8px;color:var(--ink)}
.invites{margin-top:14px;display:grid;gap:8px}.inv{display:flex;align-items:center;gap:10px;padding:10px 12px;border:1px solid var(--hair);border-radius:12px;background:rgba(255,255,255,.02);min-width:0}
.inv .tx{flex:1;min-width:0}.inv code{display:block;font:12.5px/1.4 ui-monospace,"Geist Mono",monospace;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.inv small{color:var(--dim);font-size:12px}.inv .acts{display:flex;gap:6px;flex:none}
.card{min-width:0}
.empty{color:var(--dim);font-size:13px;padding:6px 0}
/* in-page confirm dialog (replaces the browser's own prompt and confirm boxes) */
.dlg{width:min(420px,calc(100vw - 32px));padding:0;border:1px solid var(--hair2);border-radius:18px;background:rgba(20,21,24,.97);color:var(--ink);box-shadow:0 30px 80px rgba(0,0,0,.55);opacity:0;transform:translateY(8px) scale(.98);transition:opacity .18s,transform .22s cubic-bezier(.32,.72,0,1)}
.dlg[open].in{opacity:1;transform:none}
.dlg::backdrop{background:rgba(6,7,8,.6);backdrop-filter:blur(4px);-webkit-backdrop-filter:blur(4px)}
.dlg form{padding:22px 22px 18px}
.dlg .ic{width:38px;height:38px;border-radius:12px;display:grid;place-items:center;background:rgba(255,255,255,.06);margin-bottom:14px}
.dlg.danger .ic{background:rgba(226,75,75,.14);color:#F3A3A3}
.dlg h2{font-size:17px;margin:0 0 6px}
.dlg p{color:var(--dim);font-size:13.5px;margin:0}
.dlg label{margin:16px 0 6px}.dlg label code{font:500 12.5px ui-monospace,"Geist Mono",monospace;color:var(--ink);background:rgba(255,255,255,.07);padding:2px 6px;border-radius:6px;user-select:all}
.dlg .acts{display:flex;justify-content:flex-end;gap:8px;margin-top:22px}
.btn.dz{background:var(--bad);border-color:var(--bad);color:#fff}.btn.dz:hover{background:#ea5c5c}
@media (prefers-reduced-motion:reduce){*{transition:none!important}}
`;
const JS = `
const api=async(url,body,method='POST')=>{const r=await fetch(url,{method,headers:{'content-type':'application/json','x-oversite':'1'},body:body?JSON.stringify(body):undefined});let j={};try{j=await r.json()}catch(e){}if(!r.ok)throw new Error(j.error||('Something went wrong ('+r.status+')'));return j};
const say=(el,t,ok)=>{el.textContent=t;el.className='msg '+(ok?'ok':'err')};
/* ask({title,text,ok,danger,typed}) shows the site's own dialog and resolves true when confirmed; typed = word the user must type first */
const ask=o=>new Promise(res=>{const d=document.createElement('dialog');d.className='dlg'+(o.danger?' danger':'');
d.innerHTML='<form method="dialog"><div class="ic"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">'+(o.danger?'<path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6M10 11v6M14 11v6"/>':'<circle cx="12" cy="12" r="9"/><path d="M12 8v5M12 16h.01"/>')+'</svg></div><h2></h2><p></p>'+(o.typed?'<label>Type <code></code> to confirm</label><input autocomplete="off" spellcheck="false" autocapitalize="off">':'')+'<div class="acts"><button type="button" class="btn" data-no>Cancel</button><button value="yes" class="btn '+(o.danger?'dz':'pri')+'" data-yes></button></div></form>';
d.querySelector('h2').textContent=o.title;d.querySelector('p').textContent=o.text||'';const y=d.querySelector('[data-yes]');y.textContent=o.ok||'Confirm';
const inp=d.querySelector('input');if(inp){d.querySelector('label code').textContent=o.typed;y.disabled=true;inp.addEventListener('input',()=>{y.disabled=inp.value.trim()!==o.typed})}
d.querySelector('[data-no]').onclick=()=>d.close('no');d.addEventListener('click',e=>{if(e.target===d)d.close('no')});
d.addEventListener('close',()=>{d.classList.remove('in');res(d.returnValue==='yes');setTimeout(()=>d.remove(),200)});
document.body.appendChild(d);d.showModal();requestAnimationFrame(()=>d.classList.add('in'));(inp||d.querySelector('[data-no]')).focus()});
`;
// Opener (preview/intro-splash.js): once per browser session. The cover goes up before first paint so the page never flashes first;
// if the script never arrives the cover lifts by itself.
export const INTRO_HEAD = `<script>try{if(sessionStorage.getItem('ov_intro_seen')!=='1'){const r=document.documentElement;r.classList.add('ov-intro');setTimeout(()=>r.classList.remove('ov-intro'),2500)}}catch(e){}</script><style>html.ov-intro::after{content:"";position:fixed;inset:0;z-index:2147483646;background:#07080A}</style><script src="/intro-splash.js" defer></script>`;
// the five ranks, as people read them
export const RANK_LABEL = { owner: 'Owner', co_owner: 'Co-Owner', admin: 'Admin', mod: 'Mod', member: 'Member', staff: 'Admin' };
const runs = r => r === 'owner' || r === 'co_owner';
export const layout = ({ title, logo, user, body, bg = true, top = true, script = '' }) => `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(title)}</title><link rel="icon" type="image/png" href="data:image/png;base64,${logo}">
<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin><link href="https://fonts.googleapis.com/css2?family=Geist:wght@300;400;500;600&display=swap" rel="stylesheet">
<style>${CSS}</style>${INTRO_HEAD}<script src="/dropdown.js?v=1" defer></script></head><body>${bg ? '<div class="bg"></div>' : ''}
${top ? `<header class="top"><a class="brand" href="${user ? '/dashboard' : '/'}"><i><img src="data:image/png;base64,${logo}" alt=""></i>Oversite</a><span class="sp"></span>
${user ? `<a class="who" href="/account" title="Your account">${user.roblox_id ? `<img src="/rbx/avatar/${esc(user.roblox_id)}" alt="" onerror="this.replaceWith(Object.assign(document.createElement('span'),{className:'av',textContent:${esc(JSON.stringify((user.roblox_name || user.name || '?').slice(0, 1).toUpperCase()))}}))">` : user.avatar ? `<img src="${esc(user.avatar)}" alt="">` : `<span class="av">${esc((user.roblox_name || user.name).slice(0, 1).toUpperCase())}</span>`}${esc(user.roblox_name || user.name)}</a><form method="post" action="/auth/logout" style="margin:0"><button class="btn sm">Sign out</button></form>` : ''}</header>` : ''}
${body}<script>${JS}${script}</script></body></html>`;

export const landing = ({ logo, discord, owner, roblox, next = '/dashboard', error = '' }) => layout({ title: 'Oversite', logo, top: false, body: `
<section class="hero wide notop"><div class="box">
<div class="mark"><img src="data:image/png;base64,${logo}" alt=""></div>
<h1><b>Oversite</b> CAD</h1>
<p class="lead">A live dispatch system for ER:LC private servers. Every unit on a 3D map of Liberty County, live from your server.</p>
<div class="paths">
<form class="card path" id="codeform" autocomplete="off"><h2>Join your server</h2><p class="note">Enter the code your server owner gave you.</p>
<input id="code" placeholder="Server code" aria-label="Server code" autocapitalize="characters" spellcheck="false" required>
<button class="btn pri">Sign in</button><p class="msg" id="codemsg"></p>${roblox ? '<div class="or">already linked Roblox?</div><a class="btn" href="/auth/roblox?next=/dashboard">Sign in with Roblox</a>' : ''}</form>
<form class="card path" id="makeform" autocomplete="off"><h2>Create a server</h2><p class="note">Set up a CAD for your ER:LC server.</p>
<input id="mname" maxlength="48" placeholder="Server name" aria-label="Server name" required>
<input id="mslug" maxlength="32" placeholder="address" aria-label="Address" required><p class="hint addr">oversitescad.com/c/<span id="slugp">your-server</span></p>
<input id="mcode" maxlength="24" placeholder="Your owner code" aria-label="Owner code" spellcheck="false" required><p class="hint">2 to 24 letters or numbers. You sign in with it, so keep it private.</p>
<button class="btn pri">Create server</button><p class="msg" id="makemsg"></p></form>
</div>
${discord ? `<div class="or">or</div><a class="btn discord" href="/auth/discord?next=${encodeURIComponent(next)}">Continue with Discord</a>` : ''}
${owner ? `<form method="post" action="/auth/owner" class="row" style="justify-content:center;margin-top:14px" autocomplete="off"><input type="hidden" name="next" value="${esc(next)}"><input name="code" inputmode="numeric" placeholder="Site owner code" aria-label="Site owner code" style="max-width:200px" required><button class="btn sm">Sign in</button></form>` : ''}
${error ? `<p class="msg err">${esc(error)}</p>` : ''}
<div class="feats"><div><b>Live map</b>Units move on the map as they drive in game.</div><div><b>Real 911 calls</b>Calls from the game land on the dispatch board.</div><div><b>Department MDTs</b>Each team gets its own MDT, locked to its members.</div></div>
<nav class="foot"><a href="/privacy">Privacy</a><a href="https://www.oversite.shop/terms">Terms</a><a href="https://www.oversite.shop">Oversite</a></nav></div></section>`, script: `
const go=async(url,body,m)=>{try{const j=await api(url,body);location.href=j.next}catch(x){say(m,x.message)}};
document.getElementById('codeform').addEventListener('submit',e=>{e.preventDefault();go('/auth/code',{code:document.getElementById('code').value},document.getElementById('codemsg'))});
const mn=document.getElementById('mname'),ms=document.getElementById('mslug'),sp=document.getElementById('slugp');let touched=false;
const slugify=s=>s.toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-+|-+$/g,'').slice(0,32);
mn.addEventListener('input',()=>{if(!touched){ms.value=slugify(mn.value);sp.textContent=ms.value||'your-server'}});
ms.addEventListener('input',()=>{touched=true;ms.value=slugify(ms.value);sp.textContent=ms.value||'your-server'});
document.getElementById('makeform').addEventListener('submit',e=>{e.preventDefault();go('/auth/create',{name:mn.value.trim(),slug:ms.value,ownerCode:document.getElementById('mcode').value},document.getElementById('makemsg'))});
` });

// Privacy policy for the CAD (oversitescad.com). Public, outside the preview lock, so Roblox and Discord can link to it. Terms live on the marketing site.
export const privacy = ({ logo, user }) => layout({ title: 'Privacy · Oversite CAD', logo, user, body: `
<main class="legal"><h1><b>Privacy</b> policy</h1><p class="lead">Oversite CAD · oversitescad.com · Effective October 9, 2026</p>
<section class="card">
<h2>Who we are</h2><p>Oversite CAD is a live dispatch system for Emergency Response: Liberty County (ER:LC) private servers, run by Oversite (Oversite Marketplace, Minnesota, United States). Questions go to <a href="mailto:support@oversite.shop">support@oversite.shop</a>. Use of the site is also covered by our <a href="https://www.oversite.shop/terms">Terms of Service</a>.</p>
<h2>What we collect</h2>
<ul>
<li><b>Your account.</b> A display name, and the servers you belong to with your role in each (owner, staff or member).</li>
<li><b>Roblox, when you link it.</b> When you choose "Link with Roblox" you sign in on roblox.com and Roblox sends us your Roblox user ID, username, display name and avatar picture. We never see your Roblox password. We use this to show you on your server's map and open your department's MDT.</li>
<li><b>Discord, if you use it.</b> Your Discord user ID, name and avatar, and the Roblox account you have verified in Discord's Connections.</li>
<li><b>Server settings.</b> For server owners: the server name, address, departments, server codes (stored only as one-way hashes), invite links and the ER:LC server key, which is stored encrypted and never shown to members.</li>
<li><b>Live game data.</b> While a server's CAD is open, we read player names, teams, callsigns, vehicles, positions and 911 calls from the ER:LC API to draw the map. This is kept in memory only; a player's recent route (the last 15 minutes) is used for smooth movement and is not saved.</li>
<li><b>Cookies.</b> A sign-in cookie (lasts 30 days), a short-lived cookie that protects the Roblox and Discord sign-in steps, and the preview access cookie. No advertising or tracking cookies.</li>
</ul>
<h2>How we use it</h2><p>Only to run the CAD: signing you in, showing your servers, placing you and your unit on the map, and letting owners manage their server. We do not sell your information, show ads, or share it with anyone except the services that make the CAD work (Roblox, Discord and the ER:LC API) and our hosting provider.</p>
<h2>Keeping and deleting</h2><p>Your account stays until you ask us to delete it. You can unlink Roblox from your dashboard at any time. When an owner deletes a server, its settings, codes, invites and member list are deleted with it. To delete your account or get a copy of your information, email <a href="mailto:support@oversite.shop">support@oversite.shop</a>.</p>
<h2>Children</h2><p>Oversite CAD is for ER:LC communities and follows Roblox's own age rules. We collect only what is listed above and never ask for real names, addresses or payment details.</p>
<h2>Changes</h2><p>If this policy changes, the new version is posted here with a new effective date.</p>
</section></main>` });

export const dashboard = ({ logo, user, comms, discordLinkable, pending, welcome, discord, robloxOAuth }) => { const rbx = `<section class="card" id="rbx"><h2 class="hrow">Your Roblox account${user.roblox_name ? '<span class="tag ok">Linked</span>' : '<span class="tag warn">Not linked</span>'}</h2>
${user.roblox_name ? `<p class="note">Linked to <b>${esc(user.roblox_name)}</b>${user.roblox_via === 'discord' ? ', the Roblox account verified on your Discord' : user.roblox_via === 'oauth' ? ', confirmed by Roblox' : ''}. Your servers use this to find you in game and open your department's MDT.</p>${user.roblox_via === 'discord' ? '<p class="hint" style="margin:-6px 0 0">To change it, change the Roblox connection in Discord and sign in with Discord again.</p>' : '<button class="btn sm" id="unlink">Unlink</button>'}`
: robloxOAuth ? `<p class="note">The CAD uses it to find you on the map and open your department\'s MDT.</p><a class="btn roblox" id="rlink" href="/auth/roblox?next=/dashboard">Link with Roblox</a><p class="msg" id="rlmsg"></p><p class="hint" style="margin:10px 0 0">You sign in on roblox.com and pick your account there, so it is always the right one. Oversite only sees your username and avatar.</p>${discord ? '<a class="btn discord sm" href="/auth/discord?next=/dashboard" style="margin-top:12px">Or use the Roblox account on my Discord</a>' : ''}<details class="mk"><summary>Roblox sign-in not working? Verify with your profile instead</summary><p class="note">Type your username, then add a short phrase to your Roblox profile so we can confirm it is yours.</p><form id="rstart" autocomplete="off"><input id="ruser" placeholder="Your Roblox username" aria-label="Roblox username" required><div class="row" style="margin-top:10px"><button class="btn">Continue</button></div><p class="msg" id="rmsg"></p></form></details>`
: pending ? `<p class="note">Add this phrase anywhere in the <b>About</b> section of <a href="https://www.roblox.com/users/${esc(pending.roblox_id)}/profile" target="_blank" rel="noopener">${esc(pending.roblox_name)}'s profile</a>, save, then press Verify. You can remove it afterwards.</p>
<div class="phrase">${esc(pending.phrase)}</div><div class="row"><button class="btn pri" id="verify">Verify</button><button class="btn sm" id="restart">Use a different account</button></div><p class="msg" id="rmsg"></p>`
: `<p class="note">The CAD uses it to find you on the map and open your department\'s MDT. No password needed.</p>${discord ? `<a class="btn discord" href="/auth/discord?next=/dashboard" style="width:100%">Use the Roblox account on my Discord</a><p class="hint" style="margin:8px 0 2px">Works if Roblox is connected in Discord (Settings, Connections). Or link it here:</p>` : ''}<form id="rstart" autocomplete="off"><label for="ruser">Roblox username</label><input id="ruser" placeholder="Your Roblox username" required><div class="row" style="margin-top:12px"><button class="btn pri">Continue</button></div><p class="msg" id="rmsg"></p></form>`}
</section>`;
  return layout({ title: user.roblox_name ? 'Dashboard · Oversite' : 'Link your Roblox account · Oversite', logo, user, body: user.roblox_name ? `
<main class="dash"><h1>Welcome back, <b>${esc(user.roblox_name || user.name)}</b></h1><p class="lead">${comms.length ? (comms.length === 1 ? 'Open your CAD below.' : 'Pick a server to open its CAD.') : 'Join your server with the code from its owner, or create a new one.'}</p>
<div class="grid"><div>
${comms.length ? `<section class="card"><h2>Your servers</h2>
${comms.map(c => { const admin = runs(c.role), setup = !c.connected && admin, role = RANK_LABEL[c.role] || c.role;
  return `<div class="srv"><span class="ic">${esc(c.name.slice(0, 1).toUpperCase())}<img src="/c/${esc(c.slug)}/icon" alt="" loading="lazy" onerror="this.remove()"></span><div class="tx"><b title="oversitescad.com/c/${esc(c.slug)}">${esc(c.name)}</b>
<small><i class="st ${c.connected ? 'ok' : 'warn'}"></i>${c.connected ? 'Live data connected' : 'ER:LC not connected yet'}<span class="sep">·</span>${role}</small></div>
<div class="go">${admin ? `<a class="btn ghost" href="/c/${esc(c.slug)}/settings">Settings</a>` : ''}${setup ? `<a class="btn ghost" href="/c/${esc(c.slug)}">Open CAD</a><a class="btn pri" href="/c/${esc(c.slug)}/settings">Connect ER:LC</a>` : `<a class="btn pri" href="/c/${esc(c.slug)}">Open CAD<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6"/></svg></a>`}</div></div>`; }).join('')}
</section>` : ''}
<section class="card"><h2>${comms.length ? 'Add another server' : 'Get started'}</h2><p class="note">${comms.length ? 'Got a code from another server owner? Enter it here.' : 'Enter the server code your server owner gave you.'}</p>
<form id="join" class="row" autocomplete="off" style="flex-wrap:nowrap"><input id="jcode" placeholder="Server code" aria-label="Server code" spellcheck="false" required><button class="btn pri">Join</button></form><p class="msg" id="jmsg"></p>
<details class="mk"${comms.length ? '' : ' open'}><summary>Create a new server instead</summary><p class="note">One per ER:LC server. Members join with the member code you get afterwards.</p>
<form id="create" autocomplete="off"><label for="cname">Server name</label><input id="cname" maxlength="48" placeholder="Liberty County Roleplay" required>
<label for="cslug">Address</label><input id="cslug" maxlength="32" pattern="[a-z0-9-]{3,32}" placeholder="liberty-county" required><p class="hint">oversitescad.com/c/<span id="slugp">liberty-county</span></p>
<label for="ccode">Owner code</label><input id="ccode" maxlength="24" placeholder="2 to 24 letters or numbers" spellcheck="false" required><p class="hint">You sign in with it, so keep it private.</p>
<div class="row" style="margin-top:14px"><button class="btn pri">Create server</button></div><p class="msg" id="cmsg"></p></form></details></section>
</div><div>
${rbx}${discordLinkable ? `<section class="card"><h2>Discord</h2><p class="note">You signed in with the owner code. Link Discord so you can sign in with it from now on.</p><a class="btn discord" href="/auth/discord?next=/dashboard">Link Discord</a></section>` : ''}
</div></div></main>` : `
<main class="dash link1"><h1>Link your <b>Roblox account</b></h1><p class="lead">${welcome ? `You're in <b>${esc(welcome.name)}</b>. ` : ''}Every Oversite CAD needs to know which Roblox player you are. It's how the CAD finds you in game and opens your department's MDT, and every staff action is signed with your Roblox name. You only do this once.</p>
${rbx}
${comms.length ? `<p class="hint" style="margin-top:14px">Your servers: ${comms.map(c => esc(c.name)).join(', ')}. They open as soon as you're linked.</p>` : ''}
</main>`, script: `
if(document.getElementById('create')){const cn=document.getElementById('cname'),cs=document.getElementById('cslug'),sp=document.getElementById('slugp');let touched=false;
const slugify=s=>s.toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-+|-+$/g,'').slice(0,32);
cn.addEventListener('input',()=>{if(!touched){cs.value=slugify(cn.value);sp.textContent=cs.value||'liberty-county'}});
cs.addEventListener('input',()=>{touched=true;cs.value=slugify(cs.value);sp.textContent=cs.value||'liberty-county'});
document.getElementById('create').addEventListener('submit',async e=>{e.preventDefault();const m=document.getElementById('cmsg');try{const j=await api('/api/communities',{name:cn.value.trim(),slug:cs.value,ownerCode:document.getElementById('ccode').value});location.href='/c/'+j.slug+'/settings?new=1'}catch(x){say(m,x.message)}});
document.getElementById('join').addEventListener('submit',async e=>{e.preventDefault();try{const j=await api('/auth/code',{code:document.getElementById('jcode').value});location.href=j.next}catch(x){say(document.getElementById('jmsg'),x.message)}});}
const rs=document.getElementById('rstart');if(rs)rs.addEventListener('submit',async e=>{e.preventDefault();const m=document.getElementById('rmsg');try{await api('/api/roblox/start',{username:document.getElementById('ruser').value});location.reload()}catch(x){say(m,x.message)}});
const v=document.getElementById('verify');if(v)v.addEventListener('click',async()=>{const m=document.getElementById('rmsg');v.disabled=true;try{await api('/api/roblox/verify');location.reload()}catch(x){say(m,x.message);v.disabled=false}});
const re=document.getElementById('restart');if(re)re.addEventListener('click',async()=>{await api('/api/roblox/cancel');location.reload()});
const rl=document.getElementById('rlink');if(rl)rl.addEventListener('click',e=>{const w=window.open('/auth/roblox?next=/auth/roblox/done','ov_roblox');if(!w)return;e.preventDefault();rl.textContent='Waiting for Roblox…';say(document.getElementById('rlmsg'),'Finish in the Roblox tab. It closes by itself once you are verified.',true);
const t=setInterval(()=>{if(w.closed){clearInterval(t);location.reload()}},800)});
addEventListener('message',e=>{if(e.origin===location.origin&&e.data&&e.data.ov==='roblox-linked')location.reload()});
const ul=document.getElementById('unlink');if(ul)ul.addEventListener('click',async()=>{if(!await ask({title:'Unlink your Roblox account?',text:'Your name on the CAD goes back to your sign-in name until you link again.',ok:'Unlink'}))return;await api('/api/roblox/unlink');location.reload()});
` }); };

// the person's own account: who they are, what is linked, the servers they belong to
export const account = ({ logo, user, comms, discord, back }) => layout({ title: 'Your account · Oversite', logo, user, body: `
<main class="acct">${back ? `<div class="row" style="margin:0 0 18px"><a class="btn sm" href="${esc(back)}">&larr; Back to the CAD</a></div>` : ''}
<div class="prof"><span class="pic">${esc((user.roblox_name || user.name || '?').slice(0, 1).toUpperCase())}${user.roblox_id ? `<img src="/rbx/avatar/${esc(user.roblox_id)}" alt="" onerror="this.remove()">` : ''}</span>
<div><h1><b>${esc(user.roblox_name || user.name)}</b></h1><p>${comms.length ? `Member of ${comms.length} server${comms.length === 1 ? '' : 's'}` : 'Not in any server yet'}${user.discord_id ? ' · Signs in with Discord' : ''}</p></div></div>
<div class="grid"><div>
${(() => { const row = c => { const owner = c.role === 'owner';
  return `<div class="srv"><span class="ic">${esc(c.name.slice(0, 1).toUpperCase())}<img src="/c/${esc(c.slug)}/icon" alt="" loading="lazy" onerror="this.remove()"></span><div class="tx"><b>${esc(c.name)}</b><small>${esc(RANK_LABEL[c.role] || c.role)}</small></div>
<div class="go">${runs(c.role) ? `<a class="btn ghost" href="/c/${esc(c.slug)}/settings">Server settings</a>` : ''}${owner ? '' : `<button class="btn ghost" data-leave="${esc(c.slug)}" data-name="${esc(c.name)}">Leave</button>`}<a class="btn pri" href="/c/${esc(c.slug)}">Open CAD</a></div></div>`; };
  const mine = comms.filter(c => c.role === 'owner'), joined = comms.filter(c => c.role !== 'owner');
  return `<section class="card"><h2>Your servers</h2>${mine.length ? mine.map(row).join('') : '<p class="note">You don\'t own a server yet.</p>'}
<details class="mk"${mine.length ? '' : ' open'}><summary>Make a new server</summary><p class="note">One per ER:LC server. Members join with the member code you get afterwards.</p>
<form id="create" autocomplete="off"><label for="cname">Server name</label><input id="cname" maxlength="48" placeholder="Liberty County Roleplay" required>
<label for="cslug">Address</label><input id="cslug" maxlength="32" pattern="[a-z0-9-]{3,32}" placeholder="liberty-county" required><p class="hint">oversitescad.com/c/<span id="slugp">liberty-county</span></p>
<label for="ccode">Owner code</label><input id="ccode" maxlength="24" placeholder="2 to 24 letters or numbers" spellcheck="false" required><p class="hint">You sign in with it, so keep it private.</p>
<div class="row" style="margin-top:14px"><button class="btn pri">Create server</button></div><p class="msg" id="cmsg"></p></form></details></section>
<section class="card" style="margin-top:18px"><h2>Joined servers</h2>${joined.length ? joined.map(row).join('') : '<p class="note">You haven\'t joined anyone else\'s server yet.</p>'}
<details class="mk"${joined.length ? '' : ' open'}><summary>Join another server</summary><p class="note">Enter the server code its owner gave you.</p>
<form id="join" class="row" autocomplete="off" style="flex-wrap:nowrap"><input id="jcode" placeholder="Server code" aria-label="Server code" spellcheck="false" required><button class="btn pri">Join</button></form><p class="msg" id="jmsg"></p></details>
<p class="msg" id="lmsg"></p></section>`; })()}
</div><div>
<section class="card"><h2>Linked accounts</h2>
<div class="lrow"><span class="ico"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="4" y="4" width="16" height="16" rx="2" transform="rotate(15 12 12)"/><rect x="10" y="10" width="4" height="4" transform="rotate(15 12 12)"/></svg></span><div class="tx"><b>Roblox</b><small>${user.roblox_name ? `${esc(user.roblox_name)}${user.roblox_via === 'oauth' ? ', confirmed by Roblox' : user.roblox_via === 'discord' ? ', from your Discord' : user.roblox_via === 'profile' ? ', verified on your profile' : ''}` : 'Not linked'}</small></div>
${user.roblox_name ? `<button class="btn sm" id="switch">Switch</button>` : `<a class="btn sm pri" href="/dashboard#rbx">Link</a>`}</div>
<div class="lrow"><span class="ico" style="color:#8E97FF"><svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M19.6 5.4A17 17 0 0 0 15.4 4l-.5 1a15.6 15.6 0 0 0-5.8 0L8.6 4a17 17 0 0 0-4.2 1.4C1.8 9.4 1 13.3 1.4 17.1A17 17 0 0 0 6.6 20l1.1-1.8c-.6-.2-1.2-.5-1.7-.9l.4-.3a12.2 12.2 0 0 0 11.2 0l.4.3c-.5.4-1.1.7-1.7.9l1.1 1.8a17 17 0 0 0 5.2-2.9c.5-4.4-.8-8.3-2.9-11.7zM8.7 14.8c-1 0-1.9-1-1.9-2.1s.8-2.1 1.9-2.1 1.9 1 1.9 2.1-.8 2.1-1.9 2.1zm6.6 0c-1 0-1.9-1-1.9-2.1s.8-2.1 1.9-2.1 1.9 1 1.9 2.1-.8 2.1-1.9 2.1z"/></svg></span><div class="tx"><b>Discord</b><small>${user.discord_id ? `Connected as ${esc(user.name)}` : 'Not connected. Lets you sign in with Discord and get staff roles from your server\'s Discord.'}</small></div>
${user.discord_id ? '<span class="tag ok">Connected</span>' : discord ? `<a class="btn sm discord" href="/auth/discord?next=/account">Connect</a>` : ''}</div>
</section>
<section class="card"><h2>Sign out</h2><p class="note">Signs you out on this device. You'll need your sign-in again to get back in.</p><form method="post" action="/auth/logout" style="margin:0"><button class="btn danger">Sign out</button></form></section>
</div></div></main>`, script: `
const cn=document.getElementById('cname'),cs=document.getElementById('cslug'),sp=document.getElementById('slugp');let touched=false;
const slugify=x=>x.toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-+|-+$/g,'').slice(0,32);
cn.addEventListener('input',()=>{if(!touched){cs.value=slugify(cn.value);sp.textContent=cs.value||'liberty-county'}});
cs.addEventListener('input',()=>{touched=true;cs.value=slugify(cs.value);sp.textContent=cs.value||'liberty-county'});
document.getElementById('create').addEventListener('submit',async e=>{e.preventDefault();try{const j=await api('/api/communities',{name:cn.value.trim(),slug:cs.value,ownerCode:document.getElementById('ccode').value});location.href='/c/'+j.slug+'/settings?new=1'}catch(x){say(document.getElementById('cmsg'),x.message)}});
document.getElementById('join').addEventListener('submit',async e=>{e.preventDefault();try{await api('/auth/code',{code:document.getElementById('jcode').value});location.reload()}catch(x){say(document.getElementById('jmsg'),x.message)}});
const sw=document.getElementById('switch');if(sw)sw.addEventListener('click',async()=>{if(!await ask({title:'Switch Roblox account?',text:'This unlinks your current Roblox account. You will need to link one again before you can open a CAD.',ok:'Unlink and switch'}))return;await api('/api/roblox/unlink');location.href='/dashboard#rbx'});
document.addEventListener('click',async e=>{const b=e.target.closest('[data-leave]');if(!b)return;if(!await ask({title:'Leave '+b.dataset.name+'?',text:'You lose access to its CAD until someone gives you a code or invite again.',ok:'Leave',danger:true}))return;try{await api('/api/leave',{slug:b.dataset.leave});location.reload()}catch(x){say(document.getElementById('lmsg'),x.message)}});
` });

const COL = { pd: '#4C8DFF', fd: '#E24B4B', dot: '#E9C24C' };
export const settings = ({ logo, user, c, role, keyStatus, invites, members, origin, isNew, codes, iconKind }) => layout({ title: `${c.name} settings · Oversite`, logo, user, body: `
<main><h1><b>${esc(c.name)}</b> settings</h1><p class="lead">${isNew ? 'Your server is ready. Connect it to ER:LC, then give your members the member code.' : 'Manage your server connection, codes, departments and members.'}</p>
<div class="row" style="margin:-8px 0 20px"><a class="btn sm pri" href="/c/${esc(c.slug)}">Open CAD</a><a class="btn sm" href="/dashboard">All servers</a></div>
<div class="grid"><div>
<section class="card"><h2>ER:LC server</h2>
<p class="note" id="kstat">${keyStatus.connected ? `Connected${keyStatus.name ? ` to <b>${esc(keyStatus.name)}</b>` : ''}. The key is stored encrypted and is never sent to anyone's browser.` : 'Not connected. In ER:LC open your private server settings, find the API section, and copy the server key.'}</p>
<form id="key" autocomplete="off"><label for="kin">Server key</label><input id="kin" type="password" placeholder="${keyStatus.connected ? 'Paste a new key to replace it' : 'Paste your server key'}" required>
<div class="row" style="margin-top:12px"><button class="btn pri">${keyStatus.connected ? 'Replace key' : 'Connect server'}</button>${keyStatus.connected && runs(role) ? '<button type="button" class="btn sm danger" id="kdel">Disconnect</button>' : ''}</div><p class="msg" id="kmsg"></p></form></section>
${(() => { const P = c.settings.profile || {}, E = P.erlc || {}, letter = esc(c.name.slice(0, 1).toUpperCase());
  const fact = (k, v) => `<div><small>${k}</small><b>${v}</b></div>`;
  const facts = E.at ? [fact('In-game name', esc(E.name || 'Unknown')), fact('Join code', E.join_key ? `<code>${esc(E.join_key)}</code>` : 'None'), fact('Players', E.max ? `${E.players ?? 0} / ${E.max}` : 'Unknown'),
    fact('Owner', E.owner_id ? `<span class="sp-who"><img src="/rbx/avatar/${esc(E.owner_id)}" alt="" onerror="this.remove()">${esc(E.owner_name || 'ID ' + E.owner_id)}</span>` : 'Unknown'),
    fact('Co-owners', E.co_owners?.length ? E.co_owners.map(o => esc(o.name || 'ID ' + o.id)).join(', ') : 'None'), fact('Account verification', esc(E.verified || 'Not required')), fact('Team balance', E.team_balance ? 'On' : 'Off')].join('') : '';
  return `<section class="card" id="profile"><h2>Server profile</h2><p class="note">How your server shows up on Oversite, and in the server browser when it launches. The details in the box below come from ER:LC and stay up to date by themselves.</p>
<div class="sp-head"><button type="button" class="sp-icon" id="spPick" title="Change icon" aria-label="Change server icon"><span>${letter}</span><img id="spImg" src="/c/${esc(c.slug)}/icon?v=${Date.now()}" alt="" onerror="this.remove()"><i>Change</i></button>
<div class="sp-id"><b>${esc(c.name)}</b><small id="spIconNote">${iconKind === 'custom' ? 'Using the icon you uploaded.' : iconKind === 'discord' ? 'Using your Discord server\'s icon. Upload one to replace it.' : iconKind === 'owner' ? 'Using the server owner\'s Roblox avatar. Upload an icon to replace it.' : 'No icon yet. Upload one.'}</small>
<div class="row" style="margin-top:8px"><button type="button" class="btn sm" id="spUp">Upload icon</button>${iconKind === 'custom' ? '<button type="button" class="btn sm" id="spDefault">Use default</button>' : ''}<input type="file" id="spFile" accept="image/png,image/jpeg,image/webp" hidden></div></div></div>
<div class="sp-erlc"><div class="sp-erlch"><span>From ER:LC</span><button type="button" class="lnk" id="spRefresh">${E.at ? 'Refresh' : 'Load from ER:LC'}</button></div>${E.at ? `<div class="sp-facts">${facts}</div>` : `<p class="hint" style="margin:6px 0 0">${keyStatus.connected ? 'Loading your server details…' : 'Connect your ER:LC server above to fill this in.'}</p>`}</div>
<form id="spForm"><label for="spBio">Bio</label><textarea id="spBio" maxlength="300" rows="3" placeholder="What your server is about: the vibe, the rules, what makes it different.">${esc(P.bio || '')}</textarea><p class="hint" style="text-align:right;margin:4px 0 0"><span id="spCount">${(P.bio || '').length}</span> / 300</p>
<label for="spInv">Discord invite</label><div class="sp-inv"><span>discord.gg/</span><input id="spInv" maxlength="80" placeholder="yourserver" value="${esc((P.invite || '').replace(/^https:\/\/discord\.gg\//, ''))}" spellcheck="false" autocomplete="off"></div><p class="hint" style="margin:4px 0 0">Just the code is enough. Pasting a full invite link works too.</p>
<label class="chk"><input type="checkbox" id="spList"${P.listed ? ' checked' : ''}> List this server in the server browser when it launches</label>
<div class="row" style="margin-top:14px"><button class="btn pri">Save profile</button></div><p class="msg" id="spMsg"></p></form></section>`; })()}
<section class="card"><h2>Departments</h2><p class="note">Rename the departments for your server, and choose which in-game team belongs to each.</p>
<form id="depts"><div class="cols">${['pd', 'fd', 'dot'].map(d => `<div class="dept"><h3><i style="background:${COL[d]}"></i>${{ pd: 'Law enforcement', fd: 'Fire and EMS', dot: 'Transportation' }[d]}</h3>
<label>Name</label><input name="${d}-name" maxlength="40" value="${esc(c.settings.depts[d]?.name || '')}" required><label>Short name</label><input name="${d}-short" maxlength="6" value="${esc(c.settings.depts[d]?.short || '')}" required></div>`).join('')}</div>
<label style="margin-top:16px">In-game teams</label><div class="teams">${Object.entries(c.settings.teams).map(([t, d]) => `<span>${esc(t)}</span><select name="team-${esc(t)}">${[['pd', c.settings.depts.pd?.name], ['fd', c.settings.depts.fd?.name], ['dot', c.settings.depts.dot?.name], ['', 'Not shown on the CAD']].map(([v, n]) => `<option value="${v}"${v === d ? ' selected' : ''}>${esc(n)}</option>`).join('')}</select>`).join('')}</div>
<label for="cname">Server name</label><input id="cname" name="name" maxlength="48" value="${esc(c.name)}" required>
<div class="row" style="margin-top:14px"><button class="btn pri">Save</button></div><p class="msg" id="dmsg"></p></form></section>
</div><div>
${codes ? `<section class="card"${isNew ? ' style="border-color:rgba(76,141,255,.35)"' : ''}><h2>Server codes</h2><p class="note">Members sign in on the front page with the member code. The owner code gives full control, so keep it private.</p>
<label>Member code</label><div class="row" style="flex-wrap:nowrap"><input id="mcode" value="${esc(codes.member)}" spellcheck="false" maxlength="24"><button class="btn sm" data-copy="${esc(codes.member)}">Copy</button></div>
<div class="row" style="margin-top:8px"><button class="btn sm" id="savem">Save member code</button><button class="btn sm" id="genm">New random code</button></div>
${codes.owner !== null ? `<label style="margin-top:16px">Owner code</label><div class="row" style="flex-wrap:nowrap"><input id="ocode" type="password" value="${esc(codes.owner)}" spellcheck="false" maxlength="24"><button class="btn sm" id="showo">Show</button></div>
<div class="row" style="margin-top:8px"><button class="btn sm" id="saveo">Save owner code</button></div>` : ''}<p class="msg" id="codemsg"></p></section>` : ''}
<section class="card"><h2>Invite links</h2><p class="note">An alternative to the member code. Anyone with the link can join. Links last 7 days.</p>
<div class="row"><button class="btn pri" id="newinv">Create invite link</button></div><p class="msg" id="imsg"></p>
${invites.length ? `<div class="invites">${invites.map(i => `<div class="inv"><div class="tx"><code title="${esc(origin)}/join/${esc(i.code)}">${esc(origin.replace(/^https?:\/\//, ''))}/join/${esc(i.code)}</code><small>${i.uses} ${i.uses === 1 ? 'use' : 'uses'}${i.expires ? ` · expires ${new Date(i.expires).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}` : ''}</small></div><div class="acts"><button class="btn sm" data-copy="${esc(origin)}/join/${esc(i.code)}">Copy</button><button class="btn sm danger" data-revoke="${esc(i.code)}">Revoke</button></div></div>`).join('')}</div>` : '<p class="empty">No active invite links.</p>'}
</section>
<section class="card"><h2>Members</h2><p class="note"><b>Owner</b> and <b>Co-Owners</b> run these settings (only the owner can delete the server or change the owner code). <b>Admins</b> get the Server Staff tablet with everything: warn, kick, ban, unban, announce. <b>Mods</b> get the tablet to warn, message, kick and add notes. <b>Members</b> use the CAD. Which department MDT someone gets follows their team in game.</p>
<table><tr><th>Member</th><th>Roblox</th><th>Role</th><th></th></tr>${members.map(m => `<tr><td>${esc(m.name)}</td><td>${m.roblox_name ? esc(m.roblox_name) : '<span style="color:var(--faint)">Not linked</span>'}</td>
<td>${(() => { const R = { owner: 5, co_owner: 4, admin: 3, mod: 2, member: 1, staff: 3 }, mine = R[role] || 0, can = m.id !== user.id && (R[m.role] || 0) < mine;
  if (!can) return esc(RANK_LABEL[m.role] || m.role);
  return `<select data-role="${m.id}">${['co_owner', 'admin', 'mod', 'member'].filter(k => R[k] < mine).map(k => `<option value="${k}"${(m.role === k || (m.role === 'staff' && k === 'admin')) ? ' selected' : ''}>${RANK_LABEL[k]}</option>`).join('')}</select>`; })()}</td>
<td style="text-align:right">${m.role !== 'owner' && m.id !== user.id && ({ owner: 5, co_owner: 4, admin: 3, mod: 2, member: 1, staff: 3 }[m.role] || 0) < ({ owner: 5, co_owner: 4 }[role] || 0) ? `<button class="btn sm danger" data-remove="${m.id}">Remove</button>` : ''}</td></tr>`).join('')}</table><p class="msg" id="mmsg"></p>
</section>
${runs(role) ? `<section class="card" id="discord"><h2 class="hrow">Discord server<span class="tag" id="dgTag">…</span></h2><p class="note">Link your Discord server and choose which roles are <b>Admin</b> and which are <b>Mod</b>. Anyone with one of those roles who signs in with Discord gets that rank's staff tools, and loses them when the role is taken away. Everything else in the CAD follows the team they are on in game.</p><div id="dgBody"><p class="empty">Loading…</p></div><p class="msg" id="dgMsg"></p></section>` : ''}
${role === 'owner' ? `<section class="card danger-zone"><h2>Delete server</h2><p class="note">Removes the server from Oversite with its settings, codes and member list. This cannot be undone.</p><button class="btn danger" id="del">Delete ${esc(c.name)}</button></section>` : ''}
</div></div></main>`, script: `
const A='/c/${esc(c.slug)}/api';
// ── server profile ──
(()=>{const P=document.getElementById('profile');if(!P)return;const m=document.getElementById('spMsg'),f=document.getElementById('spFile');
const inv=document.getElementById('spInv'),code=v=>{const m=/(?:discord\\.gg|discord(?:app)?\\.com\\/invite)\\/([A-Za-z0-9-]{2,32})/i.exec(v);return m?m[1]:v.trim()};
inv.addEventListener('input',()=>{if(/discord/i.test(inv.value))inv.value=code(inv.value)});
const bio=document.getElementById('spBio');bio.addEventListener('input',()=>{document.getElementById('spCount').textContent=bio.value.length});
document.getElementById('spForm').addEventListener('submit',async e=>{e.preventDefault();try{await api(A+'/profile/save',{bio:bio.value,invite:document.getElementById('spInv').value,listed:document.getElementById('spList').checked});say(m,'Profile saved.',true)}catch(x){say(m,x.message)}});
const pick=()=>f.click();document.getElementById('spPick').addEventListener('click',pick);document.getElementById('spUp').addEventListener('click',pick);
// crop to a square and shrink to 256 px in the browser, so only a small image is uploaded
f.addEventListener('change',async()=>{const file=f.files[0];f.value='';if(!file)return;if(!/^image\\/(png|jpeg|webp)$/.test(file.type))return say(m,'Use a PNG, JPG or WebP image.');
  try{const bm=await createImageBitmap(file),s=Math.min(bm.width,bm.height),cv=document.createElement('canvas');cv.width=cv.height=256;cv.getContext('2d').drawImage(bm,(bm.width-s)/2,(bm.height-s)/2,s,s,0,0,256,256);
  let data=cv.toDataURL('image/webp',.9);if(!data.startsWith('data:image/webp'))data=cv.toDataURL('image/png');say(m,'Uploading…',true);await api(A+'/profile/icon',{data});location.reload()}catch(x){say(m,x.message||'Could not read that image.')}});
const d=document.getElementById('spDefault');if(d)d.addEventListener('click',async()=>{await api(A+'/profile/icon/remove');location.reload()});
const r=document.getElementById('spRefresh');const refresh=async(auto)=>{r.textContent='Loading…';try{await api(A+'/profile/refresh');location.reload()}catch(x){r.textContent='Refresh';if(!auto)say(m,x.message)}};
r.addEventListener('click',()=>refresh(false));
const at=${JSON.stringify((c.settings.profile && c.settings.profile.erlc && c.settings.profile.erlc.at) || 0)};if(${keyStatus.connected ? 'true' : 'false'}&&Date.now()-at>600000)refresh(true);})();
const dgB=document.getElementById('dgBody');if(dgB){const tag=document.getElementById('dgTag'),dm=document.getElementById('dgMsg'),connect='/c/${esc(c.slug)}/discord/connect';
const LV=[['admin','Admin roles','Get the Server Staff tablet with everything: warn, kick, ban, unban and announce.'],['mod','Mod roles','Get the Server Staff tablet to warn, message, kick and add notes.']];
const e2=t=>String(t??'').replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
const draw=async()=>{let j;try{j=await (await fetch(A+'/discord')).json()}catch(x){dgB.innerHTML='<p class="empty">Could not load.</p>';return}
if(!j.linked){tag.textContent='Not linked';tag.className='tag';dgB.innerHTML=j.ready?'<a class="btn discord" href="'+connect+'">Connect Discord server</a><p class="hint" style="margin-top:10px">Discord asks you to pick your server and add the Oversite bot. It only reads roles.</p>':'<p class="empty">Discord linking is being set up on Oversite. This will turn on soon.</p>';return}
const L=j.linked,sel={};for(const [k] of LV)sel[k]=new Set((L.roles&&(L.roles[k]||(k==='admin'&&L.roles.staff)))||[]);tag.textContent='Linked';tag.className='tag ok';
const head='<div class="dg-head">'+(L.icon?'<img src="'+e2(L.icon)+'" alt="">':'<span class="gi">'+e2((L.guild_name||'D')[0])+'</span>')+'<div><b>'+e2(L.guild_name)+'</b><small>Discord server</small></div><span class="sp"></span><a class="btn sm" href="'+connect+'">Change</a><button class="btn sm danger" id="dgUn">Unlink</button></div>';
if(!j.roles){dgB.innerHTML=head+'<p class="msg err">'+(j.missing?'The Oversite bot is no longer in this server. Press Change to add it again.':e2(j.error||'Could not read the roles.'))+'</p>';bindUn();return}
dgB.innerHTML=head+LV.map(([k,t,d])=>'<div class="dg-lvl"><h3>'+t+'</h3><p>'+d+'</p><div class="dg-roles">'+(j.roles.length?j.roles.map(r=>'<button type="button" class="dg-role" data-l="'+k+'" data-r="'+r.id+'" aria-pressed="'+sel[k].has(r.id)+'" style="--c:'+(r.color||'#99AAB5')+'"><i></i>'+e2(r.name)+'</button>').join(''):'<span class="empty">This server has no roles yet.</span>')+'</div></div>').join('')+'<div class="row" style="margin-top:16px"><button class="btn pri" id="dgSave">Save roles</button></div>';
dgB.querySelectorAll('.dg-role').forEach(b=>b.addEventListener('click',()=>{const s2=sel[b.dataset.l];s2.has(b.dataset.r)?s2.delete(b.dataset.r):s2.add(b.dataset.r);b.setAttribute('aria-pressed',s2.has(b.dataset.r))}));
document.getElementById('dgSave').addEventListener('click',async()=>{try{await api(A+'/discord/save',{roles:Object.fromEntries(LV.map(([k])=>[k,[...sel[k]]]))});say(dm,'Saved. People with these roles get the matching staff tools.',true)}catch(x){say(dm,x.message)}});bindUn()};
const bindUn=()=>{const u=document.getElementById('dgUn');if(u)u.addEventListener('click',async()=>{if(!await ask({title:'Unlink the Discord server?',text:'People who were staff only through their Discord roles lose the staff tools. Members you set as staff in Settings keep them.',ok:'Unlink',danger:true}))return;try{await api(A+'/discord/unlink',{});draw()}catch(x){say(dm,x.message)}})};
draw();if(location.search.includes('discord=1'))say(dm,'Discord server connected. Now choose which roles are Admin and Mod.',true)}
document.getElementById('key').addEventListener('submit',async e=>{e.preventDefault();const m=document.getElementById('kmsg'),b=e.target.querySelector('button');b.disabled=true;say(m,'Checking the key with ER:LC…',true);try{const j=await api(A+'/key',{key:document.getElementById('kin').value.trim()});say(m,'Connected to '+(j.name||'your server')+'. '+(j.players??0)+' players online.',true);setTimeout(()=>location.reload(),1200)}catch(x){say(m,x.message);b.disabled=false}});
const kd=document.getElementById('kdel');if(kd)kd.addEventListener('click',async()=>{if(!await ask({title:'Disconnect the ER:LC server?',text:'The CAD stops receiving live data until a key is connected again.',ok:'Disconnect',danger:true}))return;await api(A+'/key',null,'DELETE');location.reload()});
document.getElementById('depts').addEventListener('submit',async e=>{e.preventDefault();const f=new FormData(e.target),m=document.getElementById('dmsg');const depts={},teams={};for(const d of['pd','fd','dot'])depts[d]={name:f.get(d+'-name'),short:f.get(d+'-short')};for(const[k,v]of f.entries())if(k.startsWith('team-'))teams[k.slice(5)]=v;
try{await api(A+'/settings',{name:f.get('name'),depts,teams});say(m,'Saved.',true)}catch(x){say(m,x.message)}});
document.getElementById('newinv').addEventListener('click',async()=>{const m=document.getElementById('imsg');try{const j=await api(A+'/invites');await navigator.clipboard?.writeText(j.url).catch(()=>{});say(m,'Link created and copied: '+j.url,true);setTimeout(()=>location.reload(),1500)}catch(x){say(m,x.message)}});
document.addEventListener('click',async e=>{const c=e.target.closest('[data-copy]');if(c){await navigator.clipboard?.writeText(c.dataset.copy).catch(()=>{});const t=c.textContent;c.textContent='Copied';setTimeout(()=>c.textContent=t,1200)}
const r=e.target.closest('[data-revoke]');if(r){await api(A+'/invites/revoke',{code:r.dataset.revoke});location.reload()}
const x=e.target.closest('[data-remove]');if(x){if(!await ask({title:'Remove this member?',text:'They lose access to the CAD for this server. They can rejoin with the member code or an invite link.',ok:'Remove',danger:true}))return;try{await api(A+'/members/remove',{userId:+x.dataset.remove});location.reload()}catch(err){say(document.getElementById('mmsg'),err.message)}}});
document.addEventListener('change',async e=>{const s=e.target.closest('[data-role]');if(!s)return;try{await api(A+'/members/role',{userId:+s.dataset.role,role:s.value});say(document.getElementById('mmsg'),'Role updated.',true)}catch(x){say(document.getElementById('mmsg'),x.message)}});
const cm=document.getElementById('codemsg'),setc=async(body)=>{try{const j=await api(A+'/codes',body);say(cm,'Saved: '+j.code,true);return j.code}catch(x){say(cm,x.message)}};
const sm=document.getElementById('savem');if(sm){sm.addEventListener('click',()=>setc({role:'member',code:document.getElementById('mcode').value}));
document.getElementById('genm').addEventListener('click',async()=>{const c=await setc({role:'member',generate:true});if(c){document.getElementById('mcode').value=c;document.querySelector('[data-copy]').dataset.copy=c}});
const so=document.getElementById('saveo');if(so){so.addEventListener('click',()=>setc({role:'owner',code:document.getElementById('ocode').value}));
document.getElementById('showo').addEventListener('click',e=>{const o=document.getElementById('ocode');o.type=o.type==='password'?'text':'password';e.target.textContent=o.type==='password'?'Show':'Hide'})}}
const del=document.getElementById('del');if(del)del.addEventListener('click',async()=>{if(!await ask({title:${JSON.stringify('Delete ' + c.name + '?').replace(/</g, '\\u003c')},text:'This removes the server from Oversite with its settings, codes and member list. It cannot be undone.',ok:'Delete server',danger:true,typed:'${esc(c.slug)}'}))return;await api(A+'/delete',{confirm:'${esc(c.slug)}'});location.href='/dashboard'});
` });

export const join = ({ logo, user, c, code }) => layout({ title: `Join ${c.name} · Oversite`, logo, user, body: `
<section class="hero"><div class="box"><div class="mark"><img src="data:image/png;base64,${logo}" alt=""></div>
<h1>Join <b>${esc(c.name)}</b></h1><p class="lead">You have been invited to this server's CAD on Oversite.</p>
<form method="post" action="/join/${esc(code)}" class="actions"><button class="btn pri">Join community</button></form></div></section>` });

export const message = ({ logo, user, title, text, action }) => layout({ title: `${title} · Oversite`, logo, user, body: `
<section class="hero"><div class="box"><div class="mark"><img src="data:image/png;base64,${logo}" alt=""></div><h1>${esc(title)}</h1><p class="lead">${esc(text)}</p>
${action ? `<div class="actions"><a class="btn pri" href="${esc(action.href)}">${esc(action.label)}</a></div>` : ''}</div></section>` });
