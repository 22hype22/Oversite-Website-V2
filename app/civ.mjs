// Civilian life (the Civilian tab): every server keeps its own economy. A civilian has a bank account, a character police
// see on a name lookup, the bills they owe and their 911 calls. Bills: the fine on every citation or arrest written against
// them, and a weekly registration and insurance bill for each car ER:LC has seen them drive. A bill left unpaid past its
// due date takes a late fee; an unpaid registration or insurance shows as Expired or Lapsed on the police plate lookup
// until it is paid. Money comes in as a weekly payment from the server and whatever staff grant.
// Housing: the owner lists homes; a civilian buys one outright, on a mortgage, or rents it. Rent, the mortgage payment and
// property tax are billed weekly like everything else, and a housing bill left overdue too long loses them the home
// (eviction for a renter, repossession for an owner). Jobs and businesses build on this account later.
import { db, now, communities } from './db.mjs';

db.exec(`CREATE TABLE IF NOT EXISTS civ_accounts (community_id INTEGER NOT NULL REFERENCES communities(id) ON DELETE CASCADE, user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  balance INTEGER NOT NULL DEFAULT 0, autopay INTEGER NOT NULL DEFAULT 1, paid_at INTEGER NOT NULL DEFAULT 0, created INTEGER NOT NULL, PRIMARY KEY (community_id, user_id));
CREATE TABLE IF NOT EXISTS civ_tx (id INTEGER PRIMARY KEY, community_id INTEGER NOT NULL REFERENCES communities(id) ON DELETE CASCADE, user_id INTEGER NOT NULL,
  amount INTEGER NOT NULL, balance INTEGER NOT NULL, kind TEXT NOT NULL, memo TEXT NOT NULL DEFAULT '', at INTEGER NOT NULL);
CREATE INDEX IF NOT EXISTS civ_tx_u ON civ_tx (community_id, user_id, at);
CREATE TABLE IF NOT EXISTS civ_chars (community_id INTEGER NOT NULL REFERENCES communities(id) ON DELETE CASCADE, user_id INTEGER NOT NULL,
  first TEXT NOT NULL DEFAULT '', last TEXT NOT NULL DEFAULT '', dob TEXT NOT NULL DEFAULT '', address TEXT NOT NULL DEFAULT '', phone TEXT NOT NULL DEFAULT '',
  occupation TEXT NOT NULL DEFAULT '', updated INTEGER NOT NULL, PRIMARY KEY (community_id, user_id));
CREATE TABLE IF NOT EXISTS civ_bills (id INTEGER PRIMARY KEY, community_id INTEGER NOT NULL REFERENCES communities(id) ON DELETE CASCADE, user_id INTEGER NOT NULL,
  kind TEXT NOT NULL, ref TEXT NOT NULL, label TEXT NOT NULL, amount INTEGER NOT NULL, issued INTEGER NOT NULL, due INTEGER NOT NULL,
  status TEXT NOT NULL DEFAULT 'Open', late INTEGER NOT NULL DEFAULT 0, paid_at INTEGER);
CREATE UNIQUE INDEX IF NOT EXISTS civ_bills_ref ON civ_bills (community_id, ref);
CREATE INDEX IF NOT EXISTS civ_bills_u ON civ_bills (community_id, user_id, status);
CREATE TABLE IF NOT EXISTS civ_calls (id INTEGER PRIMARY KEY, community_id INTEGER NOT NULL REFERENCES communities(id) ON DELETE CASCADE, user_id INTEGER NOT NULL,
  name TEXT NOT NULL, dept TEXT NOT NULL, location TEXT NOT NULL, details TEXT NOT NULL, at INTEGER NOT NULL);
CREATE TABLE IF NOT EXISTS civ_props (id INTEGER PRIMARY KEY, community_id INTEGER NOT NULL REFERENCES communities(id) ON DELETE CASCADE,
  name TEXT NOT NULL, kind TEXT NOT NULL DEFAULT 'House', address TEXT NOT NULL DEFAULT '', price INTEGER NOT NULL DEFAULT 0, rent INTEGER NOT NULL DEFAULT 0,
  owner_id INTEGER, mode TEXT NOT NULL DEFAULT '', loan_left INTEGER NOT NULL DEFAULT 0, loan_weekly INTEGER NOT NULL DEFAULT 0, since INTEGER NOT NULL DEFAULT 0, created INTEGER NOT NULL);
CREATE INDEX IF NOT EXISTS civ_props_c ON civ_props (community_id, owner_id);`);
const q = sql => db.prepare(sql);
const T = (v, n) => String(v ?? '').replace(/[\u0000-\u001f<>]/g, '').replace(/\s+/g, ' ').trim().slice(0, n);
const DAY = 864e5, WEEK = 7 * DAY;
const money = n => '$' + Math.round(n).toLocaleString('en-US');

