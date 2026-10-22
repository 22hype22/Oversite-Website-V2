// Court, an app on the Civilian phone (app/court.mjs): file a civil suit against another player, then argue it out in the case:
// messages, evidence links (pictures show), settlement offers the other side accepts or declines. Judges (named by admins, and
// admins themselves) see every case, take one, set a hearing and rule. Lawyers represent a side when a party adds them, and get the
// law library and the public record (read only). Admins name the judges and lawyers under Staff.
(() => { const start = () => { const P = window.ovPhone, OV = window.OVERSITE || {}; if (!P || (OV.features || {}).court === false) return; const { addApp, call, esc } = P;
  const css = document.createElement('style'); css.textContent = `
#civMdt .ct-seg{display:flex;margin:0 16px 10px;padding:2px;border-radius:9px;background:#1C1C1E}#civMdt .ct-seg button{flex:1;padding:6px 4px;border:0;border-radius:7px;background:none;color:#fff;font:inherit;font-size:13px;font-weight:500;cursor:pointer}
#civMdt .ct-seg button[aria-pressed="true"]{background:#636366}
#civMdt .ct-row{display:block;width:100%;text-align:left;padding:12px 16px;background:none;border:0;border-bottom:.5px solid rgba(255,255,255,.12);color:#fff;font:inherit;cursor:pointer;position:relative}
#civMdt .ct-row:hover{background:rgba(255,255,255,.04)}#civMdt .ct-row b{display:flex;gap:8px;align-items:baseline;font-size:15.5px;font-weight:600}#civMdt .ct-row b span{flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
#civMdt .ct-row small{display:block;font-size:13.5px;color:#8E8E93;margin-top:3px}#civMdt .ct-row .ap-dot{position:absolute;left:5px;top:19px}
#civMdt .ct-num{font-size:12px;font-weight:600;color:#8E8E93;font-variant-numeric:tabular-nums}
#civMdt .ct-pill{display:inline-block;font-size:11.5px;font-weight:600;padding:2px 8px;border-radius:999px;background:#2C2C2E;color:#D1D1D6}#civMdt .ct-pill.open{background:rgba(10,132,255,.2);color:#64D2FF}#civMdt .ct-pill.win{background:rgba(48,209,88,.18);color:#30D158}#civMdt .ct-pill.lose{background:rgba(255,69,58,.18);color:#FF6961}
#civMdt .ct-form{display:grid;gap:12px;padding:0 16px 24px}#civMdt .ct-form label{display:grid;gap:5px;font-size:13px;color:#8E8E93}
#civMdt .ct-form input,#civMdt .ct-form textarea,#civMdt .ct-form select{font:inherit;font-size:15px;color:#fff;background:#1C1C1E;border:0;border-radius:10px;padding:10px 12px;outline:0;width:100%;box-sizing:border-box;color-scheme:dark}
#civMdt .ct-form textarea{resize:vertical;min-height:110px;line-height:1.4}#civMdt .ct-go{font:inherit;font-size:16px;font-weight:600;padding:12px;border-radius:12px;border:0;background:#0A84FF;color:#fff;cursor:pointer}#civMdt .ct-go:disabled{opacity:.5}
#civMdt .ct-who{display:flex;flex-wrap:wrap;gap:6px}#civMdt .ct-who button{display:flex;align-items:center;gap:6px;padding:4px 10px 4px 4px;border-radius:999px;border:0;background:#1C1C1E;color:#fff;font:inherit;font-size:14px;cursor:pointer}
#civMdt .ct-who button[aria-pressed="true"]{background:#0A84FF}#civMdt .ct-who .ap-av{width:26px;height:26px;font-size:11px}
#civMdt .ct-head{margin:0 12px 8px;padding:14px;border-radius:14px;background:#1C1C1E;display:grid;gap:6px}#civMdt .ct-head h3{margin:0;font-size:18px;font-weight:700;line-height:1.25}
#civMdt .ct-vs{font-size:14px;color:#D1D1D6}#civMdt .ct-meta{font-size:13px;color:#8E8E93;line-height:1.45}
#civMdt .ct-acts{display:flex;gap:6px;overflow-x:auto;padding:0 12px 8px;scrollbar-width:none}#civMdt .ct-acts::-webkit-scrollbar{display:none}
#civMdt .ct-acts button{flex:none;font:inherit;font-size:13.5px;font-weight:500;padding:7px 13px;border-radius:999px;border:0;background:#2C2C2E;color:#0A84FF;cursor:pointer}#civMdt .ct-acts button.bad{color:#FF6961}
#civMdt .ct-sheet{margin:0 12px 8px;padding:12px;border-radius:14px;background:#1C1C1E;display:grid;gap:8px}#civMdt .ct-sheet b{font-size:15px}
#civMdt .ct-sheet input,#civMdt .ct-sheet textarea,#civMdt .ct-sheet select{font:inherit;font-size:15px;color:#fff;background:#2C2C2E;border:0;border-radius:9px;padding:9px 11px;outline:0;width:100%;box-sizing:border-box;color-scheme:dark}
#civMdt .ct-sheet .r{display:flex;gap:8px;justify-content:flex-end}#civMdt .ct-sheet .r button{font:inherit;font-size:14px;font-weight:600;padding:8px 14px;border-radius:999px;border:0;cursor:pointer;background:#3A3A3C;color:#fff}#civMdt .ct-sheet .r button.go{background:#0A84FF}
#civMdt .ct-m{display:grid;gap:3px;max-width:82%;align-self:flex-start}#civMdt .ct-m.me{align-self:flex-end}#civMdt .ct-m>small{font-size:11.5px;color:#8E8E93;padding:0 10px}#civMdt .ct-m.me>small{text-align:right}
#civMdt .ct-m .ap-b{max-width:none}#civMdt .ct-m.def .ap-b{background:#3A2A2E}#civMdt .ct-m.judge .ap-b{background:#2E2A1A}#civMdt .ct-m.me .ap-b{background:#0A84FF}
#civMdt .ct-card{border-radius:16px;padding:11px 13px;background:#1C1C1E;border:1px solid #3A3A3C;display:grid;gap:5px;font-size:14.5px;line-height:1.4;white-space:pre-wrap;overflow-wrap:anywhere}
#civMdt .ct-card i{font-style:normal;font-size:11.5px;font-weight:700;letter-spacing:.04em;text-transform:uppercase;color:#8E8E93}#civMdt .ct-card .amt{font-size:20px;font-weight:700}
#civMdt .ct-card.offer{border-color:rgba(10,132,255,.5)}#civMdt .ct-card.ruling{border-color:rgba(255,214,10,.45);background:#221F14}#civMdt .ct-card.claim{border-color:#48484A}
#civMdt .ct-card .r{display:flex;gap:6px}#civMdt .ct-card .r button{flex:1;font:inherit;font-size:14px;font-weight:600;padding:8px;border-radius:10px;border:0;cursor:pointer;background:#3A3A3C;color:#fff}#civMdt .ct-card .r button.go{background:#30D158;color:#000}
#civMdt .ct-ev{align-self:center;max-width:90%;text-align:center;font-size:12.5px;color:#8E8E93;margin:6px 0}
#civMdt .ct-link{display:block;color:#64D2FF;font-size:13.5px;overflow-wrap:anywhere}#civMdt .ct-img{display:block;max-width:100%;max-height:220px;border-radius:12px;margin-top:2px}
#civMdt .ct-att{display:flex;gap:6px;padding:0 10px}#civMdt .ct-att input{flex:1;min-width:0;font:inherit;font-size:14px;color:#fff;background:#1C1C1E;border:0;border-radius:9px;padding:7px 10px;outline:0}
#civMdt .ap-send .ct-clip{width:32px;height:32px;border-radius:50%;background:#2C2C2E;color:#8E8E93}#civMdt .ap-send .ct-clip[aria-pressed="true"]{color:#0A84FF}
#civMdt .ct-law{padding:10px 16px;border-bottom:.5px solid rgba(255,255,255,.12);font-size:14.5px}#civMdt .ct-law b{font-weight:600}#civMdt .ct-law small{display:block;color:#8E8E93;font-size:12.5px;margin-top:2px}
#civMdt .ct-col{display:flex;flex-direction:column}#civMdt .ct-col>*{flex:none}#civMdt .ct-sheet label{display:grid;gap:4px;font-size:12.5px;color:#8E8E93}
#civMdt .ct-h3{margin:14px 16px 6px;font-size:13px;font-weight:600;text-transform:uppercase;letter-spacing:.04em;color:#8E8E93}`;
  document.head.appendChild(css);
  const ini = n => String(n || '?').replace(/[^A-Za-z0-9]/g, '').slice(0, 2).toUpperCase() || '?';
  const av = (name, url) => `<span class="ap-av"${url && /^https:\/\//.test(url) ? ` style="background-image:url('${esc(url)}')"` : ''}>${url && /^https:\/\//.test(url) ? '' : esc(ini(name))}</span>`;
  const when = t => { const d = new Date(t), n = new Date(); return d.toDateString() === n.toDateString() ? d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }) : d.toLocaleDateString([], { month: 'short', day: 'numeric' }); };
  const money = n => (OV.currency || '$') + Math.round(+n || 0).toLocaleString('en-US');
  const back = '<svg width="12" height="20" viewBox="0 0 12 20" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"><path d="M10 2 2 10l8 8"/></svg>';
  const pill = k => { const o = k.outcome || ''; return `<span class="ct-pill ${k.status !== 'Closed' ? 'open' : /plaintiff|Settled/.test(o) ? 'win' : /defendant|Dismissed|Withdrawn/.test(o) ? 'lose' : ''}">${esc(k.status === 'Closed' ? o : k.status === 'Filed' ? 'Waiting for an answer' : k.status === 'Hearing' ? 'Hearing set' : k.status)}</span>`; };
  const IMG = /\.(png|jpe?g|gif|webp)(\?|$)|^https:\/\/(cdn|media)\.discordapp\.(com|net)\/attachments\//i;
  const linkHtml = l => l ? (IMG.test(l) ? `<a href="${esc(l)}" target="_blank" rel="noopener noreferrer"><img class="ct-img" src="${esc(l)}" alt="Evidence" loading="lazy" referrerpolicy="no-referrer"></a><a class="ct-link" style="font-size:12px" href="${esc(l)}" target="_blank" rel="noopener noreferrer">${esc(l.replace(/^https:\/\//, '').slice(0, 60))}</a>` : `<a class="ct-link" href="${esc(l)}" target="_blank" rel="noopener noreferrer">${esc(l)}</a>`) : '';

  // S: what the app shows. tab: cases | all | law | staff. view: home | file | case
  let S = null, D = null;
  const app = addApp({ id: 'court', name: 'Court', color: 'linear-gradient(180deg,#B9B4AA,#7A746A)',
    icon: '<svg width="21" height="21" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3v18M5 21h14M4 7h16M7 7l-3 7a3 3 0 0 0 6 0Zm10 0-3 7a3 3 0 0 0 6 0Z"/></svg>',
    render: sec => { S = { sec, tab: 'cases', view: 'home', id: 0, timer: 0, sheet: null, att: false }; }, onOpen: () => { if (!S) return; S.view === 'case' ? openCase(S.id) : home(); } });
  const sec = () => S.sec;
  const load = async () => { D = await call('/court'); app.badge(D.unread); return D; };

  // ── home: your cases, every case (judges), the law, staff (admins) ──
  const home = async () => { S.view = 'home'; clearTimeout(S.timer); try { await load(); } catch (x) { sec().innerHTML = `<div class="ap"><div class="ap-h"><h2>Court</h2></div><p class="ap-empty">${esc(x.message)}</p></div>`; return; }
    const tabs = [['cases', 'My cases'], ...(D.role === 'judge' ? [['all', 'All cases']] : []), ['law', 'Law'], ...(D.admin ? [['staff', 'Staff']] : [])]; if (!tabs.some(t => t[0] === S.tab)) S.tab = 'cases';
    sec().innerHTML = `<div class="ap"><div class="ap-h"><h2>Court</h2><button type="button" class="ap-ib" data-file aria-label="File a suit"><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><path d="M12 5v14M5 12h14"/></svg></button></div>
      ${tabs.length > 1 ? `<div class="ct-seg" role="group">${tabs.map(([k, t]) => `<button type="button" data-tab="${k}" aria-pressed="${S.tab === k}">${t}</button>`).join('')}</div>` : ''}<div class="ap-scroll" id="ctBody"></div></div>`;
    drawTab(); S.timer = setTimeout(() => { if (P.isOpen('court') && S.view === 'home' && (S.tab === 'cases' || S.tab === 'all')) home(); }, 15000); };
  const caseRow = k => `<button type="button" class="ct-row" data-case="${k.id}">${k.unread ? '<i class="ap-dot"></i>' : ''}<b><span>${esc(k.title)}</span><time class="ct-num">${esc(k.num)}</time></b>
    <small>${esc(k.plaintiff)} v. ${esc(k.defendant)} · ${when(k.updated)}${k.side && k.side !== 'judge' ? ' · ' + (k.side === 'plaintiff' ? 'Plaintiff side' : 'Defendant side') : ''}</small><small style="margin-top:5px">${pill(k)}${!k.judge && k.status !== 'Closed' && D.role === 'judge' ? ' <span class="ct-pill">Needs a judge</span>' : ''}</small></button>`;
  const drawTab = async () => { const el = sec().querySelector('#ctBody'); if (!el) return;
    if (S.tab === 'cases') { el.innerHTML = D.mine.length ? D.mine.map(caseRow).join('') : `<p class="ap-empty">No cases yet.<br>Tap + to file a civil suit against someone${D.role === 'lawyer' ? ', or wait for a client to add you as their lawyer' : ''}.</p>`; return; }
    if (S.tab === 'all') { el.innerHTML = D.all.length ? D.all.map(caseRow).join('') : '<p class="ap-empty">Nobody has filed a suit yet.</p>'; return; }
    if (S.tab === 'staff') { el.innerHTML = `<p class="ap-empty" style="padding:6px 16px 0;text-align:left">Judges see every case, take them, set hearings and rule. Lawyers represent a side when a party adds them, and can read the law and the public record. Admins are judges already.</p>
      <div class="ct-h3">Judges and lawyers</div>${D.staff.length ? D.staff.map(s => `<div class="ct-row" style="display:flex;align-items:center;gap:10px;cursor:default">${av(s.name, s.avatar)}<div style="flex:1;min-width:0"><b>${esc(s.name)}</b><small>${s.role === 'judge' ? 'Judge' : 'Lawyer'}${s.by ? ' · named by ' + esc(s.by) : ''}</small></div><button type="button" class="ap-ib" style="width:auto;color:#FF6961;font-size:14px" data-unstaff="${s.id}">Remove</button></div>`).join('') : '<p class="ap-empty">Nobody yet.</p>'}
      <div class="ct-h3">Add someone</div><div class="ct-form"><label>Role<select id="ctRole"><option value="lawyer">Lawyer</option><option value="judge">Judge</option></select></label><label>Person<input id="ctFind" placeholder="Search by name" autocomplete="off"></label><div class="ct-who" id="ctFound"></div></div>`;
      findPeople('#ctFind', '#ctFound', 'staffpick'); return; }
    // law: the laws, and (lawyers and judges) the public record
    el.innerHTML = `${D.role ? `<div class="ct-h3">Public record</div><div class="ct-form" style="padding-bottom:6px"><input id="ctRec" placeholder="Search a person" autocomplete="off"></div><div id="ctRecOut"></div>` : ''}
      <div class="ct-h3">Laws</div><div class="ct-form" style="padding-bottom:6px"><input id="ctLawQ" placeholder="Search the laws" autocomplete="off"></div><div id="ctLaws"><p class="ap-empty">Loading…</p></div>`;
    try { const L = S.laws ||= (await call('/court/laws')).laws; const draw = v => { const s = v.trim().toLowerCase(), F = L.filter(l => !s || (l.code + ' ' + l.title + ' ' + l.cls).toLowerCase().includes(s)).slice(0, 120);
        el.querySelector('#ctLaws').innerHTML = F.length ? F.map(l => `<div class="ct-law"><b>${esc(l.code)}</b> ${esc(l.title)}<small>${esc(l.cls)}${l.fine ? ' · fine ' + money(l.fine) : ''}${l.jail ? ' · ' + l.jail + ' min jail' : ''}</small></div>`).join('') : '<p class="ap-empty">No law like that.</p>'; };
      draw(''); el.querySelector('#ctLawQ').addEventListener('input', e => draw(e.target.value)); } catch (x) { el.querySelector('#ctLaws').innerHTML = `<p class="ap-empty">${esc(x.message)}</p>`; }
    const rq = el.querySelector('#ctRec'); if (rq) { let t = 0; rq.addEventListener('input', () => { clearTimeout(t); t = setTimeout(async () => { const out = el.querySelector('#ctRecOut'); if (!rq.value.trim()) { out.innerHTML = ''; return; }
      try { const j = await call('/court/record?q=' + encodeURIComponent(rq.value)); out.innerHTML = j.people.length ? j.people.map(p => `<button type="button" class="ct-row" data-rec="${esc(p.rid || p.name)}"><b><span>${esc(p.name)}</span></b></button>`).join('') : '<p class="ap-empty">Nobody by that name.</p>'; } catch (x) { out.innerHTML = `<p class="ap-empty">${esc(x.message)}</p>`; } }, 250); }); } };
  const record = async key => { const out = sec().querySelector('#ctRecOut'); out.innerHTML = '<p class="ap-empty">Loading…</p>';
    try { const j = await call('/court/record?id=' + encodeURIComponent(key)), K = { arrest: 'Arrest', citation: 'Citation', warning: 'Warning' };
      out.innerHTML = `<div class="ct-h3" style="text-transform:none;font-size:15px;color:#fff">${esc(j.person.name)} · ${j.records.length} on record</div>${j.records.length ? j.records.map(r => `<div class="ct-law"><b>${K[r.kind]}</b> · ${esc(new Date(r.at).toLocaleDateString())}${r.status ? ' · ' + esc(r.status) : ''}
        <small>${esc(r.charges.length ? r.charges.map(ch => ch.title + (ch.count > 1 ? ' ×' + ch.count : '')).join(', ') : r.reason || '')}${r.fine ? ' · fine ' + money(r.fine) : ''}${r.jail ? ' · ' + r.jail + ' min jail' : ''}${r.by ? ' · ' + esc(r.by) : ''}</small></div>`).join('') : '<p class="ap-empty">Clean record.</p>'}`; }
    catch (x) { out.innerHTML = `<p class="ap-empty">${esc(x.message)}</p>`; } };
  // people search, used for who you're suing and for naming staff
  const findPeople = (inSel, outSel, attr, picked) => { const inp = sec().querySelector(inSel), out = sec().querySelector(outSel); let t = 0;
    const go = async () => { try { const j = await call('/court/people?q=' + encodeURIComponent(inp.value)); out.innerHTML = j.people.slice(0, 12).map(p => `<button type="button" data-${attr}="${p.id}" data-name="${esc(p.name)}" aria-pressed="${picked && picked() === p.id}">${av(p.name, p.avatar)}${esc(p.name)}</button>`).join('') || '<span style="color:#8E8E93;font-size:14px">Nobody by that name in this server.</span>'; } catch (x) {} };
    inp.addEventListener('input', () => { clearTimeout(t); t = setTimeout(go, 200); }); go(); };

  // ── filing a suit ──
  const fileView = () => { S.view = 'file'; clearTimeout(S.timer); S.against = 0;
    sec().innerHTML = `<div class="ap"><div class="ap-h"><button type="button" class="ap-ib" data-home style="width:auto">${back}</button><h2 style="font-size:24px">File a suit</h2></div><div class="ap-scroll"><form class="ct-form" id="ctFile">
      <p style="margin:0;color:#8E8E93;font-size:13.5px;line-height:1.45">A civil suit asks a judge to make someone put right what they did: pay for damage, pay what they owe, keep a deal. They get a notice and can answer in the case.</p>
      <label>Who are you suing?<input id="ctWho" placeholder="Search by name" autocomplete="off"></label><div class="ct-who" id="ctWhoList"></div>
      <label>Type<select name="kind">${D.kinds.map(k => `<option>${esc(k)}</option>`).join('')}</select></label>
      <label>Title<input name="title" maxlength="80" placeholder="Unpaid repair bill" required></label>
      <label>How much you want (${esc(OV.currency || '$')}, 0 for none)<input name="amount" type="number" min="0" max="10000000" step="1" value="0" inputmode="numeric"></label>
      <label>What happened<textarea name="claim" maxlength="2000" placeholder="Who did what, when and where, and why they owe you." required></textarea></label>
      <label>Evidence link (optional)<input name="link" type="url" placeholder="https://… a screenshot or clip" maxlength="400"></label>
      <p class="ap-err" id="ctErr" hidden style="margin:0"></p><button class="ct-go">File the suit</button></form></div></div>`;
    findPeople('#ctWho', '#ctWhoList', 'against', () => S.against); };

  // ── one case ──
  const openCase = async (id, fresh) => { S.view = 'case'; clearTimeout(S.timer); if (fresh || S.id !== id) { S.id = id; S.sheet = null; S.att = false; S.drawn = ''; }
    let j; try { j = await call('/court/case?id=' + id); } catch (x) { sec().innerHTML = `<div class="ap"><div class="ap-h"><button type="button" class="ap-ib" data-home style="width:auto">${back}</button></div><p class="ap-empty">${esc(x.message)}</p></div>`; return; }
    if (S.view !== 'case' || S.id !== id) return; S.c = j; drawCase();
    S.timer = setTimeout(() => { if (P.isOpen('court') && S.view === 'case' && S.id === id && !S.typing) openCase(id); }, 5000); };
  const sideName = s => s === 'plaintiff' ? 'Plaintiff' : s === 'defendant' ? 'Defendant' : s === 'judge' ? 'Judge' : '';
  const msgHtml = m => { const meta = `${esc(m.who || '')}${m.role === 'lawyer' ? ', lawyer for the ' + sideName(m.side).toLowerCase() : m.side ? ' · ' + sideName(m.side) : ''} · ${when(m.at)}`, cls = `ct-m${m.mine ? ' me' : ''}${m.side === 'defendant' ? ' def' : m.side === 'judge' ? ' judge' : ''}`;
    if (m.kind === 'event') return `<div class="ct-ev">${esc(m.body)}</div>`;
    if (m.kind === 'claim') return `<div class="${cls}" style="max-width:100%;align-self:stretch"><small>${meta}</small><div class="ct-card claim"><i>Claim</i>${m.amount ? `<span class="amt">${money(m.amount)}</span>` : ''}${esc(m.body)}${linkHtml(m.link)}</div></div>`;
    if (m.kind === 'ruling') return `<div class="ct-m" style="max-width:100%;align-self:stretch"><small>${meta}</small><div class="ct-card ruling"><i>Ruling: ${m.state === 'plaintiff' ? 'for the plaintiff' : m.state === 'defendant' ? 'for the defendant' : 'dismissed'}</i>${m.amount ? `<span class="amt">${money(m.amount)}</span>` : ''}${esc(m.body)}</div></div>`;
    if (m.kind === 'offer') { const c = S.c, mine = m.side === c.me.side, canAns = m.state === 'open' && !mine && !c.me.judge && c.me.can.post;
      return `<div class="${cls}"><small>${meta}</small><div class="ct-card offer"><i>Settlement offer${m.state !== 'open' ? ' · ' + esc(m.state) : ''}</i><span class="amt">${m.amount ? money(m.amount) : 'No money'}</span>${esc(m.body)}
        ${canAns ? `<div class="r"><button type="button" data-decline="${m.id}">Decline</button><button type="button" class="go" data-accept="${m.id}">Accept</button></div>` : ''}</div></div>`; }
    return `<div class="${cls}"><small>${meta}${m.kind === 'answer' ? ' · Answer' : m.kind === 'evidence' ? ' · Evidence' : ''}</small><div class="ap-b${m.mine ? ' me' : ''}">${esc(m.body)}${linkHtml(m.link)}</div></div>`; };
  const sheetHtml = () => { const c = S.c, k = c.case; if (!S.sheet) return '';
    if (S.sheet === 'offer') return `<form class="ct-sheet" data-sheet="offer"><b>Offer to settle</b><label>Amount (${esc(OV.currency || '$')}, 0 for none)<input name="amount" type="number" min="0" max="10000000" value="${k.amount || 0}" inputmode="numeric"></label><input name="body" maxlength="600" placeholder="Terms (optional)" aria-label="Terms"><div class="r"><button type="button" data-close>Cancel</button><button class="go">Send offer</button></div></form>`;
    if (S.sheet === 'lawyer') { const mine = k.people.filter(p => p.role === 'lawyer' && p.side === c.me.side), free = D.lawyers.filter(l => !k.people.some(p => p.id === l.id));
      return `<form class="ct-sheet" data-sheet="lawyer"><b>Your lawyers</b>${mine.length ? mine.map(l => `<div style="display:flex;align-items:center;gap:8px">${av(l.name, l.avatar)}<span style="flex:1">${esc(l.name)}</span><button type="button" class="ap-ib" style="width:auto;color:#FF6961;font-size:14px" data-droplaw="${l.id}">Let go</button></div>`).join('') : '<span style="color:#8E8E93;font-size:14px">None yet.</span>'}
        ${free.length ? `<select name="lawyer" aria-label="Lawyer">${free.map(l => `<option value="${l.id}">${esc(l.name)}</option>`).join('')}</select><div class="r"><button type="button" data-close>Close</button><button class="go">Add lawyer</button></div>` : `<span style="color:#8E8E93;font-size:14px">${D.lawyers.length ? 'Every lawyer is already on this case.' : 'This server has no lawyers yet. Admins name them in Court, Staff.'}</span><div class="r"><button type="button" data-close>Close</button></div>`}</form>`; }
    if (S.sheet === 'hearing') return `<form class="ct-sheet" data-sheet="hearing"><b>Set a hearing</b><input name="hearing" maxlength="120" placeholder="Saturday 8 PM EST, courthouse" value="${esc(k.hearing || '')}"><div class="r"><button type="button" data-close>Cancel</button><button class="go">Set hearing</button></div></form>`;
    if (S.sheet === 'rule') return `<form class="ct-sheet" data-sheet="rule"><b>Rule</b><select name="result"><option value="plaintiff">For the plaintiff (${esc(k.plaintiff)})</option><option value="defendant">For the defendant (${esc(k.defendant)})</option><option value="dismissed">Dismiss the case</option></select>
      <label>Award (${esc(OV.currency || '$')}, only for a ruling for the plaintiff)<input name="amount" type="number" min="0" max="10000000" value="${k.amount || 0}" inputmode="numeric"></label><textarea name="body" maxlength="2000" rows="4" placeholder="The court's reasons"></textarea>${D.economy ? `<span style="color:#8E8E93;font-size:12.5px">An award is billed to ${esc(k.defendant)}; paying it pays ${esc(k.plaintiff)}.</span>` : ''}<div class="r"><button type="button" data-close>Cancel</button><button class="go">Issue ruling</button></div></form>`;
    return ''; };
  const drawCase = () => { const c = S.c, k = c.case, me = c.me, keep = sec().querySelector('#ctTa')?.value || '', link = sec().querySelector('#ctLink')?.value || '';
    const lawyersOf = s => k.people.filter(p => p.side === s && p.role === 'lawyer').map(p => p.name);
    const acts = [me.can.offer && ['offer', 'Offer to settle'], me.can.lawyer && ['lawyer', 'Lawyers'], me.can.take && ['take', k.judge ? 'Take over the case' : 'Take the case'], me.can.rule && ['hearing', 'Set hearing'], me.can.rule && ['rule', 'Rule'], me.can.withdraw && ['withdraw', 'Withdraw', 'bad']].filter(Boolean);
    sec().innerHTML = `<div class="ap"><div class="ap-h" style="padding-bottom:6px"><button type="button" class="ap-ib" data-home style="width:auto">${back}</button><span class="ct-num" style="flex:1;text-align:right;font-size:13px">${esc(k.num)} · ${esc(k.kind)}</span></div>
      <div class="ap-scroll ct-col"><div class="ct-head"><h3>${esc(k.title)}</h3><div>${pill(k)}</div>
        <div class="ct-vs"><b>${esc(k.plaintiff)}</b>${lawyersOf('plaintiff').length ? ' (' + esc(lawyersOf('plaintiff').join(', ')) + ')' : ''} v. <b>${esc(k.defendant)}</b>${lawyersOf('defendant').length ? ' (' + esc(lawyersOf('defendant').join(', ')) + ')' : ''}</div>
        <div class="ct-meta">${k.amount ? 'Asks for ' + money(k.amount) + ' · ' : ''}${k.judge ? 'Judge ' + esc(k.judge) : 'No judge yet'}${k.hearing ? ' · Hearing: ' + esc(k.hearing) : ''}${k.award ? `<br>${esc(k.payer || k.defendant)} owes ${money(k.award)}${D.economy ? ' (billed on their phone)' : ''}` : ''}</div></div>
        ${acts.length ? `<div class="ct-acts">${acts.map(([a, t, cl]) => `<button type="button" data-act="${a}"${cl ? ` class="${cl}"` : ''}>${t}</button>`).join('')}</div>` : ''}${sheetHtml()}
        <div class="ap-msgs" id="ctMsgs" style="overflow:visible;flex:none">${c.msgs.map(msgHtml).join('')}</div></div>
      ${me.can.post ? `${S.att ? '<div class="ct-att"><input id="ctLink" type="url" placeholder="https:// link to a screenshot or clip" maxlength="400"></div>' : ''}<form class="ap-send" id="ctSend"><button type="button" class="ct-clip" data-clip aria-label="Attach evidence link" aria-pressed="${S.att}"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="m21 11-8.5 8.5a5.5 5.5 0 0 1-7.8-7.8L13.2 3a3.7 3.7 0 0 1 5.2 5.2L10 16.7a1.8 1.8 0 0 1-2.6-2.6L15 6.5"/></svg></button><textarea id="ctTa" rows="1" maxlength="2000" placeholder="${me.side === 'defendant' && k.status === 'Filed' ? 'Answer the claim' : 'Message the court'}"></textarea><button aria-label="Send"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M12 19V5M5 12l7-7 7 7"/></svg></button></form>` : '<p class="ap-empty" style="padding:12px">This case is closed.</p>'}
      <p class="ap-err" id="ctErr" hidden></p></div>`;
    const ta = sec().querySelector('#ctTa'); if (ta) { ta.value = keep; ta.addEventListener('focus', () => { S.typing = true; }); ta.addEventListener('blur', () => { S.typing = false; });
      ta.addEventListener('keydown', e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sec().querySelector('#ctSend').requestSubmit(); } }); }
    const li = sec().querySelector('#ctLink'); if (li) li.value = link;
    const sc = sec().querySelector('.ap-scroll'), sig = c.msgs.length + ':' + (c.msgs[c.msgs.length - 1]?.id || 0); if (S.drawn !== sig) { sc.scrollTop = sc.scrollHeight; S.drawn = sig; }
    app.badge(Math.max(0, (D?.unread || 0) - (k.unread || 0))); };
  const err = t => { const e = sec().querySelector('#ctErr'); if (e) { e.hidden = !t; e.textContent = t || ''; } };
  const doAct = async (body, after) => { try { await call('/court/act', { id: S.id, ...body }); S.sheet = null; if (after) after(); await openCase(S.id); } catch (x) { err(x.message); } };

  // ── taps ──
  const root = app.section;
  root.addEventListener('click', async e => { const t = e.target.closest('button,[data-case]'); if (!t) return; const d = t.dataset;
    if (d.file != null) return fileView(); if (d.home != null) { S.view = 'home'; return home(); }
    if (d.tab) { S.tab = d.tab; sec().querySelectorAll('[data-tab]').forEach(b => b.setAttribute('aria-pressed', b.dataset.tab === S.tab)); return drawTab(); }
    if (d.case) return openCase(+d.case, true); if (d.rec) return record(d.rec);
    if (d.against) { S.against = +d.against; sec().querySelectorAll('[data-against]').forEach(b => b.setAttribute('aria-pressed', +b.dataset.against === S.against)); return; }
    if (d.staffpick) { try { await call('/court/staff', { id: +d.staffpick, role: sec().querySelector('#ctRole').value }); await load(); drawTab(); } catch (x) { alert(x.message); } return; }
    if (d.unstaff) { if (!confirm('Remove them from the court?')) return; try { await call('/court/staff', { id: +d.unstaff, role: '' }); await load(); drawTab(); } catch (x) { alert(x.message); } return; }
    if (d.clip != null) { S.att = !S.att; drawCase(); if (S.att) sec().querySelector('#ctLink')?.focus(); return; }
    if (d.close != null) { S.sheet = null; return drawCase(); }
    if (d.accept || d.decline) { if (d.accept && !confirm(`Accept this offer? The case is settled and closed.`)) return; return doAct({ act: d.accept ? 'accept' : 'decline', offer: +(d.accept || d.decline) }); }
    if (d.droplaw) return doAct({ act: 'drop', lawyer: +d.droplaw });
    if (d.act) { if (d.act === 'take') return doAct({ act: 'take' }); if (d.act === 'withdraw') { if (confirm('Withdraw the suit? The case closes and can’t be reopened.')) doAct({ act: 'withdraw' }); return; }
      S.sheet = S.sheet === d.act ? null : d.act; return drawCase(); } });
  root.addEventListener('submit', async e => { e.preventDefault(); const f = e.target;
    if (f.id === 'ctFile') { const b = f.querySelector('.ct-go'); if (!S.against) { err('Pick who you’re suing.'); return; } b.disabled = true;
      try { const r = await call('/court/file', { against: S.against, kind: f.kind.value, title: f.title.value, amount: +f.amount.value || 0, claim: f.claim.value, link: f.link.value }); S.tab = 'cases'; openCase(r.id, true); } catch (x) { err(x.message); b.disabled = false; } return; }
    if (f.id === 'ctSend') { const ta = f.querySelector('#ctTa'), li = sec().querySelector('#ctLink'), body = ta.value.trim(), link = li ? li.value.trim() : ''; if (!body && !link) return;
      return doAct({ act: link ? 'evidence' : 'say', body, link }, () => { ta.value = ''; if (li) li.value = ''; S.att = false; }); }
    const s = f.dataset.sheet; if (!s) return;
    if (s === 'offer') return doAct({ act: 'offer', amount: +f.amount.value || 0, body: f.body.value });
    if (s === 'lawyer') return doAct({ act: 'lawyer', lawyer: +f.lawyer.value });
    if (s === 'hearing') return doAct({ act: 'hearing', hearing: f.hearing.value });
    if (s === 'rule') { if (!confirm('Issue this ruling? It closes the case.')) return; return doAct({ act: 'rule', result: f.result.value, amount: +f.amount.value || 0, body: f.body.value }); } });
  // the red badge: new messages in your cases (and, for judges, cases waiting for one)
  const badge = async () => { try { app.badge((await call('/court/unread')).unread); } catch (e) {} };
  badge(); setInterval(() => { if (!document.hidden) badge(); }, 30000);
};
  if (window.ovPhone) start(); else addEventListener('ovphoneready', start, { once: true });
})();
