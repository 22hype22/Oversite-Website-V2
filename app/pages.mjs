// Server-rendered pages around the live map: landing, dashboard, community settings, invites. Same visual language as the map.
import { DOCS, UPDATED } from './legal.mjs';
import { isSiteAdmin, isSiteMod } from './admins.mjs';
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
.who{display:flex;align-items:center;gap:8px;font-size:13px;color:var(--dim);text-decoration:none;padding:3px 10px 3px 3px;border-radius:999px;transition:background .15s,color .15s}.who-b{display:inline-flex;align-items:center;gap:2px;margin-left:-4px}.who-b .vb{margin:0!important;vertical-align:0}.who:hover{background:rgba(255,255,255,.06);color:var(--ink)}
.sp-head{display:flex;align-items:center;gap:16px;margin:4px 0 14px}
.sp-icon{position:relative;width:76px;height:76px;flex:none;border-radius:18px;border:1px solid var(--hair2);background:linear-gradient(160deg,#2d3440,#1b1f26);color:var(--ink);font:600 28px/1 inherit;cursor:pointer;padding:0;overflow:hidden;display:grid;place-items:center}
.sp-icon img{position:absolute;inset:0;width:100%;height:100%;object-fit:cover}
.sp-icon i{position:absolute;inset:auto 0 0;font:500 10.5px/1 inherit;font-style:normal;padding:5px 0;background:rgba(0,0,0,.62);opacity:0;transition:opacity .15s}
.sp-icon:hover i,.sp-icon:focus-visible i{opacity:1}
.sp-id{min-width:0}.sp-id b{display:block;font-size:16px;font-weight:600}.sp-id small{display:block;color:var(--dim);font-size:12.5px;margin-top:2px}
.sp-ph{margin:18px 0 20px}.sp-phh{display:flex;align-items:baseline;justify-content:space-between}.sp-phh b{font-size:13px;font-weight:600}.sp-phh span{color:var(--faint);font-size:12px}
.sp-phg{display:grid;grid-template-columns:repeat(auto-fill,minmax(132px,1fr));gap:10px}
.sp-phg figure{position:relative;margin:0;aspect-ratio:16/10;border-radius:12px;overflow:hidden;border:1px solid var(--hair2);background:#1b1d21}
.sp-phg img{width:100%;height:100%;object-fit:cover;display:block}
.sp-phg em{position:absolute;left:7px;top:7px;font-style:normal;font-size:10.5px;font-weight:600;letter-spacing:.04em;text-transform:uppercase;padding:3px 7px;border-radius:999px;background:rgba(10,11,13,.78);color:var(--ink)}
.ph-acts{position:absolute;right:6px;top:6px;display:flex;gap:4px}
.ph-acts button{display:grid;place-items:center;width:28px;height:28px;border-radius:8px;border:1px solid rgba(240,242,245,.18);background:rgba(10,11,13,.78);color:var(--ink);cursor:pointer;padding:0}
.ph-acts button:hover{background:rgba(30,32,36,.95)}.ph-acts .ph-x:hover{color:#ff8a8a}.ph-acts [hidden]{display:none}
.sp-phg figure{cursor:grab;touch-action:pan-y;user-select:none;transition:box-shadow .2s}.sp-phg img{pointer-events:none;-webkit-user-drag:none}
.sp-phg figure.sel{outline:2px solid var(--ink);outline-offset:2px}
.sp-phg figure.drag{z-index:3;cursor:grabbing;box-shadow:0 14px 34px rgba(0,0,0,.5);opacity:.94}
.sp-cov{margin:0 0 14px}
.sp-cvf{position:relative;border-radius:12px;overflow:hidden;border:1px solid var(--hair2);background:#15171a;cursor:grab;touch-action:none;user-select:none;outline:none}
.sp-cvf.on{cursor:grabbing}.sp-cvf:focus-visible{outline:2px solid var(--ink);outline-offset:2px}
.sp-cvf img{width:100%;height:100%;object-fit:cover;display:block;pointer-events:none;-webkit-user-drag:none}
.sp-cvf.pg{aspect-ratio:2.8/1}.sp-cvf.xc{aspect-ratio:5/1;width:min(100%,340px);margin-top:8px}
.sp-cvf span{position:absolute;left:8px;bottom:7px;font-size:10.5px;font-weight:600;letter-spacing:.04em;text-transform:uppercase;padding:3px 7px;border-radius:999px;background:rgba(10,11,13,.78);color:var(--ink);pointer-events:none}
.sp-cvf i{position:absolute;inset:0;display:grid;place-items:center;font-style:normal;font-size:12.5px;font-weight:600;color:var(--ink);background:rgba(10,11,13,.35);opacity:0;transition:opacity .25s;pointer-events:none}
.sp-cvf:hover i{opacity:1}.sp-cvf.on i{opacity:0}
.sp-cvr{display:flex;align-items:baseline;justify-content:space-between;gap:12px;margin-top:6px}
.sp-cvr .lnk{background:none;border:0;color:var(--dim);font:inherit;font-size:12px;cursor:pointer;padding:0;text-decoration:underline;text-underline-offset:3px;flex:none}.sp-cvr .lnk:hover{color:var(--ink)}
.sp-phadd{aspect-ratio:16/10;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:6px;border-radius:12px;border:1px dashed rgba(240,242,245,.22);background:rgba(240,242,245,.03);color:var(--dim);font:inherit;font-size:12.5px;cursor:pointer}
.sp-phadd:hover{color:var(--ink);border-color:rgba(240,242,245,.4);background:rgba(240,242,245,.06)}
.sp-erlc{border:1px solid var(--hair);border-radius:12px;padding:12px 14px;background:rgba(255,255,255,.02);margin-bottom:4px}
.sp-erlch{display:flex;justify-content:space-between;align-items:center;font-size:11px;letter-spacing:.06em;text-transform:uppercase;color:var(--faint)}
.sp-erlch .lnk{background:none;border:0;color:var(--dim);font:inherit;font-size:11.5px;letter-spacing:0;text-transform:none;cursor:pointer;padding:0;text-decoration:underline;text-underline-offset:3px}
.sp-facts{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px 16px;margin-top:10px}
.sp-facts small{display:block;color:var(--faint);font-size:11px}.sp-facts b{display:block;font-size:13px;font-weight:500;margin-top:2px;overflow-wrap:anywhere}
.sp-facts code{font-family:inherit;font-weight:700;letter-spacing:.05em}
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
.xr-map.ph{height:112px;background-size:cover;background-position:center}.xr:hover .xr-map.ph{background-size:cover}
.xr-map::after{content:"";position:absolute;inset:0;background:linear-gradient(180deg,rgba(8,10,12,.1),rgba(8,10,12,.35) 50%,rgba(16,16,18,.96))}
.xr-mt{position:absolute;left:14px;right:14px;top:12px;z-index:1;display:flex;align-items:center;justify-content:space-between;gap:8px}
.xs{display:inline-flex;align-items:center;gap:7px;font-size:12px;color:#D5D8DD;padding:5px 11px;border-radius:999px;background:rgba(8,9,11,.72);backdrop-filter:blur(8px);border:1px solid rgba(255,255,255,.08)}
.xs b{color:#fff;font-weight:600}.xs.full b{color:#F2C46E}
.xr-badge{font-size:10.5px;font-weight:600;letter-spacing:.09em;text-transform:uppercase;color:#0B0B0C;background:#F0F2F5;padding:4px 10px;border-radius:999px}
.xr-badge.ft{background:rgba(11,11,12,.72);color:#F0F2F5;border:1px solid rgba(240,242,245,.28)}
.xr-rank{font-size:11.5px;font-weight:600;color:#E9EAEC;padding:4px 9px;border-radius:999px;background:rgba(8,9,11,.72);border:1px solid rgba(255,255,255,.08)}
.xr-code{position:absolute;right:14px;bottom:12px;z-index:3;display:flex;align-items:center;gap:7px;font:700 15px/1 inherit;font-family:inherit;letter-spacing:.05em;color:#fff;padding:7px 11px;border-radius:9px;background:rgba(8,9,11,.78);border:1px solid rgba(255,255,255,.2);box-shadow:0 4px 14px rgba(0,0,0,.35);cursor:pointer;backdrop-filter:blur(6px);-webkit-backdrop-filter:blur(6px);transition:background .15s,border-color .15s}
.xr-code small{font-size:10px;font-weight:600;letter-spacing:.08em;text-transform:uppercase;color:rgba(255,255,255,.6)}.xr-code:hover{background:rgba(8,9,11,.9);border-color:rgba(255,255,255,.4)}
.xr-bar{position:absolute;left:0;right:0;bottom:0;z-index:1;height:2px;background:rgba(255,255,255,.06)}.xr-bar i{display:block;height:100%;background:var(--sc,#46D07C);box-shadow:0 0 10px var(--sc,#46D07C)}
.xr-b{display:flex;flex-direction:column;gap:12px;padding:0 18px 18px;flex:1}
.xr-h{display:flex;flex-wrap:wrap;align-items:flex-end;gap:10px 14px;margin-top:-30px;position:relative;z-index:1}
.xr-ic{position:relative;overflow:hidden;flex:none;width:64px;height:64px;border-radius:17px;display:grid;place-items:center;font-size:24px;font-weight:700;background:linear-gradient(160deg,#2d3440,#1b1f26);border:3px solid #141517;box-shadow:0 10px 22px rgba(0,0,0,.45)}
.xr-ic img{position:absolute;inset:0;width:100%;height:100%;object-fit:cover}
.xr-n{flex:1 1 150px;min-width:0;padding-top:34px}.xr h3{margin:0;font-size:18px;font-weight:600;letter-spacing:-.01em;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.by{display:inline-flex;align-items:center;gap:0;color:var(--dim);font-size:12.5px;margin-top:2px}.by .vb{margin-left:5px;vertical-align:-1px}.vb+.pb{margin-left:1px!important}.by img{width:16px;height:16px;border-radius:50%;background:#2a2d33}
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
.xd-facts small{display:block;color:var(--faint);font-size:11px}.xd-facts b{display:block;font-size:13px;font-weight:500;margin-top:2px;overflow-wrap:anywhere}.xd-facts code{font-family:inherit;font-weight:700;letter-spacing:.05em}
@media (max-width:900px){.xp-list{grid-template-columns:1fr}.xp-tabs button{flex:none}}
@media (max-width:640px){.xp-search{min-width:0;flex:1 1 100%}.xd-facts{grid-template-columns:1fr}.xp-tabs button{padding:8px 13px}.xr-n{flex-basis:calc(100% - 78px)}.xr-mine{margin:0 0 0 78px;align-self:auto}.xr h3{white-space:normal;overflow-wrap:anywhere}}
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
.hero .ecode{font-size:clamp(88px,22vw,132px);font-weight:700;line-height:1;letter-spacing:-.05em;color:var(--ink);margin:0 0 10px;font-variant-numeric:tabular-nums}
.hero .ename{margin:0 0 18px;font-size:12px;letter-spacing:.08em;text-transform:uppercase;color:var(--faint)}
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
.srv .ic:has(img),.vc-p .av:has(img),.xr-ic:has(img),.sv-ic:has(img),.adm-r .pic:has(img),.rv-av:has(img),.prof .pic:has(img),.sp-icon:has(img){color:transparent}.sp-icon:has(img) i{color:var(--ink)}
.vb{display:inline-block;vertical-align:-2px;margin-left:6px;flex:none}.vb+.pb{margin-left:1px!important}
.adm{max-width:1080px}.adm h1{margin:0 0 4px}.adm .lead{margin:0 0 22px}
.adm-app{margin-bottom:18px}.auth-cmd{display:flex;align-items:center;gap:14px;margin-top:16px;padding:12px 14px;border:1px solid var(--line, rgba(255,255,255,.1));border-radius:12px}.auth-cmd>div{flex:1}.adm-af{display:grid;grid-template-columns:1fr 160px auto;gap:10px;margin-top:12px}.adm-af input{margin:0}@media (max-width:700px){.adm-af{grid-template-columns:1fr}}
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
.adm-r{flex-wrap:wrap}.adm-b{display:flex;flex-wrap:wrap;gap:6px;flex:1 0 100%;padding-left:48px}.adm-b .btn{min-width:0}.adm-r .adm-b .btn[data-k]{min-width:84px}
.adm-x{flex-basis:100%;display:flex;flex-wrap:wrap;gap:6px;padding:10px 0 2px 48px;border-top:1px solid var(--hair);margin-top:4px}
.adm-ts{display:flex;flex-wrap:wrap;gap:4px;margin-top:5px}
.adm-t{font-style:normal;font-size:11px;font-weight:500;padding:2px 7px;border-radius:999px;border:1px solid var(--hair2);color:var(--dim)}.adm-t.ok{color:var(--ink)}.adm-pm{display:inline-flex;gap:6px;align-items:center}.pmd label{display:block;text-align:left;margin:14px 0 6px;font-size:12.5px;color:var(--dim)}.pmd select{display:block;width:100%}.pmd input{width:100%}.pmd [hidden]{display:none}.adm-pm select{height:33px;min-height:33px;border-radius:999px;padding:0 12px;font:inherit;font-size:12.5px;font-weight:500;background:rgba(255,255,255,.06);color:var(--ink);border:1px solid var(--hair2)}.adm-t.warn{color:#F0C46E;border-color:rgba(233,176,76,.35)}.adm-t.bad{color:#F3A3A3;border-color:rgba(226,75,75,.4)}
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
// the gold check: Oversite Premium (a Premium server, or a person a site admin gave Premium), shown next to the blue one
export const pbadge = (size = 16) => `<svg class="vb pb" width="${size}" height="${size}" viewBox="0 0 24 24" role="img" aria-label="Oversite Premium"><title>Oversite Premium</title>${SEAL.replace('#4C8DFF', '#E8B33A')}</svg>`;
export const vbadge = (size = 16) => `<svg class="vb" width="${size}" height="${size}" viewBox="0 0 24 24" role="img" aria-label="Verified by Oversite"><title>Verified by Oversite</title>${SEAL}</svg>`;
// pinned to the bottom of every page: the same legal links as oversite.shop, then our Roblox group and Discord
const ROBLOX_GROUP = 'https://www.roblox.com/communities/691798472/Oversite-Customs', DISCORD_INVITE = 'https://discord.gg/ovs';
const FOOT = `<div class="foot-sp" aria-hidden="true"></div><footer class="site-foot"><nav aria-label="Legal"><a href="/privacy">Privacy Policy</a><a href="/terms">Terms of Use</a><a href="/refunds">Sales and Refunds</a><a href="/support">Support</a></nav><span class="sep" aria-hidden="true"></span>
<a class="soc" href="${ROBLOX_GROUP}" target="_blank" rel="noopener" aria-label="Oversite on Roblox" title="Oversite on Roblox"><svg width="16" height="16" viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" fill-rule="evenodd" d="M5.92 1.47 22.53 5.92 18.08 22.53 1.47 18.08Z M10.37 9.18 14.82 10.37 13.63 14.82 9.18 13.63Z"/></svg></a>
<a class="soc" href="${DISCORD_INVITE}" target="_blank" rel="noopener" aria-label="Oversite on Discord" title="Oversite on Discord"><svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M19.6 5.4A17 17 0 0 0 15.4 4l-.5 1a15.6 15.6 0 0 0-5.8 0L8.6 4a17 17 0 0 0-4.2 1.4C1.8 9.4 1 13.3 1.4 17.1A17 17 0 0 0 6.6 20l1.1-1.8c-.6-.2-1.2-.5-1.7-.9l.4-.3a12.2 12.2 0 0 0 11.2 0l.4.3c-.5.4-1.1.7-1.7.9l1.1 1.8a17 17 0 0 0 5.2-2.9c.5-4.4-.8-8.3-2.9-11.7zM8.7 14.8c-1 0-1.9-1-1.9-2.1s.8-2.1 1.9-2.1 1.9 1 1.9 2.1-.8 2.1-1.9 2.1zm6.6 0c-1 0-1.9-1-1.9-2.1s.8-2.1 1.9-2.1 1.9 1 1.9 2.1-.8 2.1-1.9 2.1z"/></svg></a></footer>`;
export const layout = ({ title, logo, user, body, bg = true, top = true, intro = true, foot = true, script = '' }) => `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(title)}</title><link rel="icon" href="/favicon.ico?v=5" sizes="32x32"><link rel="icon" type="image/svg+xml" href="/icon-tab.svg?v=5"><link rel="icon" type="image/png" href="/icon-tab.png?v=5"><link rel="apple-touch-icon" href="/apple-touch-icon.png?v=4"><link rel="manifest" href="/manifest.webmanifest?v=4"><meta name="apple-mobile-web-app-title" content="Oversite"><meta name="application-name" content="Oversite"><meta name="theme-color" content="#0D1416">
<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin><link href="https://fonts.googleapis.com/css2?family=Geist:wght@300;400;500;600&display=swap" rel="stylesheet">
<style>${CSS}</style>${intro ? INTRO_HEAD : ''}<script src="/dropdown.js?v=2" defer></script></head><body>${bg ? '<div class="bg"></div>' : ''}
${top ? `<header class="top"><a class="brand" href="${user ? '/account' : '/'}"><i><img src="data:image/png;base64,${logo}" alt=""></i><span class="ov">Oversite</span> <span class="cad">CAD</span></a><span class="sp"></span>
${user ? `${isSiteMod(user) ? '<a class="nav" href="/admin">Moderation</a>' : ''}<a class="nav" href="/explore">Explore</a><a class="who" href="/account" title="Your account">${user.roblox_id ? `<img src="/rbx/avatar/${esc(user.roblox_id)}" alt="" onerror="this.replaceWith(Object.assign(document.createElement('span'),{className:'av',textContent:${esc(JSON.stringify((user.roblox_name || user.name || '?').slice(0, 1).toUpperCase()))}}))">` : user.avatar ? `<img src="${esc(user.avatar)}" alt="">` : `<span class="av">${esc((user.roblox_name || user.name).slice(0, 1).toUpperCase())}</span>`}<span class="nm">${esc(user.roblox_name || user.name)}</span>${user.verified || (user.premium_until || 0) > Date.now() ? `<span class="who-b">${user.verified ? vbadge(14) : ''}${(user.premium_until || 0) > Date.now() ? pbadge(14) : ''}</span>` : ''}</a><form method="post" action="/auth/logout" style="margin:0"><button class="btn sm">Sign out</button></form>` : `<a class="nav" href="/explore">Explore</a><a class="btn sm pri" href="/" data-signin>Sign in</a>`}</header>` : ''}
${body}${foot ? FOOT : ''}<script>${JS}${user && !user.suspended ? "(()=>{const ping=()=>{if(document.hidden)return;fetch('/api/me/ping',{cache:'no-store'}).then(r=>{if(r.status===401||r.status===403)location.reload()}).catch(()=>{})};setInterval(ping,8000);document.addEventListener('visibilitychange',ping)})();" : ''}${user ? '' : "document.querySelectorAll('[data-signin]').forEach(a=>a.href='/?next='+encodeURIComponent(location.pathname));"}${script}</script></body></html>`;

export const landing = ({ logo, discord, owner, roblox, next = '/dashboard', error = '' }) => layout({ title: 'Oversite', logo, top: false, body: `
<section class="hero wide notop"><div class="box">
<div class="mark"><img src="data:image/png;base64,${logo}" alt=""></div>
<h1><span style="font-weight:400">Oversite</span> <b>CAD</b></h1>
<p class="lead">A live dispatch system for ER:LC private servers. Every unit on a 3D map of Liberty County, live from your server.</p>
<p class="note" style="margin:-6px 0 18px"><a href="/explore">Explore servers</a> without signing in.</p>
<div class="paths">
<form class="card path" id="codeform" autocomplete="off"><h2>Join your server</h2><p class="note">Enter your server's invite code.</p>
<input id="code" placeholder="Invite code" aria-label="Invite code" autocapitalize="characters" spellcheck="false" required>
<button class="btn pri">Sign in</button><p class="msg" id="codemsg"></p>${roblox ? '<div class="or">already linked Roblox?</div><a class="btn" href="/auth/roblox?next=/dashboard">Sign in with Roblox</a>' : ''}</form>
<form class="card path" id="makeform" autocomplete="off"><h2>Create a server</h2><p class="note">Set up a CAD for your ER:LC server.</p>
<input id="mname" maxlength="48" placeholder="Server name" aria-label="Server name" required>
<input id="mslug" maxlength="32" placeholder="address" aria-label="Address" required><p class="hint addr">oversitescad.com/<span id="slugp">your-server</span></p>
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
export const admin = ({ logo, user, servers, reports, reasons, app = {}, tickets = [], stripe = {}, owner = false }) => layout({ title: 'Moderation · Oversite', logo, user, body: `
<main class="adm"><h1>Moderation</h1><p class="lead">Reports from Explore, the blue check ${vbadge(18)} and suspensions. Only Oversite&#39;s team can see this page.</p>
${owner ? `<section class="card adm-app"><div class="adm-h"><h2>ER:LC application</h2><span id="aS">${app.hasKey ? (app.fromEnv ? 'Key set in Railway' : 'Key saved') + (app.appId ? ' · Client ID ' + esc(app.appId) : ' · no Client ID') : 'Not set up'}</span></div>
<p class="note">ER:LC only lets Oversite serve more than one server as a registered application. Create it once at <a href="https://api.erlc.gg/developers/applications" target="_blank" rel="noopener">api.erlc.gg/developers/applications</a> (privacy policy ${esc('https://www.oversitescad.com/privacy')}, terms ${esc('https://www.oversitescad.com/terms')}), then paste its Global API Key and Client ID here. The key is stored encrypted and never shown again. The Client ID gives every server owner a one-click link to let Oversite run staff commands.</p>
<form id="aF" autocomplete="off" class="adm-af"><input id="aK" type="password" placeholder="${app.hasKey ? 'Paste a new Global API Key to replace it' : 'Global API Key'}"${app.hasKey ? ' value="••••••••••••••••••••••••••••" data-saved="1"' : ''} aria-label="Global API Key"><input id="aI" placeholder="Client ID" value="${esc(app.appId || '')}" aria-label="Client ID" spellcheck="false"><button class="btn pri">Save and test</button></form><p class="msg" id="aM"></p></section>
<section class="card adm-app"><div class="adm-h"><h2>Payments</h2><span id="pyS">${stripe.ready ? (stripe.live ? 'Live' : 'Test mode') + (stripe.webhook ? '' : ', webhook missing') : 'Off'}</span></div>
<p class="note">Premium is paid through Stripe. Paste the secret key from the Stripe account (Developers, API keys; it starts with <code>sk_live_</code>). Oversite then creates its own webhook and billing page in that account.</p>
<form id="pyF" autocomplete="off" class="adm-af"><input id="pyK" type="password" placeholder="${stripe.ready ? 'Paste a new secret key to replace it' : 'Stripe secret key'}" aria-label="Stripe secret key"><button class="btn pri">Save</button></form><p class="msg" id="pyM"></p></section>` : ''}
<section class="card adm-rep"><div class="adm-h"><h2>Reports</h2><span id="rN"></span></div><div class="adm-l" id="rL"></div></section>
<section class="card adm-rep"><div class="adm-h"><h2>Support</h2><span id="tN"></span></div><div class="adm-l" id="tL"></div></section>
<div class="adm-cols">
<section class="card"><div class="adm-h"><h2>Servers</h2><span id="sN"></span></div><input class="adm-q" id="sQ" type="search" placeholder="Search servers" aria-label="Search servers" autocomplete="off"><div class="adm-l" id="sL"></div></section>
<section class="card"><div class="adm-h"><h2>People</h2><span id="pN"></span></div><input class="adm-q" id="pQ" type="search" placeholder="Search by Roblox or Discord name, or ID" aria-label="Search people" autocomplete="off"><div class="adm-l" id="pL"></div></section>
</div></main>`, script: `
if(document.getElementById('aF')){document.getElementById('aK').addEventListener('focus',e=>{if(e.target.dataset.saved)e.target.select()});
document.getElementById('aF').addEventListener('submit',async ev=>{ev.preventDefault();const m=document.getElementById('aM'),k=document.getElementById('aK'),i=document.getElementById('aI');if(k.value==='••••••••••••••••••••••••••••')k.value='';m.className='msg';m.textContent='Saving and checking with ER:LC…';
  try{const r=await fetch('/api/admin/erlc-app',{method:'POST',headers:{'content-type':'application/json','x-oversite':'1'},body:JSON.stringify({key:k.value.trim(),appId:i.value.trim()})});const j=await r.json().catch(()=>({}));if(!r.ok)throw new Error(j.error||'Could not save.');
    k.value=j.hasKey&&!j.fromEnv?'••••••••••••••••••••••••••••':'';k.dataset.saved=j.hasKey?'1':'';m.className='msg '+(j.ok===false?'err':'ok');m.textContent=j.check||'Saved.';document.getElementById('aS').textContent=(j.hasKey?(j.fromEnv?'Key set in Railway':'Key saved'):'Not set up')+(j.appId?' · Client ID '+j.appId:' · no Client ID')}catch(x){m.className='msg err';m.textContent=x.message}});}
const OWN=${owner ? 1 : 0},VB=${JSON.stringify(vbadge(15))},PB=${JSON.stringify(pbadge(15))},RS=${JSON.stringify(reasons)};let S=${JSON.stringify(servers).replace(/</g, '\\u003c')},R=${JSON.stringify(reports).replace(/</g, '\\u003c')};
const e=t=>String(t??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const ini=t=>e(String(t||'?').slice(0,1).toUpperCase());
const ago=t=>{const m=Math.round((Date.now()-t)/60000);return m<1?'just now':m<60?m+' min ago':m<1440?Math.round(m/60)+' h ago':Math.round(m/1440)+' d ago'};
const tag=(t,k)=>'<i class="adm-t '+k+'">'+t+'</i>';
const sIc=x=>'<span class="pic sq">'+ini(x.name)+'<img src="/c/'+e(x.slug)+'/icon" alt="" loading="lazy" onerror="this.remove()"></span>';
const vbtn=(k,id,on)=>'<button class="btn sm'+(on?' is-on':'')+'" data-k="'+k+'" data-id="'+id+'" data-on="'+(on?1:0)+'">'+(on?'Verified':'Verify')+'</button>';
const act=(a,id,label,cls)=>'<button class="btn sm'+(cls?' '+cls:'')+'" data-a="'+a+'" data-id="'+id+'">'+label+'</button>';
const open=new Set();
const rRow=x=>'<div class="adm-r adm-rr">'+sIc(x)+'<div class="tx"><b>'+e(x.name)+'</b><small>'+tag(e(RS[x.reason]||x.reason),'warn')+' by '+e(x.by_name||'someone')+' · '+ago(x.created)+(x.hidden?' · '+tag('Hidden','dim'):'')+(x.suspended?' · '+tag('Suspended','bad'):'')+'</small>'
  +(x.review_id?(x.review_body!=null?'<q>'+'★'.repeat(x.review_rating)+' '+e(x.review_body)+'</q><small>Review by '+e(x.review_by||'someone')+' · <a href="/'+e(x.slug)+'/about#reviews" target="_blank">open page</a></small>':'<q>This review was already deleted.</q>'):(x.details?'<q>'+e(x.details)+'</q>':''))+'</div>'
  +'<div class="adm-b">'+(x.review_id?(x.review_body!=null?'<button class="btn sm warnb" data-rvd="'+x.review_id+'">Remove review</button>':''):(x.hidden?'':act('hide',x.community_id,'Hide server','warnb')))+'<button class="btn sm" data-dismiss="'+x.id+'">Dismiss</button></div></div>';
const sRow=x=>'<div class="adm-r'+(x.verified?' on':'')+(x.suspended?' off':'')+'" data-srv="'+x.id+'">'+sIc(x)+'<div class="tx"><b>'+e(x.name)+(x.verified?VB:'')+(x.prem_until>Date.now()?PB:'')+'</b><small>/'+e(x.slug)+' · '+(x.owner_rbx||x.owner_name?'by '+e(x.owner_rbx||x.owner_name)+' · ':'')+x.members+' member'+(x.members===1?'':'s')+(x.listed&&!x.hidden?' · On Explore':'')+'</small>'
  +((x.open_reports||x.hidden||x.suspended||x.prem_until>Date.now())?'<span class="adm-ts">'+(x.prem_until>Date.now()?tag(x.prem_until>4.1e12?'Premium':'Premium until '+new Date(x.prem_until).toLocaleDateString(undefined,{month:'short',day:'numeric'}),'ok'):'')+(x.open_reports?tag(x.open_reports+' report'+(x.open_reports===1?'':'s'),'warn'):'')+(x.hidden?tag('Hidden from Explore','dim'):'')+(x.suspended?tag('Suspended','bad'):'')+'</span>':'')+'</div>'
  +'<div class="adm-b">'+vbtn('server',x.id,x.verified)+'<button class="btn sm ghost" data-more="'+x.id+'" aria-expanded="'+open.has(x.id)+'">Manage</button></div>'
  +(open.has(x.id)?'<div class="adm-x">'+act(x.hidden?'show':'hide',x.id,x.hidden?'Show on Explore':'Hide from Explore')+(x.custom_icon?act('reset_icon',x.id,'Reset icon'):'')+(x.photos?act('clear_photos',x.id,'Remove photos'):'')+(x.has_bio?act('clear_bio',x.id,'Clear bio'):'')+'<a class="btn sm" href="/'+e(x.slug)+'">Open CAD</a>'+(OWN?'<span class="adm-pm"><button class="btn sm" data-pm="give" data-id="'+x.id+'">'+(x.prem_until>Date.now()?'Change Premium':'Give Premium')+'</button>'+(x.prem_until>Date.now()?'<button class="btn sm" data-pm="off" data-id="'+x.id+'">Remove Premium</button>':'')+'</span>':'')+act(x.suspended?'unsuspend':'suspend',x.id,x.suspended?'Lift suspension':'Suspend server',x.suspended?'':'warnb')+'</div>':'')+'</div>';
const pRow=x=>'<div class="adm-r'+(x.verified?' on':'')+(x.suspended?' off':'')+'"><span class="pic">'+ini(x.roblox_name)+'<img src="/rbx/avatar/'+e(x.roblox_id)+'" alt="" loading="lazy" onerror="this.remove()"></span><div class="tx"><b>'+e(x.roblox_name)+(x.verified?VB:'')+(x.prem_until>Date.now()?PB:'')+'</b><small>Roblox '+e(x.roblox_id)+(x.discord?' · Discord '+e(x.discord_name||''):'')+' · '+x.servers+' server'+(x.servers===1?'':'s')+'</small>'+((x.suspended||x.site_mod||x.prem_until>Date.now())?'<span class="adm-ts">'+(x.site_mod?tag('Moderator','ok'):'')+(x.prem_until>Date.now()?tag(x.prem_until>4e12?'Premium':'Premium until '+new Date(x.prem_until).toLocaleDateString('en-US',{month:'short',day:'numeric'}),'ok'):'')+(x.suspended?tag('Suspended','bad'):'')+'</span>':'')+'</div>'
  +'<div class="adm-b">'+(OWN?'<span class="adm-pm"><button class="btn sm" data-upm="give" data-id="'+x.id+'">'+(x.prem_until>Date.now()?'Change Premium':'Give Premium')+'</button>'+(x.prem_until>Date.now()?'<button class="btn sm warnb" data-upm="off" data-id="'+x.id+'">Remove Premium</button>':'')+'</span>':'')+vbtn('user',x.id,x.verified)+(OWN?'<button class="btn sm'+(x.site_mod?' is-on':'')+'" data-mod="'+x.id+'">'+(x.site_mod?'Moderator':'Make moderator')+'</button>':'')+'<button class="btn sm'+(x.suspended?'':' warnb')+'" data-p="'+(x.suspended?'unsuspend':'suspend')+'" data-id="'+x.id+'">'+(x.suspended?'Unsuspend':'Suspend')+'</button></div></div>';
const TOP=${JSON.stringify(SUPPORT_TOPICS)};const tAgo=t=>{const s=(Date.now()-t)/1000;return s<3600?Math.max(1,Math.round(s/60))+'m ago':s<86400?Math.round(s/3600)+'h ago':Math.round(s/86400)+'d ago'};let T=${JSON.stringify(tickets).replace(/</g, '\\u003c')};const tL=document.getElementById('tL');

const tRow=x=>'<div class="adm-r adm-rr"><span class="pic">'+ini(x.roblox_name||x.name||x.email||'?')+(x.roblox_id?'<img src="/rbx/avatar/'+e(x.roblox_id)+'" alt="" loading="lazy" onerror="this.remove()">':'')+'</span><div class="tx"><b>'+e(TOP[x.topic]||x.topic)+'</b><small>'+e(x.roblox_name||x.name||'Not signed in')+(x.discord_id?' · Discord '+e(x.discord_id):'')+(x.email?' · '+e(x.email):'')+(x.suspended?' · suspended':'')+' · '+tAgo(x.created)+'</small><q style="white-space:pre-wrap">'+e(x.body)+'</q></div><div class="adm-b"><button class="btn sm" data-tclose="'+x.id+'">Close</button></div></div>';
const drawT=()=>{tL.innerHTML=T.map(tRow).join('')||'<p class="adm-e">No open support messages. Messages from the Support form show up here.</p>';document.getElementById('tN').textContent=T.length?T.length+' open':''};
tL.addEventListener('click',async ev=>{const b=ev.target.closest('[data-tclose]');if(!b)return;b.disabled=true;try{T=(await api('/api/admin/support',{id:+b.dataset.tclose})).tickets;drawT()}catch(x){b.disabled=false}});
drawT();
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
  clear_bio:id=>({title:'Clear the bio of '+sName(id)+'?',text:'The owner can write a new one.',ok:'Clear bio'}),clear_photos:id=>({title:'Remove the photos of '+sName(id)+'?',text:'Every photo the owner uploaded is deleted. Its banner goes back to the map.',ok:'Remove photos'}),reset_icon:id=>({title:'Reset the icon of '+sName(id)+'?',text:'It goes back to the ER:LC or Discord icon.',ok:'Reset icon'})};
sQ.addEventListener('input',drawS);pQ.addEventListener('input',()=>{clearTimeout(pt);pt=setTimeout(loadP,200)});
/* Give or change Premium: a small window to pick when it ends (presets with their end dates, forever, or any date) */
const PMD=(name,until)=>new Promise(res=>{const now=Date.now(),on=until>now,fv=until>4e12,base=on&&!fv?until:now,day=t=>new Date(t).toLocaleDateString('en-US',{month:'short',day:'numeric',year:'numeric'}),iso=t=>{const z=new Date(t);return z.getFullYear()+'-'+String(z.getMonth()+1).padStart(2,'0')+'-'+String(z.getDate()).padStart(2,'0')};
  const opts=[[30,'30 days'],[90,'90 days'],[182,'6 months'],[365,'1 year']].map(([n,l])=>{const t=base+n*864e5;return '<option value="'+t+'">'+(on&&!fv?'Add '+l:l)+', ends '+day(t)+'</option>'}).join('')+'<option value="forever">Forever</option><option value="pick">Pick an end date</option>';
  const d=document.createElement('dialog');d.className='dlg pmd';
  d.innerHTML='<form method="dialog"><h2></h2><p></p><label for="pmdS">Ends</label><select id="pmdS">'+opts+'</select><div class="pmd-d" hidden><label for="pmdD">End date</label><input type="date" id="pmdD"></div><div class="acts"><button type="button" class="btn" data-no>Cancel</button><button value="yes" class="btn pri" data-yes></button></div></form>';
  d.querySelector('h2').textContent=(on?'Change Premium for ':'Give Premium to ')+name;d.querySelector('p').textContent=on?(fv?'Premium never ends right now.':'Premium ends '+day(until)+' right now.'):'Pick when it ends. It turns off by itself that day.';
  const y=d.querySelector('[data-yes]');y.textContent=on?'Save':'Give Premium';const S2=d.querySelector('select'),D=d.querySelector('input'),dw=d.querySelector('.pmd-d');
  D.min=iso(now+864e5);D.value=iso(base+30*864e5);S2.addEventListener('change',()=>{dw.hidden=S2.value!=='pick'});
  d.querySelector('[data-no]').onclick=()=>d.close('no');d.addEventListener('click',e=>{if(e.target===d)d.close('no')});
  d.addEventListener('close',()=>{d.classList.remove('in');let r=null;if(d.returnValue==='yes'){if(S2.value==='forever')r={forever:true};else if(S2.value==='pick'){const t=new Date(D.value+'T23:59:00').getTime();r=t>now?{until:t}:null}else r={until:+S2.value}}res(r);setTimeout(()=>d.remove(),200)});
  document.body.appendChild(d);d.showModal();requestAnimationFrame(()=>d.classList.add('in'));S2.focus()});
document.addEventListener('click',async ev=>{
  const m=ev.target.closest('[data-more]');if(m){const id=+m.dataset.more;open.has(id)?open.delete(id):open.add(id);drawS();return}
  const md=ev.target.closest('[data-mod]');if(md){const id=+md.dataset.mod,x=P.find(y=>y.id===id);if(!x)return;const on=!x.site_mod;if(!(await ask(on?{title:'Make '+x.roblox_name+' a moderator?',text:'They can open this panel to verify people and servers, suspend accounts and servers, and handle reports and support. Payments, the ER:LC key, Premium and moderators stay with you.',ok:'Make moderator'}:{title:'Remove '+x.roblox_name+' as moderator?',text:'They lose access to this panel straight away.',ok:'Remove',danger:true})))return;
    md.disabled=true;try{await api('/api/admin/mod',{id,on});x.site_mod=on?1:0;drawP()}catch(err){md.disabled=false;await ask({title:'That did not work',text:err.message,ok:'OK'})}return}
  const upm=ev.target.closest('[data-upm]');if(upm){const id=+upm.dataset.id,x=P.find(y=>y.id===id);if(!x)return;let r;if(upm.dataset.upm==='off'){if(!(await ask({title:'Remove Premium from '+x.roblox_name+'?',text:'Their gold check goes, and so does any server boost from it.',ok:'Remove Premium',danger:true})))return;r={off:true}}else{r=await PMD(x.roblox_name,x.prem_until||0);if(!r)return}
    upm.disabled=true;try{const j=await api('/api/admin/premium',{user:id,...r});x.prem_until=j.until;drawP()}catch(err){upm.disabled=false;await ask({title:'That did not work',text:err.message,ok:'OK'})}return}
  const pm=ev.target.closest('[data-pm]');if(pm){const id=+pm.dataset.id,x=S.find(y=>y.id===id);if(!x)return;let r;if(pm.dataset.pm==='off'){if(!(await ask({title:'Remove Premium from '+x.name+'?',text:'The server loses Premium now. A boost from a member with Premium is not touched.',ok:'Remove Premium',danger:true})))return;r={off:true}}else{r=await PMD(x.name,x.prem_until||0);if(!r)return}
    pm.disabled=true;try{const j=await api('/api/admin/premium',{id,...r});x.prem_until=j.premium.on?j.premium.until:0;drawS()}catch(err){pm.disabled=false;await ask({title:'That did not work',text:err.message,ok:'OK'})}return}
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
{const f=document.getElementById('pyF');if(f)f.addEventListener('submit',async e=>{e.preventDefault();const k=document.getElementById('pyK'),m=document.getElementById('pyM');
  try{const j=await api('/api/admin/stripe',{key:k.value.trim()});k.value='';document.getElementById('pyS').textContent=j.ready?(j.live?'Live':'Test mode')+(j.webhook?'':', webhook missing'):'Off';say(m,j.check||'Saved.',!/said/.test(j.check||''))}catch(x){say(m,x.message)}})}
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
  return `<div class="srv"><span class="ic">${esc(c.name.slice(0, 1).toUpperCase())}<img src="/c/${esc(c.slug)}/icon" alt="" loading="lazy" onerror="this.remove()"></span><div class="tx"><b title="oversitescad.com/${esc(c.slug)}">${esc(c.name)}</b>
<small><i class="st ${c.connected ? 'ok' : 'warn'}"></i>${c.connected ? 'Live data connected' : 'ER:LC not connected yet'}<span class="sep">·</span>${role}</small></div>
<div class="go">${c.setup ? (admin ? `<a class="btn pri discord" href="/c/${esc(c.slug)}/discord/connect?new=1">Connect Discord to finish</a>` : '<span class="tag warn">Being set up</span>') : `${admin ? `<a class="btn ghost" href="/${esc(c.slug)}/settings">Settings</a>` : ''}${setup ? `<a class="btn ghost" href="/${esc(c.slug)}">Open CAD</a><a class="btn pri" href="/${esc(c.slug)}/settings">Connect ER:LC</a>` : `<a class="btn pri" href="/${esc(c.slug)}">Open CAD<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6"/></svg></a>`}`}</div></div>`; }).join('')}
</section>` : ''}
<section class="card"><h2>${comms.length ? 'Add another server' : 'Get started'}</h2><p class="note">${comms.length ? 'Got an invite code from another server? Enter it here.' : 'Enter your server\'s invite code.'}</p>
<form id="join" class="row" autocomplete="off" style="flex-wrap:nowrap"><input id="jcode" placeholder="Invite code" aria-label="Invite code" spellcheck="false" required><button class="btn pri">Join</button></form><p class="msg" id="jmsg"></p>
<details class="mk"${comms.length ? '' : ' open'}><summary>Create a new server instead</summary><p class="note">One per ER:LC server. Members join with its invite code.</p>
<form id="create" autocomplete="off"><label for="cname">Server name</label><input id="cname" maxlength="48" placeholder="Liberty County Roleplay" required>
<label for="cslug">Address</label><input id="cslug" maxlength="32" pattern="[a-z0-9-]{3,32}" placeholder="liberty-county" required><p class="hint">oversitescad.com/<span id="slugp">liberty-county</span></p>
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
// /account/career: a player's time on duty, calls and records across every server (Premium; others see it locked)
const CR_CSS = `.cr{max-width:1060px}.cr-top{display:flex;align-items:center;gap:16px;margin:4px 0 6px}.cr-top .pic{width:64px;height:64px;border-radius:50%;flex:none;position:relative;overflow:hidden;background:#2a2d33;display:grid;place-items:center;font-size:24px;font-weight:600}.cr-top .pic img{position:absolute;inset:0;width:100%;height:100%;object-fit:cover}
.cr-top h1{margin:0}.cr-top p{margin:3px 0 0;color:var(--dim);font-size:13.5px}.cr-wrap{position:relative;margin-top:22px}
.cr-tiles{display:grid;grid-template-columns:repeat(6,minmax(0,1fr));gap:10px}.cr-tile{padding:14px 14px 13px;border-radius:14px;background:var(--panel);border:1px solid var(--hair)}.cr-tile b{display:block;font-size:24px;font-weight:700;letter-spacing:-.02em;font-variant-numeric:tabular-nums}.cr-tile small{display:block;margin-top:3px;font-size:12px;color:var(--dim)}
.cr-grid{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1fr);gap:14px;margin-top:14px;align-items:start}.cr .card{margin:0}.cr h2{margin:0 0 12px}
.cr-dept{display:grid;gap:12px}.cr-dl{display:flex;justify-content:space-between;font-size:13px;margin-bottom:6px}.cr-dl span{color:var(--dim);font-variant-numeric:tabular-nums}.cr-bar{height:10px;border-radius:5px;background:rgba(255,255,255,.05);overflow:hidden}.cr-bar i{display:block;height:100%;border-radius:0 4px 4px 0;min-width:2px}
.cr-mo{display:flex;align-items:flex-end;gap:10px;height:150px;padding-top:18px}.cr-mo>div{flex:1;display:flex;flex-direction:column;align-items:center;gap:7px;height:100%;justify-content:flex-end;position:relative}
.cr-mo i{display:block;width:100%;max-width:38px;border-radius:4px 4px 0 0;background:#C9972A;min-height:2px}.cr-mo>div:hover i{background:#E8B33A}.cr-mo small{font-size:11.5px;color:var(--faint)}
.cr-mo em{font-style:normal;font-size:11.5px;color:var(--ink);white-space:nowrap;opacity:0;transition:opacity .12s;pointer-events:none}.cr-mo>div:hover em,.cr-mo>div.mx em{opacity:1}
.cr-sv{display:flex;align-items:center;gap:10px;padding:9px 0;border-top:1px solid var(--hair);font-size:13.5px}.cr-sv:first-of-type{border-top:0}.cr-sv b{flex:1;min-width:0;font-weight:600;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.cr-sv span{color:var(--dim);font-variant-numeric:tabular-nums}.cr-sv small{color:var(--faint);font-size:12px;width:88px;text-align:right}
.cr table{width:100%;border-collapse:collapse;font-size:13px}.cr th{text-align:left;font-size:12px;font-weight:600;color:var(--dim);padding:0 8px 8px 0}.cr td{padding:9px 8px 9px 0;border-top:1px solid var(--hair);color:var(--ink)}.cr td.d{color:var(--dim);font-variant-numeric:tabular-nums}
.cr .dot{display:inline-block;width:8px;height:8px;border-radius:50%;margin-right:7px;vertical-align:0}.cr .live{font-size:11px;font-weight:600;color:var(--ok);margin-left:6px}
.cr-empty{padding:26px 6px;text-align:center;color:var(--dim)}.cr-lock{filter:blur(7px);pointer-events:none;user-select:none}
.cr-gate{position:absolute;inset:0;display:grid;place-items:start center;padding-top:70px;z-index:2}.cr-gate>div{max-width:440px;text-align:center;padding:26px 26px 22px;border-radius:18px;border:1px solid rgba(232,179,58,.25);background:rgba(16,13,9,.94);box-shadow:0 20px 60px rgba(0,0,0,.5)}
.cr-gate h2{margin:10px 0 6px;font-size:20px}.cr-gate p{margin:0 0 16px;color:#AFA899;font-size:14px}.cr-gate .ph-go{text-decoration:none}
@media (max-width:900px){.cr-tiles{grid-template-columns:repeat(3,minmax(0,1fr))}.cr-grid{grid-template-columns:1fr}}@media (max-width:520px){.cr-tiles{grid-template-columns:repeat(2,minmax(0,1fr))}.cr-sv small{display:none}.cr th:nth-child(2),.cr td:nth-child(2){display:none}}`;
const DEPT_LBL = { pd: 'Law enforcement', fd: 'Fire and EMS', dot: 'Transportation' };
const hrs = ms => { const h = ms / 3600e3; return h >= 100 ? Math.round(h) + ' h' : h >= 1 ? (Math.round(h * 10) / 10) + ' h' : Math.round(ms / 60000) + ' min'; };
const dur = ms => { const m = Math.round(ms / 60000); return m >= 60 ? `${Math.floor(m / 60)}h ${m % 60}m` : `${m}m`; };
const CR_SAMPLE = () => { const H = 3600e3, now = Date.now(), mo = [9, 14, 11, 22, 18, 26].map((h, i) => { const d = new Date(); d.setMonth(d.getMonth() - 5 + i); return { label: d.toLocaleString('en-US', { month: 'short' }), ms: h * H }; });
  return { total: 100 * H, thisMonth: 26 * H, longest: 4.6 * H, shifts: 48, calls: 132, recs: { arrest: 37, citation: 64 }, byDept: { pd: 71 * H, fd: 21 * H, dot: 8 * H }, months: mo,
    servers: [{ name: 'Liberty County RP', ms: 64 * H, last: now }, { name: 'River City RP', ms: 36 * H, last: now - 6 * 864e5 }], recent: [1, 2, 3, 4].map(i => ({ server: 'Liberty County RP', team: i % 2 ? 'Police' : 'Fire', dept: i % 2 ? 'pd' : 'fd', start: now - i * 864e5, end: now - i * 864e5 + 2.5 * H })) }; };
export const career = ({ logo, user, stats, prem, payments }) => { const S = !prem && !stats?.shifts ? CR_SAMPLE() : stats || { total: 0, thisMonth: 0, longest: 0, shifts: 0, calls: 0, recs: {}, byDept: {}, months: [], servers: [], recent: [] };
  const name = esc(user.roblox_name || user.name), maxD = Math.max(1, ...Object.values(S.byDept)), maxM = Math.max(1, ...S.months.map(m => m.ms)), mxI = S.months.findIndex(m => m.ms === maxM && m.ms > 0);
  const day = t => new Date(t).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }), tile = (v, l) => `<div class="cr-tile"><b>${v}</b><small>${l}</small></div>`;
  const body = S.shifts ? `<div class="cr-tiles">${tile(hrs(S.total), 'On duty, all time')}${tile(hrs(S.thisMonth), 'On duty this month')}${tile(S.calls, 'Calls responded')}${tile(S.recs.arrest || 0, 'Arrests')}${tile(S.recs.citation || 0, 'Citations')}${tile(dur(S.longest), 'Longest shift')}</div>
<div class="cr-grid"><section class="card"><h2>By department</h2><div class="cr-dept">${['pd', 'fd', 'dot'].map(d => `<div><div class="cr-dl"><b>${DEPT_LBL[d]}</b><span>${hrs(S.byDept[d] || 0)}</span></div><div class="cr-bar"><i style="width:${(S.byDept[d] || 0) / maxD * 100}%;background:${COL[d]}"></i></div></div>`).join('')}</div></section>
<section class="card"><h2>Hours on duty, last 6 months</h2><div class="cr-mo" role="img" aria-label="${esc(S.months.map(m => m.label + ' ' + hrs(m.ms)).join(', '))}">${S.months.map((m, i) => `<div${i === mxI ? ' class="mx"' : ''}><em>${hrs(m.ms)}</em><i style="height:${m.ms / maxM * 100}%"></i><small>${m.label}</small></div>`).join('')}</div></section></div>
<div class="cr-grid"><section class="card"><h2>Servers</h2>${S.servers.map(v => `<div class="cr-sv"><b>${esc(v.name)}</b><span>${hrs(v.ms)}</span><small>${day(v.last)}</small></div>`).join('')}</section>
<section class="card"><h2>Recent shifts</h2><table><thead><tr><th>Server</th><th>Team</th><th>Date</th><th>Length</th></tr></thead><tbody>${S.recent.map(r => `<tr><td>${esc(r.server)}</td><td><i class="dot" style="background:${COL[r.dept] || '#999'}"></i>${esc(r.team)}${r.live ? '<span class="live">On duty</span>' : ''}</td><td class="d">${day(r.start)}</td><td class="d">${dur(r.end - r.start)}</td></tr>`).join('')}</tbody></table></section></div>`
    : `<section class="card cr-empty"><p style="margin:0">No shifts yet. Go on duty on a police, fire or DOT team in a server that runs Oversite, and your time, calls and records start counting here.</p></section>`;
  return layout({ title: 'Your career · Oversite', logo, user, body: `<style>${PREM_CSS}${PH_CSS}${CR_CSS}</style><main class="cr">
<div class="row" style="margin:0 0 16px"><a class="btn sm" href="/account">&larr; Your account</a></div>
<div class="cr-top"><span class="pic">${name.slice(0, 1).toUpperCase()}${user.roblox_id ? `<img src="/rbx/avatar/${esc(user.roblox_id)}" alt="" onerror="this.remove()">` : ''}</span><div><h1><b>${name}</b>${user.verified ? vbadge(22) : ''}${prem ? pbadge(22) : ''}</h1><p>Your career across every Oversite server. Time counts while you&#39;re on a police, fire or DOT team in game.</p></div></div>
<div class="cr-wrap">${prem ? body : `<div class="cr-lock" aria-hidden="true">${body}</div><div class="cr-gate"><div>${pbadge(30)}<h2>Your career is part of Premium</h2><p>See your hours on duty, calls, arrests and citations across every server, month by month.</p><a class="ph-go" href="/account#premium">Get Premium</a></div></div>`}</div></main>` }); };
// the Premium banner on the account page: the pitch on the left; on the right Oversite's own shapes, outlined and glowing
// faintly: the tablet frame from the logo with the mark inside, wearing the gold check. Traced from the logo, not an icon set.
const OV_MARK = 'M326 102C255 78 175 100 138 160C95 225 100 320 170 380C230 430 330 415 380 350C425 290 395 215 330 197C305 190 280 189 256 191L312 250L256 310L190 242Z';
const OV_FRAME = 'M200 45H290L330 70H540L580 98H955L995 70H1240L1290 45H1336L1430 135V200L1396 236V790L1430 826V890L1340 978H1270L1240 952H995L955 924H580L540 952H300L200 978L108 890V826L142 790V236L108 200V135Z';
const PH_CSS = `.ph{position:relative;overflow:hidden;isolation:isolate;margin-bottom:18px;padding:44px 40px 40px;border-radius:18px;border:1px solid rgba(232,179,58,.18);
background:radial-gradient(70% 120% at 85% 50%,rgba(232,179,58,.13),transparent 60%),linear-gradient(115deg,#14100a 0%,#100d09 60%,#0f0d0a 100%)}
.ph-art{position:absolute;inset:0;z-index:-1;pointer-events:none}.ph-art svg{position:absolute;overflow:visible}
.ph-art .fr{right:-150px;top:176px;width:min(700px,66%);transform:translateY(-50%) rotate(-6deg)}
.ph-art .fr>path,.ph-art .fr>rect{fill:url(#phFill);stroke:rgba(232,179,58,.45);stroke-width:5;stroke-linejoin:round;filter:drop-shadow(0 0 18px rgba(232,179,58,.25))}
.ph-art .fr .smk{stroke-width:14}.ph-art .fr .sk{fill:rgba(232,179,58,.07);stroke:none;filter:none}
.ph-who{display:flex;align-items:center;gap:18px;height:130px;font-family:inherit;font-size:76px;font-weight:700;letter-spacing:-.02em;color:#F4F1EA;white-space:nowrap}.ph-who .vb{position:static;flex:none;margin:0;filter:drop-shadow(0 0 18px rgba(232,179,58,.45))}
.ph-art .fr .sc{fill:rgba(10,8,5,.6);stroke-width:3;stroke:rgba(232,179,58,.3)}.ph-art .fr .gp{stroke-width:3}

.ph-art:after{content:"";position:absolute;inset:0;background:linear-gradient(90deg,#120f0a 30%,rgba(18,15,10,.75) 55%,transparent 80%)}
.ph-k{display:inline-flex;align-items:center;gap:7px;font-size:11.5px;font-weight:600;letter-spacing:.12em;text-transform:uppercase;color:#E8B33A}
.ph h2{margin:0;font-size:clamp(28px,3.8vw,40px);line-height:1.1;font-weight:700;letter-spacing:-.03em;color:#F4F1EA;max-width:15ch}.ph h2 span{color:#F0BE4A}
.ph .ph-sub{margin:14px 0 0;max-width:44ch;color:#AFA899;font-size:14.5px;line-height:1.55}
.ph-buy{display:flex;flex-wrap:wrap;align-items:center;gap:12px;margin-top:24px}.ph .pm-bill{margin:0}.ph .pm-bill>span{display:none}.ph .pm-seg button[aria-pressed="true"]{background:#F4F1EA;color:#1E1503}
.ph-go{display:inline-flex;align-items:center;justify-content:center;padding:12px 24px;border-radius:999px;border:0;background:linear-gradient(180deg,#F3C556,#DEA126);color:#1E1503;font-family:inherit;font-weight:700;font-size:14px;line-height:1;cursor:pointer;box-shadow:0 8px 26px rgba(232,179,58,.3),inset 0 1px 0 rgba(255,255,255,.4);transition:transform .12s,box-shadow .2s}
.ph-go:hover{box-shadow:0 10px 32px rgba(232,179,58,.42),inset 0 1px 0 rgba(255,255,255,.4)}.ph-go:active{transform:scale(.98)}.ph-go:disabled{opacity:.5;cursor:default}
.ph-foot{display:flex;flex-wrap:wrap;align-items:center;gap:6px 14px;margin-top:14px;font-size:12.5px;color:#8E887C}
.ph-more{display:inline-flex;align-items:center;gap:6px;padding:0;border:0;background:none;color:#B9B2A4;font:inherit;font-size:12.5px;text-decoration:underline;text-underline-offset:3px;cursor:pointer}.ph-more:hover{color:#F4F1EA}
.ph-more svg{transition:transform .25s cubic-bezier(.2,.8,.2,1)}.ph-more[aria-expanded="true"] svg{transform:rotate(180deg)}
.ph-cmp{display:grid;grid-template-rows:0fr;transition:grid-template-rows .35s cubic-bezier(.2,.8,.2,1)}.ph-cmp.on{grid-template-rows:1fr}.ph-cmp>div{overflow:hidden;min-height:0}
.ph-cmpi{margin-top:22px;padding:6px 18px 8px;border-radius:14px;background:rgba(12,10,7,.9);border:1px solid rgba(255,255,255,.07);backdrop-filter:blur(8px)}
.cmp{width:100%;border-collapse:collapse;font-size:13.5px}.cmp th{padding:14px 10px 12px;font-size:12.5px;font-weight:600;color:#F4F1EA;text-align:center}.cmp th:first-child,.cmp td:first-child{text-align:left;padding-left:2px}
.cmp td{padding:11px 10px;border-top:1px solid rgba(255,255,255,.07);color:#B9B2A4;text-align:center}.cmp td:first-child{color:#D8D3C8}.cmp th.pr{color:#F0BE4A}
.cmp td.y{color:#46D07C}.cmp td.pr.y{color:#F0BE4A}.cmp td.n{color:#5E5A52}.cmp td.t{font-size:12.5px;color:#D8D3C8}.cmp td.pr.t{color:#F0BE4A}.cmp svg{display:inline-block;vertical-align:middle}
.cmp th:not(:first-child),.cmp td:not(:first-child){width:22%}
@media (max-width:560px){.ph-cmpi{padding:4px 10px 6px}.cmp{font-size:12.5px}.cmp td,.cmp th{padding:10px 6px}}.ph .msg{margin:0;color:inherit;font-size:inherit}
@media (max-width:760px){.ph{padding:30px 20px 26px}.ph-art .fr{width:420px;right:-190px;opacity:.6}.ph-art{display:none}.ph-art:after{background:linear-gradient(90deg,#120f0a 40%,rgba(18,15,10,.7) 75%,rgba(18,15,10,.35))}}`;
// the tablet's screen shows what Premium looks like: the small Oversite mark, then your own name with the gold check
const phArt = name => `<div class="ph-art" aria-hidden="true"><svg width="0" height="0"><defs><linearGradient id="phFill" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#2A1F0D"/><stop offset="1" stop-color="#130F08"/></linearGradient></defs></svg>
<svg class="fr" viewBox="0 0 1536 1024"><path d="${OV_FRAME}"/><rect class="gp" x="114" y="310" width="44" height="410" rx="20"/><rect class="gp" x="1378" y="310" width="44" height="410" rx="20"/><rect class="sc" x="222" y="150" width="1092" height="724" rx="10"/>
<path class="smk" d="${OV_MARK}" transform="translate(262 198) scale(.25)"/>
<foreignObject x="420" y="196" width="900" height="130"><div xmlns="http://www.w3.org/1999/xhtml" class="ph-who"><span>${name}</span>${pbadge(64)}</div></foreignObject>
<rect class="sk" x="270" y="360" width="760" height="30" rx="15"/><rect class="sk" x="270" y="430" width="600" height="30" rx="15"/><rect class="sk" x="270" y="500" width="680" height="30" rx="15"/><rect class="sk" x="270" y="610" width="420" height="160" rx="22"/><rect class="sk" x="730" y="610" width="420" height="160" rx="22"/></svg></div>`;
export const account = ({ logo, user, comms, discord, back, prem = { on: false }, payments = false, justBought = false, boostable = [] }) => layout({ title: 'Your account · Oversite', logo, user, body: `
<main class="acct">${back ? `<div class="row" style="margin:0 0 18px"><a class="btn sm" href="${esc(back)}">&larr; Back to the CAD</a></div>` : ''}
<div class="prof"><span class="pic">${esc((user.roblox_name || user.name || '?').slice(0, 1).toUpperCase())}${user.roblox_id ? `<img src="/rbx/avatar/${esc(user.roblox_id)}" alt="" onerror="this.remove()">` : ''}</span>
<div><h1><b>${esc(user.roblox_name || user.name)}</b>${user.verified ? vbadge(22) : ''}${(user.premium_until || 0) > Date.now() ? pbadge(22) : ''}</h1><p>${comms.length ? `Member of ${comms.length} server${comms.length === 1 ? '' : 's'}` : 'Not in any server yet'}${user.discord_id ? ' · Signs in with Discord' : ''}</p><div class="row" style="margin-top:10px"><a class="btn sm" href="/account/career">Your career</a></div></div></div>
${(() => { const day = t => new Date(t).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
  if (!prem.on) return `<section class="ph" id="premium"><style>${PREM_CSS}${PH_CSS}</style>${phArt(esc(user.roblox_name || 'Username'))}
<h2>Put the <span>gold check</span> next to your name.</h2>
<p class="ph-sub">Choose your pack and upgrade your account to Oversite Premium today!</p>
<div class="ph-buy"><div class="pm-bill"><span>Billing</span><div class="pm-seg" role="group" aria-label="Billing"><button type="button" data-plan="month" aria-pressed="false">Monthly, $4.99</button><button type="button" data-plan="year" aria-pressed="true">Yearly, $29.99</button></div></div><button class="ph-go" id="apBuy"${payments ? '' : ' disabled'}>Get Premium</button></div>
<div class="ph-foot"><p class="msg" id="apMsg">${payments ? 'Paid through Stripe. Cancel any time.' : 'Card payments aren&#39;t open yet.'}</p><button type="button" class="ph-more" aria-expanded="false" aria-controls="phCmp">What Premium adds<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m6 9 6 6 6-6"/></svg></button></div>
<div class="ph-cmp" id="phCmp"><div><div class="ph-cmpi">${compareTable()}</div></div></div></section>`;
  const status = prem.forever ? 'You have Premium, given by Oversite.' : prem.stripe ? (prem.cancelling ? `You have Premium until ${day(prem.until - 2 * 864e5)}. It won&#39;t renew.` : `You have Premium. It renews ${day(prem.until - 2 * 864e5)} at ${prem.plan === 'year' ? '$29.99 a year' : '$4.99 a month'}.`) : `You have Premium until ${day(prem.until)}.`;
  return `<section class="card" id="premium" style="margin-bottom:18px"><style>${PREM_CSS}</style><h2>Premium${pbadge(16)}</h2>${justBought ? '<p class="msg ok">Premium is on. Thanks for supporting Oversite.</p>' : ''}<p class="note">${status}</p>
${prem.billing ? '<div class="row"><button class="btn sm" id="apPortal">Manage billing</button></div>' : ''}
<div class="pm-sub"><h3>Boost a server</h3><p class="note">Your Premium can boost one server you own or co-own. Everyone on it gets Premium while yours lasts.</p>
${boostable.length ? boostable.map(b => `<div class="ap-b"><b>${esc(b.name)}</b><span>${b.mine ? 'Boosted by you' : b.premium ? 'Has Premium' : ''}</span>${b.mine ? `<button class="btn sm" data-unboost="${esc(b.slug)}">Remove boost</button>` : b.premium ? '' : `<button class="btn sm pri" data-boost="${esc(b.slug)}">Boost</button>`}</div>`).join('') : '<p class="note" style="margin:0">You don&#39;t own or co-own a server yet. Make one, or ask a server&#39;s owner to make you a co-owner, and you can boost it.</p>'}
<p class="msg" id="apMsg"></p></div></section>`; })()}
<div class="grid"><div>
${(() => { const row = c => { const owner = c.role === 'owner';
  return `<div class="srv"><span class="ic">${esc(c.name.slice(0, 1).toUpperCase())}<img src="/c/${esc(c.slug)}/icon" alt="" loading="lazy" onerror="this.remove()"></span><div class="tx"><b>${esc(c.name)}</b><small>${esc(RANK_LABEL[c.role] || c.role)}</small></div>
<div class="go">${runs(c.role) ? `<a class="btn ghost" href="/${esc(c.slug)}/settings">Server settings</a>` : ''}${owner ? '' : `<button class="btn ghost" data-leave="${esc(c.slug)}" data-name="${esc(c.name)}">Leave</button>`}${c.setup ? (runs(c.role) ? `<a class="btn pri discord" href="/c/${esc(c.slug)}/discord/connect?new=1">Connect Discord</a>` : '<span class="tag warn">Being set up</span>') : `<a class="btn pri" href="/${esc(c.slug)}">Open CAD</a>`}</div></div>`; };
  const mine = comms.filter(c => c.role === 'owner'), joined = comms.filter(c => c.role !== 'owner');
  return `<section class="card"><h2>Your servers</h2>${mine.length ? mine.map(row).join('') : '<p class="note">You don\'t own a server yet.</p>'}
<details class="mk"${mine.length ? '' : ' open'}><summary>Make a new server</summary><p class="note">One per ER:LC server. Members join with its invite code.</p>
<form id="create" autocomplete="off"><label for="cname">Server name</label><input id="cname" maxlength="48" placeholder="Liberty County Roleplay" required>
<label for="cslug">Address</label><input id="cslug" maxlength="32" pattern="[a-z0-9-]{3,32}" placeholder="liberty-county" required><p class="hint">oversitescad.com/<span id="slugp">liberty-county</span></p>
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
<section class="card" id="license"><h2>Your license</h2>${user.roblox_id ? `<p class="note">The Liberty County driver's license the MDT's card reader shows when you sign in. Your photo, username and display name come from Roblox; copy the rest from your license in ER:LC.</p>
<div class="licw" id="licw"></div>
<form id="licf" class="licf" autocomplete="off">
<label>Age<input id="lAge" list="lAges" maxlength="16" placeholder="Young Adult"></label><datalist id="lAges"><option>Young Adult</option><option>Adult</option><option>Middle Aged</option><option>Senior</option></datalist>
<label>Gender<select id="lGndr"><option value="">–</option><option>M</option><option>F</option><option>O</option></select></label>
<label>Hair<select id="lHair"><option value="">–</option><option value="BLK">Black</option><option value="BRN">Brown</option><option value="BLN">Blond</option><option value="RED">Red</option><option value="GRY">Grey</option><option value="WHT">White</option><option value="BLD">Bald</option></select></label>
<label>Eyes<select id="lEyes"><option value="">–</option><option value="BRN">Brown</option><option value="BLU">Blue</option><option value="GRN">Green</option><option value="HZL">Hazel</option><option value="GRY">Grey</option><option value="BLK">Black</option></select></label>
<label>Height<span class="lh"><select id="lFt" aria-label="Feet"><option value="">ft</option>${[3, 4, 5, 6, 7, 8].map(n => `<option value="${n}">${n} ft</option>`).join('')}</select><select id="lIn" aria-label="Inches"><option value="">in</option>${Array.from({ length: 12 }, (_, n) => `<option value="${n}">${n} in</option>`).join('')}</select></span></label>
<label>Weight (lbs)<input id="lWgt" type="number" min="50" max="600" step="1" placeholder="150"></label>
<label class="wide">Address<input id="lAddr" maxlength="34" placeholder="N/A"></label>
<label>Issued<input id="lIss" type="date"></label>
<fieldset class="wide lprem" id="lPrem"><legend>${pbadge(13)} Premium</legend><label>Finish<select id="lFin"><option value="">Standard</option><option value="gold">Gold</option><option value="holo">Holographic</option><option value="obsidian">Obsidian</option></select></label><label>Occupation<input id="lOcc" maxlength="20" placeholder="Your team in game"></label><label class="wide">Signature<input id="lSig" maxlength="24" placeholder="Your display name"></label><p class="hint wide" id="lPremNote"></p></fieldset>
<div class="row wide"><button class="btn pri">Save license</button><span class="msg" id="licmsg"></span></div></form>` : '<p class="note">Link your Roblox account first. Your license uses your Roblox photo and username.</p>'}</section>
<section class="card" id="mdtset"><h2 class="hrow">Your MDT<span class="ms-pb">${pbadge(14)} Premium</span></h2><p class="note">How the MDT looks and sounds for you, on every server and every device you sign in on.</p>
<div class="ms-prev" aria-hidden="true"><div class="ms-tab" id="msTab"><div class="ms-scr" id="msScr"><div class="ms-side"><i class="on"></i><i></i><i></i><i></i><b>Panic</b></div><div class="ms-main"><h4>FD 4120</h4><p></p><p class="s"></p><div class="ms-st"><em class="on">10-8</em><em>10-76</em><em>10-23</em><em>10-19</em></div></div></div></div></div>
<form id="msf" class="licf" autocomplete="off"><fieldset class="wide ms-fs" id="msFs">
<label class="wide">Call alert<span class="ms-pl"><select id="msCall"></select><button type="button" class="btn sm ms-play" data-play="call" aria-label="Play the call alert"><svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M7 4.5v15l13-7.5z"/></svg></button></span></label>
<label class="wide">Panic alarm<span class="ms-pl"><select id="msPanic"></select><button type="button" class="btn sm ms-play" data-play="panic" aria-label="Play the panic alarm"><svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M7 4.5v15l13-7.5z"/></svg></button></span></label>
<label class="wide">Alert volume<span class="ms-vol"><input type="range" id="msVol" min="0" max="100" step="5"><output id="msVolO">90%</output></span></label>
<div class="wide ms-g"><span>Accent</span><div class="ms-sw" id="msAcc" role="radiogroup" aria-label="Accent"></div></div>
<div class="wide ms-g"><span>Wallpaper</span><div class="ms-sw ms-wl" id="msWall" role="radiogroup" aria-label="Wallpaper"></div></div>
<div class="wide ms-g"><span>Tablet</span><div class="ms-sw" id="msFrame" role="radiogroup" aria-label="Tablet colour"></div></div>
<label class="wide">Map<select id="msMap"><option value="">The one I picked last on each device</option><option value="3d-light">3D</option><option value="3d-dark">3D Dark</option><option value="2d-light">2D</option><option value="2d-dark">2D Dark</option></select></label>
</fieldset><p class="hint wide" id="msNote"></p>
<div class="row wide"><button class="btn pri" id="msSave">Save MDT</button><button type="button" class="btn" id="msReset">Defaults</button><span class="msg" id="msMsg"></span></div></form></section>
<section class="card"><h2>Sign out</h2><p class="note">Signs you out on this device. You'll need your sign-in again to get back in.</p><form method="post" action="/auth/logout" style="margin:0"><button class="btn danger">Sign out</button></form></section>
</div></div></main><script src="/license-card.js?v=4"></script><script src="/mdt-setup.js?v=1"></script>
<style>.licw{position:relative;width:100%;max-width:400px;aspect-ratio:400/250;margin:6px 0 14px}.licw .lcard{position:absolute;left:0;top:0;transform-origin:0 0;transform:scale(var(--ls,1))}
.licf{display:grid;grid-template-columns:1fr 1fr;gap:10px 12px}.licf label{display:flex;flex-direction:column;gap:4px;font-size:12px;color:var(--dim);min-width:0}.licf .wide{grid-column:1/-1}
.ap-b{display:flex;align-items:center;gap:10px;padding:9px 0;border-top:1px solid var(--hair)}.ap-b:first-of-type{border-top:0}.ap-b b{flex:1;min-width:0;font-weight:600;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.ap-b span{font-size:12px;color:var(--faint)}.licf input,.licf select{width:100%;min-width:0}.lprem{display:grid;grid-template-columns:1fr 1fr;gap:10px 12px;margin:4px 0 0;padding:12px 12px 4px;border:1px solid rgba(232,179,58,.25);border-radius:12px}.lprem legend{display:flex;align-items:center;gap:6px;padding:0 6px;font-size:12px;font-weight:600;color:#E8B33A}.lprem legend .vb{margin:0}.lprem .hint{margin:0 0 6px}.lprem.off{opacity:.55}.licf .lh{display:grid;grid-template-columns:1fr 1fr;gap:6px}.licf .row{align-items:center;gap:12px}
.ms-pb{display:inline-flex;align-items:center;gap:5px;font-size:12px;font-weight:600;color:#E8B33A}.ms-pb .vb{margin:0}
.ms-fs{display:contents;border:0;margin:0;padding:0}.ms-fs[disabled] ~ .row .btn{opacity:.5}
.ms-pl,.ms-vol{display:flex;gap:6px;align-items:center}.ms-pl select{flex:1}.ms-play{flex:none;width:40px;padding:0;justify-content:center;align-self:stretch}
.ms-vol input{flex:1;accent-color:#E8B33A}.ms-vol output{width:40px;text-align:right;color:var(--ink);font-variant-numeric:tabular-nums}
.ms-g{display:flex;flex-direction:column;gap:6px;font-size:12px;color:var(--dim)}.ms-sw{display:flex;flex-wrap:wrap;gap:8px}
.ms-sw button{position:relative;display:flex;flex-direction:column;align-items:center;gap:5px;padding:0;border:0;background:none;color:var(--dim);font:inherit;font-size:11.5px;cursor:pointer}
.ms-sw button i{display:block;width:30px;height:30px;border-radius:50%;background:var(--c);box-shadow:0 0 0 1px rgba(255,255,255,.14) inset;transition:box-shadow .15s}
.ms-sw.ms-wl{display:grid;grid-template-columns:repeat(5,minmax(0,1fr))}.ms-sw.ms-wl button i{width:100%;height:36px;border-radius:8px;background-color:#0C0D0F}
.ms-sw button[aria-checked="true"]{color:var(--ink)}.ms-sw button[aria-checked="true"] i{box-shadow:0 0 0 2px var(--bg,#0B0B0C),0 0 0 4px #E8B33A}
.ms-sw button:focus-visible{outline:none}.ms-sw button:focus-visible i{box-shadow:0 0 0 2px var(--bg,#0B0B0C),0 0 0 4px #4C8DFF}.ms-sw button:disabled{cursor:default}
.ms-prev{max-width:400px;margin:6px 0 16px}.ms-tab{border-radius:20px;padding:8px;background:#1B1C1F;box-shadow:0 18px 40px rgba(0,0,0,.45),0 0 0 1px rgba(255,255,255,.07) inset,0 0 0 3px #121316 inset;aspect-ratio:16/10}
.ms-scr{--fd:#E0453B;--fd-soft:rgba(224,69,59,.14);height:100%;border-radius:13px;overflow:hidden;background:#0C0D0F;display:flex}
.ms-side{width:26%;display:flex;flex-direction:column;gap:6px;padding:12px 8px;border-right:1px solid rgba(255,255,255,.08)}.ms-side i{height:12px;border-radius:5px;background:rgba(255,255,255,.06)}.ms-side i.on{background:rgba(255,255,255,.14)}
.ms-side b{margin-top:auto;height:20px;border-radius:6px;border:1.5px solid #E0453B;color:#FF8A82;font-size:9px;letter-spacing:.06em;text-transform:uppercase;display:flex;align-items:center;justify-content:center}
.ms-main{flex:1;padding:14px}.ms-main h4{margin:0 0 8px;font-size:15px;color:#E9EAEC}.ms-main p{height:8px;width:60%;margin:0 0 6px;border-radius:4px;background:rgba(255,255,255,.08)}.ms-main p.s{width:38%}
.ms-st{display:grid;grid-template-columns:repeat(4,1fr);gap:6px;margin-top:14px}.ms-st em{font-style:normal;font-size:10.5px;font-weight:600;color:#C9CBD0;text-align:center;padding:9px 0;border-radius:7px;background:rgba(255,255,255,.05);border:1px solid rgba(255,255,255,.07)}
.ms-st em.on{color:#fff;background:var(--fd-soft);border-color:var(--fd)}
#mdtset.off .ms-prev,#mdtset.off .licf{opacity:.55}</style>`, script: `
/* Premium for your account: buy, manage billing, boost a server */
{const pm=document.getElementById('premium'),M=document.getElementById('apMsg');if(pm){let plan='year';pm.querySelectorAll('[data-plan]').forEach(b=>b.onclick=()=>{plan=b.dataset.plan;pm.querySelectorAll('[data-plan]').forEach(x=>x.setAttribute('aria-pressed',x===b))});
  const go=async(url,body,btn)=>{if(btn)btn.disabled=true;try{const j=await api(url,body||{});if(j.url){location.href=j.url;return}location.hash='premium';location.reload()}catch(e){if(btn)btn.disabled=false;say(M,e.message)}};
  const buy=document.getElementById('apBuy');if(buy)buy.onclick=()=>go('/api/me/premium/checkout',{plan},buy);
  const more=pm.querySelector('.ph-more'),cmp=document.getElementById('phCmp');if(more&&cmp)more.onclick=()=>{const on=!cmp.classList.contains('on');cmp.classList.toggle('on',on);more.setAttribute('aria-expanded',on)};
  const por=document.getElementById('apPortal');if(por)por.onclick=()=>go('/api/me/premium/portal',{},por);
  pm.addEventListener('click',e=>{const b=e.target.closest('[data-boost],[data-unboost]');if(!b)return;const slug=b.dataset.boost||b.dataset.unboost;go('/c/'+slug+'/api/premium/'+(b.dataset.boost?'boost-server':'unboost-server'),{},b)})}}
(()=>{const w=document.getElementById('licw');if(!w||!window.LicenseCard)return;const $=id=>document.getElementById(id);let L={};
const fit=()=>{const c=w.querySelector('.lcard');if(c)c.style.setProperty('--ls',(w.clientWidth/400).toFixed(4))};new ResizeObserver(fit).observe(w);
const vals=()=>({age:$('lAge').value.trim(),gndr:$('lGndr').value,hair:$('lHair').value,eyes:$('lEyes').value,ft:$('lFt').value,in:$('lIn').value,wgt:$('lWgt').value,addr:$('lAddr').value.trim(),iss:$('lIss').value,finish:$('lFin').value,occx:$('lOcc').value.trim(),sig:$('lSig').value.trim()});
const draw=()=>{const v=vals(),h=v.ft!==''&&v.in!==''?v.ft+"' "+v.in+'"':'';w.innerHTML=LicenseCard.html({...L,age:v.age,gndr:v.gndr,hair:v.hair,eyes:v.eyes,hgt:h,wgt:v.wgt?Math.round(v.wgt)+' lbs':'',addr:v.addr,iss:v.iss,finish:L.premium?v.finish:'',sig:L.premium?v.sig:'',occ:(L.premium&&v.occx)||L.occ||'Firefighter'});fit()};
const fill=j=>{L=j;$('lAge').value=j.age||'';$('lGndr').value=j.gndr||'';$('lHair').value=j.hair||'';$('lEyes').value=j.eyes||'';const m=/^(\\d)' (\\d+)"$/.exec(j.hgt||'');$('lFt').value=m?m[1]:'';$('lIn').value=m?m[2]:'';$('lWgt').value=parseInt(j.wgt)||'';$('lAddr').value=j.addr||'';$('lIss').value=j.iss||'';$('lFin').value=j.finish||'';$('lOcc').value=j.occx||'';$('lSig').value=j.sig||'';const P=$('lPrem');P.classList.toggle('off',!j.premium);P.querySelectorAll('input,select').forEach(x=>x.disabled=!j.premium);$('lPremNote').innerHTML=j.premium?'Shows in the MDT card reader on every server.':'Gold, holographic and obsidian cards, your own occupation and signature come with <a href="/account#premium">Premium</a>.';draw()};
fetch('/api/me/license',{cache:'no-store'}).then(r=>r.json()).then(fill).catch(()=>draw());
$('licf').addEventListener('input',draw);$('licf').addEventListener('change',draw);
$('licf').addEventListener('submit',async e=>{e.preventDefault();const m=$('licmsg');try{fill(await api('/api/me/license',vals()));say(m,'License saved.',true)}catch(x){say(m,x.message)}});
if(location.hash==='#license')setTimeout(()=>$('license').scrollIntoView({block:'start'}),50)})();
/* your own MDT setup (Premium): pick, preview, play and save */
(()=>{const box=document.getElementById('mdtset');if(!box||!window.MdtLook||!window.MdtSounds)return;const $=id=>document.getElementById(id),K=MdtLook.NAMES;let S={},D={},prem=false;
const opts=(el,o)=>{el.innerHTML=Object.entries(o).map(([v,n])=>'<option value="'+v+'">'+n+'</option>').join('')};opts($('msCall'),MdtSounds.CALL);opts($('msPanic'),MdtSounds.PANIC);
const sw=(el,key,bg)=>{el.innerHTML=Object.entries(K[key]).map(([v,n])=>'<button type="button" role="radio" data-k="'+key+'" data-v="'+v+'" style="--c:'+bg(v)+'"><i></i>'+n+'</button>').join('')};
sw($('msAcc'),'accent',v=>MdtLook.ACC[v]||'conic-gradient(#4C8DFF 0 33%,#E0453B 0 66%,#E9C24C 0)');sw($('msWall'),'wall',v=>MdtLook.WALL[v]||'#0C0D0F');
sw($('msFrame'),'frame',v=>({graphite:'#2A2B2F'})[v]||(MdtLook.FRAME[v]||[])[0]);
let st=document.createElement('style');document.head.appendChild(st);
const draw=()=>{st.textContent=MdtLook.css(S,'#msScr','#msTab');$('msWall').style.setProperty('--fd',MdtLook.ACC[S.accent]||'#E0453B');box.querySelectorAll('.ms-sw button').forEach(b=>{const on=S[b.dataset.k]===b.dataset.v;b.setAttribute('aria-checked',on);b.tabIndex=on?0:-1});$('msVolO').textContent=S.vol+'%'};
const fill=j=>{prem=j.premium;D=j.defaults||D;S={...j.setup};$('msCall').value=S.call;$('msPanic').value=S.panic;$('msVol').value=S.vol;$('msMap').value=S.map||'';$('msFs').disabled=!prem;$('msSave').disabled=!prem;$('msReset').disabled=!prem;box.classList.toggle('off',!prem);box.querySelectorAll('.ms-sw button').forEach(b=>b.disabled=!prem);
  $('msNote').innerHTML=prem?'Saved to your account. The MDT picks it up next time you open a CAD. Switching the map in the CAD saves it here too.':'Your own alert sounds, MDT colours and map style come with <a href="/account#premium">Premium</a>.';draw()};
box.addEventListener('click',e=>{const b=e.target.closest('.ms-sw button');if(b&&prem){S[b.dataset.k]=b.dataset.v;draw()}const p=e.target.closest('[data-play]');if(p){const v=+$('msVol').value;p.dataset.play==='call'?MdtSounds.call($('msCall').value,2,v):MdtSounds.panic($('msPanic').value,v)}});
box.addEventListener('keydown',e=>{const b=e.target.closest('.ms-sw button');if(!b||!/^Arrow(Left|Right|Up|Down)$/.test(e.key))return;e.preventDefault();const all=[...b.parentElement.children],i=all.indexOf(b),n=all[(i+(/Right|Down/.test(e.key)?1:all.length-1))%all.length];n.focus();n.click()});
$('msf').addEventListener('input',e=>{if(e.target.id==='msVol'){S.vol=+e.target.value;draw()}});
$('msf').addEventListener('change',e=>{S.call=$('msCall').value;S.panic=$('msPanic').value;S.map=$('msMap').value;draw()});
$('msReset').onclick=()=>{fill({premium:prem,defaults:D,setup:{...D}})};
$('msf').addEventListener('submit',async e=>{e.preventDefault();const m=$('msMsg');try{fill({premium:true,defaults:D,...await api('/api/me/mdt',S)});say(m,'Saved.',true)}catch(x){say(m,x.message)}});
fetch('/api/me/mdt',{cache:'no-store'}).then(r=>r.json()).then(fill).catch(()=>{});
if(location.hash==='#mdtset')setTimeout(()=>box.scrollIntoView({block:'start'}),50)})();
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
export const explore = ({ logo, user, servers, owned, prem = false }) => layout({ title: 'Explore servers · Oversite CAD', logo, user, body: `
<main class="xp"><div class="xp-head"><div><h1><span style="font-weight:400">Explore</span> <b>servers</b></h1><p class="lead">ER:LC servers running Oversite CAD. Vote for your favourites, jump in game, or join their Discord.</p></div>
<div class="xp-tools"><label class="xp-search"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></svg><input id="xq" placeholder="Search servers" autocomplete="off" spellcheck="false" aria-label="Search servers"></label>
</div></div>
${prem ? '' : `<style>${PH_CSS}.xpp{position:relative;overflow:hidden;isolation:isolate;display:flex;align-items:center;gap:24px;min-height:150px;margin:0 0 20px;padding:26px 30px;border-radius:18px;border:1px solid rgba(232,179,58,.2);
background:radial-gradient(60% 140% at 88% 50%,rgba(232,179,58,.14),transparent 60%),linear-gradient(110deg,#15110a,#100d09 60%,#0f0d0a)}
.xpp .ph-art .fr{right:-110px;top:78%;width:470px}.xpp .ph-art:after{background:linear-gradient(90deg,#120f0a 38%,rgba(18,15,10,.7) 62%,transparent 85%)}
.xpp-t{flex:1;min-width:0;max-width:560px}.xpp h2{margin:0;font-size:24px;line-height:1.2;font-weight:700;letter-spacing:-.02em;color:#F4F1EA}.xpp h2 span{color:#F0BE4A}
.xpp p{margin:8px 0 0;font-size:14px;line-height:1.5;color:#AFA899}.xpp-b{display:flex;align-items:center;gap:14px;margin-top:16px}
.xpp .ph-go{text-decoration:none}.xpp-b small{font-size:12.5px;color:#8E887C}
@media (max-width:760px){.xpp{padding:22px 20px;min-height:0}.xpp h2{font-size:21px}}</style>
<aside class="xpp" aria-label="Oversite Premium">${phArt(esc(user?.roblox_name || 'Username'))}<div class="xpp-t"><h2>Put the <span>gold check</span> next to your name.</h2><p>Choose your pack and upgrade to Oversite Premium. Boost a server you own, and everyone on it gets every Premium feature.</p>
<div class="xpp-b"><a class="ph-go" href="${user ? '/account#premium' : '/premium'}">Get Premium</a><small>From $4.99 a month</small></div></div></aside>`}
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

const ME=${user ? 1 : 0};let S=${JSON.stringify(servers).replace(/</g, '\\u003c')};const OWNED=${JSON.stringify(owned).replace(/</g, '\\u003c')};let TAB='trending',TOPI=0;
// ER:LC's own join links open Roblox straight into a private server by its code
const JOIN=c=>'https://erlc.gg/join/'+encodeURIComponent(c);
const g=document.getElementById('xg'),q=document.getElementById('xq'),em=document.getElementById('xe'),dlg=document.getElementById('xd'),tabs=document.getElementById('xt');
const e=t=>String(t??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const n=v=>Number(v||0).toLocaleString();
const DC='<svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M19.6 5.4A17 17 0 0 0 15.4 4l-.5 1a15.6 15.6 0 0 0-5.8 0L8.6 4a17 17 0 0 0-4.2 1.4C1.8 9.4 1 13.3 1.4 17.1A17 17 0 0 0 6.6 20l1.1-1.8c-.6-.2-1.2-.5-1.7-.9l.4-.3a12.2 12.2 0 0 0 11.2 0l.4.3c-.5.4-1.1.7-1.7.9l1.1 1.8a17 17 0 0 0 5.2-2.9c.5-4.4-.8-8.3-2.9-11.7zM8.7 14.8c-1 0-1.9-1-1.9-2.1s.8-2.1 1.9-2.1 1.9 1 1.9 2.1-.8 2.1-1.9 2.1zm6.6 0c-1 0-1.9-1-1.9-2.1s.8-2.1 1.9-2.1 1.9 1 1.9 2.1-.8 2.1-1.9 2.1z"/></svg>';
const STAR='<svg width="17" height="17" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="m12 2.8 2.9 5.9 6.5.9-4.7 4.6 1.1 6.4L12 17.5l-5.8 3.1 1.1-6.4L2.6 9.6l6.5-.9z"/></svg>';
const PLAY='<svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M7 4.5v15l12.5-7.5z"/></svg>';
const PPL='<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><circle cx="9" cy="8" r="3.5"/><path d="M2.5 20c.8-3.5 3.4-5.5 6.5-5.5s5.7 2 6.5 5.5"/><path d="M16 4.6a3.5 3.5 0 0 1 0 6.8M18.5 14.8c1.6.8 2.6 2.6 3 5.2"/></svg>';
const STO='<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round" aria-hidden="true"><path d="m12 3 2.8 5.7 6.2.9-4.5 4.4 1.1 6.2L12 17.3 6.4 20.2l1.1-6.2L3 9.6l6.2-.9z"/></svg>';
const VB=${JSON.stringify(vbadge(16))},VBS=${JSON.stringify(vbadge(13))},PB=${JSON.stringify(pbadge(16))},PBS=${JSON.stringify(pbadge(13))};
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
const by=x=>x.owner_name?'<span class="by">by '+e(x.owner_name)+(x.owner_badge?VBS:'')+(x.owner_prem?PBS:'')+'</span>':'';
const voteBtn=x=>x.next_vote>0?'<button class="xb ghost voted" data-vote="'+e(x.slug)+'" title="You can vote again in '+hrs(x.next_vote)+'">'+STAR+'Voted · '+hrs(x.next_vote)+'</button>'
  :'<button class="xb ghost" data-vote="'+e(x.slug)+'">'+STO+'Vote'+(x.votes?' <small>'+n(x.votes)+'</small>':'')+'</button>';
const acts=x=>(x.join_key?'<a class="xb pri" href="'+e(JOIN(x.join_key))+'" target="_blank" rel="noopener" data-play="'+e(x.join_key)+'" title="Join '+e(x.name)+' in ER:LC">'+PLAY+'Join</a>':'')+(x.role?'<a class="xb" href="/'+e(x.slug)+'" title="Open the CAD for '+e(x.name)+'">'+CADI+'Open CAD</a>':x.open_join?'<button class="xb" data-joincad="'+e(x.slug)+'" title="Join this server on Oversite">'+CADI+'Join CAD</button>':'')+voteBtn(x)
  +(x.invite?'<a class="xb ghost" href="'+e(x.invite)+'" target="_blank" rel="noopener" title="Join their Discord">'+DC+'Discord</a>':'');
const pct=x=>x.live&&x.max?Math.min(100,Math.round(x.players/x.max*100)):0;
const card=(x,i)=>'<article class="xr st-'+state(x)+(i===TOPI?' is-top':'')+(x.featured?' is-ft':'')+'" tabindex="0" data-slug="'+e(x.slug)+'"'+(x.role?' data-mine="1"':'')+' aria-label="'+e(x.name)+'">'
  +'<div class="xr-map'+(x.photos&&x.photos.length?' ph':'')+'" style="--pos:'+spot(x)+(x.photos&&x.photos.length?';background-image:url(/c/'+e(x.slug)+'/photos/'+x.photos[0]+')'+(x.ppos&&x.ppos[0]?';background-position:'+(+x.ppos[0][0])+'% '+(+x.ppos[0][1])+'%':''):'')+'"><div class="xr-mt">'+status(x)+(x.featured?'<span class="xr-badge ft" title="Ad">Featured</span>':'')+(i===TOPI?'<span class="xr-badge">'+(TAB==='new'?'Newest':TAB==='voted'?'Most voted':TAB==='popular'?'Most popular':'Most active')+'</span>':i<3?'<span class="xr-rank">#'+(i+1)+'</span>':'')+'</div>'
  +(x.join_key?'<button type="button" class="xr-code" data-copycode="'+e(x.join_key)+'" title="Copy the join code"><small>Code</small>'+e(x.join_key)+'</button>':'')+'<div class="xr-bar"><i style="width:'+pct(x)+'%"></i></div></div>'
  +'<div class="xr-b"><div class="xr-h">'+ic(x)+'<div class="xr-n"><h3>'+e(x.name)+(x.badge?VB:'')+(x.premium?PB:'')+'</h3>'+by(x)+'</div>'+'</div>'
  +'<div class="xr-m">'+meta(x)+'</div><p class="'+(x.bio?'':'none')+'">'+e(x.bio||'No description yet.')+'</p>'
  +'<div class="xr-f"><div class="xr-a">'+acts(x)+'</div></div></div></article>';
const row=card;
const render=()=>{ const t=q.value.trim().toLowerCase(), k=SORT[TAB];
  const L=S.filter(x=>!t||[x.name,x.bio,x.owner_name,x.ingame,x.discord,x.region&&x.region.name,x.lang&&x.lang.name,...x.depts.map(d=>d.name+' '+d.short)].join(' ').toLowerCase().includes(t))
    .filter(x=>TAB!=='active'||(x.live&&x.players!=null))
    .sort((a,b)=>(TAB==='trending'&&!t?(b.featured?1:0)-(a.featured?1:0):0)||k(b)-k(a)||b.votes-a.votes||a.name.localeCompare(b.name));   // boosted servers lead Trending
  TOPI=L.findIndex(x=>!(TAB==='trending'&&!t&&x.featured));
  g.innerHTML=L.map(row).join(''); em.hidden=!!L.length;
  if(!L.length) em.innerHTML=TAB==='active'&&!t?'<b>No servers are online right now.</b><p>Servers show up here while they are running. Check Trending in the meantime.</p>':S.length?'<b>No servers match that.</b><p>Try a different search.</p>'
    :'<b>No servers are listed yet.</b><p>Owners can add theirs in their server\\'s Settings, under Server profile.</p>'+(OWNED.length?'<a class="btn pri" href="/'+e(OWNED[0])+'/settings#profile">List your server</a>':''); };
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
  document.getElementById('xdB').innerHTML='<button class="xp-x" type="button" aria-label="Close" data-close>&times;</button><div class="xd-top">'+ic(x)+'<div><h2 id="xdT">'+e(x.name)+(x.badge?VB:'')+(x.premium?PB:'')+'</h2>'+by(x)+'<div class="xr-m">'+meta(x)+'</div></div></div>'
    +'<div class="xr-t">'+status(x)+'</div>'+(x.bio?'<p class="xd-bio">'+e(x.bio)+'</p>':'')
    +'<div class="xd-facts">'+fact('In-game name',e(x.ingame))+fact('Join code',x.join_key?'<code>'+e(x.join_key)+'</code>':'')+fact('Co-owners',x.co_owners.map((n,i)=>'<span class="sv-co">'+e(n)+(x.co_badge&&x.co_badge[i]?VBS:'')+'</span>').join(', '))+fact('Account verification',e(x.verified||''))
    +fact('Team balance',x.team_balance?'On':'Off')+fact('Departments',e(x.depts.map(d=>d.name).join(', ')))+fact('Discord server',e([x.discord,x.dc_members!=null?n(x.dc_members)+' members':'',x.dc_online!=null?n(x.dc_online)+' online':''].filter(Boolean).join(' · ')))+'</div><div class="xr-a">'+acts(x)+'</div>'+(x.role==='owner'?'':'<button type="button" class="xd-rep" data-report="'+e(x.slug)+'">Report this server</button>');
  dlg.showModal(); requestAnimationFrame(()=>dlg.classList.add('in')); };
document.addEventListener('click',async ev=>{
  if(!ME&&ev.target.closest('[data-vote],[data-report],[data-joincad]')){ ev.preventDefault(); ev.stopPropagation(); location.href='/?next=/explore'; return; }
  const v=ev.target.closest('[data-vote]'); if(v){ ev.preventDefault(); ev.stopPropagation(); const x=S.find(s=>s.slug===v.dataset.vote); if(!x) return;
    if(x.next_vote>0) return toast('You can vote for '+x.name+' again in '+hrs(x.next_vote)+'.');
    v.disabled=true; try{ const j=await api('/api/explore/vote',{slug:x.slug}); x.votes=j.votes; x.next_vote=j.next_vote; x.week++; toast('Thanks for voting for '+x.name+'!'); }catch(err){ toast(err.message); } render(); if(dlg.open) open(x.slug); return; }
  const rp=ev.target.closest('[data-report]'); if(rp){ const x=S.find(s=>s.slug===rp.dataset.report); if(x){ dlg.close(); report(x); } return; }
  const jc=ev.target.closest('[data-joincad]'); if(jc){ ev.preventDefault(); ev.stopPropagation(); jc.disabled=true; try{ const j=await api('/api/explore/join',{slug:jc.dataset.joincad}); location.href=j.next; }catch(err){ toast(err.message); jc.disabled=false; } return; }
  const cc=ev.target.closest('[data-copycode]'); if(cc){ ev.preventDefault(); ev.stopPropagation(); const k=cc.dataset.copycode; navigator.clipboard?.writeText(k).then(()=>toast('Join code '+k+' copied.'),()=>toast('Join code: '+k)); return; }
  const pl=ev.target.closest('[data-play]'); if(pl){ navigator.clipboard?.writeText(pl.dataset.play).catch(()=>{}); toast('Opening ER:LC and joining '+pl.dataset.play+'. If Roblox does not start, the code is copied: paste it in Servers.'); return; }
  if(ev.target.closest('a,button')) return; const c=ev.target.closest('.xr'); if(c&&g.contains(c)) location.href='/'+encodeURIComponent(c.dataset.slug)+(c.dataset.mine?'/about':''); });
g.addEventListener('keydown',ev=>{ if((ev.key==='Enter'||ev.key===' ')&&ev.target.classList.contains('xr')){ ev.preventDefault(); location.href='/'+encodeURIComponent(ev.target.dataset.slug)+(ev.target.dataset.mine?'/about':''); } });
dlg.addEventListener('click',ev=>{ if(ev.target===dlg||ev.target.closest('[data-close]')) dlg.close(); }); dlg.addEventListener('close',()=>dlg.classList.remove('in'));
q.addEventListener('input',render); render();
setInterval(async()=>{ if(document.hidden||dlg.open) return; try{ const r=await fetch('/api/explore'); if(r.ok){ S=(await r.json()).servers; render(); } }catch(x){} },60000);   // live player counts
` });

const COL = { pd: '#4C8DFF', fd: '#E24B4B', dot: '#E9C24C' };
// what each plan gets; the Premium page and the Settings card both read these
// Free vs Premium, row by row: true is a check, false a cross, text says how much
export const COMPARE = [['Dispatch live map, calls and units', true, true], ['Fire, Police and DOT MDTs', true, true], ['Panic button', true, true],
  ['Police lookup, tickets, warnings and BOLOs', true, true], ['Police records', 'Last 30 days', 'Kept forever'], ['Jurisdiction boundaries', true, true], ['Discord role linking', true, true],
  ['Explore listing, vote link and reviews', true, true], ['Proximity chat', false, true], ['Server Staff CAD', false, true], ['Automatic plate and warrant checks', false, true],
  ['Your logo on the CAD and MDT', false, true], ['Custom license card', false, true], ['Your own MDT sign-in ranks', false, true], ['Explore ads', false, '3 a month'],
  ['Priority support and feature requests', false, true], ['Gold check next to your name', false, true]];
const CMP_YES = '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round" aria-label="Included"><path d="m5 12.5 4.5 4.5L19 7.5"/></svg>', CMP_NO = '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" aria-label="Not included"><path d="M6 6l12 12M18 6 6 18"/></svg>';
const cmpCell = v => v === true ? `<td class="y">${CMP_YES}</td>` : v === false ? `<td class="n">${CMP_NO}</td>` : `<td class="t">${esc(v)}</td>`;
export const compareTable = () => `<table class="cmp"><thead><tr><th>Feature</th><th>Free</th><th class="pr">Premium</th></tr></thead><tbody>${COMPARE.map(([f, a, b]) => `<tr><td>${esc(f)}</td>${cmpCell(a)}${cmpCell(b).replace('<td class="', '<td class="pr ')}</tr>`).join('')}</tbody></table>`;
export const FREE_FEATURES = ['Dispatch live map, calls and units', 'Fire, Police and DOT MDTs', 'Panic button', 'Police lookup, tickets, warnings and BOLOs', 'Police records from the last 30 days', 'Discord role linking', 'Explore listing, vote link and reviews'];
export const PREMIUM_FEATURES = ['Proximity chat', 'Server Staff CAD', 'Custom license card', '3 Explore ads a month', 'Police records kept forever', 'Priority support and feature requests', 'Automatic plate and warrant checks', 'Your logo on the CAD and MDT', 'Your own MDT sign-in ranks'];
const PREM_CSS = `.pm-feat{list-style:none;margin:14px 0 0;padding:0;display:grid;grid-template-columns:1fr 1fr;column-gap:24px;border-top:1px solid var(--hair)}.pm-feat li{padding:9px 0;border-bottom:1px solid var(--hair);font-size:13.5px}
.pm-bill{display:flex;align-items:center;gap:12px;flex-wrap:wrap;margin:16px 0 14px}.pm-bill>span{color:var(--dim);font-size:13px}
.pm-seg{display:inline-flex;gap:2px;padding:3px;border-radius:999px;background:rgba(240,242,245,.06);border:1px solid var(--hair)}.pm-seg button{font:inherit;font-size:13px;padding:6px 14px;border-radius:999px;border:0;background:none;color:var(--dim);cursor:pointer}.pm-seg button[aria-pressed="true"]{background:#F0F2F5;color:#0B0B0C}
.pm-sub{margin-top:18px;padding-top:16px;border-top:1px solid var(--hair)}.pm-sub h3{margin:0 0 4px;font-size:14px;font-weight:600}.pm-key{display:flex;gap:8px;align-items:center;margin-top:10px}.pm-key code{flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;padding:8px 10px;border-radius:8px;background:rgba(255,255,255,.05);border:1px solid var(--hair);font-size:12.5px;user-select:all}
.pm-lic{display:grid;grid-template-columns:1fr auto;gap:16px;align-items:start}.pm-prev{width:248px;height:156px;overflow:hidden;border-radius:9px}.pm-prev .lcard{transform:scale(.62);transform-origin:top left}
@media (max-width:700px){.pm-feat,.pm-lic{grid-template-columns:1fr}}`;
// the Premium box in a server's Settings: buy it, or use what it gives
// a person with personal Premium boosts one server they own or co-own; this is that choice, on the server's Premium card
const boostBlock = (c, prem, b) => { if (!b?.has && !b?.here) return ''; const day = t => new Date(t).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }), till = b.until >= 4e12 ? '' : ` until ${day(b.until)}`;
  if (b.here) return `<div class="pm-sub pm-boost"><h3>Boost</h3><p class="note">Your Premium is boosting ${esc(c.name)}${till}. When your Premium ends, so does the boost.</p><button class="btn sm" id="pmSrvUnboost">Remove boost</button><p class="msg" id="pmSrvMsg"></p></div>`;
  if (prem.on) return '';
  return `<div class="pm-sub pm-boost"><h3>Boost with your Premium</h3><p class="note">You have Premium${till}. Boost ${esc(c.name)} to give the whole server Premium while yours lasts.${b.elsewhere.length ? ` Your boost is on <b>${esc(b.elsewhere[0].name)}</b> now; boosting here moves it.` : ''}</p><button class="btn pri" id="pmSrvBoost">Boost ${esc(c.name)}</button><p class="msg" id="pmSrvMsg"></p></div>`; };
const premiumCard = (c, role, prem, payments, justBought, boost) => { const canBuy = runs(role) || role === 'co_owner', S = c.settings.licenseStyle || {};
  if (!prem.on) return `<section class="card" id="premium"><style>${PREM_CSS}</style><h2>Premium</h2><p class="note">$4.99 a month or $29.99 a year, for the whole server. Everyone on ${esc(c.name)} gets it.</p>
${canBuy ? boostBlock(c, prem, boost) : ''}<ul class="pm-feat">${PREMIUM_FEATURES.map(t => `<li>${esc(t)}</li>`).join('')}</ul>
${canBuy ? `<div class="pm-bill"><span>Billing</span><div class="pm-seg" role="group" aria-label="Billing"><button type="button" data-plan="month" aria-pressed="false">Monthly, $4.99</button><button type="button" data-plan="year" aria-pressed="true">Yearly, $29.99</button></div></div>
<div class="row"><button class="btn pri" id="pmBuy"${payments ? '' : ' disabled'}>Get Premium</button><a class="btn" href="/premium">Compare with Free</a></div>
<p class="msg" id="pmMsg">${payments ? 'Paid through Stripe. Cancel any time.' : 'Card payments aren\'t open yet. <a href="/support?topic=billing">Message support</a> to get Premium now.'}</p>` : '<p class="note" style="margin-top:14px">Only the owner or a co-owner can get Premium for this server.</p>'}</section>`;
  const day = t => new Date(t).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
  const end = prem.source === 'boost' ? (prem.forever ? `Active. Boosted by ${prem.boostName || 'a member'}.` : `Active until ${day(prem.until)}. Boosted by ${prem.boostName || 'a member'}.`) : prem.forever ? 'Active, given by Oversite.' : prem.source === 'stripe' ? (prem.cancelling ? `Active until ${day(prem.until - 2 * 864e5)}. It won't renew.` : `Active. Renews ${day(prem.until - 2 * 864e5)} at ${prem.plan === 'year' ? '$29.99 a year' : '$4.99 a month'}.`) : `Active until ${day(prem.until)}.`;
  return `<section class="card" id="premium"><style>${PREM_CSS}</style><h2>Premium</h2>
${justBought ? '<p class="msg ok">Premium is on for this server. Thanks for supporting Oversite.</p>' : ''}<p class="note">${esc(end)}</p>
${prem.billing && canBuy ? '<div class="row"><button class="btn sm" id="pmPortal">Manage billing</button></div>' : ''}${canBuy ? boostBlock(c, prem, boost) : ''}
<div class="pm-sub"><h3>Explore ads</h3><p class="note" id="pmCred">${prem.featured ? `${esc(c.name)} is at the top of Explore until ${new Date(prem.featured).toLocaleString('en-US', { weekday: 'short', hour: 'numeric', minute: '2-digit' })}.` : `${prem.credits} of 3 left this month. Each one puts ${esc(c.name)} at the top of Explore for 24 hours.`}</p>
${canBuy ? `<button class="btn sm" id="pmBoost"${prem.featured || !prem.credits ? ' disabled' : ''}>Run an ad now</button>` : ''}</div>
<div class="pm-sub"><h3>License card</h3><p class="note">What members scan to sign in to the MDT.</p>
<div class="pm-lic"><form id="pmLic" autocomplete="off"><label for="pmLt">Title</label><input id="pmLt" maxlength="22" value="${esc(S.title || c.name.slice(0, 22))}"${canBuy ? '' : ' disabled'}>
<div class="cols2"><div><label for="pmLc">Color</label><input id="pmLc" type="color" value="${esc(S.color || '#38542A')}" style="height:40px;padding:4px"${canBuy ? '' : ' disabled'}></div><div><label for="pmLs">Seal</label><select id="pmLs"${canBuy ? '' : ' disabled'}><option value="default"${S.seal !== 'icon' ? ' selected' : ''}>Liberty County seal</option><option value="icon"${S.seal === 'icon' ? ' selected' : ''}>Server icon</option></select></div></div>
${canBuy ? '<div class="row" style="margin-top:10px"><button class="btn sm pri">Save</button><button type="button" class="btn sm" id="pmLr">Reset</button></div><p class="msg" id="pmLm"></p>' : ''}</form><div class="pm-prev" id="pmPrev" aria-label="Preview"></div></div></div>
<div class="pm-sub"><p class="note" style="margin:0">Proximity chat, Server Staff, records kept forever, automatic plate checks and your logo are already on. Have an idea? <a href="/support?topic=feature">Send a feature request</a>.</p></div></section>`; };
// /premium: what Free and Premium get, and where to buy
export const premiumPage = ({ logo, user, owned = [], payments, mine = false }) => layout({ title: 'Premium · Oversite', logo, user, body: `<style>${PREM_CSS}.pp{max-width:860px}.pp-cols{display:grid;grid-template-columns:1fr 1fr;gap:18px;align-items:start;margin-top:8px}.pp-cols h2{display:flex;justify-content:space-between;align-items:baseline;gap:12px}.pp-cols h2 span{font-weight:400;color:var(--dim);font-size:13.5px}.pp-cols .pm-feat{grid-template-columns:1fr}.pp-buy{margin-top:18px}@media (max-width:760px){.pp-cols{grid-template-columns:1fr}}</style>
<main class="pp"><h1><b>Premium</b></h1><p class="lead">$4.99 a month or $29.99 a year. Get it for your account and boost a server you own or co-own, and everyone on that server gets it.</p>
<div class="pp-cols"><section class="card"><h2>Free <span>$0</span></h2><ul class="pm-feat">${FREE_FEATURES.map(t => `<li>${esc(t)}</li>`).join('')}</ul></section>
<section class="card"><h2>Premium adds <span>$4.99 / month</span></h2><ul class="pm-feat">${PREMIUM_FEATURES.map(t => `<li>${esc(t)}</li>`).join('')}</ul></section></div>
<section class="card pp-buy">${!user ? '<div class="row"><a class="btn pri" href="/?next=/premium">Sign in to get Premium</a></div>'
  : mine ? '<p class="note" style="margin:0">You have Premium. <a href="/account#premium">Manage it and pick which server to boost</a></p>'
  : `<h2 style="margin:0 0 10px">Get Premium</h2><div class="pm-bill"><span>Billing</span><div class="pm-seg" role="group" aria-label="Billing"><button type="button" data-plan="month" aria-pressed="false">Monthly, $4.99</button><button type="button" data-plan="year" aria-pressed="true">Yearly, $29.99</button></div></div>
<div class="row"><button class="btn pri" id="ppBuy"${payments ? '' : ' disabled'}>Get Premium</button></div><p class="msg" id="ppMsg">${payments ? 'For your account, paid through Stripe. Cancel any time. You choose which server to boost afterwards.' : 'Card payments aren&#39;t open yet. <a href="/support?topic=billing">Message support</a> to get Premium now.'}</p>`}
${user && owned.length ? `<details class="mk" style="margin-top:14px"><summary>Or buy Premium for one server instead</summary><div class="row" style="flex-wrap:nowrap;margin-top:10px"><select id="ppS" style="flex:1;min-width:0" aria-label="Server">${owned.map(o => `<option value="${esc(o.slug)}">${esc(o.name)}${o.premium ? ' (has Premium)' : ''}</option>`).join('')}</select><a class="btn" id="ppGo" href="/${esc(owned[0].slug)}/settings#premium">Continue</a></div></details>` : ''}</section></main>`,
  script: `const s=document.getElementById('ppS'),g=document.getElementById('ppGo');if(s&&g)s.onchange=()=>{g.href='/'+s.value+'/settings#premium'};
{let plan='year';document.querySelectorAll('.pp-buy [data-plan]').forEach(b=>b.onclick=()=>{plan=b.dataset.plan;document.querySelectorAll('.pp-buy [data-plan]').forEach(x=>x.setAttribute('aria-pressed',x===b))});
const buy=document.getElementById('ppBuy');if(buy)buy.onclick=async()=>{buy.disabled=true;try{const j=await api('/api/me/premium/checkout',{plan});location.href=j.url}catch(e){buy.disabled=false;say(document.getElementById('ppMsg'),e.message)}}}` });
const ST_CSS = `.stm{max-width:1060px}
.st-top{display:flex;align-items:flex-start;justify-content:space-between;gap:16px;margin:0 0 22px}.st-top h1{margin:0}.st-top .lead{margin:6px 0 0}.st-top .btn{flex:none;margin-top:6px}
.sx{display:grid;grid-template-columns:180px minmax(0,1fr);gap:28px;align-items:start}
.st-nav{position:sticky;top:76px;display:flex;flex-direction:column;gap:2px}
.st-nav a{display:flex;align-items:center;justify-content:space-between;gap:8px;padding:9px 12px;border-radius:10px;color:var(--dim);text-decoration:none;font-size:14px;font-weight:500;transition:background .15s,color .15s}
.st-nav a:hover{color:var(--ink);background:rgba(255,255,255,.04)}.st-nav a[aria-selected="true"]{color:var(--ink);background:rgba(255,255,255,.07)}
.st-nav small{font-size:11.5px;color:var(--faint);font-weight:500}.st-nav small.warn{color:var(--warn)}
.st-pane{display:none;max-width:720px}.st-pane.on{display:block}.st-pane.wide{max-width:900px}.rk-list{list-style:none;margin:12px 0 0;padding:0}.rk-list li{display:flex;align-items:center;gap:10px;padding:6px 0;border-top:1px solid var(--hair)}.rk-list li:first-child{border-top:0}
.rk-n{width:20px;flex:none;text-align:right;font-size:12px;color:var(--faint);font-variant-numeric:tabular-nums}.rk-list input:not([type]){flex:1;min-width:0;padding:7px 11px}
.rk-sup{display:flex;align-items:center;gap:6px;margin:0;flex:none;font-size:12.5px;color:var(--dim);white-space:nowrap;cursor:pointer}
.rk-b{display:flex;gap:2px;flex:none}.rk-b button{width:30px;height:30px;border-radius:8px;border:1px solid transparent;background:transparent;color:var(--dim);font:500 14px/1 inherit;cursor:pointer}.rk-b button:hover:not(:disabled){color:var(--ink);background:rgba(255,255,255,.06)}.rk-b button:disabled{opacity:.3;cursor:default}
@media (max-width:560px){.rk-list li{flex-wrap:wrap}.rk-list input:not([type]){flex:1 1 calc(100% - 30px)}.rk-sup{margin-left:30px}.rk-b{margin-left:auto}}#bounds [hidden]{display:none!important}
.bd-row{display:flex;align-items:flex-start;gap:12px;margin:12px 0 0}.bd-l{flex:none;width:68px;padding-top:7px;font-size:12.5px;color:var(--faint)}
.bd-chips{display:flex;flex-wrap:wrap;gap:6px;min-width:0}
.bd-chip{display:inline-flex;align-items:center;gap:7px;padding:6px 11px;border-radius:999px;border:1px solid var(--hair2);background:transparent;color:var(--dim);font:500 13px/1.2 inherit;cursor:pointer;transition:background .15s,color .15s,border-color .15s}
.bd-chip:hover{color:var(--ink);border-color:rgba(240,242,245,.24)}.bd-chip.on{color:#0d1416;background:var(--ink);border-color:var(--ink)}
.bd-chip b{width:8px;height:8px;border-radius:50%;flex:none}.bd-chip small{font-size:11px;opacity:.7}.bd-chip i{font-style:normal;font-size:10.5px;font-weight:600;letter-spacing:.04em;text-transform:uppercase;color:var(--ok)}.bd-chip.on i{color:#1d7a46}
.bd-chip.add{border-style:dashed}
.bd-pre{display:flex;flex-wrap:wrap;gap:8px;align-items:center;margin:10px 0 0 80px}.bd-pre input{flex:1 1 160px;min-width:0;max-width:240px;padding:7px 11px}
.bd-map{position:relative;margin:14px 0 0;aspect-ratio:1/1;max-height:72vh;border-radius:12px;overflow:hidden;border:1px solid var(--hair2);background:#0b1113}
.bd-map svg{display:block;width:100%;height:100%;touch-action:none;cursor:grab;user-select:none}.bd-map svg:active{cursor:grabbing}.bd-map svg.drawing{cursor:crosshair}.bd-map:has(svg.drawing){outline:2px solid rgba(240,242,245,.35);outline-offset:-2px}
.bd-map .bd-poly{cursor:pointer}.bd-map .bd-pt{cursor:move}.bd-map .bd-mid{cursor:copy}
.bd-zoom{position:absolute;right:10px;top:10px;display:flex;flex-direction:column;border-radius:10px;overflow:hidden;border:1px solid var(--hair2);background:rgba(13,20,22,.86)}
.bd-zoom button{width:34px;height:34px;border:0;background:transparent;color:var(--ink);font:500 17px/1 inherit;cursor:pointer}.bd-zoom button+button{border-top:1px solid var(--hair)}.bd-zoom button:hover{background:rgba(255,255,255,.06)}
.bd-bar{display:flex;flex-wrap:wrap;align-items:center;gap:8px;margin:12px 0 0}.bd-bar .hint{flex:1 1 220px;margin:0}
.bd-opts{margin:16px 0 0;padding:14px 0 0;border-top:1px solid var(--hair)}.bd-opts .hint{margin:6px 0 0}
.bd-grace{display:flex;align-items:center;gap:12px;margin:10px 0}.bd-grace label{margin:0}
.bd-h{font-size:13px;font-weight:600;margin:20px 0 6px}.bd-log{list-style:none;margin:0;padding:0;font-size:13px}
.bd-log li{display:flex;align-items:baseline;gap:12px;padding:8px 0;border-top:1px solid var(--hair);color:var(--dim)}.bd-log p{flex:1;min-width:0;margin:0}.bd-log li:first-child{border-top:0}.bd-log b{color:var(--ink);font-weight:600}
.bd-log span{font-size:11.5px;color:var(--faint)}.bd-log time{flex:none;font-size:11.5px;color:var(--faint)}.bd-log .none{color:var(--faint)}.bd-log em.bad{font-style:normal;color:var(--bad)}
@media (max-width:760px){.bd-pre{margin-left:0}.bd-l{width:auto}.bd-row{flex-direction:column;gap:6px}}.st-pane>.card+.card,.st-pane>section+section{margin-top:18px}
@media (max-width:760px){.sx{grid-template-columns:1fr;gap:16px}.st-nav{position:sticky;top:0;z-index:5;flex-direction:row;overflow-x:auto;scrollbar-width:none;padding:6px 24px;margin:0 -24px;background:#0d1416;border-bottom:1px solid var(--hair)}.st-nav::-webkit-scrollbar{display:none}.st-nav a{flex:none;padding:7px 12px}.st-top{margin-bottom:12px}}`;
export const settings = ({ logo, user, c, role, photos = [], keyStatus, invites, members, origin, isNew, codes, iconKind, needsDiscord, discordReady, regions = {}, langs = {}, prem = { on: false }, payments = false, justBought = false, bnd = { on: false, grace: 60, exemptStaff: true }, ranks = null, boost = null }) => layout({ title: `${c.name} settings · Oversite`, logo, user, body: `
<main class="stm"><style>${ST_CSS}</style><div class="st-top"><div><h1><b>${esc(c.name)}</b> settings</h1>${isNew ? '<p class="lead">Your server is ready. Connect it to ER:LC, then give your members the invite code.</p>' : ''}</div><a class="btn sm pri" href="/${esc(c.slug)}">Open CAD</a></div>
${needsDiscord ? `<section class="card setup-dg"><div><h2>Connect your Discord server to finish</h2><p class="note">Every Oversite server is tied to its Discord. Members can't open the CAD until it's connected, and it's where you pick which Discord roles are Admin and Mod.</p></div><a class="btn discord" href="/c/${esc(c.slug)}/discord/connect?new=1">Connect Discord server</a></section>` : ''}
<div class="sx">
<nav class="st-nav" role="tablist" aria-label="Settings">${[['general', 'General', keyStatus.connected ? '' : 'Set up'], ['bounds', 'Boundaries', bnd.on ? 'On' : ''], ['profile', 'Profile', ''], ['members', 'Members', String(members.length)], ['premium', 'Premium', prem.on ? 'On' : '']].map(([k, t, n]) => `<a href="#${k}" id="t-${k}" role="tab" data-tab="${k}">${t}${n ? `<small${k === 'general' ? ' class="warn"' : ''}>${n}</small>` : ''}</a>`).join('')}</nav>
<div class="st-body">
<div class="st-pane" id="tab-general" data-pane="general" role="tabpanel" aria-labelledby="t-general">
<section class="card"><h2>ER:LC server</h2>
<p class="note" id="kstat">${keyStatus.connected ? `Connected${keyStatus.name ? ` to <b>${esc(keyStatus.name)}</b>` : ''}. The key is stored encrypted and is never sent to anyone's browser.` : 'Not connected. In ER:LC open your private server settings, find the API section, and copy the server key.'}</p>
<form id="key" autocomplete="off"><label for="kin">Server key</label><input id="kin" type="password" placeholder="${keyStatus.connected ? 'Paste a new key to replace it' : 'Paste your server key'}"${keyStatus.connected ? ' value="••••••••••••••••••••••••••••" data-saved="1"' : ''} required>
<div class="row" style="margin-top:12px"><button class="btn pri">${keyStatus.connected ? 'Replace key' : 'Connect server'}</button>${keyStatus.connected && runs(role) ? '<button type="button" class="btn sm danger" id="kdel">Disconnect</button>' : ''}</div><p class="msg" id="kmsg"></p></form>${keyStatus.authorize ? `<div class="auth-cmd"><div><b>Staff commands</b><p class="note" style="margin:2px 0 0">ER:LC asks you to allow Oversite to run in-game commands (kick, ban, announcements) for your server. One click, once.</p></div><a class="btn sm" href="${esc(keyStatus.authorize)}" target="_blank" rel="noopener">Allow staff commands</a></div>` : ''}</section>
<section class="card"><h2>Departments</h2><p class="note">Rename the departments for your server, and choose which in-game team belongs to each.</p>
<form id="depts"><div class="cols">${['pd', 'fd', 'dot'].map(d => `<div class="dept"><h3><i style="background:${COL[d]}"></i>${{ pd: 'Law enforcement', fd: 'Fire and EMS', dot: 'Transportation' }[d]}</h3>
<label>Name</label><input name="${d}-name" maxlength="40" value="${esc(c.settings.depts[d]?.name || '')}" required><label>Short name</label><input name="${d}-short" maxlength="6" value="${esc(c.settings.depts[d]?.short || '')}" required>
<label>Units</label><input name="${d}-units" maxlength="500" placeholder="${{ pd: 'Patrol, K-9, SWAT', fd: 'Engine 1, Medic 2, Ladder 3', dot: 'Tow 1, Road Crew' }[d]}" value="${esc((c.settings.depts[d]?.units || []).join(', '))}"><p class="hint" style="margin:4px 0 0">Separate with commas. Players pick theirs in the MDT, and it shows on their map tag.</p></div>`).join('')}</div>
<label style="margin-top:16px">In-game teams</label><div class="teams">${Object.entries(c.settings.teams).map(([t, d]) => `<span>${esc(t)}</span><select name="team-${esc(t)}">${[['pd', c.settings.depts.pd?.name], ['fd', c.settings.depts.fd?.name], ['dot', c.settings.depts.dot?.name], ['', 'Not shown on the CAD']].map(([v, n]) => `<option value="${v}"${v === d ? ' selected' : ''}>${esc(n)}</option>`).join('')}</select>`).join('')}</div>
<label for="cname">Server name</label><input id="cname" name="name" maxlength="48" value="${esc(c.name)}" required>
<div class="row" style="margin-top:14px"><button class="btn pri">Save</button></div><p class="msg" id="dmsg"></p></form></section>
${runs(role) ? `<section class="card" id="discord"><h2 class="hrow">Discord server<span class="tag" id="dgTag">…</span></h2><p class="note">Link your Discord server and choose which roles are <b>Admin</b> and which are <b>Mod</b>. Anyone with one of those roles who signs in with Discord gets that rank's staff tools, and loses them when the role is taken away. Everything else in the CAD follows the team they are on in game.</p><div id="dgBody"><p class="empty">Loading…</p></div><p class="msg" id="dgMsg"></p></section>` : ''}
${role === 'owner' ? `<section class="card danger-zone"><h2>Delete server</h2><p class="note">Removes the server from Oversite with its settings, codes and member list. This cannot be undone.</p><button class="btn danger" id="del">Delete ${esc(c.name)}</button></section>` : ''}
</div>
<div class="st-pane wide" id="tab-bounds" data-pane="bounds" role="tabpanel" aria-labelledby="t-bounds">
<section class="card" id="bounds" data-api="/c/${esc(c.slug)}/api"><h2 class="hrow">Boundaries<span class="tag" id="bdTag">${bnd.on ? 'On' : 'Off'}</span></h2>
<p class="note">Draw where people are allowed to go: one area for the whole server, and one for each team if you want. Anyone who leaves theirs gets a message in game, and is loaded if they aren't back in time.</p>
<div class="bd-row"><span class="bd-l">Presets</span><div class="bd-chips" id="bdSlots"></div></div>
<div class="bd-pre"><input id="bdName" maxlength="32" aria-label="Preset name" placeholder="Preset name"><button type="button" class="btn sm" id="bdLive">Make this preset live</button><button type="button" class="btn sm" id="bdCopy">Duplicate</button><button type="button" class="btn sm danger" id="bdRm">Delete</button></div>
<div class="bd-row"><span class="bd-l">Area for</span><div class="bd-chips" id="bdScope"></div></div>
<div class="bd-map"><svg id="bdSvg" preserveAspectRatio="xMidYMid slice" aria-label="Map. Click to add corners, drag to move around, scroll to zoom."></svg>
<div class="bd-zoom"><button type="button" id="bdIn" aria-label="Zoom in">+</button><button type="button" id="bdOut" aria-label="Zoom out">&minus;</button><button type="button" id="bdFit" aria-label="Show the whole map">&#9634;</button></div></div>
<div class="bd-bar"><button type="button" class="btn sm pri" id="bdDraw">Draw area</button><button type="button" class="btn sm" id="bdUndo" hidden>Undo corner</button><button type="button" class="btn sm danger" id="bdDel" disabled>Delete area</button><p class="hint" id="bdHint"></p></div>
<div class="bd-opts"><label class="chk"><input type="checkbox" id="bdOn"${bnd.on ? ' checked' : ''}> Enforce the live preset in game</label>
<div class="bd-grace"><label for="bdGrace">Time to get back</label><select id="bdGrace">${[15, 30, 45, 60, 90, 120, 180, 300].map(t => `<option value="${t}"${+bnd.grace === t ? ' selected' : ''}>${t < 60 ? t + ' seconds' : t / 60 + (t === 60 ? ' minute' : ' minutes')}</option>`).join('')}</select></div>
<label class="chk"><input type="checkbox" id="bdStaff"${bnd.exemptStaff ? ' checked' : ''}> Leave server staff alone (in-game admins and mods)</label>
<p class="hint" id="bdHint2" hidden style="color:var(--warn)">Connect your ER:LC server in General first. Boundaries need in-game positions and staff commands.</p>
<p class="hint">Oversite sends <code>:pm</code> when someone leaves and <code>:load</code> when their time is up, so the owner has to have allowed Oversite to run commands (General, ER:LC server).</p></div>
<div class="row" style="margin-top:14px"><button class="btn pri" id="bdSave" disabled>Save</button><span class="hint" id="bdDirty" hidden>Unsaved changes</span></div><p class="msg" id="bdMsg"></p>
<h3 class="bd-h">Recent</h3><ul class="bd-log" id="bdLog"></ul></section>
<script src="/bounds-editor.js?v=8" defer></script></div>
<div class="st-pane" id="tab-profile" data-pane="profile" role="tabpanel" aria-labelledby="t-profile">
${(() => { const P = c.settings.profile || {}, E = P.erlc || {}, letter = esc(c.name.slice(0, 1).toUpperCase());
  const fact = (k, v) => `<div><small>${k}</small><b>${v}</b></div>`;
  const facts = E.at ? [fact('In-game name', esc(E.name || 'Unknown')), fact('Join code', E.join_key ? `<code>${esc(E.join_key)}</code>` : 'None'), fact('Players', E.max ? `${E.players ?? 0} / ${E.max}` : 'Unknown'),
    fact('Owner', E.owner_id ? `<span class="sp-who"><img src="/rbx/avatar/${esc(E.owner_id)}" alt="" onerror="this.remove()">${esc(E.owner_name || 'ID ' + E.owner_id)}</span>` : 'Unknown'),
    fact('Co-owners', E.co_owners?.length ? E.co_owners.map(o => esc(o.name || 'ID ' + o.id)).join(', ') : 'None'), fact('Account verification', esc(E.verified || 'Not required')), fact('Team balance', E.team_balance ? 'On' : 'Off')].join('') : '';
  return `<section class="card" id="profile"><h2>Server profile</h2><p class="note">How your server shows up on Oversite, and in the server browser when it launches. The details in the box below come from ER:LC and stay up to date by themselves.</p>
<div class="sp-head"><button type="button" class="sp-icon" id="spPick" title="Change icon" aria-label="Change server icon"><span>${letter}</span><img id="spImg" src="/c/${esc(c.slug)}/icon?v=${Date.now()}" alt="" onerror="this.remove()"><i>Change</i></button>
<div class="sp-id"><b>${esc(c.name)}</b><small id="spIconNote">${iconKind === 'custom' ? 'Using the icon you uploaded.' : iconKind === 'discord' ? 'Using your Discord server\'s icon. Upload one to replace it.' : iconKind === 'owner' ? 'Using the server owner\'s Roblox avatar. Upload an icon to replace it.' : 'No icon yet. Upload one.'}</small>
<div class="row" style="margin-top:8px"><button type="button" class="btn sm" id="spUp">Upload icon</button>${iconKind === 'custom' ? '<button type="button" class="btn sm" id="spDefault">Use default</button>' : ''}<input type="file" id="spFile" accept="image/png,image/jpeg,image/webp" hidden></div></div></div>
<div class="sp-ph"><div class="sp-phh"><b>Photos</b><span>${photos.length} / 8</span></div><p class="hint" style="margin:2px 0 10px">Screenshots of your server. They scroll across the top of your server page, and the first one is the banner on your Explore card. Drag photos to change the order.</p>
${photos.length ? `<div class="sp-cov" id="spCov"><div class="sp-cvf pg" id="spCvPg" tabindex="0" aria-label="Photo position. Drag, or use the arrow keys."><img alt=""><i>Drag to move</i><span>Server page</span></div><div class="sp-cvf xc" id="spCvXc" tabindex="-1"><img alt=""><span>Explore card</span></div>
<div class="sp-cvr"><p class="hint" style="margin:0" id="spCvH">Drag the photo to choose which part shows. Click a photo below to position that one.</p><button type="button" class="lnk" id="spCvReset">Center</button></div></div>` : ''}
<div class="sp-phg" id="spPhg">${photos.map((id, i) => `<figure data-id="${id}"${i ? '' : ' class="sel"'}><img src="/c/${esc(c.slug)}/photos/${id}" alt="" loading="lazy"${P.ppos?.[id] ? ` style="object-position:${+P.ppos[id][0]}% ${+P.ppos[id][1]}%"` : ''}>${i ? '' : '<em>Cover</em>'}<div class="ph-acts"><button type="button" class="ph-l" title="Move earlier" aria-label="Move earlier"${i ? '' : ' hidden'}><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 6l-6 6 6 6"/></svg></button><button type="button" class="ph-x" title="Remove photo" aria-label="Remove photo"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><path d="M6 6l12 12M18 6L6 18"/></svg></button></div></figure>`).join('')}${photos.length < 8 ? `<button type="button" class="sp-phadd" id="spPhAdd"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="5" width="18" height="14" rx="2.5"/><circle cx="9" cy="10" r="1.6"/><path d="M21 16l-5-5-8 8"/></svg>Add photos</button>` : ''}</div>
<input type="file" id="spPhFile" accept="image/png,image/jpeg,image/webp" multiple hidden></div>
<div class="sp-erlc"><div class="sp-erlch"><span>From ER:LC</span><button type="button" class="lnk" id="spRefresh">${E.at ? 'Refresh' : 'Load from ER:LC'}</button></div>${E.at ? `<div class="sp-facts">${facts}</div>` : `<p class="hint" style="margin:6px 0 0">${keyStatus.connected ? 'Loading your server details…' : 'Connect your ER:LC server in General to fill this in.'}</p>`}</div>
<form id="spForm"><label for="spBio">Bio</label><textarea id="spBio" maxlength="300" rows="3" placeholder="What your server is about: the vibe, the rules, what makes it different.">${esc(P.bio || '')}</textarea><p class="hint" style="text-align:right;margin:4px 0 0"><span id="spCount">${(P.bio || '').length}</span> / 300</p>
<label for="spInv">Discord invite</label><div class="sp-inv"><span>discord.gg/</span><input id="spInv" maxlength="80" placeholder="yourserver" value="${esc((P.invite || '').replace(/^https:\/\/discord\.gg\//, ''))}" spellcheck="false" autocomplete="off"></div><p class="hint" style="margin:4px 0 0">Just the code is enough. Pasting a full invite link works too.</p>
<div class="cols2"><div><label for="spRegion">Region</label><select id="spRegion"><option value="">Not set</option>${Object.entries(regions).map(([k, [n, f]]) => `<option value="${k}"${P.region === k ? ' selected' : ''}>${esc(n)}</option>`).join('')}</select></div>
<div><label for="spLang">Language</label><select id="spLang"><option value="">Not set</option>${Object.entries(langs).map(([k, [n, f]]) => `<option value="${k}"${P.lang === k ? ' selected' : ''}>${esc(n)}</option>`).join('')}</select></div></div>
${E.join_key ? '' : `<label for="spJoin">ER:LC join code</label><input id="spJoin" maxlength="12" placeholder="LCRPx" value="${esc(P.join_code || '')}" spellcheck="false" autocomplete="off"><p class="hint" style="margin:4px 0 0">The code players type in ER:LC to find your server. It fills in by itself once ER:LC is connected.</p>`}
<label class="chk"><input type="checkbox" id="spList"${P.unlisted ? '' : ' checked'}> Show this server on the <a href="/explore">Explore</a> page</label><p class="hint" style="margin:2px 0 0">Every server is on Explore unless you untick this.</p>${keyStatus && !keyStatus.connected ? '<p class="hint" style="margin:4px 0 0">Connect your ER:LC server in General so Explore can show when you\'re online and how many are playing.</p>' : ''}
<label class="chk"><input type="checkbox" id="spOpen"${P.open_join ? ' checked' : ''}> Anyone can join this server's CAD from Explore, without the invite code</label>${c.hidden ? '<p class="hint" style="margin:4px 0 0;color:var(--warn)">Oversite has hidden this server from Explore. Email support@oversite.shop if you think this is a mistake.</p>' : ''}
<div class="row" style="margin-top:14px"><button class="btn pri">Save profile</button></div><p class="msg" id="spMsg"></p></form></section>`; })()}
<section class="card"><h2>Vote link</h2><p class="note">Send this to your players. It opens your server's page and asks them to vote, which moves you up Explore. Each person can vote once every 12 hours.</p>
<div class="row" style="flex-wrap:nowrap;margin-top:12px"><code style="flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${esc(origin.replace(/^https?:\/\//, ''))}/${esc(c.slug)}/vote</code><button class="btn sm" data-copy="${esc(origin)}/${esc(c.slug)}/vote">Copy link</button></div>
${c.settings.profile?.unlisted ? '<p class="hint" style="margin:8px 0 0">Your server is hidden from Explore, so nobody can vote until you list it again.</p>' : ''}</section>
</div>
<div class="st-pane" id="tab-members" data-pane="members" role="tabpanel" aria-labelledby="t-members">
${codes ? `<section class="card"${isNew ? ' style="border-color:rgba(76,141,255,.35)"' : ''}><h2>Invite code</h2><p class="note">Members type this on the front page to join, or open the invite link below. Anyone with either can join, so change the code if it gets passed around (the link changes with it).</p>
<label>Invite code</label><div class="row" style="flex-wrap:nowrap"><input id="mcode" value="${esc(codes.member)}" spellcheck="false" maxlength="24"><button class="btn sm" data-copy="${esc(codes.member)}">Copy</button></div>
<label style="margin-top:12px">Invite link <span style="color:var(--faint);font-weight:400">never expires</span></label><div class="row" style="flex-wrap:nowrap"><code id="mlink" style="flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${esc(origin.replace(/^https?:\/\//, ''))}/invite/${esc(codes.member.toLowerCase())}</code><button class="btn sm" id="mlinkc" data-copy="${esc(origin)}/invite/${esc(codes.member.toLowerCase())}">Copy link</button></div>
<div class="row" style="margin-top:8px"><button class="btn sm" id="savem">Save invite code</button><button class="btn sm" id="genm">New random code</button></div>
<p class="msg" id="codemsg"></p></section>` : ''}
<section class="card"><h2>One-off invite links</h2><p class="note">Links that stop working after 7 days, for inviting someone without sharing your invite code.</p>
<div class="row"><button class="btn pri" id="newinv">Create invite link</button></div><p class="msg" id="imsg"></p>
${invites.length ? `<div class="invites">${invites.map(i => `<div class="inv"><div class="tx"><code title="${esc(origin)}/join/${esc(i.code)}">${esc(origin.replace(/^https?:\/\//, ''))}/join/${esc(i.code)}</code><small>${i.uses} ${i.uses === 1 ? 'use' : 'uses'}${i.expires ? ` · expires ${new Date(i.expires).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}` : ''}</small></div><div class="acts"><button class="btn sm" data-copy="${esc(origin)}/join/${esc(i.code)}">Copy</button><button class="btn sm danger" data-revoke="${esc(i.code)}">Revoke</button></div></div>`).join('')}</div>` : '<p class="empty">No active invite links.</p>'}
</section>
<section class="card"><h2>Members</h2><p class="note"><b>Owner</b> and <b>Co-Owners</b> run these settings (only the owner can delete the server). <b>Admins</b> get the Server Staff tablet with everything: warn, kick, ban, unban, announce. <b>Mods</b> get the tablet to warn, message, kick and add notes. <b>Members</b> use the CAD. Which department MDT someone gets follows their team in game.</p>
<table><tr><th>Member</th><th>Roblox</th><th>Role</th><th></th></tr>${members.map(m => `<tr><td>${esc(m.name)}${m.verified ? vbadge(14) : ''}${(m.premium_until || 0) > Date.now() ? pbadge(14) : ''}</td><td>${m.roblox_name ? esc(m.roblox_name) : '<span style="color:var(--faint)">Not linked</span>'}</td>
<td>${(() => { const R = { owner: 5, co_owner: 4, admin: 3, mod: 2, member: 1, staff: 3 }, boss = user.id === c.owner_id, mine = boss ? 6 : R[role] || 0, can = m.id !== user.id && m.id !== c.owner_id && (R[m.role] || 0) < mine;
  if (!can) return esc(RANK_LABEL[m.role] || m.role);
  return `<select data-role="${m.id}">${['co_owner', 'admin', 'mod', 'member'].filter(k => R[k] < mine).map(k => `<option value="${k}"${(m.role === k || (m.role === 'staff' && k === 'admin')) ? ' selected' : ''}>${RANK_LABEL[k]}</option>`).join('')}${m.role === 'owner' ? `<option value="owner" selected disabled>${RANK_LABEL.owner || 'Owner'}</option>` : ''}</select>`; })()}</td>
<td style="text-align:right">${m.id !== user.id && m.id !== c.owner_id && (user.id === c.owner_id || (m.role !== 'owner' && ({ owner: 5, co_owner: 4, admin: 3, mod: 2, member: 1, staff: 3 }[m.role] || 0) < ({ owner: 5, co_owner: 4 }[role] || 0))) ? `<button class="btn sm danger" data-remove="${m.id}">Remove</button>` : ''}</td></tr>`).join('')}</table><p class="msg" id="mmsg"></p>
</section>
</div>
<div class="st-pane" id="tab-premium" data-pane="premium" role="tabpanel" aria-labelledby="t-premium">
${premiumCard(c, role, prem, payments, justBought, boost)}
${ranks ? `<section class="card" id="ranks" data-api="/c/${esc(c.slug)}/api" data-ranks="${esc(JSON.stringify(ranks))}" data-depts="${esc(JSON.stringify({ pd: c.settings.depts.pd?.name, fd: c.settings.depts.fd?.name, dot: c.settings.depts.dot?.name }))}"${prem.on ? '' : ' data-locked="1"'}><h2 class="hrow">MDT sign-in ranks<span class="tag">Premium</span></h2>
${prem.on ? `<p class="note">The ranks members pick when they sign in to a department's MDT, lowest first. A <b>Supervisor</b> rank can approve and deny warrants.</p>
<div class="bd-chips" id="rkDepts"></div><ol class="rk-list" id="rkList"></ol>
<div class="row" style="margin-top:10px"><button type="button" class="btn sm" id="rkAdd">Add rank</button></div>
<div class="row" style="margin-top:16px"><button type="button" class="btn pri" id="rkSave" disabled>Save ranks</button><button type="button" class="btn sm" id="rkReset">Reset to default</button></div><p class="msg" id="rkMsg"></p>
<script src="/ranks-editor.js?v=2" defer></script>` : `<p class="note">Rename, add, remove and reorder the ranks members pick when they sign in to the MDT, and choose which ranks can approve warrants. Comes with Premium.</p>`}</section>` : ''}
${(() => { const V = c.settings.voice || {}, r = V.range || 'normal'; return `<section class="card" id="voice"><h2>Proximity voice</h2><p class="note">Players open the voice page next to ER:LC and hear the people near them in game. Voices fade with distance${V.muffle === false ? '' : ' and sound muffled through a vehicle'}.</p>
<form id="vForm"><label class="chk"><input type="checkbox" id="vOn"${V.on ? ' checked' : ''}> Turn on proximity voice</label>
<label for="vRange">Hearing range</label><select id="vRange">${[['short', 'Short, about 25 m'], ['normal', 'Normal, about 40 m'], ['long', 'Long, about 60 m']].map(([k, t]) => `<option value="${k}"${r === k ? ' selected' : ''}>${t}</option>`).join('')}</select>
<label class="chk"><input type="checkbox" id="vMuffle"${V.muffle === false ? '' : ' checked'}> Muffle voices to and from vehicles</label>
<p class="hint" style="margin:6px 0 0">Players join at <a href="/${esc(c.slug)}/prox">oversitescad.com/${esc(c.slug)}/prox</a> or from the headset button in the CAD. They need a microphone, and headphones stop echo.${keyStatus && !keyStatus.connected ? ' Connect your ER:LC server in General first: voice uses in-game positions.' : ''}</p>
<div class="row" style="margin-top:12px"><button class="btn pri">Save</button></div><p class="msg" id="vMsg"></p></form></section>`; })()}
</div>
</div></div>
</main>`, script: `
const A='/c/${esc(c.slug)}/api';
/* tabs: one group of settings at a time; the address keeps the tab, and links to a card (#discord, #voice) open its tab */
{const panes=[...document.querySelectorAll('.st-pane')],tabs=[...document.querySelectorAll('[data-tab]')];
  const show=(h,scroll)=>{const tp=h&&document.getElementById('tab-'+h),el=!tp&&h&&document.getElementById(h),p=tp||el&&el.closest('.st-pane')||panes[0];
    panes.forEach(x=>x.classList.toggle('on',x===p));tabs.forEach(t=>t.setAttribute('aria-selected',t.dataset.tab===p.dataset.pane));
    window.dispatchEvent(new Event('resize'));if(el&&scroll)el.scrollIntoView({block:'start'});else if(scroll)scrollTo(0,0)};
  tabs.forEach(t=>t.addEventListener('click',e=>{e.preventDefault();history.replaceState(null,'','#'+t.dataset.tab);show(t.dataset.tab,true)}));
  addEventListener('hashchange',()=>show(location.hash.slice(1),true));show(location.hash.slice(1)||(${justBought ? "'premium'" : "''"}),!!location.hash)}
/* Premium */
for(const [bid,path] of [['pmSrvBoost','boost-server'],['pmSrvUnboost','unboost-server']]){const b=document.getElementById(bid);if(b)b.addEventListener('click',async()=>{b.disabled=true;try{await api(A+'/premium/'+path,{});location.hash='premium';location.reload()}catch(e){b.disabled=false;say(document.getElementById('pmSrvMsg'),e.message)}})}
{const pm=document.getElementById('premium');if(pm){let plan='year';const PM=document.getElementById('pmMsg');
  pm.querySelectorAll('[data-plan]').forEach(b=>b.onclick=()=>{plan=b.dataset.plan;pm.querySelectorAll('[data-plan]').forEach(x=>x.setAttribute('aria-pressed',x===b))});
  const go=async(path,body,btn)=>{if(btn)btn.disabled=true;try{const j=await api(A+'/premium/'+path,body||{});if(j.url){location.href=j.url;return null}return j}catch(e){if(PM)say(PM,e.message);else alert(e.message);if(btn)btn.disabled=false;return null}};
  const buy=document.getElementById('pmBuy');if(buy)buy.onclick=()=>go('checkout',{plan},buy);
  const po=document.getElementById('pmPortal');if(po)po.onclick=()=>go('portal',{},po);
  const bo=document.getElementById('pmBoost');if(bo)bo.onclick=async()=>{const j=await go('boost',{},bo);if(j){document.getElementById('pmCred').textContent='Your server is at the top of Explore for the next 24 hours. '+j.credits+' of 3 left this month.'}};
  const prev=document.getElementById('pmPrev'),lt=document.getElementById('pmLt'),lc=document.getElementById('pmLc'),ls=document.getElementById('pmLs');
  const draw=()=>{if(!prev||!window.LicenseCard)return;prev.innerHTML=LicenseCard.html({user:'${esc(user.roblox_name || 'player')}',rid:'${esc(user.roblox_id || '')}',display:'${esc(user.roblox_name || 'Player')}',age:'21',occ:'Police Officer',gndr:'M',hair:'BRN',eyes:'BRN',hgt:"5' 11\\"",wgt:'170 lbs',iss:'2024-01-01',title:lt.value||'${esc(c.name.slice(0, 22))}',color:lc.value,seal:ls.value==='icon'?'/c/${esc(c.slug)}/icon':''})};
  if(lt){[lt,lc,ls].forEach(x=>x.addEventListener('input',draw));const sc=document.createElement('script');sc.src='/license-card.js?v=4';sc.onload=draw;document.head.appendChild(sc);
    const lf=document.getElementById('pmLic'),lm=document.getElementById('pmLm');if(lf&&lm){lf.addEventListener('submit',async e=>{e.preventDefault();try{await api(A+'/premium/license',{title:lt.value,color:lc.value,seal:ls.value});say(lm,'Saved. Members see it next time they sign in.',true)}catch(x){say(lm,x.message)}});
      document.getElementById('pmLr').onclick=async()=>{try{await api(A+'/premium/license',{reset:true});lt.value='${esc(c.name.slice(0, 22))}';lc.value='#38542A';ls.value='default';draw();say(lm,'Back to the standard license.',true)}catch(x){say(lm,x.message)}}}}
}}
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
// photos: shrink to 1600 px on the long side in the browser, upload one at a time, then reorder or remove in place
const pg=document.getElementById('spPhg'),pf=document.getElementById('spPhFile'),pa=document.getElementById('spPhAdd');
if(pa)pa.addEventListener('click',()=>pf.click());
const shrink=async(file,side,q)=>{const bm=await createImageBitmap(file),k=Math.min(1,side/Math.max(bm.width,bm.height)),cv=document.createElement('canvas');cv.width=Math.round(bm.width*k);cv.height=Math.round(bm.height*k);cv.getContext('2d').drawImage(bm,0,0,cv.width,cv.height);let d=cv.toDataURL('image/webp',q);if(!d.startsWith('data:image/webp'))d=cv.toDataURL('image/jpeg',q);return d};
pf.addEventListener('change',async()=>{const files=[...pf.files].filter(f=>/^image\\/(png|jpeg|webp)$/.test(f.type));pf.value='';if(!files.length)return say(m,'Use PNG, JPG or WebP images.');
  const room=8-pg.querySelectorAll('figure').length,list=files.slice(0,room);if(!list.length)return say(m,'A server can have up to 8 photos. Remove one first.');
  try{for(let i=0;i<list.length;i++){say(m,'Uploading photo '+(i+1)+' of '+list.length+'…',true);let d=await shrink(list[i],1600,.84);if(d.length>1.15e6)d=await shrink(list[i],1280,.72);await api(A+'/profile/photos',{data:d})}location.reload()}catch(x){say(m,x.message||'Could not read that image.')}});
const order=()=>[...pg.querySelectorAll('figure')].map(f=>Number(f.dataset.id));
const relabel=()=>pg.querySelectorAll('figure').forEach((f,i)=>{let em=f.querySelector('em');if(!i&&!em){em=document.createElement('em');em.textContent='Cover';f.insertBefore(em,f.querySelector('.ph-acts'))}if(i&&em)em.remove();f.querySelector('.ph-l').hidden=!i});
// position: drag the photo inside the banner-shaped frames; saved per photo
const PP=${JSON.stringify((c.settings.profile && c.settings.profile.ppos) || {})},cv=document.getElementById('spCov');let cur=null,dragged=false;
const tiles=()=>[...pg.querySelectorAll('figure')],posOf=id=>PP[id]||[50,50];
const paint=()=>{if(!cur)return;const p=posOf(cur.dataset.id),op=p[0]+'% '+p[1]+'%';cv.querySelectorAll('img').forEach(i=>i.style.objectPosition=op);cur.querySelector('img').style.objectPosition=op};
const choose=f=>{if(!cv||!f)return;cur=f;tiles().forEach(t=>t.classList.toggle('sel',t===f));const src=f.querySelector('img').src;cv.querySelectorAll('img').forEach(i=>{if(i.src!==src)i.src=src});
  const first=tiles()[0]===f;document.getElementById('spCvXc').hidden=!first;document.getElementById('spCvH').textContent=first?'Drag the photo to choose which part shows. Click a photo below to position that one.':'Drag the photo to choose which part shows on your server page.';paint()};
let saveT=0;const savePos=()=>{clearTimeout(saveT);const id=cur.dataset.id,p=posOf(id);saveT=setTimeout(async()=>{try{await api(A+'/profile/photos/pos',{id:Number(id),x:p[0],y:p[1]});say(m,'Photo position saved.',true)}catch(x){say(m,x.message)}},250)};
if(cv){choose(tiles()[0]);
  const clamp=v=>Math.round(Math.min(100,Math.max(0,v))*10)/10;
  cv.querySelectorAll('.sp-cvf').forEach(fr=>{let st=null;
    fr.addEventListener('pointerdown',e=>{if(e.button||!cur)return;const im=fr.querySelector('img');if(!im.naturalWidth)return;e.preventDefault();fr.setPointerCapture(e.pointerId);fr.classList.add('on');
      const fw=fr.clientWidth,fh=fr.clientHeight,k=Math.max(fw/im.naturalWidth,fh/im.naturalHeight);st={x:e.clientX,y:e.clientY,p:posOf(cur.dataset.id).slice(),ox:im.naturalWidth*k-fw,oy:im.naturalHeight*k-fh,moved:false}});
    fr.addEventListener('pointermove',e=>{if(!st)return;const dx=e.clientX-st.x,dy=e.clientY-st.y;if(Math.abs(dx)+Math.abs(dy)>1)st.moved=true;
      PP[cur.dataset.id]=[st.ox>1?clamp(st.p[0]-dx/st.ox*100):st.p[0],st.oy>1?clamp(st.p[1]-dy/st.oy*100):st.p[1]];paint()});
    const end=()=>{if(!st)return;fr.classList.remove('on');if(st.moved)savePos();st=null};fr.addEventListener('pointerup',end);fr.addEventListener('pointercancel',end)});
  document.getElementById('spCvPg').addEventListener('keydown',e=>{const d={ArrowLeft:[-2,0],ArrowRight:[2,0],ArrowUp:[0,-2],ArrowDown:[0,2]}[e.key];if(!d||!cur)return;e.preventDefault();
    const p=posOf(cur.dataset.id);PP[cur.dataset.id]=[clamp(p[0]+d[0]),clamp(p[1]+d[1])];paint();savePos()});
  document.getElementById('spCvReset').addEventListener('click',()=>{if(!cur)return;PP[cur.dataset.id]=[50,50];paint();savePos()})}
// order: drag a photo onto another spot; the first one is the cover
let dg=null;
pg.addEventListener('pointerdown',e=>{const f=e.target.closest('figure');if(!f||e.button||e.target.closest('button'))return;dg={f,x:e.clientX,y:e.clientY,id:e.pointerId,on:false}});
addEventListener('pointermove',e=>{if(!dg||e.pointerId!==dg.id)return;const dx=e.clientX-dg.x,dy=e.clientY-dg.y;
  if(!dg.on){if(Math.hypot(dx,dy)<6)return;dg.on=true;dg.f.classList.add('drag');dg.f.style.pointerEvents='none';dg.l=dg.f.offsetLeft;dg.t=dg.f.offsetTop;dg.was=order().join()}
  const o=document.elementFromPoint(e.clientX,e.clientY)?.closest('#spPhg figure');if(o&&o!==dg.f){const L=tiles();pg.insertBefore(dg.f,L.indexOf(o)>L.indexOf(dg.f)?o.nextSibling:o)}
  dg.f.style.transform='translate('+(dg.l+dx-dg.f.offsetLeft)+'px,'+(dg.t+dy-dg.f.offsetTop)+'px)'});
const drop=async()=>{if(!dg)return;const d=dg;dg=null;if(!d.on)return;dragged=true;setTimeout(()=>dragged=false,0);d.f.classList.remove('drag');d.f.style.transform='';d.f.style.pointerEvents='';
  if(order().join()===d.was)return;relabel();if(cur)choose(cur);try{await api(A+'/profile/photos/order',{ids:order()});say(m,'Photo order saved.',true)}catch(x){say(m,x.message)}};
addEventListener('pointerup',drop);addEventListener('pointercancel',drop);
pg.addEventListener('click',async e=>{const f=e.target.closest('figure');if(!f||dragged)return;
  if(!e.target.closest("button")){choose(f);return}
  if(e.target.closest('.ph-x')){try{await api(A+'/profile/photos/remove',{id:Number(f.dataset.id)});location.reload()}catch(x){say(m,x.message)}}
  else if(e.target.closest('.ph-l')&&f.previousElementSibling){pg.insertBefore(f,f.previousElementSibling);relabel();if(cur)choose(cur);try{await api(A+'/profile/photos/order',{ids:order()});say(m,'Photo order saved.',true)}catch(x){say(m,x.message)}}});
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
const KIN=document.getElementById('kin');if(KIN)KIN.addEventListener('focus',()=>{if(KIN.dataset.saved)KIN.select()});
document.getElementById('key').addEventListener('submit',async e=>{e.preventDefault();const m=document.getElementById('kmsg'),b=e.target.querySelector('button');if(KIN.dataset.saved&&KIN.value==='••••••••••••••••••••••••••••'){say(m,'This key is already saved. Paste a new one to replace it.',true);return}b.disabled=true;say(m,'Checking the key with ER:LC…',true);try{const j=await api(A+'/key',{key:document.getElementById('kin').value.trim()});if(j.pending){say(m,j.pending,true);setTimeout(()=>location.reload(),3500);return}say(m,'Connected to '+(j.name||'your server')+'. '+(j.players??0)+' players online.',true);setTimeout(()=>location.reload(),1200)}catch(x){say(m,x.message);b.disabled=false}});
const kd=document.getElementById('kdel');if(kd)kd.addEventListener('click',async()=>{if(!await ask({title:'Disconnect the ER:LC server?',text:'The CAD stops receiving live data until a key is connected again.',ok:'Disconnect',danger:true}))return;await api(A+'/key',null,'DELETE');location.reload()});
document.getElementById('vForm').addEventListener('submit',async e=>{e.preventDefault();const m=document.getElementById('vMsg');try{await api(A+'/voice/settings',{on:document.getElementById('vOn').checked,range:document.getElementById('vRange').value,muffle:document.getElementById('vMuffle').checked});say(m,'Saved.',true)}catch(x){say(m,x.message)}});
document.getElementById('depts').addEventListener('submit',async e=>{e.preventDefault();const f=new FormData(e.target),m=document.getElementById('dmsg');const depts={},teams={};for(const d of['pd','fd','dot'])depts[d]={name:f.get(d+'-name'),short:f.get(d+'-short'),units:f.get(d+'-units')};for(const[k,v]of f.entries())if(k.startsWith('team-'))teams[k.slice(5)]=v;
try{await api(A+'/settings',{name:f.get('name'),depts,teams});say(m,'Saved.',true)}catch(x){say(m,x.message)}});
document.getElementById('newinv').addEventListener('click',async()=>{const m=document.getElementById('imsg');try{const j=await api(A+'/invites');await navigator.clipboard?.writeText(j.url).catch(()=>{});say(m,'Link created and copied: '+j.url,true);setTimeout(()=>location.reload(),1500)}catch(x){say(m,x.message)}});
document.addEventListener('click',async e=>{const c=e.target.closest('[data-copy]');if(c){await navigator.clipboard?.writeText(c.dataset.copy).catch(()=>{});const t=c.textContent;c.textContent='Copied';setTimeout(()=>c.textContent=t,1200)}
const r=e.target.closest('[data-revoke]');if(r){await api(A+'/invites/revoke',{code:r.dataset.revoke});location.reload()}
const x=e.target.closest('[data-remove]');if(x){if(!await ask({title:'Remove this member?',text:'They lose access to the CAD for this server. They can rejoin with the invite code or an invite link.',ok:'Remove',danger:true}))return;try{await api(A+'/members/remove',{userId:+x.dataset.remove});location.reload()}catch(err){say(document.getElementById('mmsg'),err.message)}}});
document.addEventListener('change',async e=>{const s=e.target.closest('[data-role]');if(!s)return;try{await api(A+'/members/role',{userId:+s.dataset.role,role:s.value});say(document.getElementById('mmsg'),'Role updated.',true)}catch(x){say(document.getElementById('mmsg'),x.message)}});
const cm=document.getElementById('codemsg'),ml=document.getElementById('mlink'),mlc=document.getElementById('mlinkc'),setc=async(body)=>{try{const j=await api(A+'/codes',body);say(cm,'Saved: '+j.code,true);if(ml&&body.role==='member'){const u=location.origin+'/invite/'+j.code.toLowerCase();ml.textContent=u.split('//')[1];mlc.dataset.copy=u}return j.code}catch(x){say(cm,x.message)}};
const sm=document.getElementById('savem');if(sm){sm.addEventListener('click',()=>setc({role:'member',code:document.getElementById('mcode').value}));
document.getElementById('genm').addEventListener('click',async()=>{const c=await setc({role:'member',generate:true});if(c){document.getElementById('mcode').value=c;document.querySelector('[data-copy]').dataset.copy=c}});
}
const del=document.getElementById('del');if(del)del.addEventListener('click',async()=>{if(!await ask({title:${JSON.stringify('Delete ' + c.name + '?').replace(/</g, '\\u003c')},text:'This removes the server from Oversite with its settings, codes and member list. It cannot be undone.',ok:'Delete server',danger:true,typed:'${esc(c.slug)}'}))return;await api(A+'/delete',{confirm:'${esc(c.slug)}'});location.href='/dashboard'});
` });

export const join = ({ logo, user, c, code, action }) => layout({ title: `Join ${c.name} · Oversite`, logo, user, body: `
<section class="hero"><div class="box"><div class="mark"><img src="data:image/png;base64,${logo}" alt=""></div>
<h1>Join <b>${esc(c.name)}</b></h1><p class="lead">You have been invited to this server's CAD on Oversite.</p>
<form method="post" action="${esc(action || '/join/' + code)}" class="actions"><button class="btn pri">Join community</button></form></div></section>` });

export const SUPPORT_TOPICS = { account: 'My account is suspended', server: 'My server is suspended', erlc: 'My ER:LC server won\'t connect', bug: 'Something on the site is broken', billing: 'Billing, Premium or refunds', feature: 'Feature request', other: 'Something else' };
export const support = ({ logo, user, topic }) => layout({ title: 'Support · Oversite', logo, user, body: `
<main class="acct" style="max-width:620px"><section class="card"><h2>Contact support</h2>
<p class="note">Your message goes straight to the Oversite team. ${user ? `You're sending it as <b>${esc(user.roblox_name || user.name)}</b>, so we can see your account. Add an email if you'd like the reply there.` : 'Add your email so we can reply.'}</p>
<form id="sup" autocomplete="off" style="display:flex;flex-direction:column;gap:12px;margin-top:6px">
<label for="supT">What's it about?</label><select id="supT">${Object.entries(SUPPORT_TOPICS).map(([k, v]) => `<option value="${k}"${k === topic ? ' selected' : ''}>${esc(v)}</option>`).join('')}</select>
<label for="supE">Email${user ? ' (optional)' : ''}</label><input id="supE" type="email" maxlength="120" placeholder="you@example.com"${user ? '' : ' required'}>
<label for="supB">Message</label><textarea id="supB" rows="7" maxlength="3000" placeholder="What happened, and what you expected. Include your server's address if it's about a server." required style="resize:vertical"></textarea>
<div class="row" style="align-items:center;gap:12px"><button class="btn pri" id="supGo">Send</button><span class="msg" id="supM"></span></div></form>
<div id="supDone" hidden><p class="lead" style="margin:6px 0 4px">Sent.</p><p class="note">The Oversite team has your message${user ? ' and your account details' : ''} and will reply as soon as they can.</p><div class="row" style="margin-top:12px"><a class="btn" href="${user ? '/account' : '/'}">${user ? 'Your account' : 'Home'}</a></div></div>
</section></main>`, script: `
document.getElementById('sup').addEventListener('submit',async e=>{e.preventDefault();const b=document.getElementById('supGo'),m=document.getElementById('supM');b.disabled=true;
  try{await api('/api/support',{topic:document.getElementById('supT').value,email:document.getElementById('supE').value.trim(),body:document.getElementById('supB').value,page:document.referrer.slice(0,200)});
    document.getElementById('sup').hidden=true;document.getElementById('supDone').hidden=false}catch(x){say(m,x.message);b.disabled=false}});
` });
// errors (status 400 and up) show their code in place of the logo, so a 404 or a 500 reads at a glance
const CODE_NAMES = { 400: 'Bad request', 401: 'Sign in needed', 402: 'Premium', 403: 'No access', 404: 'Not found', 405: 'Not allowed', 408: 'Timed out', 413: 'Too large', 429: 'Too many requests', 500: 'Server error', 502: 'Bad gateway', 503: 'Unavailable', 504: 'Timed out' };
export const message = ({ logo, user, title, text, action, code }) => layout({ title: `${title} · Oversite`, logo, user, body: `
<section class="hero"><div class="box">${code >= 400 ? `<div class="ecode" aria-label="Error ${code}">${code}</div><p class="ename">Error ${code} · ${esc(CODE_NAMES[code] || 'Error')}</p>` : `<div class="mark"><img src="data:image/png;base64,${logo}" alt=""></div>`}<h1>${esc(title)}</h1><p class="lead">${esc(text)}</p>
${action || code >= 500 ? `<div class="actions">${action ? `<a class="btn pri" href="${esc(action.href)}">${esc(action.label)}</a>` : ''}${code >= 500 ? `<a class="btn" href="/support?topic=bug">Report a problem</a>` : ''}</div>` : ''}</div></section>` });
