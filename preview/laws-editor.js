// Settings → Laws: the server's penal code, as the MDT's charge picker uses it. Load a set (the US default or a UK one),
// then add, change and remove laws; the money sign chosen here is what fines show in across the CAD.
(() => {
  const root = document.getElementById('laws'); if (!root) return;
  const A = root.dataset.api, $ = id => document.getElementById(id), list = $('lwList'), msg = $('lwMsg'), save = $('lwSave'), q = $('lwQ');
  const e = t => String(t ?? '').replace(/[&<>"']/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]));
  const say = (t, ok) => { msg.textContent = t || ''; msg.className = 'msg ' + (ok ? 'ok' : 'err'); };
  const call = async (path, b) => { const r = await fetch(A + path, b ? { method: 'POST', headers: { 'content-type': 'application/json', 'x-oversite': '1' }, body: JSON.stringify(b) } : { cache: 'no-store', headers: { 'x-oversite': '1' } });
    const j = await r.json().catch(() => ({})); if (!r.ok) throw new Error(j.error || 'Something went wrong (' + r.status + ')'); return j; };
  const confirmIt = o => typeof ask === 'function' ? ask(o) : Promise.resolve(confirm(o.title));
  let L = [], cur = '$', classes = [], dirty = false;
  const mark = on => { dirty = on; save.disabled = !on; if (on) say(''); };
  const count = () => { $('lwCount').textContent = L.length + (L.length === 1 ? ' law' : ' laws'); };
  const row = (x, i) => '<div class="lw-row" data-i="' + i + '"><input class="k" data-f="0" value="' + e(x[0]) + '" maxlength="14" aria-label="Code" spellcheck="false">' +
    '<input class="t" data-f="1" value="' + e(x[1]) + '" maxlength="80" aria-label="Law">' +
    '<input class="f" data-f="2" type="number" min="0" max="10000000" value="' + e(x[2]) + '" aria-label="Fine">' +
    '<input class="j" data-f="3" type="number" min="0" max="10000" value="' + e(x[3]) + '" aria-label="Jail minutes">' +
    '<select class="c" data-f="4" aria-label="Class">' + classes.map(c => '<option' + (c === x[4] ? ' selected' : '') + '>' + e(c) + '</option>').join('') + '</select>' +
    '<button type="button" class="x" aria-label="Remove ' + e(x[1]) + '" title="Remove">×</button></div>';
  const draw = () => { const s = q.value.trim().toLowerCase();
    const rows = L.map((x, i) => [x, i]).filter(([x]) => !s || x[0].toLowerCase().includes(s) || x[1].toLowerCase().includes(s) || x[4].toLowerCase().startsWith(s));
    list.innerHTML = rows.length ? rows.map(([x, i]) => row(x, i)).join('') : '<p class="note">' + (L.length ? 'No law matches that.' : 'No laws yet. Load a set or add one.') + '</p>'; count(); };
  const curDraw = () => root.querySelectorAll('[data-cur]').forEach(b => b.setAttribute('aria-checked', String(b.dataset.cur === cur)));
  const load = j => { L = j.laws.map(x => [...x]); cur = j.currency || '$'; classes = j.classes;
    $('lwSets').innerHTML = Object.entries(j.sets).map(([k, v]) => '<button type="button" data-set="' + k + '">Load ' + e(v.name) + ' (' + v.count + ')</button>').join('');
    curDraw(); draw(); mark(false); };

  list.addEventListener('input', ev => { const r = ev.target.closest('.lw-row'), f = ev.target.dataset.f; if (!r || f == null) return; const x = L[+r.dataset.i];
    x[+f] = f === '2' || f === '3' ? Math.max(0, Math.round(+ev.target.value || 0)) : f === '0' ? ev.target.value.toUpperCase() : ev.target.value; mark(true); });
  list.addEventListener('change', ev => { if (ev.target.dataset.f === '0') ev.target.value = ev.target.value.toUpperCase(); });
  list.addEventListener('click', ev => { const b = ev.target.closest('.x'); if (!b) return; L.splice(+b.closest('.lw-row').dataset.i, 1); draw(); mark(true); });
  q.addEventListener('input', draw);
  $('lwAdd').addEventListener('click', () => { const pre = (L[L.length - 1]?.[0] || 'L-0').replace(/\d+$/, ''), used = L.filter(x => x[0].startsWith(pre)).map(x => +x[0].slice(pre.length) || 0);   // the next number after the last law's group: JU-05 → JU-06
    L.push([pre + String(Math.max(0, ...used) + 1).padStart(2, '0'), '', 0, 0, L[L.length - 1]?.[4] || classes[0]]); q.value = ''; draw(); mark(true);
    const last = list.querySelector('.lw-row:last-child .t'); if (last) { last.focus(); last.scrollIntoView({ block: 'nearest' }); } });
  root.querySelectorAll('[data-cur]').forEach(b => b.addEventListener('click', () => { cur = b.dataset.cur; curDraw(); mark(true); }));
  $('lwSets').addEventListener('click', async ev => { const b = ev.target.closest('[data-set]'); if (!b) return;
    if (!await confirmIt({ title: b.textContent.replace(/^Load /, 'Load ') + '?', text: 'This replaces the laws listed here with that set. Records already written keep their charges.', ok: 'Load' })) return;
    try { load(await call('/laws/load', { set: b.dataset.set })); say('Loaded. Officers see these laws next time they open a form.', true); } catch (x) { say(x.message); } });
  save.addEventListener('click', async () => { save.disabled = true;
    try { load(await call('/laws', { laws: L, currency: cur })); say('Saved. Officers see the new laws next time they open a form.', true); } catch (x) { say(x.message); save.disabled = false; } });
  addEventListener('beforeunload', ev => { if (dirty) { ev.preventDefault(); ev.returnValue = ''; } });
  call('/laws').then(load).catch(x => { list.innerHTML = '<p class="msg err">' + e(x.message) + '</p>'; });
})();
