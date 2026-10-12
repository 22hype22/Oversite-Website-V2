/* The Liberty County driver's license, drawn like ER:LC's in-game card (484×303 there, 400×250 here).
   Used by the MDT's card reader and the account page. window.LicenseCard.html(data) returns the card;
   data = { user, rid, display, age, occ, gndr, hair, eyes, hgt, wgt, addr, iss: 'YYYY-MM-DD' }. */
(() => {
  if (window.LicenseCard) return;
  const CSS = `
.lcard{position:relative;width:400px;height:250px;border-radius:13px;overflow:hidden;color:#1C1C1C;font-family:"Montserrat","Helvetica Neue",Arial,sans-serif;text-align:left;line-height:1.2;
  background:radial-gradient(42% 46% at 72% 58%,rgba(170,176,168,.42),transparent 72%),radial-gradient(38% 40% at 20% 92%,rgba(190,196,186,.38),transparent 72%),
    radial-gradient(30% 34% at 95% 20%,rgba(200,204,198,.35),transparent 70%),linear-gradient(180deg,#F7F8F5,#EEF0EB);box-shadow:0 22px 44px rgba(0,0,0,.55),0 0 0 1px rgba(0,0,0,.25)}
.lcard>*{position:absolute}
.lcard .lc-seal{left:11px;top:10px;width:19px;height:19px;border-radius:50%;border:1.5px solid #5F6B58;background:radial-gradient(circle,#F3F4EE 45%,#B9C0AE 46%,#B9C0AE 55%,#F3F4EE 56%)}
.lcard .lc-ttl{left:34px;top:5px;font-size:22px;font-weight:800;color:#38542A;letter-spacing:-.01em;line-height:1.2}
.lcard .lc-kind{right:22px;top:10px;font-size:11.5px;font-weight:500;color:#222}
.lcard .lc-rule{left:136px;right:12px;top:37px;height:5px;border-top:2.5px solid #5C7D44;border-bottom:1px solid #B8C3AC}
.lcard .lc-ph{left:11px;top:43px;width:121px;height:134px;border-radius:8px;overflow:hidden;background:linear-gradient(180deg,#8ED6EA,#B8E8F4)}
.lcard .lc-ph img,.lcard .lc-gh img{width:100%;height:100%;object-fit:cover;object-position:50% 30%;display:block}
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
@media (prefers-reduced-motion:reduce){.lcard.reading .lc-scan{animation:none}.lcard .lc-stamp{transition:none}}`;
  const add = () => { if (document.getElementById('lcardCss')) return; const st = document.createElement('style'); st.id = 'lcardCss'; st.textContent = CSS; document.head.appendChild(st);
    const f = document.createElement('link'); f.rel = 'stylesheet'; f.href = 'https://fonts.googleapis.com/css2?family=Montserrat:wght@400;500;800&family=Reenie+Beanie&display=swap'; document.head.appendChild(f); };
  const esc = t => String(t ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const iss = d => { const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(d || ''); return m ? `${m[2]}/${m[3]}/${m[1]}` : ''; };
  const html = (d = {}) => { add(); const photo = /^\d+$/.test(String(d.rid || '')) ? `<img src="/rbx/bust/${esc(d.rid)}" alt="" onerror="this.remove()">` : '';
    return `<div class="lcard" aria-label="Liberty County driver's license for ${esc(d.user)}"><span class="lc-seal"></span><span class="lc-ttl">Liberty County</span><span class="lc-kind">DRIVER'S LICENSE</span><span class="lc-rule"></span>
      <span class="lc-ph">${photo}</span><span class="lc-sig">${esc(d.display || d.user)}</span>
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
