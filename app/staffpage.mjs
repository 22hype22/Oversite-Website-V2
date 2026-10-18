// The staff page (/<server>/staff) and the public application form (/<server>/apply/<id>). Both are shells: the content is
// drawn by preview/staff-hub.js and preview/apply-form.js from app/staffhub.mjs's API.
import { layout, esc, ST_CSS } from './pages.mjs';

const SH_CSS = `.sh-card{padding:18px 20px}.sh-row{display:flex;align-items:center;gap:12px;flex-wrap:wrap}.sh-row+.sh-row{margin-top:10px}
.sh-stat{display:flex;align-items:baseline;gap:10px}.sh-stat b{font-size:28px;font-weight:600;font-variant-numeric:tabular-nums;letter-spacing:-.01em}.sh-stat span{color:var(--dim);font-size:13px}
.sh-dot{width:9px;height:9px;border-radius:50%;flex:none;background:var(--faint)}.sh-dot.on{background:var(--ok);box-shadow:0 0 0 4px rgba(70,208,124,.14)}.sh-dot.brk{background:var(--warn);box-shadow:0 0 0 4px rgba(233,176,76,.14)}
.sh-bar{position:relative;height:6px;border-radius:999px;background:rgba(240,242,245,.08);overflow:hidden;flex:1;min-width:80px}.sh-bar i{position:absolute;inset:0 auto 0 0;border-radius:inherit;background:var(--ink)}.sh-bar i.met{background:var(--ok)}
.sh-list{list-style:none;margin:10px 0 0;padding:0}.sh-list li{display:flex;align-items:center;gap:12px;padding:10px 0;border-top:1px solid var(--hair);min-width:0}.sh-list li:first-child{border-top:0}
.sh-list .nm{display:flex;align-items:center;gap:10px;min-width:0;flex:1}.sh-list .nm b{font-weight:600;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.sh-list .nm small{color:var(--faint);font-size:12px;white-space:nowrap}
.sh-list .num{font-variant-numeric:tabular-nums;color:var(--dim);font-size:13px;white-space:nowrap}.sh-list .rk{width:22px;flex:none;text-align:right;color:var(--faint);font-size:12px;font-variant-numeric:tabular-nums}
.sh-av{position:relative;width:30px;height:30px;flex:none;border-radius:50%;overflow:hidden;background:#24272c;display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:600;color:var(--dim)}.sh-av img{position:absolute;inset:0;width:100%;height:100%;object-fit:cover}
.sh-list button.lnk,.sh-x{background:none;border:0;padding:0;color:inherit;font:inherit;cursor:pointer;text-align:left}.sh-list button.lnk:hover b{text-decoration:underline}
.sh-empty{color:var(--faint);font-size:13.5px;margin:10px 0 0}.sh-timer{font-variant-numeric:tabular-nums}
.sh-form{display:grid;grid-template-columns:1fr 1fr;gap:10px 12px;margin-top:12px}.sh-form label{display:flex;flex-direction:column;gap:5px;font-size:12px;color:var(--dim);min-width:0}.sh-form .wide{grid-column:1/-1}.sh-form input,.sh-form select,.sh-form textarea{width:100%;min-width:0}
.sh-form label.chk{flex-direction:row;align-items:center;gap:9px;font-size:13.5px;color:var(--ink)}.sh-form label.chk input{width:auto;margin:0}.sh-form [hidden]{display:none!important}.sh-form textarea{resize:vertical;min-height:84px}.sh-rec{list-style:none;margin:10px 0 0;padding:0}.sh-rec li{padding:12px 0;border-top:1px solid var(--hair)}.sh-rec li:first-child{border-top:0}
.sh-rec .h{display:flex;align-items:center;gap:8px;flex-wrap:wrap}.sh-rec .h b{font-weight:600}.sh-rec p{margin:6px 0 0;color:var(--dim);font-size:13.5px;white-space:pre-wrap;overflow-wrap:anywhere}.sh-rec small{color:var(--faint);font-size:12px}
.tag.bad{color:#F3A3A3;border-color:rgba(226,75,75,.4)}.tag.gold{color:#E8B33A;border-color:rgba(232,179,58,.4)}
.sh-q{border:1px solid var(--hair2);border-radius:12px;padding:12px;display:grid;grid-template-columns:1fr 150px auto;gap:8px;align-items:start}.sh-q+.sh-q{margin-top:8px}.sh-q textarea{grid-column:1/-1;min-height:60px}
.sh-q .opt{grid-column:1/-1}.sh-q .chk{margin:0}.sh-qb{display:flex;gap:2px}.sh-qb button{width:30px;height:30px;border-radius:8px;border:1px solid transparent;background:transparent;color:var(--dim);cursor:pointer}.sh-qb button:hover{color:var(--ink);background:rgba(255,255,255,.05)}
.sh-ans{margin:10px 0 0;padding:0;list-style:none}.sh-ans li{padding:8px 0;border-top:1px solid var(--hair)}.sh-ans li:first-child{border-top:0}.sh-ans b{display:block;font-size:12.5px;color:var(--dim);font-weight:500}.sh-ans p{margin:3px 0 0;white-space:pre-wrap;overflow-wrap:anywhere}
.sh-back{margin:0 0 12px}.sh-link{display:flex;gap:8px;align-items:center;margin-top:10px}.sh-link code{flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;padding:8px 10px;border-radius:8px;background:rgba(240,242,245,.05);border:1px solid var(--hair);font-size:12.5px}
.sh-types{display:flex;flex-wrap:wrap;gap:6px;margin-top:8px}.sh-types span{display:inline-flex;align-items:center;gap:6px;padding:5px 6px 5px 11px;border-radius:999px;border:1px solid var(--hair2);font-size:13px}.sh-types span button{border:0;background:none;color:var(--faint);cursor:pointer;font-size:15px;line-height:1;padding:0 4px}
.cs-h{margin:20px 0 8px;font-size:14px}.cs-opts{display:grid;gap:6px}.cs-opts small{color:var(--faint);font-size:12px}.cs-opt{display:flex;align-items:center;gap:8px;margin:0}.cs-opt input[type=radio]{width:auto;margin:0;flex:none}.cs-opt input:not([type]){flex:1;min-width:0}
.cs-opt button{border:0;background:none;color:var(--faint);cursor:pointer;font-size:16px;width:28px;height:28px;border-radius:8px}.cs-opt button:hover{color:var(--ink);background:rgba(255,255,255,.05)}
.cs-inline{display:flex;align-items:center;gap:8px;margin:0;font-size:12.5px;color:var(--dim)}.cs-mk{display:inline-flex;gap:4px;margin-left:6px;vertical-align:middle}.cs-mk button{font:inherit;font-size:12px;padding:3px 10px;border-radius:999px;border:1px solid var(--hair2);background:transparent;color:var(--dim);cursor:pointer}
.cs-mk button[data-mk="1"][aria-pressed="true"]{background:rgba(70,208,124,.15);border-color:rgba(70,208,124,.5);color:#7FE3A6}.cs-mk button[data-mk="0"][aria-pressed="true"]{background:rgba(226,75,75,.15);border-color:rgba(226,75,75,.5);color:#F3A3A3}
@media (max-width:640px){.sh-form{grid-template-columns:1fr}.sh-q{grid-template-columns:1fr}}`;

