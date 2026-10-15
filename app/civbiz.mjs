// Businesses, the biggest part of the civilian side. Every business gets shifts (staff clock in while they play and are paid by
// the hour) and a storefront (a menu customers buy from while someone is working), listed in the Shops directory. With Premium
// (the owner's own, or the server's) it also gets managers, commission, bonuses, a business loan, its own colour and tagline,
// more locations and businesses, selling while closed, ads in the directory, customer reviews and insights.
// The money moves through app/civ.mjs.
import { db, now, users, communities } from './db.mjs';
import * as premium from './premium.mjs';
import { T, money, DAY, WEEK, conf, ensure, move, bizMove, biz, note, who, hooks, staffSet } from './civ.mjs';

db.exec(`CREATE TABLE IF NOT EXISTS civ_shifts (id INTEGER PRIMARY KEY, biz_id INTEGER NOT NULL REFERENCES civ_biz(id) ON DELETE CASCADE, user_id INTEGER NOT NULL,
  start INTEGER NOT NULL, end INTEGER, pay INTEGER NOT NULL DEFAULT 0);
CREATE INDEX IF NOT EXISTS civ_shifts_b ON civ_shifts (biz_id, end);
CREATE INDEX IF NOT EXISTS civ_shifts_u ON civ_shifts (user_id, end);
CREATE TABLE IF NOT EXISTS civ_items (id INTEGER PRIMARY KEY, biz_id INTEGER NOT NULL REFERENCES civ_biz(id) ON DELETE CASCADE, name TEXT NOT NULL,
  about TEXT NOT NULL DEFAULT '', price INTEGER NOT NULL, kind TEXT NOT NULL DEFAULT 'Product', live INTEGER NOT NULL DEFAULT 1, created INTEGER NOT NULL);
CREATE TABLE IF NOT EXISTS civ_sales (id INTEGER PRIMARY KEY, biz_id INTEGER NOT NULL REFERENCES civ_biz(id) ON DELETE CASCADE, user_id INTEGER NOT NULL,
  item TEXT NOT NULL, qty INTEGER NOT NULL, amount INTEGER NOT NULL, at INTEGER NOT NULL);
CREATE INDEX IF NOT EXISTS civ_sales_b ON civ_sales (biz_id, at);
CREATE TABLE IF NOT EXISTS civ_reviews (biz_id INTEGER NOT NULL REFERENCES civ_biz(id) ON DELETE CASCADE, user_id INTEGER NOT NULL, stars INTEGER NOT NULL,
  text TEXT NOT NULL DEFAULT '', at INTEGER NOT NULL, PRIMARY KEY (biz_id, user_id));`);
for (const [t, col] of [['civ_staff', 'hourly INTEGER NOT NULL DEFAULT 0'], ['civ_staff', 'manager INTEGER NOT NULL DEFAULT 0'], ['civ_staff', 'commission INTEGER NOT NULL DEFAULT 0'],
  ['civ_biz', 'online INTEGER NOT NULL DEFAULT 0'], ['civ_biz', "color TEXT NOT NULL DEFAULT ''"], ['civ_biz', "tagline TEXT NOT NULL DEFAULT ''"], ['civ_biz', "places TEXT NOT NULL DEFAULT '[]'"],
  ['civ_biz', "ad TEXT NOT NULL DEFAULT ''"], ['civ_biz', 'ad_until INTEGER NOT NULL DEFAULT 0'], ['civ_biz', 'loan_left INTEGER NOT NULL DEFAULT 0'], ['civ_biz', 'loan_weekly INTEGER NOT NULL DEFAULT 0'],
  ['civ_biz', 'loan_next INTEGER NOT NULL DEFAULT 0']]) { try { db.exec(`ALTER TABLE ${t} ADD COLUMN ${col}`); } catch (e) {} }
const q = sql => db.prepare(sql);

export const LIMITS = { items: 6, itemsPrem: 30, biz: 2, bizPrem: 5, places: 5, maxShiftH: 12, adDay: 250, loanWeeks: 10 };
export const COLORS = ['#E8B33A', '#E05A47', '#E58A3C', '#4CB782', '#3FA7C9', '#5B7CF0', '#9A6CE0', '#D35C9A'];
const PREM_ERR = { error: 'That comes with Premium: the owner’s own, or the server’s.' };

