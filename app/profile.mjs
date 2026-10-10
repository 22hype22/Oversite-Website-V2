// A server's public profile: what ER:LC knows about it (name, join code, owner, size, rules), kept fresh from the API,
// plus what only the owner can say (bio, icon, Discord invite). Saved now so the server browser can list servers later.
import { rude, RUDE_MSG } from './clean.mjs';
import { communities, communityIcons, users, members, votes, stats, reviews } from './db.mjs';
import * as discordlink from './discordlink.mjs';

// where a server is and what it speaks, shown as chips in the server browser (code: [label, flag])
export const REGIONS = { us: ['United States', '🇺🇸'], ca: ['Canada', '🇨🇦'], uk: ['United Kingdom', '🇬🇧'], eu: ['Europe', '🇪🇺'], de: ['Germany', '🇩🇪'], nl: ['Netherlands', '🇳🇱'], fr: ['France', '🇫🇷'], cz: ['Czechia', '🇨🇿'], pl: ['Poland', '🇵🇱'], au: ['Australia', '🇦🇺'], nz: ['New Zealand', '🇳🇿'], br: ['Brazil', '🇧🇷'], mx: ['Mexico', '🇲🇽'], ph: ['Philippines', '🇵🇭'], in: ['India', '🇮🇳'], global: ['Worldwide', '🌍'] };
// languages as they are spoken somewhere, so a server reads "English (United States)" rather than just "English"
export const LANGS = { 'en-us': ['English (United States)', '🇺🇸'], 'en-gb': ['English (United Kingdom)', '🇬🇧'], 'en-ca': ['English (Canada)', '🇨🇦'], 'en-au': ['English (Australia)', '🇦🇺'], 'en-nz': ['English (New Zealand)', '🇳🇿'], 'en-in': ['English (India)', '🇮🇳'], 'en-ph': ['English (Philippines)', '🇵🇭'],
  'es-mx': ['Spanish (Mexico)', '🇲🇽'], 'es-es': ['Spanish (Spain)', '🇪🇸'], 'pt-br': ['Portuguese (Brazil)', '🇧🇷'], 'pt-pt': ['Portuguese (Portugal)', '🇵🇹'], 'fr-fr': ['French (France)', '🇫🇷'], 'fr-ca': ['French (Canada)', '🇨🇦'],
  'de-de': ['German (Germany)', '🇩🇪'], 'nl-nl': ['Dutch (Netherlands)', '🇳🇱'], 'cs-cz': ['Czech (Czechia)', '🇨🇿'], 'pl-pl': ['Polish (Poland)', '🇵🇱'], 'it-it': ['Italian (Italy)', '🇮🇹'], 'tl-ph': ['Filipino (Philippines)', '🇵🇭'] };
// servers saved before languages had a place
const OLD_LANG = { en: 'en-us', es: 'es-mx', pt: 'pt-br', fr: 'fr-fr', de: 'de-de', nl: 'nl-nl', cs: 'cs-cz', pl: 'pl-pl', it: 'it-it', tl: 'tl-ph' };
const VOTE_GAP = 12 * 3600000;

const UPSTREAM = process.env.ERLC_UPSTREAM || 'https://api.erlc.gg';
const RUSERS = process.env.ROBLOX_USERS_API || 'https://users.roblox.com';
const BIO_MAX = 300, ICON_MAX = 300000;
// an invite can be typed as just its code or pasted as any discord.gg / discord.com/invite link; it is stored as https://discord.gg/<code>
const inviteCode = t => { t = String(t || '').trim().replace(/^<|>$/g, ''); const m = /^(?:https?:\/\/)?(?:www\.)?(?:discord\.gg|discord(?:app)?\.com\/invite)\/([A-Za-z0-9-]{2,32})\/?(?:\?.*)?$/i.exec(t) || /^([A-Za-z0-9-]{2,32})$/.exec(t); return m ? m[1] : null; };

