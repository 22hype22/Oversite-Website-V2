/* The Liberty County driver's license, drawn like ER:LC's in-game card (484×303 there, 400×250 here).
   Used by the MDT's card reader and the account page. window.LicenseCard.html(data) returns the card;
   data = { user, rid, display, age, occ, gndr, hair, eyes, hgt, wgt, addr, iss: 'YYYY-MM-DD' }, plus a Premium server's own
   style: { title, color: '#rrggbb', seal: image url }, and a Premium player's own: { finish: 'gold'|'holo'|'obsidian', sig }. */
(() => {
  if (window.LicenseCard) return;
  const CSS = `
.lcard{--lc:#38542A;--lc2:#5C7D44;position:relative;width:400px;height:250px;border-radius:13px;overflow:hidden;color:#1C1C1C;font-family:"Montserrat","Helvetica Neue",Arial,sans-serif;text-align:left;line-height:1.2;
  background:radial-gradient(42% 46% at 72% 58%,rgba(170,176,168,.42),transparent 72%),radial-gradient(38% 40% at 20% 92%,rgba(190,196,186,.38),transparent 72%),
    radial-gradient(30% 34% at 95% 20%,rgba(200,204,198,.35),transparent 70%),linear-gradient(180deg,#F7F8F5,#EEF0EB);box-shadow:0 22px 44px rgba(0,0,0,.55),0 0 0 1px rgba(0,0,0,.25)}
.lcard>*{position:absolute}
.lcard .lc-seal{left:10px;top:8px;width:22px;height:22px;border-radius:50%;background:url(/lc-seal.png?v=1) center/contain no-repeat}.lcard .lc-seal.own{background:none;overflow:hidden}.lcard .lc-seal.own img{width:100%;height:100%;object-fit:cover;border-radius:50%}
.lcard .lc-ttl{left:34px;top:5px;max-width:230px;overflow:hidden;white-space:nowrap;text-overflow:ellipsis;font-size:22px;font-weight:800;color:var(--lc);letter-spacing:-.01em;line-height:1.2}
.lcard .lc-kind{right:22px;top:10px;font-size:11.5px;font-weight:500;color:#222}
.lcard .lc-rule{left:136px;right:12px;top:37px;height:5px;border-top:2.5px solid var(--lc2);border-bottom:1px solid color-mix(in srgb,var(--lc2) 40%,#fff)}
.lcard .lc-ph{left:11px;top:43px;width:121px;height:134px;border-radius:8px;overflow:hidden;background:linear-gradient(180deg,#8ED6EA,#B8E8F4)}
.lcard .lc-ph img,.lcard .lc-gh img{position:absolute;left:50%;top:5%;width:168%;height:auto;max-width:none;transform:translateX(-50%);display:block}
.lcard .lc-ph,.lcard .lc-gh{position:absolute}
.lcard .lc-sig{left:22px;width:100px;top:186px;text-align:center;font-family:"Reenie Beanie","Bradley Hand","Segoe Script",cursive;font-size:17px;color:#6A6A6A;transform:rotate(-2deg);white-space:nowrap;overflow:hidden}
.lcard .lc-un{left:137px;top:56px;max-width:122px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-size:12.5px;font-weight:800;color:#203B6E}
.lcard .lc-iss{left:263px;top:56px;font-size:12.5px}.lcard .lc-iss b,.lcard .lc-k b,.lcard .lc-row b{font-weight:800;color:#203B6E}
.lcard .lc-iss b{margin-right:5px}
.lcard .lc-dn{left:137px;top:76px;font-size:11px;max-width:240px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.lcard .lc-k{left:137px;display:flex;align-items:baseline}.lcard .lc-k b{width:38px;font-size:11.5px}.lcard .lc-k span{font-size:14.5px;color:#2F7322;white-space:nowrap}
.lcard .lc-k1{top:102px}.lcard .lc-k2{top:126px}
.lcard .lc-addr{left:137px;top:160px;font-size:11.5px;max-width:180px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.lcard .lc-gh{left:320px;top:122px;width:58px;height:66px;overflow:hidden;opacity:.72;background:#9FBFC8}
.lcard .lc-row{left:139px;display:flex;font-size:13.5px}.lcard .lc-row>span{width:84px;white-space:nowrap}.lcard .lc-row b{font-size:11px;margin-right:5px}
.lcard .lc-r1{top:206px}.lcard .lc-r2{top:225px}
.lcard .lc-scan{left:0;right:0;top:0;height:30px;background:linear-gradient(180deg,transparent,rgba(224,69,59,.28),transparent);opacity:0}
.lcard.reading .lc-scan{animation:lcScan .9s ease-in-out 2}
@keyframes lcScan{0%{transform:translateY(-30px);opacity:1}100%{transform:translateY(250px);opacity:1}}
.lcard .lc-stamp{right:10px;top:92px;font:700 9.5px ui-monospace,SFMono-Regular,Menlo,monospace;letter-spacing:.08em;color:#2F7A3B;border:1.5px solid #2F7A3B;border-radius:4px;padding:2px 6px;transform:rotate(6deg) scale(1.3);opacity:0;transition:opacity .25s,transform .3s cubic-bezier(.34,1.5,.64,1)}
.lcard.ok .lc-stamp{opacity:.9;transform:rotate(6deg)}
/* Premium finishes */
.lcard.f-gold{background:radial-gradient(60% 70% at 78% 30%,rgba(255,240,200,.75),transparent 70%),linear-gradient(135deg,#F4E2B0,#E2C47C 45%,#F1DCA4 70%,#D8B565);box-shadow:0 22px 44px rgba(0,0,0,.55),0 0 0 1px #B68A2E,inset 0 0 0 2px rgba(255,236,180,.6)}
.lcard.f-gold .lc-ttl{color:#7A5413}.lcard.f-gold .lc-rule{border-top-color:#9C7224;border-bottom-color:rgba(156,114,36,.35)}.lcard.f-gold .lc-k span{color:#6B4A10}
.lcard.f-gold:after,.lcard.f-holo:after{content:"";position:absolute;inset:0;pointer-events:none;background:linear-gradient(115deg,transparent 30%,rgba(255,255,255,.55) 45%,transparent 60%);background-size:250% 100%;animation:lcSheen 5s ease-in-out infinite}
.lcard.f-holo:before{content:"";position:absolute;inset:0;pointer-events:none;mix-blend-mode:color;opacity:.55;background:linear-gradient(120deg,#ff8ad8,#8affd2,#8ab8ff,#ffe48a,#ff8ad8);background-size:300% 300%;animation:lcHolo 7s linear infinite}
.lcard.f-obsidian{color:#E9EAEC;background:radial-gradient(50% 60% at 80% 25%,rgba(120,130,150,.25),transparent 70%),linear-gradient(160deg,#25272C,#141518 60%,#1D1F23);box-shadow:0 22px 44px rgba(0,0,0,.6),0 0 0 1px #3A3D44}
.lcard.f-obsidian .lc-kind,.lcard.f-obsidian .lc-dn,.lcard.f-obsidian .lc-addr,.lcard.f-obsidian .lc-iss,.lcard.f-obsidian .lc-row{color:#D7D9DE}.lcard.f-obsidian .lc-un,.lcard.f-obsidian .lc-iss b,.lcard.f-obsidian .lc-k b,.lcard.f-obsidian .lc-row b{color:#9EC1FF}
.lcard.f-obsidian .lc-ttl{color:#E8B33A}.lcard.f-obsidian .lc-rule{border-top-color:#E8B33A;border-bottom-color:rgba(232,179,58,.3)}.lcard.f-obsidian .lc-k span{color:#7EE29A}.lcard.f-obsidian .lc-sig{color:#B9BCC4}
@keyframes lcSheen{0%,60%{background-position:120% 0}100%{background-position:-120% 0}}@keyframes lcHolo{to{background-position:300% 0}}
@media (prefers-reduced-motion:reduce){.lcard.reading .lc-scan{animation:none}.lcard .lc-stamp{transition:none}.lcard:before,.lcard:after{animation:none!important}}`;
  const add = () => { if (document.getElementById('lcardCss')) return; const st = document.createElement('style'); st.id = 'lcardCss'; st.textContent = CSS; document.head.appendChild(st);
    const f = document.createElement('link'); f.rel = 'stylesheet'; f.href = 'https://fonts.googleapis.com/css2?family=Montserrat:wght@400;500;800&family=Reenie+Beanie&display=swap'; document.head.appendChild(f); };
  const esc = t => String(t ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const iss = d => { const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(d || ''); return m ? `${m[2]}/${m[3]}/${m[1]}` : ''; };
  const html = (d = {}) => { add(); const photo = /^\d+$/.test(String(d.rid || '')) ? `<img src="/rbx/bust/${esc(d.rid)}" alt="" onerror="this.remove()">` : '';
    const col = /^#[0-9a-fA-F]{6}$/.test(d.color || '') ? d.color : '', ttl = d.title || 'Liberty County', seal = /^\/[\w\/.?=-]+$/.test(d.seal || '') ? `<span class="lc-seal own"><img src="${esc(d.seal)}" alt="" onerror="this.parentNode.className='lc-seal'"></span>` : '<span class="lc-seal"></span>';
    const fin = ['gold', 'holo', 'obsidian'].includes(d.finish) ? ' f-' + d.finish : '';
    return `<div class="lcard${fin}" style="${col ? `--lc:${col};--lc2:${col}` : ''}" aria-label="${esc(ttl)} driver's license for ${esc(d.user)}">${seal}<span class="lc-ttl">${esc(ttl)}</span><span class="lc-kind">DRIVER'S LICENSE</span><span class="lc-rule"></span>
      <span class="lc-ph">${photo}</span><span class="lc-sig">${esc(d.sig || d.display || d.user)}</span>
      <span class="lc-un">@${esc(String(d.user || '').toUpperCase())}</span><span class="lc-iss"><b>ISS</b>${esc(iss(d.iss))}</span><span class="lc-dn">${esc(d.display)}</span>
      <span class="lc-k lc-k1"><b>AGE</b><span>${esc(d.age)}</span></span><span class="lc-k lc-k2"><b>OCC</b><span>${esc(d.occ)}</span></span><span class="lc-addr">Address: ${esc(d.addr || 'N/A')}</span>
      <span class="lc-gh">${photo}</span>
      <span class="lc-row lc-r1"><span><b>GNDR</b>${esc(d.gndr)}</span><span><b>HAIR</b>${esc(d.hair)}</span><span><b>EYES</b>${esc(d.eyes)}</span></span>
      <span class="lc-row lc-r2"><span><b>HGT</b>${esc(d.hgt)}</span><span><b>WGT</b>${esc(d.wgt)}</span></span>
      <span class="lc-scan"></span><span class="lc-stamp">VERIFIED</span></div>`; };
  // what ER:LC calls you on the license: your team in game
  const OCC = { Fire: 'Firefighter', Police: 'Police Officer', Sheriff: 'Sheriff Deputy', DOT: 'DOT Worker', Civilian: 'Civilian', Jail: 'Inmate' };
  window.LicenseCard = { html, occ: team => OCC[team] || team || '' };
})();
