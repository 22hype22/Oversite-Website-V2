// Settings → Bots: link an Oversite bot with the code from its page (at the top), or connect a server's own Discord bots to its CAD. Each bot gets a key (shown once), the permissions ticked
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
    // an Oversite bot's events go through Oversite: what matters is whether the last log got there
    const ev = b.oversite ? (b.delivery ? '<div class="bt-ev">Last log sent ' + ago(b.delivery.at) + ': ' + (b.delivery.ok ? '<span class="ok">delivered</span>' : '<span class="bad">' + e(b.delivery.error) + '</span>') + '</div>' : '') : b.hook ? '<div class="bt-ev">Events go to <b>' + e(b.hook.url) + '</b> (' + b.hook.events.length + ' kind' + (b.hook.events.length === 1 ? '' : 's') + ')' +
      (b.delivery ? '. Last sent ' + ago(b.delivery.at) + ': ' + (b.delivery.ok ? '<span class="ok">delivered</span>' : '<span class="bad">' + e(b.delivery.error) + '</span>') : '. Nothing sent yet.') + '</div>' : '';
    return '<div class="bt" data-id="' + e(b.id) + '"><div class="bt-h"><b>' + e(b.name) + '</b><small>' + (b.oversite ? 'Oversite bot, linked with a code' : 'Key ending ' + e(b.hint)) + ' · ' + (b.used ? 'last used ' + ago(b.used) : 'not used yet') + '</small><span class="sp"></span></div>' +
      '<div class="bt-perms">' + b.scopes.map(s => '<span>' + e((D.scopes[s] || [s])[0]) + '</span>').join('') + '</div>' + ev +
      (b.oversite ? logsBox(b) : '') +
      '<div class="bt-acts"><button type="button" class="btn sm" data-act="edit">Edit</button>' + (b.oversite ? '' : '<button type="button" class="btn sm" data-act="key">New key</button>') +
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

  // a linked Oversite bot's logs: each one it may post, with the channel in its own Discord it goes to (Off by default)
  const CH = {};   // its channels by bot id, read once: { list } or { error }
  const logsBox = b => { if (!b.canLog) return '<p class="note" style="margin-top:10px">To post logs in your Discord, link this bot again with a new code from its page.</p>';
    const ch = CH[b.id]; if (!ch) { loadChannels(b.id); return '<div class="bt-logs"><span class="bt-lbl">Logs in your Discord</span><p class="note">Loading the bot’s channels…</p></div>'; }
    if (ch.error) return '<div class="bt-logs"><span class="bt-lbl">Logs in your Discord</span><p class="msg err">' + e(ch.error) + '</p></div>';
    // a bot in several Discord servers: pick which one this CAD's logs go to; the channels are that server's
    const G = ch.guilds || [], g = b.guild && G.find(x => x.id === b.guild.id), many = G.length > 1, pickG = many && !g, here = ch.list.filter(c => !g || !c.guild || c.guild === g.id);
    const gPick = many || (b.guild && !g) ? '<label style="display:grid;grid-template-columns:minmax(0,1fr) minmax(0,45%);gap:12px;align-items:center;padding:4px 0 10px"><span><b>Discord server</b><small class="note" style="display:block">The bot is in ' + (many ? G.length + ' servers' : 'more than one server') + '. Logs and events from this CAD go to the one you pick.</small></span><select data-guild="' + e(b.id) + '"><option value="">' + (g ? 'Any server' : 'Pick a server') + '</option>' + G.map(x => '<option value="' + e(x.id) + '"' + (g && g.id === x.id ? ' selected' : '') + '>' + e(x.name) + '</option>').join('') + '</select></label>' : '';
    const opts = v => { let cat = null, h = '<option value="">Off</option>';
      for (const c of here) { if (c.category !== cat) { if (cat !== null) h += '</optgroup>'; cat = c.category; h += '<optgroup label="' + e(cat || 'No category') + '">'; }
        h += '<option value="' + e(c.id) + '"' + (c.id === v ? ' selected' : '') + '>#' + e(c.name) + '</option>'; }
      return h + (cat !== null ? '</optgroup>' : ''); };
    return '<div class="bt-logs" style="margin-top:12px"><span class="bt-lbl">Logs in your Discord</span><p class="note" style="margin:0 0 8px">Pick a channel for each log you want. The bot posts it there the moment it happens in the CAD.</p>' + gPick +
      (pickG ? '<p class="note">Pick the Discord server first, then its channels show here.</p>' : b.logKinds.length ? b.logKinds.map(k => '<label style="display:grid;grid-template-columns:minmax(0,1fr) minmax(0,45%);gap:12px;align-items:center;padding:8px 0;border-top:1px solid var(--line,rgba(255,255,255,.08))"><span><b>' + e(S.logs[k].name) + '</b><br><small class="note">' + e(S.logs[k].desc) + '</small></span>' +
        '<select data-log="' + e(k) + '" data-bot="' + e(b.id) + '">' + opts(b.logs[k] || '') + '</select></label>').join('')
        : '<p class="note">This kind of bot doesn’t post CAD logs.</p>') + (ch.list.length ? '' : '<p class="note">No channels yet. Make sure the bot is in your Discord, open its page on oversite.shop once so its channels load, then come back.</p>') + '</div>'; };
  const loadChannels = id => { if (CH[id]) return; CH[id] = null; call('/bots/channels', { id }).then(r => { CH[id] = { list: r.channels || [], guilds: r.guilds || [] }; draw(); }).catch(x => { CH[id] = { error: x.message }; draw(); }); };

  // which department an Oversite bot is for: it counts MDT shifts from that department only (or all of them)
  // an Oversite bot: its owner types the code from the bot's page on oversite.shop; Oversite keeps the key. It sits open at the
  // top of the page, since that is what most servers come here to do
  const linkForm = () => '<form class="bt-f" id="btL" style="margin:0 0 18px"><h3>Link an Oversite bot</h3>' +
    '<p class="note" style="margin:0 0 10px">For bots bought on oversite.shop. Open the bot’s page there and find <b>Link to your CAD</b>. Type the code it shows. It changes every minute, so use it right away. Only the bot’s owner can see it.</p>' +
    '<span class="bt-lbl">Code</span><input name="code" maxlength="9" placeholder="ABCD 2345" autocomplete="off" spellcheck="false" style="text-transform:uppercase;letter-spacing:.12em;font-family:ui-monospace,monospace">' +
    '<div class="bt-acts" style="margin-top:16px"><button class="btn pri">Link bot</button></div></form>';

  // Oversite bots don't count toward the limit: it's for the server's own bots only
  const draw = () => { const mine = S.bots.filter(b => !b.oversite).length, ov = S.bots.length - mine;
    document.getElementById('btCount').textContent = S.bots.length ? (ov ? ov + ' Oversite' + (mine ? ' · ' : '') : '') + (mine ? mine + ' of ' + S.max + ' own' : '') : '';
    const full = mine >= S.max;
    const canLink = ov < (S.maxOversite || 10), limit = '<p class="note" style="margin-top:14px">' + (S.premium ? 'This server has connected the most of its own bots it can (' + S.max + '). Oversite bots don’t count.' : 'Free servers connect ' + S.max + ' of their own bot. <a href="#premium">Premium</a> connects up to 10. Oversite bots don’t count, so link as many of those as you have.') + '</p>';
    body.innerHTML = (S.on ? '' : '<p class="msg err">Connected bots are switched off under Features, so bots’ keys don’t work right now.</p>') +
      (canLink ? linkForm() : '') +
      (S.bots.length ? S.bots.map(card).join('') : (editing === 'new' ? '' : '<p class="note">No bots connected yet.</p>')) +
      (editing === 'new' ? form(null) : full ? limit
        : '<div class="bt-acts" style="margin-top:14px"><button type="button" class="btn" data-act="new">Connect your own bot</button></div>');
    const f = document.getElementById('btF'); if (f) bindForm(f);
    const l = document.getElementById('btL'); if (l) bindLink(l); };

  const bindLink = f => { const inp = f.querySelector('[name=code]');
    f.addEventListener('submit', async ev => { ev.preventDefault(); const btn = f.querySelector('button.pri'); btn.disabled = true;
      try { const r = await call('/bots/link', { code: inp.value }); S = r; editing = null; reveal = null; draw(); say('Linked ' + r.bot.name + '. Oversite keeps its key, so there is nothing to copy.', true); }
      catch (x) { say(x.message); btn.disabled = false; } }); };

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

  body.addEventListener('change', async ev => { const lg = ev.target.closest('[data-log]'); if (!lg) return; const b = S.bots.find(x => x.id === lg.dataset.bot); if (!b) return; lg.disabled = true;
    try { const r = await call('/bots/logs', { id: b.id, logs: { ...b.logs, [lg.dataset.log]: lg.value } }); S = r; draw();
      say(lg.value ? S.logs[lg.dataset.log].name + ' go to #' + lg.selectedOptions[0].textContent.replace(/^#/, '') + '.' : S.logs[lg.dataset.log].name + ' are off.', true); }
    catch (x) { say(x.message); lg.disabled = false; } });
  body.addEventListener('change', async ev => { const t = ev.target.closest('[data-guild]'); if (!t) return; t.disabled = true;
    try { S = await call('/bots/guild', { id: t.dataset.guild, guild: t.value }); delete CH[t.dataset.guild]; draw(); say(t.value ? 'Logs and events go to ' + t.selectedOptions[0].textContent + ' now. Pick the channels there.' : 'The bot can post in any of its servers.', true); }
    catch (x) { say(x.message); t.disabled = false; } });

  call('/bots').then(r => { S = r; draw(); }).catch(x => { body.innerHTML = '<p class="msg err">' + e(x.message) + '</p>'; });
})();
