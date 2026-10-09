// Storage: one SQLite file on the persistent volume (/data on Railway). Node's built-in driver, so no dependencies.
import { DatabaseSync } from 'node:sqlite';
import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { randomBytes, createCipheriv, createDecipheriv, createHash } from 'node:crypto';

const DATA = process.env.DATA_DIR || (existsSync('/data') ? '/data' : join(process.cwd(), '.data'));
mkdirSync(DATA, { recursive: true });
export const DB_FILE = process.env.DB_FILE || join(DATA, 'oversite.db');
export const db = new DatabaseSync(DB_FILE);
db.exec('PRAGMA journal_mode = WAL; PRAGMA foreign_keys = ON;');
db.exec(`
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY, discord_id TEXT UNIQUE, name TEXT NOT NULL, avatar TEXT,
  roblox_id TEXT, roblox_name TEXT, is_local_owner INTEGER DEFAULT 0, created INTEGER NOT NULL);
CREATE TABLE IF NOT EXISTS sessions (
  hash TEXT PRIMARY KEY, user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE, created INTEGER NOT NULL, expires INTEGER NOT NULL);
CREATE TABLE IF NOT EXISTS communities (
  id INTEGER PRIMARY KEY, slug TEXT UNIQUE NOT NULL, name TEXT NOT NULL, owner_id INTEGER NOT NULL REFERENCES users(id),
  erlc_key TEXT, settings TEXT NOT NULL DEFAULT '{}', created INTEGER NOT NULL);
CREATE TABLE IF NOT EXISTS members (
  community_id INTEGER NOT NULL REFERENCES communities(id) ON DELETE CASCADE, user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'member', joined INTEGER NOT NULL, PRIMARY KEY (community_id, user_id));
CREATE TABLE IF NOT EXISTS invites (
  code TEXT PRIMARY KEY, community_id INTEGER NOT NULL REFERENCES communities(id) ON DELETE CASCADE, created_by INTEGER, created INTEGER NOT NULL,
  expires INTEGER, max_uses INTEGER, uses INTEGER NOT NULL DEFAULT 0, revoked INTEGER NOT NULL DEFAULT 0);
CREATE TABLE IF NOT EXISTS codes (
  hash TEXT PRIMARY KEY, community_id INTEGER NOT NULL REFERENCES communities(id) ON DELETE CASCADE, role TEXT NOT NULL, sealed TEXT NOT NULL, created INTEGER NOT NULL,
  UNIQUE (community_id, role));
CREATE TABLE IF NOT EXISTS roblox_pending (
  user_id INTEGER PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE, roblox_id TEXT NOT NULL, roblox_name TEXT NOT NULL, phrase TEXT NOT NULL, expires INTEGER NOT NULL);
CREATE TABLE IF NOT EXISTS staff_records (
  id INTEGER PRIMARY KEY, community_id INTEGER NOT NULL REFERENCES communities(id) ON DELETE CASCADE, roblox_id TEXT, name TEXT NOT NULL,
  kind TEXT NOT NULL, reason TEXT NOT NULL DEFAULT '', by_user INTEGER, by_name TEXT NOT NULL DEFAULT '', result TEXT NOT NULL DEFAULT '', created INTEGER NOT NULL);
CREATE INDEX IF NOT EXISTS staff_records_player ON staff_records (community_id, roblox_id);
`);

