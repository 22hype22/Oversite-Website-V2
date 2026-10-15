// Businesses, the biggest part of the civilian side. Every business gets shifts (staff clock in while they play and are paid by
// the hour) and a storefront (a menu customers buy from while someone is working), listed in the Shops directory. With Premium
// (the owner's own, or the server's) it also gets managers, commission, bonuses, a business loan, its own colour and tagline,
// more locations and businesses, selling while closed, ads in the directory, customer reviews and insights.
// The money moves through app/civ.mjs.
import { db, now, users, communities } from './db.mjs';
import * as premium from './premium.mjs';
import { POSTALS } from './postals.mjs';
import { T, money, DAY, GDAY, GWEEK, conf, ensure, move, bizMove, biz, note, who, hooks, staffSet } from './civ.mjs';

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
db.exec(`CREATE TABLE IF NOT EXISTS civ_requests (id INTEGER PRIMARY KEY, biz_id INTEGER NOT NULL REFERENCES civ_biz(id) ON DELETE CASCADE, user_id INTEGER NOT NULL,
  item_id INTEGER, item TEXT NOT NULL, kind TEXT NOT NULL DEFAULT 'Service', price INTEGER NOT NULL DEFAULT 0, offer INTEGER NOT NULL DEFAULT 0, info TEXT NOT NULL DEFAULT '{}',
  status TEXT NOT NULL DEFAULT 'Pending', at INTEGER NOT NULL, staff_id INTEGER, amount INTEGER NOT NULL DEFAULT 0, decided INTEGER);
CREATE INDEX IF NOT EXISTS civ_requests_b ON civ_requests (biz_id, status);
CREATE TABLE IF NOT EXISTS civ_jobs (id INTEGER PRIMARY KEY, biz_id INTEGER NOT NULL REFERENCES civ_biz(id) ON DELETE CASCADE, user_id INTEGER NOT NULL, kind TEXT NOT NULL,
  item_id INTEGER, req_id INTEGER, label TEXT NOT NULL DEFAULT '', steps TEXT NOT NULL, step INTEGER NOT NULL DEFAULT 0, arrived INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'Active', started INTEGER NOT NULL, ended INTEGER, pay INTEGER NOT NULL DEFAULT 0);
CREATE INDEX IF NOT EXISTS civ_jobs_u ON civ_jobs (user_id, status);`);
for (const [t, col] of [['civ_items', "meta TEXT NOT NULL DEFAULT '{}'"], ['civ_biz', "office TEXT NOT NULL DEFAULT ''"], ['civ_staff', 'hourly INTEGER NOT NULL DEFAULT 0'], ['civ_staff', 'manager INTEGER NOT NULL DEFAULT 0'], ['civ_staff', 'commission INTEGER NOT NULL DEFAULT 0'],
  ['civ_biz', 'online INTEGER NOT NULL DEFAULT 0'], ['civ_biz', "color TEXT NOT NULL DEFAULT ''"], ['civ_biz', "tagline TEXT NOT NULL DEFAULT ''"], ['civ_biz', "places TEXT NOT NULL DEFAULT '[]'"],
  ['civ_biz', "ad TEXT NOT NULL DEFAULT ''"], ['civ_biz', 'ad_until INTEGER NOT NULL DEFAULT 0'], ['civ_biz', 'loan_left INTEGER NOT NULL DEFAULT 0'], ['civ_biz', 'loan_weekly INTEGER NOT NULL DEFAULT 0'],
  ['civ_biz', 'loan_next INTEGER NOT NULL DEFAULT 0']]) { try { db.exec(`ALTER TABLE ${t} ADD COLUMN ${col}`); } catch (e) {} }
const q = sql => db.prepare(sql);

