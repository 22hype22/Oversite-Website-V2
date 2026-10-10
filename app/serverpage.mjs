// A listed server's own page (/s/:slug): banner, live stats, player and vote charts, details, and reviews.
// Explore cards open this. Anyone can read it; voting, reviewing and reporting need a signed-in account with Roblox linked.
import { layout, esc, vbadge } from './pages.mjs';

const CSS = `
.sv{max-width:1120px}
.sv-back{display:inline-flex;align-items:center;gap:6px;color:var(--dim);text-decoration:none;font-size:13px;margin:0 0 14px}.sv-back:hover{color:var(--ink)}
.sv-hero{position:relative;height:210px;border-radius:22px;overflow:hidden;border:1px solid var(--hair);background:#3E6973 url(/liberty-county.jpg) var(--pos)/620% no-repeat}
.sv-hero::after{content:"";position:absolute;inset:0;background:linear-gradient(180deg,rgba(8,10,12,.05),rgba(8,10,12,.3) 55%,rgba(11,12,14,.92))}
.sv-ht{position:absolute;left:18px;right:18px;top:16px;z-index:1;display:flex;justify-content:space-between;align-items:center;gap:8px}
.sv-ht{align-items:flex-start}
.sv-md{display:flex;flex-wrap:wrap;justify-content:flex-end;gap:6px;max-width:70%}
.md{--c:#F2C46E;display:inline-flex;align-items:center;gap:6px;padding:5px 12px;border-radius:999px;background:rgba(8,9,11,.74);border:1px solid color-mix(in srgb,var(--c) 45%,transparent);backdrop-filter:blur(8px);-webkit-backdrop-filter:blur(8px);font-size:12.5px;font-weight:600;color:#F0F2F5;white-space:nowrap;box-shadow:0 6px 18px rgba(0,0,0,.35)}
.md b{color:var(--c);font-weight:700}
.md.p2{--c:#CBD2DC}.md.p3{--c:#D99A64}
.sv-md2{display:none}
@media (max-width:620px){.sv-ht .sv-md{display:none}.sv-md2{display:flex;justify-content:flex-start;max-width:none;margin-top:10px}.md{font-size:11.5px;padding:4px 10px}}
.sv-head{position:relative;display:flex;align-items:flex-start;gap:18px;margin:-52px 0 0;padding:0 22px;z-index:2;flex-wrap:wrap}
.sv-ic{position:relative;overflow:hidden;flex:none;width:104px;height:104px;border-radius:26px;display:grid;place-items:center;font-size:38px;font-weight:700;background:linear-gradient(160deg,#2d3440,#1b1f26);border:4px solid #0f1113;box-shadow:0 16px 34px rgba(0,0,0,.5)}
.sv-ic img{position:absolute;inset:0;width:100%;height:100%;object-fit:cover}
.sv-id{flex:1;min-width:240px;padding-top:62px}
.sv-id h1{margin:0;font-size:clamp(24px,3.6vw,34px);letter-spacing:-.02em;line-height:1.1;display:flex;align-items:center;flex-wrap:wrap}.sv-id h1 .vb{margin-left:10px}
.sv-by{display:flex;align-items:center;color:var(--dim);font-size:13.5px;margin-top:4px}.sv-by .vb{margin-left:5px}
.sv-tags{display:flex;flex-wrap:wrap;gap:6px;margin-top:10px}
.sv-tag{display:inline-flex;align-items:center;gap:6px;padding:4px 11px 4px 9px;border-radius:999px;background:rgba(240,242,245,.07);border:1px solid var(--hair2);color:#E2E5E9;font-size:12.5px;font-weight:500}.sv-tag svg{color:#8DB6FF}
.sv-acts{display:flex;gap:8px;flex-wrap:wrap;padding-top:66px}
.sv-stats{display:grid;grid-template-columns:repeat(5,minmax(0,1fr));gap:12px;margin:26px 0 18px}
.sv-st{padding:16px 16px 14px;border-radius:16px;background:var(--panel);border:1px solid var(--hair);backdrop-filter:blur(18px);-webkit-backdrop-filter:blur(18px);min-width:0}
.sv-st small{display:block;color:var(--faint);font-size:11.5px;font-weight:500;letter-spacing:.04em;text-transform:uppercase}
.sv-st b{display:flex;align-items:baseline;gap:6px;font-size:28px;font-weight:600;letter-spacing:-.02em;margin-top:6px;font-variant-numeric:tabular-nums;white-space:nowrap}.sv-st b span{font-size:14px;font-weight:500;color:var(--dim)}
.sv-st p{margin:4px 0 0;color:var(--dim);font-size:12.5px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.sv-st .bar{height:4px;border-radius:4px;background:rgba(255,255,255,.08);margin-top:10px;overflow:hidden}.sv-st .bar i{display:block;height:100%;border-radius:4px;background:#4C8DFF}
.sv-st .stars{color:#F2C46E;font-size:14px;letter-spacing:1px}
.sv-grid{display:grid;grid-template-columns:minmax(0,1.75fr) minmax(0,1fr);gap:18px;align-items:start}
.sv-grid .card+.card{margin-top:18px}
.sv-ch h2,.sv-side h2,.sv-rv h2{margin:0;font-size:16px}
.sv-chh{display:flex;align-items:baseline;justify-content:space-between;gap:10px;margin:0 0 12px}.sv-chh span{color:var(--faint);font-size:12px}
.chart{position:relative;height:190px}.chart svg{display:block;width:100%;height:100%;overflow:visible}
.chart .ax{fill:var(--faint);font-size:11px;font-family:inherit}.chart .gl{stroke:rgba(240,242,245,.07);stroke-width:1}
.chart .tip{position:absolute;pointer-events:none;transform:translate(-50%,-100%);margin-top:-10px;padding:6px 10px;border-radius:9px;background:#1E2024;border:1px solid var(--hair2);font-size:12px;white-space:nowrap;opacity:0;transition:opacity .1s;box-shadow:0 8px 20px rgba(0,0,0,.4)}
.chart .tip b{font-weight:600}.chart .tip small{display:block;color:var(--faint);font-size:11px}
.chart.on .tip{opacity:1}
.chart-e{height:190px;display:grid;place-items:center;text-align:center;color:var(--faint);font-size:13px;border:1px dashed var(--hair2);border-radius:12px;padding:0 24px}
.sv-bio{margin:10px 0 0;color:#C9CDD3;line-height:1.6;white-space:pre-line}.sv-bio.none{color:var(--faint)}
.sv-facts{display:grid;gap:12px;margin-top:12px}.sv-facts div{display:flex;justify-content:space-between;gap:14px;font-size:13px;padding-bottom:12px;border-bottom:1px solid var(--hair)}.sv-facts div:last-child{border:0;padding:0}
.sv-facts small{color:var(--faint);font-size:13px;flex:none}.sv-facts b{font-weight:500;text-align:right;overflow-wrap:anywhere}.sv-facts code{font-family:ui-monospace,"Geist Mono",monospace}
.sv-rep{background:none;border:0;padding:10px 0 0;color:var(--faint);font:inherit;font-size:12.5px;cursor:pointer;text-decoration:underline;text-underline-offset:3px}.sv-rep:hover{color:var(--dim)}
.sv-rv{margin-top:18px}
.rv-top{display:grid;grid-template-columns:auto minmax(0,1fr);gap:22px;align-items:center;margin:14px 0 18px}
.rv-avg b{display:block;font-size:44px;font-weight:600;letter-spacing:-.03em;line-height:1}.rv-avg .stars{color:#F2C46E;font-size:16px;letter-spacing:2px;margin-top:6px}.rv-avg small{display:block;color:var(--faint);font-size:12px;margin-top:4px}
.rv-dist{display:grid;gap:5px}.rv-dist div{display:grid;grid-template-columns:14px minmax(0,1fr) 28px;gap:10px;align-items:center;font-size:12px;color:var(--dim)}
.rv-dist i{display:block;height:6px;border-radius:6px;background:rgba(255,255,255,.07);overflow:hidden}.rv-dist i s{display:block;height:100%;border-radius:6px;background:#F2C46E;text-decoration:none}
.rv-dist em{font-style:normal;text-align:right;font-variant-numeric:tabular-nums}
.rv-form{padding:16px;border-radius:14px;border:1px solid var(--hair2);background:rgba(255,255,255,.025);margin-bottom:16px}
.rv-form h3{margin:0 0 10px;font-size:14px}
.rv-pick{display:flex;gap:2px;margin:0 0 10px}.rv-pick button{background:none;border:0;padding:2px;cursor:pointer;color:rgba(240,242,245,.22);line-height:0;transition:transform .12s,color .12s}.rv-pick button.on{color:#F2C46E}.rv-pick button:hover{transform:scale(1.12)}
.rv-form textarea{width:100%;resize:vertical;min-height:84px}
.rv-form .row{display:flex;align-items:center;gap:10px;margin-top:10px}.rv-form .row .hint{margin:0 auto 0 0}
.rv-cta{padding:14px 16px;border-radius:14px;border:1px dashed var(--hair2);color:var(--dim);font-size:13.5px;margin-bottom:16px}
.rv-l{display:grid;gap:10px}
.rv{padding:14px 16px;border-radius:14px;border:1px solid var(--hair);background:rgba(255,255,255,.02)}
.rv-h{display:flex;align-items:center;gap:10px}
.rv-av{position:relative;width:34px;height:34px;flex:none;border-radius:50%;overflow:hidden;display:grid;place-items:center;background:#2a2d33;font-weight:600;font-size:13px}.rv-av img{position:absolute;inset:0;width:100%;height:100%;object-fit:cover}
.rv-n{flex:1;min-width:0}.rv-n b{display:flex;align-items:center;font-size:13.5px;font-weight:600}.rv-n b .vb{margin-left:5px}.rv-n small{color:var(--faint);font-size:12px}
.rv-s{color:#F2C46E;font-size:13px;letter-spacing:1px;flex:none}
.rv p{margin:10px 0 0;color:#D3D6DB;font-size:14px;line-height:1.6;white-space:pre-line;overflow-wrap:anywhere}
.rv-rep{margin:12px 0 0 14px;padding:10px 12px;border-left:2px solid rgba(76,141,255,.5);background:rgba(76,141,255,.06);border-radius:0 10px 10px 0}
.rv-rep small{display:block;color:#8DB6FF;font-size:11.5px;font-weight:600;margin-bottom:3px}.rv-rep p{margin:0;font-size:13.5px}
.rv-a{display:flex;gap:14px;margin-top:10px}.rv-a button{background:none;border:0;padding:0;color:var(--faint);font:inherit;font-size:12.5px;cursor:pointer}.rv-a button:hover{color:var(--ink)}.rv-a button.dz:hover{color:#F3A3A3}
.rv-rf{margin-top:10px}.rv-rf textarea{width:100%;min-height:64px;resize:vertical}.rv-rf .row{display:flex;gap:8px;justify-content:flex-end;margin-top:8px}
.rv-e{color:var(--faint);font-size:13px;padding:6px 0}
.sv-toast{position:fixed;left:50%;bottom:74px;transform:translate(-50%,12px);z-index:50;max-width:calc(100vw - 32px);padding:11px 16px;border-radius:12px;background:#1A1B1F;border:1px solid var(--hair2);font-size:13.5px;opacity:0;pointer-events:none;transition:opacity .2s,transform .2s}.sv-toast.on{opacity:1;transform:translate(-50%,0)}
@media (max-width:980px){.sv-stats{grid-template-columns:repeat(3,minmax(0,1fr))}.sv-grid{grid-template-columns:1fr}}
@media (max-width:620px){.sv-hero{height:150px}.sv-head{padding:0 6px;margin-top:-44px}.sv-id{padding-top:0;flex-basis:100%}.sv-acts{padding-top:0}.sv-ic{width:84px;height:84px;border-radius:22px}.sv-stats{grid-template-columns:repeat(2,minmax(0,1fr))}.sv-st:last-child{grid-column:span 2}.sv-st b{font-size:24px}.rv-top{grid-template-columns:1fr}.sv-acts{width:100%}}
`;