try { db.exec('ALTER TABLE users ADD COLUMN roblox_via TEXT'); } catch (e) {}   // how the Roblox link was proven: 'discord' or 'profile'
// server keys are encrypted at rest with a secret that lives in the environment or, failing that, next to the database
const SECRET_FILE = join(DATA, 'app.secret');
let secret = process.env.APP_SECRET ? createHash('sha256').update(process.env.APP_SECRET).digest() : null;
if (!secret) { if (!existsSync(SECRET_FILE)) writeFileSync(SECRET_FILE, randomBytes(32).toString('hex'), { mode: 0o600 }); secret = Buffer.from(readFileSync(SECRET_FILE, 'utf8').trim(), 'hex'); }
export const seal = text => { const iv = randomBytes(12), c = createCipheriv('aes-256-gcm', secret, iv); const enc = Buffer.concat([c.update(text, 'utf8'), c.final()]); return [iv, c.getAuthTag(), enc].map(b => b.toString('base64')).join('.'); };
export const unseal = blob => { if (!blob) return ''; try { const [iv, tag, enc] = blob.split('.').map(s => Buffer.from(s, 'base64')); const d = createDecipheriv('aes-256-gcm', secret, iv); d.setAuthTag(tag); return Buffer.concat([d.update(enc), d.final()]).toString('utf8'); } catch (e) { return ''; } };
export const sha = s => createHash('sha256').update(s).digest('hex');
const pepper = createHash('sha256').update('codes:' + secret.toString('hex')).digest('hex');
export const token = (n = 32) => randomBytes(n).toString('hex');
export const now = () => Date.now();

const q = sql => db.prepare(sql);
// ── users and sessions ──
export const users = {
  byId: id => q('SELECT * FROM users WHERE id = ?').get(id),
  byDiscord: did => q('SELECT * FROM users WHERE discord_id = ?').get(did),
  localOwner: () => q('SELECT * FROM users WHERE is_local_owner = 1').get(),
  create: ({ discord_id = null, name, avatar = null, is_local_owner = 0 }) => q('INSERT INTO users (discord_id, name, avatar, is_local_owner, created) VALUES (?, ?, ?, ?, ?)').run(discord_id, name, avatar, is_local_owner, now()).lastInsertRowid,
  update: (id, f) => { for (const [k, v] of Object.entries(f)) if (['discord_id', 'name', 'avatar', 'roblox_id', 'roblox_name', 'roblox_via'].includes(k)) q(`UPDATE users SET ${k} = ? WHERE id = ?`).run(v, id); },
  byRoblox: rid => q('SELECT * FROM users WHERE roblox_id = ? ORDER BY id LIMIT 1').get(rid),
  // fold a duplicate account (same person signed in with a code on another device) into the one that already has their Roblox link
  merge: (from, into) => { for (const m of q('SELECT community_id, role FROM members WHERE user_id = ?').all(from)) { const cur = q('SELECT role FROM members WHERE community_id = ? AND user_id = ?').get(m.community_id, into);
      const rank = r => ({ member: 1, staff: 2, admin: 3, owner: 4 }[r] || 0); if (!cur) q('INSERT INTO members (community_id, user_id, role, joined) VALUES (?, ?, ?, ?)').run(m.community_id, into, m.role, now()); else if (rank(m.role) > rank(cur.role)) q('UPDATE members SET role = ? WHERE community_id = ? AND user_id = ?').run(m.role, m.community_id, into); }
    q('UPDATE communities SET owner_id = ? WHERE owner_id = ?').run(into, from); q('DELETE FROM users WHERE id = ?').run(from); },
};
export const sessions = {
  create: userId => { const t = token(), exp = now() + 30 * 864e5; q('INSERT INTO sessions (hash, user_id, created, expires) VALUES (?, ?, ?, ?)').run(sha(t), userId, now(), exp); return t; },
  user: t => { if (!t) return null; const s = q('SELECT * FROM sessions WHERE hash = ?').get(sha(t)); if (!s || s.expires < now()) return null; return users.byId(s.user_id); },
  drop: t => q('DELETE FROM sessions WHERE hash = ?').run(sha(t || '')),
};
// ── communities ──
export const DEFAULT_SETTINGS = { depts: { pd: { name: 'Law Enforcement', short: 'LE' }, fd: { name: 'Fire Department', short: 'FD' }, dot: { name: 'Department of Transportation', short: 'DOT' } },
  teams: { Police: 'pd', Sheriff: 'pd', Fire: 'fd', DOT: 'dot', Civilian: '' }, cal: [] };