// Roblox usernames for a set of user IDs, in one request
const names = async ids => { ids = [...new Set(ids.map(Number).filter(Boolean))]; if (!ids.length) return {};
  try { const r = await fetch(RUSERS + '/v1/users', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ userIds: ids, excludeBannedUsers: false }) });
    const j = await r.json(); return Object.fromEntries((j.data || []).map(u => [String(u.id), u.name])); } catch (e) { return {}; } };

// read the server's details from ER:LC and keep them on the community
export const refresh = async c => { const key = communities.key(c.id); if (!key) return { error: 'Connect your ER:LC server first.' };
  let r, j = {}; try { r = await fetch(UPSTREAM + '/v2/server', { headers: { 'server-key': key } }); j = await r.json().catch(() => ({})); } catch (e) { return { error: 'Could not reach ER:LC right now.' }; }
  if (!r.ok) return { error: j.message || `ER:LC answered ${r.status}.` };
  const co = (j.CoOwnerIds || []).map(String), prev = communities.byId(c.id).settings.profile?.erlc;
  const known = prev && prev.owner_id === String(j.OwnerId || '') && prev.co_owners?.map(o => o.id).join() === co.join() && prev.owner_name;   // names only change when the people do
  const who = known ? Object.fromEntries([[prev.owner_id, prev.owner_name], ...prev.co_owners.map(o => [o.id, o.name])]) : await names([j.OwnerId, ...co]);
  const erlc = { name: j.Name || '', join_key: j.JoinKey || '', players: j.CurrentPlayers ?? null, max: j.MaxPlayers ?? null, verified: j.AccVerifiedReq || '', team_balance: !!j.TeamBalance,
    owner_id: j.OwnerId ? String(j.OwnerId) : '', owner_name: who[String(j.OwnerId)] || '', co_owners: co.map(id => ({ id, name: who[id] || '' })), at: Date.now() };
  const s = communities.byId(c.id).settings; s.profile = { ...(s.profile || {}), erlc }; communities.saveSettings(c.id, s); return { ok: true, erlc }; };

export const save = (c, b) => { const bio = String(b.bio || '').replace(/\r/g, '').replace(/\n{3,}/g, '\n\n').trim();
  if (bio.length > BIO_MAX) return { error: `Keep the bio to ${BIO_MAX} characters.` };
  if (rude(bio)) return { error: 'The bio has a word that isn\'t allowed on Oversite. Please change it.' };
  const raw = String(b.invite || '').trim(), code = raw ? inviteCode(raw) : ''; if (code === null) return { error: 'That doesn\'t look like a Discord invite. Type the code after discord.gg/, like "libertyrp".' };
  if (code && rude(code)) return { error: RUDE_MSG };
  const invite = code ? 'https://discord.gg/' + code : '';
  const region = REGIONS[b.region] ? b.region : '', lang = LANGS[b.lang] ? b.lang : '';
  // the ER:LC join code, typed by owners whose server isn't linked to ER:LC (a linked server's code comes from ER:LC itself)
  const s = communities.byId(c.id).settings, old = s.profile || {};
  let join_code = old.join_code || ''; if (b.join_code !== undefined) { join_code = String(b.join_code || '').trim();
    if (join_code && !/^[A-Za-z0-9]{3,12}$/.test(join_code)) return { error: 'The ER:LC join code is 3 to 12 letters or numbers, like the code in your ER:LC server settings.' };
    if (join_code && rude(join_code)) return { error: RUDE_MSG }; }
  s.profile = { ...old, bio, invite, listed: !!b.listed, region, lang, join_code, open_join: !!b.open_join }; communities.saveSettings(c.id, s); return { ok: true }; };