const I = {
  pin: '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 21s-7-6.2-7-11.5a7 7 0 0 1 14 0C19 14.8 12 21 12 21z"/><circle cx="12" cy="9.5" r="2.5"/></svg>',
  lang: '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 5h16v11H9l-5 4z"/></svg>',
  dc: '<svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M19.6 5.4A17 17 0 0 0 15.4 4l-.5 1a15.6 15.6 0 0 0-5.8 0L8.6 4a17 17 0 0 0-4.2 1.4C1.8 9.4 1 13.3 1.4 17.1A17 17 0 0 0 6.6 20l1.1-1.8c-.6-.2-1.2-.5-1.7-.9l.4-.3a12.2 12.2 0 0 0 11.2 0l.4.3c-.5.4-1.1.7-1.7.9l1.1 1.8a17 17 0 0 0 5.2-2.9c.5-4.4-.8-8.3-2.9-11.7zM8.7 14.8c-1 0-1.9-1-1.9-2.1s.8-2.1 1.9-2.1 1.9 1 1.9 2.1-.8 2.1-1.9 2.1zm6.6 0c-1 0-1.9-1-1.9-2.1s.8-2.1 1.9-2.1 1.9 1 1.9 2.1-.8 2.1-1.9 2.1z"/></svg>',
  play: '<svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M7 4.5v15l12.5-7.5z"/></svg>',
  star: '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round" aria-hidden="true"><path d="m12 3 2.8 5.7 6.2.9-4.5 4.4 1.1 6.2L12 17.3 6.4 20.2l1.1-6.2L3 9.6l6.2-.9z"/></svg>',
  back: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M15 18l-6-6 6-6"/></svg>',
};
const ERLC = 'https://www.roblox.com/games/2534724415/Emergency-Response-Liberty-County';
const n = v => Number(v || 0).toLocaleString('en-US');
// every server gets its own slice of the Liberty County map, the same one its Explore card uses
const spot = slug => { let h = 0; for (const c of slug) h = (h * 31 + c.charCodeAt(0)) >>> 0; return `${12 + h % 76}% ${14 + (h >>> 8) % 72}%`; };
const starsText = r => '★★★★★'.slice(0, Math.round(r)) + '☆☆☆☆☆'.slice(0, 5 - Math.round(r));

