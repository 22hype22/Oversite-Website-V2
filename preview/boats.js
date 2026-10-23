// Boats (app/boats.mjs), an app on the Civilian phone: get a boating license, register boats (each gets a hull number police can
// search), report one stolen or recovered, take one off the register. Admins set the fees and whether a license is needed first.
(() => { const start = () => { const P = window.ovPhone, OV = window.OVERSITE || {}; if (!P || !OV.api || (OV.features || {}).boats === false) return;
  const API = OV.api + '/boats', CUR = OV.currency || '$', money = n => CUR + Math.round(n).toLocaleString('en-US'), esc = P.esc;
  const call = async (p, b) => { const r = await fetch(API + p, b ? { method: 'POST', headers: { 'content-type': 'application/json', 'x-oversite': '1' }, body: JSON.stringify(b) } : { cache: 'no-store' });
    const j = await r.json().catch(() => ({})); if (!r.ok) throw new Error(j.error || 'Something went wrong (' + r.status + ')'); return j; };
  const css = document.createElement('style'); css.textContent = `.bt-app{display:grid;gap:10px;font-size:13px;color:#E9EAEC}
.bt-app .bt-card{border:1px solid rgba(255,255,255,.1);border-radius:14px;padding:12px;display:grid;gap:9px;background:rgba(255,255,255,.03)}.bt-app h4{margin:0;font-size:14px;font-weight:600}
.bt-app .bt-sub{color:#9A9EA6;font-size:12px;line-height:1.45}.bt-app .msg{font-size:12px;color:#9A9EA6}.bt-app .msg.err{color:#F3A0A0}.bt-app .msg.ok{color:#7BE3A1}
.bt-app .bt-lic{border-radius:14px;padding:14px;background:linear-gradient(135deg,#0E4F7A,#0A2F4A 60%,#0C3B5C);border:1px solid rgba(120,190,255,.25);display:grid;gap:4px}
.bt-app .bt-lic small{color:#9CC8EA;font-size:10.5px;letter-spacing:.08em;text-transform:uppercase}.bt-app .bt-lic b{font-size:18px;letter-spacing:.04em}.bt-app .bt-lic.bad{background:linear-gradient(135deg,#5A1E1E,#331010);border-color:rgba(255,120,120,.3)}
.bt-app input,.bt-app select{font:inherit;font-size:13px;color:#E9EAEC;background:rgba(255,255,255,.05);border:1px solid rgba(255,255,255,.14);border-radius:9px;padding:8px 10px;min-width:0;width:100%;box-sizing:border-box;color-scheme:dark}
.bt-app label{display:grid;gap:4px;color:#9A9EA6;font-size:12px}.bt-app .bt-two{display:grid;grid-template-columns:1fr 1fr;gap:8px}.bt-app .bt-acts{display:flex;gap:6px;flex-wrap:wrap;align-items:center}
.bt-app .bt-btn{font:inherit;font-size:12.5px;font-weight:600;padding:8px 13px;border-radius:999px;border:1px solid rgba(255,255,255,.16);background:none;color:#E9EAEC;cursor:pointer;white-space:nowrap}
.bt-app .bt-btn.go{background:#ECEDEF;color:#0B0B0C;border-color:#ECEDEF}.bt-app .bt-btn.bad{color:#F6A4A4;border-color:rgba(226,75,75,.5)}.bt-app .bt-btn:disabled{opacity:.5}
.bt-app .bt-boat{display:grid;gap:6px;padding:10px 0;border-top:1px solid rgba(255,255,255,.07)}.bt-app .bt-boat:first-child{border-top:0;padding-top:0}
.bt-app .bt-hull{display:inline-block;font:700 12px/1 ui-monospace,Menlo,monospace;letter-spacing:.06em;padding:4px 7px;border-radius:6px;background:#F0F2F5;color:#0B0B0C}.bt-app .bt-stolen{font-size:11px;font-weight:700;color:#F6A4A4;margin-left:6px}
.bt-app .bt-chk{display:flex;gap:8px;align-items:center;color:#E9EAEC}.bt-app .bt-chk input{width:auto}`; document.head.appendChild(css);
  let D = null, sec = null, flash = null;
  const draw = () => { if (!D) return; const L = D.license, cf = D.conf, ok = L.status === 'Valid';
    sec.innerHTML = `<div class="thead"><div><h2>Boats</h2><small>Your boating license and registered boats</small></div></div><div class="bt-app">
      <span class="msg ${flash?.k || ''}" id="btFlash">${esc(flash?.t || '')}</span>
      ${L.status === 'None' ? `<div class="bt-card"><h4>Boating license</h4><div class="bt-sub">You need one to take a boat out${cf.needLicense ? ' and to register a boat' : ''}.${cf.licenseFee ? ` It costs ${money(cf.licenseFee)}, from your bank account.` : ''}</div><div class="bt-acts"><button class="bt-btn go" data-lic>${cf.licenseFee ? 'Get a boating license, ' + money(cf.licenseFee) : 'Get a boating license'}</button></div></div>`
        : `<div class="bt-lic${ok ? '' : ' bad'}"><small>Boating license${ok ? '' : ' · ' + esc(L.status)}</small><b>${esc(L.number || '—')}</b><span class="bt-sub" style="color:#CFE3F3">${esc(D.name)}${L.issued ? ' · issued ' + new Date(L.issued).toLocaleDateString() : ''}</span>${ok ? '' : '<span class="bt-sub" style="color:#F6C1C1">Police have ' + esc(L.status.toLowerCase()) + ' it. Only they can reinstate it.</span>'}</div>`}
      <div class="bt-card"><h4>My boats</h4>${D.boats.map(b => `<div class="bt-boat"><div><span class="bt-hull">${esc(b.hull)}</span>${b.stolen ? '<span class="bt-stolen">REPORTED STOLEN</span>' : ''}</div><div><b>${esc(b.name || b.model)}</b><div class="bt-sub">${esc([b.name ? b.model : '', b.color, b.length].filter(Boolean).join(' · ') || 'Registered')}</div></div>
          <div class="bt-acts"><button class="bt-btn" data-stolen="${b.id}" data-on="${b.stolen ? '' : 1}">${b.stolen ? 'It’s been found' : 'Report stolen'}</button><button class="bt-btn bad" data-rm="${b.id}">Sold or scrapped</button></div></div>`).join('') || '<div class="bt-sub">No boats registered yet.</div>'}</div>
      <form class="bt-card" id="btReg" autocomplete="off"><h4>Register a boat</h4>${cf.needLicense && !ok ? '<div class="bt-sub">Get a boating license first.</div>' : ''}
        <div class="bt-two"><label>Type<select name="model">${D.models.map(m => `<option>${esc(m)}</option>`).join('')}</select></label><label>Name<input name="name" maxlength="30" placeholder="Sea Breeze"></label></div>
        <div class="bt-two"><label>Colour<input name="color" maxlength="20" placeholder="White"></label><label>Length<input name="length" maxlength="12" placeholder="6 m"></label></div>
        <div class="bt-acts"><button class="bt-btn go"${cf.needLicense && !ok ? ' disabled' : ''}>${cf.regFee ? 'Register, ' + money(cf.regFee) : 'Register'}</button><span class="bt-sub">It gets a hull number police can look up.</span></div></form>
      ${D.admin ? `<form class="bt-card" id="btSet" autocomplete="off"><h4>Boat settings</h4><div class="bt-two"><label>License fee (${esc(CUR)})<input name="licenseFee" type="number" min="0" value="${cf.licenseFee}"></label><label>Registration fee (${esc(CUR)})<input name="regFee" type="number" min="0" value="${cf.regFee}"></label></div>
        <label class="bt-chk"><input type="checkbox" name="needLicense"${cf.needLicense ? ' checked' : ''}> A boating license is needed to register a boat</label><div class="bt-acts"><button class="bt-btn go">Save</button></div></form>` : ''}</div>`; };
  const load = async () => { try { D = await call(''); draw(); } catch (e) { sec.innerHTML = `<div class="bt-app"><div class="bt-card"><h4>Boats</h4><div class="bt-sub">${esc(e.message)}</div></div></div>`; } };
  const act = async (p, b, okMsg) => { try { D = await call(p, b); flash = { t: okMsg, k: 'ok' }; draw(); } catch (x) { flash = { t: x.message, k: 'err' }; draw(); } };
  P.addApp({ id: 'boats', name: 'Boats', color: 'linear-gradient(180deg,#3FB6F2,#1272C9)', before: 'transit',
    icon: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M3 15h18l-2.5 4.5h-13z"/><path d="M12 3v12M12 4l6 9h-6"/><path d="M2 21c1.5 0 1.5-1 3-1s1.5 1 3 1 1.5-1 3-1 1.5 1 3 1 1.5-1 3-1 1.5 1 3 1"/></svg>',
    render: s => { sec = s; sec.addEventListener('click', e => { const t = e.target.closest('button[data-lic],button[data-stolen],button[data-rm]'); if (!t) return;
        if (t.hasAttribute('data-lic')) { e.preventDefault(); act('/license', {}, 'You have a boating license now.'); }
        if (t.dataset.stolen) act('/stolen', { id: +t.dataset.stolen, stolen: !!t.dataset.on }, t.dataset.on ? 'Reported stolen. Police will see it when they look it up.' : 'Marked as found.');
        if (t.dataset.rm && confirm('Take this boat off the register?')) act('/remove', { id: +t.dataset.rm }, 'Taken off the register.'); });
      sec.addEventListener('submit', e => { e.preventDefault(); const f = e.target, v = Object.fromEntries(new FormData(f));
        if (f.id === 'btReg') call('/register', v).then(j => { D = j; flash = { t: `Registered. Hull number ${j.hull}.`, k: 'ok' }; draw(); }).catch(x => { flash = { t: x.message, k: 'err' }; draw(); });
        if (f.id === 'btSet') act('/settings', { licenseFee: +v.licenseFee || 0, regFee: +v.regFee || 0, needLicense: !!f.elements.needLicense.checked }, 'Saved.'); }); },
    onOpen: () => { flash = null; load(); } }); };
  window.ovPhone ? start() : addEventListener('load', () => setTimeout(start, 0));
})();
