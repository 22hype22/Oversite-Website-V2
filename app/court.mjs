// Court, an app on the Civilian phone: civil suits between players. Anyone files a suit against another member (what happened,
// how much they want); the case gets a number (CV-0001) and a thread where both sides, their lawyers and the judge go back and
// forth: messages, evidence (a link, shown as a picture when it is one), settlement offers the other side can accept. A judge
// takes the case, sets a hearing and rules; a ruling or settlement with money in it bills the side that owes it (Civilian bills),
// and paying the bill pays the other side. The plaintiff can withdraw before it's decided.
// Judges and lawyers are people the server's admins name in the app. Lawyers join a case when a party adds them, and get the law
// library (the server's laws) and the public record (arrests, citations, warnings; never BOLOs, warrants or officers' notes),
// read only: they can't decide anything. Judges see every case; admins and up are judges too.
import { db, now, users, members } from './db.mjs';

db.exec(`CREATE TABLE IF NOT EXISTS court_cases (id INTEGER PRIMARY KEY, community_id INTEGER NOT NULL REFERENCES communities(id) ON DELETE CASCADE, num INTEGER NOT NULL,
  title TEXT NOT NULL, kind TEXT NOT NULL, amount INTEGER NOT NULL DEFAULT 0, plaintiff INTEGER NOT NULL, defendant INTEGER NOT NULL, judge INTEGER,
  status TEXT NOT NULL DEFAULT 'Filed', hearing TEXT, outcome TEXT, award INTEGER, payer INTEGER, created INTEGER NOT NULL, updated INTEGER NOT NULL, closed INTEGER);
CREATE UNIQUE INDEX IF NOT EXISTS court_cases_num ON court_cases (community_id, num);
CREATE TABLE IF NOT EXISTS court_parties (case_id INTEGER NOT NULL REFERENCES court_cases(id) ON DELETE CASCADE, uid INTEGER NOT NULL, side TEXT NOT NULL, role TEXT NOT NULL,
  seen INTEGER NOT NULL DEFAULT 0, at INTEGER NOT NULL, PRIMARY KEY (case_id, uid));
CREATE TABLE IF NOT EXISTS court_msgs (id INTEGER PRIMARY KEY, case_id INTEGER NOT NULL REFERENCES court_cases(id) ON DELETE CASCADE, uid INTEGER, kind TEXT NOT NULL,
  body TEXT NOT NULL, link TEXT, amount INTEGER, state TEXT, at INTEGER NOT NULL);
CREATE INDEX IF NOT EXISTS court_msgs_case ON court_msgs (case_id, id);
CREATE TABLE IF NOT EXISTS court_roles (community_id INTEGER NOT NULL REFERENCES communities(id) ON DELETE CASCADE, uid INTEGER NOT NULL, role TEXT NOT NULL, by_name TEXT, at INTEGER NOT NULL,
  PRIMARY KEY (community_id, uid));`);
const q = sql => db.prepare(sql);
const T = (v, n) => String(v ?? '').replace(/[\u0000-\u0008\u000b-\u001f<>]/g, '').trim().slice(0, n);
const nameOf = uid => { const u = users.byId(uid); return u ? u.roblox_name || u.name || 'Someone' : 'Someone'; };
const avOf = uid => users.byId(uid)?.avatar || null;
const money = (c, n) => (c.settings.currency || '$') + Math.round(n).toLocaleString('en-US');
export const KINDS = ['Small claims', 'Property damage', 'Contract', 'Injury', 'Business dispute', 'Other'];
export const MAX_AWARD = 10000000;
const numOf = c => 'CV-' + String(c.num).padStart(4, '0');