// Premium for a business: the server has it, or the person who owns the business does
const personal = uid => (users.premiumUntil(uid) || 0) > Date.now();
export const premOf = (c, z) => !!z && (premium.isPremium(c) || personal(z.owner_id));
const staffRow = (zid, uid) => q('SELECT * FROM civ_staff WHERE biz_id = ? AND user_id = ?').get(zid, uid);
const isManager = (c, user, z) => !!z && !!staffRow(z.id, user.id)?.manager && premOf(c, z);
const runs = (c, user, id) => { const z = biz(c.id, id); return z && (z.owner_id === user.id || isManager(c, user, z)) ? z : null; };
const owns = (c, user, id) => { const z = biz(c.id, id); return z && z.owner_id === user.id ? z : null; };
const inactive = z => z.status === 'Active' ? null : { error: z.status === 'Held' ? 'Server staff have put the business on hold.' : 'The business is suspended until its license is paid.' };
const openShifts = zid => q('SELECT * FROM civ_shifts WHERE biz_id = ? AND end IS NULL').all(zid);
const myShift = (cid, uid) => q('SELECT s.*, b.name FROM civ_shifts s JOIN civ_biz b ON b.id = s.biz_id WHERE b.community_id = ? AND s.user_id = ? AND s.end IS NULL').get(cid, uid);
const places = z => { try { const p = JSON.parse(z.places || '[]'); return Array.isArray(p) ? p.slice(0, LIMITS.places) : []; } catch (e) { return []; } };

hooks.manager = isManager;
hooks.managed = (c, user) => q('SELECT s.biz_id FROM civ_staff s JOIN civ_biz b ON b.id = s.biz_id WHERE b.community_id = ? AND s.user_id = ? AND s.manager = 1').all(c.id, user.id)
  .map(r => r.biz_id).filter(id => premOf(c, biz(c.id, id)));
hooks.maxBiz = (c, user) => premium.isPremium(c) || personal(user.id) ? LIMITS.bizPrem : LIMITS.biz;
// a staff member's cut of a bill they sent, paid from the business when the customer pays (Premium)
hooks.commission = (cid, z, uid, amount) => { const w = uid && staffRow(z.id, uid), c = communities.byId(cid); if (!w || !w.commission || !premOf(c, z)) return;
  const cut = Math.round(amount * w.commission / 100), bal = biz(cid, z.id).balance; if (cut <= 0 || bal < cut) return;
  bizMove(z.id, -cut, `Commission, ${who(uid)}`); ensure(c, uid); move(cid, uid, cut, 'wage', `Commission from ${z.name}`); };

// ── shifts: clock in while you're playing on the civilian team; clocking out pays the hours at your hourly rate from the business ──
const endShift = (c, s, why = '') => { const t = now(), end = Math.min(t, s.start + LIMITS.maxShiftH * 3600e3), z = biz(c.id, s.biz_id), w = z && staffRow(z.id, s.user_id);
  let pay = Math.round((end - s.start) / 3600e3 * (w?.hourly || 0)), paid = 0;
  if (z && pay > 0) { paid = Math.min(pay, Math.max(0, z.balance)); if (paid > 0) { bizMove(z.id, -paid, `Shift pay, ${who(s.user_id)}`); ensure(c, s.user_id); move(c.id, s.user_id, paid, 'wage', `Shift at ${z.name}`); }
    if (paid < pay) { note(c.id, s.user_id, `${z.name} could only pay ${money(paid)} of the ${money(pay)} you earned on shift.`); note(c.id, z.owner_id, `${z.name} was ${money(pay - paid)} short paying ${who(s.user_id)} for a shift.`); } }
  q('UPDATE civ_shifts SET end = ?, pay = ? WHERE id = ?').run(end, paid, s.id); if (why) note(c.id, s.user_id, why);
  return { ok: true, paid, hours: Math.round((end - s.start) / 360e3) / 10 }; };
// side: the team they're on in game right now ('civ', a department, null when not in the server, undefined when unknown)
export const clock = (c, user, j, side) => { const cur = myShift(c.id, user.id);
  if (j.out) { if (!cur) return { error: 'You are not on shift.' }; return endShift(c, cur); }
  const z = biz(c.id, j.id); if (!z || (z.owner_id !== user.id && !staffRow(z.id, user.id))) return { error: 'You do not work there.' };
  const no = inactive(z); if (no) return no; if (cur) return { error: `You are already on shift at ${cur.name}. Clock out there first.` };
  if (side === null) return { error: 'Join the server in game first. You can only be on shift while you’re playing.' };
  if (side && side !== 'civ') return { error: 'Switch to the civilian team in game to go on shift.' };
  q('INSERT INTO civ_shifts (biz_id, user_id, start) VALUES (?, ?, ?)').run(z.id, user.id, now()); return { ok: true }; };
