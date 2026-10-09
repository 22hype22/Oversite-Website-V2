"""Staff MDT: the Server Staff tab. Players in game with warn / message / kick / ban, mod calls, the community's records,
bans and the in-game command log. Imported by rail.py; apply(s) puts the CSS, page and script in place (replacing older copies)."""
import re

CSS = r"""  /* staff:start  Staff MDT (Server Staff tab) */
  body[data-view="staff"] .rail,body[data-view="staff"] .stage,body[data-view="staff"] .pins{display:none}
  body[data-view="staff"] .view::after{opacity:.5}
  .staffp .ph .sv{display:flex;align-items:center;gap:10px;min-width:0}
  .staffp .ph .sv b{display:block;font-size:15px;font-weight:500}
  .staffp .ph .sv small{display:block;font-size:11px;color:var(--dim);margin-top:1px}
  .staffp .live{width:8px;height:8px;border-radius:50%;background:var(--green);box-shadow:0 0 0 3px rgba(70,208,124,.18);flex:none}
  .staffp .live.off{background:var(--faint);box-shadow:none}
  .st-search{margin:12px 18px 4px;display:flex;align-items:center;gap:8px;padding:8px 11px;border-radius:10px;background:rgba(240,242,245,.05);border:1px solid var(--hair)}
  .st-search input{flex:1;min-width:0;background:none;border:0;outline:0;color:var(--ink);font:inherit;font-size:12.5px}
  .st-search svg{color:var(--faint);flex:none}
  .st-list{display:grid;gap:2px}
  .st-p{display:grid;grid-template-columns:30px 1fr auto;align-items:center;gap:10px;padding:8px 10px;border-radius:11px;cursor:pointer;text-align:left;width:100%;background:none;border:1px solid transparent;color:inherit;font:inherit}
  .st-p:hover{background:rgba(240,242,245,.05)}
  .st-p[aria-pressed="true"]{background:rgba(240,242,245,.08);border-color:var(--hair2)}
  .st-av{width:30px;height:30px;border-radius:9px;display:grid;place-items:center;font-size:11px;font-weight:600;background:rgba(240,242,245,.08);color:var(--ink)}
  .st-p b{display:block;font-size:12.5px;font-weight:500;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
  .st-p small{display:flex;align-items:center;gap:6px;font-size:10.5px;color:var(--dim);white-space:nowrap;overflow:hidden}
  .st-team{display:inline-flex;align-items:center;gap:5px}.st-team i{width:6px;height:6px;border-radius:50%;background:var(--c,#8A8F98)}
  .st-badges{display:flex;gap:4px}
  .st-b{font-size:9.5px;font-weight:600;padding:2px 6px;border-radius:6px;letter-spacing:.02em;white-space:nowrap}
  .st-b.perm{color:#9DBEFF;background:rgba(76,141,255,.14)}
  .st-b.w{color:#F1C48A;background:rgba(233,162,76,.14)} .st-b.k{color:#F0A0A0;background:rgba(226,75,75,.14)} .st-b.bn{color:#fff;background:rgba(226,75,75,.55)}
  .st-tabs{display:flex;gap:4px;padding:10px 14px 0;border-bottom:1px solid var(--hair);overflow-x:auto;scrollbar-width:none}
  .st-tabs button{background:none;border:0;color:var(--dim);font:inherit;font-size:12.5px;padding:9px 12px 11px;border-bottom:2px solid transparent;cursor:pointer;white-space:nowrap;display:flex;align-items:center;gap:6px}
  .st-tabs button[aria-selected="true"]{color:var(--ink);border-bottom-color:var(--ink)}
  .st-tabs .cnt{font-size:10px}
  .st-tabs .st-btn{border:1px solid var(--hair2);background:rgba(240,242,245,.06);color:var(--ink);padding:6px 13px;border-radius:999px}
  .st-pane[hidden]{display:none}
  .st-who{display:flex;align-items:center;gap:14px;margin-bottom:14px}
  .st-who .st-av{width:46px;height:46px;border-radius:13px;font-size:16px}
  .st-who h3{margin:0;font-size:17px;font-weight:500}
  .st-who p{margin:3px 0 0;font-size:11.5px;color:var(--dim)}
  .st-facts{display:grid;grid-template-columns:repeat(auto-fit,minmax(120px,1fr));gap:8px;margin-bottom:14px}
  .st-facts div{padding:10px 12px;border-radius:11px;background:rgba(240,242,245,.04);border:1px solid var(--hair)}
  .st-facts small{display:block;font-size:10px;color:var(--faint);text-transform:uppercase;letter-spacing:.06em}
  .st-facts b{display:block;font-size:13px;font-weight:500;margin-top:3px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
  .st-acts{display:grid;grid-template-columns:repeat(5,1fr);gap:8px;margin-bottom:18px}
  .st-act{display:flex;flex-direction:column;align-items:center;gap:6px;padding:12px 6px;border-radius:12px;border:1px solid var(--hair2);background:rgba(240,242,245,.05);color:var(--ink);font:inherit;font-size:12px;font-weight:500;cursor:pointer;transition:background-color .15s ease,transform .12s cubic-bezier(0.23,1,0.32,1)}
  .st-act:active{transform:scale(.97)}
  .st-act svg{opacity:.85}
  .st-act.k-warn{color:#F1C48A}.st-act.k-kick{color:#F0A0A0}.st-act.k-ban{color:#fff;background:rgba(226,75,75,.22);border-color:rgba(226,75,75,.45)}
  @media (hover:hover) and (pointer:fine){.st-act:hover{background:rgba(240,242,245,.1)}.st-act.k-ban:hover{background:rgba(226,75,75,.32)}}
  .st-h{display:flex;align-items:center;justify-content:space-between;font-size:12px;color:var(--dim);margin:4px 0 8px}
  .st-rec{display:grid;grid-template-columns:62px 1fr auto;gap:4px 12px;align-items:start;padding:11px 0;border-bottom:1px solid var(--hair)}
  .st-rec:last-child{border-bottom:0}
  .st-k{font-size:9.5px;font-weight:600;letter-spacing:.05em;text-transform:uppercase;padding:3px 7px;border-radius:6px;margin-top:1px}
  .st-k.k-warn{color:#F1C48A;background:rgba(233,162,76,.14)}.st-k.k-kick{color:#F0A0A0;background:rgba(226,75,75,.14)}.st-k.k-ban{color:#fff;background:rgba(226,75,75,.55)}
  .st-k.k-unban{color:#7BE3A1;background:rgba(70,208,124,.12)}.st-k.k-note{color:var(--dim);background:rgba(240,242,245,.07)}
  .st-rec b{font-size:12.5px;font-weight:500}.st-rec p{margin:2px 0 0;font-size:12px;color:var(--dim);line-height:1.45;word-break:break-word}
  .st-rec time{font-size:10.5px;color:var(--faint);white-space:nowrap;font-variant-numeric:tabular-nums}
  .st-rec .side{display:flex;flex-direction:column;align-items:flex-end;gap:6px}
  .st-k{justify-self:start}
  .st-rec .x{background:none;border:0;color:var(--faint);font:inherit;font-size:10.5px;cursor:pointer;padding:0}
  .st-rec .x:hover{color:#F0A0A0}
  .st-row{display:flex;align-items:center;gap:10px;padding:10px 0;border-bottom:1px solid var(--hair);font-size:12.5px}
  .st-row:last-child{border-bottom:0}
  .st-row .grow{flex:1;min-width:0}.st-row small{color:var(--faint);font-size:10.5px}
  .st-row code{font-family:ui-monospace,SFMono-Regular,Menlo,monospace;font-size:11.5px;color:var(--ink);word-break:break-all}
  .st-row .lnk{background:none;border:0;color:var(--ink);font:inherit;padding:0;cursor:pointer;text-decoration:underline;text-decoration-color:var(--hair2);text-underline-offset:3px}
  .st-pill{font-size:10.5px;padding:3px 9px;border-radius:999px;white-space:nowrap}
  .st-pill.wait{color:#F1C48A;background:rgba(233,162,76,.14)}.st-pill.done{color:var(--dim);background:rgba(240,242,245,.07)}
  .st-btn{font:inherit;font-size:11.5px;font-weight:500;padding:6px 11px;border-radius:999px;border:1px solid var(--hair2);background:rgba(240,242,245,.06);color:var(--ink);cursor:pointer;white-space:nowrap}
  .st-btn:hover{background:rgba(240,242,245,.12)}
  .st-empty{padding:28px 6px;text-align:center;color:var(--faint);font-size:12px;line-height:1.5}
  .st-gate{display:grid;place-items:center;text-align:center;padding:40px 20px;color:var(--dim);font-size:13px;grid-column:1/-1}
  .st-gate b{display:block;color:var(--ink);font-size:16px;font-weight:500;margin-bottom:6px}
  /* the action sheet */
  .st-dlg{width:min(440px,calc(100vw - 32px));padding:0;border:1px solid var(--hair2);border-radius:18px;background:rgba(20,21,24,.97);color:var(--ink);box-shadow:0 30px 80px rgba(0,0,0,.55);
    opacity:0;transform:translateY(8px) scale(.98);transition:opacity .18s ease-out,transform .22s cubic-bezier(0.23,1,0.32,1)}
  .st-dlg.in{opacity:1;transform:none}
  .st-dlg::backdrop{background:rgba(6,7,8,.6);backdrop-filter:blur(4px)}
  .st-dlg form{padding:20px}
  .st-dlg h2{margin:0 0 4px;font-size:16px;font-weight:600}
  .st-dlg p{margin:0 0 14px;color:var(--dim);font-size:12.5px;line-height:1.5}
  .st-dlg textarea{width:100%;min-height:84px;resize:vertical;background:rgba(240,242,245,.05);border:1px solid var(--hair2);border-radius:11px;color:var(--ink);font:inherit;font-size:13px;padding:10px 12px;outline:0}
  .st-dlg textarea:focus{border-color:rgba(240,242,245,.4)}
  .st-chips{display:flex;flex-wrap:wrap;gap:6px;margin:10px 0 0}
  .st-chips button{font:inherit;font-size:11px;padding:4px 9px;border-radius:999px;border:1px solid var(--hair2);background:none;color:var(--dim);cursor:pointer}
  .st-chips button:hover{color:var(--ink);border-color:rgba(240,242,245,.3)}
  .st-dlg .acts{display:flex;justify-content:flex-end;gap:8px;margin-top:18px;align-items:center}
  .st-dlg .acts .msg{flex:1;font-size:11.5px;color:var(--dim)}
  .st-dlg .acts .msg.err{color:#F0A0A0}
  .st-go{font:inherit;font-size:12.5px;font-weight:600;padding:9px 16px;border-radius:999px;border:1px solid transparent;background:var(--ink);color:#0B0B0C;cursor:pointer}
  .st-go.danger{background:#E24B4B;color:#fff}.st-go[disabled]{opacity:.55;pointer-events:none}
  @media (max-width:980px){.st-acts{grid-template-columns:repeat(3,1fr)}}
  @media (prefers-reduced-motion:reduce){.st-dlg{transition:opacity .15s}}
  /* staff:end */
"""