export const LIMITS = { items: 6, itemsPrem: 30, biz: 2, bizPrem: 5, places: 5, maxShiftH: 12, adDay: 250, loanWeeks: 10 };
export const COLORS = ['#E8B33A', '#E05A47', '#E58A3C', '#4CB782', '#3FA7C9', '#5B7CF0', '#9A6CE0', '#D35C9A'];
// what each type of business offers and how customers use it: Products are bought on the spot while someone is on shift;
// Services and Listings are requests the staff answer (and bill) whenever they get to them. `ask` is what a request asks the customer.
export const KINDS = {
  Store: { menu: 'Products', kinds: ['Product', 'Service'], ex: ['Water bottle', 'Phone charger', 'Snack bar'] },
  Restaurant: { menu: 'Menu', kinds: ['Product', 'Service'], ex: ['Burger', 'Fries', 'Milkshake', 'Catering'] },
  Mechanic: { menu: 'Services', kinds: ['Service', 'Product'], ask: [['vehicle', 'Vehicle or plate'], ['where', 'Where is it?']], ex: ['Oil change', 'Tire replacement', 'Full repair'] },
  Towing: { menu: 'Services', kinds: ['Service'], ask: [['where', 'Pickup location'], ['vehicle', 'Vehicle or plate']], ex: ['Local tow', 'Impound release', 'Roadside help'] },
  Taxi: { menu: 'Fares', kinds: ['Service'], ask: [['from', 'Pickup'], ['to', 'Destination']], ex: ['City ride', 'Cross-county ride', 'Airport ride'] },
  Security: { menu: 'Services', kinds: ['Service'], ask: [['where', 'Location'], ['when', 'When, and for how long']], ex: ['Event security', 'Bodyguard', 'Patrol'] },
  'Law firm': { menu: 'Services', kinds: ['Service'], ask: [['about', 'What is the case about?']], ex: ['Consultation', 'Court representation', 'Contract review'] },
  Medical: { menu: 'Treatments', kinds: ['Service'], ask: [['about', 'What do you need?']], ex: ['Check-up', 'Stitches', 'Physical therapy'] },
  'Real estate': { menu: 'Listings', kinds: ['Listing', 'Service'], ask: [['about', 'Message to the agent']], ex: ['Appraisal', 'Property management'] },
  Bank: { menu: 'Services', kinds: ['Service'], ask: [['about', 'What do you need?']], ex: ['Savings account', 'Money transfer', 'Financial advice'] },
  News: { menu: 'Services', kinds: ['Service', 'Product'], ask: [['about', 'Your ad or story']], ex: ['Newspaper ad', 'Interview', 'Subscription'] },
  Other: { menu: 'Menu', kinds: ['Product', 'Service'], ask: [['about', 'Details']], ex: [] } };
const kindOf = z => KINDS[z.kind] || KINDS.Other;
const PTYPES = ['House', 'Apartment', 'Mansion', 'Condo', 'Trailer', 'Farm', 'Commercial', 'Land'];
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
    if (z.balance >= pay) { bizMove(z.id, -pay, 'Loan payment'); q('UPDATE civ_biz SET loan_left = loan_left - ?, loan_next = loan_next + ? WHERE id = ?').run(pay, GWEEK, z.id);
      if (z.loan_left - pay <= 0) note(c.id, z.owner_id, `${z.name}'s loan is paid off.`); }
    else { const fee = Math.round(pay * (cf.late || 0) / 100); q('UPDATE civ_biz SET loan_left = loan_left + ?, loan_next = loan_next + ? WHERE id = ?').run(fee, GWEEK, z.id);
      note(c.id, z.owner_id, `${z.name} missed a loan payment of ${money(pay)}.${fee ? ` A ${money(fee)} late fee was added.` : ''}`); } } };

// ── the storefront: what a business sells, bought from the Shops directory ──
export const saveItem = (c, user, j) => { const z = runs(c, user, j.id); if (!z) return { error: 'That is not your business.' };
  if (j.drop) { q('DELETE FROM civ_items WHERE id = ? AND biz_id = ?').run(+j.item || 0, z.id); return { ok: true }; }
  const K = kindOf(z), cur = +j.item ? q('SELECT * FROM civ_items WHERE id = ? AND biz_id = ?').get(+j.item, z.id) : null;
  const v = { name: T(j.name, 40), about: T(j.about, 100), price: Math.round(+j.price), kind: K.kinds.includes(j.kind) ? j.kind : K.kinds[0], live: j.live === false ? 0 : 1 };
  // a listing: for sale or rent, the property, and (set from the agent's spot in game) where it is
  let meta = {}; try { meta = JSON.parse(cur?.meta || '{}'); } catch (e) {}
  if (v.kind === 'Listing') meta = { ...meta, deal: j.deal === 'Rent' ? 'Rent' : 'Sale', ptype: PTYPES.includes(j.ptype) ? j.ptype : 'House', beds: Math.max(0, Math.min(20, Math.round(+j.beds || 0))), address: T(j.address, 60) };
  v.meta = JSON.stringify(meta);
  if (!v.name) return { error: 'Name it.' }; if (!Number.isFinite(v.price) || v.price < 1 || v.price > 1e6) return { error: 'Set a price from $1 to $1,000,000.' };
  if (q('SELECT 1 FROM civ_items WHERE biz_id = ? AND lower(name) = lower(?) AND id <> ?').get(z.id, v.name, +j.item || 0)) return { error: `${v.name} is already on the menu.` };
  if (+j.item) { const r = q('UPDATE civ_items SET name = ?, about = ?, price = ?, kind = ?, live = ?, meta = ? WHERE id = ? AND biz_id = ?').run(v.name, v.about, v.price, v.kind, v.live, v.meta, +j.item, z.id); return r.changes ? { ok: true } : { error: 'That item is gone.' }; }
  const n = q('SELECT count(*) AS n FROM civ_items WHERE biz_id = ?').get(z.id).n, max = premOf(c, z) ? LIMITS.itemsPrem : LIMITS.items;
  if (n >= max) return { error: `The menu holds ${max} items.${max < LIMITS.itemsPrem ? ` Premium raises it to ${LIMITS.itemsPrem}.` : ''}` };
  q('INSERT INTO civ_items (biz_id, name, about, price, kind, live, meta, created) VALUES (?, ?, ?, ?, ?, ?, ?, ?)').run(z.id, v.name, v.about, v.price, v.kind, v.live, v.meta, now()); return { ok: true }; };
