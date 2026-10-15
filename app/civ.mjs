// Civilian life (the Civilian tab): every server keeps its own economy. A civilian has a bank account, a character police
// see on a name lookup, the bills they owe and their 911 calls. Bills: the fine on every citation or arrest written against
// them, and a weekly registration and insurance bill for each car ER:LC has seen them drive. A bill left unpaid past its
// due date takes a late fee; an unpaid registration or insurance shows as Expired or Lapsed on the police plate lookup
// until it is paid. Money comes in as a weekly payment from the server and whatever staff grant.
// Housing: the owner lists homes; a civilian buys one outright, on a mortgage, or rents it. Rent, the mortgage payment and
// property tax are billed weekly like everything else, and a housing bill left overdue too long loses them the home
// (eviction for a renter, repossession for an owner).
// Businesses: a civilian registers one for a fee and renews its license weekly. It has its own account, hires through
// applications (each one comes with an automatic background check, and a business can refuse anyone with a felony, a
// recent arrest, an active warrant, no license or unpaid debts), pays wages weekly from its account, and bills customers.
import { db, now, communities, licenses } from './db.mjs';

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
CREATE INDEX IF NOT EXISTS civ_props_c ON civ_props (community_id, owner_id);
CREATE TABLE IF NOT EXISTS civ_biz (id INTEGER PRIMARY KEY, community_id INTEGER NOT NULL REFERENCES communities(id) ON DELETE CASCADE, owner_id INTEGER NOT NULL,
  name TEXT NOT NULL, kind TEXT NOT NULL DEFAULT 'Store', address TEXT NOT NULL DEFAULT '', about TEXT NOT NULL DEFAULT '', balance INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'Active', hiring INTEGER NOT NULL DEFAULT 0, reqs TEXT NOT NULL DEFAULT '{}', paid_wk INTEGER NOT NULL DEFAULT 0, created INTEGER NOT NULL);
CREATE TABLE IF NOT EXISTS civ_staff (biz_id INTEGER NOT NULL REFERENCES civ_biz(id) ON DELETE CASCADE, user_id INTEGER NOT NULL, title TEXT NOT NULL DEFAULT 'Employee',
  wage INTEGER NOT NULL DEFAULT 0, hired INTEGER NOT NULL, PRIMARY KEY (biz_id, user_id));
CREATE TABLE IF NOT EXISTS civ_apps (id INTEGER PRIMARY KEY, biz_id INTEGER NOT NULL REFERENCES civ_biz(id) ON DELETE CASCADE, user_id INTEGER NOT NULL,
  note TEXT NOT NULL DEFAULT '', status TEXT NOT NULL DEFAULT 'Pending', bg TEXT NOT NULL DEFAULT '{}', at INTEGER NOT NULL, decided INTEGER);
