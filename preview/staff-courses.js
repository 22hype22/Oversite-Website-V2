// The Courses tab on the staff page (staff-hub.js hands it a box to draw in). Staff see the courses they can take and how they
// did; admins also write courses (reading, questions, pass mark, graduation messages and channels), see every result, and mark
// written answers. Taking a course happens on its own page, /<server>/course/<id> (course-take.js).
window.OvCourses = (() => {
  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
  const when = t => new Date(t).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
  const RES = { passed: ['Passed', 'ok'], failed: ['Not passed', 'bad'], marking: ['Waiting for marking', 'warn'] };
  const res = r => r ? '<span class="tag ' + RES[r.status][1] + '">' + RES[r.status][0] + (r.status !== 'marking' ? ' · ' + r.score + '/' + r.max : '') + '</span>' : '';
  let box, X, view = { name: 'home' }, data = null, types = {};
  const get = async p => { const r = await fetch(X.API + p, { cache: 'no-store', headers: { 'x-oversite': '1' } }); const j = await r.json().catch(() => ({})); if (!r.ok) throw new Error(j.error || 'Something went wrong (' + r.status + ')'); return j; };
  const post = async (p, b) => { const r = await fetch(X.API + p, { method: 'POST', headers: { 'content-type': 'application/json', 'x-oversite': '1' }, body: JSON.stringify(b) }); const j = await r.json().catch(() => ({})); if (!r.ok) throw new Error(j.error || 'Something went wrong (' + r.status + ')'); return j; };
  const msg = (t, ok) => { const m = box.querySelector('.cs-msg'); if (m) { m.textContent = t || ''; m.className = 'msg cs-msg ' + (ok ? 'ok' : 'err'); } };
  const back = '<div class="sh-back"><button class="btn sm ghost" data-cs="home">← Courses</button></div>';

  // ── the list ──
  const home = () => { const L = data.courses;
    return '<section class="card sh-card"><div class="sh-row" style="justify-content:space-between"><h2 style="margin:0">Courses</h2>' + (data.admin ? '<button class="btn pri sm" data-cs="new">New course</button>' : '') + '</div>'
      + '<p class="note">' + (data.admin ? 'Training for your team: reading, then questions with a pass mark. Staff take them here or with /course in Discord. A public course is open to every member.' : 'Training from your server. Take a course here or with /course in Discord.') + '</p>'
      + (L.length ? '<ul class="sh-list">' + L.map(k => '<li><div class="nm"><div style="min-width:0"><b>' + esc(k.title) + '</b> ' + (k.public ? '<span class="tag">Public</span> ' : '') + (k.open ? '' : '<span class="tag">Closed</span> ') + res(k.mine)
        + '<br><small>' + k.questions + ' question' + (k.questions === 1 ? '' : 's') + ' · pass mark ' + k.pass + '%' + (data.admin ? ' · ' + k.taken + ' taken' : '') + '</small></div></div>'
        + (k.open ? '<a class="btn sm' + (k.mine?.status === 'passed' ? '' : ' pri') + '" href="/' + esc(X.SLUG) + '/course/' + k.id + '">' + (k.mine ? 'Take again' : 'Take course') + '</a>' : '')
        + (data.admin ? '<button class="btn sm" data-cs="runs" data-id="' + k.id + '">Results' + (k.marking ? ' (' + k.marking + ' to mark)' : '') + '</button><button class="btn sm ghost" data-cs="edit" data-id="' + k.id + '">Edit</button>' : '') + '</li>').join('') + '</ul>'
        : '<p class="sh-empty">' + (data.admin ? 'No courses yet. Make your first one.' : 'No courses are open to you yet.') + '</p>') + '</section>'; };

  // ── writing one ──
  const blank = () => ({ title: '', about: '', pass: 80, public: false, open: true, sections: [{ title: 'Before you start', body: '' }],
    questions: [{ q: '', type: 'choice', points: 1, options: ['', ''], answer: 0 }], grad: { ...data.gradDefault } });
  const qEd = (x, i, n) => '<div class="sh-q cs-q" data-i="' + i + '"><input data-f="q" value="' + esc(x.q) + '" maxlength="300" placeholder="Question ' + (i + 1) + '" aria-label="Question ' + (i + 1) + '">'
    + '<select data-f="type" aria-label="Kind of question">' + Object.entries(types).map(([k, t]) => '<option value="' + k + '"' + (k === x.type ? ' selected' : '') + '>' + esc(t) + '</option>').join('') + '</select>'
    + '<span class="sh-qb"><button type="button" data-cqa="up"' + (i ? '' : ' disabled') + ' aria-label="Move up">↑</button><button type="button" data-cqa="dn"' + (i < n - 1 ? '' : ' disabled') + ' aria-label="Move down">↓</button><button type="button" data-cqa="rm" aria-label="Remove">×</button></span>'
    + (x.type === 'choice' ? '<div class="opt cs-opts">' + (x.options || []).map((o, k) => '<label class="cs-opt"><input type="radio" name="ans' + i + '" data-ans="' + k + '"' + (k === x.answer ? ' checked' : '') + ' aria-label="Correct answer"><input data-o="' + k + '" value="' + esc(o) + '" maxlength="100" placeholder="Answer ' + (k + 1) + '">' + ((x.options || []).length > 2 ? '<button type="button" data-orm="' + k + '" aria-label="Remove answer">×</button>' : '') + '</label>').join('')
      + ((x.options || []).length < 8 ? '<button type="button" class="btn sm ghost" data-oadd>Add an answer</button>' : '') + '<small>Tick the right answer.</small></div>' : '')
    + (x.type === 'yesno' ? '<label class="opt cs-inline">Right answer <select data-f="answer"><option' + (x.answer !== 'No' ? ' selected' : '') + '>Yes</option><option' + (x.answer === 'No' ? ' selected' : '') + '>No</option></select></label>' : '')
    + (x.type === 'short' ? '<label class="opt cs-inline" style="flex-direction:column;align-items:stretch">Accepted answers (optional, separated by commas)<input data-f="accept" value="' + esc((x.accept || []).join(', ')) + '" placeholder="Leave empty to mark these yourself"></label>' : '')
    + '<label class="opt cs-inline">Points <input data-f="points" type="number" min="1" max="10" value="' + (x.points || 1) + '" style="width:72px"></label></div>';
  const sEd = (x, i) => '<div class="sh-q cs-s" data-i="' + i + '"><input data-f="title" value="' + esc(x.title) + '" maxlength="80" placeholder="Section title"><span></span><span class="sh-qb"><button type="button" data-sa="rm" aria-label="Remove section">×</button></span>'
    + '<textarea data-f="body" maxlength="4000" placeholder="What they read before the questions: rules, procedures, radio codes…">' + esc(x.body) + '</textarea></div>';
  const editor = () => { const K = view.course, G = K.grad;
    return back + '<section class="card sh-card"><h2>' + (K.id ? 'Edit course' : 'New course') + '</h2><div class="sh-form">'
      + '<label class="wide">Title<input id="csT" maxlength="70" value="' + esc(K.title) + '" placeholder="Traffic stop basics"></label>'
      + '<label class="wide">Description<textarea id="csA" maxlength="600" placeholder="What this course covers">' + esc(K.about) + '</textarea></label>'
      + '<label>Pass mark (%)<input id="csP" type="number" min="1" max="100" value="' + K.pass + '"></label><div></div>'
      + '<label class="chk wide" style="margin:0"><input type="checkbox" id="csPub"' + (K.public ? ' checked' : '') + '> Public: every member can take it, not only staff</label>'
      + '<label class="chk wide" style="margin:0"><input type="checkbox" id="csO"' + (K.open ? ' checked' : '') + '> Open: people can take it now</label></div>'
      + '<h3 class="cs-h">Reading</h3><div id="csS">' + K.sections.map(sEd).join('') + '</div><button class="btn sm" data-cs="sadd" style="margin-top:8px">Add a section</button>'
      + '<h3 class="cs-h">Questions</h3><div id="csQ">' + K.questions.map((x, i) => qEd(x, i, K.questions.length)).join('') + '</div><button class="btn sm" data-cs="qadd" style="margin-top:8px"' + (K.questions.length >= 40 ? ' disabled' : '') + '>Add a question</button></section>'
      + '<section class="card sh-card"><h2>Graduation</h2><p class="note">What happens when someone finishes. Messages fill in <code>{user}</code> (pings only them), <code>{name}</code>, <code>{course}</code>, <code>{score}</code>, <code>{max}</code>, <code>{percent}</code> and <code>{passmark}</code>.</p><div class="sh-form">'
      + '<label class="wide">When they pass<textarea id="gP" maxlength="600">' + esc(G.msgPass) + '</textarea></label>'
      + '<label class="wide">When they don’t pass<textarea id="gF" maxlength="600">' + esc(G.msgFail) + '</textarea></label>'
      + '<label class="wide">When written answers need marking<textarea id="gM" maxlength="600">' + esc(G.msgMarking) + '</textarea></label>'
      + '<label class="wide">Graduation channel (a Discord webhook link)<input id="gH" value="' + esc(G.hook) + '" placeholder="https://discord.com/api/webhooks/…" spellcheck="false"></label>'
      + '<label>Post to it<select id="gN"><option value="passed"' + (G.announce === 'passed' ? ' selected' : '') + '>Passes only</option><option value="all"' + (G.announce === 'all' ? ' selected' : '') + '>Every result</option><option value="off"' + (G.announce === 'off' ? ' selected' : '') + '>Nothing</option></select></label><div></div>'
      + '<label class="chk wide" style="margin:0"><input type="checkbox" id="gA"' + (G.showAnswers ? ' checked' : '') + '> Show their answers in the graduation post</label>'
      + '<label class="wide">Log channel (optional, a Discord webhook link)<input id="gL" value="' + esc(G.log) + '" placeholder="Every attempt with every answer, for your staff" spellcheck="false"></label></div>'
      + '<p class="hint" style="margin:10px 0 0">In Discord: the channel’s settings, Integrations, Webhooks, New Webhook, Copy Webhook URL. The person who took the course is the only one pinged.</p></section>'
      + '<div class="row" style="gap:10px;align-items:center;margin-bottom:24px"><button class="btn pri" data-cs="save">Save course</button>' + (K.id ? '<button class="btn danger" data-cs="del">Delete</button>' : '') + '<span class="msg cs-msg"></span></div>'; };
  const read = () => { const K = view.course;
    K.title = box.querySelector('#csT').value; K.about = box.querySelector('#csA').value; K.pass = +box.querySelector('#csP').value || 80; K.public = box.querySelector('#csPub').checked; K.open = box.querySelector('#csO').checked;
    K.sections = [...box.querySelectorAll('#csS .cs-s')].map(el => ({ title: el.querySelector('[data-f="title"]').value, body: el.querySelector('[data-f="body"]').value }));
    K.questions = [...box.querySelectorAll('#csQ .cs-q')].map(el => { const g = f => el.querySelector('[data-f="' + f + '"]'), type = g('type').value, x = { q: g('q').value, type, points: +g('points').value || 1 };
      if (type === 'choice') { x.options = [...el.querySelectorAll('[data-o]')].map(o => o.value); x.answer = +(el.querySelector('[data-ans]:checked')?.dataset.ans || 0); }
      if (type === 'yesno') x.answer = g('answer')?.value || 'Yes'; if (type === 'short') x.accept = (g('accept')?.value || '').split(',').map(v => v.trim()).filter(Boolean); return x; });
    K.grad = { msgPass: box.querySelector('#gP').value, msgFail: box.querySelector('#gF').value, msgMarking: box.querySelector('#gM').value, hook: box.querySelector('#gH').value.trim(), announce: box.querySelector('#gN').value, showAnswers: box.querySelector('#gA').checked, log: box.querySelector('#gL').value.trim() }; };

  // ── results and marking ──
  const runs = () => { const K = data.course, R = data.runs, ans = (x, a) => x.type === 'choice' ? (x.options[a] ?? '') : a;
    return back + '<section class="card sh-card"><h2>' + esc(K.title) + '</h2><p class="note">' + R.length + ' attempt' + (R.length === 1 ? '' : 's') + ' · pass mark ' + K.pass + '%</p></section>'
      + (R.length ? R.map(r => '<section class="card sh-card" data-run="' + r.id + '"><div class="sh-row"><div style="flex:1;min-width:0"><b>' + esc(r.name) + '</b> ' + res(r) + '<br><small style="color:var(--faint)">' + when(r.at) + (r.via === 'discord' ? ' · in Discord' : '') + (r.by ? ' · marked by ' + esc(r.by) : '') + '</small></div></div>'
        + '<ul class="sh-ans">' + K.questions.map((x, i) => '<li><b>' + esc(x.q) + '</b><p>' + esc(ans(x, r.answers[i]) || '(no answer)') + ' ' + (x.type === 'short' && (r.status === 'marking' || r.marks[i] !== null)
          ? '<span class="cs-mk" data-i="' + i + '"><button type="button" data-mk="1" aria-pressed="' + (r.marks[i] === true) + '">Right</button><button type="button" data-mk="0" aria-pressed="' + (r.marks[i] === false) + '">Wrong</button></span>'
          : '<span class="tag ' + (r.marks[i] ? 'ok' : 'bad') + '">' + (r.marks[i] ? 'Right' : 'Wrong') + '</span>') + '</p></li>').join('') + '</ul>'
        + (K.questions.some(x => x.type === 'short') ? '<div class="row" style="gap:10px;align-items:center;margin-top:10px"><button class="btn sm' + (r.status === 'marking' ? ' pri' : '') + '" data-cs="mark" data-id="' + r.id + '">' + (r.status === 'marking' ? 'Save marks' : 'Change marks') + '</button><span class="msg" data-rmsg="' + r.id + '"></span></div>' : '') + '</section>').join('')
        : '<section class="card sh-card"><p class="sh-empty">Nobody has taken it yet.</p></section>'); };

  const draw = async () => { try {
      if (view.name === 'home') { data = await get('/courses'); types = data.types; box.innerHTML = home(); }
      else if (view.name === 'edit') box.innerHTML = editor();
      else if (view.name === 'runs') { data = { ...data, ...(await get('/courses/runs?id=' + view.id)) }; box.innerHTML = runs(); } }
    catch (e) { box.innerHTML = '<section class="card sh-card"><p class="sh-empty">' + esc(e.message) + '</p></section>'; } };
  const click = async e => { const t = e.target.closest('button'); if (!t || !box.contains(t)) return; const a = t.dataset.cs;
    if (a === 'home') { view = { name: 'home' }; return draw(); }
    if (a === 'new') { view = { name: 'edit', course: blank() }; return draw(); }
    if (a === 'edit') { try { const j = await get('/course/' + t.dataset.id + '?edit=1'); view = { name: 'edit', course: j.course }; draw(); } catch (x) { alert(x.message); } return; }
    if (a === 'runs') { view = { name: 'runs', id: +t.dataset.id }; return draw(); }
    if (view.name === 'edit') { const K = view.course;
      if (a === 'sadd') { read(); K.sections.push({ title: '', body: '' }); return draw(); }
      if (t.dataset.sa === 'rm') { read(); K.sections.splice(+t.closest('.cs-s').dataset.i, 1); return draw(); }
      if (a === 'qadd') { read(); K.questions.push({ q: '', type: 'choice', points: 1, options: ['', ''], answer: 0 }); draw(); box.querySelector('#csQ .cs-q:last-child [data-f="q"]')?.focus(); return; }
      if (t.dataset.cqa) { read(); const i = +t.closest('.cs-q').dataset.i; if (t.dataset.cqa === 'rm') K.questions.splice(i, 1); else { const k = t.dataset.cqa === 'up' ? i - 1 : i + 1; [K.questions[i], K.questions[k]] = [K.questions[k], K.questions[i]]; } return draw(); }
      if (t.dataset.oadd != null) { read(); K.questions[+t.closest('.cs-q').dataset.i].options.push(''); return draw(); }
      if (t.dataset.orm != null) { read(); const x = K.questions[+t.closest('.cs-q').dataset.i], k = +t.dataset.orm; x.options.splice(k, 1); if (x.answer >= x.options.length) x.answer = 0; else if (x.answer > k) x.answer--; return draw(); }
      if (a === 'save') { read(); t.disabled = true; try { const r = await post('/courses/save', K); K.id = r.id; msg('Saved.', true); } catch (x) { msg(x.message); } t.disabled = false; return; }
      if (a === 'del') { if (!(await ask({ title: 'Delete this course?', text: 'Everyone’s results for it are deleted too.', ok: 'Delete', danger: true }))) return; try { await post('/courses/delete', { id: K.id }); view = { name: 'home' }; draw(); } catch (x) { msg(x.message); } return; } }
    if (t.dataset.mk != null) { const g = t.closest('.cs-mk'); g.querySelectorAll('button').forEach(b => b.setAttribute('aria-pressed', String(b === t))); return; }
    if (a === 'mark') { const card = t.closest('[data-run]'), marks = []; card.querySelectorAll('.cs-mk').forEach(g => { const on = g.querySelector('[aria-pressed="true"]'); marks[+g.dataset.i] = on ? on.dataset.mk === '1' : null; });
      const m = card.querySelector('[data-rmsg]'); try { const r = await post('/courses/mark', { run: +t.dataset.id, marks }); m.className = 'msg ok'; m.textContent = (r.status === 'passed' ? 'Passed' : 'Not passed') + ', ' + r.score + '/' + r.max + '.'; setTimeout(draw, 900); }
      catch (x) { m.className = 'msg err'; m.textContent = x.message; } } };
  const change = e => { if (view.name === 'edit' && e.target.dataset.f === 'type') { read(); const x = view.course.questions[+e.target.closest('.cs-q').dataset.i]; if (x.type === 'choice' && !x.options) { x.options = ['', '']; x.answer = 0; } draw(); } };
  return { draw: (el, ctx) => { box = el; X = ctx; view = { name: 'home' }; box.addEventListener('click', click); box.addEventListener('change', change); draw(); } };
})();