HTML = r"""<!-- staff:start -->
<section class="page staffp" id="pageStaff" hidden aria-label="Server staff">
  <div class="card panel">
    <div class="ph"><div class="sv"><i class="live off" id="stLive"></i><div><b>In game</b><small id="stServer">Connecting…</small></div></div><span class="cnt" id="stCount">0</span></div>
    <label class="st-search"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></svg><input id="stFind" placeholder="Find a player" autocomplete="off" spellcheck="false"></label>
    <div class="scroll"><div class="st-list" id="stPlayers"></div></div>
  </div>
  <div class="card panel">
    <div class="st-tabs" role="tablist" id="stTabs">
      <button role="tab" data-p="player" aria-selected="true">Player</button>
      <button role="tab" data-p="calls" aria-selected="false">Mod calls <span class="cnt" id="stCallsN">0</span></button>
      <button role="tab" data-p="records" aria-selected="false">Records</button>
      <button role="tab" data-p="bans" aria-selected="false">Bans <span class="cnt" id="stBansN">0</span></button>
      <button role="tab" data-p="logs" aria-selected="false">Logs</button>
      <span style="flex:1"></span><button class="st-btn" id="stAnnounce" style="align-self:center;margin-bottom:6px">Announce</button>
    </div>
    <div class="scroll">
      <div class="st-pane" data-p="player" id="stPlayer"></div>
      <div class="st-pane" data-p="calls" id="stCalls" hidden></div>
      <div class="st-pane" data-p="records" hidden><label class="st-search" style="margin:0 0 8px"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></svg><input id="stRecFind" placeholder="Search records by player" autocomplete="off" spellcheck="false"></label><div id="stRecords"></div></div>
      <div class="st-pane" data-p="bans" id="stBans" hidden></div>
      <div class="st-pane" data-p="logs" id="stLogs" hidden></div>
    </div>
  </div>
</section>
<dialog class="st-dlg" id="stDlg"><form method="dialog"><h2 id="stDlgT">Warn</h2><p id="stDlgP"></p><textarea id="stDlgR" maxlength="180"></textarea><div class="st-chips" id="stDlgC"></div>
  <div class="acts"><span class="msg" id="stDlgM"></span><button type="button" class="st-btn" id="stDlgX">Cancel</button><button class="st-go" id="stDlgGo">Send</button></div></form></dialog>
<!-- staff:end -->
"""