CREATE TABLE IF NOT EXISTS civ_btx (id INTEGER PRIMARY KEY, biz_id INTEGER NOT NULL REFERENCES civ_biz(id) ON DELETE CASCADE, amount INTEGER NOT NULL, balance INTEGER NOT NULL, memo TEXT NOT NULL DEFAULT '', at INTEGER NOT NULL);`);
const q = sql => db.prepare(sql);
export const T = (v, n) => String(v ?? '').replace(/[\u0000-\u001f<>]/g, '').replace(/\s+/g, ' ').trim().slice(0, n);
export const DAY = 864e5, WEEK = 7 * DAY;
// the economy runs on ER:LC time: one in-game day is a 24-minute day and night cycle, a week is 7 of them (2 h 48 min).
// Pay, bills, due dates, eviction, licenses, wages, loans and ads count in these; background checks and history stay in real days.
export const GDAY = 24 * 60000, GWEEK = 7 * GDAY;
export const money = n => '$' + Math.round(n).toLocaleString('en-US');

// ── the server's settings (Settings in the Civilian tab, owner and co-owners) ──
// housing: tax is a yearly % of the price, billed by the week; a mortgage takes `down`% up front and the rest plus `rate`% over `weeks`;
// `evict` is how many days a housing bill may sit overdue before the home is lost
// businesses: `bizfee` to register, `bizlic` a week to keep the license
const DEFAULTS = { on: true, start: 5000, weekly: 750, reg: 150, ins: 200, late: 10, grace: 3, tax: 2, down: 20, weeks: 26, rate: 10, evict: 7, bizfee: 2500, bizlic: 250, showpay: 200 };
const LIMITS = { start: [0, 1e7], weekly: [0, 1e6], reg: [0, 1e5], ins: [0, 1e5], late: [0, 100], grace: [1, 14], tax: [0, 20], down: [0, 100], weeks: [1, 260], rate: [0, 100], evict: [1, 60], bizfee: [0, 1e7], bizlic: [0, 1e6], showpay: [0, 1e5] };
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
export const move = (cid, uid, amount, kind, memo, force = false) => { const a = acct(cid, uid); if (!a) return { error: 'No account.' }; amount = Math.round(amount);
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
  if (b.kind === 'inv') { const z = biz(cid, b.ref.split(':')[1]); if (z) { bizMove(z.id, b.amount, `Paid: ${b.label}`); hooks.commission(cid, z, +b.ref.split(':')[3] || 0, b.amount); } }
  if (b.kind === 'lic') { const z = biz(cid, b.ref.split(':')[1]); if (z && z.status === 'Suspended' && !q("SELECT 1 FROM civ_bills WHERE community_id = ? AND kind = 'lic' AND ref LIKE ? AND status = 'Overdue'").get(cid, `lic:${z.id}:%`))
    q("UPDATE civ_biz SET status = 'Active' WHERE id = ?").run(z.id); }
  if (b.kind === 'mort') { const p = prop(cid, b.ref.split(':')[1]); if (p && p.owner_id === b.user_id && p.mode === 'mortgage') { const left = Math.max(0, p.loan_left - p.loan_weekly);
    q('UPDATE civ_props SET loan_left = ?, mode = ? WHERE id = ?').run(left, left ? 'mortgage' : 'own', p.id); } } };
// the fine on a citation or arrest, billed to the person it was written against (once: the ref is unique)
const FINE_SQL = "SELECT id, kind, subject_rid, data, at FROM pd_records WHERE community_id = ? AND kind IN ('citation', 'arrest') AND at >= ? AND subject_rid = ?";
const billFine = (cid, uid, r, cf) => { const d = JSON.parse(r.data || '{}'); if (!(d.fine > 0) || d.paid_at) return;
  bill(cid, uid, 'fine', `rec:${r.id}`, `${r.kind === 'arrest' ? 'Arrest' : 'Citation'} fine: ${(d.charges || []).map(x => x.title).slice(0, 2).join(', ')}`, d.fine, r.at, r.at + cf.grace * GDAY); };
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
    for (const h of holders) if (cf.weekly && t - h.paid_at >= GWEEK) { q('UPDATE civ_accounts SET paid_at = ? WHERE community_id = ? AND user_id = ?').run(t, cid, h.user_id); move(cid, h.user_id, cf.weekly, 'deposit', 'Weekly payment'); }
    // a fine for every citation and arrest written since the economy began, billed to whoever it was written against
    for (const r of q("SELECT id, kind, subject_rid, data, at FROM pd_records WHERE community_id = ? AND kind IN ('citation', 'arrest') AND at >= ? AND subject_rid <> ''").all(cid, since)) {
      const h = byRid.get(String(r.subject_rid)); if (h) billFine(cid, h.user_id, r, cf); }
    // each week, registration and insurance on every civilian car they drove in the last two weeks (never a department's)
    const wk = Math.floor((t - since) / GWEEK), wkStart = since + wk * GWEEK;
    for (const v of q('SELECT plate, model, owner_rid FROM pd_vehicles WHERE community_id = ? AND owner_rid <> \'\' AND civ = 1 AND last_seen >= ?').all(cid, t - 2 * GWEEK)) {
      const h = byRid.get(String(v.owner_rid)); if (!h) continue; const car = `${v.model || 'Vehicle'} (${v.plate})`;
      if (cf.reg) bill(cid, h.user_id, 'reg', `reg:${v.plate}:${wk}`, `Registration, ${car}`, cf.reg, wkStart, wkStart + cf.grace * GDAY);
      if (cf.ins) bill(cid, h.user_id, 'ins', `ins:${v.plate}:${wk}`, `Insurance, ${car}`, cf.ins, wkStart, wkStart + cf.grace * GDAY); }
    // each week, rent, the mortgage payment and property tax on every home, except in the week it was moved into (paid up front)
    for (const p of q('SELECT * FROM civ_props WHERE community_id = ? AND owner_id IS NOT NULL').all(cid)) { if (p.since >= wkStart) continue;
      const due = wkStart + cf.grace * GDAY, where = `${p.name}${p.address ? ', ' + p.address : ''}`;
      if (p.mode === 'rent' && p.rent) bill(cid, p.owner_id, 'rent', `rent:${p.id}:${wk}`, `Rent, ${where}`, p.rent, wkStart, due);
      if (p.mode === 'mortgage' && p.loan_left > 0) bill(cid, p.owner_id, 'mort', `mort:${p.id}:${wk}`, `Mortgage, ${where}`, Math.min(p.loan_weekly, p.loan_left), wkStart, due);
      const tax = p.mode === 'rent' ? 0 : Math.round(p.price * cf.tax / 100 / 52); if (tax) bill(cid, p.owner_id, 'tax', `tax:${p.id}:${wk}`, `Property tax, ${where}`, tax, wkStart, due); }
    // each week, every business's license, and its wages paid from the business account (staff hear about it when it cannot pay)
    for (const z of q('SELECT * FROM civ_biz WHERE community_id = ?').all(cid)) {
      if (cf.bizlic && z.created < wkStart) bill(cid, z.owner_id, 'lic', `lic:${z.id}:${wk}`, `Business license, ${z.name}`, cf.bizlic, wkStart, wkStart + cf.grace * GDAY);
      if (z.paid_wk >= wk) continue; q('UPDATE civ_biz SET paid_wk = ? WHERE id = ?').run(wk, z.id);
      for (const w of q('SELECT * FROM civ_staff WHERE biz_id = ? AND wage > 0').all(z.id)) { const cur = biz(cid, z.id);
        if (cur.balance < w.wage) { note(cid, w.user_id, `${z.name} could not pay your wage this week.`); note(cid, z.owner_id, `${z.name} could not pay a wage of ${money(w.wage)}: the business account is short.`); continue; }
        bizMove(z.id, -w.wage, 'Wages'); move(cid, w.user_id, w.wage, 'wage', `Wage from ${z.name}`); } }
    // autopay, oldest first, as far as the money goes
    for (const h of holders) { if (!h.autopay) continue; let bal = acct(cid, h.user_id).balance;
      for (const b of q("SELECT * FROM civ_bills WHERE community_id = ? AND user_id = ? AND status IN ('Open', 'Overdue') ORDER BY due").all(cid, h.user_id)) {
        if (b.amount > bal) break; move(cid, h.user_id, -b.amount, 'bill', b.label + ' (autopay)'); settle(cid, b); bal -= b.amount; } }
    // past due: a late fee once, and the car's papers go bad on the plate lookup
    for (const b of q("SELECT * FROM civ_bills WHERE community_id = ? AND status = 'Open' AND due < ?").all(cid, t)) {
      q("UPDATE civ_bills SET status = 'Overdue', late = 1, amount = ? WHERE id = ?").run(b.amount + Math.round(b.amount * cf.late / 100), b.id);
      if (b.kind === 'reg' || b.kind === 'ins') fixVehicle(cid, b.ref.split(':')[1]); }
    // a housing bill overdue too long: the renter is evicted, the owner's home is repossessed; it goes back on the market and the debt stays
    for (const b of q("SELECT * FROM civ_bills WHERE community_id = ? AND status = 'Overdue' AND kind IN ('rent', 'mort', 'tax') AND due < ?").all(cid, t - cf.evict * GDAY)) {
      const p = prop(cid, b.ref.split(':')[1]); if (!p || p.owner_id !== b.user_id) continue; release(p);
      note(cid, b.user_id, `${p.mode === 'rent' ? 'Evicted from' : 'Repossessed:'} ${p.name}. ${b.label} went unpaid.`); }
    // a license overdue too long suspends the business: no hiring and no bills to customers until it is paid
    for (const b of q("SELECT * FROM civ_bills WHERE community_id = ? AND status = 'Overdue' AND kind = 'lic' AND due < ?").all(cid, t - cf.evict * GDAY)) {
      const z = biz(cid, b.ref.split(':')[1]); if (!z || z.status !== 'Active') continue; q("UPDATE civ_biz SET status = 'Suspended' WHERE id = ?").run(z.id);
      note(cid, z.owner_id, `${z.name} is suspended until its license is paid.`); }
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
export const note = (cid, uid, memo) => { const a = acct(cid, uid); if (a) q('INSERT INTO civ_tx (community_id, user_id, amount, balance, kind, memo, at) VALUES (?, ?, 0, ?, ?, ?, ?)').run(cid, uid, a.balance, 'notice', T(memo, 120), now()); };
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

// ── background checks ──
// what a business sees when someone applies, worked out from the police records written against them
export const background = (c, uid) => { const u = q('SELECT roblox_id FROM users WHERE id = ?').get(uid), rid = u?.roblox_id ? String(u.roblox_id) : '-', t = now();
  const recs = q("SELECT kind, status, data, at FROM pd_records WHERE community_id = ? AND subject_rid = ? AND kind IN ('arrest', 'citation', 'warrant')").all(c.id, rid);
  const arrests = recs.filter(r => r.kind === 'arrest'), cls = r => { try { return (JSON.parse(r.data || '{}').charges || []).map(x => x.cls); } catch (e) { return []; } };
  const last = arrests.reduce((m, r) => Math.max(m, r.at), 0);
  return { linked: !!u?.roblox_id, felonies: arrests.filter(r => cls(r).includes('Felony')).length, arrests: arrests.length, citations: recs.filter(r => r.kind === 'citation').length,
    lastArrest: last || null, warrants: recs.filter(r => r.kind === 'warrant' && r.status === 'Active').length, license: !!Object.keys(licenses.get(uid) || {}).length,
    debt: q("SELECT count(*) AS n FROM civ_bills WHERE community_id = ? AND user_id = ? AND status = 'Overdue'").get(c.id, uid).n, at: t }; };
// what a business may require; each failed one is a reason the application is turned down
const REQS = { felony: 'no felony convictions', clean: 'no arrests in the last {n} days', warrants: 'no active warrants', license: "a driver's license on file", debt: 'no overdue bills' };
const reqsOf = z => { let r = {}; try { r = JSON.parse(z.reqs || '{}'); } catch (e) {} return { felony: !!r.felony, clean: Math.max(0, Math.min(365, Math.round(+r.clean || 0))), warrants: r.warrants !== false, license: !!r.license, debt: !!r.debt }; };
const failing = (r, g) => [r.felony && g.felonies && 'a felony conviction', r.clean && g.lastArrest && g.lastArrest > now() - r.clean * DAY && `an arrest in the last ${r.clean} days`,
  r.warrants && g.warrants && 'an active warrant', r.license && !g.license && "no driver's license on file", r.debt && g.debt && 'overdue bills'].filter(Boolean);
const reqText = r => Object.keys(REQS).filter(k => r[k]).map(k => REQS[k].replace('{n}', r.clean));

// ── businesses ──
export const biz = (cid, id) => q('SELECT * FROM civ_biz WHERE community_id = ? AND id = ?').get(cid, +id || 0);
export const bizMove = (id, amount, memo) => { const z = q('SELECT balance FROM civ_biz WHERE id = ?').get(id); if (!z) return; const bal = z.balance + Math.round(amount);
  q('UPDATE civ_biz SET balance = ? WHERE id = ?').run(bal, id); q('INSERT INTO civ_btx (biz_id, amount, balance, memo, at) VALUES (?, ?, ?, ?, ?)').run(id, Math.round(amount), bal, T(memo, 120), now()); };
// app/civbiz.mjs fills these in: Premium managers who can run a business, how many businesses someone may own, and commission on a paid bill
export const hooks = { manager: () => false, managed: () => [], maxBiz: () => 2, commission: () => {} };
const BIZ_KINDS = ['Store', 'Restaurant', 'Mechanic', 'Towing', 'Taxi', 'Security', 'Law firm', 'Medical', 'Real estate', 'Bank', 'News', 'Other'];
const mine = (c, user, id) => { const z = biz(c.id, id); return z && z.owner_id === user.id ? z : null; };
const runs = (c, user, id) => { const z = biz(c.id, id); return z && (z.owner_id === user.id || hooks.manager(c, user, z)) ? z : null; };   // the owner, or a Premium manager
const weekNo = cf => cf.since ? Math.floor((now() - cf.since) / GWEEK) : 0;
export const openBiz = (c, user, j) => { const cf = conf(c), name = T(j.name, 50), kind = BIZ_KINDS.includes(j.kind) ? j.kind : 'Other'; ensure(c, user.id);
  if (!name) return { error: 'Name the business.' };
  if (q('SELECT 1 FROM civ_biz WHERE community_id = ? AND lower(name) = lower(?)').get(c.id, name)) return { error: 'A business with that name already exists.' };
  const max = hooks.maxBiz(c, user); if (q('SELECT count(*) AS n FROM civ_biz WHERE community_id = ? AND owner_id = ?').get(c.id, user.id).n >= max) return { error: `You already own ${max} businesses.${max < 5 ? ' Premium lets you own up to 5.' : ''}` };
  const g = background(c, user.id); if (g.warrants) return { error: 'You have an active warrant. Sort it out before you register a business.' };
  if (cf.bizfee) { const m = move(c.id, user.id, -cf.bizfee, 'business', `Registered ${name}`); if (m.error) return { error: `Registering costs ${money(cf.bizfee)}. ${m.error}` }; }
  q('INSERT INTO civ_biz (community_id, owner_id, name, kind, address, about, paid_wk, created) VALUES (?, ?, ?, ?, ?, ?, ?, ?)').run(c.id, user.id, name, kind, T(j.address, 80), T(j.about, 300), weekNo(cf), now());
  return { ok: true }; };
export const editBiz = (c, user, j) => { const z = mine(c, user, j.id); if (!z) return { error: 'That is not your business.' };
  const r = { felony: !!j.felony, clean: Math.max(0, Math.min(365, Math.round(+j.clean || 0))), warrants: !!j.warrants, license: !!j.license, debt: !!j.debt };
  q('UPDATE civ_biz SET kind = ?, address = ?, about = ?, hiring = ?, reqs = ? WHERE id = ?').run(BIZ_KINDS.includes(j.kind) ? j.kind : z.kind, T(j.address, 80), T(j.about, 300), j.hiring ? 1 : 0, JSON.stringify(r), z.id);
  return { ok: true }; };
// money between the owner's own account and the business's: positive puts money in, negative takes it out
export const bizCash = (c, user, j) => { const z = mine(c, user, j.id); if (!z) return { error: 'That is not your business.' }; const a = Math.round(+j.amount);
  if (!Number.isFinite(a) || !a) return { error: 'Enter an amount.' };
  if (a < 0 && z.balance + a < 0) return { error: `The business only has ${money(z.balance)}.` };
  const m = move(c.id, user.id, -a, 'business', a > 0 ? `Put into ${z.name}` : `Taken from ${z.name}`); if (m.error) return m;
  bizMove(z.id, a, a > 0 ? 'Owner put money in' : 'Owner took money out'); return { ok: true }; };
export const closeBiz = (c, user, j) => { const z = mine(c, user, j.id); if (!z) return { error: 'That is not your business.' };
  if (z.balance) move(c.id, user.id, z.balance, 'business', `Closed ${z.name}`, true);
  for (const w of q('SELECT user_id FROM civ_staff WHERE biz_id = ?').all(z.id)) note(c.id, w.user_id, `${z.name} closed. You no longer work there.`);
  q('DELETE FROM civ_biz WHERE id = ?').run(z.id); return { ok: true }; };
export const apply = (c, user, j) => { const z = biz(c.id, j.id); ensure(c, user.id);
  if (!z || !z.hiring || z.status !== 'Active') return { error: 'That business is not hiring.' }; if (z.owner_id === user.id) return { error: 'You own it.' };
  if (q('SELECT 1 FROM civ_staff WHERE biz_id = ? AND user_id = ?').get(z.id, user.id)) return { error: 'You already work there.' };
  if (q("SELECT 1 FROM civ_apps WHERE biz_id = ? AND user_id = ? AND (status = 'Pending' OR (status = 'Declined' AND decided > ?))").get(z.id, user.id, now() - 3 * DAY)) return { error: 'You already applied there. Wait for an answer, or three days after a no.' };
  const g = background(c, user.id), no = failing(reqsOf(z), g);
  if (no.length) return { error: `Your background check shows ${no.join(', ')}. ${z.name} does not hire anyone with that.` };
  q('INSERT INTO civ_apps (biz_id, user_id, note, bg, at) VALUES (?, ?, ?, ?, ?)').run(z.id, user.id, T(j.note, 500), JSON.stringify(g), now()); return { ok: true }; };
export const decide = (c, user, j) => { const a = q('SELECT * FROM civ_apps WHERE id = ?').get(+j.app || 0), z = a && runs(c, user, a.biz_id);
  if (!z) return { error: 'That application is gone.' }; if (a.status !== 'Pending') return { error: 'That application is already answered.' };
  if (!j.hire) { q("UPDATE civ_apps SET status = 'Declined', decided = ? WHERE id = ?").run(now(), a.id); note(c.id, a.user_id, `${z.name} turned down your application.`); return { ok: true }; }
  if (z.status !== 'Active') return { error: z.status === 'Held' ? 'Server staff have put the business on hold.' : 'The business is suspended until its license is paid.' };
  const title = T(j.title, 40) || 'Employee', wage = Math.max(0, Math.min(1e6, Math.round(+j.wage || 0)));
  q('INSERT OR REPLACE INTO civ_staff (biz_id, user_id, title, wage, hired) VALUES (?, ?, ?, ?, ?)').run(z.id, a.user_id, title, wage, now());
  q("UPDATE civ_apps SET status = 'Hired', decided = ? WHERE id = ?").run(now(), a.id);
  q('UPDATE civ_chars SET occupation = ? WHERE community_id = ? AND user_id = ?').run(T(`${title}, ${z.name}`, 40), c.id, a.user_id);
  note(c.id, a.user_id, `Hired at ${z.name} as ${title}${wage ? `, ${money(wage)} a week` : ''}.`); return { ok: true }; };
export const staffSet = (c, user, j) => { const z = runs(c, user, j.id); if (!z) return { error: 'That is not your business.' };
  const w = q('SELECT * FROM civ_staff WHERE biz_id = ? AND user_id = ?').get(z.id, +j.user || 0); if (!w) return { error: 'They do not work there.' };
  if (w.manager && z.owner_id !== user.id) return { error: 'Only the owner can change a manager.' };
  if (j.fire) { q('DELETE FROM civ_staff WHERE biz_id = ? AND user_id = ?').run(z.id, w.user_id); note(c.id, w.user_id, `Let go from ${z.name}.`); return { ok: true }; }
  q('UPDATE civ_staff SET title = ?, wage = ? WHERE biz_id = ? AND user_id = ?').run(T(j.title, 40) || w.title, Math.max(0, Math.min(1e6, Math.round(+j.wage || 0))), z.id, w.user_id); return { ok: true }; };
export const quit = (c, user, j) => { const z = biz(c.id, j.id); if (!z || !q('SELECT 1 FROM civ_staff WHERE biz_id = ? AND user_id = ?').get(z.id, user.id)) return { error: 'You do not work there.' };
  q('DELETE FROM civ_staff WHERE biz_id = ? AND user_id = ?').run(z.id, user.id); note(c.id, z.owner_id, `Someone quit ${z.name}.`); return { ok: true }; };
// a bill from a business to a customer, paid into the business's account
export const invoice = (c, user, j) => { const cf = conf(c), z = biz(c.id, j.id); if (!z) return { error: 'That business is gone.' };
  if (z.owner_id !== user.id && !q('SELECT 1 FROM civ_staff WHERE biz_id = ? AND user_id = ?').get(z.id, user.id)) return { error: 'You do not work there.' };
  if (z.status !== 'Active') return { error: z.status === 'Held' ? 'Server staff have put the business on hold.' : 'The business is suspended until its license is paid.' };
  const who = T(j.to, 40), u = who && q('SELECT id FROM users WHERE roblox_id = ? OR lower(roblox_name) = lower(?) ORDER BY id DESC LIMIT 1').get(who, who);
  if (!u) return { error: 'Nobody with that Roblox name has an Oversite account.' }; if (u.id === user.id) return { error: 'You cannot bill yourself.' };
  const amount = Math.round(+j.amount); if (!Number.isFinite(amount) || amount <= 0 || amount > 1e7) return { error: 'Enter an amount.' };
  ensure(c, u.id); const t = now(), what = T(j.memo, 60) || 'Services';
  bill(c.id, u.id, 'inv', `inv:${z.id}:${t}${Math.floor(Math.random() * 1e3)}:${user.id}`, `${z.name}: ${what}`, amount, t, t + cf.grace * GDAY); return { ok: true }; };
export const bizAdmin = (c, j) => { const z = biz(c.id, j.id); if (!z) return { error: 'That business is gone.' };
  if (j.remove) { for (const w of q('SELECT user_id FROM civ_staff WHERE biz_id = ?').all(z.id)) note(c.id, w.user_id, `${z.name} was closed by staff.`); note(c.id, z.owner_id, `${z.name} was closed by staff.`);
    q('DELETE FROM civ_biz WHERE id = ?').run(z.id); return { ok: true }; }
  // a hold by staff is its own status, so paying the license does not lift it
  const st = j.suspend ? 'Held' : q("SELECT 1 FROM civ_bills WHERE community_id = ? AND kind = 'lic' AND ref LIKE ? AND status = 'Overdue'").get(c.id, `lic:${z.id}:%`) ? 'Suspended' : 'Active';
  q('UPDATE civ_biz SET status = ? WHERE id = ?').run(st, z.id); note(c.id, z.owner_id, `${z.name} was ${j.suspend ? 'put on hold' : 'released'} by staff.`); return { ok: true }; };
export const who = uid => { const u = q('SELECT roblox_name, name FROM users WHERE id = ?').get(uid); return u ? u.roblox_name || u.name : 'Someone'; };
const fullName = (cid, uid) => { const ch = charOf(cid, uid); return ch && ch.first ? `${ch.first} ${ch.last}` : ''; };

// ── what the Civilian tab shows ──
// `live`: the cars they have spawned in game right now (server.mjs reads them off the latest ER:LC snapshot), null when unknown
export const state = (c, user, isAdmin, live = null) => { const cf = conf(c); if (!cf.on) return { off: true, conf: cf, admin: !!isAdmin, linked: !!user.roblox_id, character: charOf(c.id, user.id) };
  const a = ensure(c, user.id), rid = user.roblox_id ? String(user.roblox_id) : '-';
  // a ticket written a moment ago is on their bills straight away, not at the next cycle
  if (cf.since && rid !== '-') for (const r of q(FINE_SQL).all(c.id, cf.since, rid)) billFine(c.id, user.id, r, cf);
  const bills = q("SELECT * FROM civ_bills WHERE community_id = ? AND user_id = ? AND (status IN ('Open', 'Overdue') OR paid_at >= ?) ORDER BY CASE status WHEN 'Overdue' THEN 0 WHEN 'Open' THEN 1 ELSE 2 END, due").all(c.id, user.id, now() - 30 * DAY).map(billRow);
  const onFile = plate => q('SELECT reg, ins, stolen FROM pd_vehicles WHERE community_id = ? AND plate = ?').get(c.id, plate) || {};
  const vehicles = (live || []).slice(0, 10).map(s => { const plate = T(s.plate, 10).toUpperCase(), v = onFile(plate);
    return { plate, model: T(s.model, 60), color: T(s.color, 30), hex: /^#?[0-9a-f]{6}$/i.test(s.hex || '') ? '#' + String(s.hex).replace('#', '') : '', reg: v.reg || '', ins: v.ins || '', stolen: !!v.stolen }; });
  const fines = new Map(q("SELECT * FROM civ_bills WHERE community_id = ? AND user_id = ? AND kind = 'fine'").all(c.id, user.id).map(b => [b.ref, b]));
  const record = q("SELECT id, kind, status, data, at, by_name FROM pd_records WHERE community_id = ? AND subject_rid = ? AND kind IN ('citation', 'warning', 'arrest') ORDER BY at DESC LIMIT 50").all(c.id, rid)
    .map(r => { const d = JSON.parse(r.data || '{}'); return { id: r.id, kind: r.kind, status: r.status, at: r.at, by: r.by_name || '', charges: (d.charges || []).map(x => ({ title: x.title, count: x.count, cls: x.cls })),
      fine: d.fine || 0, jail: d.jail || 0, reason: d.reason || '', location: d.location || '', paid: !!d.paid_at, bill: (b => b && { id: b.id, status: b.status, due: b.due, amount: b.amount })(fines.get(`rec:${r.id}`)) }; });
  const tx = q('SELECT amount, balance, kind, memo, at FROM civ_tx WHERE community_id = ? AND user_id = ? ORDER BY at DESC LIMIT 40').all(c.id, user.id);
  const calls = q('SELECT dept, location, details, at FROM civ_calls WHERE community_id = ? AND user_id = ? ORDER BY at DESC LIMIT 10').all(c.id, user.id);
  const nextPay = cf.weekly ? a.paid_at + GWEEK : 0;
  const homes = q('SELECT * FROM civ_props WHERE community_id = ? AND owner_id = ? ORDER BY since').all(c.id, user.id).map(p => ({ ...propRow(p), tax: p.mode === 'rent' ? 0 : terms(cf, p).tax }));
  const market = q('SELECT * FROM civ_props WHERE community_id = ? AND owner_id IS NULL ORDER BY price, rent').all(c.id).map(p => ({ ...propRow(p), terms: terms(cf, p) }));
  const props = isAdmin ? q('SELECT p.*, coalesce(u.roblox_name, u.name) AS who FROM civ_props p LEFT JOIN users u ON u.id = p.owner_id WHERE p.community_id = ? ORDER BY p.name').all(c.id).map(p => ({ ...propRow(p), who: p.who || '' })) : undefined;
  const me = background(c, user.id);
  const jobs = q('SELECT * FROM civ_biz WHERE community_id = ? AND hiring = 1 AND status = ? ORDER BY name').all(c.id, 'Active').map(z => { const r = reqsOf(z);
    return { id: z.id, name: z.name, kind: z.kind, address: z.address, about: z.about, reqs: reqText(r), blocked: failing(r, me), own: z.owner_id === user.id }; });
  const work = q('SELECT s.*, b.name, b.kind FROM civ_staff s JOIN civ_biz b ON b.id = s.biz_id WHERE b.community_id = ? AND s.user_id = ?').all(c.id, user.id).map(w => ({ id: w.biz_id, name: w.name, kind: w.kind, title: w.title, wage: w.wage, hired: w.hired }));
  const apps = q('SELECT a.id, a.status, a.at, b.name FROM civ_apps a JOIN civ_biz b ON b.id = a.biz_id WHERE b.community_id = ? AND a.user_id = ? ORDER BY a.at DESC LIMIT 10').all(c.id, user.id);
  // the businesses they run: their own, and any they manage (Premium)
  const managed = new Set(hooks.managed(c, user));
  const owned = q('SELECT * FROM civ_biz WHERE community_id = ? ORDER BY created').all(c.id).filter(z => z.owner_id === user.id || managed.has(z.id)).map(z => ({ id: z.id, role: z.owner_id === user.id ? 'owner' : 'manager', owner: who(z.owner_id), name: z.name, kind: z.kind, address: z.address, about: z.about,
    balance: z.balance, status: z.status, hiring: !!z.hiring, reqs: reqsOf(z),
    staff: q('SELECT * FROM civ_staff WHERE biz_id = ? ORDER BY hired').all(z.id).map(w => ({ user: w.user_id, who: who(w.user_id), name: fullName(c.id, w.user_id), title: w.title, wage: w.wage, hourly: w.hourly || 0, manager: !!w.manager, commission: w.commission || 0, hired: w.hired })),
    apps: q("SELECT * FROM civ_apps WHERE biz_id = ? AND status = 'Pending' ORDER BY at").all(z.id).map(x => ({ id: x.id, who: who(x.user_id), name: fullName(c.id, x.user_id), note: x.note, at: x.at, bg: JSON.parse(x.bg || '{}') })),
    ledger: q('SELECT amount, balance, memo, at FROM civ_btx WHERE biz_id = ? ORDER BY at DESC LIMIT 15').all(z.id) }));
  const allBiz = isAdmin ? q('SELECT b.*, (SELECT count(*) FROM civ_staff s WHERE s.biz_id = b.id) AS staff FROM civ_biz b WHERE b.community_id = ? ORDER BY b.name').all(c.id).map(z => ({ id: z.id, name: z.name, kind: z.kind, owner: who(z.owner_id), status: z.status, staff: z.staff, balance: z.balance })) : undefined;
  return { conf: cf, admin: !!isAdmin, linked: !!user.roblox_id, balance: a.balance, autopay: !!a.autopay, nextPay, character: charOf(c.id, user.id), bills, vehicles, carsLive: !!live, record, tx, calls, homes, market, props,
    bg: me, jobs, work, apps, owned, allBiz, kinds: BIZ_KINDS }; };

// ── staff: put money in or take it out ──
export const grant = (c, by, j) => { const who = T(j.user, 40);
  const u = who && q('SELECT id FROM users WHERE roblox_id = ? OR lower(roblox_name) = lower(?) ORDER BY id DESC LIMIT 1').get(who, who);
  if (!u) return { error: 'Nobody with that Roblox name has an Oversite account.' }; const amount = Math.round(+j.amount);
  if (!Number.isFinite(amount) || !amount || Math.abs(amount) > 1e7) return { error: 'Enter an amount, like 500 or -200.' };
  ensure(c, u.id); return move(c.id, u.id, amount, amount > 0 ? 'grant' : 'charge', T(j.memo, 80) || `By staff (${by})`, true); };

export const start = () => { const run = () => { for (const c of communities.all()) { try { cycle(c); } catch (e) { console.log('civ:', e.message); } } };
  setTimeout(run, 20000); setInterval(run, 60000); };   // every minute: an in-game day is only 24