export const staffHub = ({ logo, user, c }) => layout({ title: `${c.name} staff · Oversite`, logo, user, body: `
<main class="stm"><style>${ST_CSS}${SH_CSS}</style>
<div class="st-top"><div><h1><b>${esc(c.name)}</b> staff</h1><p class="lead">Shifts, staff records, leave and applications for your team.</p></div><a class="btn" href="/${esc(c.slug)}">Open CAD</a></div>
<div class="sx" id="sh" data-api="/c/${esc(c.slug)}/api" data-slug="${esc(c.slug)}" data-origin="">
<nav class="st-nav" role="tablist" aria-label="Staff" id="shNav"></nav>
<div class="st-body" id="shBody"><p class="sh-empty">Loading…</p></div>
</div></main><script src="/staff-courses.js?v=1" defer></script><script src="/staff-hub.js?v=2" defer></script>` });

export const applyPage = ({ logo, user, c, id }) => layout({ title: `Apply · ${c.name} · Oversite`, logo, user, body: `
<main class="acct" style="max-width:680px"><style>${SH_CSS}</style>
<div id="ap" data-api="/c/${esc(c.slug)}/api/apply/${esc(id)}" data-server="${esc(c.name)}"><section class="card"><p class="sh-empty">Loading…</p></section></div>
</main><script src="/apply-form.js?v=1" defer></script>` });

// taking a course (/<server>/course/<id>): the reading, then the questions; the result shows straight away, or after marking
export const coursePage = ({ logo, user, c, id }) => layout({ title: `Course · ${c.name} · Oversite`, logo, user, body: `
<main class="acct" style="max-width:720px"><style>${SH_CSS}.ct-sec h3{margin:0 0 6px;font-size:15px}.ct-sec p{margin:0;color:#C9CDD3;font-size:14.5px;line-height:1.65;white-space:pre-wrap;overflow-wrap:anywhere}.ct-sec+.ct-sec{margin-top:16px}
.ct-q{padding:14px 0;border-top:1px solid var(--hair)}.ct-q:first-of-type{border-top:0}.ct-q>b{display:block;font-weight:600;margin-bottom:8px;white-space:pre-wrap}.ct-q small{color:var(--faint);font-weight:400}
.ct-opts{display:grid;gap:6px}.ct-opts label{display:flex;align-items:center;gap:10px;margin:0;padding:10px 12px;border:1px solid var(--hair2);border-radius:10px;cursor:pointer;font-size:14px}.ct-opts label:has(input:checked){border-color:var(--ink);background:rgba(255,255,255,.05)}
.ct-opts input{width:auto;margin:0}.ct-q.ok>b::after{content:" ✓";color:var(--ok)}.ct-q.no>b::after{content:" ✗";color:var(--bad)}.ct-res{display:flex;align-items:baseline;gap:12px}.ct-res b{font-size:34px;font-weight:600;letter-spacing:-.02em;font-variant-numeric:tabular-nums}</style>
<div id="ct" data-api="/c/${esc(c.slug)}/api/course/${esc(id)}" data-back="/${esc(c.slug)}/staff#courses"><section class="card"><p class="sh-empty">Loading…</p></section></div>
</main><script src="/course-take.js?v=1" defer></script>` });