// ── the server's settings (Settings in the Civilian tab, owner and co-owners) ──
// housing: tax is a yearly % of the price, billed by the week; a mortgage takes `down`% up front and the rest plus `rate`% over `weeks`;
// `evict` is how many days a housing bill may sit overdue before the home is lost
const DEFAULTS = { on: true, start: 5000, weekly: 750, reg: 150, ins: 200, late: 10, grace: 3, tax: 2, down: 20, weeks: 26, rate: 10, evict: 7 };
const LIMITS = { start: [0, 1e7], weekly: [0, 1e6], reg: [0, 1e5], ins: [0, 1e5], late: [0, 100], grace: [1, 14], tax: [0, 20], down: [0, 100], weeks: [1, 260], rate: [0, 100], evict: [1, 60] };
export const conf = c => { const s = c.settings.civ || {}, out = { ...DEFAULTS };
  for (const k of Object.keys(LIMITS)) if (Number.isFinite(+s[k])) out[k] = Math.min(LIMITS[k][1], Math.max(LIMITS[k][0], Math.round(+s[k])));
  out.on = s.on !== false; out.since = +s.since || 0; return out; };
export const saveConf = (c, j, save) => { const s = { ...(c.settings.civ || {}) };
  for (const k of Object.keys(LIMITS)) if (j[k] != null && Number.isFinite(+j[k])) s[k] = Math.min(LIMITS[k][1], Math.max(LIMITS[k][0], Math.round(+j[k])));
  if (j.on != null) s.on = !!j.on; c.settings.civ = s; save(); return { ok: true, conf: conf(c) }; };

// ── accounts ──
const acct = (cid, uid) => q('SELECT * FROM civ_accounts WHERE community_id = ? AND user_id = ?').get(cid, uid);
// a civilian's account, opened with the server's starting balance the first time it is needed
export const ensure = (c, uid) => { let a = acct(c.id, uid); if (a) return a; const cf = conf(c), t = now();
  // the economy starts with the first account: fines and car bills count from then, never backdated
  if (!cf.since) { const fresh = communities.byId(c.id); fresh.settings.civ = { ...(fresh.settings.civ || {}), since: t }; communities.saveSettings(c.id, fresh.settings); c.settings.civ = fresh.settings.civ; }
  q('INSERT OR IGNORE INTO civ_accounts (community_id, user_id, balance, autopay, paid_at, created) VALUES (?, ?, 0, 1, ?, ?)').run(c.id, uid, t, t);
  if (cf.start) move(c.id, uid, cf.start, 'deposit', 'Opening balance'); return acct(c.id, uid); };
// money in (positive) or out (negative); never below zero unless forced (a fine paid by staff, say)
const move = (cid, uid, amount, kind, memo, force = false) => { const a = acct(cid, uid); if (!a) return { error: 'No account.' }; amount = Math.round(amount);
  if (!force && amount < 0 && a.balance + amount < 0) return { error: `Not enough money. You have ${money(a.balance)}.` };
  const bal = a.balance + amount; q('UPDATE civ_accounts SET balance = ? WHERE community_id = ? AND user_id = ?').run(bal, cid, uid);
  q('INSERT INTO civ_tx (community_id, user_id, amount, balance, kind, memo, at) VALUES (?, ?, ?, ?, ?, ?, ?)').run(cid, uid, amount, bal, kind, T(memo, 120), now()); return { ok: true, balance: bal }; };

// ── character: what police see on a name lookup ──
const CHAR_FIELDS = { first: 30, last: 30, dob: 10, address: 80, phone: 20, occupation: 40 };
export const charOf = (cid, uid) => { const r = q('SELECT * FROM civ_chars WHERE community_id = ? AND user_id = ?').get(cid, uid); if (!r) return null;
  return Object.fromEntries(Object.keys(CHAR_FIELDS).map(k => [k, r[k]])); };
