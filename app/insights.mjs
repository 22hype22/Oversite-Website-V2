// Settings → Insights: what's happening on a server over the last 7 or 30 days, from what Oversite already records:
// players online (server_stats), time on duty and calls answered per department (career's shifts and call_resp), police
// records, fire and DOT reports, the civilian economy, and moderation. Everything is counted per server; nothing new is tracked.
import { db, now } from './db.mjs';

const q = sql => db.prepare(sql);
const DAY = 864e5, HOUR = 3600e3;
const has = t => !!q("SELECT 1 FROM sqlite_master WHERE type = 'table' AND name = ?").get(t);
const DEPT_OF_KIND = { pd: 'pd', fd: 'fd', dot: 'dot' };

export const view = (c, days) => { days = days === 30 ? 30 : 7; const t = now(), from = t - days * DAY, cid = c.id, D = c.settings.depts || {};
  // players online: the average each hour, and the average for each weekday and hour (for the busiest-times grid)
  const S = q('SELECT at, players FROM server_stats WHERE community_id = ? AND at > ? AND players IS NOT NULL ORDER BY at').all(cid, from);
  const hourly = new Map(), grid = Array.from({ length: 7 }, () => Array.from({ length: 24 }, () => [0, 0]));
  for (const s of S) { const h = Math.floor(s.at / HOUR) * HOUR, a = hourly.get(h) || [0, 0]; a[0] += s.players; a[1]++; hourly.set(h, a);
    const d = new Date(s.at), g = grid[d.getUTCDay()][d.getUTCHours()]; g[0] += s.players; g[1]++; }
  const online = [...hourly].map(([at, [sum, n]]) => [at, Math.round(sum / n * 10) / 10]);
  const busiest = grid.map(row => row.map(([sum, n]) => n ? Math.round(sum / n * 10) / 10 : null));
  const peak = S.reduce((m, s) => s.players > m.players ? s : m, { players: 0, at: 0 });

  // departments: hours on duty from in-game team time, the people with the most, calls each answered, fire and DOT reports
  const shifts = has('shifts') ? q('SELECT name, dept, start, end FROM shifts WHERE community_id = ? AND end > ? AND dept IN (\'pd\', \'fd\', \'dot\')').all(cid, from) : [];
  const dur = s => Math.max(0, Math.min(s.end, t) - Math.max(s.start, from));
  const depts = ['pd', 'fd', 'dot'].map(d => { const L = shifts.filter(s => s.dept === d), by = new Map(); for (const s of L) by.set(s.name || 'Unknown', (by.get(s.name || 'Unknown') || 0) + dur(s));
    return { key: d, name: D[d]?.name || { pd: 'Law Enforcement', fd: 'Fire Department', dot: 'Transportation' }[d], hours: Math.round(L.reduce((n, s) => n + dur(s), 0) / HOUR * 10) / 10, people: by.size,
      top: [...by].sort((a, b) => b[1] - a[1]).slice(0, 5).map(([name, ms]) => ({ name, hours: Math.round(ms / HOUR * 10) / 10 })) }; });
  const answered = has('call_resp') ? q('SELECT team, COUNT(*) n FROM call_resp WHERE community_id = ? AND at > ? GROUP BY team').all(cid, from) : [];
  const teamDept = c.settings.teams || {}; for (const d of depts) d.calls = answered.filter(a => teamDept[a.team] === d.key).reduce((n, a) => n + a.n, 0);
  const reports = has('dept_reports') ? Object.fromEntries(q('SELECT dept, COUNT(*) n FROM dept_reports WHERE community_id = ? AND created > ? GROUP BY dept').all(cid, from).map(r => [r.dept, r.n])) : {};
  for (const d of depts) d.reports = reports[d.key] || 0;

  // police records by kind, and who wrote the most
  const R = has('pd_records') ? q('SELECT kind, by_name FROM pd_records WHERE community_id = ? AND at > ?').all(cid, from) : [];
  const KINDS = [['citation', 'Citations'], ['warning', 'Warnings'], ['arrest', 'Arrests'], ['warrant', 'Warrants'], ['bolo', 'BOLOs'], ['stop', 'Traffic stops']];
  const records = KINDS.map(([k, label]) => ({ kind: k, label, n: R.filter(r => r.kind === k).length }));
  const writers = new Map(); for (const r of R) writers.set(r.by_name || 'Unknown', (writers.get(r.by_name || 'Unknown') || 0) + 1);

  // the civilian economy
  const econ = has('civ_accounts') ? (() => { const acc = q('SELECT COUNT(*) n, COALESCE(SUM(balance), 0) total FROM civ_accounts WHERE community_id = ?').get(cid);
    const tx = q("SELECT kind, COALESCE(SUM(amount), 0) a FROM civ_tx WHERE community_id = ? AND at > ? GROUP BY kind").all(cid, from), sumOf = k => tx.filter(x => x.kind === k).reduce((n, x) => n + x.a, 0);
    const bills = q("SELECT status, COUNT(*) n, COALESCE(SUM(amount), 0) a FROM civ_bills WHERE community_id = ? AND issued > ? GROUP BY status").all(cid, from);
    const bizTop = q('SELECT b.name, b.kind, COALESCE(SUM(s.amount), 0) a, COUNT(s.biz_id) n FROM civ_biz b LEFT JOIN civ_sales s ON s.biz_id = b.id AND s.at > ? WHERE b.community_id = ? GROUP BY b.id ORDER BY a DESC LIMIT 5').all(from, cid);
    const jobs = q("SELECT COUNT(*) n, COALESCE(SUM(j.pay), 0) a FROM civ_jobs j JOIN civ_biz b ON b.id = j.biz_id WHERE b.community_id = ? AND j.status = 'Done' AND j.ended > ?").get(cid, from);
    return { accounts: acc.n, money: acc.total, paid: sumOf('deposit'), wages: sumOf('wage'), billsPaid: bills.filter(b => b.status === 'Paid').reduce((n, b) => n + b.a, 0),
      overdue: bills.filter(b => b.status === 'Overdue').reduce((n, b) => n + b.n, 0), businesses: q('SELECT COUNT(*) n FROM civ_biz WHERE community_id = ?').get(cid).n, bizTop: bizTop.filter(b => b.a > 0), jobs: jobs.n, jobsPaid: jobs.a }; })() : null;

  // members and moderation
  const members = { total: q('SELECT COUNT(*) n FROM members WHERE community_id = ?').get(cid).n, joined: q('SELECT COUNT(*) n FROM members WHERE community_id = ? AND joined > ?').get(cid, from).n };
  const mods = q("SELECT by_name, kind, COUNT(*) n FROM staff_records WHERE community_id = ? AND created > ? GROUP BY by_name, kind").all(cid, from);
  const modBy = new Map(); for (const m of mods) { const x = modBy.get(m.by_name || 'Unknown') || { name: m.by_name || 'Unknown', total: 0, kinds: {} }; x.total += m.n; x.kinds[m.kind] = (x.kinds[m.kind] || 0) + m.n; modBy.set(x.name, x); }

  return { days, from, to: t, online, busiest, peak: peak.at ? peak : null, avg: S.length ? Math.round(S.reduce((n, s) => n + s.players, 0) / S.length * 10) / 10 : null,
    depts, records, writers: [...writers].sort((a, b) => b[1] - a[1]).slice(0, 5).map(([name, n]) => ({ name, n })), econ, members,
    mods: [...modBy.values()].sort((a, b) => b.total - a.total).slice(0, 6) }; };