// every couple of minutes: end shifts that ran too long, or whose worker left the server or the civilian team (two misses in a row,
// so one dropped snapshot never clocks anyone out); then take the weekly loan payments
const missed = new Map();
export const sweep = (c, sideOf) => { const t = now();
  for (const s of q('SELECT s.* FROM civ_shifts s JOIN civ_biz b ON b.id = s.biz_id WHERE b.community_id = ? AND s.end IS NULL').all(c.id)) {
    if (t - s.start > LIMITS.maxShiftH * 3600e3) { endShift(c, s, `Clocked out: shifts end after ${LIMITS.maxShiftH} hours.`); continue; }
    const side = sideOf(s.user_id); if (side === undefined || side === 'civ') { missed.delete(s.id); continue; }
    const n = (missed.get(s.id) || 0) + 1; missed.set(s.id, n); if (n < 2) continue;
    missed.delete(s.id); endShift(c, s, side ? 'Clocked out: you joined a department team.' : 'Clocked out: you left the server.'); }
  const cf = conf(c);
  for (const z of q('SELECT * FROM civ_biz WHERE community_id = ? AND loan_left > 0 AND loan_next <= ?').all(c.id, t)) { const pay = Math.min(z.loan_weekly, z.loan_left);
    if (z.balance >= pay) { bizMove(z.id, -pay, 'Loan payment'); q('UPDATE civ_biz SET loan_left = loan_left - ?, loan_next = loan_next + ? WHERE id = ?').run(pay, WEEK, z.id);
      if (z.loan_left - pay <= 0) note(c.id, z.owner_id, `${z.name}'s loan is paid off.`); }
    else { const fee = Math.round(pay * (cf.late || 0) / 100); q('UPDATE civ_biz SET loan_left = loan_left + ?, loan_next = loan_next + ? WHERE id = ?').run(fee, WEEK, z.id);
      note(c.id, z.owner_id, `${z.name} missed a loan payment of ${money(pay)}.${fee ? ` A ${money(fee)} late fee was added.` : ''}`); } } };

// ── the storefront: what a business sells, bought from the Shops directory ──
export const saveItem = (c, user, j) => { const z = runs(c, user, j.id); if (!z) return { error: 'That is not your business.' };
  if (j.drop) { q('DELETE FROM civ_items WHERE id = ? AND biz_id = ?').run(+j.item || 0, z.id); return { ok: true }; }
  const v = { name: T(j.name, 40), about: T(j.about, 100), price: Math.round(+j.price), kind: j.kind === 'Service' ? 'Service' : 'Product', live: j.live === false ? 0 : 1 };
  if (!v.name) return { error: 'Name it.' }; if (!Number.isFinite(v.price) || v.price < 1 || v.price > 1e6) return { error: 'Set a price from $1 to $1,000,000.' };
  if (q('SELECT 1 FROM civ_items WHERE biz_id = ? AND lower(name) = lower(?) AND id <> ?').get(z.id, v.name, +j.item || 0)) return { error: `${v.name} is already on the menu.` };
  if (+j.item) { const r = q('UPDATE civ_items SET name = ?, about = ?, price = ?, kind = ?, live = ? WHERE id = ? AND biz_id = ?').run(v.name, v.about, v.price, v.kind, v.live, +j.item, z.id); return r.changes ? { ok: true } : { error: 'That item is gone.' }; }
  const n = q('SELECT count(*) AS n FROM civ_items WHERE biz_id = ?').get(z.id).n, max = premOf(c, z) ? LIMITS.itemsPrem : LIMITS.items;
  if (n >= max) return { error: `The menu holds ${max} items.${max < LIMITS.itemsPrem ? ` Premium raises it to ${LIMITS.itemsPrem}.` : ''}` };
  q('INSERT INTO civ_items (biz_id, name, about, price, kind, live, created) VALUES (?, ?, ?, ?, ?, ?, ?)').run(z.id, v.name, v.about, v.price, v.kind, v.live, now()); return { ok: true }; };