export const saveChar = (c, user, j) => { const v = Object.fromEntries(Object.entries(CHAR_FIELDS).map(([k, n]) => [k, T(j[k], n)]));
  if (!v.first || !v.last) return { error: 'Give your character a first and last name.' };
  if (v.dob && !/^\d{4}-\d{2}-\d{2}$/.test(v.dob)) return { error: 'Pick a date of birth.' };
  q(`INSERT INTO civ_chars (community_id, user_id, first, last, dob, address, phone, occupation, updated) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(community_id, user_id) DO UPDATE SET first = excluded.first, last = excluded.last, dob = excluded.dob, address = excluded.address, phone = excluded.phone,
    occupation = excluded.occupation, updated = excluded.updated`).run(c.id, user.id, v.first, v.last, v.dob, v.address, v.phone, v.occupation, now());
  return { ok: true }; };

// ── bills ──
const bill = (cid, uid, kind, ref, label, amount, issued, due) =>
  q('INSERT OR IGNORE INTO civ_bills (community_id, user_id, kind, ref, label, amount, issued, due) VALUES (?, ?, ?, ?, ?, ?, ?, ?)').run(cid, uid, kind, ref, T(label, 120), Math.round(amount), issued, due).changes;
const billRow = b => ({ id: b.id, kind: b.kind, label: b.label, amount: b.amount, issued: b.issued, due: b.due, status: b.status, late: !!b.late, paid_at: b.paid_at || null, plate: b.kind === 'reg' || b.kind === 'ins' ? b.ref.split(':')[1] : '' });
// a car's registration or insurance is good again once nothing of that kind is still overdue on it
const fixVehicle = (cid, plate) => { const late = k => !!q("SELECT 1 FROM civ_bills WHERE community_id = ? AND kind = ? AND ref LIKE ? AND status = 'Overdue'").get(cid, k, `${k}:${plate}:%`);
  q('UPDATE pd_vehicles SET reg = ?, ins = ? WHERE community_id = ? AND plate = ?').run(late('reg') ? 'Expired' : 'Valid', late('ins') ? 'Lapsed' : 'Active', cid, plate); };
const settle = (cid, b) => { q("UPDATE civ_bills SET status = 'Paid', paid_at = ? WHERE id = ?").run(now(), b.id);
  if (b.kind === 'fine') { const rid = +b.ref.split(':')[1], r = q('SELECT data FROM pd_records WHERE community_id = ? AND id = ?').get(cid, rid);
    if (r) { const d = JSON.parse(r.data || '{}'); d.paid_at = now(); q('UPDATE pd_records SET data = ? WHERE community_id = ? AND id = ?').run(JSON.stringify(d), cid, rid); } }
  if (b.kind === 'reg' || b.kind === 'ins') fixVehicle(cid, b.ref.split(':')[1]);
  if (b.kind === 'mort') { const p = prop(cid, b.ref.split(':')[1]); if (p && p.owner_id === b.user_id && p.mode === 'mortgage') { const left = Math.max(0, p.loan_left - p.loan_weekly);
    q('UPDATE civ_props SET loan_left = ?, mode = ? WHERE id = ?').run(left, left ? 'mortgage' : 'own', p.id); } } };
export const pay = (c, user, id) => { const b = q('SELECT * FROM civ_bills WHERE community_id = ? AND id = ? AND user_id = ?').get(c.id, +id || 0, user.id);
  if (!b) return { error: 'That bill is gone.' }; if (b.status === 'Paid' || b.status === 'Void') return { error: 'That bill is already settled.' };
  ensure(c, user.id); const m = move(c.id, user.id, -b.amount, 'bill', b.label); if (m.error) return m; settle(c.id, b); return { ok: true }; };
export const setAutopay = (c, user, on) => { ensure(c, user.id); q('UPDATE civ_accounts SET autopay = ? WHERE community_id = ? AND user_id = ?').run(on ? 1 : 0, c.id, user.id); return { ok: true }; };

