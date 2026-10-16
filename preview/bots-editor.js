// Settings → Bots: connect a server's own Discord bots to its CAD. Each bot gets a key (shown once), the permissions ticked
// here, and optionally a link Oversite sends its events to, signed with a secret (also shown once).
(() => {
  const root = document.getElementById('bots'); if (!root) return;
  const A = root.dataset.api, D = JSON.parse(document.getElementById('btData').textContent), body = document.getElementById('btBody'), msg = document.getElementById('btMsg');
  const e = t => String(t ?? '').replace(/[&<>"']/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]));
  const say = (t, ok) => { msg.textContent = t || ''; msg.className = 'msg ' + (ok ? 'ok' : 'err'); };
  const call = async (path, b) => { const r = await fetch(A + path, b ? { method: 'POST', headers: { 'content-type': 'application/json', 'x-oversite': '1' }, body: JSON.stringify(b) } : { cache: 'no-store', headers: { 'x-oversite': '1' } });
    const j = await r.json().catch(() => ({})); if (!r.ok) throw new Error(j.error || 'Something went wrong (' + r.status + ')'); return j; };
  const confirmIt = o => typeof ask === 'function' ? ask(o) : Promise.resolve(confirm(o.title));
  const ago = t => { if (!t) return 'never'; const m = Math.round((Date.now() - t) / 60000); return m < 1 ? 'just now' : m < 60 ? m + ' min ago' : m < 1440 ? Math.round(m / 60) + ' h ago' : Math.round(m / 1440) + ' days ago'; };
  let S = null, editing = null, reveal = null;   // the server's bots; the bot being edited ('new' for a new one); a key or secret to show once

  const card = b => {
    const ev = b.hook ? '<div class="bt-ev">Events go to <b>' + e(b.hook.url) + '</b> (' + b.hook.events.length + ' kind' + (b.hook.events.length === 1 ? '' : 's') + ')' +
      (b.delivery ? '. Last sent ' + ago(b.delivery.at) + ': ' + (b.delivery.ok ? '<span class="ok">delivered</span>' : '<span class="bad">' + e(b.delivery.error) + '</span>') : '. Nothing sent yet.') + '</div>' : '';
    return '<div class="bt" data-id="' + e(b.id) + '"><div class="bt-h"><b>' + e(b.name) + '</b><small>Key ending ' + e(b.hint) + ' · ' + (b.used ? 'last used ' + ago(b.used) : 'not used yet') + '</small><span class="sp"></span></div>' +
      '<div class="bt-perms">' + b.scopes.map(s => '<span>' + e((D.scopes[s] || [s])[0]) + '</span>').join('') + '</div>' + ev +
      '<div class="bt-acts"><button type="button" class="btn sm" data-act="edit">Edit</button><button type="button" class="btn sm" data-act="key">New key</button>' +
      (b.hook ? '<button type="button" class="btn sm" data-act="test">Send a test event</button><button type="button" class="btn sm" data-act="secret">New signing secret</button>' : '') +
      '<button type="button" class="btn sm danger" data-act="del">Disconnect</button></div>' + (reveal && reveal.id === b.id ? keyBox(b) : '') + (editing === b.id ? form(b) : '') + '</div>'; };

  // a key or secret, shown once, with everything the bot's developer needs in one copy
  const keyBox = b => { const r = reveal, lines = ['Oversite CAD: bot connection for ' + document.title.split('·')[0].trim(), 'API: ' + S.base, ...(r.key ? ['Key: ' + r.key, 'Send it as the header  Authorization: Bot <key>'] : []),
      'Permissions: ' + b.scopes.join(', '), ...(b.hook ? ['Events link: ' + b.hook.url, ...(r.secret ? ['Signing secret: ' + r.secret] : []), 'Events: ' + b.hook.events.join(', ')] : []), 'Guide: ' + S.docs];
    return '<div class="bt-key"><p><b>Copy ' + (r.key && r.secret ? 'these' : 'this') + ' now.</b> Oversite only shows ' + (r.key && r.secret ? 'them' : 'it') + ' once. Give ' + (r.key && r.secret ? 'them' : 'it') + ' to whoever runs the bot.</p>' +
      (r.key ? '<code>' + e(r.key) + '</code>' : '') + (r.secret ? '<p>Signing secret for events</p><code>' + e(r.secret) + '</code>' : '') +
      '<div class="bt-acts"><button type="button" class="btn pri sm" data-copy="' + e(lines.join('\n')) + '">Copy setup for the bot’s developer</button><button type="button" class="btn sm" data-act="done">Done</button></div></div>'; };

  const form = b => { const isNew = !b, sc = new Set(b ? b.scopes : []), ev = new Set(b?.hook ? b.hook.events : []);
    return '<form class="bt-f" id="btF"><h3>' + (isNew ? 'Connect a bot' : 'Edit ' + e(b.name)) + '</h3>' +
      (isNew ? '<span class="bt-lbl">What kind of bot is it?</span><div class="bt-kinds">' + Object.entries(D.presets).map(([k, p]) => '<button type="button" data-kind="' + k + '" aria-pressed="false">' + e(p.name) + '</button>').join('') + '</div>' : '') +
      '<span class="bt-lbl">Name</span><input name="name" maxlength="40" placeholder="The bot’s name in your Discord" value="' + e(b ? b.name : '') + '" autocomplete="off">' +
      '<span class="bt-lbl">What it may do</span><div class="bt-checks" id="btScopes">' + Object.entries(D.scopes).map(([k, [t, d]]) => '<label><input type="checkbox" name="scope" value="' + k + '"' + (sc.has(k) ? ' checked' : '') + '><b>' + e(t) + '</b><small>' + e(d) + '</small></label>').join('') + '</div>' +
      '<span class="bt-lbl">Send it events (optional)</span><p class="note" style="margin:0 0 8px">If the bot has a web address for events, Oversite tells it the moment things happen. Its developer will know the link.</p>' +
      '<input name="url" placeholder="https://your-bot.example.com/oversite" value="' + e(b?.hook ? b.hook.url : '') + '" autocomplete="off" spellcheck="false">' +
      '<div class="bt-checks" id="btEvents" style="margin-top:10px">' + Object.entries(D.events).map(([k, [t, need]]) => '<label data-need="' + need + '"><input type="checkbox" name="event" value="' + k + '"' + (ev.has(k) ? ' checked' : '') + '><b>' + e(t) + '</b><small>' + e(k) + '</small></label>').join('') + '</div>' +
      '<div class="bt-acts" style="margin-top:16px"><button class="btn pri">' + (isNew ? 'Connect bot' : 'Save') + '</button><button type="button" class="btn sm" data-act="cancel">Cancel</button></div></form>'; };

  const draw = () => { document.getElementById('btCount').textContent = S.bots.length ? S.bots.length + ' of ' + S.max : '';
    const full = S.bots.length >= S.max;
    body.innerHTML = (S.on ? '' : '<p class="msg err">Connected bots are switched off under Features, so bots’ keys don’t work right now.</p>') +
      (S.bots.length ? S.bots.map(card).join('') : (editing === 'new' ? '' : '<p class="note">No bots connected yet.</p>')) +
      (editing === 'new' ? form(null) : full ? '<p class="note" style="margin-top:14px">' + (S.premium ? 'This server has connected the most bots it can (' + S.max + ').' : 'Free servers connect ' + S.max + ' bot. <a href="#premium">Premium</a> connects up to 10.') + '</p>'
        : '<div class="bt-acts" style="margin-top:14px"><button type="button" class="btn pri" data-act="new">Connect a bot</button></div>');
    const f = document.getElementById('btF'); if (f) bindForm(f); };

  const bindForm = f => { const nm = f.querySelector('[name=name]'), ur = f.querySelector('[name=url]'); const need = () => { const on = new Set([...f.querySelectorAll('[name=scope]:checked')].map(i => i.value));
      f.querySelectorAll('#btEvents label').forEach(l => { const ok = on.has(l.dataset.need); l.classList.toggle('dis', !ok); const i = l.querySelector('input'); i.disabled = !ok; if (!ok) i.checked = false; }); };
    f.querySelectorAll('[name=scope]').forEach(i => i.addEventListener('change', need)); need();
    f.querySelectorAll('[data-kind]').forEach(btn => btn.addEventListener('click', () => { const p = D.presets[btn.dataset.kind];
      f.querySelectorAll('[data-kind]').forEach(x => x.setAttribute('aria-pressed', String(x === btn)));
      if (!nm.value.trim() || Object.values(D.presets).some(x => x.name === nm.value)) nm.value = p.name;
      f.querySelectorAll('[name=scope]').forEach(i => { i.checked = p.scopes.includes(i.value); }); need();
      f.querySelectorAll('[name=event]').forEach(i => { i.checked = !i.disabled && p.events.includes(i.value); }); }));
    f.addEventListener('submit', async ev => { ev.preventDefault(); const btn = f.querySelector('button.pri'); btn.disabled = true;
      const url = ur.value.trim(), b = { id: editing === 'new' ? undefined : editing, name: nm.value.trim(), scopes: [...f.querySelectorAll('[name=scope]:checked')].map(i => i.value),
        hook: url ? { url, events: [...f.querySelectorAll('[name=event]:checked')].map(i => i.value) } : null };
      try { const r = await call(editing === 'new' ? '/bots/create' : '/bots/update', b); S = r; reveal = r.key || r.secret ? { id: r.bot.id, key: r.key, secret: r.secret } : null; editing = null; draw();
        say(r.key ? 'Connected. Copy the key below.' : r.secret ? 'Saved. Copy the signing secret below.' : 'Saved.', true); }
      catch (x) { say(x.message); btn.disabled = false; } }); };

  body.addEventListener('click', async ev => { const t = ev.target.closest('[data-act],[data-copy]'); if (!t) return; const id = t.closest('.bt')?.dataset.id, a = t.dataset.act;
    if (t.dataset.copy) { try { await navigator.clipboard.writeText(t.dataset.copy); say('Copied. Paste it to whoever runs the bot.', true); } catch (x) { say('Couldn’t copy. Select the key and copy it by hand.'); } return; }
    if (a === 'new') { editing = 'new'; reveal = null; say(''); draw(); document.getElementById('btF')?.scrollIntoView({ block: 'nearest' }); return; }
    if (a === 'edit') { editing = editing === id ? null : id; draw(); return; }
    if (a === 'cancel') { editing = null; draw(); return; }
    if (a === 'done') { reveal = null; draw(); return; }
    const b = S.bots.find(x => x.id === id); if (!b) return;
    if (a === 'key' && !await confirmIt({ title: 'Make a new key for ' + b.name + '?', text: 'The old key stops working right away. The bot needs the new one to keep working.', ok: 'Make a new key' })) return;
    if (a === 'secret' && !await confirmIt({ title: 'Make a new signing secret?', text: 'The bot must use the new secret to check events, or it will turn them away.', ok: 'Make a new secret' })) return;
    if (a === 'del' && !await confirmIt({ title: 'Disconnect ' + b.name + '?', text: 'Its key stops working and it stops getting events. You can connect it again later with a new key.', ok: 'Disconnect', danger: true })) return;
    t.disabled = true;
    try { if (a === 'test') { const r = await call('/bots/test', { id }); S = r; draw(); say('The bot answered ' + r.status + '. Events reach it.', true); return; }
      const r = await call(a === 'del' ? '/bots/delete' : '/bots/rotate', { id, what: a === 'secret' ? 'secret' : 'key' }); S = r;
      reveal = r.key || r.secret ? { id, key: r.key, secret: r.secret } : null; draw(); say(a === 'del' ? 'Disconnected.' : 'Done. Copy it below.', true); }
    catch (x) { say(x.message); if (a === 'test') { try { S = await call('/bots'); draw(); } catch (y) {} } t.disabled = false; } });

  call('/bots').then(r => { S = r; draw(); }).catch(x => { body.innerHTML = '<p class="msg err">' + e(x.message) + '</p>'; });
})();
