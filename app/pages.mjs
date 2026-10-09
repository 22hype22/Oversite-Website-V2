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
.who{display:flex;align-items:center;gap:8px;font-size:13px;color:var(--dim)}.who img,.who .av{width:26px;height:26px;border-radius:50%;background:#2a2d33;display:grid;place-items:center;font-size:11px;color:var(--ink)}
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
input,select{width:100%;font:inherit;color:var(--ink);background:var(--field);border:1px solid var(--hair2);border-radius:10px;padding:10px 12px;outline:none;transition:border-color .15s}
input:focus,select:focus{border-color:rgba(240,242,245,.45)}
select{appearance:none;background-image:linear-gradient(45deg,transparent 50%,var(--dim) 50%),linear-gradient(135deg,var(--dim) 50%,transparent 50%);background-position:calc(100% - 16px) 50%,calc(100% - 11px) 50%;background-size:5px 5px;background-repeat:no-repeat;padding-right:30px}
.hint{font-size:12px;color:var(--faint);margin-top:6px}
.btn{display:inline-flex;align-items:center;justify-content:center;gap:8px;font:inherit;font-weight:500;font-size:13.5px;padding:9px 16px;border-radius:999px;border:1px solid var(--hair2);background:rgba(255,255,255,.06);color:var(--ink);cursor:pointer;text-decoration:none;white-space:nowrap;transition:background .15s,transform .1s}
.btn:hover{background:rgba(255,255,255,.1)}.btn:active{transform:scale(.98)}.btn[disabled]{opacity:.5;pointer-events:none}
.btn.pri{background:#F0F2F5;color:#0B0B0C;border-color:#F0F2F5}.btn.pri:hover{background:#fff}
.btn.discord{background:#5865F2;border-color:#5865F2;color:#fff}.btn.discord:hover{background:#6873f5}
.btn.danger{color:#F3A3A3;border-color:rgba(226,75,75,.4)}.btn.danger:hover{background:rgba(226,75,75,.12)}
.btn.sm{padding:6px 12px;font-size:12.5px}
.msg{font-size:13px;margin-top:10px;min-height:1em}.msg:empty{display:none}.msg.ok{color:var(--ok)}.msg.err{color:#F3A3A3}
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
export const layout = ({ title, logo, user, body, bg = true, top = true, script = '' }) => `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(title)}</title><link rel="icon" type="image/png" href="data:image/png;base64,${logo}">
<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin><link href="https://fonts.googleapis.com/css2?family=Geist:wght@300;400;500;600&display=swap" rel="stylesheet">
<style>${CSS}</style>${INTRO_HEAD}</head><body>${bg ? '<div class="bg"></div>' : ''}
${top ? `<header class="top"><a class="brand" href="${user ? '/dashboard' : '/'}"><i><img src="data:image/png;base64,${logo}" alt=""></i>Oversite</a><span class="sp"></span>
${user ? `<span class="who">${user.avatar ? `<img src="${esc(user.avatar)}" alt="">` : `<span class="av">${esc(user.name.slice(0, 1).toUpperCase())}</span>`}${esc(user.name)}</span><form method="post" action="/auth/logout" style="margin:0"><button class="btn sm">Sign out</button></form>` : ''}</header>` : ''}
${body}<script>${JS}${script}</script></body></html>`;

export const landing = ({ logo, discord, owner, next = '/dashboard', error = '' }) => layout({ title: 'Oversite', logo, top: false, body: `
<section class="hero wide notop"><div class="box">
<div class="mark"><img src="data:image/png;base64,${logo}" alt=""></div>
<h1><b>Oversite</b> CAD</h1>
<p class="lead">A live dispatch system for ER:LC private servers. Every unit on a 3D map of Liberty County, live from your server.</p>
<div class="paths">
<form class="card path" id="codeform" autocomplete="off"><h2>Join your server</h2><p class="note">Enter the code your server owner gave you.</p>
<input id="code" placeholder="Server code" aria-label="Server code" autocapitalize="characters" spellcheck="false" required>
<button class="btn pri">Sign in</button><p class="msg" id="codemsg"></p></form>
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
</div></section>`, script: `
const go=async(url,body,m)=>{try{const j=await api(url,body);location.href=j.next}catch(x){say(m,x.message)}};
document.getElementById('codeform').addEventListener('submit',e=>{e.preventDefault();go('/auth/code',{code:document.getElementById('code').value},document.getElementById('codemsg'))});
const mn=document.getElementById('mname'),ms=document.getElementById('mslug'),sp=document.getElementById('slugp');let touched=false;
const slugify=s=>s.toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-+|-+$/g,'').slice(0,32);
mn.addEventListener('input',()=>{if(!touched){ms.value=slugify(mn.value);sp.textContent=ms.value||'your-server'}});
ms.addEventListener('input',()=>{touched=true;ms.value=slugify(ms.value);sp.textContent=ms.value||'your-server'});
document.getElementById('makeform').addEventListener('submit',e=>{e.preventDefault();go('/auth/create',{name:mn.value.trim(),slug:ms.value,ownerCode:document.getElementById('mcode').value},document.getElementById('makemsg'))});
` });

export const dashboard = ({ logo, user, comms, discordLinkable, pending, welcome, discord }) => layout({ title: 'Dashboard · Oversite', logo, user, body: `
<main><h1>Welcome, <b>${esc(user.name)}</b></h1><p class="lead">Open a server's CAD, join another with its code, or create your own.</p>
${welcome && !user.roblox_name ? `<section class="card" style="margin-bottom:18px;border-color:rgba(76,141,255,.35)"><h2>You're in ${esc(welcome.name)}</h2><p class="note" style="margin-bottom:10px">Link your Roblox account below so the CAD knows which player you are and opens your department's MDT. Or skip it for now.</p><a class="btn sm" href="/c/${esc(welcome.slug)}">Skip and open the CAD</a></section>` : ''}
<div class="grid"><div>
<section class="card"><h2>Your servers</h2><p class="note">Servers you own or have joined.</p>
${comms.length ? comms.map(c => `<div class="comm"><span class="ic">${esc(c.name.slice(0, 1).toUpperCase())}</span><span class="tx"><b>${esc(c.name)}</b><small>oversitescad.com/c/${esc(c.slug)}</small></span>
${c.connected ? '<span class="tag ok">Server connected</span>' : '<span class="tag warn">No server yet</span>'}<span class="tag">${esc(c.role)}</span>
${c.role !== 'member' ? `<a class="btn sm" href="/c/${esc(c.slug)}/settings">Settings</a>` : ''}<a class="btn sm pri" href="/c/${esc(c.slug)}">Open CAD</a></div>`).join('') : '<p class="empty">You are not in any server yet. Join one with its code, or create your own.</p>'}
</section>
<section class="card"><h2>Join another server</h2><form id="join" class="row" autocomplete="off" style="flex-wrap:nowrap"><input id="jcode" placeholder="Server code" aria-label="Server code" spellcheck="false" required><button class="btn pri">Join</button></form><p class="msg" id="jmsg"></p></section>
<section class="card"><h2>Create a server</h2><p class="note">One per ER:LC server. Members join with the member code you get afterwards.</p>
<form id="create" autocomplete="off"><label for="cname">Server name</label><input id="cname" maxlength="48" placeholder="Liberty County Roleplay" required>
<label for="cslug">Address</label><input id="cslug" maxlength="32" pattern="[a-z0-9-]{3,32}" placeholder="liberty-county" required><p class="hint">oversitescad.com/c/<span id="slugp">liberty-county</span></p>
<label for="ccode">Owner code</label><input id="ccode" maxlength="24" placeholder="2 to 24 letters or numbers" spellcheck="false" required>
<div class="row" style="margin-top:14px"><button class="btn pri">Create server</button></div><p class="msg" id="cmsg"></p></form></section>
</div><div>
<section class="card" id="rbx"><h2>Roblox account</h2>
${user.roblox_name ? `<p class="note">Linked to <b>${esc(user.roblox_name)}</b>${user.roblox_via === 'discord' ? ', the Roblox account verified on your Discord' : ''}. Your servers use this to find you in game and open your department's MDT.</p>${user.roblox_via === 'discord' ? '<p class="hint" style="margin:-6px 0 0">To change it, change the Roblox connection in Discord and sign in with Discord again.</p>' : '<button class="btn sm" id="unlink">Unlink</button>'}`
: pending ? `<p class="note">Add this phrase anywhere in the <b>About</b> section of <a href="https://www.roblox.com/users/${esc(pending.roblox_id)}/profile" target="_blank" rel="noopener">${esc(pending.roblox_name)}'s profile</a>, save, then press Verify. You can remove it afterwards.</p>
<div class="phrase">${esc(pending.phrase)}</div><div class="row"><button class="btn pri" id="verify">Verify</button><button class="btn sm" id="restart">Use a different account</button></div><p class="msg" id="rmsg"></p>`
: `<p class="note">Link your Roblox account so your servers know which player you are. No password needed.</p>${discord ? `<a class="btn discord" href="/auth/discord?next=/dashboard" style="width:100%">Use the Roblox account on my Discord</a><p class="hint" style="margin:8px 0 2px">Works if Roblox is connected in Discord (Settings, Connections). Or link it here:</p>` : ''}<form id="rstart" autocomplete="off"><label for="ruser">Roblox username</label><input id="ruser" placeholder="Your Roblox username" required><div class="row" style="margin-top:12px"><button class="btn pri">Continue</button></div><p class="msg" id="rmsg"></p></form>`}
</section>
${discordLinkable ? `<section class="card"><h2>Discord</h2><p class="note">You signed in with the owner code. Link Discord so you can sign in with it from now on.</p><a class="btn discord" href="/auth/discord?next=/dashboard">Link Discord</a></section>` : ''}
</div></div></main>`, script: `
const cn=document.getElementById('cname'),cs=document.getElementById('cslug'),sp=document.getElementById('slugp');let touched=false;
const slugify=s=>s.toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-+|-+$/g,'').slice(0,32);
cn.addEventListener('input',()=>{if(!touched){cs.value=slugify(cn.value);sp.textContent=cs.value||'liberty-county'}});
cs.addEventListener('input',()=>{touched=true;cs.value=slugify(cs.value);sp.textContent=cs.value||'liberty-county'});
document.getElementById('create').addEventListener('submit',async e=>{e.preventDefault();const m=document.getElementById('cmsg');try{const j=await api('/api/communities',{name:cn.value.trim(),slug:cs.value,ownerCode:document.getElementById('ccode').value});location.href='/c/'+j.slug+'/settings?new=1'}catch(x){say(m,x.message)}});
document.getElementById('join').addEventListener('submit',async e=>{e.preventDefault();try{const j=await api('/auth/code',{code:document.getElementById('jcode').value});location.href=j.next}catch(x){say(document.getElementById('jmsg'),x.message)}});
const rs=document.getElementById('rstart');if(rs)rs.addEventListener('submit',async e=>{e.preventDefault();const m=document.getElementById('rmsg');try{await api('/api/roblox/start',{username:document.getElementById('ruser').value});location.reload()}catch(x){say(m,x.message)}});
const v=document.getElementById('verify');if(v)v.addEventListener('click',async()=>{const m=document.getElementById('rmsg');v.disabled=true;try{await api('/api/roblox/verify');location.reload()}catch(x){say(m,x.message);v.disabled=false}});
const re=document.getElementById('restart');if(re)re.addEventListener('click',async()=>{await api('/api/roblox/cancel');location.reload()});
const ul=document.getElementById('unlink');if(ul)ul.addEventListener('click',async()=>{if(!await ask({title:'Unlink your Roblox account?',text:'Your name on the CAD goes back to your sign-in name until you link again.',ok:'Unlink'}))return;await api('/api/roblox/unlink');location.reload()});
` });

const COL = { pd: '#4C8DFF', fd: '#E24B4B', dot: '#E9C24C' };
export const settings = ({ logo, user, c, role, keyStatus, invites, members, origin, isNew, codes }) => layout({ title: `${c.name} settings · Oversite`, logo, user, body: `
<main><h1><b>${esc(c.name)}</b> settings</h1><p class="lead">${isNew ? 'Your server is ready. Connect it to ER:LC, then give your members the member code.' : 'Manage your server connection, codes, departments and members.'}</p>
<div class="row" style="margin:-8px 0 20px"><a class="btn sm pri" href="/c/${esc(c.slug)}">Open CAD</a><a class="btn sm" href="/dashboard">All servers</a></div>
<div class="grid"><div>
<section class="card"><h2>ER:LC server</h2>
<p class="note" id="kstat">${keyStatus.connected ? `Connected${keyStatus.name ? ` to <b>${esc(keyStatus.name)}</b>` : ''}. The key is stored encrypted and is never sent to anyone's browser.` : 'Not connected. In ER:LC open your private server settings, find the API section, and copy the server key.'}</p>
<form id="key" autocomplete="off"><label for="kin">Server key</label><input id="kin" type="password" placeholder="${keyStatus.connected ? 'Paste a new key to replace it' : 'Paste your server key'}" required>
<div class="row" style="margin-top:12px"><button class="btn pri">${keyStatus.connected ? 'Replace key' : 'Connect server'}</button>${keyStatus.connected && role === 'owner' ? '<button type="button" class="btn sm danger" id="kdel">Disconnect</button>' : ''}</div><p class="msg" id="kmsg"></p></form></section>
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
<section class="card"><h2>Members</h2>
<table><tr><th>Member</th><th>Roblox</th><th>Role</th><th></th></tr>${members.map(m => `<tr><td>${esc(m.name)}</td><td>${m.roblox_name ? esc(m.roblox_name) : '<span style="color:var(--faint)">Not linked</span>'}</td>
<td>${m.role === 'owner' || role !== 'owner' && m.role === 'admin' || m.id === user.id ? esc(m.role) : `<select data-role="${m.id}"><option value="member"${m.role === 'member' ? ' selected' : ''}>member</option><option value="admin"${m.role === 'admin' ? ' selected' : ''}>admin</option></select>`}</td>
<td style="text-align:right">${m.role !== 'owner' && m.id !== user.id && (role === 'owner' || m.role === 'member') ? `<button class="btn sm danger" data-remove="${m.id}">Remove</button>` : ''}</td></tr>`).join('')}</table><p class="msg" id="mmsg"></p>
</section>
${role === 'owner' ? `<section class="card danger-zone"><h2>Delete server</h2><p class="note">Removes the server from Oversite with its settings, codes and member list. This cannot be undone.</p><button class="btn danger" id="del">Delete ${esc(c.name)}</button></section>` : ''}
</div></div></main>`, script: `
const A='/c/${esc(c.slug)}/api';
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
