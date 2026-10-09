// A server's public profile: what ER:LC knows about it (name, join code, owner, size, rules), kept fresh from the API,
// plus what only the owner can say (bio, icon, Discord invite). Saved now so the server browser can list servers later.
import { communities, communityIcons, users } from './db.mjs';

const UPSTREAM = process.env.ERLC_UPSTREAM || 'https://api.erlc.gg';
const RUSERS = process.env.ROBLOX_USERS_API || 'https://users.roblox.com';
const BIO_MAX = 300, ICON_MAX = 300000;
const INVITE = /^(https?:\/\/)?(www\.)?(discord\.gg|discord\.com\/invite)\/[A-Za-z0-9-]{2,32}\/?$/;

// Roblox usernames for a set of user IDs, in one request
const names = async ids => { ids = [...new Set(ids.map(Number).filter(Boolean))]; if (!ids.length) return {};
  try { const r = await fetch(RUSERS + '/v1/users', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ userIds: ids, excludeBannedUsers: false }) });
    const j = await r.json(); return Object.fromEntries((j.data || []).map(u => [String(u.id), u.name])); } catch (e) { return {}; } };

// read the server's details from ER:LC and keep them on the community
export const refresh = async c => { const key = communities.key(c.id); if (!key) return { error: 'Connect your ER:LC server first.' };
  let r, j = {}; try { r = await fetch(UPSTREAM + '/v2/server', { headers: { 'server-key': key } }); j = await r.json().catch(() => ({})); } catch (e) { return { error: 'Could not reach ER:LC right now.' }; }
  if (!r.ok) return { error: j.message || `ER:LC answered ${r.status}.` };
  const co = (j.CoOwnerIds || []).map(String), who = await names([j.OwnerId, ...co]);
  const erlc = { name: j.Name || '', join_key: j.JoinKey || '', players: j.CurrentPlayers ?? null, max: j.MaxPlayers ?? null, verified: j.AccVerifiedReq || '', team_balance: !!j.TeamBalance,
    owner_id: j.OwnerId ? String(j.OwnerId) : '', owner_name: who[String(j.OwnerId)] || '', co_owners: co.map(id => ({ id, name: who[id] || '' })), at: Date.now() };
  const s = communities.byId(c.id).settings; s.profile = { ...(s.profile || {}), erlc }; communities.saveSettings(c.id, s); return { ok: true, erlc }; };

export const save = (c, b) => { const bio = String(b.bio || '').replace(/\r/g, '').replace(/\n{3,}/g, '\n\n').trim();
  if (bio.length > BIO_MAX) return { error: `Keep the bio to ${BIO_MAX} characters.` };
  let invite = String(b.invite || '').trim(); if (invite && !INVITE.test(invite)) return { error: 'That doesn\'t look like a Discord invite link (discord.gg/...).' };
  if (invite && !/^https?:/.test(invite)) invite = 'https://' + invite;
  const s = communities.byId(c.id).settings; s.profile = { ...(s.profile || {}), bio, invite, listed: !!b.listed }; communities.saveSettings(c.id, s); return { ok: true }; };

// a custom icon arrives as a small data URL the browser already cropped and resized
export const setIcon = (c, dataUrl) => { const m = /^data:(image\/(?:png|jpeg|webp));base64,([A-Za-z0-9+/=]+)$/.exec(String(dataUrl || ''));
  if (!m) return { error: 'Use a PNG, JPG or WebP image.' }; const buf = Buffer.from(m[2], 'base64'); if (buf.length > ICON_MAX) return { error: 'That image is too big. Try a smaller one.' };
  const sig = buf.subarray(0, 12).toString('hex'); if (!(sig.startsWith('89504e47') || sig.startsWith('ffd8ff') || (sig.startsWith('52494646') && buf.subarray(8, 12).toString() === 'WEBP'))) return { error: 'That file is not a valid image.' };
  communityIcons.set(c.id, m[1], buf); return { ok: true }; };
export const clearIcon = c => { communityIcons.remove(c.id); return { ok: true }; };

// where a server's icon comes from: the owner's upload, else its Discord server's icon, else the ER:LC owner's Roblox avatar
export const iconSource = c => { const own = communityIcons.get(c.id); if (own) return { kind: 'custom', mime: own.mime, data: own.data, at: own.updated };
  const d = c.settings.discord; if (d && d.icon) return { kind: 'discord', url: d.icon.replace(/size=\d+/, 'size=256') };
  const oid = c.settings.profile?.erlc?.owner_id || users.byId(c.owner_id)?.roblox_id; if (oid) return { kind: 'owner', url: '/rbx/avatar/' + oid };
  return null; };