JS = r"""<script id="staff">
/* Staff MDT: polls the community's staff view while the tab is open; every action goes through the server, which runs it in game and keeps the record */
(() => {
  const OV = window.OVERSITE, tab = document.querySelector('.menu [data-view="staff"]'); if (!tab) return;
  const page = document.getElementById('pageStaff'), $ = id => document.getElementById(id);
  const isStaff = !!OV && ['staff', 'admin', 'owner'].includes(OV.role), isAdmin = !!OV && ['admin', 'owner'].includes(OV.role);
  if (OV && !isStaff) { tab.remove(); dispatchEvent(new Event('resize')); return; }             // members never see the staff tab
  if (!OV) { page.innerHTML = '<div class="st-gate"><div><b>Server Staff</b>Open your server\'s CAD from the dashboard to use the staff tools.</div></div>'; return; }
  const API = OV.api + '/staff', post = (p, b) => fetch(API + p, { method: 'POST', headers: { 'content-type': 'application/json', 'x-oversite': '1' }, body: JSON.stringify(b) }).then(async r => { const j = await r.json().catch(() => ({})); if (!r.ok) throw new Error(j.error || 'Something went wrong.'); return j; });
  const esc = t => String(t ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const COL = { pd: '#4C8DFF', fd: '#E24B4B', dot: '#E9C24C' }, deptOf = team => (OV.teams || {})[team] || '';
  const ago = ms => { const s = Math.max(0, (Date.now() - ms) / 1000); return s < 60 ? 'just now' : s < 3600 ? Math.floor(s / 60) + 'm ago' : s < 86400 ? Math.floor(s / 3600) + 'h ago' : Math.floor(s / 86400) + 'd ago'; };
  const when = ms => new Date(ms).toLocaleString([], { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
  const ini = n => (n || '?').replace(/[^A-Za-z0-9]/g, '').slice(0, 2).toUpperCase() || '?';
  const KIND = { warn: 'Warning', kick: 'Kick', ban: 'Ban', unban: 'Unban', note: 'Note' };
  let D = null, sel = null, pane = 'player', timer = 0, recQ = '';

  // ── data ──
  const load = async () => { try { const r = await fetch(API + '/state'); const j = await r.json(); if (!r.ok) throw new Error(j.error || 'Could not load.'); D = j; render(); }
    catch (e) { $('stServer').textContent = e.message; $('stLive').classList.add('off'); } };
  const start = () => { if (timer) return; load(); timer = setInterval(() => { if (!document.hidden) load(); }, 5000); };
  const stop = () => { clearInterval(timer); timer = 0; };
  addEventListener('viewchange', e => (e.detail === 'staff' ? start() : stop()));

  // ── rendering ──
  const counts = id => (D && D.counts[id]) || {};
  const badges = p => { const c = counts(p.id); return [p.permission && p.permission !== 'Normal' ? `<span class="st-b perm">${esc(p.permission.replace('Server ', ''))}</span>` : '',
    c.warn ? `<span class="st-b w">${c.warn} warn${c.warn > 1 ? 's' : ''}</span>` : '', c.kick ? `<span class="st-b k">${c.kick} kick${c.kick > 1 ? 's' : ''}</span>` : ''].join(''); };
  const renderPlayers = () => { const q = $('stFind').value.trim().toLowerCase(), list = (D.players || []).filter(p => !q || p.name.toLowerCase().includes(q) || p.callsign.toLowerCase().includes(q) || p.team.toLowerCase().includes(q));
    $('stCount').textContent = D.players.length;
    $('stPlayers').innerHTML = list.length ? list.map(p => `<button class="st-p" data-id="${esc(p.id)}" aria-pressed="${sel && sel.id === p.id}"><span class="st-av">${esc(ini(p.name))}</span><span style="min-width:0"><b>${esc(p.name)}</b><small><span class="st-team" style="--c:${COL[deptOf(p.team)] || '#8A8F98'}"><i></i>${esc(p.team || 'No team')}</span>${p.callsign ? ' · ' + esc(p.callsign) : ''}</small></span><span class="st-badges">${badges(p)}</span></button>`).join('')
      : `<div class="st-empty">${D.players.length ? 'No player matches that.' : 'Nobody is in the server right now.'}</div>`; };
  const recHTML = (r, withName) => `<div class="st-rec"><span class="st-k k-${esc(r.kind)}">${esc(KIND[r.kind] || r.kind)}</span><div>${withName ? `<b>${r.roblox_id ? `<button class="lnk" data-open="${esc(r.roblox_id)}" data-name="${esc(r.name)}" style="background:none;border:0;color:inherit;font:inherit;padding:0;cursor:pointer">${esc(r.name)}</button>` : esc(r.name)}</b>` : ''}<p>${esc(r.reason) || '<i>No reason given</i>'}</p><p style="font-size:10.5px;color:var(--faint);margin-top:3px">by ${esc(r.by_name || 'staff')}${r.result && r.result !== 'sent' ? ' · ' + esc(r.result) : ''}</p></div><span class="side"><time title="${esc(when(r.created))}">${esc(ago(r.created))}</time>${isAdmin ? `<button class="x" data-del="${r.id}">Delete</button>` : ''}</span></div>`;
  const ICON = { warn: '<path d="M12 3 2 21h20zM12 10v5M12 18h.01"/>', pm: '<path d="M4 5h16v11H8l-4 4z"/>', kick: '<path d="M15 3h4v18h-4M10 17l5-5-5-5M15 12H3"/>', ban: '<circle cx="12" cy="12" r="9"/><path d="m6 6 12 12"/>', note: '<path d="M6 3h8l4 4v14H6zM14 3v4h4M9 12h6M9 16h6"/>' };
  const actBtn = (k, label) => `<button class="st-act k-${k}" data-act="${k}"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${ICON[k]}</svg>${label}</button>`;
  let shownFor = null;
  const renderPlayer = async () => { const box = $('stPlayer');
    if (!sel) { box.innerHTML = '<div class="st-empty">Pick a player on the left to warn, message, kick or ban them and see their record.</div>'; shownFor = null; return; }
    const live = (D.players || []).find(p => p.id === sel.id), p = live || sel;
    const facts = live ? [['Team', p.team || 'None'], ['Callsign', p.callsign || 'None'], ['Location', p.postal ? `${p.postal} ${p.street}`.trim() : 'Unknown'], ['In-game role', (p.permission || 'Normal').replace('Server ', '')]] : [['Status', 'Not in the server']];
    const head = `<div class="st-who"><span class="st-av">${esc(ini(p.name))}</span><div><h3>${esc(p.name)}</h3><p>Roblox ID ${esc(p.id || 'unknown')}${live ? '' : ' · offline'}</p></div></div>
      <div class="st-facts">${facts.map(([k, v]) => `<div><small>${k}</small><b>${esc(v)}</b></div>`).join('')}</div>
      <div class="st-acts">${actBtn('warn', 'Warn')}${actBtn('pm', 'Message')}${actBtn('kick', 'Kick')}${actBtn('ban', 'Ban')}${actBtn('note', 'Note')}</div><div class="st-h"><span>Record</span><span id="stRecN"></span></div><div id="stHist"><div class="st-empty">Loading…</div></div>`;
    if (shownFor !== p.id + ':' + !!live) { box.innerHTML = head; shownFor = p.id + ':' + !!live; }
    else { const f = box.querySelector('.st-facts'); if (f) f.innerHTML = facts.map(([k, v]) => `<div><small>${k}</small><b>${esc(v)}</b></div>`).join(''); }
    const r = await fetch(API + '/records?' + new URLSearchParams({ id: p.id || '', name: p.name })).then(x => x.json()).catch(() => ({ records: [] }));
    if (!sel || sel.id !== p.id) return; const h = $('stHist'); if (!h) return;
    $('stRecN').textContent = r.records.length ? r.records.length + ' on file' : '';
    h.innerHTML = r.records.length ? r.records.map(x => recHTML(x, false)).join('') : '<div class="st-empty">Clean record. Nothing on file for this player.</div>'; };
  const renderCalls = () => { const c = D.modCalls || [], open = c.filter(m => !m.moderator).length; $('stCallsN').textContent = open;
    $('stCalls').innerHTML = c.length ? c.map(m => `<div class="st-row"><span class="grow"><button class="lnk" data-open="${esc(m.caller.id)}" data-name="${esc(m.caller.name)}">${esc(m.caller.name)}</button> called for staff<br><small>${esc(ago(m.at * 1000))}</small></span>${m.moderator ? `<span class="st-pill done">Answered by ${esc(m.moderator.name)}</span>` : '<span class="st-pill wait">Waiting</span>'}</div>`).join('') : '<div class="st-empty">No mod calls right now.</div>'; };
  const renderBans = () => { const b = D.bans || []; $('stBansN').textContent = b.length;
    $('stBans').innerHTML = b.length ? b.map(x => `<div class="st-row"><span class="st-av" style="width:28px;height:28px">${esc(ini(x.name))}</span><span class="grow"><button class="lnk" data-open="${esc(x.id)}" data-name="${esc(x.name)}">${esc(x.name)}</button><br><small>ID ${esc(x.id)}</small></span><button class="st-btn" data-unban="${esc(x.id)}" data-name="${esc(x.name)}">Unban</button></div>`).join('') : '<div class="st-empty">Nobody is banned from this server.</div>'; };
  const renderLogs = () => { const cmds = D.commands || [], kills = D.kills || [];
    $('stLogs').innerHTML = `<div class="st-h"><span>Commands</span></div>${cmds.length ? cmds.map(m => `<div class="st-row"><span class="grow"><code>${esc(m.command)}</code><br><small>${esc(m.by.name)} · ${esc(ago(m.at * 1000))}</small></span></div>`).join('') : '<div class="st-empty">No commands yet.</div>'}
      <div class="st-h" style="margin-top:16px"><span>Kills</span></div>${kills.length ? kills.map(k => `<div class="st-row"><span class="grow"><button class="lnk" data-open="${esc(k.killer.id)}" data-name="${esc(k.killer.name)}">${esc(k.killer.name)}</button> killed <button class="lnk" data-open="${esc(k.killed.id)}" data-name="${esc(k.killed.name)}">${esc(k.killed.name)}</button><br><small>${esc(ago(k.at * 1000))}</small></span></div>`).join('') : '<div class="st-empty">No kills logged.</div>'}`; };
  const renderRecords = async () => { const r = await fetch(API + '/records?' + new URLSearchParams(recQ ? { q: recQ } : {})).then(x => x.json()).catch(() => ({ records: [] }));
    $('stRecords').innerHTML = r.records.length ? r.records.map(x => recHTML(x, true)).join('') : `<div class="st-empty">${recQ ? 'No records match that.' : 'No records yet. Warnings, kicks, bans and notes you give show up here.'}</div>`; };
  const render = () => { if (!D) return; $('stLive').classList.remove('off'); $('stServer').textContent = `${D.server.name || 'Server'} · ${D.server.players ?? D.players.length}/${D.server.max ?? '?'} players`;
    renderPlayers(); renderCalls(); renderBans(); renderLogs(); if (pane === 'player') renderPlayer(); };

  // ── navigation ──
  const show = p => { pane = p; document.querySelectorAll('#stTabs [data-p]').forEach(b => b.setAttribute('aria-selected', b.dataset.p === p)); document.querySelectorAll('.st-pane').forEach(x => (x.hidden = x.dataset.p !== p));
    if (p === 'records') renderRecords(); if (p === 'player') renderPlayer(); };
  const open = (id, name) => { const live = D && D.players.find(p => p.id === id); sel = live || { id, name, team: '', callsign: '', permission: '' }; show('player'); if (D) renderPlayers(); };
  $('stTabs').addEventListener('click', e => { const b = e.target.closest('[data-p]'); if (b) show(b.dataset.p); });
  $('stFind').addEventListener('input', () => D && renderPlayers());
  let rq; $('stRecFind').addEventListener('input', e => { clearTimeout(rq); rq = setTimeout(() => { recQ = e.target.value.trim(); renderRecords(); }, 250); });
  page.addEventListener('click', async e => {
    const pl = e.target.closest('.st-p'); if (pl) return open(pl.dataset.id, pl.querySelector('b').textContent);
    const o = e.target.closest('[data-open]'); if (o) return open(o.dataset.open, o.dataset.name);
    const a = e.target.closest('[data-act]'); if (a && sel) return sheet(a.dataset.act, sel);
    const u = e.target.closest('[data-unban]'); if (u) return sheet('unban', { id: u.dataset.unban, name: u.dataset.name });
    const d = e.target.closest('[data-del]'); if (d) { if (!d.dataset.armed) { d.dataset.armed = '1'; d.textContent = 'Click again to delete'; setTimeout(() => { delete d.dataset.armed; d.textContent = 'Delete'; }, 3000); return; }
      try { await post('/records/delete', { id: +d.dataset.del }); toast('Record deleted.'); pane === 'records' ? renderRecords() : (shownFor = null, renderPlayer()); load(); } catch (x) { toast(x.message); } } });
  $('stAnnounce').addEventListener('click', () => sheet('announce', null));

  // ── the action sheet ──
  const SHEETS = {
    warn: { t: 'Warn', p: n => `${n} gets this warning as a private message in game, and it goes on their record.`, ph: 'What did they do?', go: 'Send warning', chips: ['RDM', 'VDM', 'Fail RP', 'Trolling', 'Breaking traffic laws', 'Not following staff instructions'] },
    pm: { t: 'Message', p: n => `Sends a private message to ${n} in game.`, ph: 'Your message', go: 'Send', chips: ['Please come to the staff spot', 'Please stop that', 'Thanks for reporting'] },
    kick: { t: 'Kick', p: n => `Removes ${n} from the server. They can join again.`, ph: 'Reason for the kick', go: 'Kick', danger: true, chips: ['RDM', 'VDM', 'Fail RP', 'Trolling', 'Exploiting'] },
    ban: { t: 'Ban', p: n => `Bans ${n} from the server until someone unbans them. The reason is saved on their record.`, ph: 'Reason for the ban', go: 'Ban', danger: true, chips: ['Exploiting', 'Repeated RDM', 'Harassment', 'Ban evasion'] },
    unban: { t: 'Unban', p: n => `Lets ${n} join the server again.`, ph: 'Why are they being unbanned? (optional)', go: 'Unban', chips: ['Appeal accepted', 'Ban expired'] },
    note: { t: 'Add note', p: n => `A private note on ${n}'s record. Nothing is sent in game.`, ph: 'Note for other staff', go: 'Save note', chips: [] },
    announce: { t: 'Announce', p: () => 'Shows a message to everyone in the server.', ph: 'Message to the whole server', go: 'Announce', chips: ['Server restart in 5 minutes', 'Staff are watching, roleplay properly', 'Join our Discord for updates'] },
  };
  const dlg = $('stDlg'); let cur = null;
  const sheet = (kind, who) => { const S = SHEETS[kind]; cur = { kind, who };
    $('stDlgT').textContent = S.t + (who ? ' ' + who.name : ''); $('stDlgP').textContent = S.p(who ? who.name : ''); $('stDlgR').value = ''; $('stDlgR').placeholder = S.ph;
    $('stDlgC').innerHTML = S.chips.map(c => `<button type="button">${esc(c)}</button>`).join(''); $('stDlgM').textContent = ''; $('stDlgM').className = 'msg';
    const go = $('stDlgGo'); go.textContent = S.go; go.className = 'st-go' + (S.danger ? ' danger' : ''); go.disabled = false;
    dlg.showModal(); requestAnimationFrame(() => dlg.classList.add('in')); $('stDlgR').focus(); };
  $('stDlgC').addEventListener('click', e => { const b = e.target.closest('button'); if (!b) return; const r = $('stDlgR'); r.value = r.value ? r.value.replace(/\s*$/, '') + ', ' + b.textContent : b.textContent; r.focus(); });
  $('stDlgX').addEventListener('click', () => dlg.close());
  dlg.addEventListener('close', () => dlg.classList.remove('in'));
  dlg.addEventListener('click', e => { if (e.target === dlg) dlg.close(); });
  dlg.querySelector('form').addEventListener('submit', async e => { e.preventDefault(); const go = $('stDlgGo'), m = $('stDlgM'); go.disabled = true;
    m.className = 'msg'; m.textContent = ['note'].includes(cur.kind) ? 'Saving…' : 'Sending in game…';
    const slow = setTimeout(() => { m.textContent = 'Waiting for ER:LC (one command every 5 seconds)…'; }, 1500);
    try { const r = await post('/action', { kind: cur.kind, name: cur.who ? cur.who.name : '', id: cur.who ? cur.who.id : '', reason: $('stDlgR').value });
      clearTimeout(slow); dlg.close(); toast(r.delivered === false ? r.message : `${SHEETS[cur.kind].t} done${cur.who ? ' for ' + cur.who.name : ''}.`); load(); if (pane === 'player') { shownFor = null; renderPlayer(); } }
    catch (x) { clearTimeout(slow); m.className = 'msg err'; m.textContent = x.message; go.disabled = false; } });
  const toast = msg => { let t = document.querySelector('.toast'); if (!t) { t = document.createElement('div'); t.className = 'toast'; document.body.appendChild(t); } t.textContent = msg; t.classList.add('on'); clearTimeout(t._h); t._h = setTimeout(() => t.classList.remove('on'), 2800); };
  show('player');
})();
</script>
"""

def apply(s):
    s = re.sub(r'  /\* staff:start.*?/\* staff:end \*/\n', '', s, flags=re.S)
    s = re.sub(r'<!-- staff:start -->.*?<!-- staff:end -->\n', '', s, flags=re.S)
    s = re.sub(r'<script id="staff">.*?</script>\n', '', s, flags=re.S)
    s = s.replace('</style>', CSS + '</style>', 1)
    # the Server Staff tab opens this page, routed like Status
    s = s.replace('<button role="tab" aria-selected="false">Server Staff</button>', '<button role="tab" aria-selected="false" data-view="staff">Server Staff</button>', 1)
    s = s.replace("const PAGES = { status: 'pageStatus' };", "const PAGES = { status: 'pageStatus', staff: 'pageStaff' };", 1)
    s = s.replace('<!-- ─────────── MDT: iPad on the map ─────────── -->', HTML + '<!-- ─────────── MDT: iPad on the map ─────────── -->', 1)
    s = s.replace('</body>', JS + '</body>', 1)
    return s
