// Fire and DOT incident reports, kept per server and shared by the whole department (they used to live in one browser).
// A report is the MDT form as it was filled in; the server hands out its number (FD-2026-0001), so two people writing at
// once never get the same one, and only its author or an admin can delete it.
import { db, now } from './db.mjs';

db.exec(`CREATE TABLE IF NOT EXISTS dept_reports (id INTEGER PRIMARY KEY, community_id INTEGER NOT NULL REFERENCES communities(id) ON DELETE CASCADE, dept TEXT NOT NULL,
  num TEXT NOT NULL, status TEXT NOT NULL, data TEXT NOT NULL, author_id INTEGER, author TEXT NOT NULL DEFAULT '', created INTEGER NOT NULL, updated INTEGER NOT NULL,
  UNIQUE (community_id, num));
CREATE INDEX IF NOT EXISTS dept_reports_by ON dept_reports (community_id, dept, updated);`);
const q = sql => db.prepare(sql);
const DEPTS = { fd: 'FD', dot: 'DOT' };
// the form's fields, each kept to a sensible length
const FIELDS = { num: 30, call: 120, type: 60, pri: 4, addr: 120, units: 200, oic: 60, t_disp: 8, t_scene: 8, t_clear: 8, narr: 6000, status: 12, saved: 40, submitted: 40 };
const clean = r => Object.fromEntries(Object.entries(FIELDS).map(([k, n]) => [k, String(r?.[k] ?? '').replace(/[\u0000-\u0008\u000b-\u001f]/g, '').slice(0, n)]));
const row = x => x && { ...JSON.parse(x.data), num: x.num, status: x.status, author: x.author, mine: false, at: x.updated };

export const list = (cid, dept, uid) => DEPTS[dept] ? q('SELECT * FROM dept_reports WHERE community_id = ? AND dept = ? ORDER BY created DESC LIMIT 300').all(cid, dept).map(x => ({ ...row(x), mine: x.author_id === uid })) : [];
const nextNum = (cid, dept) => { const pre = `${DEPTS[dept]}-${new Date().getFullYear()}-`;
  const top = q("SELECT num FROM dept_reports WHERE community_id = ? AND num LIKE ? ORDER BY CAST(substr(num, ?) AS INTEGER) DESC LIMIT 1").get(cid, pre + '%', pre.length + 1);
  return pre + String((top ? parseInt(top.num.slice(pre.length), 10) || 0 : 0) + 1).padStart(4, '0'); };

// save a report: a new one (no `num`, or one only in this browser) gets the next number; an existing one is updated by anyone in the department
export const save = (cid, dept, user, body) => { if (!DEPTS[dept]) return { error: 'Reports are for the fire department and the DOT.' };
  const r = clean(body.report), status = r.status === 'Submitted' ? 'Submitted' : 'Draft', t = now();
  const same = r.num ? q('SELECT * FROM dept_reports WHERE community_id = ? AND num = ?').get(cid, r.num) : null;
  // every browser numbered its own reports from 0001, so a brought-over one never overwrites: the same report is left alone, a different one is renumbered
  if (body.import && same) { const d = JSON.parse(same.data); if (d.addr === r.addr && d.narr === r.narr) return { ok: true, num: same.num }; }
  const cur = !body.isNew && !body.import ? same : null;
  if (cur) { q('UPDATE dept_reports SET status = ?, data = ?, updated = ? WHERE id = ?').run(status, JSON.stringify({ ...r, status }), t, cur.id); return { ok: true, num: cur.num }; }
  // a report brought over from a browser keeps its number when it's still free
  const num = body.import && /^(FD|DOT)-\d{4}-\d{1,6}$/.test(r.num) && !q('SELECT 1 FROM dept_reports WHERE community_id = ? AND num = ?').get(cid, r.num) ? r.num : nextNum(cid, dept);
  q('INSERT INTO dept_reports (community_id, dept, num, status, data, author_id, author, created, updated) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)')
    .run(cid, dept, num, status, JSON.stringify({ ...r, num, status }), user.id, user.roblox_name || user.name || '', t, t);
  return { ok: true, num }; };

export const remove = (cid, user, num, admin) => { const cur = q('SELECT * FROM dept_reports WHERE community_id = ? AND num = ?').get(cid, String(num || ''));
  if (!cur) return { error: 'That report is gone.' }; if (cur.author_id !== user.id && !admin) return { error: 'Only whoever wrote it, or an admin, can delete a report.' };
  q('DELETE FROM dept_reports WHERE id = ?').run(cur.id); return { ok: true }; };
