// Fines: the fine on every citation and arrest, for a server that runs its own economy (a Discord economy bot, say) next to the CAD.
// A bot looks up what someone owes and marks a fine paid once it has taken the money (/api/bot/v1/fines), and hears about each new
// fine and each one paid (fine.issued, fine.paid). In the MDT a Sergeant or above can mark a fine paid by hand. A fine paid from the
// Civilian bank is marked paid too (civ.mjs settle), so all three agree.
// A fine lives on its record: data.fine, and once paid data.paid_at, data.paid_by and data.paid_note.
import { db, now } from './db.mjs';

const q = sql => db.prepare(sql);
const T = (v, n) => String(v ?? '').replace(/[\u0000-\u001f<>]/g, '').replace(/\s+/g, ' ').trim().slice(0, n);
let emit = () => {}; export const onChange = fn => { emit = fn; };

// one fine as bots see it; amount is what's owed now (with a late fee when the Civilian bank billed it and it went overdue)
const shape = (cid, r) => { const d = JSON.parse(r.data || '{}'), b = q("SELECT amount, status, due FROM civ_bills WHERE community_id = ? AND kind = 'fine' AND ref = ?").get(cid, `rec:${r.id}`);
  return { id: r.id, kind: r.kind, subject: r.subject || '', roblox_id: /^\d+$/.test(r.subject_rid || '') ? r.subject_rid : null, charges: (d.charges || []).map(x => ({ code: x.code || '', title: x.title, fine: x.fine, count: x.count || 1 })),
    fine: d.fine || 0, amount: b && !d.paid_at ? b.amount : d.fine || 0, officer: r.by_name || '', issued_at: r.at, due_at: b?.due || null,
    paid: !!d.paid_at, paid_at: d.paid_at || null, paid_by: d.paid_by || null, note: d.paid_note || null }; };
const FINES = "community_id = ? AND kind IN ('citation', 'arrest') AND json_extract(data, '$.fine') > 0";
export const get = (cid, id) => { const r = q(`SELECT * FROM pd_records WHERE ${FINES} AND id = ?`).get(cid, +id || 0); return r ? shape(cid, r) : null; };
// someone's fines by Roblox ID (or a character's key) or name, or everyone's whose name has `q` in it (the MDT's Fines screen),
// newest first; status: unpaid, paid or all
export const list = (cid, { rid, name, q: like, status = 'unpaid', limit = 50 } = {}) => {
  const w = [FINES], a = [cid]; if (rid) { w.push('subject_rid = ?'); a.push(String(rid)); } else if (name) { w.push('lower(subject) = lower(?)'); a.push(T(name, 40)); }
  else if (like) { w.push("(lower(subject) LIKE ? ESCAPE '\\' OR subject_rid = ?)"); a.push('%' + T(like, 40).toLowerCase().replace(/[%_\\]/g, m => '\\' + m) + '%', T(like, 40)); }
  if (status === 'unpaid') w.push("json_extract(data, '$.paid_at') IS NULL"); else if (status === 'paid') w.push("json_extract(data, '$.paid_at') IS NOT NULL");
  const L = q(`SELECT * FROM pd_records WHERE ${w.join(' AND ')} ORDER BY at DESC LIMIT ?`).all(...a, Math.max(1, Math.min(200, +limit || 50))).map(r => shape(cid, r));
  return { fines: L, owed: L.filter(f => !f.paid).reduce((s, f) => s + f.amount, 0) }; };

// mark a fine paid (or not paid again, to undo a mistake). The Civilian bank's bill for it closes too, without moving any money: the
// money was taken wherever the server keeps it.
export const setPaid = (c, id, paid, who, note) => { const r = q(`SELECT * FROM pd_records WHERE ${FINES} AND id = ?`).get(c.id, +id || 0); if (!r) return { error: 'No citation or arrest with a fine has that id.', status: 404 };
  const d = JSON.parse(r.data || '{}');
  if (paid) { if (d.paid_at) return { error: `That fine was already paid${d.paid_by ? ' (' + d.paid_by + ')' : ''}.`, status: 409, fine: shape(c.id, r) };
    d.paid_at = now(); d.paid_by = T(who, 60) || 'Unknown'; if (note) d.paid_note = T(note, 120);
    q("UPDATE civ_bills SET status = 'Paid', paid_at = ? WHERE community_id = ? AND kind = 'fine' AND ref = ? AND status <> 'Paid'").run(now(), c.id, `rec:${r.id}`); }
  else { if (!d.paid_at) return { error: 'That fine isn\'t marked paid.', status: 409, fine: shape(c.id, r) }; delete d.paid_at; delete d.paid_by; delete d.paid_note;
    q("UPDATE civ_bills SET status = CASE WHEN due < ? THEN 'Overdue' ELSE 'Open' END, paid_at = NULL WHERE community_id = ? AND kind = 'fine' AND ref = ? AND status = 'Paid'").run(now(), c.id, `rec:${r.id}`); }
  q('UPDATE pd_records SET data = ?, updated = ? WHERE community_id = ? AND id = ?').run(JSON.stringify(d), now(), c.id, r.id);
  const f = get(c.id, r.id); emit(c, paid ? 'fine.paid' : 'fine.unpaid', f); return { ok: true, fine: f }; };

// a new citation or arrest: its fine, for fine.issued
export const issued = (c, rec) => { if (!rec || !['citation', 'arrest'].includes(rec.kind) || !(rec.fine > 0)) return; const f = get(c.id, rec.id); if (f) emit(c, 'fine.issued', f); };
// paid from the Civilian bank (civ.mjs)
export const paidInBank = (c, id) => { const f = get(c.id, id); if (f) emit(c, 'fine.paid', f); };