// a medal: the place and the Explore tab, tinted gold, silver or bronze
const medal = (place, label) => `<span class="md p${place}" title="#${place} ${label} on Explore"><b>#${place}</b>${label}</span>`;

export const serverPage = ({ logo, user, x, medals = [], players, voteTimes, list, me }) => {
  const live = x.live && x.players != null, full = live && x.max && x.players >= x.max;
  const status = !x.connected ? '' : !live ? '<span class="xs off">Offline</span>' : `<span class="xs ${full ? 'full' : 'open'}"><b>${x.players}</b>${x.max ? ' / ' + x.max : ''} in game${full ? ' · Full' : ''}</span>`;
  const peak = players.reduce((m, p) => Math.max(m, p[1] ?? 0), 0);
  const lang = x.lang ? (x.region && x.lang.name.endsWith('(' + x.region.name + ')') ? x.lang.name.split(' (')[0] : x.lang.name) : '';
  const fact = (k, v) => v ? `<div><small>${k}</small><b>${v}</b></div>` : '';
  const data = { slug: x.slug, name: x.name, max: x.max, players, voteTimes, list, me, rating: x.rating, count: x.reviews };
  return layout({ title: `${x.name} · Oversite`, logo, user, body: `<style>${CSS}</style>
<main class="sv">
<a class="sv-back" href="/explore">${I.back}Explore</a>
<section class="sv-hero" style="--pos:${spot(x.slug)}"><div class="sv-ht">${status}${medals.length ? `<div class="sv-md">${medals.map(m => medal(m.place, m.label)).join('')}</div>` : ''}</div></section>
<div class="sv-head"><span class="sv-ic">${esc(x.name.slice(0, 1).toUpperCase())}<img src="/c/${esc(x.slug)}/icon" alt="" onerror="this.remove()"></span>
<div class="sv-id"><h1>${esc(x.name)}${x.badge ? vbadge(24) : ''}</h1>${x.owner_name ? `<div class="sv-by">by ${esc(x.owner_name)}${x.owner_badge ? vbadge(14) : ''}</div>` : ''}
<div class="sv-tags">${x.region ? `<span class="sv-tag">${I.pin}${esc(x.region.name)}</span>` : ''}${lang ? `<span class="sv-tag">${I.lang}${esc(lang)}</span>` : ''}${x.discord ? `<span class="sv-tag">${I.dc}${esc(x.discord)}</span>` : ''}</div>${medals.length ? `<div class="sv-md sv-md2">${medals.map(m => medal(m.place, m.label)).join('')}</div>` : ''}</div>
<div class="sv-acts">${x.join_key ? `<a class="xb pri" href="${ERLC}" target="_blank" rel="noopener" data-play="${esc(x.join_key)}" title="Copy the join code and open ER:LC">${I.play}Join</a>` : ''}
${me ? `<button class="xb" id="vote"${x.next_vote > 0 ? ' data-wait="' + x.next_vote + '"' : ''}>${I.star}<span>${x.next_vote > 0 ? 'Voted' : 'Vote'}</span></button>` : `<a class="xb" href="/?next=${encodeURIComponent('/s/' + x.slug)}">${I.star}Sign in to vote</a>`}
${x.invite ? `<a class="xb" href="${esc(x.invite)}" target="_blank" rel="noopener">${I.dc}Discord</a>` : ''}${x.role ? `<a class="xb" href="/c/${esc(x.slug)}">Open CAD</a>` : x.open_join && me ? '<button class="xb" id="joinCad">Join CAD</button>' : ''}</div></div>

<div class="sv-stats">
<div class="sv-st"><small>In game now</small><b>${live ? x.players : '–'}${live && x.max ? `<span>/ ${x.max}</span>` : ''}</b>${live && x.max ? `<div class="bar"><i style="width:${Math.min(100, Math.round(x.players / x.max * 100))}%"></i></div>` : `<p>${live ? 'Live' : x.connected ? 'Server is offline' : 'Not linked to ER:LC'}</p>`}</div>
<div class="sv-st"><small>Peak, 24 hours</small><b>${players.length ? peak : '–'}</b><p>${players.length ? 'Most players at once' : 'No data yet'}</p></div>
<div class="sv-st"><small>Votes</small><b id="vN">${n(x.votes)}</b><p>+${n(x.week)} this week</p></div>
<div class="sv-st"><small>Discord</small><b>${x.dc_members != null ? n(x.dc_members) : '–'}</b><p>${x.dc_online != null ? n(x.dc_online) + ' online' : x.discord ? 'Members' : 'Not connected'}</p></div>
<div class="sv-st"><small>Rating</small><b id="rA">${x.rating != null ? x.rating.toFixed(1) : '–'}</b><p id="rC">${x.reviews ? `<span class="stars">${starsText(x.rating)}</span> ${n(x.reviews)} review${x.reviews === 1 ? '' : 's'}` : 'No reviews yet'}</p></div>
</div>

<div class="sv-grid"><div>
<section class="card sv-ch"><div class="sv-chh"><h2>Players, last 24 hours</h2><span>Every 2 minutes</span></div><div id="chP"></div></section>
<section class="card sv-ch"><div class="sv-chh"><h2>Votes, last 14 days</h2><span>${n(x.week)} this week</span></div><div id="chV"></div></section>
<section class="card sv-rv" id="reviews"><h2>Reviews</h2><div id="rvTop"></div><div id="rvForm"></div><div class="rv-l" id="rvL"></div></section>
</div>
<aside class="sv-side"><section class="card"><h2>About</h2><p class="sv-bio${x.bio ? '' : ' none'}">${esc(x.bio || 'The owner has not written a description yet.')}</p></section>
<section class="card"><h2>Details</h2><div class="sv-facts">${fact('In-game name', esc(x.ingame))}${fact('Join code', x.join_key ? `<code>${esc(x.join_key)}</code>` : '')}${fact('Co-owners', esc(x.co_owners.join(', ')))}
${fact('Account verification', esc(x.verified))}${fact('Team balance', x.at ? (x.team_balance ? 'On' : 'Off') : '')}${fact('Departments', esc(x.depts.map(d => d.name).join(', ')))}${fact('On Oversite since', new Date(x.created).toLocaleDateString('en-US', { month: 'long', year: 'numeric' }))}</div>
${me && x.role !== 'owner' ? '<button class="sv-rep" id="repS">Report this server</button>' : ''}</section></aside></div></main><div class="sv-toast" id="toast" role="status"></div>`, script: `
const D=${JSON.stringify(data).replace(/</g, '\\u003c')},VB=${JSON.stringify(vbadge(13))};
const e=t=>String(t??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const toast=m=>{const t=document.getElementById('toast');t.textContent=m;t.classList.add('on');clearTimeout(t._h);t._h=setTimeout(()=>t.classList.remove('on'),3200)};
const ago=t=>{const m=Math.round((Date.now()-t)/60000);if(m<1)return 'just now';if(m<60)return m+' min ago';if(m<1440)return Math.round(m/60)+' h ago';const d=Math.round(m/1440);return d<31?d+' d ago':new Date(t).toLocaleDateString(undefined,{month:'short',day:'numeric',year:'numeric'})};
const hrs=ms=>Math.max(1,Math.ceil(ms/3600000))+'h';
const NS='http://www.w3.org/2000/svg',mk=(t,a)=>{const el=document.createElementNS(NS,t);for(const k in a)el.setAttribute(k,a[k]);return el};
const ACC='#4C8DFF';
/* players: 20-minute buckets over 24 hours, the most players seen in each; gaps where the server was offline */
const chartPlayers=()=>{const host=document.getElementById('chP'),now=Date.now(),span=864e5,B=72,step=span/B,start=now-span,vals=new Array(B).fill(null);
  for(const [t,p] of D.players){const i=Math.min(B-1,Math.floor((t-start)/step));if(i>=0&&p!=null)vals[i]=Math.max(vals[i]??0,p)}
  if(vals.filter(v=>v!=null).length<3){host.innerHTML='<div class="chart-e">Player history fills in while the server is online. Check back in a little while.</div>';return}
  const top=Math.max(D.max||0,...vals.map(v=>v||0),4);
  host.innerHTML='<div class="chart" role="img" aria-label="Players over the last 24 hours, peak '+Math.max(...vals.map(v=>v||0))+'"><svg></svg><div class="tip"></div></div>';
  const box=host.firstChild,svg=box.querySelector('svg'),tip=box.querySelector('.tip');
  const draw=()=>{svg.innerHTML='';const W=box.clientWidth,H=box.clientHeight,L=30,R=6,T=8,Bm=22,w=W-L-R,h=H-T-Bm,X=i=>L+(i+.5)*w/B,Y=v=>T+h-(v/top)*h;
    for(const v of [0,Math.round(top/2),top]){svg.append(mk('line',{x1:L,x2:W-R,y1:Y(v),y2:Y(v),class:'gl'}));const tx=mk('text',{x:L-8,y:Y(v)+4,'text-anchor':'end',class:'ax'});tx.textContent=v;svg.append(tx)}
    for(let k=0;k<=4;k++){const t=start+k*span/4,tx=mk('text',{x:L+k*w/4,y:H-4,'text-anchor':k===0?'start':k===4?'end':'middle',class:'ax'});tx.textContent=k===4?'Now':new Date(t).toLocaleTimeString(undefined,{hour:'numeric'});svg.append(tx)}
    const grad=mk('linearGradient',{id:'gp',x1:0,x2:0,y1:0,y2:1});grad.append(mk('stop',{offset:'0','stop-color':ACC,'stop-opacity':'.32'}),mk('stop',{offset:'1','stop-color':ACC,'stop-opacity':'0'}));const defs=mk('defs',{});defs.append(grad);svg.append(defs);
    let runs=[],cur=[];vals.forEach((v,i)=>{if(v==null){if(cur.length)runs.push(cur);cur=[]}else cur.push([X(i),Y(v)])});if(cur.length)runs.push(cur);
    for(const r of runs){const d=r.map((p,i)=>(i?'L':'M')+p[0].toFixed(1)+' '+p[1].toFixed(1)).join(' ');
      if(r.length>1)svg.append(mk('path',{d:d+' L'+r[r.length-1][0].toFixed(1)+' '+Y(0)+' L'+r[0][0].toFixed(1)+' '+Y(0)+' Z',fill:'url(#gp)'}));
      svg.append(mk('path',{d,fill:'none',stroke:ACC,'stroke-width':2,'stroke-linejoin':'round','stroke-linecap':'round'}));if(r.length===1)svg.append(mk('circle',{cx:r[0][0],cy:r[0][1],r:3,fill:ACC}))}
    const cl=mk('line',{y1:T,y2:T+h,stroke:'rgba(240,242,245,.25)','stroke-width':1,opacity:0}),dot=mk('circle',{r:4.5,fill:ACC,stroke:'#141518','stroke-width':2,opacity:0});svg.append(cl,dot);
    box.onpointermove=ev=>{const rc=box.getBoundingClientRect(),i=Math.max(0,Math.min(B-1,Math.floor((ev.clientX-rc.left-L)/w*B))),v=vals[i];cl.setAttribute('x1',X(i));cl.setAttribute('x2',X(i));cl.setAttribute('opacity',1);
      if(v!=null){dot.setAttribute('cx',X(i));dot.setAttribute('cy',Y(v));dot.setAttribute('opacity',1)}else dot.setAttribute('opacity',0);
      tip.innerHTML='<b>'+(v==null?'Offline':v+' player'+(v===1?'':'s'))+'</b><small>'+new Date(start+i*step).toLocaleTimeString(undefined,{hour:'numeric',minute:'2-digit'})+'</small>';tip.style.left=X(i)+'px';tip.style.top=(v==null?T+h/2:Y(v))+'px';box.classList.add('on')};
    box.onpointerleave=()=>{box.classList.remove('on');cl.setAttribute('opacity',0);dot.setAttribute('opacity',0)}};
  draw();new ResizeObserver(draw).observe(box)};
/* votes: one bar per local day, oldest on the left */
const chartVotes=()=>{const host=document.getElementById('chV'),days=[],d0=new Date();d0.setHours(0,0,0,0);
  for(let k=13;k>=0;k--){const d=new Date(d0);d.setDate(d.getDate()-k);days.push({t:d.getTime(),n:0})}
  for(const t of D.voteTimes){for(let k=days.length-1;k>=0;k--)if(t>=days[k].t){days[k].n++;break}}
  const top=Math.max(4,...days.map(d=>d.n));
  host.innerHTML='<div class="chart" role="img" aria-label="Votes per day for the last 14 days"><svg></svg><div class="tip"></div></div>';
  const box=host.firstChild,svg=box.querySelector('svg'),tip=box.querySelector('.tip');
  const draw=()=>{svg.innerHTML='';const W=box.clientWidth,H=box.clientHeight,L=30,R=6,T=8,Bm=22,w=W-L-R,h=H-T-Bm,bw=w/days.length,Y=v=>T+h-(v/top)*h;
    for(const v of [0,Math.round(top/2),top]){svg.append(mk('line',{x1:L,x2:W-R,y1:Y(v),y2:Y(v),class:'gl'}));const tx=mk('text',{x:L-8,y:Y(v)+4,'text-anchor':'end',class:'ax'});tx.textContent=v;svg.append(tx)}
    days.forEach((d,i)=>{const x=L+i*bw+2,bwi=Math.max(2,bw-4),y=Y(d.n),hh=T+h-y;
      if(d.n){const r=Math.min(4,bwi/2,hh);svg.append(mk('path',{d:'M'+x+' '+(T+h)+' V'+(y+r)+' Q'+x+' '+y+' '+(x+r)+' '+y+' H'+(x+bwi-r)+' Q'+(x+bwi)+' '+y+' '+(x+bwi)+' '+(y+r)+' V'+(T+h)+' Z',fill:ACC,opacity:i===days.length-1?1:.85}))}
      if((days.length-1-i)%3===0&&(i===days.length-1||days.length-1-i>=3)){const tx=mk('text',{x:x+bwi/2,y:H-4,'text-anchor':i===days.length-1?'end':'middle',class:'ax'});tx.textContent=i===days.length-1?'Today':new Date(d.t).toLocaleDateString(undefined,{month:'short',day:'numeric'});svg.append(tx)}
      const hit=mk('rect',{x:L+i*bw,y:T,width:bw,height:h,fill:'transparent'});hit.onpointerenter=()=>{tip.innerHTML='<b>'+d.n+' vote'+(d.n===1?'':'s')+'</b><small>'+new Date(d.t).toLocaleDateString(undefined,{weekday:'short',month:'short',day:'numeric'})+'</small>';tip.style.left=(x+bwi/2)+'px';tip.style.top=Y(d.n)+'px';box.classList.add('on')};svg.append(hit)});
    box.onpointerleave=()=>box.classList.remove('on')};
  draw();new ResizeObserver(draw).observe(box)};
chartPlayers();chartVotes();

/* reviews */
const STAR='<svg width="26" height="26" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="m12 2.8 2.9 5.9 6.5.9-4.7 4.6 1.1 6.4L12 17.5l-5.8 3.1 1.1-6.4L2.6 9.6l6.5-.9z"/></svg>';
const stars=r=>'★★★★★'.slice(0,Math.round(r))+'☆☆☆☆☆'.slice(0,5-Math.round(r));
let L=D.list,editing=false,replying=0;
const mine=()=>D.me&&L.find(r=>r.user_id===D.me.id);
const drawTop=()=>{const c=L.length,avg=c?L.reduce((a,r)=>a+r.rating,0)/c:0,dist=[5,4,3,2,1].map(s=>[s,L.filter(r=>r.rating===s).length]);
  document.getElementById('rvTop').innerHTML=c?'<div class="rv-top"><div class="rv-avg"><b>'+avg.toFixed(1)+'</b><div class="stars">'+stars(avg)+'</div><small>'+c+' review'+(c===1?'':'s')+'</small></div><div class="rv-dist">'+dist.map(([s,k])=>'<div><span>'+s+'</span><i><s style="width:'+(c?k/c*100:0)+'%"></s></i><em>'+k+'</em></div>').join('')+'</div></div>':'<p class="rv-e" style="margin:8px 0 14px">No reviews yet.'+(D.me&&D.me.can?' Be the first to share what playing here is like.':'')+'</p>';
  document.getElementById('rA').textContent=c?avg.toFixed(1):'–';document.getElementById('rC').innerHTML=c?'<span class="stars">'+stars(avg)+'</span> '+c+' review'+(c===1?'':'s'):'No reviews yet'};
const drawForm=()=>{const f=document.getElementById('rvForm'),m=mine();
  if(!D.me){f.innerHTML='<div class="rv-cta"><a href="/?next='+encodeURIComponent('/s/'+D.slug+'#reviews')+'">Sign in</a> to write a review.</div>';return}
  if(!D.me.can){f.innerHTML=D.me.why?'<div class="rv-cta">'+e(D.me.why)+'</div>':'';return}
  if(m&&!editing){f.innerHTML='';return}
  let pick=m?m.rating:0;
  f.innerHTML='<form class="rv-form" id="rvF"><h3>'+(m?'Edit your review':'Write a review')+'</h3><div class="rv-pick" role="radiogroup" aria-label="Your rating">'+[1,2,3,4,5].map(s=>'<button type="button" data-s="'+s+'" role="radio" aria-label="'+s+' star'+(s>1?'s':'')+'">'+STAR+'</button>').join('')+'</div>'
    +'<textarea id="rvB" maxlength="600" placeholder="What is it like to play here? Staff, roleplay, community…">'+e(m?m.body:'')+'</textarea><div class="row"><p class="hint" id="rvM">'+(m?m.body.length:0)+' / 600</p>'+(m?'<button type="button" class="btn sm" id="rvX">Cancel</button>':'')+'<button class="btn sm pri">'+(m?'Save':'Post review')+'</button></div></form>';
  const paint=()=>f.querySelectorAll('[data-s]').forEach(b=>{b.classList.toggle('on',+b.dataset.s<=pick);b.setAttribute('aria-checked',+b.dataset.s===pick)});paint();
  f.querySelectorAll('[data-s]').forEach(b=>{b.onclick=()=>{pick=+b.dataset.s;paint()};b.onmouseenter=()=>f.querySelectorAll('[data-s]').forEach(x=>x.classList.toggle('on',+x.dataset.s<=+b.dataset.s))});
  f.querySelector('.rv-pick').onmouseleave=paint;
  const ta=f.querySelector('#rvB'),msg=f.querySelector('#rvM');ta.oninput=()=>{msg.textContent=ta.value.length+' / 600';msg.className='hint'};
  const x=f.querySelector('#rvX');if(x)x.onclick=()=>{editing=false;drawAll()};
  f.querySelector('#rvF').onsubmit=async ev=>{ev.preventDefault();if(!pick){msg.textContent='Pick a star rating first.';msg.className='hint err';return}
    const b=f.querySelector('.btn.pri');b.disabled=true;try{const j=await api('/api/reviews',{slug:D.slug,rating:pick,body:ta.value});L=j.list;editing=false;drawAll();toast(m?'Review updated.':'Thanks for the review!')}catch(err){msg.textContent=err.message;msg.className='hint err';b.disabled=false}}};
const rv=r=>{const own=D.me&&r.user_id===D.me.id;
  return '<article class="rv" data-id="'+r.id+'"><div class="rv-h"><span class="rv-av">'+e((r.roblox_name||'?').slice(0,1).toUpperCase())+(r.roblox_id?'<img src="/rbx/avatar/'+e(r.roblox_id)+'" alt="" loading="lazy" onerror="this.remove()">':'')+'</span>'
    +'<div class="rv-n"><b>'+e(r.roblox_name||'Player')+(r.verified?VB:'')+'</b><small>'+ago(r.created)+(r.updated?' · edited':'')+(own?' · your review':'')+'</small></div><span class="rv-s" aria-label="'+r.rating+' out of 5 stars">'+stars(r.rating)+'</span></div>'
    +'<p>'+e(r.body)+'</p>'+(r.reply&&replying!==r.id?'<div class="rv-rep"><small>Reply from the owner</small><p>'+e(r.reply)+'</p></div>':'')
    +(replying===r.id?'<form class="rv-rf" data-rf="'+r.id+'"><textarea maxlength="400" placeholder="Reply as the server owner">'+e(r.reply||'')+'</textarea><div class="row"><button type="button" class="btn sm" data-cancel>Cancel</button><button class="btn sm pri">Post reply</button></div></form>':'')
    +'<div class="rv-a">'+(own?'<button data-edit>Edit</button><button class="dz" data-del>Delete</button>':'')+(D.me&&D.me.owner&&!own&&replying!==r.id?'<button data-reply>'+(r.reply?'Edit reply':'Reply')+'</button>':'')
    +(D.me&&D.me.admin&&!own?'<button class="dz" data-del>Remove</button>':'')+(D.me&&!own?'<button data-rep>Report</button>':'')+'</div></article>'};
const drawList=()=>{document.getElementById('rvL').innerHTML=L.map(rv).join('')};
const drawAll=()=>{drawTop();drawForm();drawList()};drawAll();
document.getElementById('rvL').addEventListener('click',async ev=>{const a=ev.target.closest('[data-edit],[data-del],[data-reply],[data-rep],[data-cancel]');if(!a)return;const id=+a.closest('.rv').dataset.id,r=L.find(x=>x.id===id);
  if(a.hasAttribute('data-edit')){editing=true;drawForm();document.getElementById('rvF').scrollIntoView({behavior:'smooth',block:'center'});return}
  if(a.hasAttribute('data-cancel')){replying=0;drawList();return}
  if(a.hasAttribute('data-reply')){replying=id;drawList();const t=document.querySelector('[data-rf] textarea');t.focus();return}
  if(a.hasAttribute('data-del')){const own=r.user_id===D.me.id;if(!(await ask({title:own?'Delete your review?':'Remove this review?',text:own?'You can write a new one any time.':'It is removed for everyone. Reports about it are closed.',ok:own?'Delete':'Remove',danger:true})))return;
    try{const j=await api('/api/reviews/delete',{id});L=j.list;editing=false;drawAll();toast(own?'Review deleted.':'Review removed.')}catch(err){toast(err.message)}return}
  if(a.hasAttribute('data-rep')){if(!(await ask({title:'Report this review?',text:'Oversite will check it against the rules. The writer won’t see who reported it.',ok:'Report'})))return;
    try{await api('/api/reviews/report',{id});toast('Thanks. Oversite will take a look.')}catch(err){toast(err.message)}return}});
document.getElementById('rvL').addEventListener('submit',async ev=>{const f=ev.target.closest('[data-rf]');if(!f)return;ev.preventDefault();const b=f.querySelector('.pri');b.disabled=true;
  try{const j=await api('/api/reviews/reply',{id:+f.dataset.rf,reply:f.querySelector('textarea').value});L=j.list;replying=0;drawList();toast('Reply posted.')}catch(err){toast(err.message);b.disabled=false}});

/* join the CAD, vote, play, report */
const jcb=document.getElementById('joinCad');if(jcb)jcb.onclick=async()=>{jcb.disabled=true;try{const j=await api('/api/explore/join',{slug:D.slug});location.href=j.next}catch(err){toast(err.message);jcb.disabled=false}};
const v=document.getElementById('vote');if(v)v.onclick=async()=>{if(v.dataset.wait)return toast('You can vote for '+D.name+' again in '+hrs(+v.dataset.wait)+'.');v.disabled=true;
  try{const j=await api('/api/explore/vote',{slug:D.slug});document.getElementById('vN').textContent=Number(j.votes).toLocaleString('en-US');v.dataset.wait=j.next_vote;v.querySelector('span').textContent='Voted';toast('Thanks for voting for '+D.name+'!')}catch(err){toast(err.message)}v.disabled=false};
document.querySelectorAll('[data-play]').forEach(p=>p.addEventListener('click',()=>{navigator.clipboard?.writeText(p.dataset.play).catch(()=>{});toast('Join code '+p.dataset.play+' copied. In ER:LC open Servers, then paste it to join.')}));
const rs=document.getElementById('repS');if(rs)rs.onclick=()=>{const d=document.createElement('dialog');d.className='dlg';
  const R=[['name','Inappropriate name'],['icon','Inappropriate icon'],['bio','Inappropriate bio'],['fake','Fake or misleading'],['other','Something else']];
  d.innerHTML='<form method="dialog" class="rp"><h2></h2><p>Tell Oversite what is wrong with this listing. The owner won’t see who reported it.</p><div class="rp-o">'+R.map((r,i)=>'<label><input type="radio" name="rr" value="'+r[0]+'"'+(i?'':' checked')+'><span>'+r[1]+'</span></label>').join('')+'</div><label for="rpD">Details <small>(optional)</small></label><textarea id="rpD" maxlength="500" rows="3" placeholder="What did you see?"></textarea><p class="msg" id="rpM"></p><div class="acts"><button type="button" class="btn" data-no>Cancel</button><button class="btn pri" data-send>Send report</button></div></form>';
  d.querySelector('h2').textContent='Report '+D.name;document.body.appendChild(d);const close=()=>{d.classList.remove('in');setTimeout(()=>{d.close();d.remove()},180)};
  d.querySelector('[data-no]').onclick=close;d.addEventListener('click',ev=>{if(ev.target===d)close()});d.addEventListener('cancel',ev=>{ev.preventDefault();close()});
  d.querySelector('form').addEventListener('submit',async ev=>{ev.preventDefault();const b=d.querySelector('[data-send]');b.disabled=true;
    try{await api('/api/explore/report',{slug:D.slug,reason:d.querySelector('[name=rr]:checked').value,details:d.querySelector('#rpD').value});close();toast('Thanks. Oversite will take a look at '+D.name+'.')}catch(err){say(d.querySelector('#rpM'),err.message);b.disabled=false}});
  d.showModal();requestAnimationFrame(()=>d.classList.add('in'))};
` });
};