export const buy = (c, user, j) => { const z = biz(c.id, j.id); if (!z) return { error: 'That business is gone.' }; const no = inactive(z); if (no) return no;
  if (z.owner_id === user.id) return { error: 'You can’t buy from your own business.' };
  const it = q('SELECT * FROM civ_items WHERE id = ? AND biz_id = ? AND live = 1').get(+j.item || 0, z.id); if (!it) return { error: 'That isn’t on the menu any more.' };
  const qty = Math.max(1, Math.min(20, Math.round(+j.qty || 1))), total = it.price * qty;
  if (!openShifts(z.id).length && !(z.online && premOf(c, z))) return { error: `${z.name} is closed. Come back when someone is working.` };
  ensure(c, user.id); const label = `${it.name}${qty > 1 ? ' ×' + qty : ''}`, m = move(c.id, user.id, -total, 'business', `${label} at ${z.name}`); if (m.error) return m;
  bizMove(z.id, total, `Sale: ${label}`); q('INSERT INTO civ_sales (biz_id, user_id, item, qty, amount, at) VALUES (?, ?, ?, ?, ?, ?)').run(z.id, user.id, it.name, qty, total, now());
  return { ok: true }; };

// ── Premium: staff roles, commission and bonuses ──
// title, weekly wage and hourly pay are free; making someone a manager (owner only) and commission are Premium
export const staffx = (c, user, j) => { const z = runs(c, user, j.id); if (!z) return { error: 'That is not your business.' };
  const w = staffRow(z.id, +j.user || 0); if (!w) return { error: 'They do not work there.' };
  const prem = premOf(c, z), mgr = !!j.manager, com = Math.max(0, Math.min(50, Math.round(+j.commission || 0)));
  if (!j.fire && (mgr !== !!w.manager || com !== (w.commission || 0)) && !prem) return PREM_ERR;
  if (!j.fire && mgr !== !!w.manager && z.owner_id !== user.id) return { error: 'Only the owner can make or remove a manager.' };
  const r = staffSet(c, user, j); if (r.error || j.fire) return r;
  q('UPDATE civ_staff SET hourly = ?, manager = ?, commission = ? WHERE biz_id = ? AND user_id = ?').run(Math.max(0, Math.min(1e5, Math.round(+j.hourly || 0))), prem && mgr ? 1 : 0, prem ? com : 0, z.id, w.user_id);
  if (mgr && !w.manager) note(c.id, w.user_id, `You’re now a manager at ${z.name}.`); return { ok: true }; };
export const bonus = (c, user, j) => { const z = runs(c, user, j.id); if (!z) return { error: 'That is not your business.' }; if (!premOf(c, z)) return PREM_ERR;
  const w = staffRow(z.id, +j.user || 0); if (!w) return { error: 'They do not work there.' }; const a = Math.round(+j.amount);
  if (!Number.isFinite(a) || a < 1 || a > 1e6) return { error: 'Enter an amount.' }; if (z.balance < a) return { error: `The business only has ${money(z.balance)}.` };
  bizMove(z.id, -a, `Bonus, ${who(w.user_id)}`); ensure(c, w.user_id); move(c.id, w.user_id, a, 'wage', `Bonus from ${z.name}${j.memo ? ': ' + T(j.memo, 60) : ''}`); return { ok: true }; };

// ── Premium: a business loan, repaid weekly from the business account over LIMITS.loanWeeks weeks at the server's interest rate ──
const revenue = (zid, since) => q('SELECT coalesce(sum(amount), 0) AS n FROM civ_btx WHERE biz_id = ? AND at >= ? AND (memo LIKE \'Sale: %\' OR memo LIKE \'Paid: %\')').get(zid, since).n;
const loanCap = z => Math.min(250000, 25000 + 2 * revenue(z.id, now() - 30 * DAY));
export const loan = (c, user, j) => { const z = owns(c, user, j.id); if (!z) return { error: 'Only the owner can borrow.' }; if (!premOf(c, z)) return PREM_ERR;
  if (j.repay) { if (!z.loan_left) return { error: 'There is no loan to pay off.' }; if (z.balance < z.loan_left) return { error: `Paying it off takes ${money(z.loan_left)}. The business has ${money(z.balance)}.` };
    bizMove(z.id, -z.loan_left, 'Loan paid off'); q('UPDATE civ_biz SET loan_left = 0, loan_weekly = 0 WHERE id = ?').run(z.id); return { ok: true }; }
  const no = inactive(z); if (no) return no; if (z.loan_left) return { error: 'Pay off the loan you have first.' };
  const a = Math.round(+j.amount), cap = loanCap(z); if (!Number.isFinite(a) || a < 1000) return { error: 'Borrow at least $1,000.' }; if (a > cap) return { error: `The bank lends this business up to ${money(cap)}.` };
  const total = Math.round(a * (1 + (conf(c).rate || 0) / 100)), weekly = Math.ceil(total / LIMITS.loanWeeks);
  bizMove(z.id, a, 'Business loan'); q('UPDATE civ_biz SET loan_left = ?, loan_weekly = ?, loan_next = ? WHERE id = ?').run(total, weekly, now() + WEEK, z.id); return { ok: true }; };

