// Leave (LOA) from the MDT: your name at the bottom of any MDT opens a menu with "Request leave (LOA)". Pick the department (or
// Server staff, for staff), the first and last day and why; admins answer it on the staff page, and if the server has a bot that
// takes LOA events it posts the request in Discord like its own LOA command would. Your recent requests show underneath.
(() => { const OV = window.OVERSITE; if (!OV || !OV.api) return;
  const API = OV.api + '/loa', esc = t => String(t ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const call = async (p, b) => { const r = await fetch(API + p, b ? { method: 'POST', headers: { 'content-type': 'application/json', 'x-oversite': '1' }, body: JSON.stringify(b) } : { cache: 'no-store' });
    const j = await r.json().catch(() => ({})); if (!r.ok) throw new Error(j.error || 'Something went wrong (' + r.status + ')'); return j; };
  const css = document.createElement('style'); css.textContent = `#loaDlg{width:min(460px,calc(100vw - 32px));max-height:calc(100dvh - 32px);padding:0;border-radius:16px;border:1px solid rgba(255,255,255,.14);background:#16171B;color:#E9EAEC;box-shadow:0 30px 70px rgba(0,0,0,.6)}
#loaDlg::backdrop{background:rgba(0,0,0,.55)}#loaDlg form{display:grid;gap:12px;padding:20px}#loaDlg h2{margin:0;font-size:17px;font-weight:600}#loaDlg h3{margin:6px 0 0;font-size:11px;font-weight:600;letter-spacing:.06em;text-transform:uppercase;color:var(--faint,#62666D)}
#loaDlg .loa-sub{margin:-4px 0 0;font-size:12.5px;line-height:1.5;color:var(--mute,#9A9EA6)}#loaDlg label{display:grid;gap:5px;font-size:12px;color:var(--mute,#9A9EA6)}
#loaDlg input,#loaDlg select,#loaDlg textarea{font:inherit;font-size:13.5px;color:#ECEDEF;background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.12);border-radius:9px;padding:9px 10px;outline:none;color-scheme:dark}
#loaDlg input:focus,#loaDlg select:focus,#loaDlg textarea:focus{border-color:rgba(255,255,255,.32)}#loaDlg select option{background:#16171a}#loaDlg textarea{resize:vertical;min-height:70px}
#loaDlg .loa-2{display:grid;grid-template-columns:1fr 1fr;gap:10px}#loaDlg .loa-act{display:flex;align-items:center;gap:8px}#loaDlg .loa-act .msg{flex:1;font-size:12px;color:var(--mute,#9A9EA6)}#loaDlg .msg.err{color:#F3A0A0}#loaDlg .msg.ok{color:#7FDCA4}
#loaDlg .loa-x{font:inherit;font-size:12.5px;padding:8px 14px;border-radius:999px;border:1px solid rgba(255,255,255,.14);background:none;color:#E9EAEC;cursor:pointer}
#loaDlg .loa-go{font:inherit;font-size:12.5px;font-weight:600;padding:8px 16px;border-radius:999px;border:0;background:#ECEDEF;color:#0B0B0C;cursor:pointer}#loaDlg .loa-go:disabled{opacity:.5;cursor:default}
#loaDlg ul{list-style:none;margin:0;padding:0;display:grid}#loaDlg li{display:flex;align-items:center;gap:10px;padding:9px 0;border-top:1px solid rgba(255,255,255,.08);font-size:12.5px}#loaDlg li:first-child{border-top:0}
#loaDlg li div{flex:1;min-width:0}#loaDlg li b{display:block;font-weight:600;color:#ECEDEF}#loaDlg li small{color:var(--mute,#9A9EA6)}
#loaDlg .tag{font-size:11px;padding:2px 8px;border-radius:999px;border:1px solid rgba(255,255,255,.14);color:#C9CDD3;white-space:nowrap}#loaDlg .tag.ok{color:#7FDCA4;border-color:rgba(70,208,124,.35)}#loaDlg .tag.bad{color:#F3A0A0;border-color:rgba(226,75,75,.35)}#loaDlg .tag.wait{color:#E9C24C;border-color:rgba(233,194,76,.35)}
#loaDlg .loa-c{font:inherit;font-size:11.5px;color:var(--mute,#9A9EA6);background:none;border:0;text-decoration:underline;cursor:pointer;padding:0}
@media (max-width:420px){#loaDlg .loa-2{grid-template-columns:1fr}}`; document.head.appendChild(css);
  const dlg = document.createElement('dialog'); dlg.id = 'loaDlg'; dlg.setAttribute('aria-labelledby', 'loaT'); document.body.appendChild(dlg);
  const iso = t => new Date(t).toISOString().slice(0, 10), today = () => { const d = new Date(); return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10); };
  const plus = (s, n) => { const d = new Date(s + 'T00:00:00Z'); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10); };
  const nice = t => new Date(t).toLocaleDateString([], { month: 'short', day: 'numeric', timeZone: 'UTC' });
  const STATUS = { pending: ['Waiting', 'wait'], approved: ['Approved', 'ok'], denied: ['Denied', 'bad'] };
  let D = null;
  const list = mine => mine && mine.length ? '<ul>' + mine.map(l => `<li><div><b>${esc(l.dept_name)} · ${nice(l.starts)} – ${nice(l.ends)}</b><small>${esc(l.reason)}${l.by && l.status !== 'pending' ? ' · ' + esc(l.by) : ''}</small></div><span class="tag ${(STATUS[l.status] || ['', ''])[1]}">${(STATUS[l.status] || [l.status])[0]}</span>${l.status === 'pending' || (l.status === 'approved' && l.ends > Date.now()) ? `<button type="button" class="loa-c" data-cancel="${l.id}">Cancel</button>` : ''}</li>`).join('') + '</ul>' : '<p class="loa-sub" style="margin:0">None yet.</p>';
  const draw = pick => { const t = today(), dept = D.depts.some(d => d.key === pick) ? pick : D.depts[0]?.key;
    dlg.innerHTML = `<form method="dialog" id="loaF"><h2 id="loaT">Request leave</h2><p class="loa-sub">Ask for time away. Admins answer it on the staff page${D.bot ? ', and your server’s bot posts it in Discord' : ''}.</p>
      ${D.depts.length ? `<label>From<select name="dept">${D.depts.map(d => `<option value="${esc(d.key)}"${d.key === dept ? ' selected' : ''}>${esc(d.name)}</option>`).join('')}</select></label>
      <div class="loa-2"><label>First day<input type="date" name="starts" value="${t}" min="${plus(t, -7)}" required></label><label>Last day<input type="date" name="ends" value="${plus(t, 6)}" min="${t}" required></label></div>
      <label>Reason<textarea name="reason" maxlength="500" rows="3" placeholder="Exams, a trip, a break…" required></textarea></label>` : '<p class="loa-sub">This server has no departments switched on.</p>'}
      <div class="loa-act"><span class="msg" id="loaM" role="status"></span><button type="button" class="loa-x" data-close>Close</button>${D.depts.length ? '<button class="loa-go" id="loaGo">Send request</button>' : ''}</div>
      <h3>Your requests</h3><div id="loaMine">${list(D.mine)}</div></form>`; };
  const say = (t, k = '') => { const m = dlg.querySelector('#loaM'); if (m) { m.textContent = t; m.className = 'msg ' + k; } };
  window.ovLoa = async dept => { try { D = await call(''); } catch (x) { D = { depts: [], mine: [], bot: false, err: x.message }; }
    draw(dept); if (D.err) say(D.err, 'err'); if (!dlg.open) dlg.showModal(); dlg.querySelector('textarea,select')?.focus(); };
  dlg.addEventListener('click', async e => { const t = e.target;
    if (t === dlg || t.closest('[data-close]')) { dlg.close(); return; }   // a click on the backdrop closes it too
    const c = t.closest('[data-cancel]'); if (c) { if (!confirm('Cancel this leave request?')) return; try { const j = await call('/cancel', { id: +c.dataset.cancel }); D.mine = j.mine; dlg.querySelector('#loaMine').innerHTML = list(D.mine); say('Cancelled.', 'ok'); } catch (x) { say(x.message, 'err'); } } });
  dlg.addEventListener('submit', async e => { e.preventDefault(); const f = e.target, go = f.querySelector('#loaGo'); go.disabled = true; say('Sending…');
    try { const j = await call('', { dept: f.dept.value, starts: f.starts.value, ends: f.ends.value, reason: f.reason.value }); D.mine = j.mine; dlg.querySelector('#loaMine').innerHTML = list(D.mine); f.reason.value = '';
      say(D.bot ? 'Sent. Your bot is posting it in Discord.' : 'Sent. Admins see it on the staff page.', 'ok'); } catch (x) { say(x.message, 'err'); } go.disabled = false; });

  // the Staff and Civilian MDTs: your name opens a small menu too
  for (const btn of document.querySelectorAll('[data-umenu]')) { const menu = document.getElementById(btn.getAttribute('aria-controls')); if (!menu) continue;
    const close = () => { menu.classList.remove('open'); btn.setAttribute('aria-expanded', 'false'); };
    btn.addEventListener('click', () => { if (menu.classList.contains('open')) return close(); const av = btn.querySelector('i')?.innerHTML || '';
      menu.innerHTML = `<div class="tm-h"><i>${av}</i><div><b>${esc(OV.me || OV.user || 'You')}</b><small>${btn.dataset.umenu === 'staff' ? 'Server staff' : 'Civilian'}</small></div></div>
        <button type="button" role="menuitem" data-loa>Request leave (LOA)</button><a role="menuitem" href="/account?from=${encodeURIComponent('/' + OV.slug)}">Account settings</a>`;
      menu.classList.add('open'); btn.setAttribute('aria-expanded', 'true'); menu.querySelector('[role="menuitem"]')?.focus({ preventScroll: true }); });
    menu.addEventListener('click', e => { if (e.target.closest('[data-loa]')) { close(); window.ovLoa(btn.dataset.umenu === 'staff' ? '' : undefined); } });
    menu.addEventListener('keydown', e => { if (e.key === 'Escape') { e.stopPropagation(); close(); btn.focus(); } });
    document.addEventListener('pointerdown', e => { if (menu.classList.contains('open') && !menu.contains(e.target) && !btn.contains(e.target)) close(); }); }
})();
