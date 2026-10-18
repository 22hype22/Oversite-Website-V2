// Taking a course (app/staffpage.mjs coursePage): the reading, the questions, then the result (or "waiting for marking").
(() => {
  const root = document.getElementById('ct'); if (!root) return; const API = root.dataset.api;
  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
  let K = null;
  const draw = () => { root.innerHTML = '<section class="card"><h1 style="margin:0 0 6px;font-size:24px">' + esc(K.title) + '</h1>' + (K.about ? '<p class="note" style="margin:0">' + esc(K.about) + '</p>' : '')
      + '<p class="hint" style="margin:10px 0 0">' + K.questions.length + ' question' + (K.questions.length === 1 ? '' : 's') + ' · pass mark ' + K.pass + '%</p></section>'
      + (K.sections.length ? '<section class="card">' + K.sections.map(s => '<div class="ct-sec">' + (s.title ? '<h3>' + esc(s.title) + '</h3>' : '') + (s.body ? '<p>' + esc(s.body) + '</p>' : '') + '</div>').join('') + '</section>' : '')
      + '<form class="card" id="ctF"><h2>Questions</h2>' + K.questions.map((x, i) => '<div class="ct-q" data-i="' + i + '"><b>' + (i + 1) + '. ' + esc(x.q) + ' <small>(' + x.points + ' point' + (x.points === 1 ? '' : 's') + ')</small></b>'
        + (x.type === 'choice' ? '<div class="ct-opts">' + x.options.map((o, k) => '<label><input type="radio" name="q' + i + '" value="' + k + '" required>' + esc(o) + '</label>').join('') + '</div>'
          : x.type === 'yesno' ? '<div class="ct-opts">' + ['Yes', 'No'].map(o => '<label><input type="radio" name="q' + i + '" value="' + o + '" required>' + o + '</label>').join('') + '</div>'
          : '<textarea name="q' + i + '" maxlength="1500" required placeholder="Your answer"></textarea>') + '</div>').join('')
      + '<div class="row" style="gap:12px;align-items:center;margin-top:14px"><button class="btn pri">Hand in</button><span class="msg" id="ctM"></span></div></form>'; };
  const result = r => { const head = { passed: 'You passed', failed: 'Not this time', marking: 'Handed in' }[r.status];
    root.querySelectorAll('.ct-q').forEach((el, i) => { el.classList.toggle('ok', r.right[i] === true); el.classList.toggle('no', r.right[i] === false); el.querySelectorAll('input,textarea').forEach(x => x.disabled = true); });
    root.querySelector('#ctF .row').innerHTML = '<a class="btn" href="' + esc(root.dataset.back) + '">Back to courses</a>';
    root.insertAdjacentHTML('afterbegin', '<section class="card"><div class="ct-res">' + (r.status === 'marking' ? '' : '<b>' + r.score + '/' + r.max + '</b>') + '<span class="tag ' + (r.status === 'passed' ? 'ok' : r.status === 'failed' ? 'bad' : 'warn') + '">' + head + '</span></div>'
      + '<p class="note" style="margin:8px 0 0;white-space:pre-wrap">' + esc(r.message.replace(/\*\*/g, '')) + '</p></section>'); scrollTo({ top: 0, behavior: 'smooth' }); };
  root.addEventListener('submit', async e => { e.preventDefault(); const f = e.target, m = f.querySelector('#ctM'), b = f.querySelector('button');
    const answers = K.questions.map((x, i) => x.type === 'short' ? f.elements['q' + i].value : (f.querySelector('[name="q' + i + '"]:checked')?.value ?? ''));
    b.disabled = true; try { const r = await api(API, { answers }); result(r); } catch (x) { m.className = 'msg err'; m.textContent = x.message; b.disabled = false; } });
  fetch(API, { cache: 'no-store', headers: { 'x-oversite': '1' } }).then(async r => { const j = await r.json(); if (!r.ok) throw new Error(j.error); K = j.course; draw(); })
    .catch(x => { root.innerHTML = '<section class="card"><p class="sh-empty">' + esc(x.message || 'This course could not be opened.') + '</p></section>'; });
})();