// who someone is in the court: 'judge' (named, or admin and up), 'lawyer', or ''
export const roleOf = (c, uid, isAdmin) => isAdmin ? 'judge' : q('SELECT role FROM court_roles WHERE community_id = ? AND uid = ?').get(c.id, uid)?.role || '';
export const staff = c => q('SELECT uid, role, by_name, at FROM court_roles WHERE community_id = ? ORDER BY role, at').all(c.id).map(r => ({ id: r.uid, name: nameOf(r.uid), avatar: avOf(r.uid), role: r.role, by: r.by_name, at: r.at }));
export const setStaff = (c, by, j) => { const uid = +j.id; if (!members.role(c.id, uid)) return { error: 'They aren’t in this server.' };
  if (!j.role) q('DELETE FROM court_roles WHERE community_id = ? AND uid = ?').run(c.id, uid);
  else if (['judge', 'lawyer'].includes(j.role)) q(`INSERT INTO court_roles (community_id, uid, role, by_name, at) VALUES (?, ?, ?, ?, ?) ON CONFLICT (community_id, uid) DO UPDATE SET role = excluded.role, by_name = excluded.by_name, at = excluded.at`).run(c.id, uid, j.role, T(by, 40), now());
  else return { error: 'role is judge, lawyer or nothing.' };
  return { ok: true, staff: staff(c) }; };

// a case and someone's place in it: { side: 'plaintiff' | 'defendant' | 'judge', role: 'party' | 'lawyer' | 'judge' } or null
const get = (c, id) => q('SELECT * FROM court_cases WHERE community_id = ? AND id = ?').get(c.id, +id || 0);
const partyOf = (k, uid) => q('SELECT side, role, seen FROM court_parties WHERE case_id = ? AND uid = ?').get(k.id, uid) || null;
const placeOf = (c, k, uid, croleUser) => partyOf(k, uid) || (croleUser === 'judge' ? { side: 'judge', role: 'judge' } : null);
const people = k => q('SELECT uid, side, role FROM court_parties WHERE case_id = ? ORDER BY at').all(k.id).map(p => ({ id: p.uid, name: nameOf(p.uid), avatar: avOf(p.uid), side: p.side, role: p.role }));
const post = (k, uid, kind, body, extra = {}) => { const id = q('INSERT INTO court_msgs (case_id, uid, kind, body, link, amount, state, at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)')
  .run(k.id, uid, kind, T(body, 2000), extra.link || null, extra.amount ?? null, extra.state || null, now()).lastInsertRowid; q('UPDATE court_cases SET updated = ? WHERE id = ?').run(now(), k.id); return id; };
const row = (c, k, me, crole) => { const last = q('SELECT MAX(id) id FROM court_msgs WHERE case_id = ?').get(k.id).id || 0, p = partyOf(k, me);
  return { id: k.id, num: numOf(k), title: k.title, kind: k.kind, amount: k.amount, status: k.status, outcome: k.outcome, award: k.award, hearing: k.hearing,
    plaintiff: nameOf(k.plaintiff), defendant: nameOf(k.defendant), judge: k.judge ? nameOf(k.judge) : null, updated: k.updated, created: k.created,
    unread: p ? q('SELECT COUNT(*) n FROM court_msgs WHERE case_id = ? AND id > ? AND (uid IS NULL OR uid <> ?)').get(k.id, p.seen, me).n : 0, mine: !!p, side: p?.side || (crole === 'judge' ? 'judge' : ''), last }; };

// the cases someone sees: theirs (as a party or lawyer), and for judges every case
export const list = (c, me, crole) => { const mine = q('SELECT k.* FROM court_cases k JOIN court_parties p ON p.case_id = k.id AND p.uid = ? WHERE k.community_id = ? ORDER BY k.updated DESC LIMIT 100').all(me, c.id);
  const all = crole === 'judge' ? q('SELECT * FROM court_cases WHERE community_id = ? ORDER BY (status = \'Closed\'), updated DESC LIMIT 200').all(c.id) : [];
  return { mine: mine.map(k => row(c, k, me, crole)), all: all.map(k => row(c, k, me, crole)) }; };
export const unread = (c, me, crole) => { let n = q('SELECT COUNT(*) n FROM court_msgs m JOIN court_parties p ON p.case_id = m.case_id AND p.uid = ? JOIN court_cases k ON k.id = m.case_id WHERE k.community_id = ? AND m.id > p.seen AND (m.uid IS NULL OR m.uid <> ?)').get(me, c.id, me).n;
  if (crole === 'judge') n += q("SELECT COUNT(*) n FROM court_cases WHERE community_id = ? AND judge IS NULL AND status <> 'Closed'").get(c.id).n;   // cases waiting for a judge
  return n; };

