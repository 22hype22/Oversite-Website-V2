// MDT sign-in ranks for a Premium server (Settings, Premium): a list per department, lowest first. A rank marked
// supervisor can approve and deny warrants. Saved through /premium/ranks; the MDT picks them up the next time it opens.
(() => {
  const root = document.getElementById('ranks'); if (!root || root.dataset.locked) return;
  const $ = id => document.getElementById(id), msg = $('rkMsg'), list = $('rkList');
  let R = JSON.parse(root.dataset.ranks), dept = 'pd', dirty = false;
  const names = JSON.parse(root.dataset.depts);
  const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
  const mark = () => { dirty = true; $('rkSave').disabled = false; };
  const tabs = () => { $('rkDepts').innerHTML = ['pd', 'fd', 'dot'].map(d => '<button type="button" class="bd-chip' + (d === dept ? ' on' : '') + '" data-d="' + d + '">' + esc(names[d] || d) + '<small>' + R[d].length + '</small></button>').join(''); };
  const draw = () => { tabs(); const L = R[dept];
    list.innerHTML = L.map((r, i) => '<li data-i="' + i + '"><span class="rk-n">' + (i + 1) + '</span><input value="' + esc(r[0]) + '" maxlength="32" aria-label="Rank name" placeholder="Rank name">'
      + '<label class="rk-sup" title="Can approve and deny warrants"><input type="checkbox"' + (r[2] ? ' checked' : '') + '> Supervisor</label>'
      + '<span class="rk-b"><button type="button" data-a="up" aria-label="Move up"' + (i ? '' : ' disabled') + '>&uarr;</button><button type="button" data-a="dn" aria-label="Move down"' + (i < L.length - 1 ? '' : ' disabled') + '>&darr;</button>'
      + '<button type="button" data-a="rm" aria-label="Remove ' + esc(r[0]) + '"' + (L.length > 1 ? '' : ' disabled') + '>&times;</button></span></li>').join('');
    $('rkAdd').disabled = L.length >= 20; };
  $('rkDepts').addEventListener('click', e => { const b = e.target.closest('[data-d]'); if (b) { dept = b.dataset.d; draw(); } });
  list.addEventListener('input', e => { const li = e.target.closest('li'); if (!li) return; const r = R[dept][+li.dataset.i];
    if (e.target.type === 'checkbox') r[2] = e.target.checked; else r[0] = e.target.value; mark(); });
  list.addEventListener('change', e => { if (e.target.type === 'checkbox') { const li = e.target.closest('li'); R[dept][+li.dataset.i][2] = e.target.checked; mark(); } });
  list.addEventListener('click', e => { const b = e.target.closest('[data-a]'); if (!b) return; const L = R[dept], i = +b.closest('li').dataset.i;
    if (b.dataset.a === 'rm') L.splice(i, 1); else { const j = b.dataset.a === 'up' ? i - 1 : i + 1; [L[i], L[j]] = [L[j], L[i]]; }
    mark(); draw(); });
  $('rkAdd').addEventListener('click', () => { R[dept].push(['', 0, R[dept].at(-1)?.[2] || false]); mark(); draw(); list.querySelector('li:last-child input').focus(); });
  const send = async body => { $('rkSave').disabled = true;
    try { const j = await api(root.dataset.api + '/premium/ranks', body); R = j.ranks; dirty = false; draw(); say(msg, body.reset ? 'Back to the default ranks.' : 'Saved. Members see the new ranks next time they open the MDT.', true); }
    catch (e) { $('rkSave').disabled = false; say(msg, e.message); } };
  $('rkSave').addEventListener('click', () => send({ ranks: Object.fromEntries(Object.entries(R).map(([d, L]) => [d, L.map(r => ({ name: r[0], sup: !!r[2] }))])) }));
  $('rkReset').addEventListener('click', async () => { if (await ask({ title: 'Go back to the default ranks?', text: 'Your own rank lists for all three departments are replaced with Oversite’s defaults.', ok: 'Reset' })) send({ reset: true }); });
  // leaving with unsaved changes: the site's own dialog when a link is clicked, instead of the browser's "Changes you made may not be saved"
  (window.ovUnsaved = window.ovUnsaved || []).push(() => dirty && 'the MDT ranks');
  if (!window.ovLeaveGuard) { window.ovLeaveGuard = true;
    document.addEventListener('click', async e => { const a = e.target.closest('a[href]'); if (!a || e.defaultPrevented || e.button || e.metaKey || e.ctrlKey || e.shiftKey || a.target === '_blank') return;
      const href = a.getAttribute('href'); if (href.startsWith('#')) return;   // the Settings tabs keep what you were editing
      const what = window.ovUnsaved.map(f => f()).filter(Boolean); if (!what.length) return; e.preventDefault();
      if (await ask({ title: 'Leave without saving?', text: 'Your changes to ' + what.join(' and ') + ' are not saved yet.', ok: 'Leave', danger: true })) { window.ovUnsaved.length = 0; location.href = a.href; } }, true); }
  draw();
})();
