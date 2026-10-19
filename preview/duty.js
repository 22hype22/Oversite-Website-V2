// Duty shifts from the MDT: your name at the bottom of a department's MDT opens a menu with your shift. Start and end it here when
// you forget the Discord bot's /shift, add one you forgot altogether, and fix or delete your own (never in the future, never
// overlapping, at most 12 hours). Every change is kept, and the department's supervisors see the list. A linked Oversite bot counts
// these with its Discord shifts, once: time on both at the same moment counts once.
(() => { const OV = window.OVERSITE; if (!OV || !OV.api) return;
  const API = OV.api + '/duty', esc = t => String(t ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const call = async (p, b) => { const r = await fetch(API + p, b ? { method: 'POST', headers: { 'content-type': 'application/json', 'x-oversite': '1' }, body: JSON.stringify(b) } : { cache: 'no-store' });
    const j = await r.json().catch(() => ({})); if (!r.ok) throw new Error(j.error || 'Something went wrong (' + r.status + ')'); return j; };
  const css = document.createElement('style'); css.textContent = `#dutyDlg{width:min(480px,calc(100vw - 32px));max-height:calc(100dvh - 32px);padding:0;border-radius:16px;border:1px solid rgba(255,255,255,.14);background:#16171B;color:#E9EAEC;box-shadow:0 30px 70px rgba(0,0,0,.6);overflow:auto}
#dutyDlg::backdrop{background:rgba(0,0,0,.55)}#dutyDlg .du{display:grid;gap:12px;padding:20px}#dutyDlg h2{margin:0;font-size:17px;font-weight:600}#dutyDlg h3{margin:6px 0 0;font-size:11px;font-weight:600;letter-spacing:.06em;text-transform:uppercase;color:var(--faint,#62666D)}
#dutyDlg .du-sub{margin:-4px 0 0;font-size:12.5px;line-height:1.5;color:var(--mute,#9A9EA6)}#dutyDlg label{display:grid;gap:5px;font-size:12px;color:var(--mute,#9A9EA6)}
#dutyDlg input,#dutyDlg select{font:inherit;font-size:13.5px;color:#ECEDEF;background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.12);border-radius:9px;padding:9px 10px;outline:none;color-scheme:dark;min-width:0}
#dutyDlg input:focus,#dutyDlg select:focus{border-color:rgba(255,255,255,.32)}#dutyDlg select option{background:#16171a}
#dutyDlg .du-now{display:flex;align-items:center;gap:10px;padding:12px;border:1px solid rgba(255,255,255,.1);border-radius:12px;background:rgba(255,255,255,.03)}#dutyDlg .du-now div{flex:1;min-width:0;font-size:13px}
#dutyDlg .du-now b{display:block;font-weight:600}#dutyDlg .du-now small{color:var(--mute,#9A9EA6)}#dutyDlg .dot{width:9px;height:9px;border-radius:50%;background:#62666D;flex:none}#dutyDlg .dot.on{background:#46D07C;box-shadow:0 0 0 4px rgba(70,208,124,.18)}
#dutyDlg .du-2{display:grid;grid-template-columns:1fr 1fr;gap:10px}#dutyDlg .du-act{display:flex;align-items:center;gap:8px;flex-wrap:wrap}#dutyDlg .msg{flex:1;font-size:12px;color:var(--mute,#9A9EA6)}#dutyDlg .msg.err{color:#F3A0A0}#dutyDlg .msg.ok{color:#7FDCA4}
#dutyDlg .du-x{font:inherit;font-size:12.5px;padding:8px 14px;border-radius:999px;border:1px solid rgba(255,255,255,.14);background:none;color:#E9EAEC;cursor:pointer}
#dutyDlg .du-go{font:inherit;font-size:12.5px;font-weight:600;padding:8px 16px;border-radius:999px;border:0;background:#ECEDEF;color:#0B0B0C;cursor:pointer;white-space:nowrap}#dutyDlg .du-go.stop{background:#E24B4B;color:#fff}#dutyDlg button:disabled{opacity:.5;cursor:default}
#dutyDlg ul{list-style:none;margin:0;padding:0;display:grid}#dutyDlg li{display:grid;gap:8px;padding:9px 0;border-top:1px solid rgba(255,255,255,.08);font-size:12.5px}#dutyDlg li:first-child{border-top:0}
#dutyDlg .row{display:flex;align-items:center;gap:10px}#dutyDlg .row div{flex:1;min-width:0}#dutyDlg li b{display:block;font-weight:600;color:#ECEDEF}#dutyDlg li small{color:var(--mute,#9A9EA6)}
#dutyDlg .lnk{font:inherit;font-size:11.5px;color:var(--mute,#9A9EA6);background:none;border:0;text-decoration:underline;cursor:pointer;padding:0}#dutyDlg .lnk.bad{color:#F3A0A0}
#dutyDlg .du-ed{display:grid;gap:8px;padding:10px;border-radius:10px;background:rgba(255,255,255,.03)}
@media (max-width:420px){#dutyDlg .du-2{grid-template-columns:1fr}}`; document.head.appendChild(css);
  const dlg = document.createElement('dialog'); dlg.id = 'dutyDlg'; dlg.setAttribute('aria-labelledby', 'dutyT'); document.body.appendChild(dlg);
  const pad = n => String(n).padStart(2, '0'), local = t => { const d = new Date(t); return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`; };
  const read = v => { const t = new Date(v).getTime(); return Number.isFinite(t) ? t : NaN; };
  const dur = ms => { const m = Math.max(0, Math.round(ms / 60000)), h = Math.floor(m / 60); return h ? `${h}h ${m % 60}m` : `${m}m`; };
  const time = t => new Date(t).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }), day = t => new Date(t).toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' });
  const span = (a, b) => `${day(a)}, ${time(a)} – ${b ? (new Date(a).toDateString() === new Date(b).toDateString() ? '' : day(b) + ', ') + time(b) : 'now'}`;
  let D = null, dept = '', editing = 0, adding = false, changes = null;
  window.ovDutyLabel = () => D?.open ? `End shift (${dur(Date.now() - D.open.started)})` : 'Start shift';
  const refresh = async () => { try { D = await call(''); } catch (x) { D = null; } };
  const edForm = (s, isNew) => `<div class="du-ed" data-form="${isNew ? 'add' : s.id}">${isNew ? `<label>Department<select name="dept">${D.depts.map(d => `<option value="${esc(d.key)}"${d.key === dept ? ' selected' : ''}>${esc(d.name)}</option>`).join('')}</select></label>` : ''}
      <div class="du-2"><label>Started<input type="datetime-local" name="started" value="${local(s ? s.started : Date.now() - 3600000)}" max="${local(Date.now())}" required></label>${!s || s.ended ? `<label>Ended<input type="datetime-local" name="ended" value="${local(s ? s.ended : Date.now())}" max="${local(Date.now())}" required></label>` : '<label>Ended<input value="Still on shift" disabled></label>'}</div>
      <div class="du-act"><button type="button" class="du-go" data-save>${isNew ? 'Add shift' : 'Save'}</button><button type="button" class="du-x" data-cancel>Cancel</button></div></div>`;
  const draw = () => { const o = D.open, wk = Object.entries(D.week || {}).filter(([, ms]) => ms > 0);
    dlg.innerHTML = `<div class="du"><h2 id="dutyT">Your shifts</h2><p class="du-sub">Start and end your shift here when you forget to in Discord.${D.bot ? ' Your server’s bot counts these too, and time on both at once only counts once.' : ''}${D.bot && !D.linked ? ' <b>Link Discord in Account settings</b> so the bot knows these are yours.' : ''}</p>
      ${D.depts.length ? `<div class="du-now"><i class="dot${o ? ' on' : ''}"></i>${o ? `<div><b>On shift with ${esc(o.dept_name)}</b><small>Since ${time(o.started)}, ${dur(Date.now() - o.started)} so far. It ends itself after 12 hours.</small></div><button type="button" class="du-go stop" data-end>End shift</button>`
        : `<div><b>Off shift</b>${D.depts.length > 1 ? `<select name="dept" aria-label="Department" style="margin-top:6px;width:100%">${D.depts.map(d => `<option value="${esc(d.key)}"${d.key === dept ? ' selected' : ''}>${esc(d.name)}</option>`).join('')}</select>` : `<small>${esc(D.depts[0].name)}</small>`}</div><button type="button" class="du-go" data-start>Start shift</button>`}</div>`
        : '<p class="du-sub">This server has no departments switched on.</p>'}
      ${wk.length ? `<p class="du-sub" style="margin:0">This week: ${wk.map(([k, ms]) => `${esc(D.depts.find(d => d.key === k)?.name || k)} ${dur(ms)}`).join(' · ')}</p>` : ''}
      <div class="du-act"><span class="msg" id="dutyM" role="status"></span></div>
      <h3>Recent shifts</h3>${D.shifts.length ? '<ul>' + D.shifts.map(s => `<li><div class="row"><div><b>${esc(s.dept_name)} · ${s.ended ? dur(s.ended - s.started) : 'on now'}</b><small>${span(s.started, s.ended)}</small></div>
        <button type="button" class="lnk" data-edit="${s.id}">Edit</button><button type="button" class="lnk bad" data-del="${s.id}">Delete</button></div>${editing === s.id ? edForm(s) : ''}</li>`).join('') + '</ul>' : '<p class="du-sub" style="margin:0">None yet.</p>'}
      ${D.depts.length ? (adding ? edForm(null, true) : '<div><button type="button" class="lnk" data-add>Add a shift you forgot to start</button></div>') : ''}
      ${D.supervises.length ? `<h3>Changes to shifts</h3><div id="dutyC">${changes ? changeList() : '<button type="button" class="lnk" data-changes>Show who changed or deleted shifts</button>'}</div>` : ''}
      <div class="du-act" style="justify-content:flex-end"><button type="button" class="du-x" data-close>Close</button></div></div>`; };
  const line = l => { const d = esc(l.dept_name), by = ' · by ' + esc(l.by), at = ' · ' + day(l.at) + ' ' + time(l.at);
    if (l.action === 'auto_end') return [`${esc(l.who)} left a ${d} shift open, so it ended after 12 hours`, span(l.after.started, l.after.ended) + at];
    if (l.action === 'add') return [`${esc(l.who)} added a ${d} shift`, span(l.after.started, l.after.ended) + by + at];
    if (l.action === 'delete') return [`${esc(l.who)} deleted a ${d} shift`, span(l.before.started, l.before.ended) + by + at];
    return [`${esc(l.who)} changed a ${d} shift`, span(l.before.started, l.before.ended) + ' → ' + span(l.after.started, l.after.ended) + by + at]; };
  const changeList = () => changes.length ? '<ul>' + changes.map(l => { const [t, sm] = line(l); return `<li><div><b>${t}</b><small>${sm}</small></div></li>`; }).join('') + '</ul>' : '<p class="du-sub" style="margin:0">Nobody has changed a shift.</p>';
  const say = (t, k = '') => { const m = dlg.querySelector('#dutyM'); if (m) { m.textContent = t; m.className = 'msg ' + k; } };
  const act = async (p, b, done) => { try { D = await call(p, b); editing = 0; adding = false; draw(); say(done, 'ok'); } catch (x) { say(x.message, 'err'); } };
  window.ovDuty = async d => { await refresh(); if (!D) { D = { depts: [], shifts: [], week: {}, supervises: [] }; }
    dept = D.depts.some(x => x.key === d) ? d : D.open?.dept || D.depts[0]?.key || ''; editing = 0; adding = false; changes = null; draw(); if (!dlg.open) dlg.showModal(); };
  dlg.addEventListener('change', e => { if (e.target.matches('.du-now [name=dept]')) dept = e.target.value; });
  dlg.addEventListener('click', async e => { const t = e.target;
    if (t === dlg || t.closest('[data-close]')) { dlg.close(); return; }
    if (t.closest('[data-start]')) { t.disabled = true; return act('/start', { dept }, 'On shift. End it here or in Discord when you’re done.'); }
    if (t.closest('[data-end]')) { t.disabled = true; return act('/end', {}, 'Shift ended.'); }
    if (t.closest('[data-edit]')) { const id = +t.closest('[data-edit]').dataset.edit; editing = editing === id ? 0 : id; adding = false; draw(); return; }
    if (t.closest('[data-add]')) { adding = true; editing = 0; draw(); dlg.querySelector('[data-form=add] input')?.focus(); return; }
    if (t.closest('[data-cancel]')) { editing = 0; adding = false; draw(); return; }
    if (t.closest('[data-del]')) { if (!confirm('Delete this shift? Its time stops counting, here and on the bot. Supervisors can see that you deleted it.')) return; return act('/delete', { id: +t.closest('[data-del]').dataset.del }, 'Shift deleted.'); }
    if (t.closest('[data-changes]')) { try { changes = (await call('/changes')).changes; dlg.querySelector('#dutyC').innerHTML = changeList(); } catch (x) { say(x.message, 'err'); } return; }
    const sv = t.closest('[data-save]'); if (sv) { const f = sv.closest('[data-form]'), started = read(f.querySelector('[name=started]').value), endEl = f.querySelector('[name=ended]:not([disabled])'), ended = endEl ? read(endEl.value) : null;
      if (f.dataset.form === 'add') return act('/add', { dept: f.querySelector('[name=dept]').value, started, ended }, 'Shift added.');
      return act('/edit', { id: +f.dataset.form, started, ended }, 'Shift saved. The change is logged for supervisors.'); } });
  refresh();   // so the menu can say whether you're on shift
  setInterval(() => { if (!document.hidden && !dlg.open) refresh(); }, 120000);
})();