// one case with its thread; reading it marks it seen
export const open = (c, me, crole, id) => { const k = get(c, id); if (!k) return { error: 'That case is gone.' }; const at = placeOf(c, k, me, crole); if (!at) return { error: 'You aren’t part of that case.' };
  const msgs = q('SELECT * FROM court_msgs WHERE case_id = ? ORDER BY id').all(k.id), last = msgs.length ? msgs[msgs.length - 1].id : 0;
  if (partyOf(k, me)) q('UPDATE court_parties SET seen = ? WHERE case_id = ? AND uid = ?').run(last, k.id, me);
  const open_ = k.status !== 'Closed', judge = at.side === 'judge', side = at.side;
  return { case: { ...row(c, k, me, crole), unread: 0, people: people(k), payer: k.payer ? nameOf(k.payer) : null },
    me: { side, role: at.role, judge, can: { post: open_, offer: open_ && !judge, withdraw: open_ && side === 'plaintiff', lawyer: open_ && at.role === 'party', take: open_ && judge && k.judge !== me, rule: open_ && judge && k.judge === me } },
    msgs: msgs.map(m => ({ id: m.id, kind: m.kind, body: m.body, link: m.link, amount: m.amount, state: m.state, at: m.at, mine: m.uid === me, who: m.uid ? nameOf(m.uid) : null, avatar: m.uid ? avOf(m.uid) : null,
      side: m.uid ? (partyOf(k, m.uid)?.side || (m.uid === k.judge ? 'judge' : '')) : '', role: m.uid ? (partyOf(k, m.uid)?.role || (m.uid === k.judge ? 'judge' : '')) : '' })) }; };

// filing: j = { against, kind, title, amount, claim, link }
const FILED = new Map();
export const file = (c, me, j) => { const d = +j.against; if (!members.role(c.id, d)) return { error: 'Pick who you’re suing from the list.' }; if (d === me) return { error: 'You can’t sue yourself.' };
  const title = T(j.title, 80), claim = T(j.claim, 2000), kind = KINDS.includes(j.kind) ? j.kind : 'Other', amount = Math.max(0, Math.min(MAX_AWARD, Math.round(+j.amount || 0)));
  if (!title) return { error: 'Give the case a title.' }; if (claim.length < 20) return { error: 'Say what happened (a few sentences).' };
  const link = j.link ? safeLink(j.link) : null; if (j.link && !link) return { error: 'Evidence links must start with https://' };
  const t = now(), recent = (FILED.get(me) || []).filter(x => t - x < 3600000); if (recent.length >= 5) return { error: 'You’ve filed 5 suits this hour. Wait a while.' }; recent.push(t); FILED.set(me, recent);
  const num = (q('SELECT MAX(num) n FROM court_cases WHERE community_id = ?').get(c.id).n || 0) + 1;
  const id = q('INSERT INTO court_cases (community_id, num, title, kind, amount, plaintiff, defendant, created, updated) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)').run(c.id, num, title, kind, amount, me, d, t, t).lastInsertRowid;
  q('INSERT INTO court_parties (case_id, uid, side, role, at) VALUES (?, ?, ?, ?, ?), (?, ?, ?, ?, ?)').run(id, me, 'plaintiff', 'party', t, id, d, 'defendant', 'party', t);
  const k = get(c, id); post(k, me, 'claim', claim, { link, amount });
  return { ok: true, id, num: numOf(k), case: k }; };