// ── the weekly cycle, run every few minutes for each server: weekly pay, new bills, autopay, then what is now overdue ──
export const cycle = c => { const cf = conf(c); if (!cf.on) return;
  const t = now(), cid = c.id, since = cf.since; if (!since) return;   // nobody has opened an account yet
  const holders = q('SELECT a.*, u.roblox_id AS rid, u.roblox_name AS rname FROM civ_accounts a JOIN users u ON u.id = a.user_id WHERE a.community_id = ?').all(cid);
  const byRid = new Map(holders.filter(h => h.rid).map(h => [String(h.rid), h]));
  db.exec('BEGIN'); try {
    for (const h of holders) if (cf.weekly && t - h.paid_at >= WEEK) { q('UPDATE civ_accounts SET paid_at = ? WHERE community_id = ? AND user_id = ?').run(t, cid, h.user_id); move(cid, h.user_id, cf.weekly, 'deposit', 'Weekly payment'); }
    // a fine for every citation and arrest written since the economy began, billed to whoever it was written against
    for (const r of q("SELECT id, kind, subject_rid, data, at FROM pd_records WHERE community_id = ? AND kind IN ('citation', 'arrest') AND at >= ? AND subject_rid <> ''").all(cid, since)) {
      const h = byRid.get(String(r.subject_rid)), d = JSON.parse(r.data || '{}'); if (!h || !(d.fine > 0) || d.paid_at) continue;
      bill(cid, h.user_id, 'fine', `rec:${r.id}`, `${r.kind === 'arrest' ? 'Arrest' : 'Citation'} fine: ${(d.charges || []).map(x => x.title).slice(0, 2).join(', ')}`, d.fine, r.at, r.at + cf.grace * DAY); }
    // each week, registration and insurance on every car they drove in the last two weeks
    const wk = Math.floor((t - since) / WEEK), wkStart = since + wk * WEEK;
    for (const v of q('SELECT plate, model, owner_rid FROM pd_vehicles WHERE community_id = ? AND owner_rid <> \'\' AND last_seen >= ?').all(cid, t - 2 * WEEK)) {
      const h = byRid.get(String(v.owner_rid)); if (!h) continue; const car = `${v.model || 'Vehicle'} (${v.plate})`;
      if (cf.reg) bill(cid, h.user_id, 'reg', `reg:${v.plate}:${wk}`, `Registration, ${car}`, cf.reg, wkStart, wkStart + cf.grace * DAY);
      if (cf.ins) bill(cid, h.user_id, 'ins', `ins:${v.plate}:${wk}`, `Insurance, ${car}`, cf.ins, wkStart, wkStart + cf.grace * DAY); }
    // each week, rent, the mortgage payment and property tax on every home, except in the week it was moved into (paid up front)
    for (const p of q('SELECT * FROM civ_props WHERE community_id = ? AND owner_id IS NOT NULL').all(cid)) { if (p.since >= wkStart) continue;
      const due = wkStart + cf.grace * DAY, where = `${p.name}${p.address ? ', ' + p.address : ''}`;
      if (p.mode === 'rent' && p.rent) bill(cid, p.owner_id, 'rent', `rent:${p.id}:${wk}`, `Rent, ${where}`, p.rent, wkStart, due);
      if (p.mode === 'mortgage' && p.loan_left > 0) bill(cid, p.owner_id, 'mort', `mort:${p.id}:${wk}`, `Mortgage, ${where}`, Math.min(p.loan_weekly, p.loan_left), wkStart, due);
      const tax = p.mode === 'rent' ? 0 : Math.round(p.price * cf.tax / 100 / 52); if (tax) bill(cid, p.owner_id, 'tax', `tax:${p.id}:${wk}`, `Property tax, ${where}`, tax, wkStart, due); }
    // autopay, oldest first, as far as the money goes
    for (const h of holders) { if (!h.autopay) continue; let bal = acct(cid, h.user_id).balance;
      for (const b of q("SELECT * FROM civ_bills WHERE community_id = ? AND user_id = ? AND status IN ('Open', 'Overdue') ORDER BY due").all(cid, h.user_id)) {
        if (b.amount > bal) break; move(cid, h.user_id, -b.amount, 'bill', b.label + ' (autopay)'); settle(cid, b); bal -= b.amount; } }
    // past due: a late fee once, and the car's papers go bad on the plate lookup
    for (const b of q("SELECT * FROM civ_bills WHERE community_id = ? AND status = 'Open' AND due < ?").all(cid, t)) {
      q("UPDATE civ_bills SET status = 'Overdue', late = 1, amount = ? WHERE id = ?").run(b.amount + Math.round(b.amount * cf.late / 100), b.id);
      if (b.kind === 'reg' || b.kind === 'ins') fixVehicle(cid, b.ref.split(':')[1]); }
    // a housing bill overdue too long: the renter is evicted, the owner's home is repossessed; it goes back on the market and the debt stays
    for (const b of q("SELECT * FROM civ_bills WHERE community_id = ? AND status = 'Overdue' AND kind IN ('rent', 'mort', 'tax') AND due < ?").all(cid, t - cf.evict * DAY)) {
      const p = prop(cid, b.ref.split(':')[1]); if (!p || p.owner_id !== b.user_id) continue; release(p);
      note(cid, b.user_id, `${p.mode === 'rent' ? 'Evicted from' : 'Repossessed:'} ${p.name}. ${b.label} went unpaid.`); }
    db.exec('COMMIT'); } catch (e) { db.exec('ROLLBACK'); console.log(`civ cycle ${c.slug}:`, e.message); } };