// ── Premium: look and reach ──
export const brand = (c, user, j) => { const z = runs(c, user, j.id); if (!z) return { error: 'That is not your business.' }; if (!premOf(c, z)) return PREM_ERR;
  const P = (Array.isArray(j.places) ? j.places : []).map(p => T(p, 60)).filter(Boolean).slice(0, LIMITS.places);
  q('UPDATE civ_biz SET color = ?, tagline = ?, places = ?, online = ? WHERE id = ?').run(COLORS.includes(j.color) ? j.color : '', T(j.tagline, 60), JSON.stringify(P), j.online ? 1 : 0, z.id); return { ok: true }; };
export const advertise = (c, user, j) => { const z = runs(c, user, j.id); if (!z) return { error: 'That is not your business.' }; if (!premOf(c, z)) return PREM_ERR;
  if (j.stop) { q("UPDATE civ_biz SET ad = '', ad_until = 0 WHERE id = ?").run(z.id); return { ok: true }; }
  const no = inactive(z); if (no) return no; const text = T(j.text, 90), days = Math.max(1, Math.min(7, Math.round(+j.days || 1))), cost = days * LIMITS.adDay;
  if (!text) return { error: 'Write the ad.' }; if (z.balance < cost) return { error: `${days} day${days > 1 ? 's' : ''} costs ${money(cost)}. The business has ${money(z.balance)}.` };
  bizMove(z.id, -cost, `Ad for ${days} day${days > 1 ? 's' : ''}`); q('UPDATE civ_biz SET ad = ?, ad_until = ? WHERE id = ?').run(text, Math.max(now(), z.ad_until) + days * DAY, z.id); return { ok: true }; };
// a customer who bought there in the last 30 days can leave one review (Premium businesses collect them)
const bought = (zid, uid) => !!q('SELECT 1 FROM civ_sales WHERE biz_id = ? AND user_id = ? AND at >= ?').get(zid, uid, now() - 30 * DAY)
  || !!q("SELECT 1 FROM civ_bills WHERE user_id = ? AND kind = 'inv' AND status = 'Paid' AND ref LIKE ? AND paid_at >= ?").get(uid, `inv:${zid}:%`, now() - 30 * DAY);
export const review = (c, user, j) => { const z = biz(c.id, j.id); if (!z) return { error: 'That business is gone.' }; if (!premOf(c, z)) return { error: 'This business doesn’t take reviews.' };
  if (j.drop) { q('DELETE FROM civ_reviews WHERE biz_id = ? AND user_id = ?').run(z.id, user.id); return { ok: true }; }
  if (z.owner_id === user.id || staffRow(z.id, user.id)) return { error: 'You can’t review a business you work for.' };
  if (!bought(z.id, user.id)) return { error: 'Buy something there first. Reviews are from customers of the last 30 days.' };
  const stars = Math.round(+j.stars); if (!(stars >= 1 && stars <= 5)) return { error: 'Pick 1 to 5 stars.' };
  q('INSERT OR REPLACE INTO civ_reviews (biz_id, user_id, stars, text, at) VALUES (?, ?, ?, ?, ?)').run(z.id, user.id, stars, T(j.text, 200), now()); return { ok: true }; };