const safeLink = v => { const s = String(v || '').trim().slice(0, 400); return /^https:\/\/[^\s<>"']+$/.test(s) ? s : null; };

// everything that happens inside a case: j = { id, act, … }; returns { ok, k, events: [[uid, text]], bill?, update? }
export const act = (c, me, crole, j) => { const k = get(c, j.id); if (!k) return { error: 'That case is gone.' }; const at = placeOf(c, k, me, crole); if (!at) return { error: 'You aren’t part of that case.' };
  const a = String(j.act || ''), isJudge = at.side === 'judge', closed = k.status === 'Closed', who = nameOf(me), num = numOf(k), notes = [], others = side => people(k).filter(p => p.id !== me && (!side || p.side === side)).map(p => p.id);
  const tell = (ids, text) => { for (const u of ids) notes.push([u, text]); };
  if (closed && a !== 'read') return { error: 'This case is closed.' };
  if (a === 'say' || a === 'evidence') { const body = T(j.body, 2000), link = j.link ? safeLink(j.link) : null; if (j.link && !link) return { error: 'Links must start with https://' };
    if (!body && !link) return { error: 'Write something first.' }; if (a === 'evidence' && !link) return { error: 'Add the link to the evidence.' };
    post(k, me, a === 'evidence' ? 'evidence' : k.status === 'Filed' && at.side === 'defendant' && !q("SELECT 1 FROM court_msgs WHERE case_id = ? AND kind = 'answer'").get(k.id) ? 'answer' : 'note', body || 'Evidence', { link });
    if (k.status === 'Filed' && at.side === 'defendant') q("UPDATE court_cases SET status = 'Answered' WHERE id = ?").run(k.id);
    return { ok: true }; }
  if (a === 'offer') { if (isJudge) return { error: 'Judges don’t make offers.' }; const amt = Math.max(0, Math.min(MAX_AWARD, Math.round(+j.amount || 0)));
    q("UPDATE court_msgs SET state = 'replaced' WHERE case_id = ? AND kind = 'offer' AND state = 'open'").run(k.id);
    post(k, me, 'offer', T(j.body, 600) || (amt ? `${at.side === 'defendant' ? 'We offer' : 'We’ll settle for'} ${money(c, amt)}.` : 'We offer to settle with no money changing hands.'), { amount: amt, state: 'open' });
    tell(others(at.side === 'plaintiff' ? 'defendant' : 'plaintiff'), `${who} made a settlement offer in ${num}: ${amt ? money(c, amt) : 'no money'}.`); return { ok: true, events: notes }; }
  if (a === 'accept' || a === 'decline') { const o = q("SELECT * FROM court_msgs WHERE case_id = ? AND id = ? AND kind = 'offer' AND state = 'open'").get(k.id, +j.offer || 0); if (!o) return { error: 'That offer is no longer open.' };
    const from = partyOf(k, o.uid)?.side; if (!from || from === at.side || isJudge) return { error: 'Only the other side can answer that offer.' };
    if (a === 'decline') { q("UPDATE court_msgs SET state = 'declined' WHERE id = ?").run(o.id); post(k, me, 'event', `${who} declined the offer.`); tell([o.uid], `${who} declined your offer in ${num}.`); return { ok: true, events: notes }; }
    q("UPDATE court_msgs SET state = 'accepted' WHERE id = ?").run(o.id); post(k, me, 'event', `${who} accepted the offer. The case is settled${o.amount ? `: ${nameOf(k.defendant)} pays ${money(c, o.amount)}` : ''}.`);
    close(k, 'Settled', o.amount || 0); tell(others(), `${num} was settled${o.amount ? ` for ${money(c, o.amount)}` : ''}.`);
    return { ok: true, events: notes, bill: o.amount ? { payer: k.defendant, payee: k.plaintiff, amount: o.amount, num } : null, update: 'settled' }; }
  if (a === 'withdraw') { if (at.side !== 'plaintiff') return { error: 'Only the side that filed can withdraw it.' };
    post(k, me, 'event', `${who} withdrew the suit.`); close(k, 'Withdrawn', 0); tell(others(), `${num} was withdrawn by ${who}.`); return { ok: true, events: notes, update: 'withdrawn' }; }
  if (a === 'lawyer' || a === 'drop') { if (at.role !== 'party') return { error: 'Only the person themselves can choose their lawyer.' }; const l = +j.lawyer;
    if (a === 'drop') { const p = partyOf(k, l); if (!p || p.role !== 'lawyer' || p.side !== at.side) return { error: 'That lawyer isn’t on your side.' };
      q('DELETE FROM court_parties WHERE case_id = ? AND uid = ?').run(k.id, l); post(k, me, 'event', `${who} let ${nameOf(l)} go as their lawyer.`); tell([l], `${who} let you go as their lawyer in ${num}.`); return { ok: true, events: notes }; }
    if (q('SELECT role FROM court_roles WHERE community_id = ? AND uid = ?').get(c.id, l)?.role !== 'lawyer') return { error: 'Pick a lawyer from the list.' };
    if (partyOf(k, l)) return { error: 'They’re already part of this case.' }; if (q("SELECT COUNT(*) n FROM court_parties WHERE case_id = ? AND side = ? AND role = 'lawyer'").get(k.id, at.side).n >= 3) return { error: 'Three lawyers a side at most.' };
    q('INSERT INTO court_parties (case_id, uid, side, role, at) VALUES (?, ?, ?, ?, ?)').run(k.id, l, at.side, 'lawyer', now()); post(k, me, 'event', `${nameOf(l)} now represents ${who}.`);
    tell([l], `${who} added you as their lawyer in ${num}: ${k.title}.`); return { ok: true, events: notes }; }
  // judges
  if (!isJudge) return { error: 'Only a judge can do that.' };
  if (a === 'take') { q('UPDATE court_cases SET judge = ? WHERE id = ?').run(me, k.id); post(k, me, 'event', `Judge ${who} took the case.`);
    tell(people(k).map(p => p.id), `Judge ${who} is hearing ${num}.`); return { ok: true, events: notes, update: 'judge' }; }
  if (k.judge !== me) return { error: 'Take the case first.' };
  if (a === 'hearing') { const h = T(j.hearing, 120); if (!h) return { error: 'Say when and where.' }; q("UPDATE court_cases SET hearing = ?, status = 'Hearing' WHERE id = ?").run(h, k.id);
    post(k, me, 'event', `Hearing set: ${h}.`); tell(people(k).map(p => p.id), `${num}: hearing set for ${h}.`); return { ok: true, events: notes, update: 'hearing' }; }
  if (a === 'rule') { const r = ['plaintiff', 'defendant', 'dismissed'].includes(j.result) ? j.result : ''; if (!r) return { error: 'Pick a ruling.' };
    const amt = r === 'plaintiff' ? Math.max(0, Math.min(MAX_AWARD, Math.round(+j.amount || 0))) : 0, why = T(j.body, 2000); if (why.length < 10) return { error: 'Explain the ruling.' };
    const outcome = r === 'dismissed' ? 'Dismissed' : r === 'plaintiff' ? 'Judgment for the plaintiff' : 'Judgment for the defendant';
    post(k, me, 'ruling', why, { amount: amt, state: r }); close(k, outcome, amt);
    tell(people(k).map(p => p.id), `${num} ruling: ${outcome}${amt ? `, ${nameOf(k.defendant)} pays ${money(c, amt)}` : ''}.`);
    return { ok: true, events: notes, bill: amt ? { payer: k.defendant, payee: k.plaintiff, amount: amt, num } : null, update: 'ruled' }; }
  return { error: 'Unknown action.' }; };
const close = (k, outcome, award) => q("UPDATE court_cases SET status = 'Closed', outcome = ?, award = ?, payer = ?, closed = ? WHERE id = ?").run(outcome, award || null, award ? k.defendant : null, now(), k.id);
export const caseOf = (c, id) => { const k = get(c, id); return k && { id: k.id, num: numOf(k), title: k.title, kind: k.kind, amount: k.amount, status: k.status, outcome: k.outcome, award: k.award, hearing: k.hearing,
  plaintiff: nameOf(k.plaintiff), defendant: nameOf(k.defendant), judge: k.judge ? nameOf(k.judge) : null, created: k.created, updated: k.updated }; };

// people to sue or to name as staff, by name
export const find = (c, me, text) => { const s = String(text || '').trim().toLowerCase();
  return members.list(c.id).filter(m => m.id !== me && (!s || (m.roblox_name || m.name || '').toLowerCase().includes(s))).slice(0, 25).map(m => ({ id: m.id, name: m.roblox_name || m.name, avatar: m.avatar || null })); };
export const lawyers = c => staff(c).filter(s => s.role === 'lawyer');
