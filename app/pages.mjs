// Server-rendered pages around the live map: landing, dashboard, community settings, invites. Same visual language as the map.
import { DOCS, UPDATED } from './legal.mjs';
import { isSiteAdmin } from './admins.mjs';
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
.brand i{display:grid;place-items:center}.brand .ov{font-weight:400}.brand .cad{font-weight:700;margin-left:-5px}.brand img{height:26px;width:auto;display:block}
.top .sp{flex:1}
.nav{color:var(--dim);text-decoration:none;font-size:13.5px;font-weight:500;padding:7px 12px;border-radius:999px;transition:background .15s,color .15s}.nav:hover{color:var(--ink);background:rgba(255,255,255,.06)}
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
.cols2{display:grid;grid-template-columns:1fr 1fr;gap:0 14px}@media (max-width:560px){.cols2{grid-template-columns:1fr}}
label.chk{display:flex;align-items:center;gap:8px;margin-top:14px;font-size:13px;color:var(--dim);cursor:pointer}label.chk input{width:auto;margin:0}
.setup-dg{display:flex;align-items:center;gap:18px;margin:0 0 18px;border-color:rgba(88,101,242,.5);background:linear-gradient(120deg,rgba(88,101,242,.16),var(--panel) 60%)}.setup-dg h2{margin-bottom:4px}.setup-dg .note{margin:0}.setup-dg .btn{flex:none}
@media (max-width:700px){.setup-dg{flex-direction:column;align-items:stretch}}
.xp{max-width:1180px}.xp-head{display:flex;align-items:flex-end;justify-content:space-between;gap:20px;flex-wrap:wrap;margin-bottom:18px}.xp-head .lead{margin:0}
.xp-tools{display:flex;align-items:center;gap:12px;flex-wrap:wrap}.xp-open{margin:0!important}
.xp-search{display:flex;align-items:center;gap:8px;padding:0 12px;border-radius:10px;background:var(--field);border:1px solid var(--hair2);color:var(--faint);min-width:260px}.xp-search:focus-within{border-color:rgba(240,242,245,.45)}
.xp-search input{border:0;background:none;padding:10px 0;outline:0}
.xp-tabs{display:flex;gap:4px;padding:5px;margin-bottom:18px;border-radius:999px;background:rgba(16,16,18,.66);border:1px solid var(--hair);backdrop-filter:blur(14px);-webkit-backdrop-filter:blur(14px);overflow-x:auto;scrollbar-width:none}
.xp-tabs button{flex:1;white-space:nowrap;display:flex;align-items:center;justify-content:center;gap:8px;font:inherit;font-size:13.5px;font-weight:500;color:var(--dim);background:none;border:0;border-radius:999px;padding:9px 16px;cursor:pointer;transition:background .2s,color .2s}
.xp-tabs button svg{width:15px;height:15px}.xp-tabs button:hover{color:var(--ink)}.xp-tabs button[aria-selected="true"]{color:#0B0B0C;background:#F0F2F5}
.xp-list{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:16px}
.xr{position:relative;display:flex;flex-direction:column;border-radius:18px;overflow:hidden;background:var(--panel);border:1px solid var(--hair);backdrop-filter:blur(18px);-webkit-backdrop-filter:blur(18px);cursor:pointer;transition:border-color .2s,transform .25s cubic-bezier(.23,1,.32,1),box-shadow .25s}
.xr.st-open{--sc:#46D07C}.xr.st-full{--sc:#E9B04C}
.xr:hover{transform:translateY(-3px);border-color:rgba(240,242,245,.2);box-shadow:0 22px 44px -22px rgba(0,0,0,.85)}.xr:focus-visible{outline:2px solid rgba(240,242,245,.5);outline-offset:2px}
.xr.is-top{border-color:rgba(240,242,245,.24);box-shadow:0 0 0 1px rgba(240,242,245,.06),0 24px 60px -30px rgba(200,215,255,.35)}
.xr-map{position:relative;height:96px;background:#3E6973 url(/liberty-county.jpg) var(--pos)/850% no-repeat;transition:background-size .6s cubic-bezier(.23,1,.32,1)}
.xr:hover .xr-map{background-size:930%}
.xr-map::after{content:"";position:absolute;inset:0;background:linear-gradient(180deg,rgba(8,10,12,.1),rgba(8,10,12,.35) 50%,rgba(16,16,18,.96))}
.xr-mt{position:absolute;left:14px;right:14px;top:12px;z-index:1;display:flex;align-items:center;justify-content:space-between;gap:8px}
.xs{display:inline-flex;align-items:center;gap:7px;font-size:12px;color:#D5D8DD;padding:5px 11px;border-radius:999px;background:rgba(8,9,11,.72);backdrop-filter:blur(8px);border:1px solid rgba(255,255,255,.08)}
.xs b{color:#fff;font-weight:600}.xs.full b{color:#F2C46E}
.xr-badge{font-size:10.5px;font-weight:600;letter-spacing:.09em;text-transform:uppercase;color:#0B0B0C;background:#F0F2F5;padding:4px 10px;border-radius:999px}
.xr-rank{font-size:11.5px;font-weight:600;color:#E9EAEC;padding:4px 9px;border-radius:999px;background:rgba(8,9,11,.72);border:1px solid rgba(255,255,255,.08)}
.xr-code{position:absolute;right:14px;bottom:12px;z-index:1;font:600 11.5px/1 ui-monospace,"Geist Mono",Menlo,monospace;letter-spacing:.06em;color:#E9EAEC;padding:5px 8px;border-radius:7px;background:rgba(8,9,11,.6);border:1px solid rgba(255,255,255,.12)}
.xr-bar{position:absolute;left:0;right:0;bottom:0;z-index:1;height:2px;background:rgba(255,255,255,.06)}.xr-bar i{display:block;height:100%;background:var(--sc,#46D07C);box-shadow:0 0 10px var(--sc,#46D07C)}
.xr-b{display:flex;flex-direction:column;gap:12px;padding:0 18px 18px;flex:1}
.xr-h{display:flex;align-items:flex-end;gap:14px;margin-top:-30px;position:relative;z-index:1}
.xr-ic{position:relative;overflow:hidden;flex:none;width:64px;height:64px;border-radius:17px;display:grid;place-items:center;font-size:24px;font-weight:700;background:linear-gradient(160deg,#2d3440,#1b1f26);border:3px solid #141517;box-shadow:0 10px 22px rgba(0,0,0,.45)}
.xr-ic img{position:absolute;inset:0;width:100%;height:100%;object-fit:cover}
.xr-n{flex:1;min-width:0;padding-top:34px}.xr h3{margin:0;font-size:18px;font-weight:600;letter-spacing:-.01em;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.by{display:inline-flex;align-items:center;gap:0;color:var(--dim);font-size:12.5px;margin-top:2px}.by .vb{margin-left:5px;vertical-align:-1px}.by img{width:16px;height:16px;border-radius:50%;background:#2a2d33}
.xr-mine{flex:none;align-self:flex-end;margin-top:34px;font-size:12px;font-weight:500;color:var(--ink);text-decoration:none;padding:6px 11px;border-radius:999px;border:1px solid var(--hair2);background:rgba(240,242,245,.06)}.xr-mine:hover{background:rgba(240,242,245,.12)}
.xr-m{display:flex;align-items:center;flex-wrap:wrap;gap:6px 14px;color:var(--dim);font-size:12.5px}.xr-m span{display:inline-flex;align-items:center;gap:6px}.xr-m .xr-rt{color:#F2C46E;font-weight:600}.xr-m .xr-tag{gap:5px;padding:3px 10px 3px 8px;border-radius:999px;background:rgba(240,242,245,.07);border:1px solid var(--hair2);color:#E2E5E9;font-weight:500}.xr-m .xr-tag svg{color:#8DB6FF}
.xr-b p{margin:0;color:#C9CDD3;font-size:13.5px;line-height:1.5;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden;min-height:3em}.xr-b p.none{color:var(--faint)}
.xr-f{display:flex;align-items:center;justify-content:space-between;gap:10px;flex-wrap:wrap;margin-top:auto;padding-top:12px;border-top:1px solid var(--hair)}
.xr-d,.xr-t{display:flex;align-items:center;flex-wrap:wrap;gap:6px}
.xd{display:inline-flex;align-items:center;gap:6px;font-size:11.5px;font-weight:600;color:#D5D8DD;padding:4px 9px;border-radius:7px;background:rgba(255,255,255,.04);border:1px solid var(--hair2)}
.xr-a{display:flex;align-items:center;gap:8px;flex-wrap:wrap}
.xb{display:inline-flex;align-items:center;gap:7px;font:inherit;font-size:13px;font-weight:500;padding:8px 14px;border-radius:999px;border:1px solid var(--hair2);background:rgba(240,242,245,.06);color:var(--ink);text-decoration:none;white-space:nowrap;cursor:pointer;transition:background .15s,transform .15s cubic-bezier(.23,1,.32,1),border-color .15s}
.xb:hover{background:rgba(240,242,245,.12)}.xb:active{transform:scale(.97)}.xb small{color:var(--dim);font-weight:500;font-size:12px}
.xb.pri{background:#F0F2F5;border-color:#F0F2F5;color:#0B0B0C;font-weight:600}.xb.pri:hover{background:#fff}
.xb.voted{color:var(--dim)}.xb.voted svg{color:#E9C24C}.xb[disabled]{opacity:.6}.xb svg{width:15px;height:15px}
.xp-empty{text-align:center;padding:60px 20px;border:1px dashed var(--hair2);border-radius:16px;color:var(--dim)}.xp-empty b{display:block;color:var(--ink);font-size:16px;margin-bottom:6px}.xp-empty p{margin:0 0 16px}
.xp-toast{position:fixed;left:50%;bottom:24px;transform:translate(-50%,12px);z-index:50;max-width:calc(100vw - 32px);padding:11px 16px;border-radius:12px;background:#1A1B1F;border:1px solid var(--hair2);box-shadow:0 18px 40px -14px rgba(0,0,0,.7);font-size:13.5px;opacity:0;pointer-events:none;transition:opacity .2s,transform .25s cubic-bezier(.23,1,.32,1)}.xp-toast.on{opacity:1;transform:translate(-50%,0)}
.xp-dlg{border:0;padding:0;background:none;max-width:min(600px,calc(100vw - 32px));width:100%;color:var(--ink)}
.xp-dlg::backdrop{background:rgba(5,6,8,.6);backdrop-filter:blur(4px);opacity:0;transition:opacity .2s}.xp-dlg.in::backdrop{opacity:1}
.xp-dlgin{position:relative;display:flex;flex-direction:column;gap:14px;padding:24px;border-radius:20px;background:#141518;border:1px solid var(--hair2);box-shadow:0 30px 60px -20px rgba(0,0,0,.7);opacity:0;transform:translateY(6px) scale(.985);transition:opacity .2s,transform .25s cubic-bezier(.23,1,.32,1)}
.xp-dlg.in .xp-dlgin{opacity:1;transform:none}.xp-dlgin .xr-a{justify-content:flex-start}.xd-top .xr-ic{margin:0;border-width:1px}.xd-top .xr-m{margin-top:6px}
.xp-x{position:absolute;right:14px;top:12px;width:32px;height:32px;border-radius:9px;border:1px solid var(--hair2);background:none;color:var(--dim);font-size:18px;cursor:pointer}.xp-x:hover{color:var(--ink)}
.xd-top{display:flex;align-items:center;gap:16px;padding-right:36px}.xd-top h2{margin:0;font-size:22px}
.xd-rep{align-self:center;background:none;border:0;padding:4px 8px;color:var(--faint);font:inherit;font-size:12.5px;cursor:pointer;text-decoration:underline;text-underline-offset:3px}.xd-rep:hover{color:var(--dim)}
.rp-o{display:grid;gap:6px;margin:16px 0 4px}.rp-o label{display:flex;align-items:center;gap:10px;margin:0;padding:10px 12px;border-radius:11px;border:1px solid var(--hair);cursor:pointer;font-size:13.5px}
.rp-o label:has(input:checked){border-color:rgba(76,141,255,.5);background:rgba(76,141,255,.08)}.rp-o input{accent-color:#4C8DFF;margin:0;width:16px;height:16px;flex:none;padding:0}.rp-o span{flex:1;text-align:left}
.rp textarea{width:100%;resize:vertical}.rp label small{color:var(--faint);font-weight:400}
.xd-bio{margin:0;color:#C9CDD3;line-height:1.55;white-space:pre-line}
.xd-facts{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px 18px;padding:14px;border-radius:12px;border:1px solid var(--hair);background:rgba(255,255,255,.02)}
.xd-facts small{display:block;color:var(--faint);font-size:11px}.xd-facts b{display:block;font-size:13px;font-weight:500;margin-top:2px;overflow-wrap:anywhere}.xd-facts code{font-family:ui-monospace,"Geist Mono",monospace}
@media (max-width:900px){.xp-list{grid-template-columns:1fr}.xp-tabs button{flex:none}}
@media (max-width:640px){.xp-search{min-width:0;flex:1 1 100%}.xd-facts{grid-template-columns:1fr}.xp-tabs button{padding:8px 13px}.xr-h{flex-wrap:wrap}.xr-mine{margin:0 0 0 78px;align-self:auto}.xr h3{white-space:normal}}
@media (prefers-reduced-motion:reduce){.xp-dlgin,.xp-dlg::backdrop,.xr,.xb,.xp-toast,.xr-map{transition:none}}
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
.hero{min-height:calc(100dvh - 128px);display:grid;place-items:center;padding:24px}
.hero .box{width:min(460px,100%);text-align:center}
.hero .mark{display:flex;justify-content:center;margin:0 auto 20px}.hero .mark img{height:66px;width:auto;display:block}
.hero h1{font-size:34px;margin:0 0 8px}.hero .lead{margin:0 auto 26px}
.hero .actions{display:grid;gap:10px}
.hero.wide .box{width:min(820px,100%)}
.hero.notop{min-height:calc(100dvh - 58px)}
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

.lg{max-width:1080px}
.lg-sw{display:inline-flex;gap:4px;padding:5px;border-radius:999px;background:rgba(16,16,18,.55);border:1px solid var(--hair);backdrop-filter:blur(14px);-webkit-backdrop-filter:blur(14px);margin:6px 0 22px}
.lg-sw a{padding:7px 16px;border-radius:999px;font-size:13px;font-weight:500;color:var(--dim);text-decoration:none;transition:background .15s,color .15s}.lg-sw a:hover{color:var(--ink)}.lg-sw a[aria-current]{background:rgba(255,255,255,.1);color:var(--ink)}
.lg-hd h1{font-size:clamp(30px,5vw,44px);letter-spacing:-.03em;line-height:1.05;margin:0 0 10px;font-weight:600}
.lg-hd .lead{max-width:62ch;color:#C9CDD3;margin:0 0 6px;font-size:15px}.lg-hd .upd{font-size:12.5px;color:var(--faint);margin:0}
.lg-body{display:grid;grid-template-columns:220px minmax(0,1fr);gap:28px;margin-top:28px;align-items:start}
.lg-toc{position:sticky;top:18px;padding:14px 8px;border-radius:16px;background:rgba(16,16,18,.42);border:1px solid var(--hair);backdrop-filter:blur(16px);-webkit-backdrop-filter:blur(16px)}
.lg-toc b{display:block;font-size:11px;font-weight:500;letter-spacing:.08em;text-transform:uppercase;color:var(--faint);padding:0 10px 8px}
.lg-toc a{display:flex;gap:8px;padding:6px 10px;border-radius:9px;font-size:13px;color:var(--dim);text-decoration:none;line-height:1.35;transition:background .15s,color .15s}.lg-toc a span{color:var(--faint);font-variant-numeric:tabular-nums;min-width:16px}
.lg-toc a:hover,.lg-toc a.on{background:rgba(255,255,255,.06);color:var(--ink)}
.lg-s{scroll-margin-top:18px;padding:22px 24px;border-radius:18px;background:rgba(16,16,18,.48);border:1px solid var(--hair);backdrop-filter:blur(18px);-webkit-backdrop-filter:blur(18px)}.lg-s+.lg-s{margin-top:14px}
.lg-s h2{display:flex;align-items:baseline;gap:10px;margin:0 0 12px;font-size:18px;font-weight:600;letter-spacing:-.01em}.lg-s h2 span{font-size:12px;font-weight:500;color:var(--faint);font-variant-numeric:tabular-nums}
.lg-short{display:flex;gap:10px;align-items:baseline;margin:0 0 14px;padding:11px 14px;border-radius:12px;background:rgba(76,141,255,.09);border:1px solid rgba(76,141,255,.2);color:var(--ink);font-size:14px;line-height:1.55}
.lg-short b{flex:none;font-size:11px;font-weight:600;letter-spacing:.06em;text-transform:uppercase;color:#8DB6FF}
.lg-s p,.lg-s li{color:#C2C6CC;font-size:14px;line-height:1.7;margin:0 0 10px}.lg-s p:last-child{margin-bottom:0}.lg-s ul{padding-left:18px;margin:4px 0 10px}.lg-s li{margin:0 0 6px}.lg-s a{color:var(--ink)}.lg-s b,.lg-s strong{color:var(--ink);font-weight:600}
.lg-t{width:100%;border-collapse:collapse;margin:6px 0 12px;font-size:13px}.lg-t th{text-align:left;font-weight:500;color:var(--faint);font-size:11.5px;letter-spacing:.04em;text-transform:uppercase;padding:0 12px 8px 0;border-bottom:1px solid var(--hair2)}
.lg-t td{padding:9px 12px 9px 0;border-bottom:1px solid var(--hair);color:#C2C6CC;vertical-align:top;line-height:1.55}.lg-t tr:last-child td{border-bottom:0}.lg-t td:first-child{color:var(--ink);white-space:nowrap}
.lg-tw{overflow-x:auto}
@media (max-width:820px){.lg-body{grid-template-columns:1fr;gap:16px}.lg-toc{position:static}.lg-toc nav{display:grid;grid-template-columns:1fr 1fr}.lg-s{padding:18px 16px}}
@media (max-width:520px){.lg-toc nav{grid-template-columns:1fr}.lg-short{flex-direction:column;gap:4px}}
.xr-ic:has(img),.sv-ic:has(img),.adm-r .pic:has(img),.rv-av:has(img),.prof .pic:has(img),.sp-icon:has(img){color:transparent}.sp-icon:has(img) i{color:var(--ink)}
.vb{display:inline-block;vertical-align:-2px;margin-left:6px;flex:none}
.adm{max-width:1080px}.adm h1{margin:0 0 4px}.adm .lead{margin:0 0 22px}
.adm-cols{display:grid;grid-template-columns:1fr 1fr;gap:18px;align-items:start}.adm-cols .card+.card{margin-top:0}
.adm-h{display:flex;align-items:center;gap:10px;margin:0 0 12px}.adm-h h2{margin:0;font-size:17px}.adm-h span{margin-left:auto;font-size:12px;color:var(--faint)}
.adm-q{width:100%;margin:0 0 10px}
.adm-l{display:grid;grid-template-columns:minmax(0,1fr);gap:6px;max-height:62vh;overflow:auto;margin:0 -6px;padding:0 6px}
.adm-r{display:flex;align-items:center;gap:12px;padding:9px 10px;border-radius:12px;border:1px solid var(--hair);background:rgba(255,255,255,.02)}
.adm-r.on{border-color:rgba(76,141,255,.35);background:rgba(76,141,255,.07)}
.adm-r .pic{width:36px;height:36px;border-radius:50%;flex:none;display:grid;place-items:center;position:relative;overflow:hidden;background:#2a2d33;font-weight:600;font-size:14px}.adm-r .pic.sq{border-radius:10px}
.adm-r .pic img{position:absolute;inset:0;width:100%;height:100%;object-fit:cover}
.adm-r .tx{flex:1;min-width:0}.adm-r .tx b{display:flex;align-items:center;font-weight:600;font-size:14px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.adm-r .tx small{display:block;color:var(--faint);font-size:12px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.adm-r .btn{flex:none;min-width:92px}.adm-r .btn.is-on{background:rgba(76,141,255,.16);border-color:rgba(76,141,255,.45);color:#CFE0FF}
.adm-rep{margin-bottom:18px}
.adm-r.off{border-color:rgba(226,75,75,.3);background:rgba(226,75,75,.05)}
.adm-r{flex-wrap:wrap}.adm-b{display:flex;gap:6px;flex:none}.adm-b .btn{min-width:0}.adm-r .adm-b .btn[data-k]{min-width:84px}
.adm-x{flex-basis:100%;display:flex;flex-wrap:wrap;gap:6px;padding:10px 0 2px 48px;border-top:1px solid var(--hair);margin-top:4px}
.adm-ts{display:flex;flex-wrap:wrap;gap:4px;margin-top:5px}
.adm-t{font-style:normal;font-size:11px;font-weight:500;padding:2px 7px;border-radius:999px;border:1px solid var(--hair2);color:var(--dim)}.adm-t.warn{color:#F0C46E;border-color:rgba(233,176,76,.35)}.adm-t.bad{color:#F3A3A3;border-color:rgba(226,75,75,.4)}
.adm-rr .tx small{white-space:normal}.adm-rr q{display:block;margin-top:6px;color:#C9CDD3;font-size:13px;quotes:none}
.btn.ghost{background:transparent}
.btn.warnb{background:transparent;color:#F3A3A3;border-color:rgba(226,75,75,.35)}.btn.warnb:hover{background:rgba(226,75,75,.12);color:#FFC2C2}
@media (max-width:560px){.adm-b{flex-basis:100%;padding-left:48px}.adm-x{padding-left:0}}
.adm-e{color:var(--faint);font-size:13px;padding:14px 4px}
@media (max-width:860px){.adm-cols{grid-template-columns:1fr}.adm-l{max-height:none}}
.foot-sp{height:58px}
@media (max-width:560px){.top{padding:14px 16px;gap:4px}.top .brand{margin-right:auto}.nav{padding:7px 9px}.who{padding:3px}.who .nm{display:none}}
@media (max-width:440px){.top form{display:none}}
.site-foot{position:fixed;left:0;right:0;bottom:0;z-index:40;display:flex;align-items:center;justify-content:center;gap:16px;padding:11px 16px calc(11px + env(safe-area-inset-bottom));font-size:12.5px;pointer-events:none;text-shadow:0 1px 8px rgba(0,0,0,.9)}.site-foot>*{pointer-events:auto}.site-foot svg{filter:drop-shadow(0 1px 6px rgba(0,0,0,.85))}
.site-foot nav{display:flex;flex-wrap:wrap;justify-content:center;gap:4px 18px}.site-foot a{color:var(--dim);text-decoration:none;transition:color .15s}.site-foot a:hover{color:var(--ink)}
.site-foot .sep{width:1px;height:16px;background:var(--hair2);flex:none}
.site-foot .soc{display:grid;place-items:center;width:30px;height:30px;margin:-4px -8px;border-radius:8px;color:#fff;opacity:.8;transition:opacity .15s,background .15s}.site-foot .soc:hover{opacity:1;background:rgba(255,255,255,.07)}
@media (max-width:480px){.site-foot{gap:10px;font-size:12px}.site-foot nav{gap:4px 12px}}
.xp-toast{bottom:74px}
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
.btn.warnb{background:transparent;color:#F3A3A3;border-color:rgba(226,75,75,.35)}.btn.warnb:hover{background:rgba(226,75,75,.12);color:#FFC2C2}
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
export const INTRO_HEAD = `<script>try{if(sessionStorage.getItem('ov_intro_seen')!=='1'){const r=document.documentElement;r.classList.add('ov-intro');setTimeout(()=>r.classList.remove('ov-intro'),2500)}}catch(e){}</script><style>html.ov-intro::after{content:"";position:fixed;inset:0;z-index:2147483646;background:#07080A}</style><script src="/intro-splash.js?v=2" defer></script>`;
// the five ranks, as people read them
export const RANK_LABEL = { owner: 'Owner', co_owner: 'Co-Owner', admin: 'Admin', mod: 'Mod', member: 'Member', staff: 'Admin' };
const runs = r => r === 'owner' || r === 'co_owner';
// Oversite's blue check: a scalloped seal, given by hand from /admin
const SEAL = '<path fill="#4C8DFF" d="M12 1.6l2.3 1.7 2.8-.3 1.1 2.6 2.6 1.1-.3 2.8L22.4 12l-1.9 2.5.3 2.8-2.6 1.1-1.1 2.6-2.8-.3L12 22.4l-2.3-1.9-2.8.3-1.1-2.6-2.6-1.1.3-2.8L1.6 12l1.9-2.5-.3-2.8 2.6-1.1 1.1-2.6 2.8.3z"/><path fill="none" stroke="#fff" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" d="m7.8 12.3 2.8 2.8 5.6-5.8"/>';
export const vbadge = (size = 16) => `<svg class="vb" width="${size}" height="${size}" viewBox="0 0 24 24" role="img" aria-label="Verified by Oversite"><title>Verified by Oversite</title>${SEAL}</svg>`;
// pinned to the bottom of every page: the same legal links as oversite.shop, then our Roblox group and Discord
const ROBLOX_GROUP = 'https://www.roblox.com/communities/691798472/Oversite-Customs', DISCORD_INVITE = 'https://discord.gg/ovs';
const FOOT = `<div class="foot-sp" aria-hidden="true"></div><footer class="site-foot"><nav aria-label="Legal"><a href="/privacy">Privacy Policy</a><a href="/terms">Terms of Use</a><a href="/refunds">Sales and Refunds</a></nav><span class="sep" aria-hidden="true"></span>
<a class="soc" href="${ROBLOX_GROUP}" target="_blank" rel="noopener" aria-label="Oversite on Roblox" title="Oversite on Roblox"><svg width="16" height="16" viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" fill-rule="evenodd" d="M5.92 1.47 22.53 5.92 18.08 22.53 1.47 18.08Z M10.37 9.18 14.82 10.37 13.63 14.82 9.18 13.63Z"/></svg></a>
<a class="soc" href="${DISCORD_INVITE}" target="_blank" rel="noopener" aria-label="Oversite on Discord" title="Oversite on Discord"><svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M19.6 5.4A17 17 0 0 0 15.4 4l-.5 1a15.6 15.6 0 0 0-5.8 0L8.6 4a17 17 0 0 0-4.2 1.4C1.8 9.4 1 13.3 1.4 17.1A17 17 0 0 0 6.6 20l1.1-1.8c-.6-.2-1.2-.5-1.7-.9l.4-.3a12.2 12.2 0 0 0 11.2 0l.4.3c-.5.4-1.1.7-1.7.9l1.1 1.8a17 17 0 0 0 5.2-2.9c.5-4.4-.8-8.3-2.9-11.7zM8.7 14.8c-1 0-1.9-1-1.9-2.1s.8-2.1 1.9-2.1 1.9 1 1.9 2.1-.8 2.1-1.9 2.1zm6.6 0c-1 0-1.9-1-1.9-2.1s.8-2.1 1.9-2.1 1.9 1 1.9 2.1-.8 2.1-1.9 2.1z"/></svg></a></footer>`;
export const layout = ({ title, logo, user, body, bg = true, top = true, script = '' }) => `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(title)}</title><link rel="icon" href="/favicon.ico?v=5" sizes="32x32"><link rel="icon" type="image/svg+xml" href="/icon-tab.svg?v=5"><link rel="icon" type="image/png" href="/icon-tab.png?v=5"><link rel="apple-touch-icon" href="/apple-touch-icon.png?v=4"><link rel="manifest" href="/manifest.webmanifest?v=4"><meta name="apple-mobile-web-app-title" content="Oversite"><meta name="application-name" content="Oversite"><meta name="theme-color" content="#0D1416">
<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin><link href="https://fonts.googleapis.com/css2?family=Geist:wght@300;400;500;600&display=swap" rel="stylesheet">
<style>${CSS}</style>${INTRO_HEAD}<script src="/dropdown.js?v=1" defer></script></head><body>${bg ? '<div class="bg"></div>' : ''}
${top ? `<header class="top"><a class="brand" href="${user ? '/account' : '/'}"><i><img src="data:image/png;base64,${logo}" alt=""></i><span class="ov">Oversite</span> <span class="cad">CAD</span></a><span class="sp"></span>
${user ? `${isSiteAdmin(user) ? '<a class="nav" href="/admin">Moderation</a>' : ''}<a class="nav" href="/explore">Explore</a><a class="who" href="/account" title="Your account">${user.roblox_id ? `<img src="/rbx/avatar/${esc(user.roblox_id)}" alt="" onerror="this.replaceWith(Object.assign(document.createElement('span'),{className:'av',textContent:${esc(JSON.stringify((user.roblox_name || user.name || '?').slice(0, 1).toUpperCase()))}}))">` : user.avatar ? `<img src="${esc(user.avatar)}" alt="">` : `<span class="av">${esc((user.roblox_name || user.name).slice(0, 1).toUpperCase())}</span>`}<span class="nm">${esc(user.roblox_name || user.name)}</span></a><form method="post" action="/auth/logout" style="margin:0"><button class="btn sm">Sign out</button></form>` : ''}</header>` : ''}
${body}${FOOT}<script>${JS}${script}</script></body></html>`;

export const landing = ({ logo, discord, owner, roblox, next = '/dashboard', error = '' }) => layout({ title: 'Oversite', logo, top: false, body: `
<section class="hero wide notop"><div class="box">
<div class="mark"><img src="data:image/png;base64,${logo}" alt=""></div>
<h1><span style="font-weight:400">Oversite</span> <b>CAD</b></h1>
<p class="lead">A live dispatch system for ER:LC private servers. Every unit on a 3D map of Liberty County, live from your server.</p>
<div class="paths">
<form class="card path" id="codeform" autocomplete="off"><h2>Join your server</h2><p class="note">Enter your server's invite code.</p>
<input id="code" placeholder="Invite code" aria-label="Invite code" autocapitalize="characters" spellcheck="false" required>
<button class="btn pri">Sign in</button><p class="msg" id="codemsg"></p>${roblox ? '<div class="or">already linked Roblox?</div><a class="btn" href="/auth/roblox?next=/dashboard">Sign in with Roblox</a>' : ''}</form>
<form class="card path" id="makeform" autocomplete="off"><h2>Create a server</h2><p class="note">Set up a CAD for your ER:LC server.</p>
<input id="mname" maxlength="48" placeholder="Server name" aria-label="Server name" required>
<input id="mslug" maxlength="32" placeholder="address" aria-label="Address" required><p class="hint addr">oversitescad.com/c/<span id="slugp">your-server</span></p>
<input id="mcode" maxlength="24" placeholder="Invite code (optional)" aria-label="Invite code" autocapitalize="characters" spellcheck="false"><p class="hint">What members type to join. Leave it empty for a random one.</p>
<p class="hint" style="margin:0 0 10px">Next you connect your server's <b>Discord</b>. Every Oversite server needs one: it's how staff ranks and roles work.</p><button class="btn pri">Create and connect Discord</button><p class="msg" id="makemsg"></p></form>
</div>
${discord ? `<div class="or">or</div><a class="btn discord" href="/auth/discord?next=${encodeURIComponent(next)}">Continue with Discord</a>` : ''}
${owner ? `<form method="post" action="/auth/owner" class="row" style="justify-content:center;margin-top:14px" autocomplete="off"><input type="hidden" name="next" value="${esc(next)}"><input name="code" inputmode="numeric" placeholder="Site owner code" aria-label="Site owner code" style="max-width:200px" required><button class="btn sm">Sign in</button></form>` : ''}
${error ? `<p class="msg err">${esc(error)}</p>` : ''}
<div class="feats"><div><b>Live map</b>Units move on the map as they drive in game.</div><div><b>Real 911 calls</b>Calls from the game land on the dispatch board.</div><div><b>Department MDTs</b>Each team gets its own MDT, locked to its members.</div></div></div></section>`, script: `
const go=async(url,body,m)=>{try{const j=await api(url,body);location.href=j.next}catch(x){say(m,x.message)}};
document.getElementById('codeform').addEventListener('submit',e=>{e.preventDefault();go('/auth/code',{code:document.getElementById('code').value},document.getElementById('codemsg'))});
const mn=document.getElementById('mname'),ms=document.getElementById('mslug'),sp=document.getElementById('slugp');let touched=false;
const slugify=s=>s.toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-+|-+$/g,'').slice(0,32);
mn.addEventListener('input',()=>{if(!touched){ms.value=slugify(mn.value);sp.textContent=ms.value||'your-server'}});
ms.addEventListener('input',()=>{touched=true;ms.value=slugify(ms.value);sp.textContent=ms.value||'your-server'});
document.getElementById('makeform').addEventListener('submit',e=>{e.preventDefault();go('/auth/create',{name:mn.value.trim(),slug:ms.value,inviteCode:document.getElementById('mcode').value},document.getElementById('makemsg'))});
` });

// Terms of Use and Privacy Policy (text in legal.mjs). Public, outside the preview lock, so Roblox and Discord can link to them.
export const legal = ({ logo, user, doc }) => { const d = DOCS[doc]; return layout({ title: `${d.title} · Oversite CAD`, logo, user, body: `
<main class="lg"><nav class="lg-sw" aria-label="Legal pages">${Object.values(DOCS).map(o => `<a href="${o.path}"${o === d ? ' aria-current="page"' : ''}>${esc(o.title)}</a>`).join('')}</nav>
<header class="lg-hd"><h1>${esc(d.title)}</h1><p class="lead">${d.intro}</p><p class="upd">Last updated ${esc(UPDATED)}</p></header>
<div class="lg-body"><aside class="lg-toc"><b>On this page</b><nav>${d.sections.map((x, i) => `<a href="#${x.id}"><span>${i + 1}</span>${esc(x.h)}</a>`).join('')}</nav></aside>
<div>${d.sections.map((x, i) => `<section class="lg-s" id="${x.id}"><h2><span>${String(i + 1).padStart(2, '0')}</span>${esc(x.h)}</h2><p class="lg-short"><b>In short</b><span>${x.short}</span></p>${x.body.replace(/<table class="lg-t">/g, '<div class="lg-tw"><table class="lg-t">').replace(/<\/table>/g, '</table></div>')}</section>`).join('')}</div></div></main>`, script: `
const tl=[...document.querySelectorAll('.lg-toc a')];const io=new IntersectionObserver(es=>{for(const e of es)if(e.isIntersecting)tl.forEach(a=>a.classList.toggle('on',a.getAttribute('href')==='#'+e.target.id))},{rootMargin:'-20% 0px -70% 0px'});document.querySelectorAll('.lg-s').forEach(s=>io.observe(s));
` }); };

// Site admins only (see admins.mjs): reports from Explore, the blue check, and moderation of servers and people.
export const admin = ({ logo, user, servers, reports, reasons }) => layout({ title: 'Moderation · Oversite', logo, user, body: `
<main class="adm"><h1>Moderation</h1><p class="lead">Reports from Explore, the blue check ${vbadge(18)} and suspensions. Only site admins can see this page.</p>
<section class="card adm-rep"><div class="adm-h"><h2>Reports</h2><span id="rN"></span></div><div class="adm-l" id="rL"></div></section>
<div class="adm-cols">
<section class="card"><div class="adm-h"><h2>Servers</h2><span id="sN"></span></div><input class="adm-q" id="sQ" type="search" placeholder="Search servers" aria-label="Search servers" autocomplete="off"><div class="adm-l" id="sL"></div></section>
<section class="card"><div class="adm-h"><h2>People</h2><span id="pN"></span></div><input class="adm-q" id="pQ" type="search" placeholder="Search by Roblox or Discord name, or ID" aria-label="Search people" autocomplete="off"><div class="adm-l" id="pL"></div></section>
</div></main>`, script: `
const VB=${JSON.stringify(vbadge(15))},RS=${JSON.stringify(reasons)};let S=${JSON.stringify(servers).replace(/</g, '\\u003c')},R=${JSON.stringify(reports).replace(/</g, '\\u003c')};
const e=t=>String(t??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const ini=t=>e(String(t||'?').slice(0,1).toUpperCase());
const ago=t=>{const m=Math.round((Date.now()-t)/60000);return m<1?'just now':m<60?m+' min ago':m<1440?Math.round(m/60)+' h ago':Math.round(m/1440)+' d ago'};
const tag=(t,k)=>'<i class="adm-t '+k+'">'+t+'</i>';
const sIc=x=>'<span class="pic sq">'+ini(x.name)+'<img src="/c/'+e(x.slug)+'/icon" alt="" loading="lazy" onerror="this.remove()"></span>';
const vbtn=(k,id,on)=>'<button class="btn sm'+(on?' is-on':'')+'" data-k="'+k+'" data-id="'+id+'" data-on="'+(on?1:0)+'">'+(on?'Verified':'Verify')+'</button>';
const act=(a,id,label,cls)=>'<button class="btn sm'+(cls?' '+cls:'')+'" data-a="'+a+'" data-id="'+id+'">'+label+'</button>';
const open=new Set();
const rRow=x=>'<div class="adm-r adm-rr">'+sIc(x)+'<div class="tx"><b>'+e(x.name)+'</b><small>'+tag(e(RS[x.reason]||x.reason),'warn')+' by '+e(x.by_name||'someone')+' · '+ago(x.created)+(x.hidden?' · '+tag('Hidden','dim'):'')+(x.suspended?' · '+tag('Suspended','bad'):'')+'</small>'
  +(x.review_id?(x.review_body!=null?'<q>'+'★'.repeat(x.review_rating)+' '+e(x.review_body)+'</q><small>Review by '+e(x.review_by||'someone')+' · <a href="/s/'+e(x.slug)+'#reviews" target="_blank">open page</a></small>':'<q>This review was already deleted.</q>'):(x.details?'<q>'+e(x.details)+'</q>':''))+'</div>'
  +'<div class="adm-b">'+(x.review_id?(x.review_body!=null?'<button class="btn sm warnb" data-rvd="'+x.review_id+'">Remove review</button>':''):(x.hidden?'':act('hide',x.community_id,'Hide server','warnb')))+'<button class="btn sm" data-dismiss="'+x.id+'">Dismiss</button></div></div>';
const sRow=x=>'<div class="adm-r'+(x.verified?' on':'')+(x.suspended?' off':'')+'" data-srv="'+x.id+'">'+sIc(x)+'<div class="tx"><b>'+e(x.name)+(x.verified?VB:'')+'</b><small>/c/'+e(x.slug)+' · '+(x.owner_rbx||x.owner_name?'by '+e(x.owner_rbx||x.owner_name)+' · ':'')+x.members+' member'+(x.members===1?'':'s')+(x.listed&&!x.hidden?' · On Explore':'')+'</small>'
  +((x.open_reports||x.hidden||x.suspended)?'<span class="adm-ts">'+(x.open_reports?tag(x.open_reports+' report'+(x.open_reports===1?'':'s'),'warn'):'')+(x.hidden?tag('Hidden from Explore','dim'):'')+(x.suspended?tag('Suspended','bad'):'')+'</span>':'')+'</div>'
  +'<div class="adm-b">'+vbtn('server',x.id,x.verified)+'<button class="btn sm ghost" data-more="'+x.id+'" aria-expanded="'+open.has(x.id)+'">Manage</button></div>'
  +(open.has(x.id)?'<div class="adm-x">'+act(x.hidden?'show':'hide',x.id,x.hidden?'Show on Explore':'Hide from Explore')+(x.custom_icon?act('reset_icon',x.id,'Reset icon'):'')+(x.has_bio?act('clear_bio',x.id,'Clear bio'):'')+'<a class="btn sm" href="/c/'+e(x.slug)+'">Open CAD</a>'+act(x.suspended?'unsuspend':'suspend',x.id,x.suspended?'Lift suspension':'Suspend server',x.suspended?'':'warnb')+'</div>':'')+'</div>';
const pRow=x=>'<div class="adm-r'+(x.verified?' on':'')+(x.suspended?' off':'')+'"><span class="pic">'+ini(x.roblox_name)+'<img src="/rbx/avatar/'+e(x.roblox_id)+'" alt="" loading="lazy" onerror="this.remove()"></span><div class="tx"><b>'+e(x.roblox_name)+(x.verified?VB:'')+'</b><small>Roblox '+e(x.roblox_id)+(x.discord?' · Discord '+e(x.discord_name||''):'')+' · '+x.servers+' server'+(x.servers===1?'':'s')+'</small>'+(x.suspended?'<span class="adm-ts">'+tag('Suspended','bad')+'</span>':'')+'</div>'
  +'<div class="adm-b">'+vbtn('user',x.id,x.verified)+'<button class="btn sm'+(x.suspended?'':' warnb')+'" data-p="'+(x.suspended?'unsuspend':'suspend')+'" data-id="'+x.id+'">'+(x.suspended?'Unsuspend':'Suspend')+'</button></div></div>';
const sL=document.getElementById('sL'),sQ=document.getElementById('sQ'),pL=document.getElementById('pL'),pQ=document.getElementById('pQ'),rL=document.getElementById('rL');
const drawR=()=>{rL.innerHTML=R.map(rRow).join('')||'<p class="adm-e">No open reports. Reports people send from Explore show up here.</p>';document.getElementById('rN').textContent=R.length?R.length+' open':''};
const drawS=()=>{const t=sQ.value.trim().toLowerCase(),L=S.filter(x=>!t||(x.name+' '+x.slug+' '+(x.owner_rbx||'')+' '+(x.owner_name||'')).toLowerCase().includes(t));
  sL.innerHTML=L.map(sRow).join('')||'<p class="adm-e">No servers match.</p>';document.getElementById('sN').textContent=S.filter(x=>x.verified).length+' verified of '+S.length};
let P=[],pt=0;const loadP=async()=>{try{const j=await api('/api/admin/people?q='+encodeURIComponent(pQ.value.trim()),null,'GET');P=j.people;drawP()}catch(x){pL.innerHTML='<p class="adm-e">'+e(x.message)+'</p>'}};
const drawP=()=>{pL.innerHTML=P.map(pRow).join('')||'<p class="adm-e">Nobody matches.</p>';document.getElementById('pN').textContent=pQ.value.trim()?P.length+' found':'Newest and verified'};
const fresh=j=>{if(j&&j.servers){S=j.servers;R=j.reports}drawS();drawR()};
const sName=id=>(S.find(x=>x.id===id)||{}).name||'this server';
const CONFIRM={suspend:id=>({title:'Suspend '+sName(id)+'?',text:'Its CAD closes for everyone and it disappears from Explore until you lift the suspension.',ok:'Suspend server',danger:true}),
  hide:id=>({title:'Hide '+sName(id)+' from Explore?',text:'The owner can still use the CAD. Their Settings will say Oversite hid it. Open reports about it are closed.',ok:'Hide server'}),
  clear_bio:id=>({title:'Clear the bio of '+sName(id)+'?',text:'The owner can write a new one.',ok:'Clear bio'}),reset_icon:id=>({title:'Reset the icon of '+sName(id)+'?',text:'It goes back to the ER:LC or Discord icon.',ok:'Reset icon'})};
sQ.addEventListener('input',drawS);pQ.addEventListener('input',()=>{clearTimeout(pt);pt=setTimeout(loadP,200)});
document.addEventListener('click',async ev=>{
  const m=ev.target.closest('[data-more]');if(m){const id=+m.dataset.more;open.has(id)?open.delete(id):open.add(id);drawS();return}
  const rv=ev.target.closest('[data-rvd]');if(rv){if(!(await ask({title:'Remove this review?',text:'It is removed from the server page for everyone.',ok:'Remove review',danger:true})))return;rv.disabled=true;try{fresh(await api('/api/admin/review',{id:+rv.dataset.rvd}))}catch(x){rv.disabled=false}return}
  const b=ev.target.closest('[data-k],[data-a],[data-p],[data-dismiss]');if(!b)return;const id=+(b.dataset.id||b.dataset.dismiss);
  try{
    if(b.dataset.k){const on=b.dataset.on!=='1',k=b.dataset.k;b.disabled=true;await api('/api/admin/verify',{kind:k,id,on});const x=(k==='server'?S:P).find(y=>y.id===id);if(x)x.verified=on?1:0;k==='server'?drawS():drawP();return}
    if(b.dataset.a){const a=b.dataset.a;if(CONFIRM[a]&&!(await ask(CONFIRM[a](id))))return;b.disabled=true;fresh(await api('/api/admin/server',{id,action:a}));return}
    if(b.dataset.p){const a=b.dataset.p,x=P.find(y=>y.id===id);if(a==='suspend'&&!(await ask({title:'Suspend '+(x?x.roblox_name:'this person')+'?',text:'They are signed out of everything on Oversite: no CAD, no Explore, no staff tools. Every account on their Roblox is included.',ok:'Suspend',danger:true})))return;
      b.disabled=true;await api('/api/admin/person',{id,action:a});if(x)x.suspended=a==='suspend'?1:0;drawP();return}
    if(b.dataset.dismiss){b.disabled=true;fresh(await api('/api/admin/report',{id}));return}
  }catch(x){b.disabled=false;await ask({title:'That didn\\'t work',text:x.message,ok:'OK'})}});
drawR();drawS();loadP();
` });

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
<div class="go">${c.setup ? (admin ? `<a class="btn pri discord" href="/c/${esc(c.slug)}/discord/connect?new=1">Connect Discord to finish</a>` : '<span class="tag warn">Being set up</span>') : `${admin ? `<a class="btn ghost" href="/c/${esc(c.slug)}/settings">Settings</a>` : ''}${setup ? `<a class="btn ghost" href="/c/${esc(c.slug)}">Open CAD</a><a class="btn pri" href="/c/${esc(c.slug)}/settings">Connect ER:LC</a>` : `<a class="btn pri" href="/c/${esc(c.slug)}">Open CAD<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6"/></svg></a>`}`}</div></div>`; }).join('')}
</section>` : ''}
<section class="card"><h2>${comms.length ? 'Add another server' : 'Get started'}</h2><p class="note">${comms.length ? 'Got an invite code from another server? Enter it here.' : 'Enter your server\'s invite code.'}</p>
<form id="join" class="row" autocomplete="off" style="flex-wrap:nowrap"><input id="jcode" placeholder="Invite code" aria-label="Invite code" spellcheck="false" required><button class="btn pri">Join</button></form><p class="msg" id="jmsg"></p>
<details class="mk"${comms.length ? '' : ' open'}><summary>Create a new server instead</summary><p class="note">One per ER:LC server. Members join with its invite code.</p>
<form id="create" autocomplete="off"><label for="cname">Server name</label><input id="cname" maxlength="48" placeholder="Liberty County Roleplay" required>
<label for="cslug">Address</label><input id="cslug" maxlength="32" pattern="[a-z0-9-]{3,32}" placeholder="liberty-county" required><p class="hint">oversitescad.com/c/<span id="slugp">liberty-county</span></p>
<label for="ccode">Invite code</label><input id="ccode" maxlength="24" placeholder="LIBERTY" autocapitalize="characters" spellcheck="false"><p class="hint">Members type this on the front page to join. 2 to 24 letters or numbers, or leave it empty for a random one. You can change it later.</p>
<p class="hint" style="margin:10px 0 0">Next you connect your server's <b>Discord</b>. Every Oversite server needs one: it's how staff ranks and roles work.</p><div class="row" style="margin-top:14px"><button class="btn pri">Create and connect Discord</button></div><p class="msg" id="cmsg"></p></form></details></section>
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
document.getElementById('create').addEventListener('submit',async e=>{e.preventDefault();const m=document.getElementById('cmsg');try{const j=await api('/api/communities',{name:cn.value.trim(),slug:cs.value,inviteCode:document.getElementById('ccode').value});location.href=j.next||('/c/'+j.slug+'/settings?new=1')}catch(x){say(m,x.message)}});
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
<div><h1><b>${esc(user.roblox_name || user.name)}</b>${user.verified ? vbadge(22) : ''}</h1><p>${comms.length ? `Member of ${comms.length} server${comms.length === 1 ? '' : 's'}` : 'Not in any server yet'}${user.discord_id ? ' · Signs in with Discord' : ''}</p></div></div>
<div class="grid"><div>
${(() => { const row = c => { const owner = c.role === 'owner';
  return `<div class="srv"><span class="ic">${esc(c.name.slice(0, 1).toUpperCase())}<img src="/c/${esc(c.slug)}/icon" alt="" loading="lazy" onerror="this.remove()"></span><div class="tx"><b>${esc(c.name)}</b><small>${esc(RANK_LABEL[c.role] || c.role)}</small></div>
<div class="go">${runs(c.role) ? `<a class="btn ghost" href="/c/${esc(c.slug)}/settings">Server settings</a>` : ''}${owner ? '' : `<button class="btn ghost" data-leave="${esc(c.slug)}" data-name="${esc(c.name)}">Leave</button>`}${c.setup ? (runs(c.role) ? `<a class="btn pri discord" href="/c/${esc(c.slug)}/discord/connect?new=1">Connect Discord</a>` : '<span class="tag warn">Being set up</span>') : `<a class="btn pri" href="/c/${esc(c.slug)}">Open CAD</a>`}</div></div>`; };
  const mine = comms.filter(c => c.role === 'owner'), joined = comms.filter(c => c.role !== 'owner');
  return `<section class="card"><h2>Your servers</h2>${mine.length ? mine.map(row).join('') : '<p class="note">You don\'t own a server yet.</p>'}
<details class="mk"${mine.length ? '' : ' open'}><summary>Make a new server</summary><p class="note">One per ER:LC server. Members join with its invite code.</p>
<form id="create" autocomplete="off"><label for="cname">Server name</label><input id="cname" maxlength="48" placeholder="Liberty County Roleplay" required>
<label for="cslug">Address</label><input id="cslug" maxlength="32" pattern="[a-z0-9-]{3,32}" placeholder="liberty-county" required><p class="hint">oversitescad.com/c/<span id="slugp">liberty-county</span></p>
<label for="ccode">Invite code</label><input id="ccode" maxlength="24" placeholder="LIBERTY" autocapitalize="characters" spellcheck="false"><p class="hint">Members type this on the front page to join. 2 to 24 letters or numbers, or leave it empty for a random one. You can change it later.</p>
<p class="hint" style="margin:10px 0 0">Next you connect your server's <b>Discord</b>. Every Oversite server needs one: it's how staff ranks and roles work.</p><div class="row" style="margin-top:14px"><button class="btn pri">Create and connect Discord</button></div><p class="msg" id="cmsg"></p></form></details></section>
<section class="card" style="margin-top:18px"><h2>Joined servers</h2>${joined.length ? joined.map(row).join('') : '<p class="note">You haven\'t joined anyone else\'s server yet.</p>'}
<p class="note" style="margin:12px 0 0"><a href="/explore">Explore servers</a> to find one to join.</p><details class="mk"${joined.length ? '' : ' open'}><summary>Join another server</summary><p class="note">Enter the server's invite code.</p>
<form id="join" class="row" autocomplete="off" style="flex-wrap:nowrap"><input id="jcode" placeholder="Invite code" aria-label="Invite code" spellcheck="false" required><button class="btn pri">Join</button></form><p class="msg" id="jmsg"></p></details>
<p class="msg" id="lmsg"></p></section>`; })()}
</div><div>
<section class="card"><h2>Linked accounts</h2>
<div class="lrow"><span class="ico"><svg width="16" height="16" viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" fill-rule="evenodd" d="M5.92 1.47 22.53 5.92 18.08 22.53 1.47 18.08Z M10.37 9.18 14.82 10.37 13.63 14.82 9.18 13.63Z"/></svg></span><div class="tx"><b>Roblox</b><small>${user.roblox_name ? `${esc(user.roblox_name)}${user.roblox_via === 'oauth' ? ', confirmed by Roblox' : user.roblox_via === 'discord' ? ', from your Discord' : user.roblox_via === 'profile' ? ', verified on your profile' : ''}` : 'Not linked'}</small></div>
${user.roblox_name ? `<button class="btn sm" id="switch">Switch</button>` : `<a class="btn sm pri" href="/dashboard#rbx">Link</a>`}</div>
<div class="lrow"><span class="ico" style="color:#fff"><svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M19.6 5.4A17 17 0 0 0 15.4 4l-.5 1a15.6 15.6 0 0 0-5.8 0L8.6 4a17 17 0 0 0-4.2 1.4C1.8 9.4 1 13.3 1.4 17.1A17 17 0 0 0 6.6 20l1.1-1.8c-.6-.2-1.2-.5-1.7-.9l.4-.3a12.2 12.2 0 0 0 11.2 0l.4.3c-.5.4-1.1.7-1.7.9l1.1 1.8a17 17 0 0 0 5.2-2.9c.5-4.4-.8-8.3-2.9-11.7zM8.7 14.8c-1 0-1.9-1-1.9-2.1s.8-2.1 1.9-2.1 1.9 1 1.9 2.1-.8 2.1-1.9 2.1zm6.6 0c-1 0-1.9-1-1.9-2.1s.8-2.1 1.9-2.1 1.9 1 1.9 2.1-.8 2.1-1.9 2.1z"/></svg></span><div class="tx"><b>Discord</b><small>${user.discord_id ? `Connected as ${esc(user.name)}` : 'Not connected. Lets you sign in with Discord and get staff roles from your server\'s Discord.'}</small></div>
${user.discord_id ? '<span class="tag ok">Connected</span>' : discord ? `<a class="btn sm discord" href="/auth/discord?next=/account">Connect</a>` : ''}</div>
</section>
<section class="card"><h2>Sign out</h2><p class="note">Signs you out on this device. You'll need your sign-in again to get back in.</p><form method="post" action="/auth/logout" style="margin:0"><button class="btn danger">Sign out</button></form></section>
</div></div></main>`, script: `
const cn=document.getElementById('cname'),cs=document.getElementById('cslug'),sp=document.getElementById('slugp');let touched=false;
const slugify=x=>x.toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-+|-+$/g,'').slice(0,32);
cn.addEventListener('input',()=>{if(!touched){cs.value=slugify(cn.value);sp.textContent=cs.value||'liberty-county'}});
cs.addEventListener('input',()=>{touched=true;cs.value=slugify(cs.value);sp.textContent=cs.value||'liberty-county'});
document.getElementById('create').addEventListener('submit',async e=>{e.preventDefault();try{const j=await api('/api/communities',{name:cn.value.trim(),slug:cs.value,inviteCode:document.getElementById('ccode').value});location.href=j.next||('/c/'+j.slug+'/settings?new=1')}catch(x){say(document.getElementById('cmsg'),x.message)}});
document.getElementById('join').addEventListener('submit',async e=>{e.preventDefault();try{await api('/auth/code',{code:document.getElementById('jcode').value});location.reload()}catch(x){say(document.getElementById('jmsg'),x.message)}});
const sw=document.getElementById('switch');if(sw)sw.addEventListener('click',async()=>{if(!await ask({title:'Switch Roblox account?',text:'This unlinks your current Roblox account. You will need to link one again before you can open a CAD.',ok:'Unlink and switch'}))return;await api('/api/roblox/unlink');location.href='/dashboard#rbx'});
document.addEventListener('click',async e=>{const b=e.target.closest('[data-leave]');if(!b)return;if(!await ask({title:'Leave '+b.dataset.name+'?',text:'You lose access to its CAD until someone gives you a code or invite again.',ok:'Leave',danger:true}))return;try{await api('/api/leave',{slug:b.dataset.leave});location.reload()}catch(x){say(document.getElementById('lmsg'),x.message)}});
` });

// the server browser: every server whose owner listed it (Settings, Server profile), with live player counts, votes and Discord size
export const explore = ({ logo, user, servers, owned }) => layout({ title: 'Explore servers · Oversite CAD', logo, user, body: `
<main class="xp"><div class="xp-head"><div><h1><span style="font-weight:400">Explore</span> <b>servers</b></h1><p class="lead">ER:LC servers running Oversite CAD. Vote for your favourites, jump in game, or join their Discord.</p></div>
<div class="xp-tools"><label class="xp-search"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></svg><input id="xq" placeholder="Search servers" autocomplete="off" spellcheck="false" aria-label="Search servers"></label>
</div></div>
<nav class="xp-tabs" id="xt" role="tablist" aria-label="Sort servers">
<button role="tab" data-t="trending" aria-selected="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 17l6-6 4 4 8-8"/><path d="M14 7h7v7"/></svg>Trending</button>
<button role="tab" data-t="active" aria-selected="false"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"><path d="M7 4v16l13-8z"/></svg>Active now</button>
<button role="tab" data-t="popular" aria-selected="false"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="9" cy="8" r="3.5"/><path d="M2.5 20c.8-3.5 3.4-5.5 6.5-5.5s5.7 2 6.5 5.5"/><path d="M16 4.6a3.5 3.5 0 0 1 0 6.8M18.5 14.8c1.6.8 2.6 2.6 3 5.2"/></svg>Popular</button>
<button role="tab" data-t="voted" aria-selected="false"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"><path d="m12 3 2.8 5.7 6.2.9-4.5 4.4 1.1 6.2L12 17.3 6.4 20.2l1.1-6.2L3 9.6l6.2-.9z"/></svg>Most voted</button>
<button role="tab" data-t="new" aria-selected="false"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M12 3v4M12 17v4M3 12h4M17 12h4M6 6l2.5 2.5M15.5 15.5 18 18M6 18l2.5-2.5M15.5 8.5 18 6"/></svg>New</button>
</nav>
<div class="xp-list" id="xg"></div>
<div class="xp-empty" id="xe" hidden></div>
</main>
<div class="xp-toast" id="xtoast" role="status" aria-live="polite"></div>
<dialog class="xp-dlg" id="xd" aria-labelledby="xdT"><div class="xp-dlgin" id="xdB"></div></dialog>`, script: `
let S=${JSON.stringify(servers).replace(/</g, '\\u003c')};const OWNED=${JSON.stringify(owned).replace(/</g, '\\u003c')};let TAB='trending';
const ERLC='https://www.roblox.com/games/2534724415/Emergency-Response-Liberty-County';
const g=document.getElementById('xg'),q=document.getElementById('xq'),em=document.getElementById('xe'),dlg=document.getElementById('xd'),tabs=document.getElementById('xt');
const e=t=>String(t??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const n=v=>Number(v||0).toLocaleString();
const DC='<svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M19.6 5.4A17 17 0 0 0 15.4 4l-.5 1a15.6 15.6 0 0 0-5.8 0L8.6 4a17 17 0 0 0-4.2 1.4C1.8 9.4 1 13.3 1.4 17.1A17 17 0 0 0 6.6 20l1.1-1.8c-.6-.2-1.2-.5-1.7-.9l.4-.3a12.2 12.2 0 0 0 11.2 0l.4.3c-.5.4-1.1.7-1.7.9l1.1 1.8a17 17 0 0 0 5.2-2.9c.5-4.4-.8-8.3-2.9-11.7zM8.7 14.8c-1 0-1.9-1-1.9-2.1s.8-2.1 1.9-2.1 1.9 1 1.9 2.1-.8 2.1-1.9 2.1zm6.6 0c-1 0-1.9-1-1.9-2.1s.8-2.1 1.9-2.1 1.9 1 1.9 2.1-.8 2.1-1.9 2.1z"/></svg>';
const STAR='<svg width="17" height="17" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="m12 2.8 2.9 5.9 6.5.9-4.7 4.6 1.1 6.4L12 17.5l-5.8 3.1 1.1-6.4L2.6 9.6l6.5-.9z"/></svg>';
const PLAY='<svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M7 4.5v15l12.5-7.5z"/></svg>';
const PPL='<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><circle cx="9" cy="8" r="3.5"/><path d="M2.5 20c.8-3.5 3.4-5.5 6.5-5.5s5.7 2 6.5 5.5"/><path d="M16 4.6a3.5 3.5 0 0 1 0 6.8M18.5 14.8c1.6.8 2.6 2.6 3 5.2"/></svg>';
const STO='<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round" aria-hidden="true"><path d="m12 3 2.8 5.7 6.2.9-4.5 4.4 1.1 6.2L12 17.3 6.4 20.2l1.1-6.2L3 9.6l6.2-.9z"/></svg>';
const VB=${JSON.stringify(vbadge(16))},VBS=${JSON.stringify(vbadge(13))};
const PIN='<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 21s-7-6.2-7-11.5a7 7 0 0 1 14 0C19 14.8 12 21 12 21z"/><circle cx="12" cy="9.5" r="2.5"/></svg>';
const LNG='<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 5h16v11H9l-5 4z"/></svg>';
const CADI='<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M9 4 3 6.5v13L9 17l6 2.5 6-2.5V4l-6 2.5z"/><path d="M9 4v13M15 6.5v13"/></svg>';
const RN={owner:'Owner',co_owner:'Co-Owner',admin:'Admin',mod:'Mod',member:'Member'};
const playing=x=>x.live&&x.players!=null?x.players:-1, full=x=>x.live&&x.max&&x.players>=x.max;
const SORT={trending:x=>x.week*3+Math.max(0,playing(x))*2+x.votes*.2,active:x=>playing(x),popular:x=>x.dc_members??-1,voted:x=>x.votes,new:x=>x.created};
const hrs=ms=>Math.max(1,Math.ceil(ms/3600000))+'h';
const ic=x=>'<span class="xr-ic">'+e(x.name.slice(0,1).toUpperCase())+'<img src="/c/'+e(x.slug)+'/icon" alt="" loading="lazy" onerror="this.remove()"></span>';
// every server gets its own slice of the Liberty County map, picked from its address so it never changes
const spot=x=>{ let h=0; for(const c of x.slug) h=(h*31+c.charCodeAt(0))>>>0; return (12+h%76)+'% '+(14+(h>>>8)%72)+'%'; };
const state=x=>!x.live||x.players==null?'off':full(x)?'full':'open';
const status=x=>!x.connected?'':state(x)==='off'?'<span class="xs off">Offline</span>':'<span class="xs '+state(x)+'"><b>'+x.players+'</b>'+(x.max?' / '+x.max:'')+' in game'+(full(x)?' · Full':'')+'</span>';
const meta=x=>(x.rating!=null?'<span class="xr-rt" title="'+x.reviews+' review'+(x.reviews===1?'':'s')+'">★ '+x.rating.toFixed(1)+'</span>':'')+'<span title="Votes">'+STO+n(x.votes)+'</span>'+(x.dc_members!=null?'<span title="Discord members">'+PPL+n(x.dc_members)+'</span>':'')
  +(x.region?'<span class="xr-tag">'+PIN+e(x.region.name)+'</span>':'')+(x.lang?'<span class="xr-tag">'+LNG+e(x.region&&x.lang.name.endsWith('('+x.region.name+')')?x.lang.name.split(' (')[0]:x.lang.name)+'</span>':'');
const by=x=>x.owner_name?'<span class="by">by '+e(x.owner_name)+(x.owner_badge?VBS:'')+'</span>':'';
const voteBtn=x=>x.next_vote>0?'<button class="xb ghost voted" data-vote="'+e(x.slug)+'" title="You can vote again in '+hrs(x.next_vote)+'">'+STAR+'Voted · '+hrs(x.next_vote)+'</button>'
  :'<button class="xb ghost" data-vote="'+e(x.slug)+'">'+STO+'Vote'+(x.votes?' <small>'+n(x.votes)+'</small>':'')+'</button>';
const acts=x=>(x.join_key?'<a class="xb pri" href="'+ERLC+'" target="_blank" rel="noopener" data-play="'+e(x.join_key)+'" title="Copy the join code and open ER:LC">'+PLAY+'Join</a>':'')+(x.open_join&&!x.role?'<button class="xb" data-joincad="'+e(x.slug)+'" title="Join this server on Oversite">'+CADI+'Join CAD</button>':'')+voteBtn(x)
  +(x.invite?'<a class="xb ghost" href="'+e(x.invite)+'" target="_blank" rel="noopener" title="Join their Discord">'+DC+'Discord</a>':'');
const pct=x=>x.live&&x.max?Math.min(100,Math.round(x.players/x.max*100)):0;
const card=(x,i)=>'<article class="xr st-'+state(x)+(i===0?' is-top':'')+'" tabindex="0" data-slug="'+e(x.slug)+'" aria-label="'+e(x.name)+'">'
  +'<div class="xr-map" style="--pos:'+spot(x)+'"><div class="xr-mt">'+status(x)+(i===0?'<span class="xr-badge">'+(TAB==='new'?'Newest':TAB==='voted'?'Most voted':TAB==='popular'?'Most popular':'Most active')+'</span>':i<3?'<span class="xr-rank">#'+(i+1)+'</span>':'')+'</div>'
  +(x.join_key?'<span class="xr-code" title="Join code">'+e(x.join_key)+'</span>':'')+'<div class="xr-bar"><i style="width:'+pct(x)+'%"></i></div></div>'
  +'<div class="xr-b"><div class="xr-h">'+ic(x)+'<div class="xr-n"><h3>'+e(x.name)+(x.badge?VB:'')+'</h3>'+by(x)+'</div>'+(x.role?'<a class="xr-mine" href="/c/'+e(x.slug)+'">'+e(RN[x.role]||'Member')+' · Open CAD</a>':'')+'</div>'
  +'<div class="xr-m">'+meta(x)+'</div><p class="'+(x.bio?'':'none')+'">'+e(x.bio||'No description yet.')+'</p>'
  +'<div class="xr-f"><div class="xr-a">'+acts(x)+'</div></div></div></article>';
const row=card;
const render=()=>{ const t=q.value.trim().toLowerCase(), k=SORT[TAB];
  const L=S.filter(x=>!t||[x.name,x.bio,x.owner_name,x.ingame,x.discord,x.region&&x.region.name,x.lang&&x.lang.name,...x.depts.map(d=>d.name+' '+d.short)].join(' ').toLowerCase().includes(t))
    .filter(x=>TAB!=='active'||(x.live&&x.players!=null))
    .sort((a,b)=>k(b)-k(a)||b.votes-a.votes||a.name.localeCompare(b.name));
  g.innerHTML=L.map(row).join(''); em.hidden=!!L.length;
  if(!L.length) em.innerHTML=TAB==='active'&&!t?'<b>No servers are online right now.</b><p>Servers show up here while they are running. Check Trending in the meantime.</p>':S.length?'<b>No servers match that.</b><p>Try a different search.</p>'
    :'<b>No servers are listed yet.</b><p>Owners can add theirs in their server\\'s Settings, under Server profile.</p>'+(OWNED.length?'<a class="btn pri" href="/c/'+e(OWNED[0])+'/settings#profile">List your server</a>':''); };
const toast=m=>{ const t=document.getElementById('xtoast'); t.textContent=m; t.classList.add('on'); clearTimeout(t._h); t._h=setTimeout(()=>t.classList.remove('on'),3200); };
tabs.addEventListener('click',ev=>{ const b=ev.target.closest('[data-t]'); if(!b) return; TAB=b.dataset.t; tabs.querySelectorAll('[data-t]').forEach(x=>x.setAttribute('aria-selected',x===b)); render(); });
// report a listing to Oversite: pick a reason, add details, sent to the site admins' list on /admin
const REASONS=[['name','Inappropriate name'],['icon','Inappropriate icon'],['bio','Inappropriate bio'],['fake','Fake or misleading'],['other','Something else']];
const report=x=>{ const d=document.createElement('dialog'); d.className='dlg';
  d.innerHTML='<form method="dialog" class="rp"><h2></h2><p>Tell Oversite what is wrong with this listing. The owner won\\'t see who reported it.</p><div class="rp-o">'+REASONS.map((r,i)=>'<label><input type="radio" name="rr" value="'+r[0]+'"'+(i?'':' checked')+'><span>'+r[1]+'</span></label>').join('')+'</div>'
    +'<label for="rpD">Details <small>(optional)</small></label><textarea id="rpD" maxlength="500" rows="3" placeholder="What did you see?"></textarea><p class="msg" id="rpM"></p><div class="acts"><button type="button" class="btn" data-no>Cancel</button><button class="btn pri" data-send>Send report</button></div></form>';
  d.querySelector('h2').textContent='Report '+x.name; document.body.appendChild(d);
  const close=()=>{ d.classList.remove('in'); setTimeout(()=>{ d.close(); d.remove(); },180); };
  d.querySelector('[data-no]').onclick=close; d.addEventListener('click',ev=>{ if(ev.target===d) close(); }); d.addEventListener('cancel',ev=>{ ev.preventDefault(); close(); });
  d.querySelector('form').addEventListener('submit',async ev=>{ ev.preventDefault(); const b=d.querySelector('[data-send]'); b.disabled=true;
    try{ await api('/api/explore/report',{slug:x.slug,reason:d.querySelector('[name=rr]:checked').value,details:d.querySelector('#rpD').value}); close(); toast('Thanks. Oversite will take a look at '+x.name+'.'); }
    catch(err){ say(d.querySelector('#rpM'),err.message); b.disabled=false; } });
  d.showModal(); requestAnimationFrame(()=>d.classList.add('in')); };
const open=slug=>{ const x=S.find(s=>s.slug===slug); if(!x) return; const fact=(k,v)=>v?'<div><small>'+k+'</small><b>'+v+'</b></div>':'';
  document.getElementById('xdB').innerHTML='<button class="xp-x" type="button" aria-label="Close" data-close>&times;</button><div class="xd-top">'+ic(x)+'<div><h2 id="xdT">'+e(x.name)+(x.badge?VB:'')+'</h2>'+by(x)+'<div class="xr-m">'+meta(x)+'</div></div></div>'
    +'<div class="xr-t">'+status(x)+'</div>'+(x.bio?'<p class="xd-bio">'+e(x.bio)+'</p>':'')
    +'<div class="xd-facts">'+fact('In-game name',e(x.ingame))+fact('Join code',x.join_key?'<code>'+e(x.join_key)+'</code>':'')+fact('Co-owners',e(x.co_owners.join(', ')))+fact('Account verification',e(x.verified||''))
    +fact('Team balance',x.team_balance?'On':'Off')+fact('Departments',e(x.depts.map(d=>d.name).join(', ')))+fact('Discord server',e([x.discord,x.dc_members!=null?n(x.dc_members)+' members':'',x.dc_online!=null?n(x.dc_online)+' online':''].filter(Boolean).join(' · ')))+'</div><div class="xr-a">'+acts(x)+'</div>'+(x.role==='owner'?'':'<button type="button" class="xd-rep" data-report="'+e(x.slug)+'">Report this server</button>');
  dlg.showModal(); requestAnimationFrame(()=>dlg.classList.add('in')); };
document.addEventListener('click',async ev=>{
  const v=ev.target.closest('[data-vote]'); if(v){ ev.preventDefault(); ev.stopPropagation(); const x=S.find(s=>s.slug===v.dataset.vote); if(!x) return;
    if(x.next_vote>0) return toast('You can vote for '+x.name+' again in '+hrs(x.next_vote)+'.');
    v.disabled=true; try{ const j=await api('/api/explore/vote',{slug:x.slug}); x.votes=j.votes; x.next_vote=j.next_vote; x.week++; toast('Thanks for voting for '+x.name+'!'); }catch(err){ toast(err.message); } render(); if(dlg.open) open(x.slug); return; }
  const rp=ev.target.closest('[data-report]'); if(rp){ const x=S.find(s=>s.slug===rp.dataset.report); if(x){ dlg.close(); report(x); } return; }
  const jc=ev.target.closest('[data-joincad]'); if(jc){ ev.preventDefault(); ev.stopPropagation(); jc.disabled=true; try{ const j=await api('/api/explore/join',{slug:jc.dataset.joincad}); location.href=j.next; }catch(err){ toast(err.message); jc.disabled=false; } return; }
  const pl=ev.target.closest('[data-play]'); if(pl){ navigator.clipboard?.writeText(pl.dataset.play).catch(()=>{}); toast('Join code '+pl.dataset.play+' copied. In ER:LC open Servers, then paste it to join.'); return; }
  if(ev.target.closest('a,button')) return; const c=ev.target.closest('.xr'); if(c&&g.contains(c)) location.href='/s/'+encodeURIComponent(c.dataset.slug); });
g.addEventListener('keydown',ev=>{ if((ev.key==='Enter'||ev.key===' ')&&ev.target.classList.contains('xr')){ ev.preventDefault(); location.href='/s/'+encodeURIComponent(ev.target.dataset.slug); } });
dlg.addEventListener('click',ev=>{ if(ev.target===dlg||ev.target.closest('[data-close]')) dlg.close(); }); dlg.addEventListener('close',()=>dlg.classList.remove('in'));
q.addEventListener('input',render); render();
setInterval(async()=>{ if(document.hidden||dlg.open) return; try{ const r=await fetch('/api/explore'); if(r.ok){ S=(await r.json()).servers; render(); } }catch(x){} },60000);   // live player counts
` });

const COL = { pd: '#4C8DFF', fd: '#E24B4B', dot: '#E9C24C' };
export const settings = ({ logo, user, c, role, keyStatus, invites, members, origin, isNew, codes, iconKind, needsDiscord, discordReady, regions = {}, langs = {} }) => layout({ title: `${c.name} settings · Oversite`, logo, user, body: `
<main><h1><b>${esc(c.name)}</b> settings</h1><p class="lead">${isNew ? 'Your server is ready. Connect it to ER:LC, then give your members the invite code.' : 'Manage your server connection, codes, departments and members.'}</p>
<div class="row" style="margin:-8px 0 20px"><a class="btn sm pri" href="/c/${esc(c.slug)}">Open CAD</a></div>
${needsDiscord ? `<section class="card setup-dg"><div><h2>Connect your Discord server to finish</h2><p class="note">Every Oversite server is tied to its Discord. Members can't open the CAD until it's connected, and it's where you pick which Discord roles are Admin and Mod.</p></div><a class="btn discord" href="/c/${esc(c.slug)}/discord/connect?new=1">Connect Discord server</a></section>` : ''}
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
<div class="cols2"><div><label for="spRegion">Region</label><select id="spRegion"><option value="">Not set</option>${Object.entries(regions).map(([k, [n, f]]) => `<option value="${k}"${P.region === k ? ' selected' : ''}>${esc(n)}</option>`).join('')}</select></div>
<div><label for="spLang">Language</label><select id="spLang"><option value="">Not set</option>${Object.entries(langs).map(([k, [n, f]]) => `<option value="${k}"${P.lang === k ? ' selected' : ''}>${esc(n)}</option>`).join('')}</select></div></div>
${E.join_key ? '' : `<label for="spJoin">ER:LC join code</label><input id="spJoin" maxlength="12" placeholder="LCRPx" value="${esc(P.join_code || '')}" spellcheck="false" autocomplete="off"><p class="hint" style="margin:4px 0 0">The code players type in ER:LC to find your server. It fills in by itself once ER:LC is connected.</p>`}
<label class="chk"><input type="checkbox" id="spList"${P.listed ? ' checked' : ''}> List this server on the <a href="/explore">Explore</a> page</label>${keyStatus && !keyStatus.connected ? '<p class="hint" style="margin:4px 0 0">Connect your ER:LC server above so Explore can show when you\'re online and how many are playing.</p>' : ''}
<label class="chk"><input type="checkbox" id="spOpen"${P.open_join ? ' checked' : ''}> Anyone can join this server's CAD from Explore, without the invite code</label>${c.hidden ? '<p class="hint" style="margin:4px 0 0;color:var(--warn)">Oversite has hidden this server from Explore. Email support@oversite.shop if you think this is a mistake.</p>' : ''}
<div class="row" style="margin-top:14px"><button class="btn pri">Save profile</button></div><p class="msg" id="spMsg"></p></form></section>`; })()}
<section class="card"><h2>Departments</h2><p class="note">Rename the departments for your server, and choose which in-game team belongs to each.</p>
<form id="depts"><div class="cols">${['pd', 'fd', 'dot'].map(d => `<div class="dept"><h3><i style="background:${COL[d]}"></i>${{ pd: 'Law enforcement', fd: 'Fire and EMS', dot: 'Transportation' }[d]}</h3>
<label>Name</label><input name="${d}-name" maxlength="40" value="${esc(c.settings.depts[d]?.name || '')}" required><label>Short name</label><input name="${d}-short" maxlength="6" value="${esc(c.settings.depts[d]?.short || '')}" required>
<label>Units</label><input name="${d}-units" maxlength="500" placeholder="${{ pd: 'Patrol, K-9, SWAT', fd: 'Engine 1, Medic 2, Ladder 3', dot: 'Tow 1, Road Crew' }[d]}" value="${esc((c.settings.depts[d]?.units || []).join(', '))}"><p class="hint" style="margin:4px 0 0">Separate with commas. Players pick theirs in the MDT, and it shows on their map tag.</p></div>`).join('')}</div>
<label style="margin-top:16px">In-game teams</label><div class="teams">${Object.entries(c.settings.teams).map(([t, d]) => `<span>${esc(t)}</span><select name="team-${esc(t)}">${[['pd', c.settings.depts.pd?.name], ['fd', c.settings.depts.fd?.name], ['dot', c.settings.depts.dot?.name], ['', 'Not shown on the CAD']].map(([v, n]) => `<option value="${v}"${v === d ? ' selected' : ''}>${esc(n)}</option>`).join('')}</select>`).join('')}</div>
<label for="cname">Server name</label><input id="cname" name="name" maxlength="48" value="${esc(c.name)}" required>
<div class="row" style="margin-top:14px"><button class="btn pri">Save</button></div><p class="msg" id="dmsg"></p></form></section>
</div><div>
${codes ? `<section class="card"${isNew ? ' style="border-color:rgba(76,141,255,.35)"' : ''}><h2>Invite code</h2><p class="note">Members type this on the front page to join. Anyone with it can join, so change it if it gets passed around.</p>
<label>Invite code</label><div class="row" style="flex-wrap:nowrap"><input id="mcode" value="${esc(codes.member)}" spellcheck="false" maxlength="24"><button class="btn sm" data-copy="${esc(codes.member)}">Copy</button></div>
<div class="row" style="margin-top:8px"><button class="btn sm" id="savem">Save invite code</button><button class="btn sm" id="genm">New random code</button></div>
<p class="msg" id="codemsg"></p></section>` : ''}
<section class="card"><h2>Invite links</h2><p class="note">An alternative to the invite code. Anyone with the link can join. Links last 7 days.</p>
<div class="row"><button class="btn pri" id="newinv">Create invite link</button></div><p class="msg" id="imsg"></p>
${invites.length ? `<div class="invites">${invites.map(i => `<div class="inv"><div class="tx"><code title="${esc(origin)}/join/${esc(i.code)}">${esc(origin.replace(/^https?:\/\//, ''))}/join/${esc(i.code)}</code><small>${i.uses} ${i.uses === 1 ? 'use' : 'uses'}${i.expires ? ` · expires ${new Date(i.expires).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}` : ''}</small></div><div class="acts"><button class="btn sm" data-copy="${esc(origin)}/join/${esc(i.code)}">Copy</button><button class="btn sm danger" data-revoke="${esc(i.code)}">Revoke</button></div></div>`).join('')}</div>` : '<p class="empty">No active invite links.</p>'}
</section>
<section class="card"><h2>Members</h2><p class="note"><b>Owner</b> and <b>Co-Owners</b> run these settings (only the owner can delete the server). <b>Admins</b> get the Server Staff tablet with everything: warn, kick, ban, unban, announce. <b>Mods</b> get the tablet to warn, message, kick and add notes. <b>Members</b> use the CAD. Which department MDT someone gets follows their team in game.</p>
<table><tr><th>Member</th><th>Roblox</th><th>Role</th><th></th></tr>${members.map(m => `<tr><td>${esc(m.name)}${m.verified ? vbadge(14) : ''}</td><td>${m.roblox_name ? esc(m.roblox_name) : '<span style="color:var(--faint)">Not linked</span>'}</td>
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
document.getElementById('spForm').addEventListener('submit',async e=>{e.preventDefault();try{await api(A+'/profile/save',{bio:bio.value,invite:document.getElementById('spInv').value,listed:document.getElementById('spList').checked,open_join:document.getElementById('spOpen').checked,join_code:document.getElementById('spJoin')?document.getElementById('spJoin').value:undefined,region:document.getElementById('spRegion').value,lang:document.getElementById('spLang').value});say(m,'Profile saved.',true)}catch(x){say(m,x.message)}});
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
document.getElementById('depts').addEventListener('submit',async e=>{e.preventDefault();const f=new FormData(e.target),m=document.getElementById('dmsg');const depts={},teams={};for(const d of['pd','fd','dot'])depts[d]={name:f.get(d+'-name'),short:f.get(d+'-short'),units:f.get(d+'-units')};for(const[k,v]of f.entries())if(k.startsWith('team-'))teams[k.slice(5)]=v;
try{await api(A+'/settings',{name:f.get('name'),depts,teams});say(m,'Saved.',true)}catch(x){say(m,x.message)}});
document.getElementById('newinv').addEventListener('click',async()=>{const m=document.getElementById('imsg');try{const j=await api(A+'/invites');await navigator.clipboard?.writeText(j.url).catch(()=>{});say(m,'Link created and copied: '+j.url,true);setTimeout(()=>location.reload(),1500)}catch(x){say(m,x.message)}});
document.addEventListener('click',async e=>{const c=e.target.closest('[data-copy]');if(c){await navigator.clipboard?.writeText(c.dataset.copy).catch(()=>{});const t=c.textContent;c.textContent='Copied';setTimeout(()=>c.textContent=t,1200)}
const r=e.target.closest('[data-revoke]');if(r){await api(A+'/invites/revoke',{code:r.dataset.revoke});location.reload()}
const x=e.target.closest('[data-remove]');if(x){if(!await ask({title:'Remove this member?',text:'They lose access to the CAD for this server. They can rejoin with the invite code or an invite link.',ok:'Remove',danger:true}))return;try{await api(A+'/members/remove',{userId:+x.dataset.remove});location.reload()}catch(err){say(document.getElementById('mmsg'),err.message)}}});
document.addEventListener('change',async e=>{const s=e.target.closest('[data-role]');if(!s)return;try{await api(A+'/members/role',{userId:+s.dataset.role,role:s.value});say(document.getElementById('mmsg'),'Role updated.',true)}catch(x){say(document.getElementById('mmsg'),x.message)}});
const cm=document.getElementById('codemsg'),setc=async(body)=>{try{const j=await api(A+'/codes',body);say(cm,'Saved: '+j.code,true);return j.code}catch(x){say(cm,x.message)}};
const sm=document.getElementById('savem');if(sm){sm.addEventListener('click',()=>setc({role:'member',code:document.getElementById('mcode').value}));
document.getElementById('genm').addEventListener('click',async()=>{const c=await setc({role:'member',generate:true});if(c){document.getElementById('mcode').value=c;document.querySelector('[data-copy]').dataset.copy=c}});
}
const del=document.getElementById('del');if(del)del.addEventListener('click',async()=>{if(!await ask({title:${JSON.stringify('Delete ' + c.name + '?').replace(/</g, '\\u003c')},text:'This removes the server from Oversite with its settings, codes and member list. It cannot be undone.',ok:'Delete server',danger:true,typed:'${esc(c.slug)}'}))return;await api(A+'/delete',{confirm:'${esc(c.slug)}'});location.href='/dashboard'});
` });

export const join = ({ logo, user, c, code }) => layout({ title: `Join ${c.name} · Oversite`, logo, user, body: `
<section class="hero"><div class="box"><div class="mark"><img src="data:image/png;base64,${logo}" alt=""></div>
<h1>Join <b>${esc(c.name)}</b></h1><p class="lead">You have been invited to this server's CAD on Oversite.</p>
<form method="post" action="/join/${esc(code)}" class="actions"><button class="btn pri">Join community</button></form></div></section>` });

export const message = ({ logo, user, title, text, action }) => layout({ title: `${title} · Oversite`, logo, user, body: `
<section class="hero"><div class="box"><div class="mark"><img src="data:image/png;base64,${logo}" alt=""></div><h1>${esc(title)}</h1><p class="lead">${esc(text)}</p>
${action ? `<div class="actions"><a class="btn pri" href="${esc(action.href)}">${esc(action.label)}</a></div>` : ''}</div></section>` });