// ── 911 from the Civilian tab: it goes on every Dispatch board as an emergency call, the way a call made in game does ──
const DEPT_TEAM = { pd: 'Police', fd: 'Fire', dot: 'DOT' };
const callGap = new Map();
export const call911 = (c, user, j) => { const k = `${c.id}:${user.id}`; if (now() - (callGap.get(k) || 0) < 60000) return { error: 'You just called. Wait a minute before calling again.' };
  const location = T(j.location, 80), details = T(j.details, 300), dept = DEPT_TEAM[j.dept] ? j.dept : 'pd';
  if (!location) return { error: 'Say where the emergency is (a postal or a place).' }; if (!details) return { error: 'Say what is happening.' };
  const ch = charOf(c.id, user.id), name = ch ? `${ch.first} ${ch.last}` : (user.roblox_name || user.name || 'Caller');
  q('INSERT INTO civ_calls (community_id, user_id, name, dept, location, details, at) VALUES (?, ?, ?, ?, ?, ?, ?)').run(c.id, user.id, T(name, 60), dept, location, details, now());
  callGap.set(k, now()); return { ok: true }; };
// the calls still open (the last hour, not cleared on the board) added to the snapshot every CAD reads, as ER:LC lists its own
export const withCalls = (cid, body, cleared) => { const open = q('SELECT * FROM civ_calls WHERE community_id = ? AND at >= ?').all(cid, now() - 3600000)
    .filter(r => !cleared[`CIV${r.id}@${Math.floor(r.at / 1000)}`]); if (!open.length) return body;
  let j; try { j = JSON.parse(body); } catch (e) { return body; }
  j.EmergencyCalls = [...(Array.isArray(j.EmergencyCalls) ? j.EmergencyCalls : []), ...open.map(r => ({ CallNumber: `CIV${r.id}`, Team: DEPT_TEAM[r.dept] || 'Police',
    Description: `${r.details} (caller ${r.name})`, PositionDescriptor: r.location, StartedAt: Math.floor(r.at / 1000) }))];
  return JSON.stringify(j); };

// ── housing ──
const prop = (cid, id) => q('SELECT * FROM civ_props WHERE community_id = ? AND id = ?').get(cid, +id || 0);
const release = p => q("UPDATE civ_props SET owner_id = NULL, mode = '', loan_left = 0, loan_weekly = 0, since = 0 WHERE id = ?").run(p.id);
const note = (cid, uid, memo) => { const a = acct(cid, uid); if (a) q('INSERT INTO civ_tx (community_id, user_id, amount, balance, kind, memo, at) VALUES (?, ?, 0, ?, ?, ?, ?)').run(cid, uid, a.balance, 'notice', T(memo, 120), now()); };
const propRow = p => ({ id: p.id, name: p.name, kind: p.kind, address: p.address, price: p.price, rent: p.rent, mode: p.mode, loan_left: p.loan_left, loan_weekly: p.loan_weekly, since: p.since });
const MAX_HOMES = 3;
// what moving in costs, shown on the listing before anyone commits
const terms = (cf, p) => { const down = Math.round(p.price * cf.down / 100), loan = Math.round((p.price - down) * (1 + cf.rate / 100));
  return { cash: p.price, down, loan, loan_weekly: Math.ceil(loan / cf.weeks), weeks: cf.weeks, tax: Math.round(p.price * cf.tax / 100 / 52) }; };