const withSettings = c => c && { ...c, settings: { ...DEFAULT_SETTINGS, ...JSON.parse(c.settings || '{}') } };
export const RESERVED = new Set(['api', 'app', 'admin', 'auth', 'c', 'dashboard', 'join', 'login', 'logout', 'www', 'oversite', 'settings', 'account', 'help', 'support', 'status', 'new']);
export const communities = {
  bySlug: slug => withSettings(q('SELECT * FROM communities WHERE slug = ?').get(slug)),
  byId: id => withSettings(q('SELECT * FROM communities WHERE id = ?').get(id)),
  all: () => q('SELECT * FROM communities').all().map(withSettings),
  forUser: uid => q('SELECT c.id, c.slug, c.name, c.erlc_key IS NOT NULL AS connected, m.role FROM members m JOIN communities c ON c.id = m.community_id WHERE m.user_id = ? ORDER BY c.name').all(uid),
  create: (ownerId, slug, name) => { const id = q('INSERT INTO communities (slug, name, owner_id, settings, created) VALUES (?, ?, ?, ?, ?)').run(slug, name, ownerId, JSON.stringify(DEFAULT_SETTINGS), now()).lastInsertRowid;
    q('INSERT INTO members (community_id, user_id, role, joined) VALUES (?, ?, ?, ?)').run(id, ownerId, 'owner', now()); return id; },
  rename: (id, name) => q('UPDATE communities SET name = ? WHERE id = ?').run(name, id),
  setKey: (id, key) => q('UPDATE communities SET erlc_key = ? WHERE id = ?').run(key ? seal(key) : null, id),
  key: id => unseal(q('SELECT erlc_key FROM communities WHERE id = ?').get(id)?.erlc_key),
  saveSettings: (id, s) => q('UPDATE communities SET settings = ? WHERE id = ?').run(JSON.stringify(s), id),
  remove: id => q('DELETE FROM communities WHERE id = ?').run(id),
};
export const members = {
  role: (cid, uid) => q('SELECT role FROM members WHERE community_id = ? AND user_id = ?').get(cid, uid)?.role || null,
  list: cid => q('SELECT u.id, u.name, u.avatar, u.discord_id, u.roblox_name, m.role, m.joined FROM members m JOIN users u ON u.id = m.user_id WHERE m.community_id = ? ORDER BY CASE m.role WHEN \'owner\' THEN 0 WHEN \'admin\' THEN 1 WHEN \'staff\' THEN 2 ELSE 3 END, u.name').all(cid),
  add: (cid, uid, role = 'member') => q('INSERT OR IGNORE INTO members (community_id, user_id, role, joined) VALUES (?, ?, ?, ?)').run(cid, uid, role, now()),
  raise: (cid, uid, role) => { const rank = r => ({ member: 1, staff: 2, admin: 3, owner: 4 }[r] || 0), cur = q('SELECT role FROM members WHERE community_id = ? AND user_id = ?').get(cid, uid)?.role;   // join, or move up a role; never down
    if (!cur) q('INSERT INTO members (community_id, user_id, role, joined) VALUES (?, ?, ?, ?)').run(cid, uid, role, now()); else if (rank(role) > rank(cur)) q('UPDATE members SET role = ? WHERE community_id = ? AND user_id = ?').run(role, cid, uid); },
  setRole: (cid, uid, role) => q('UPDATE members SET role = ? WHERE community_id = ? AND user_id = ? AND role != \'owner\'').run(role, cid, uid),
  remove: (cid, uid) => q('DELETE FROM members WHERE community_id = ? AND user_id = ? AND role != \'owner\'').run(cid, uid),
};
export const invites = {
  create: (cid, by, days = 7) => { const code = token(5); q('INSERT INTO invites (code, community_id, created_by, created, expires) VALUES (?, ?, ?, ?, ?)').run(code, cid, by, now(), days ? now() + days * 864e5 : null); return code; },
  get: code => { const i = q('SELECT * FROM invites WHERE code = ?').get(code); if (!i || i.revoked || (i.expires && i.expires < now()) || (i.max_uses && i.uses >= i.max_uses)) return null; return i; },
  use: code => q('UPDATE invites SET uses = uses + 1 WHERE code = ?').run(code),
  list: cid => q('SELECT * FROM invites WHERE community_id = ? AND revoked = 0 AND (expires IS NULL OR expires > ?) ORDER BY created DESC').all(cid, now()),
  revoke: (cid, code) => q('UPDATE invites SET revoked = 1 WHERE community_id = ? AND code = ?').run(cid, code),
};
// warnings, kicks, bans and notes written by a community's staff, one row per action
export const staffRecords = {
  add: r => Number(q('INSERT INTO staff_records (community_id, roblox_id, name, kind, reason, by_user, by_name, result, created) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)')
    .run(r.community_id, r.roblox_id || null, r.name, r.kind, r.reason || '', r.by_user || null, r.by_name || '', r.result || '', now()).lastInsertRowid),
  recent: (cid, n = 60) => q('SELECT * FROM staff_records WHERE community_id = ? ORDER BY id DESC LIMIT ?').all(cid, n),
  forPlayer: (cid, rid, name) => q('SELECT * FROM staff_records WHERE community_id = ? AND (roblox_id = ? OR (roblox_id IS NULL AND lower(name) = lower(?))) ORDER BY id DESC LIMIT 200').all(cid, rid || '', name || ''),
  search: (cid, text) => q("SELECT * FROM staff_records WHERE community_id = ? AND (lower(name) LIKE ? OR roblox_id = ?) ORDER BY id DESC LIMIT 200").all(cid, '%' + String(text).toLowerCase() + '%', String(text)),
  counts: cid => q("SELECT roblox_id, kind, COUNT(*) n FROM staff_records WHERE community_id = ? AND roblox_id IS NOT NULL GROUP BY roblox_id, kind").all(cid),
  remove: (cid, id) => q('DELETE FROM staff_records WHERE community_id = ? AND id = ?').run(cid, id),
};
export const roblox = {
  pending: uid => q('SELECT * FROM roblox_pending WHERE user_id = ?').get(uid),
  start: (uid, rid, rname, phrase) => q('INSERT OR REPLACE INTO roblox_pending (user_id, roblox_id, roblox_name, phrase, expires) VALUES (?, ?, ?, ?, ?)').run(uid, rid, rname, phrase, now() + 30 * 6e4),
  clear: uid => q('DELETE FROM roblox_pending WHERE user_id = ?').run(uid),
};