// a custom icon arrives as a small data URL the browser already cropped and resized
export const setIcon = (c, dataUrl) => { const m = /^data:(image\/(?:png|jpeg|webp));base64,([A-Za-z0-9+/=]+)$/.exec(String(dataUrl || ''));
  if (!m) return { error: 'Use a PNG, JPG or WebP image.' }; const buf = Buffer.from(m[2], 'base64'); if (buf.length > ICON_MAX) return { error: 'That image is too big. Try a smaller one.' };
  const sig = buf.subarray(0, 12).toString('hex'); if (!(sig.startsWith('89504e47') || sig.startsWith('ffd8ff') || (sig.startsWith('52494646') && buf.subarray(8, 12).toString() === 'WEBP'))) return { error: 'That file is not a valid image.' };
  communityIcons.set(c.id, m[1], buf); return { ok: true }; };
export const clearBio = c => { const s = communities.byId(c.id).settings; s.profile = { ...(s.profile || {}), bio: '' }; communities.saveSettings(c.id, s); return { ok: true }; };
export const clearIcon = c => { communityIcons.remove(c.id); return { ok: true }; };

// where a server's icon comes from: the owner's upload, else its Discord server's icon, else the ER:LC owner's Roblox avatar
export const iconSource = c => { const own = communityIcons.get(c.id); if (own) return { kind: 'custom', mime: own.mime, data: own.data, at: own.updated };
  const d = c.settings.discord; if (d && d.icon) return { kind: 'discord', url: d.icon.replace(/size=\d+/, 'size=256') };
  const oid = c.settings.profile?.erlc?.owner_id || users.byId(c.owner_id)?.roblox_id; if (oid) return { kind: 'owner', url: '/rbx/avatar/' + oid };
  return null; };

// ── the server browser ──
// listed servers' player counts are re-read every two minutes (one small request per listed server), so the browser stays live
// when someone has a server's CAD open, its live feed already reads ER:LC every few seconds: Explore reuses that instead of asking again
let peek = () => null; const failedAt = new Map();
const fromFeed = c => { const snap = peek(c.id); if (!snap || snap.status !== 200 || Date.now() - snap.t > 60000) return false;
  let j; try { j = JSON.parse(snap.body); } catch (e) { return false; } if (j.CurrentPlayers == null && !Array.isArray(j.Players)) return false;
  const s = communities.byId(c.id).settings, E = s.profile?.erlc || {};
  s.profile = { ...(s.profile || {}), erlc: { ...E, name: j.Name || E.name || '', join_key: j.JoinKey || E.join_key || '', players: j.CurrentPlayers ?? j.Players.length, max: j.MaxPlayers ?? E.max ?? null, at: Date.now() } };
  communities.saveSettings(c.id, s); return true; };
export const startDirectory = (feedPeek) => { let busy = false; if (feedPeek) peek = feedPeek;
  for (const c of communities.all()) { const P = c.settings.profile; if (P && OLD_LANG[P.lang]) { const s = c.settings; s.profile = { ...P, lang: OLD_LANG[P.lang] }; communities.saveSettings(c.id, s); } }
  const pass = async () => { if (busy) return; busy = true;
    try { for (const c of communities.all()) { if (!c.settings.profile?.listed) continue;
      if (communities.key(c.id) && !fromFeed(c)) { const r = await refresh(c).catch(e => ({ error: e.message }));
        // say why a listed server couldn't be read, at most every half hour per server, so an "Offline" that should be online can be traced
        if (r?.error && Date.now() - (failedAt.get(c.id) || 0) > 30 * 60000) { failedAt.set(c.id, Date.now()); console.log(`directory: ${c.slug} not refreshed: ${r.error}`); } }
      { const E = communities.byId(c.id).settings.profile?.erlc; if (E?.at && Date.now() - E.at < 5 * 60000 && E.players != null) stats.add(c.id, E.players, E.max ?? null); }
      const P = communities.byId(c.id).settings.profile || {}, gid = c.settings.discord?.guild_id;   // Discord member count: every half hour is plenty
      if (gid && Date.now() - (P.dc_at || 0) > 30 * 60000) { const n = await discordlink.counts(gid); if (n) { const s = communities.byId(c.id).settings; s.profile = { ...(s.profile || {}), dc_members: n.members, dc_online: n.online, dc_at: Date.now() }; communities.saveSettings(c.id, s); } } } }
    finally { busy = false; stats.prune(); } };
  const blind = communities.all().filter(c => c.settings.profile?.listed && !c.erlc_key).map(c => c.slug);
  if (blind.length) console.log(`directory: listed without an ER:LC key (no live status): ${blind.join(', ')}`);
  setTimeout(pass, 8000); setInterval(pass, 120000); };