export const moveIn = (c, user, j) => { const cf = conf(c), p = prop(c.id, j.id), how = ['cash', 'mortgage', 'rent'].includes(j.how) ? j.how : '';
  if (!p) return { error: 'That home is gone.' }; if (p.owner_id) return { error: 'Someone already lives there.' }; if (!how) return { error: 'Buy it or rent it?' };
  if (how === 'rent' ? !p.rent : !p.price) return { error: how === 'rent' ? 'That home is not for rent.' : 'That home is not for sale.' };
  ensure(c, user.id);
  if (q("SELECT 1 FROM civ_bills WHERE community_id = ? AND user_id = ? AND status = 'Overdue' AND kind IN ('rent', 'mort', 'tax')").get(c.id, user.id)) return { error: 'You owe overdue housing bills. Pay them before you move again.' };
  if (q('SELECT count(*) AS n FROM civ_props WHERE community_id = ? AND owner_id = ?').get(c.id, user.id).n >= MAX_HOMES) return { error: `You already have ${MAX_HOMES} homes.` };
  const t = terms(cf, p), pay = how === 'cash' ? t.cash : how === 'mortgage' ? t.down : p.rent;
  const m = move(c.id, user.id, -pay, 'housing', `${how === 'rent' ? 'First week of rent' : how === 'mortgage' ? 'Down payment' : 'Bought'}, ${p.name}`); if (m.error) return m;
  q('UPDATE civ_props SET owner_id = ?, mode = ?, loan_left = ?, loan_weekly = ?, since = ? WHERE id = ?').run(user.id, how === 'cash' ? 'own' : how, how === 'mortgage' ? t.loan : 0, how === 'mortgage' ? t.loan_weekly : 0, now(), p.id);
  const ch = charOf(c.id, user.id); if (ch && !ch.address && p.address) q('UPDATE civ_chars SET address = ? WHERE community_id = ? AND user_id = ?').run(T(p.address, 80), c.id, user.id);
  return { ok: true }; };
// a renter moves out; an owner sells back for 80% of the price, less what is left on the mortgage
export const moveOut = (c, user, j) => { const p = prop(c.id, j.id); if (!p || p.owner_id !== user.id) return { error: 'That is not your home.' };
  if (p.mode !== 'rent') { const back = Math.round(p.price * 0.8) - p.loan_left;
    const m = move(c.id, user.id, back, 'housing', `Sold ${p.name}${p.loan_left ? ' (mortgage paid off)' : ''}`); if (m.error) return { error: `Selling pays ${money(Math.round(p.price * 0.8))}, which does not cover the ${money(p.loan_left)} left on the mortgage. ${m.error}` }; }
  release(p); return { ok: true }; };
// the owner and co-owners list, change and take down homes
export const saveProp = (c, j) => { const v = { name: T(j.name, 50), kind: T(j.kind, 20) || 'House', address: T(j.address, 80), price: Math.max(0, Math.min(1e9, Math.round(+j.price || 0))), rent: Math.max(0, Math.min(1e8, Math.round(+j.rent || 0))) };
  if (!v.name) return { error: 'Give the home a name.' }; if (!v.price && !v.rent) return { error: 'Set a price, a weekly rent, or both.' };
  if (j.id) { const p = prop(c.id, j.id); if (!p) return { error: 'That home is gone.' };
    q('UPDATE civ_props SET name = ?, kind = ?, address = ?, price = ?, rent = ? WHERE id = ?').run(v.name, v.kind, v.address, v.price, v.rent, p.id); return { ok: true }; }
  if (q('SELECT count(*) AS n FROM civ_props WHERE community_id = ?').get(c.id).n >= 300) return { error: 'This server has 300 homes already.' };
  q('INSERT INTO civ_props (community_id, name, kind, address, price, rent, created) VALUES (?, ?, ?, ?, ?, ?, ?)').run(c.id, v.name, v.kind, v.address, v.price, v.rent, now()); return { ok: true }; };
export const dropProp = (c, j) => { const p = prop(c.id, j.id); if (!p) return { error: 'That home is gone.' };
  if (j.evict) { if (!p.owner_id) return { error: 'Nobody lives there.' }; note(c.id, p.owner_id, `Removed from ${p.name} by staff.`); release(p); return { ok: true }; }
  if (p.owner_id) return { error: 'Someone lives there. Remove them first.' }; q('DELETE FROM civ_props WHERE id = ?').run(p.id); return { ok: true }; };