// ── server codes: the owner code (full control) and the member code (normal access). Unique across the whole site, so a code alone finds its server.
export const normCode = c => String(c || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
export const codeOk = c => /^[A-Z0-9]{2,24}$/.test(normCode(c));
const codeHash = c => sha(pepper + normCode(c));
const ALPHA = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
export const newCode = () => { const b = randomBytes(8); let s = ''; for (let i = 0; i < 8; i++) s += ALPHA[b[i] % ALPHA.length]; return s.slice(0, 4) + '-' + s.slice(4); };
export const codes = {
  find: code => { if (!codeOk(code)) return null; return q('SELECT community_id, role FROM codes WHERE hash = ?').get(codeHash(code)) || null; },
  taken: (code, cid, role) => { const r = q('SELECT community_id, role FROM codes WHERE hash = ?').get(codeHash(code)); return !!r && !(r.community_id === cid && r.role === role); },
  set: (cid, role, code) => { q('DELETE FROM codes WHERE community_id = ? AND role = ?').run(cid, role); q('INSERT INTO codes (hash, community_id, role, sealed, created) VALUES (?, ?, ?, ?, ?)').run(codeHash(code), cid, role, seal(String(code).trim().toUpperCase()), now()); },
  show: (cid, role) => unseal(q('SELECT sealed FROM codes WHERE community_id = ? AND role = ?').get(cid, role)?.sealed),
};
