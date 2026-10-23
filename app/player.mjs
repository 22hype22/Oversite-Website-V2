// A player's public page (/user/<Roblox ID>): who they are, the listed servers they own or co-own, the reviews they've written
// and, for Premium players who leave it on, their career. Owners, co-owners and reviewers on server pages and Explore link here.
// Everything on it is already public somewhere (Explore, a server's reviews); unlisted servers stay off it.
import { db } from './db.mjs';
import * as career from './career.mjs';
import { directory } from './profile.mjs';

try { db.exec('ALTER TABLE users ADD COLUMN career_hidden INTEGER NOT NULL DEFAULT 0'); } catch (e) {}   // a Premium player can keep their career off this page
const q = sql => db.prepare(sql);

export const view = (rid, viewer) => { rid = String(rid || ''); if (!/^\d{1,20}$/.test(rid)) return null;
  const accts = q('SELECT id, roblox_name, verified, suspended, premium_until, career_hidden, created FROM users WHERE roblox_id = ? ORDER BY id').all(rid);
  if (accts.some(a => a.suspended)) return null;
  const list = directory(null), listed = new Set(list.map(x => x.slug));
  const servers = list.filter(x => x.owner_id === rid || (x.co_ids || []).includes(rid))
    .map(x => ({ slug: x.slug, name: x.name, role: x.owner_id === rid ? 'Owner' : 'Co-owner', rating: x.rating, reviews: x.reviews, votes: x.votes, players: x.players, max: x.max, live: x.live, badge: x.badge, premium: x.premium }))
    .sort((a, b) => (a.role === 'Owner' ? 0 : 1) - (b.role === 'Owner' ? 0 : 1) || b.votes - a.votes);
  // the name they go by: their linked Roblox, or what ER:LC says for a server they run. Someone on neither has no page.
  let name = accts.find(a => a.roblox_name)?.roblox_name || list.find(x => x.owner_id === rid)?.owner_name || '';
  if (!name) for (const x of list) { const i = (x.co_ids || []).indexOf(rid); if (i >= 0) { name = x.co_owners[i]; break; } }
  if (!name) return null;
  const ids = accts.map(a => a.id);
  const reviews = ids.length ? q(`SELECT r.rating, r.body, r.created, r.updated, c.slug, c.name FROM reviews r JOIN communities c ON c.id = r.community_id WHERE r.user_id IN (${ids.map(() => '?').join(',')}) ORDER BY r.created DESC LIMIT 60`).all(...ids).filter(r => listed.has(r.slug)) : [];
  const prem = accts.some(a => a.premium_until > Date.now()), hidden = accts.some(a => a.career_hidden), own = !!viewer?.roblox_id && String(viewer.roblox_id) === rid;
  const stats = prem && (!hidden || own) ? career.stats({ roblox_id: rid }) : null;
  if (stats) { stats.servers = stats.servers.map(v => ({ name: v.name, ms: v.ms, slug: listed.has(v.slug) ? v.slug : '' })); delete stats.recent; }   // when and where they play right now stays private
  return { rid, name, verified: accts.some(a => a.verified), prem, since: accts.length ? Math.min(...accts.map(a => a.created)) : 0, joined: accts.length > 0, servers, reviews, stats, hidden, own }; };

export const setHidden = (user, hide) => { if (!user?.roblox_id) return { error: 'Link your Roblox account first.' }; q('UPDATE users SET career_hidden = ? WHERE roblox_id = ?').run(hide ? 1 : 0, String(user.roblox_id)); return { ok: true, hidden: !!hide }; };
