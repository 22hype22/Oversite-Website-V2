// The Discord message editor: what a post says (text, who it posts as, and an embed with fields, images and a footer),
// with a live preview of how it will look in Discord, filled in with made-up details. Used by Settings → Automations.
// OvMsg.mount(box, msg, { vars, sample, server: { name, icon } }, onChange) edits msg in place and calls onChange on every edit.
(() => {
  const CSS = `.om-wrap{container-type:inline-size;margin-top:2px}.om{display:grid;gap:14px}@container (min-width:560px){.om{grid-template-columns:minmax(0,1.1fr) minmax(0,1fr)}}
.om-ed{display:grid;gap:10px;min-width:0;align-content:start;container-type:inline-size}.om-l{display:block;font-size:11.5px;font-weight:600;letter-spacing:.06em;text-transform:uppercase;color:var(--faint);margin:0 0 6px}
.om textarea{width:100%;resize:vertical;min-height:70px;font:inherit;font-size:13.5px;line-height:1.5}.om input[type=text],.om input:not([type]),.om textarea{width:100%;min-width:0}
.om-two{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1fr);gap:8px}.om-two>label,.om-ed label.om-f{display:grid;gap:5px;font-size:12px;color:var(--dim);min-width:0}
.om-chips{display:flex;flex-wrap:wrap;gap:6px;align-items:center;font-size:11.5px;color:var(--faint)}.om-chips button{font:11.5px ui-monospace,SFMono-Regular,Menlo,monospace;color:var(--ink);background:rgba(255,255,255,.06);border:1px solid var(--hair);border-radius:6px;padding:3px 7px;cursor:pointer}
.om-chips button:hover{background:rgba(255,255,255,.11)}
.om-tog{display:flex!important;flex-direction:row!important;align-items:center;gap:9px;font-size:13px!important;color:var(--ink)!important;cursor:pointer}.om-tog input{width:auto;margin:0}
.om-emb{display:grid;gap:10px;padding:12px;border-radius:12px;border:1px solid var(--hair);background:rgba(255,255,255,.025);border-left:3px solid var(--om-c,#3987E5)}.om-emb[hidden]{display:none}
.om-col{display:flex;gap:8px;align-items:center}.om-col input[type=color]{width:38px;height:34px;padding:2px;border-radius:8px;border:1px solid var(--hair2);background:transparent;cursor:pointer;flex:none}
.om-fl{display:grid;gap:8px}.om-fr{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1.4fr) auto auto;gap:6px;align-items:center}.om-fr label{display:flex;flex-direction:row;align-items:center;gap:5px;font-size:12px;color:var(--dim);white-space:nowrap}.om-fr label input{width:auto;margin:0}
.om-x{font:inherit;font-size:16px;line-height:1;width:28px;height:28px;border-radius:8px;color:var(--dim);background:transparent;border:1px solid transparent;cursor:pointer}.om-x:hover{color:var(--ink);background:rgba(255,255,255,.06)}
.om-add{justify-self:start}
.om-pv{min-width:0}.om-dc{position:sticky;top:12px;padding:14px 14px 16px;border-radius:12px;background:#313338;border:1px solid rgba(255,255,255,.06);color:#DBDEE1;font:15px/1.375 "gg sans","Noto Sans",system-ui,sans-serif;overflow:hidden}
.om-note{margin:6px 0 0;font-size:11.5px;color:var(--faint)}
.dm{display:grid;grid-template-columns:40px minmax(0,1fr);gap:12px}.dm-av{width:40px;height:40px;border-radius:50%;background:#3987E5;color:#fff;display:grid;place-items:center;font-weight:600;overflow:hidden}.dm-av img{width:100%;height:100%;object-fit:cover}
.dm-h{display:flex;align-items:center;gap:6px;flex-wrap:wrap}.dm-h b{color:#F2F3F5;font-weight:500}.dm-app{font-size:10px;font-weight:600;line-height:15px;padding:0 4px;border-radius:3px;background:#5865F2;color:#fff}.dm-h time{font-size:12px;color:#949BA4}
.dm-c{white-space:pre-wrap;overflow-wrap:break-word;margin-top:2px}.dm-c:empty{display:none}
.dm-e{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:8px 16px;max-width:520px;margin-top:6px;padding:8px 16px 16px 12px;border-radius:4px;background:#2B2D31;border-left:4px solid #3987E5;font-size:14px}
.dm-e>div{min-width:0}.dm-au{font-size:14px;font-weight:600;color:#F2F3F5;margin-top:8px}.dm-t{font-size:16px;font-weight:600;color:#F2F3F5;margin-top:8px}.dm-t a{color:#00A8FC;text-decoration:none}
.dm-d{white-space:pre-wrap;overflow-wrap:break-word;margin-top:8px}.dm-fs{display:grid;grid-template-columns:repeat(12,minmax(0,1fr));gap:8px;margin-top:8px}.dm-f{min-width:0}.dm-f b{display:block;font-weight:600;color:#F2F3F5;margin-bottom:2px}.dm-f div{white-space:pre-wrap;overflow-wrap:break-word}
.dm-th{width:80px;height:80px;border-radius:4px;object-fit:cover;margin-top:8px}.dm-im{grid-column:1/-1;max-width:100%;max-height:300px;border-radius:4px;margin-top:8px}.dm-ft{grid-column:1/-1;font-size:12px;color:#949BA4;margin-top:8px}
.dm-c code,.dm-d code,.dm-f code{font:13px ui-monospace,Menlo,monospace;background:#1E1F22;border-radius:3px;padding:1px 3px}.dm-q{display:block;border-left:4px solid #4E5058;padding-left:10px}.dm-c a,.dm-d a,.dm-f a{color:#00A8FC;text-decoration:none}
.dm-h1{font-size:1.5em;font-weight:700;color:#F2F3F5}.dm-h2{font-size:1.25em;font-weight:700;color:#F2F3F5}.dm-h3{font-size:1.05em;font-weight:700;color:#F2F3F5}.dm-none{color:#949BA4;font-style:italic}
@container (max-width:400px){.om .om-fr{grid-template-columns:minmax(0,1fr) minmax(0,1fr);row-gap:4px}.om .om-fr label{justify-self:start;padding-left:2px}.om .om-fr .om-x{justify-self:end}}
@container (max-width:300px){.om .om-two{grid-template-columns:minmax(0,1fr)}.om .om-fr [data-fk]:not([type=checkbox]){grid-column:1/-1}}`;
  if (!document.getElementById('omCss')) { const s = document.createElement('style'); s.id = 'omCss'; s.textContent = CSS; document.head.appendChild(s); }

  const e = t => String(t ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  // the Discord markdown people use most, enough to see what the post will look like
  const md = t => e(t).split('\n').map(l => { const h = /^(#{1,3}) (.*)$/.exec(l), q = /^&gt; ?(.*)$/.exec(l);
      return h ? '<span class="dm-h' + h[1].length + '">' + h[2] + '</span>' : q ? '<span class="dm-q">' + q[1] + '</span>' : l; }).join('\n')
    .replace(/`([^`\n]+)`/g, '<code>$1</code>').replace(/\*\*([^*\n]+)\*\*/g, '<b>$1</b>').replace(/__([^_\n]+)__/g, '<u>$1</u>').replace(/~~([^~\n]+)~~/g, '<s>$1</s>')
    .replace(/(^|[^*])\*([^*\n]+)\*/g, '$1<i>$2</i>').replace(/(^|[^\w])_([^_\n]+)_(?!\w)/g, '$1<i>$2</i>').replace(/\[([^\]\n]+)\]\((https:\/\/[^)\s]+)\)/g, '<a>$1</a>')
    .replace(/\n?(<span class="dm-(?:h\d|q)">)/g, '$1');
  const okImg = u => /^https:\/\/[^\s<>"']{4,400}$/.test(String(u || '').trim());

  window.OvMsg = { mount(box, m, o, changed) {
    o = o || {}; const fill = t => String(t || '').replace(/\{(\w+)\}/g, (x, k) => o.sample && o.sample[k] != null && o.sample[k] !== '' ? o.sample[k] : '');
    m.fields = Array.isArray(m.fields) ? m.fields : []; m.color = /^#[0-9a-f]{6}$/i.test(m.color || '') ? m.color : '#3987E5';
    const v = k => e(m[k] || ''), fieldRow = (f, i) => '<div class="om-fr" data-fi="' + i + '"><input data-fk="n" maxlength="256" placeholder="Name" value="' + e(f.n) + '"><input data-fk="v" maxlength="1024" placeholder="Value" value="' + e(f.v) + '">'
      + '<label title="Show next to the fields beside it"><input type="checkbox" data-fk="i"' + (f.i ? ' checked' : '') + '>Inline</label><button type="button" class="om-x" data-om="frm" aria-label="Remove field">×</button></div>';
    box.innerHTML = '<div class="om-wrap"><div class="om"><div class="om-ed">'
      + '<div><span class="om-l">Message</span><textarea data-m="content" maxlength="1900" rows="3" placeholder="What to post. Leave it empty to send only the embed.">' + v('content') + '</textarea></div>'
      + (o.vars && o.vars.length ? '<div class="om-chips">Fill in:' + o.vars.map(x => '<button type="button" data-ins="{' + e(x) + '}" title="Put {' + e(x) + '} where you are typing">{' + e(x) + '}</button>').join('') + '</div>' : '')
      + '<div class="om-two"><label>Posts as<input data-m="name" maxlength="80" placeholder="' + e(o.server && o.server.name || 'Your server') + '" value="' + v('name') + '"></label><label>Picture link<input data-m="avatar" maxlength="400" placeholder="https://… (optional)" value="' + v('avatar') + '" spellcheck="false"></label></div>'
      + '<label class="om-tog"><input type="checkbox" data-m="embed"' + (m.embed ? ' checked' : '') + '>Add an embed</label>'
      + '<div class="om-emb"' + (m.embed ? '' : ' hidden') + ' style="--om-c:' + m.color + '">'
      + '<div class="om-two"><label>Colour<span class="om-col"><input type="color" data-m="color" value="' + m.color + '" aria-label="Embed colour"><input data-m="colorhex" maxlength="7" value="' + m.color + '" spellcheck="false" aria-label="Colour code"></span></label><label>Author<input data-m="author" maxlength="256" placeholder="Small line above the title" value="' + v('author') + '"></label></div>'
      + '<div class="om-two"><label>Title<input data-m="title" maxlength="256" value="' + v('title') + '"></label><label>Title link<input data-m="url" maxlength="400" placeholder="https://… (optional)" value="' + v('url') + '" spellcheck="false"></label></div>'
      + '<label class="om-f">Description<textarea data-m="desc" maxlength="3000" rows="4">' + v('desc') + '</textarea></label>'
      + '<div><span class="om-l">Fields</span><div class="om-fl">' + m.fields.map(fieldRow).join('') + '</div><button type="button" class="btn sm om-add" data-om="fadd" style="margin-top:8px">Add a field</button></div>'
      + '<div class="om-two"><label>Image link<input data-m="image" maxlength="400" placeholder="https://… big picture" value="' + v('image') + '" spellcheck="false"></label><label>Thumbnail link<input data-m="thumb" maxlength="400" placeholder="https://… small, top right" value="' + v('thumb') + '" spellcheck="false"></label></div>'
      + '<div class="om-two"><label>Footer<input data-m="footer" maxlength="2048" value="' + v('footer') + '"></label><label class="om-tog" style="align-self:end;padding-bottom:9px"><input type="checkbox" data-m="ts"' + (m.ts ? ' checked' : '') + '>Show the time</label></div>'
      + '</div></div><div class="om-pv"><span class="om-l">Preview</span><div class="om-dc" aria-live="off"></div><p class="om-note">Filled in with made-up details. Discord shows it like this in the channel.</p></div></div></div>';
    const pv = box.querySelector('.om-dc'), fl = box.querySelector('.om-fl'), emb = box.querySelector('.om-emb'); let last = box.querySelector('[data-m="content"]');
    const preview = () => { const name = fill(m.name) || (o.server && o.server.name) || 'Oversite', av = okImg(m.avatar) ? m.avatar : o.server && o.server.icon, t = new Date().toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
      let em = ''; if (m.embed) { const F = m.fields.filter(f => f.n || f.v), rows = []; for (const f of F) { const r = rows[rows.length - 1]; if (f.i && r && r.inline && r.list.length < 3) r.list.push(f); else rows.push({ inline: f.i, list: [f] }); }
        const fs = rows.map(r => r.list.map(f => '<div class="dm-f" style="grid-column:span ' + (r.inline ? 12 / r.list.length : 12) + '"><b>' + (md(fill(f.n)) || '&nbsp;') + '</b><div>' + (md(fill(f.v)) || '&nbsp;') + '</div></div>').join('')).join('');
        em = '<div class="dm-e" style="border-left-color:' + m.color + '"><div>' + (m.author ? '<div class="dm-au">' + e(fill(m.author)) + '</div>' : '') + (m.title ? '<div class="dm-t">' + (okImg(m.url) ? '<a>' + e(fill(m.title)) + '</a>' : e(fill(m.title))) + '</div>' : '')
          + (m.desc ? '<div class="dm-d">' + md(fill(m.desc)) + '</div>' : '') + (fs ? '<div class="dm-fs">' + fs + '</div>' : '') + '</div>' + (okImg(m.thumb) ? '<img class="dm-th" src="' + e(m.thumb) + '" alt="" onerror="this.remove()">' : '')
          + (okImg(m.image) ? '<img class="dm-im" src="' + e(m.image) + '" alt="" onerror="this.remove()">' : '') + (m.footer || m.ts ? '<div class="dm-ft">' + e(fill(m.footer)) + (m.footer && m.ts ? ' • ' : '') + (m.ts ? 'Today at ' + t : '') + '</div>' : '') + '</div>'; }
      const body = md(fill(m.content));
      pv.innerHTML = '<div class="dm"><div class="dm-av">' + e(name.trim().charAt(0).toUpperCase() || 'O') + (av ? '<img src="' + e(av) + '" alt="" onerror="this.remove()">' : '') + '</div><div style="min-width:0"><div class="dm-h"><b>' + e(name) + '</b><span class="dm-app">APP</span><time>Today at ' + t + '</time></div>'
        + (body || em ? '<div class="dm-c">' + body + '</div>' + em : '<div class="dm-c dm-none">Write a message or add an embed.</div>') + '</div></div>'; };
    const done = () => { preview(); changed && changed(m); };
    box.addEventListener('focusin', ev => { if (ev.target.matches('textarea,input:not([type=checkbox]):not([type=color])')) last = ev.target; });
    box.addEventListener('input', ev => { const x = ev.target, k = x.dataset.m, r = x.closest('[data-fi]');
      if (r && x.dataset.fk) { const f = m.fields[+r.dataset.fi]; f[x.dataset.fk] = x.dataset.fk === 'i' ? x.checked : x.value; return done(); }
      if (!k) return; if (k === 'embed' || k === 'ts') { m[k] = x.checked; if (k === 'embed') emb.hidden = !x.checked; return done(); }
      if (k === 'color' || k === 'colorhex') { const c = x.value.trim(); if (!/^#[0-9a-f]{6}$/i.test(c)) return; m.color = c.toUpperCase(); emb.style.setProperty('--om-c', m.color);
        box.querySelector(k === 'color' ? '[data-m="colorhex"]' : '[data-m="color"]').value = k === 'color' ? m.color : c.toLowerCase(); return done(); }
      m[k] = x.value; done(); });
    box.addEventListener('change', ev => { if (ev.target.type === 'checkbox') ev.target.dispatchEvent(new Event('input', { bubbles: true })); });
    box.addEventListener('click', ev => { const b = ev.target.closest('button'); if (!b) return;
      if (b.dataset.ins) { const x = last && box.contains(last) ? last : box.querySelector('[data-m="content"]'), s = x.selectionStart ?? x.value.length, en = x.selectionEnd ?? s;
        x.value = x.value.slice(0, s) + b.dataset.ins + x.value.slice(en); x.focus(); x.setSelectionRange(s + b.dataset.ins.length, s + b.dataset.ins.length); x.dispatchEvent(new Event('input', { bubbles: true })); return; }
      if (b.dataset.om === 'fadd') { if (m.fields.length >= 10) return; m.fields.push({ n: '', v: '', i: true }); fl.insertAdjacentHTML('beforeend', fieldRow(m.fields[m.fields.length - 1], m.fields.length - 1)); fl.lastElementChild.querySelector('input').focus(); return done(); }
      if (b.dataset.om === 'frm') { m.fields.splice(+b.closest('[data-fi]').dataset.fi, 1); fl.innerHTML = m.fields.map(fieldRow).join(''); return done(); } });
    preview(); } };
})();
