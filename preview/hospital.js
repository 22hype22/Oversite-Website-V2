// Hospital (app/hospital.mjs), in the Fire Department MDT. Two sides of one screen:
//   the board: every ambulance on its way with the patient, what they need and how to treat them, the response code and a live
//   ETA; the hospital marks a pre-alert seen, the patient arrived and handed over, and messages the crew;
//   a pre-alert: the crew taking a patient in fills it in on the way, can change it, and reads the hospital's replies.
// Admins put the hospitals on the map. A new pre-alert pops up for everyone on the fire MDT; the board's ETAs refresh every few seconds.
(() => { const OV = window.OVERSITE; if (!OV || !OV.api || (OV.features || {}).hospital === false) return;
  const box = document.getElementById('hoBody'); if (!box) return;
  const API = OV.api + '/hospital', esc = t => String(t ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const call = async (p, b) => { const r = await fetch(API + p, b ? { method: 'POST', headers: { 'content-type': 'application/json', 'x-oversite': '1' }, body: JSON.stringify(b) } : { cache: 'no-store' });
    const j = await r.json().catch(() => ({})); if (!r.ok) throw new Error(j.error || 'Something went wrong (' + r.status + ')'); return j; };
  const css = document.createElement('style'); css.textContent = `#hoBody{display:grid;gap:12px;font-size:13px}
#hoBody .ho-bar{display:flex;align-items:center;justify-content:space-between;gap:10px;flex-wrap:wrap}
#hoBody .ho-card{border:1px solid var(--line);border-radius:12px;padding:12px 14px;display:grid;gap:9px;background:rgba(255,255,255,.02)}
#hoBody .ho-card.c3{border-color:rgba(226,75,75,.55);box-shadow:inset 3px 0 0 #E24B4B}#hoBody .ho-card.done{opacity:.6}
#hoBody .ho-top{display:flex;align-items:flex-start;gap:12px}#hoBody .ho-top .grow{flex:1;min-width:0}#hoBody .ho-top b{font-size:14.5px;color:#fff}#hoBody .ho-top small{display:block;color:var(--mute);margin-top:2px}
#hoBody .ho-eta{text-align:right;flex:none}#hoBody .ho-eta b{font-size:22px;font-weight:600;letter-spacing:-.02em;color:#fff;display:block;line-height:1}#hoBody .ho-eta small{color:var(--mute);font-size:11.5px}
#hoBody .ho-pills{display:flex;gap:5px;flex-wrap:wrap}#hoBody .ho-pill{font-size:11px;font-weight:600;padding:3px 8px;border-radius:999px;background:rgba(255,255,255,.08);color:#E9EAEC}
#hoBody .ho-pill.critical,#hoBody .ho-pill.k3{background:rgba(226,75,75,.2);color:#F6A4A4}#hoBody .ho-pill.serious,#hoBody .ho-pill.k2{background:rgba(242,193,78,.16);color:#F2C14E}#hoBody .ho-pill.stable,#hoBody .ho-pill.k1{background:rgba(70,208,124,.14);color:#7BE3A1}
#hoBody dl{display:grid;grid-template-columns:120px minmax(0,1fr);gap:4px 12px;margin:0}#hoBody dt{color:var(--mute)}#hoBody dd{margin:0;color:#E9EAEC;white-space:pre-wrap;word-break:break-word}
#hoBody .ho-msgs{display:grid;gap:5px;border-top:1px solid var(--line);padding-top:9px}#hoBody .ho-m{font-size:12.5px;line-height:1.45}#hoBody .ho-m b{font-weight:600;color:#fff}#hoBody .ho-m.ems b{color:#F6A4A4}#hoBody .ho-m small{color:var(--mute);margin-left:6px}
#hoBody .ho-say{display:flex;gap:6px}#hoBody input,#hoBody select,#hoBody textarea{font:inherit;font-size:13px;color:#E9EAEC;background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.14);border-radius:9px;padding:8px 10px;min-width:0;width:100%;box-sizing:border-box;color-scheme:dark}
#hoBody textarea{min-height:58px;resize:vertical}#hoBody label{display:grid;gap:4px;color:var(--mute);font-size:12px}#hoBody .ho-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px}#hoBody .ho-grid .full{grid-column:1/-1}
#hoBody .ho-acts{display:flex;gap:6px;flex-wrap:wrap}#hoBody .msg{font-size:12.5px;color:var(--mute)}#hoBody .msg.err{color:#F3A0A0}#hoBody .msg.ok{color:#7BE3A1}
#hoBody .ho-map{height:min(420px,60vh);min-height:260px}#hoBody .ho-h{display:flex;gap:8px;align-items:center}#hoBody .ho-h input{flex:1}
@media (max-width:640px){#hoBody .ho-grid{grid-template-columns:1fr}#hoBody dl{grid-template-columns:1fr}#hoBody dt{margin-top:4px}}`; document.head.appendChild(css);

  let D = null, tab = 'board', edit = null, flash = null, mm = null, places = null, pick = null, timer = 0;
  const mine = () => (D?.inbound || []).find(r => r.by_user === D.me && r.status === 'enroute');
  const etaTxt = r => r.status !== 'enroute' ? `<b style="font-size:15px">${esc(D.status[r.status])}</b>` : r.eta == null ? '<b style="font-size:15px">ETA unknown</b><small>' + (D.hospitals.length ? 'Crew not in game' : 'No hospital placed') + '</small>'
    : `<b>${r.eta === 0 ? 'Arriving' : Math.max(1, Math.round(r.eta / 60)) + ' min'}</b><small>${r.eta ? (r.dist >= 1000 ? (r.dist / 1000).toFixed(1) + ' km' : r.dist + ' m') + ' away' : 'at the hospital'}</small>`;
  const card = r => { const me = r.by_user === D.me, H = D.hospitals.find(h => h.id === r.hospital), open = r.status === 'enroute' || r.status === 'arrived';
    const rows = [['Patient', r.patient], ['What happened', r.complaint], ['Vitals', r.vitals], ['Given so far', r.treatment], ['Needs on arrival', r.needs], ['How to treat', r.advice]].filter(x => x[1]);
    return `<div class="ho-card${r.code === 3 && open ? ' c3' : ''}${open ? '' : ' done'}" data-id="${r.id}">
      <div class="ho-top"><div class="grow"><b>${esc(r.unit || r.by)}</b><small>${esc(r.by)}${H && D.hospitals.length > 1 ? ' → ' + esc(H.name) : ''}${r.where ? ' · ' + esc(r.where) : ''}</small></div><div class="ho-eta">${etaTxt(r)}</div></div>
      <div class="ho-pills"><span class="ho-pill k${r.code}">Code ${r.code}</span><span class="ho-pill ${esc(r.condition)}">${esc(D.conditions[r.condition] || r.condition)}</span>${r.ack_by ? `<span class="ho-pill">Seen by ${esc(r.ack_by)}</span>` : open ? '<span class="ho-pill" style="background:rgba(76,141,255,.16);color:#9DBDFF">Not seen yet</span>' : ''}${r.done_by && !open ? `<span class="ho-pill">${esc(D.status[r.status])} by ${esc(r.done_by)}</span>` : ''}</div>
      <dl>${rows.map(([k, v]) => `<dt>${k}</dt><dd>${esc(v)}</dd>`).join('')}</dl>
      ${r.msgs.length || open ? `<div class="ho-msgs">${r.msgs.map(m => `<div class="ho-m ${m.side}"><b>${esc(m.name)}${m.side === 'ems' ? ' (crew)' : ' (hospital)'}</b>: ${esc(m.text)}<small>${new Date(m.at).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}</small></div>`).join('')}
        ${open ? `<form class="ho-say" data-say="${r.id}"><input maxlength="500" placeholder="${me ? 'Message the hospital' : 'Message the crew'}" aria-label="Message"><button class="btn sm ghost">Send</button></form>` : ''}</div>` : ''}
      ${open ? `<div class="ho-acts">${!me && !r.ack_by ? `<button class="btn sm" data-act="ack" data-id="${r.id}">Seen</button>` : ''}${r.status === 'enroute' ? `<button class="btn sm ghost" data-act="arrived" data-id="${r.id}">Arrived</button>` : ''}<button class="btn sm ghost" data-act="handed" data-id="${r.id}">Handed over</button>${me && r.status === 'enroute' ? `<button class="btn sm ghost" data-edit="${r.id}">Change</button><button class="btn sm ghost" data-act="cancelled" data-id="${r.id}">Cancel</button>` : ''}</div>` : ''}</div>`; };
  const opts = (o, v) => Object.entries(o).map(([k, t]) => `<option value="${k}"${String(k) === String(v) ? ' selected' : ''}>${esc(t)}</option>`).join('');
  const form = () => { const r = edit || {}, H = D.hospitals;
    return `<form id="hoForm" class="ho-card" autocomplete="off"><b style="font-size:14.5px">${r.id ? 'Change the pre-alert' : 'Pre-alert the hospital'}</b>
      <div class="ho-grid">${H.length > 1 ? `<label>Hospital<select name="hospital">${H.map(h => `<option value="${esc(h.id)}"${h.id === r.hospital ? ' selected' : ''}>${esc(h.name)}</option>`).join('')}</select></label>` : ''}
        <label>Unit<input name="unit" maxlength="40" placeholder="Medic 1" value="${esc(r.unit || (window.ME && window.ME.unit) || '')}"></label>
        <label>Response code<select name="code">${opts(D.codes, r.code || 3)}</select></label><label>Condition<select name="condition">${opts(D.conditions, r.condition || 'serious')}</select></label>
        <label class="full">Patient<input name="patient" maxlength="120" placeholder="Male, about 30, conscious" value="${esc(r.patient || '')}"></label>
        <label class="full">What happened<input name="complaint" maxlength="160" placeholder="Car crash, chest pain, gunshot wound to the leg…" value="${esc(r.complaint || '')}"></label>
        <label class="full">Vitals<input name="vitals" maxlength="300" placeholder="HR 120, BP 90/60, SpO2 94%, GCS 14" value="${esc(r.vitals || '')}"></label>
        <label class="full">Given so far<textarea name="treatment" maxlength="600" placeholder="Tourniquet on at 14:02, oxygen, 1 L fluids">${esc(r.treatment || '')}</textarea></label>
        <label class="full">Needs on arrival<textarea name="needs" maxlength="400" placeholder="Trauma team, blood, CT">${esc(r.needs || '')}</textarea></label>
        <label class="full">How to treat them<textarea name="advice" maxlength="800" placeholder="What the doctors should know and do first">${esc(r.advice || '')}</textarea></label></div>
      <div class="ho-acts" style="justify-content:flex-end;align-items:center"><span class="msg" id="hoMsg"></span>${r.id ? '<button type="button" class="btn sm ghost" data-cancel-edit>Back</button>' : ''}<button class="btn sm">${r.id ? 'Update' : 'Send to the hospital'}</button></div></form>`; };
  const placesHTML = () => `<div class="ho-card"><b style="font-size:14.5px">Hospitals on the map</b><span class="msg">Pick a hospital, then click the map where it is. ETAs are worked out to it.</span>
      ${places.map((h, i) => `<div class="ho-h"><input data-hn="${i}" maxlength="40" value="${esc(h.name)}" aria-label="Hospital name"><button type="button" class="btn sm ${pick === i ? '' : 'ghost'}" data-hpick="${i}">${pick === i ? 'Click the map…' : 'Move'}</button><button type="button" class="btn sm ghost" data-hrm="${i}">Remove</button></div>`).join('') || '<span class="msg">No hospital yet.</span>'}
      <div class="ho-map" id="hoMap"></div><div class="ho-acts"><button type="button" class="btn sm ghost" data-hadd>Add a hospital</button><span style="flex:1"></span><span class="msg" id="hoPMsg"></span><button type="button" class="btn sm" data-hsave>Save</button></div></div>`;
  const drawPlaces = p => { if (!mm) return; mm.g.textContent = ''; places.forEach((h, i) => { if (!Number.isFinite(h.x)) return; mm.el('circle', { cx: h.x, cy: h.z, r: 11 * p, fill: '#E24B4B', stroke: '#fff', 'stroke-width': 2, 'vector-effect': 'non-scaling-stroke' });
    mm.el('text', { x: h.x, y: h.z - 16 * p, 'text-anchor': 'middle', 'font-size': 13 * p, 'font-weight': 700, fill: '#fff', 'paint-order': 'stroke', stroke: '#0d1416', 'stroke-width': 3 * p }).textContent = h.name; }); };
  const draw = () => { if (!D) return; const L = D.inbound, live = L.filter(r => r.status === 'enroute' || r.status === 'arrived'), m = mine();
    const seg = `<div class="pd-seg" role="group" aria-label="Show"><button type="button" data-tab="board" aria-pressed="${tab === 'board'}">Board${live.length ? ' (' + live.length + ')' : ''}</button><button type="button" data-tab="send" aria-pressed="${tab === 'send'}">${m ? 'My patient' : 'Pre-alert'}</button>${D.admin ? `<button type="button" data-tab="places" aria-pressed="${tab === 'places'}">Hospitals</button>` : ''}</div>`;
    let body = '';
    if (tab === 'board') body = !D.hospitals.length ? `<div class="pd-empty"><b>No hospital on the map yet</b>${D.admin ? 'Put one on the map under Hospitals so ETAs can be worked out.' : 'An admin puts the hospitals on the map.'}</div>` + L.map(card).join('')
      : L.length ? L.map(card).join('') : '<div class="pd-empty"><b>No patients on the way</b>When a crew sends a pre-alert it shows here with a live ETA.</div>';
    else if (tab === 'send') body = !D.linked ? '<div class="pd-empty"><b>Link your Roblox account</b>The hospital needs to see where you are.</div>' : m && !edit ? card(m) : form();
    else body = placesHTML();
    const keep = document.activeElement && box.contains(document.activeElement) && document.activeElement.matches('input,textarea,select');
    if (keep && tab !== 'places') { box.querySelectorAll('.ho-eta').forEach(e => { const r = L.find(x => x.id === +e.closest('[data-id]')?.dataset.id); if (r) e.innerHTML = etaTxt(r); }); return; }   // typing: only the ETAs change
    box.innerHTML = `<div class="ho-bar">${seg}<span class="msg ${flash?.k || ''}" id="hoFlash">${esc(flash?.t || '')}</span></div>${body}`;
    if (tab === 'places') { mm = window.ovMiniMap(document.getElementById('hoMap'), { off: D.off, onDraw: drawPlaces, onClick: at => { if (pick == null) return; places[pick].x = at[0]; places[pick].z = at[1]; pick = null; draw(); } });
      mm.svg.classList.toggle('pick', pick != null); const h = places.find(x => Number.isFinite(x.x)); if (h && pick == null) mm.fitTo(h.x, h.z, 1800); drawPlaces(mm.px()); } else mm = null; };
  const say = (t, k = '') => { flash = { t, k }; const f = document.getElementById('hoFlash'); if (f) { f.textContent = t; f.className = 'msg ' + k; } };
  const load = async () => { try { D = await call(''); if (!places) places = D.hospitals.map(h => ({ ...h })); draw(); } catch (e) { box.innerHTML = `<div class="pd-empty"><b>Hospital</b>${esc(e.message)}</div>`; } };
  const shown = () => document.querySelector('#mdt .tscreen[data-pane="hospital"]')?.classList.contains('on') && document.body.classList.contains('mdt-open');
  const tick = () => { clearTimeout(timer); timer = setTimeout(async () => { if (shown()) await load(); tick(); }, 5000); };
  document.querySelector('#mdt .tside [data-pane="hospital"]')?.addEventListener('click', () => { load(); tick(); });

  box.addEventListener('click', async e => { const t = e.target.closest('button'); if (!t) return;
    if (t.dataset.tab) { tab = t.dataset.tab; edit = null; flash = null; if (tab === 'places') { places = D.hospitals.map(h => ({ ...h })); pick = null; } return draw(); }
    if (t.dataset.edit) { edit = (D.inbound.find(r => r.id === +t.dataset.edit)) || null; tab = 'send'; return draw(); }
    if (t.hasAttribute('data-cancel-edit')) { edit = null; return draw(); }
    if (t.dataset.act) { if (t.dataset.act === 'cancelled' && !confirm('Cancel this pre-alert?')) return; t.disabled = true; try { D = await call('/act', { id: +t.dataset.id, action: t.dataset.act }); draw(); } catch (x) { say(x.message, 'err'); t.disabled = false; } return; }
    if (t.dataset.hpick != null) { pick = pick === +t.dataset.hpick ? null : +t.dataset.hpick; return draw(); }
    if (t.dataset.hrm != null) { places.splice(+t.dataset.hrm, 1); pick = null; return draw(); }
    if (t.hasAttribute('data-hadd')) { places.push({ name: 'Hospital ' + (places.length + 1), x: NaN, z: NaN }); pick = places.length - 1; return draw(); }
    if (t.hasAttribute('data-hsave')) { const m = document.getElementById('hoPMsg'); if (places.some(h => !Number.isFinite(h.x))) { m.className = 'msg err'; m.textContent = 'Put every hospital on the map first.'; return; }
      try { D = await call('/places', { list: places }); places = D.hospitals.map(h => ({ ...h })); pick = null; flash = { t: 'Saved.', k: 'ok' }; draw(); } catch (x) { m.className = 'msg err'; m.textContent = x.message; } } });
  box.addEventListener('input', e => { if (e.target.dataset.hn != null) places[+e.target.dataset.hn].name = e.target.value; });
  box.addEventListener('submit', async e => { e.preventDefault(); const f = e.target;
    if (f.id === 'hoForm') { const v = Object.fromEntries(new FormData(f)), m = document.getElementById('hoMsg'); m.className = 'msg'; m.textContent = 'Sending…';
      try { D = await call('/send', { ...v, code: +v.code, id: edit?.id }); edit = null; flash = { t: 'The hospital has it.', k: 'ok' }; draw(); } catch (x) { m.className = 'msg err'; m.textContent = x.message; } return; }
    if (f.dataset.say) { const i = f.querySelector('input'), text = i.value.trim(); if (!text) return; const r = D.inbound.find(x => x.id === +f.dataset.say);
      try { i.disabled = true; D = await call('/msg', { id: +f.dataset.say, text, side: r && r.by_user === D.me ? 'ems' : 'hospital' }); i.value = ''; i.disabled = false; i.blur(); draw(); } catch (x) { i.disabled = false; say(x.message, 'err'); } } });

  // a new pre-alert (or a message) for everyone on the fire MDT: refresh the board, and pop up what's coming in
  const pop = t => { let el = document.querySelector('.toast'); if (!el) { el = document.createElement('div'); el.className = 'toast'; document.body.appendChild(el); } el.textContent = t; el.classList.add('on'); clearTimeout(el._h); el._h = setTimeout(() => el.classList.remove('on'), 5200); };
  addEventListener('ov:hospital', async e => { const d = e.detail || {}; if (!document.body.classList.contains('mdt-open') || window.mdtDept !== 'fd') return;
    const was = new Set((D?.inbound || []).map(r => r.id + ':' + r.msgs.length)); await load(); const r = D?.inbound.find(x => x.id === d.id); if (!r) return;
    if (d.kind === 'new' && r.by_user !== D.me) pop(`Pre-alert: ${r.unit || r.by}, Code ${r.code}, ${(D.conditions[r.condition] || '').toLowerCase()}: ${r.complaint}`);
    if (d.kind === 'msg' && !was.has(r.id + ':' + r.msgs.length)) { const m = r.msgs[r.msgs.length - 1]; if (m && m.name !== (OV.me || '')) pop(`${m.side === 'ems' ? r.unit || r.by : 'Hospital'}: ${m.text}`); } });
})();