export const buy = (c, user, j) => { const z = biz(c.id, j.id); if (!z) return { error: 'That business is gone.' }; const no = inactive(z); if (no) return no;
  if (z.owner_id === user.id) return { error: 'You can’t buy from your own business.' };
  const it = q('SELECT * FROM civ_items WHERE id = ? AND biz_id = ? AND live = 1').get(+j.item || 0, z.id); if (!it) return { error: 'That isn’t on the menu any more.' };
  if (it.kind !== 'Product') return { error: 'Send a request for that one instead.' };
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

// ── Premium: a business loan, repaid each in-game week from the business account over LIMITS.loanWeeks weeks at the server's interest rate ──
const revenue = (zid, since) => q('SELECT coalesce(sum(amount), 0) AS n FROM civ_btx WHERE biz_id = ? AND at >= ? AND (memo LIKE \'Sale: %\' OR memo LIKE \'Paid: %\')').get(zid, since).n;
const loanCap = z => Math.min(250000, 25000 + 2 * revenue(z.id, now() - 30 * DAY));
export const loan = (c, user, j) => { const z = owns(c, user, j.id); if (!z) return { error: 'Only the owner can borrow.' }; if (!premOf(c, z)) return PREM_ERR;
  if (j.repay) { if (!z.loan_left) return { error: 'There is no loan to pay off.' }; if (z.balance < z.loan_left) return { error: `Paying it off takes ${money(z.loan_left)}. The business has ${money(z.balance)}.` };
    bizMove(z.id, -z.loan_left, 'Loan paid off'); q('UPDATE civ_biz SET loan_left = 0, loan_weekly = 0 WHERE id = ?').run(z.id); return { ok: true }; }
  const no = inactive(z); if (no) return no; if (z.loan_left) return { error: 'Pay off the loan you have first.' };
  const a = Math.round(+j.amount), cap = loanCap(z); if (!Number.isFinite(a) || a < 1000) return { error: 'Borrow at least $1,000.' }; if (a > cap) return { error: `The bank lends this business up to ${money(cap)}.` };
  const total = Math.round(a * (1 + (conf(c).rate || 0) / 100)), weekly = Math.ceil(total / LIMITS.loanWeeks);
  bizMove(z.id, a, 'Business loan'); q('UPDATE civ_biz SET loan_left = ?, loan_weekly = ?, loan_next = ? WHERE id = ?').run(total, weekly, now() + GWEEK, z.id); return { ok: true }; };

// ── Premium: look and reach ──
export const brand = (c, user, j) => { const z = runs(c, user, j.id); if (!z) return { error: 'That is not your business.' }; if (!premOf(c, z)) return PREM_ERR;
  const P = (Array.isArray(j.places) ? j.places : []).map(p => T(p, 60)).filter(Boolean).slice(0, LIMITS.places);
  q('UPDATE civ_biz SET color = ?, tagline = ?, places = ?, online = ? WHERE id = ?').run(COLORS.includes(j.color) ? j.color : '', T(j.tagline, 60), JSON.stringify(P), j.online ? 1 : 0, z.id); return { ok: true }; };
export const advertise = (c, user, j) => { const z = runs(c, user, j.id); if (!z) return { error: 'That is not your business.' }; if (!premOf(c, z)) return PREM_ERR;
  if (j.stop) { q("UPDATE civ_biz SET ad = '', ad_until = 0 WHERE id = ?").run(z.id); return { ok: true }; }
  const no = inactive(z); if (no) return no; const text = T(j.text, 90), days = Math.max(1, Math.min(7, Math.round(+j.days || 1))), cost = days * LIMITS.adDay;
  if (!text) return { error: 'Write the ad.' }; if (z.balance < cost) return { error: `${days} day${days > 1 ? 's' : ''} costs ${money(cost)}. The business has ${money(z.balance)}.` };
  bizMove(z.id, -cost, `Ad for ${days} day${days > 1 ? 's' : ''}`); q('UPDATE civ_biz SET ad = ?, ad_until = ? WHERE id = ?').run(text, Math.max(now(), z.ad_until) + days * GDAY, z.id); return { ok: true }; };
// a customer who bought there in the last 30 days can leave one review (Premium businesses collect them)
const bought = (zid, uid) => !!q('SELECT 1 FROM civ_sales WHERE biz_id = ? AND user_id = ? AND at >= ?').get(zid, uid, now() - 30 * DAY)
  || !!q("SELECT 1 FROM civ_bills WHERE user_id = ? AND kind = 'inv' AND status = 'Paid' AND ref LIKE ? AND paid_at >= ?").get(uid, `inv:${zid}:%`, now() - 30 * DAY);
export const review = (c, user, j) => { const z = biz(c.id, j.id); if (!z) return { error: 'That business is gone.' }; if (!premOf(c, z)) return { error: 'This business doesn’t take reviews.' };
  if (j.drop) { q('DELETE FROM civ_reviews WHERE biz_id = ? AND user_id = ?').run(z.id, user.id); return { ok: true }; }
  if (z.owner_id === user.id || staffRow(z.id, user.id)) return { error: 'You can’t review a business you work for.' };
  if (!bought(z.id, user.id)) return { error: 'Buy something there first. Reviews are from customers of the last 30 days.' };
  const stars = Math.round(+j.stars); if (!(stars >= 1 && stars <= 5)) return { error: 'Pick 1 to 5 stars.' };
  q('INSERT OR REPLACE INTO civ_reviews (biz_id, user_id, stars, text, at) VALUES (?, ?, ?, ?, ?)').run(z.id, user.id, stars, T(j.text, 200), now()); return { ok: true }; };

// ── requests: a customer asks for a service or a listing (a viewing, or an offer); anyone working there answers it ──
const worksAt = (z, uid) => z.owner_id === uid || !!staffRow(z.id, uid);
const reqRow = r => { let info = {}; try { info = JSON.parse(r.info || '{}'); } catch (e) {} return { id: r.id, biz: r.biz_id, who: who(r.user_id), item: r.item, kind: r.kind, price: r.price, offer: r.offer, info, status: r.status, at: r.at, amount: r.amount, by: r.staff_id ? who(r.staff_id) : '' }; };
export const request = (c, user, j) => { const z = biz(c.id, j.id); if (!z) return { error: 'That business is gone.' }; const no = inactive(z); if (no) return no;
  if (worksAt(z, user.id)) return { error: 'You work there.' };
  const it = q('SELECT * FROM civ_items WHERE id = ? AND biz_id = ? AND live = 1').get(+j.item || 0, z.id); if (!it || it.kind === 'Product') return { error: 'That isn’t offered any more.' };
  if (q("SELECT count(*) AS n FROM civ_requests WHERE biz_id = ? AND user_id = ? AND status = 'Pending'").get(z.id, user.id).n >= 3) return { error: `You already have 3 requests waiting at ${z.name}.` };
  const info = {}; for (const [k] of kindOf(z).ask || []) { const v = T(j.info?.[k], 160); if (v) info[k] = v; }
  const offer = it.kind === 'Listing' && j.offer ? Math.round(+j.offer) : 0; if (offer && !(offer > 0 && offer <= 1e9)) return { error: 'Enter your offer.' };
  if (it.kind === 'Listing') info.type = offer ? 'Offer' : 'Viewing';
  q('INSERT INTO civ_requests (biz_id, user_id, item_id, item, kind, price, offer, info, at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)').run(z.id, user.id, it.id, it.name, it.kind, it.price, offer, JSON.stringify(info), now());
  note(c.id, z.owner_id, `New request at ${z.name}: ${info.type ? info.type.toLowerCase() + ' of ' : ''}${it.name}, from ${who(user.id)}.`); return { ok: true }; };
// accept: bill the customer the amount (0 for a free viewing), or decline; a customer can cancel while it waits
export const respond = (c, user, j) => { const r = q('SELECT * FROM civ_requests WHERE id = ?').get(+j.req || 0), z = r && biz(c.id, r.biz_id);
  if (!z || !worksAt(z, user.id)) return { error: 'That request is gone.' }; if (r.status !== 'Pending') return { error: 'That request is already answered.' };
  if (!j.accept) { q("UPDATE civ_requests SET status = 'Declined', staff_id = ?, decided = ? WHERE id = ?").run(user.id, now(), r.id); note(c.id, r.user_id, `${z.name} turned down your request for ${r.item}.`); return { ok: true }; }
  const no = inactive(z); if (no) return no; const amount = Math.max(0, Math.min(1e9, Math.round(+j.amount || 0)));
  if (amount) { const cf = conf(c), t = now(); ensure(c, r.user_id);
    q("INSERT OR IGNORE INTO civ_bills (community_id, user_id, kind, ref, label, amount, issued, due) VALUES (?, ?, 'inv', ?, ?, ?, ?, ?)").run(c.id, r.user_id, `inv:${z.id}:r${r.id}:${user.id}`, T(`${z.name}: ${r.item}`, 120), amount, t, t + cf.grace * GDAY); }
  q("UPDATE civ_requests SET status = 'Accepted', staff_id = ?, amount = ?, decided = ? WHERE id = ?").run(user.id, amount, now(), r.id);
  note(c.id, r.user_id, `${z.name} accepted your request for ${r.item}${amount ? `. A bill of ${money(amount)} is on your Bills` : ''}.`); return { ok: true }; };
export const cancelRequest = (c, user, j) => { const r = q("SELECT * FROM civ_requests WHERE id = ? AND user_id = ? AND status = 'Pending'").get(+j.req || 0, user.id);
  if (!r) return { error: 'That request is already answered.' }; q("UPDATE civ_requests SET status = 'Cancelled', decided = ? WHERE id = ?").run(now(), r.id); return { ok: true }; };

// ── places in game: an agent stands somewhere in ER:LC and saves that spot, for a listing or for the office ──
// pos comes from the latest ER:LC snapshot (server.mjs): { x, z, label } in map units, the same ones the boundaries use
const RADIUS = 45, LEAVE = 75, SHOW_WAIT = 120e3, JOB_MAX = 30 * 60e3;
const spotOf = v => { try { const p = typeof v === 'string' ? JSON.parse(v || 'null') : v; return p && Number.isFinite(p.x) && Number.isFinite(p.z) ? p : null; } catch (e) { return null; } };
export const setSpot = (c, user, j, pos) => { const z = runs(c, user, j.id) || (biz(c.id, j.id) && staffRow(j.id, user.id) && biz(c.id, j.id)); if (!z) return { error: 'You do not work there.' };
  if (!pos) return { error: 'Oversite can’t see you in game right now. Join the server, stand at the spot, and try again.' };
  const spot = JSON.stringify({ x: Math.round(pos.x), z: Math.round(pos.z), label: T(pos.label, 60) });
  if (j.office) { q('UPDATE civ_biz SET office = ? WHERE id = ?').run(spot, z.id); return { ok: true }; }
  const it = q("SELECT * FROM civ_items WHERE id = ? AND biz_id = ? AND kind = 'Listing'").get(+j.item || 0, z.id); if (!it) return { error: 'That listing is gone.' };
  q('UPDATE civ_items SET meta = ? WHERE id = ?').run(JSON.stringify({ ...metaOf(it), pos: JSON.parse(spot) }), it.id); return { ok: true }; };

// ── jobs, the in-game mini games: a list of stops to drive to in ER:LC, each with a wait, checked against where the player really is.
// Every type of business has its own. Destinations are random real postals ('rand'), the business itself ('base': where its office is
// set, or else where the job was started), or for real estate the listing being shown. Each finished job pays the worker, and the
// business earns half as much again. ──
const GAME = 5355 / 2000, SPOTS = Object.entries(POSTALS).map(([n, [x, z]]) => ({ x: Math.round(x * GAME), z: Math.round(z * GAME), label: 'Postal ' + n }));
export const GIGS = {
  Restaurant: { name: 'Delivery', how: 'Pick up the order at the restaurant, drive it to the customer and hand it over.', steps: [['base', 20, 'Pick up the order'], ['rand', 15, 'Hand over the order']] },
  Store: { name: 'Delivery', how: 'Load the order at the store, drive it to the customer and drop it off.', steps: [['base', 20, 'Load the order'], ['rand', 15, 'Drop it off']] },
  Taxi: { name: 'Fare', how: 'Pick up a passenger and drive them to their stop. Longer rides pay more.', steps: [['rand', 10, 'Pick up the passenger'], ['rand', 10, 'Drop them off']], far: true },
  Towing: { name: 'Tow job', how: 'Drive to a broken-down car, hook it up, and bring it back to the yard.', steps: [['rand', 45, 'Hook up the car'], ['base', 10, 'Drop it at the yard']] },
  Mechanic: { name: 'Roadside repair', how: 'Drive to a stranded driver and fix their car on the spot.', steps: [['rand', 60, 'Fix the car']] },
  Security: { name: 'Patrol', how: 'Check three spots around the county, staying a little at each.', steps: [['rand', 20, 'Check the area'], ['rand', 20, 'Check the area'], ['rand', 20, 'Check the area']] },
  Medical: { name: 'House call', how: 'Visit a patient at home, treat them, and head back.', steps: [['rand', 60, 'Treat the patient'], ['base', 0, 'Head back']] },
  'Law firm': { name: 'Serve papers', how: 'Drive out and serve legal papers, then report back.', steps: [['rand', 15, 'Serve the papers'], ['base', 0, 'Report back']] },
  Bank: { name: 'Cash run', how: 'Collect the cash bag, deliver it to a client, and come back.', steps: [['base', 20, 'Collect the cash'], ['rand', 20, 'Deliver it'], ['base', 0, 'Come back']] },
  News: { name: 'Story', how: 'Drive to where something is happening, get the story, and file it.', steps: [['rand', 45, 'Get the story'], ['base', 0, 'File it at the office']] },
  'Real estate': { name: 'Showing', how: 'Drive to the house, show it for two minutes, then drive back to the office.', listing: true },
  Other: { name: 'Errand', how: 'Run an errand across the county and come back.', steps: [['rand', 20, 'Do the errand'], ['base', 0, 'Come back']] } };
const gigOf = z => GIGS[z.kind] || GIGS.Other;
const pickSpot = (from, used) => { const ok = SPOTS.filter(p => !used.has(p.label) && Math.hypot(p.x - from.x, p.z - from.z) > 500 && Math.hypot(p.x - from.x, p.z - from.z) < 2600);
  const list = ok.length ? ok : SPOTS; return list[Math.floor(Math.random() * list.length)]; };
const myJob = (cid, uid) => q("SELECT j.* FROM civ_jobs j JOIN civ_biz b ON b.id = j.biz_id WHERE b.community_id = ? AND j.user_id = ? AND j.status = 'Active'").get(cid, uid);
// pos: where they are in game now (server.mjs reads it off the latest snapshot); needed to plan the route
export const startJob = (c, user, j, pos) => { const cur = myJob(c.id, user.id);
  if (j.stop) { if (!cur) return { error: 'You are not on a job.' }; q("UPDATE civ_jobs SET status = 'Stopped', ended = ? WHERE id = ?").run(now(), cur.id); return { ok: true }; }
  const z = biz(c.id, j.id); if (!z || !worksAt(z, user.id)) return { error: 'You do not work there.' };
  const no = inactive(z); if (no) return no; if (cur) return { error: 'Finish the job you’re on first.' };
  const sh = myShift(c.id, user.id); if (!sh || sh.biz_id !== z.id) return { error: `Clock in at ${z.name} first.` };
  if (!pos) return { error: 'Oversite can’t see you in game right now. Join the server on the civilian team and try again.' };
  const last = q("SELECT ended FROM civ_jobs WHERE user_id = ? AND status = 'Done' ORDER BY ended DESC LIMIT 1").get(user.id); if (last && now() - last.ended < 45e3) return { error: 'Take a breather: you can start another job in a few seconds.' };
  const G = gigOf(z), base = spotOf(z.office) || { x: Math.round(pos.x), z: Math.round(pos.z), label: pos.label || 'where you started' }; let steps, label = G.name, item = null;
  if (G.listing) { const it = q("SELECT * FROM civ_items WHERE id = ? AND biz_id = ? AND kind = 'Listing'").get(+j.item || 0, z.id); if (!it) return { error: 'Pick a listing to show.' };
    const m = metaOf(it), house = spotOf(m.pos); if (!house) return { error: 'Set where the house is first: stand at it in game and press Set location.' };
    if (Math.hypot(house.x - base.x, house.z - base.z) < 150) return { error: 'The house is right next to the office. Set the house where it really is, or set the office somewhere else.' };
    if (q("SELECT 1 FROM civ_jobs WHERE user_id = ? AND item_id = ? AND status = 'Done' AND ended > ?").get(user.id, it.id, now() - GDAY)) return { error: 'You already showed that one today (in game). Show another listing.' };
    steps = [{ ...house, wait: SHOW_WAIT, label: m.address || house.label || it.name, what: 'Show the house' }, { ...base, wait: 0, label: base.label || 'the office', what: 'Back to the office' }]; label = `Showing ${it.name}`; item = it.id; }
  else { const used = new Set(); let from = pos;
    steps = G.steps.map(([where, wait, what]) => { const p = where === 'base' ? base : pickSpot(from, used); used.add(p.label); from = p; return { x: p.x, z: p.z, label: p.label, wait: wait * 1000, what }; }); }
  const req = +j.req ? q('SELECT * FROM civ_requests WHERE id = ? AND biz_id = ?').get(+j.req, z.id) : null;
  q('INSERT INTO civ_jobs (biz_id, user_id, kind, item_id, req_id, label, steps, started) VALUES (?, ?, ?, ?, ?, ?, ?, ?)').run(z.id, user.id, G.name, item, req ? req.id : null, T(label, 60), JSON.stringify(steps), now());
  return { ok: true }; };
// what a job pays: the server's pay per job, more for long taxi rides; the business earns half of it on top
const jobPay = (c, z, steps) => { const base = conf(c).showpay || 0; if (!gigOf(z).far) return base; let d = 0; for (let i = 1; i < steps.length; i++) d += Math.hypot(steps[i].x - steps[i - 1].x, steps[i].z - steps[i - 1].z);
  return Math.round(base * (0.6 + Math.min(2, d / 2000))); };
const finishJob = (c, jb) => { const z = biz(c.id, jb.biz_id), pay = z ? jobPay(c, z, JSON.parse(jb.steps)) : 0;
  q("UPDATE civ_jobs SET status = 'Done', ended = ?, pay = ? WHERE id = ?").run(now(), pay, jb.id);
  if (pay) { ensure(c, jb.user_id); move(c.id, jb.user_id, pay, 'wage', `${jb.label} for ${z.name}`); bizMove(z.id, Math.round(pay / 2), `${jb.label} by ${who(jb.user_id)}`); }
  if (jb.req_id) { const r = q('SELECT * FROM civ_requests WHERE id = ?').get(jb.req_id); if (r) note(c.id, r.user_id, `${z?.name || 'The agency'} showed you ${r.item}.`); } };
// every snapshot: move each active job along by where its player is standing
export const observe = (c, body) => { const jobs = q("SELECT j.* FROM civ_jobs j JOIN civ_biz b ON b.id = j.biz_id WHERE b.community_id = ? AND j.status = 'Active'").all(c.id); if (!jobs.length) return;
  let snap; try { snap = JSON.parse(body); } catch (e) { return; } const t = now();
  const pos = new Map((snap.Players || []).map(p => [String(p.Player || '').split(':')[0].toLowerCase(), p.Location]));
  for (const jb of jobs) { if (t - jb.started > JOB_MAX) { q("UPDATE civ_jobs SET status = 'Failed', ended = ? WHERE id = ?").run(t, jb.id); note(c.id, jb.user_id, `${jb.label} ran out of time.`); continue; }
    const u = users.byId(jb.user_id), L = u && pos.get(String(u.roblox_name || '').toLowerCase()); if (!L || !Number.isFinite(+L.LocationX)) continue;
    const steps = JSON.parse(jb.steps), st = steps[jb.step]; if (!st) continue; const d = Math.hypot(+L.LocationX - st.x, +L.LocationZ - st.z);
    if (!jb.arrived) { if (d <= RADIUS) { if (st.wait) q('UPDATE civ_jobs SET arrived = ? WHERE id = ?').run(t, jb.id); else jb.arrived = t - 1; } }
    else if (d > LEAVE) { q('UPDATE civ_jobs SET arrived = 0 WHERE id = ?').run(jb.id); continue; }   // drove off too soon: the wait starts over
    const arrived = jb.arrived || +(q('SELECT arrived FROM civ_jobs WHERE id = ?').get(jb.id).arrived);
    if (arrived && t - arrived >= st.wait) { if (jb.step + 1 >= steps.length) finishJob(c, jb); else q('UPDATE civ_jobs SET step = step + 1, arrived = 0 WHERE id = ?').run(jb.id); } } };
const jobRow = jb => { if (!jb) return null; const steps = JSON.parse(jb.steps); return { id: jb.id, kind: jb.kind, label: jb.label, step: jb.step, steps: steps.map(x => ({ label: x.label, wait: x.wait, what: x.what, x: x.x, z: x.z })), arrived: jb.arrived, started: jb.started, max: JOB_MAX, r: RADIUS }; };
// the last few jobs someone finished, for the Work tab
const doneJobs = (cid, uid) => q("SELECT j.label, j.pay, j.ended, b.name FROM civ_jobs j JOIN civ_biz b ON b.id = j.biz_id WHERE b.community_id = ? AND j.user_id = ? AND j.status = 'Done' ORDER BY j.ended DESC LIMIT 5").all(cid, uid);

// ── what the Civilian tab shows ──
const metaOf = i => { try { return JSON.parse(i.meta || '{}'); } catch (e) { return {}; } };
const itemRow = i => ({ id: i.id, name: i.name, about: i.about, price: i.price, kind: i.kind, live: !!i.live, ...metaOf(i) });
const reviewsOf = (zid, n) => q('SELECT * FROM civ_reviews WHERE biz_id = ? ORDER BY at DESC LIMIT ?').all(zid, n).map(r => ({ who: who(r.user_id), stars: r.stars, text: r.text, at: r.at }));
export const state = (c, user) => { const t = now(), sp = premium.isPremium(c), me = personal(user.id);
  const shops = q("SELECT * FROM civ_biz WHERE community_id = ? AND status = 'Active' ORDER BY name").all(c.id).map(z => { const prem = premOf(c, z), on = openShifts(z.id).length, works = z.owner_id === user.id || !!staffRow(z.id, user.id);
    const rt = prem ? q('SELECT count(*) AS n, avg(stars) AS a FROM civ_reviews WHERE biz_id = ?').get(z.id) : null;
    return { id: z.id, name: z.name, kind: z.kind, address: z.address, about: z.about, owner: who(z.owner_id), open: on > 0, onShift: on, online: !!(prem && z.online), prem,
      color: prem ? z.color : '', tagline: prem ? z.tagline : '', places: prem ? places(z) : [], ad: prem && z.ad_until > t ? z.ad : '',
      items: q('SELECT * FROM civ_items WHERE biz_id = ? AND live = 1 ORDER BY kind, price').all(z.id).map(itemRow), works, menu: kindOf(z).menu, ask: kindOf(z).ask || [],
      rating: rt && rt.n ? { n: rt.n, avg: Math.round(rt.a * 10) / 10 } : null, reviews: prem ? reviewsOf(z.id, 3) : [],
      canReview: prem && !works && bought(z.id, user.id), mine: prem ? (q('SELECT stars, text FROM civ_reviews WHERE biz_id = ? AND user_id = ?').get(z.id, user.id) || null) : null }; });
  const s = myShift(c.id, user.id), shift = s && { biz: s.biz_id, name: s.name, start: s.start, hourly: staffRow(s.biz_id, user.id)?.hourly || 0 };
  // more for each business they run (own or manage)
  const ids = [...q('SELECT id FROM civ_biz WHERE community_id = ? AND owner_id = ?').all(c.id, user.id).map(r => r.id), ...hooks.managed(c, user)], bizx = {};
  for (const id of ids) { const z = biz(c.id, id), prem = premOf(c, z), names = openShifts(id).map(x => ({ user: x.user_id, who: who(x.user_id), start: x.start }));
    const sales = q('SELECT * FROM civ_sales WHERE biz_id = ? ORDER BY at DESC LIMIT 10').all(id).map(x => ({ who: who(x.user_id), item: x.item, qty: x.qty, amount: x.amount, at: x.at }));
    const top = prem ? q('SELECT item, sum(qty) AS n, sum(amount) AS a FROM civ_sales WHERE biz_id = ? AND at >= ? GROUP BY item ORDER BY a DESC LIMIT 3').all(id, t - 30 * DAY) : [];
    const paid = since => q('SELECT coalesce(sum(-amount), 0) AS n FROM civ_btx WHERE biz_id = ? AND at >= ? AND amount < 0 AND (memo LIKE \'Shift pay, %\' OR memo = \'Wages\' OR memo LIKE \'Bonus, %\' OR memo LIKE \'Commission, %\')').get(id, since).n;
    bizx[id] = { prem, items: q('SELECT * FROM civ_items WHERE biz_id = ? ORDER BY kind, price').all(id).map(itemRow), onShift: names, sales, office: spotOf(z.office),
      insights: prem ? { week: revenue(id, t - 7 * DAY), month: revenue(id, t - 30 * DAY), staffWeek: paid(t - 7 * DAY), salesWeek: q('SELECT count(*) AS n FROM civ_sales WHERE biz_id = ? AND at >= ?').get(id, t - 7 * DAY).n, top } : null,
      loan: { left: z.loan_left, weekly: z.loan_weekly, next: z.loan_next, cap: prem ? loanCap(z) : 0 }, color: z.color, tagline: z.tagline, places: places(z), online: !!z.online,
      ad: z.ad_until > t ? { text: z.ad, until: z.ad_until } : null, reviews: prem ? reviewsOf(id, 10) : [] }; }
  const workx = {}; for (const w of q('SELECT s.* FROM civ_staff s JOIN civ_biz b ON b.id = s.biz_id WHERE b.community_id = ? AND s.user_id = ?').all(c.id, user.id))
    workx[w.biz_id] = { hourly: w.hourly || 0, manager: !!w.manager, commission: w.commission || 0 };
  // requests: the ones they sent, and the queue at every business they work for
  const mine = q('SELECT r.*, b.name AS bname FROM civ_requests r JOIN civ_biz b ON b.id = r.biz_id WHERE b.community_id = ? AND r.user_id = ? ORDER BY r.at DESC LIMIT 10').all(c.id, user.id).map(r => ({ ...reqRow(r), bname: r.bname }));
  const queue = {}; for (const z of q('SELECT * FROM civ_biz WHERE community_id = ?').all(c.id).filter(z => worksAt(z, user.id))) {
    queue[z.id] = { name: z.name, kind: z.kind, office: spotOf(z.office), pending: q("SELECT * FROM civ_requests WHERE biz_id = ? AND status = 'Pending' ORDER BY at").all(z.id).map(reqRow),
      done: q("SELECT * FROM civ_requests WHERE biz_id = ? AND status <> 'Pending' ORDER BY decided DESC LIMIT 5").all(z.id).map(reqRow),
      listings: z.kind === 'Real estate' ? q("SELECT * FROM civ_items WHERE biz_id = ? AND kind = 'Listing' ORDER BY price").all(z.id).map(itemRow) : [] }; }
  return { shops, shift, bizx, workx, requests: mine, queue, job: jobRow(myJob(c.id, user.id)), done: doneJobs(c.id, user.id), gigs: GIGS, btypes: KINDS, ptypes: PTYPES, showpay: conf(c).showpay || 0, prem: { server: sp, me }, limits: LIMITS, colors: COLORS }; };