// ── what the Civilian tab shows ──
export const state = (c, user, isAdmin) => { const cf = conf(c); if (!cf.on) return { off: true, conf: cf, admin: !!isAdmin };
  const a = ensure(c, user.id), rid = user.roblox_id ? String(user.roblox_id) : '-';
  const bills = q("SELECT * FROM civ_bills WHERE community_id = ? AND user_id = ? AND (status IN ('Open', 'Overdue') OR paid_at >= ?) ORDER BY CASE status WHEN 'Overdue' THEN 0 WHEN 'Open' THEN 1 ELSE 2 END, due").all(c.id, user.id, now() - 30 * DAY).map(billRow);
  const vehicles = q('SELECT plate, model, color, color_hex, reg, ins, stolen, last_seen FROM pd_vehicles WHERE community_id = ? AND owner_rid = ? ORDER BY last_seen DESC LIMIT 20').all(c.id, rid)
    .map(v => ({ plate: v.plate, model: v.model || '', color: v.color || '', hex: v.color_hex || '', reg: v.reg, ins: v.ins, stolen: !!v.stolen, last_seen: v.last_seen }));
  const record = q("SELECT id, kind, status, data, at, by_name FROM pd_records WHERE community_id = ? AND subject_rid = ? AND kind IN ('citation', 'warning', 'arrest') ORDER BY at DESC LIMIT 50").all(c.id, rid)
    .map(r => { const d = JSON.parse(r.data || '{}'); return { id: r.id, kind: r.kind, status: r.status, at: r.at, by: r.by_name || '', charges: (d.charges || []).map(x => ({ title: x.title, count: x.count, cls: x.cls })),
      fine: d.fine || 0, jail: d.jail || 0, reason: d.reason || '', location: d.location || '', paid: !!d.paid_at }; });
  const tx = q('SELECT amount, balance, kind, memo, at FROM civ_tx WHERE community_id = ? AND user_id = ? ORDER BY at DESC LIMIT 40').all(c.id, user.id);
  const calls = q('SELECT dept, location, details, at FROM civ_calls WHERE community_id = ? AND user_id = ? ORDER BY at DESC LIMIT 10').all(c.id, user.id);
  const nextPay = cf.weekly ? a.paid_at + WEEK : 0;
  const homes = q('SELECT * FROM civ_props WHERE community_id = ? AND owner_id = ? ORDER BY since').all(c.id, user.id).map(p => ({ ...propRow(p), tax: p.mode === 'rent' ? 0 : terms(cf, p).tax }));
  const market = q('SELECT * FROM civ_props WHERE community_id = ? AND owner_id IS NULL ORDER BY price, rent').all(c.id).map(p => ({ ...propRow(p), terms: terms(cf, p) }));
  const props = isAdmin ? q('SELECT p.*, coalesce(u.roblox_name, u.name) AS who FROM civ_props p LEFT JOIN users u ON u.id = p.owner_id WHERE p.community_id = ? ORDER BY p.name').all(c.id).map(p => ({ ...propRow(p), who: p.who || '' })) : undefined;
  return { conf: cf, admin: !!isAdmin, linked: !!user.roblox_id, balance: a.balance, autopay: !!a.autopay, nextPay, character: charOf(c.id, user.id), bills, vehicles, record, tx, calls, homes, market, props }; };

// ── staff: put money in or take it out ──
export const grant = (c, by, j) => { const who = T(j.user, 40);
  const u = who && q('SELECT id FROM users WHERE roblox_id = ? OR lower(roblox_name) = lower(?) ORDER BY id DESC LIMIT 1').get(who, who);
  if (!u) return { error: 'Nobody with that Roblox name has an Oversite account.' }; const amount = Math.round(+j.amount);
  if (!Number.isFinite(amount) || !amount || Math.abs(amount) > 1e7) return { error: 'Enter an amount, like 500 or -200.' };
  ensure(c, u.id); return move(c.id, u.id, amount, amount > 0 ? 'grant' : 'charge', T(j.memo, 80) || `By staff (${by})`, true); };

export const start = () => { const run = () => { for (const c of communities.all()) { try { cycle(c); } catch (e) { console.log('civ:', e.message); } } };
  setTimeout(run, 20000); setInterval(run, 5 * 60000); };