// what anyone browsing may see about a listed server; `me` marks the ones this person already belongs to
export const directory = me => { const mine = new Map((me ? communities.forUser(me.id) : []).map(m => [m.id, m.role]));
  const total = votes.totals(), week = votes.since(Date.now() - 7 * 86400000), voted = me ? votes.mine(me.id) : {};
  const vr = users.verifiedRoblox(), rv = reviews.summary(), owners = new Map(), ownerOf = c => { if (!owners.has(c.owner_id)) owners.set(c.owner_id, users.byId(c.owner_id) || {}); return owners.get(c.owner_id); };
  return communities.all().filter(c => c.settings.profile?.listed && !c.hidden && !c.suspended).map(c => { const P = c.settings.profile, E = P.erlc || {};
    return { slug: c.slug, name: c.name, bio: P.bio || '', invite: P.invite || '', players: E.players ?? null, max: E.max ?? null, join_key: E.join_key || P.join_code || '', open_join: !!P.open_join, ingame: E.name || '',
      owner_id: E.owner_id || ownerOf(c).roblox_id || '', owner_name: E.owner_name || ownerOf(c).roblox_name || ownerOf(c).name || '', co_owners: (E.co_owners || []).map(o => o.name).filter(Boolean), verified: E.verified || '', team_balance: !!E.team_balance,
      depts: ['pd', 'fd', 'dot'].map(d => c.settings.depts?.[d] && { k: d, name: c.settings.depts[d].name, short: c.settings.depts[d].short }).filter(Boolean), discord: c.settings.discord?.guild_name || '', at: E.at || 0, created: c.created || 0,
      role: mine.get(c.id) || null, live: !!E.at && Date.now() - E.at < 10 * 60000,
      votes: total[c.id] || 0, week: week[c.id] || 0, next_vote: voted[c.id] ? Math.max(0, voted[c.id] + VOTE_GAP - Date.now()) : 0,
      region: REGIONS[P.region] ? { code: P.region, name: REGIONS[P.region][0], flag: REGIONS[P.region][1] } : null, lang: LANGS[P.lang] ? { code: P.lang, name: LANGS[P.lang][0], flag: LANGS[P.lang][1] } : null,
      dc_members: P.dc_members ?? null, dc_online: P.dc_online ?? null, connected: !!c.erlc_key, badge: !!c.verified, owner_badge: !!(E.owner_id || ownerOf(c).roblox_id) && vr.has(String(E.owner_id || ownerOf(c).roblox_id)), rating: rv[c.id] ? Math.round(rv[c.id].avg * 10) / 10 : null, reviews: rv[c.id]?.n || 0, id: c.id }; }); };

// one vote per person per server every 12 hours
export const vote = (me, slug) => { const c = communities.bySlug(String(slug || '')); if (!c || !c.settings.profile?.listed || c.hidden || c.suspended) return { error: 'That server is not listed.' };
  const wait = votes.last(c.id, me.id) + VOTE_GAP - Date.now(); if (wait > 0) return { error: `You can vote for ${c.name} again in ${Math.ceil(wait / 3600000)} h.`, next_vote: wait };
  votes.add(c.id, me.id); return { ok: true, votes: votes.totals()[c.id] || 0, next_vote: VOTE_GAP }; };
