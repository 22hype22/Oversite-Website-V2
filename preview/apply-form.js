// The public application form (/<server>/apply/<id>, app/staffpage.mjs): anyone signed in can read it and apply.
(() => {
  const root = document.getElementById('ap'); if (!root) return;
  const API = root.dataset.api;
  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
  const when = t => new Date(t).toLocaleDateString('en-US', { month: 'long', day: 'numeric' });
  const LBL = { pending: ['warn', 'Waiting for an answer'], accepted: ['ok', 'Accepted'], denied: ['bad', 'Not accepted'] };
  const field = (x, i) => { const id = 'q' + i, req = x.req !== false, lab = '<label for="' + id + '">' + esc(x.q) + (req ? '' : ' <span style="color:var(--faint)">(optional)</span>') + '</label>';
    if (x.type === 'long') return lab + '<textarea id="' + id + '" rows="5" maxlength="3000"' + (req ? ' required' : '') + ' style="resize:vertical"></textarea>';
    if (x.type === 'choice' || x.type === 'yesno') { const opts = x.type === 'yesno' ? ['Yes', 'No'] : x.options || [];
      return '<fieldset style="border:0;margin:0;padding:0"><legend style="padding:0;margin:0 0 6px;font-size:13.5px">' + esc(x.q) + (req ? '' : ' <span style="color:var(--faint)">(optional)</span>') + '</legend>'
        + opts.map((o, k) => '<label class="chk" style="margin:4px 0"><input type="radio" name="' + id + '" value="' + esc(o) + '"' + (req && !k ? ' required' : '') + '> ' + esc(o) + '</label>').join('') + '</fieldset>'; }
    return lab + '<input id="' + id + '" maxlength="300"' + (req ? ' required' : '') + '>'; };
  const value = (x, i) => x.type === 'choice' || x.type === 'yesno' ? (root.querySelector('input[name="q' + i + '"]:checked')?.value || '') : (document.getElementById('q' + i)?.value || '');
  (async () => {
    let j; try { const r = await fetch(API, { cache: 'no-store', headers: { 'x-oversite': '1' } }); j = await r.json(); if (!r.ok) throw new Error(j.error || 'This application is closed.'); }
    catch (e) { root.innerHTML = '<section class="card"><h2>Application closed</h2><p class="note">' + esc(e.message) + '</p><div class="row"><a class="btn" href="/explore">Explore servers</a></div></section>'; return; }
    const F = j.form, mine = j.mine || [], waiting = mine.find(a => a.status === 'pending');
    const past = mine.length ? '<section class="card" style="margin-top:18px"><h2>Your applications</h2><ul class="sh-list">' + mine.map(a => '<li><div class="nm"><div><b>' + when(a.created) + '</b>' + (a.note && a.status !== 'pending' ? '<br><small>' + esc(a.note) + '</small>' : '') + '</div></div><span class="tag ' + LBL[a.status][0] + '">' + LBL[a.status][1] + '</span></li>').join('') + '</ul></section>' : '';
    root.innerHTML = '<section class="card"><p class="note" style="margin:0 0 4px">' + esc(root.dataset.server) + '</p><h1 style="margin:0 0 8px;font-size:24px">' + esc(F.title) + '</h1>' + (F.about ? '<p class="note" style="white-space:pre-wrap">' + esc(F.about) + '</p>' : '')
      + (waiting ? '<p class="msg ok">You applied on ' + when(waiting.created) + '. You can see the answer here once the staff team has read it.</p>'
        : '<form id="apF" style="display:flex;flex-direction:column;gap:12px;margin-top:10px">' + F.questions.map(field).join('') + '<div class="row" style="align-items:center;gap:12px"><button class="btn pri">Send application</button><span class="msg" id="apM"></span></div></form>') + '</section>' + past;
    const f = document.getElementById('apF'); if (!f) return;
    f.addEventListener('submit', async e => { e.preventDefault(); const b = f.querySelector('button'); b.disabled = true;
      try { await api(API, { answers: F.questions.map(value) }); location.reload(); } catch (x) { b.disabled = false; say(document.getElementById('apM'), x.message); } });
  })();
})();
