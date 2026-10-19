// Apps on the Civilian phone (civ-phone.js): Messages (text anyone in this server), Maps (the in-game map, with you on it and
// postal search) and News (this server's announcements and the CAD's own updates). Each draws itself the first time it opens.
(() => { const start = () => { const P = window.ovPhone; if (!P) return; const { addApp, call, esc } = P, OV = window.OVERSITE || {};
  const css = document.createElement('style'); css.textContent = `
#civMdt .ap{position:absolute;inset:0;display:flex;flex-direction:column;background:#000;color:#fff;font-family:inherit}
#civMdt .ap-h{display:flex;align-items:flex-end;gap:10px;padding:6px 16px 10px}#civMdt .ap-h h2{flex:1;margin:0;font-size:30px;font-weight:700;letter-spacing:-.02em}
#civMdt .ap-ib{width:34px;height:34px;border-radius:50%;display:grid;place-items:center;background:none;border:0;color:#0A84FF;cursor:pointer}
#civMdt .ap-scroll{flex:1;min-height:0;overflow-y:auto;scrollbar-width:none}#civMdt .ap-scroll::-webkit-scrollbar{display:none}
#civMdt .ap-in{margin:0 16px 10px;display:flex;align-items:center;gap:6px;padding:8px 10px;border-radius:10px;background:#1C1C1E;color:#8E8E93}
#civMdt .ap-in input{flex:1;min-width:0;background:none;border:0;outline:0;color:#fff;font:inherit;font-size:15px}
#civMdt .ap-av{flex:none;width:44px;height:44px;border-radius:50%;display:grid;place-items:center;font-weight:600;font-size:16px;color:#fff;background:linear-gradient(180deg,#A5A8AF,#6D7078);background-size:cover;background-position:center}
#civMdt .ap-row{display:flex;align-items:center;gap:12px;width:100%;padding:10px 16px;background:none;border:0;color:#fff;text-align:left;cursor:pointer;font:inherit}
#civMdt .ap-row:hover{background:rgba(255,255,255,.04)}#civMdt .ap-row>div{flex:1;min-width:0;border-bottom:.5px solid rgba(255,255,255,.12);padding-bottom:10px}
#civMdt .ap-row b{display:flex;justify-content:space-between;gap:8px;font-size:15.5px;font-weight:600}#civMdt .ap-row b time{font-size:13px;font-weight:400;color:#8E8E93;flex:none}
#civMdt .ap-row small{display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden;font-size:14px;color:#8E8E93;margin-top:2px;line-height:1.3}
#civMdt .ap-row.un small{color:#fff}#civMdt .ap-dot{width:10px;height:10px;border-radius:50%;background:#0A84FF;flex:none;margin-left:-4px}
#civMdt .ap-empty{padding:40px 24px;text-align:center;color:#8E8E93;font-size:15px;line-height:1.45}
#civMdt .ap-th{display:flex;flex-direction:column;align-items:center;gap:4px;padding:4px 16px 10px;border-bottom:.5px solid rgba(255,255,255,.12);position:relative;background:rgba(28,28,30,.7)}
#civMdt .ap-th .ap-av{width:46px;height:46px}#civMdt .ap-th b{font-size:12.5px;font-weight:500}#civMdt .ap-th .ap-ib{position:absolute;left:8px;top:10px;width:auto;padding:0 6px;font-size:16px;gap:2px;display:flex}
#civMdt .ap-msgs{flex:1;min-height:0;overflow-y:auto;padding:12px 12px 6px;display:flex;flex-direction:column;gap:3px;scrollbar-width:none}#civMdt .ap-msgs::-webkit-scrollbar{display:none}
#civMdt .ap-b{max-width:76%;padding:7px 12px;border-radius:18px;font-size:15.5px;line-height:1.3;white-space:pre-wrap;overflow-wrap:anywhere;align-self:flex-start;background:#26252A}
#civMdt .ap-b.me{align-self:flex-end;background:#0A84FF}#civMdt .ap-day{align-self:center;font-size:11.5px;color:#8E8E93;margin:10px 0 4px}
#civMdt .ap-seen{align-self:flex-end;font-size:11px;color:#8E8E93;margin:2px 4px 0}
#civMdt .ap-send{display:flex;align-items:flex-end;gap:8px;padding:8px 10px 10px}
#civMdt .ap-send textarea{flex:1;min-width:0;max-height:110px;resize:none;font:inherit;font-size:15.5px;color:#fff;background:none;border:1px solid #3A3A3C;border-radius:19px;padding:8px 14px;outline:0;line-height:1.3}
#civMdt .ap-send button{width:32px;height:32px;border-radius:50%;border:0;background:#0A84FF;color:#fff;display:grid;place-items:center;cursor:pointer;flex:none;margin-bottom:3px}
#civMdt .ap-send button:disabled{background:#3A3A3C;cursor:default}
#civMdt .ap-err{margin:0 16px 8px;font-size:13px;color:#FF6961}
#civMdt .ap-map{position:absolute;inset:0;background:#3E6972;overflow:hidden}#civMdt .ap-map>svg{position:absolute;inset:0;width:100%;height:100%;touch-action:none;cursor:grab;display:block}
#civMdt .ap-mtop{position:absolute;left:12px;right:12px;top:10px;display:flex;gap:8px;z-index:2}
#civMdt .ap-mtop .ap-in{flex:1;margin:0;background:rgba(30,30,32,.86);-webkit-backdrop-filter:blur(14px);backdrop-filter:blur(14px)}
#civMdt .ap-mbtns{position:absolute;right:12px;top:62px;display:flex;flex-direction:column;border-radius:10px;overflow:hidden;background:rgba(30,30,32,.86);-webkit-backdrop-filter:blur(14px);backdrop-filter:blur(14px);z-index:2}
#civMdt .ap-mbtns button{width:42px;height:42px;border:0;background:none;color:#0A84FF;display:grid;place-items:center;cursor:pointer;font-size:20px}#civMdt .ap-mbtns button+button{border-top:.5px solid rgba(255,255,255,.14)}
#civMdt .ap-card{position:absolute;left:10px;right:10px;bottom:10px;padding:13px 15px;border-radius:16px;background:rgba(30,30,32,.9);-webkit-backdrop-filter:blur(16px);backdrop-filter:blur(16px);z-index:2;font-size:14px;color:#C7C7CC}
#civMdt .ap-card b{display:block;font-size:17px;color:#fff;font-weight:600;margin-bottom:2px}
#civMdt .ap-hits{position:absolute;left:12px;right:62px;top:56px;border-radius:12px;background:rgba(30,30,32,.95);z-index:3;overflow:hidden}
#civMdt .ap-hits button{display:block;width:100%;text-align:left;padding:10px 14px;background:none;border:0;color:#fff;font:inherit;font-size:15px;cursor:pointer;border-top:.5px solid rgba(255,255,255,.1)}#civMdt .ap-hits button:first-child{border-top:0}
#civMdt .ap-news{padding:0 14px 20px;display:grid;gap:14px}
#civMdt .ap-n{border-radius:16px;background:#1C1C1E;padding:15px 16px;display:grid;gap:6px}
#civMdt .ap-n small{font-size:12px;font-weight:700;letter-spacing:.02em;text-transform:uppercase;color:#FF375F}#civMdt .ap-n.srv small{color:#0A84FF}
#civMdt .ap-n b{font-size:18px;font-weight:700;line-height:1.25;letter-spacing:-.01em}#civMdt .ap-n p{margin:0;font-size:14.5px;line-height:1.45;color:#D1D1D6;white-space:pre-wrap}
#civMdt .ap-n ul{margin:2px 0 0;padding-left:18px;font-size:14px;color:#AEAEB2;line-height:1.45}#civMdt .ap-n time{font-size:12.5px;color:#8E8E93}`;
  document.head.appendChild(css);
  const ini = n => String(n || '?').replace(/[^A-Za-z0-9]/g, '').slice(0, 2).toUpperCase() || '?';
  const av = (name, url) => `<span class="ap-av"${url && /^https:\/\//.test(url) ? ` style="background-image:url('${esc(url)}')"` : ''}>${url && /^https:\/\//.test(url) ? '' : esc(ini(name))}</span>`;
  const when = t => { const d = new Date(t), n = new Date(); return d.toDateString() === n.toDateString() ? d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })
    : n - d < 6 * 864e5 ? d.toLocaleDateString([], { weekday: 'long' }) : d.toLocaleDateString([], { month: 'numeric', day: 'numeric', year: '2-digit' }); };

  // ── Messages ──
  let M = null;
  const msgs = addApp({ id: 'msgs', name: 'Messages', color: 'linear-gradient(180deg,#5BF675,#0CBD2A)',
    icon: '<svg width="20" height="20" viewBox="0 0 24 24" fill="#fff" stroke="none"><path d="M12 3C6.5 3 2 6.6 2 11.1c0 2.5 1.4 4.8 3.6 6.3-.2 1.3-.9 2.6-1.9 3.6 2-.1 3.8-.9 5-2 1 .3 2.2.4 3.3.4 5.5 0 10-3.6 10-8.2S17.5 3 12 3Z"/></svg>',
    render: sec => { M = { sec, view: 'list', with: null, last: 0, timer: 0 }; }, onOpen: () => { if (M) { M.view === 'thread' ? openThread(M.with) : listView(); } } });
  const listView = async () => { if (!M) return; M.view = 'list'; clearTimeout(M.timer);
    M.sec.innerHTML = `<div class="ap"><div class="ap-h"><h2>Messages</h2><button type="button" class="ap-ib" data-new aria-label="New message"><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20h9M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z"/></svg></button></div>
      <div class="ap-scroll" id="apList"><p class="ap-empty">Loading…</p></div></div>`;
    try { const j = await call('/texts'); msgs.badge(j.unread); const el = M.sec.querySelector('#apList'); if (!el) return;
      el.innerHTML = j.threads.length ? j.threads.map(t => `<button type="button" class="ap-row${t.unread ? ' un' : ''}" data-with="${t.with}">${t.unread ? '<i class="ap-dot"></i>' : ''}${av(t.name, t.avatar)}<div><b><span>${esc(t.name)}</span><time>${when(t.at)}</time></b><small>${t.mine ? 'You: ' : ''}${esc(t.last)}</small></div></button>`).join('')
        : '<p class="ap-empty">No messages yet.<br>Tap the pencil to text someone in this server.</p>'; } catch (x) { M.sec.querySelector('#apList').innerHTML = `<p class="ap-empty">${esc(x.message)}</p>`; }
    M.timer = setTimeout(() => { if (P.isOpen('msgs') && M.view === 'list') listView(); }, 8000); };
  const compose = () => { M.view = 'new'; clearTimeout(M.timer);
    M.sec.innerHTML = `<div class="ap"><div class="ap-h"><h2 style="font-size:22px">New Message</h2><button type="button" class="ap-ib" data-list style="width:auto;font-size:16px">Cancel</button></div>
      <label class="ap-in"><span>To:</span><input id="apTo" placeholder="Name" autocomplete="off"></label><div class="ap-scroll" id="apPeople"></div></div>`;
    const inp = M.sec.querySelector('#apTo'); let t = 0; const find = async () => { try { const j = await call('/texts/people?q=' + encodeURIComponent(inp.value)); const el = M.sec.querySelector('#apPeople'); if (!el) return;
      el.innerHTML = j.people.length ? j.people.map(p => `<button type="button" class="ap-row" data-with="${p.id}">${av(p.name, p.avatar)}<div><b><span>${esc(p.name)}</span></b></div></button>`).join('') : '<p class="ap-empty">Nobody in this server by that name.</p>'; } catch (x) {} };
    inp.addEventListener('input', () => { clearTimeout(t); t = setTimeout(find, 200); }); find(); inp.focus(); };
  const openThread = async (id, fresh) => { M.view = 'thread'; clearTimeout(M.timer); if (fresh || M.with !== id) { M.with = id; M.last = 0; M.items = []; M.seen = 0;
      M.sec.innerHTML = `<div class="ap"><div class="ap-th"><button type="button" class="ap-ib" data-list><svg width="12" height="20" viewBox="0 0 12 20" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"><path d="M10 2 2 10l8 8"/></svg></button><span id="apWho"></span></div>
        <div class="ap-msgs" id="apMsgs"></div><p class="ap-err" id="apErr" hidden></p><form class="ap-send" id="apSend"><textarea rows="1" name="body" placeholder="Text Message" maxlength="1000"></textarea><button disabled aria-label="Send"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M12 19V5M5 12l7-7 7 7"/></svg></button></form></div>`;
      const ta = M.sec.querySelector('textarea'); ta.addEventListener('input', () => { ta.style.height = 'auto'; ta.style.height = Math.min(110, ta.scrollHeight) + 'px'; M.sec.querySelector('#apSend button').disabled = !ta.value.trim(); });
      ta.addEventListener('keydown', e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); M.sec.querySelector('#apSend').requestSubmit(); } }); }
    try { const j = await call(`/texts/with?id=${id}&after=${M.last}`); if (M.with !== id || M.view !== 'thread') return;
      const who = M.sec.querySelector('#apWho'); if (who && !who.innerHTML) who.innerHTML = `${av(j.name, j.avatar)}<b>${esc(j.name)}</b>`;
      if (j.texts.length) { M.items.push(...j.texts); M.last = j.texts[j.texts.length - 1].id; } M.seen = j.seen; drawThread(); listBadge(); } catch (x) { const e = M.sec.querySelector('#apErr'); if (e) { e.hidden = false; e.textContent = x.message; } }
    M.timer = setTimeout(() => { if (P.isOpen('msgs') && M.view === 'thread' && M.with === id) openThread(id); }, 3000); };
  const drawThread = () => { const el = M.sec.querySelector('#apMsgs'); if (!el) return; const near = el.scrollHeight - el.scrollTop - el.clientHeight < 80; let day = '', out = '';
    const lastMine = [...M.items].reverse().find(t => t.mine);
    for (const t of M.items) { const d = new Date(t.at).toDateString(); if (d !== day) { day = d; out += `<span class="ap-day">${esc(when(t.at))}</span>`; } out += `<div class="ap-b${t.mine ? ' me' : ''}">${esc(t.body)}</div>`;
      if (lastMine && t.id === lastMine.id) out += `<span class="ap-seen">${M.seen >= t.id ? 'Read' : 'Delivered'}</span>`; }
    el.innerHTML = out || '<p class="ap-empty">Say hello.</p>'; if (near || !el.dataset.done) { el.scrollTop = el.scrollHeight; el.dataset.done = 1; } };
  msgs.section.addEventListener('click', e => { const t = e.target.closest('[data-with],[data-new],[data-list]'); if (!t) return;
    if (t.dataset.new != null) return compose(); if (t.dataset.list != null) return listView(); openThread(+t.dataset.with, true); });
  msgs.section.addEventListener('submit', async e => { e.preventDefault(); const f = e.target, ta = f.body, body = ta.value.trim(); if (!body) return; const b = f.querySelector('button'); b.disabled = true;
    try { await call('/texts/send', { to: M.with, body }); ta.value = ''; ta.style.height = 'auto'; await openThread(M.with); } catch (x) { const er = M.sec.querySelector('#apErr'); er.hidden = false; er.textContent = x.message; b.disabled = false; } });
  // the red badge: unread texts, checked now and then
  const listBadge = async () => { try { msgs.badge((await call('/texts/unread')).unread); } catch (e) {} };
  listBadge(); setInterval(() => { if (!document.hidden) listBadge(); }, 20000);

  // ── Maps ──
  const SIZE = 5355, NS = 'http://www.w3.org/2000/svg';
  let G = null;
  const maps = addApp({ id: 'maps', name: 'Maps', color: 'linear-gradient(180deg,#7FE0A0,#35B46B)',
    icon: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m3 6 6-3 6 3 6-3v15l-6 3-6-3-6 3Z"/><path d="M9 3v15M15 6v15"/></svg>',
    render: sec => drawMap(sec), onOpen: () => { if (G) { locate(true); clearInterval(G.timer); G.timer = setInterval(() => { if (P.isOpen('maps')) locate(false); else clearInterval(G.timer); }, 3000); } } });
  const drawMap = sec => { sec.innerHTML = `<div class="ap"><div class="ap-map"><svg id="apSvg" preserveAspectRatio="xMidYMid slice"></svg>
      <div class="ap-mtop"><label class="ap-in"><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round"><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></svg><input id="apQ" placeholder="Search postals" inputmode="numeric" autocomplete="off"></label></div>
      <div class="ap-hits" id="apHits" hidden></div>
      <div class="ap-mbtns"><button type="button" data-z="in" aria-label="Zoom in">+</button><button type="button" data-z="out" aria-label="Zoom out">−</button><button type="button" data-z="me" aria-label="Show where I am"><svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M21 3 3 10.5l7.5 2 2 7.5Z"/></svg></button></div>
      <div class="ap-card" id="apCard">Finding you…</div></div></div>`;
    const svg = sec.querySelector('#apSvg'), el = (tag, at, p) => { const e = document.createElementNS(NS, tag); for (const k in at) e.setAttribute(k, at[k]); if (p) p.appendChild(e); return e; };
    el('image', { href: '/liberty-county.jpg', width: SIZE, height: SIZE, preserveAspectRatio: 'none' }, svg); const g = el('g', {}, svg);
    G = { svg, g, el, vb: [SIZE * .3, SIZE * .45, 1800, 1800], me: null, pin: null, follow: true, timer: 0, postals: null };
    const setVB = () => svg.setAttribute('viewBox', G.vb.map(v => v.toFixed(1)).join(' ')); G.setVB = setVB; setVB();
    const px = () => G.vb[2] / (svg.clientWidth || 360), toMap = e => { const p = svg.createSVGPoint(); p.x = e.clientX; p.y = e.clientY; const q = p.matrixTransform(svg.getScreenCTM().inverse()); return [q.x, q.y]; };
    G.zoom = (f, at) => { const [cx, cy] = at || [G.vb[0] + G.vb[2] / 2, G.vb[1] + G.vb[3] / 2], w = Math.min(SIZE * 1.1, Math.max(250, G.vb[2] * f)); G.vb = [cx - (cx - G.vb[0]) * w / G.vb[2], cy - (cy - G.vb[1]) * w / G.vb[3], w, w]; setVB(); drawDots(); };
    let drag = null; svg.addEventListener('pointerdown', e => { drag = [e.clientX, e.clientY, G.vb[0], G.vb[1]]; svg.setPointerCapture(e.pointerId); G.follow = false; });
    svg.addEventListener('pointermove', e => { if (!drag) return; G.vb[0] = drag[2] - (e.clientX - drag[0]) * px(); G.vb[1] = drag[3] - (e.clientY - drag[1]) * px(); setVB(); });
    svg.addEventListener('pointerup', () => { drag = null; }); svg.addEventListener('wheel', e => { e.preventDefault(); G.follow = false; G.zoom(e.deltaY > 0 ? 1.2 : 1 / 1.2, toMap(e)); }, { passive: false });
    sec.addEventListener('click', e => { const z = e.target.closest('[data-z]'); if (z) { if (z.dataset.z === 'me') { G.follow = true; locate(true); } else G.zoom(z.dataset.z === 'in' ? 1 / 1.5 : 1.5); return; }
      const h = e.target.closest('[data-postal]'); if (h) { goPostal(h.dataset.postal); } });
    const q = sec.querySelector('#apQ'); q.addEventListener('input', async () => { const v = q.value.replace(/\D/g, ''), hits = sec.querySelector('#apHits'); if (!v) { hits.hidden = true; return; }
      if (!G.postals) try { G.postals = (await call('/phone/postals')).postals; } catch (x) { return; }
      const L = Object.keys(G.postals).filter(k => k.startsWith(v)).sort((a, b) => a.length - b.length || +a - +b).slice(0, 6);
      hits.innerHTML = L.length ? L.map(k => `<button type="button" data-postal="${k}">Postal ${k}</button>`).join('') : '<button type="button" disabled>No postal like that</button>'; hits.hidden = false; });
    q.addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); sec.querySelector('#apHits button[data-postal]')?.click(); } }); };
  const goPostal = k => { const p = G.postals?.[k]; if (!p) return; G.pin = { x: p[0], z: p[1], k }; G.follow = false; G.vb = [p[0] - 450, p[1] - 450, 900, 900]; G.setVB(); drawDots();
    const s = G.svg.closest('.ap'); s.querySelector('#apHits').hidden = true; s.querySelector('#apQ').value = '';
    s.querySelector('#apCard').innerHTML = `<b>Postal ${esc(k)}</b>${G.me ? `About ${Math.round(Math.hypot(G.me.x - p[0], G.me.z - p[1]) * .28)} m from you` : 'Dropped a pin here'}`; };
  const drawDots = () => { if (!G) return; G.g.textContent = ''; const r = G.vb[2] / (G.svg.clientWidth || 360);
    if (G.pin) { G.el('path', { d: `M${G.pin.x},${G.pin.z} c${-9 * r},${-12 * r} ${-12 * r},${-18 * r} ${-12 * r},${-24 * r} a${12 * r},${12 * r} 0 1 1 ${24 * r},0 c0,${6 * r} ${-3 * r},${12 * r} ${-12 * r},${24 * r}Z`, fill: '#FF3B30', stroke: '#fff', 'stroke-width': 2 * r }, G.g); }
    if (G.me) { G.el('circle', { cx: G.me.x, cy: G.me.z, r: 22 * r, fill: 'rgba(10,132,255,.22)' }, G.g); G.el('circle', { cx: G.me.x, cy: G.me.z, r: 8 * r, fill: '#0A84FF', stroke: '#fff', 'stroke-width': 3 * r }, G.g); } };
  const locate = async (center) => { if (!G) return; const card = G.svg.closest('.ap')?.querySelector('#apCard'); try { const j = await call('/phone/where');
      if (!j.linked) { G.me = null; card.innerHTML = '<b>Not linked</b>Link your Roblox account in Account settings to see yourself on the map.'; }
      else if (!j.ingame) { G.me = null; if (!G.pin) card.innerHTML = '<b>Not in the game</b>Join the server and you show up here.'; }
      else { G.me = { x: j.x, z: j.z }; if (!G.pin) card.innerHTML = `<b>${esc(j.street || 'You are here')}</b>${j.postal ? 'Postal ' + esc(j.postal) : ''}`;
        if (center || G.follow) { const w = G.vb[2] > 2200 ? 1200 : G.vb[2]; G.vb = [j.x - w / 2, j.z - w / 2, w, w]; G.setVB(); if (center) G.pin = null; } }
      drawDots(); } catch (x) { if (card) card.textContent = x.message; } };

  // ── News ──
  const news = addApp({ id: 'news', name: 'News', color: 'linear-gradient(180deg,#FF5E7E,#E8204F)',
    icon: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 5h13v14H6a2 2 0 0 1-2-2Z"/><path d="M17 9h3v8a2 2 0 0 1-2 2M8 9h5M8 13h5"/></svg>',
    render: sec => { sec.innerHTML = '<div class="ap"><div class="ap-h"><h2>News</h2></div><div class="ap-scroll"><div class="ap-news" id="apNews"><p class="ap-empty">Loading…</p></div></div></div>'; },
    onOpen: async sec => { const el = sec.querySelector('#apNews'); try { const j = await call('/srvstatus'), U = (j.updates || []).slice(0, 30);
      el.innerHTML = U.length ? U.map(u => `<article class="ap-n${u.server ? ' srv' : ''}"><small>${u.server ? esc(OV.name || 'This server') : 'CAD update'}</small><b>${esc(u.title)}</b>${u.body ? `<p>${esc(u.body)}</p>` : ''}
        ${(u.items || []).length ? `<ul>${u.items.map(i => `<li>${esc(i)}</li>`).join('')}</ul>` : ''}<time>${new Date(u.at).toLocaleDateString([], { month: 'long', day: 'numeric' })}${u.by && u.server ? ' · ' + esc(u.by) : ''}</time></article>`).join('')
        : '<p class="ap-empty">No news yet.</p>'; } catch (x) { el.innerHTML = `<p class="ap-empty">${esc(x.message)}</p>`; } } });
  void news; void maps;
};
  if (window.ovPhone) start(); else addEventListener('ovphoneready', start, { once: true });
})();