// ── what the Civilian tab shows ──
const itemRow = i => ({ id: i.id, name: i.name, about: i.about, price: i.price, kind: i.kind, live: !!i.live });
const reviewsOf = (zid, n) => q('SELECT * FROM civ_reviews WHERE biz_id = ? ORDER BY at DESC LIMIT ?').all(zid, n).map(r => ({ who: who(r.user_id), stars: r.stars, text: r.text, at: r.at }));
export const state = (c, user) => { const t = now(), sp = premium.isPremium(c), me = personal(user.id);
  const shops = q("SELECT * FROM civ_biz WHERE community_id = ? AND status = 'Active' ORDER BY name").all(c.id).map(z => { const prem = premOf(c, z), on = openShifts(z.id).length, works = z.owner_id === user.id || !!staffRow(z.id, user.id);
    const rt = prem ? q('SELECT count(*) AS n, avg(stars) AS a FROM civ_reviews WHERE biz_id = ?').get(z.id) : null;
    return { id: z.id, name: z.name, kind: z.kind, address: z.address, about: z.about, owner: who(z.owner_id), open: on > 0, onShift: on, online: !!(prem && z.online), prem,
      color: prem ? z.color : '', tagline: prem ? z.tagline : '', places: prem ? places(z) : [], ad: prem && z.ad_until > t ? z.ad : '',
      items: q('SELECT * FROM civ_items WHERE biz_id = ? AND live = 1 ORDER BY kind, price').all(z.id).map(itemRow), works,
      rating: rt && rt.n ? { n: rt.n, avg: Math.round(rt.a * 10) / 10 } : null, reviews: prem ? reviewsOf(z.id, 3) : [],
      canReview: prem && !works && bought(z.id, user.id), mine: prem ? (q('SELECT stars, text FROM civ_reviews WHERE biz_id = ? AND user_id = ?').get(z.id, user.id) || null) : null }; });
  const s = myShift(c.id, user.id), shift = s && { biz: s.biz_id, name: s.name, start: s.start, hourly: staffRow(s.biz_id, user.id)?.hourly || 0 };
  // more for each business they run (own or manage)
  const ids = [...q('SELECT id FROM civ_biz WHERE community_id = ? AND owner_id = ?').all(c.id, user.id).map(r => r.id), ...hooks.managed(c, user)], bizx = {};
  for (const id of ids) { const z = biz(c.id, id), prem = premOf(c, z), names = openShifts(id).map(x => ({ user: x.user_id, who: who(x.user_id), start: x.start }));
    const sales = q('SELECT * FROM civ_sales WHERE biz_id = ? ORDER BY at DESC LIMIT 10').all(id).map(x => ({ who: who(x.user_id), item: x.item, qty: x.qty, amount: x.amount, at: x.at }));
    const top = prem ? q('SELECT item, sum(qty) AS n, sum(amount) AS a FROM civ_sales WHERE biz_id = ? AND at >= ? GROUP BY item ORDER BY a DESC LIMIT 3').all(id, t - 30 * DAY) : [];
    const paid = since => q('SELECT coalesce(sum(-amount), 0) AS n FROM civ_btx WHERE biz_id = ? AND at >= ? AND amount < 0 AND (memo LIKE \'Shift pay, %\' OR memo = \'Wages\' OR memo LIKE \'Bonus, %\' OR memo LIKE \'Commission, %\')').get(id, since).n;
    bizx[id] = { prem, items: q('SELECT * FROM civ_items WHERE biz_id = ? ORDER BY kind, price').all(id).map(itemRow), onShift: names, sales,
      insights: prem ? { week: revenue(id, t - 7 * DAY), month: revenue(id, t - 30 * DAY), staffWeek: paid(t - 7 * DAY), salesWeek: q('SELECT count(*) AS n FROM civ_sales WHERE biz_id = ? AND at >= ?').get(id, t - 7 * DAY).n, top } : null,
      loan: { left: z.loan_left, weekly: z.loan_weekly, next: z.loan_next, cap: prem ? loanCap(z) : 0 }, color: z.color, tagline: z.tagline, places: places(z), online: !!z.online,
      ad: z.ad_until > t ? { text: z.ad, until: z.ad_until } : null, reviews: prem ? reviewsOf(id, 10) : [] }; }
  const workx = {}; for (const w of q('SELECT s.* FROM civ_staff s JOIN civ_biz b ON b.id = s.biz_id WHERE b.community_id = ? AND s.user_id = ?').all(c.id, user.id))
    workx[w.biz_id] = { hourly: w.hourly || 0, manager: !!w.manager, commission: w.commission || 0 };
  return { shops, shift, bizx, workx, prem: { server: sp, me }, limits: LIMITS, colors: COLORS }; };
