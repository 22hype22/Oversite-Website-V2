// Slash commands in a server's own Discord, answered by the Oversite bot: /status, /calls, /units, /lookup and /cad.
// Discord sends each command to /api/discord/interactions, signed with the application's public key; the Discord server it
// came from picks the Oversite server (the one linked under Settings → Discord). Commands are added to each linked Discord
// one by one (never replacing commands that aren't Oversite's), and only after a site admin connects them on /admin, because
// pointing a Discord application's interactions at a URL takes them away from anything else that answered for it.
import { createPublicKey, verify } from 'node:crypto';
import { siteSettings } from './db.mjs';

const DAPI = process.env.DISCORD_API || 'https://discord.com/api', BOT = process.env.DISCORD_BOT_TOKEN || '', VERSION = 1;
const T = (v, n) => String(v ?? '').replace(/[\u0000-\u001f]/g, ' ').trim().slice(0, n);
const COLOR = 0x3987E5, EPHEMERAL = 64;
export const COMMANDS = [
  { name: 'status', description: 'How the server is doing: players, units on duty and open calls' },
  { name: 'calls', description: 'The open 911 calls and who is on them' },
  { name: 'units', description: 'Units on duty in each department, with their status' },
  { name: 'lookup', description: 'Look up a plate in the police records (staff and police only)', options: [{ type: 3, name: 'plate', description: 'The license plate', required: true, max_length: 12 }] },
  { name: 'cad', description: 'A link to this server’s CAD' }];

const api = async (path, opt = {}) => { const r = await fetch(DAPI + path, { ...opt, headers: { authorization: 'Bot ' + BOT, 'content-type': 'application/json', ...(opt.headers || {}) } });
  const j = r.status === 204 ? {} : await r.json().catch(() => ({})); if (!r.ok) { const e = new Error(j.message ? `Discord answered ${r.status}: ${j.message}` : `Discord answered ${r.status}`); e.status = r.status; e.code = j.code; throw e; } return j; };

// the Discord application behind the bot token: its id, public key and where it sends interactions now
let APP = null;
export const app = async (fresh = false) => { if (!BOT) return null; if (APP && !fresh) return APP;
  const a = await api('/applications/@me'); APP = { id: String(a.id), name: a.name || '', verify_key: a.verify_key || '', endpoint: a.interactions_endpoint_url || '' }; return APP; };
export const connected = () => siteSettings.get('discord_cmds') === '1';

// Discord signs every interaction with Ed25519 over timestamp + body; anything not signed by our application is turned away
let KEY = null;
const publicKey = async () => { if (KEY) return KEY; const hex = (process.env.DISCORD_PUBLIC_KEY || (await app().catch(() => null))?.verify_key || '').trim();
  if (!/^[0-9a-f]{64}$/i.test(hex)) return null;
  return KEY = createPublicKey({ key: { kty: 'OKP', crv: 'Ed25519', x: Buffer.from(hex, 'hex').toString('base64url') }, format: 'jwk' }); };
export const signed = async (raw, sig, ts) => { const k = await publicKey(); if (!k || !/^[0-9a-f]{128}$/i.test(sig || '') || !/^\d{1,13}$/.test(ts || '')) return false;
  if (Math.abs(Date.now() / 1000 - +ts) > 300) return false;
  try { return verify(null, Buffer.from(ts + raw), k, Buffer.from(sig, 'hex')); } catch (e) { return false; } };

// putting the commands in one linked Discord: one at a time, so commands the application has there for anything else stay
export const register = async gid => { const a = await app(); if (!a) return { error: 'Oversite’s Discord bot isn’t set up.' };
  try { for (const cmd of COMMANDS) await api(`/applications/${a.id}/guilds/${gid}/commands`, { method: 'POST', body: JSON.stringify(cmd) }); return { ok: true, version: VERSION }; }
  catch (e) { return { error: e.status === 403 ? 'The bot can’t add commands to that Discord. Add the bot again from Settings → Discord so it can.' : e.message }; } };
export const current = d => d?.cmds === VERSION;

// a site admin pointing the application's interactions at Oversite (and back to what was there before)
export const connect = async url => { const a = await app(true); if (!a) return { error: 'Oversite’s Discord bot isn’t set up.' };
  if (a.endpoint && a.endpoint !== url) siteSettings.set('discord_prev_endpoint', a.endpoint);
  try { await api('/applications/@me', { method: 'PATCH', body: JSON.stringify({ interactions_endpoint_url: url }) }); }
  catch (e) { return { error: e.status === 400 ? 'Discord couldn’t reach Oversite’s commands link to check it. Make sure the site is up on its public address, then try again.' : e.message }; }
  siteSettings.set('discord_cmds', '1'); await app(true).catch(() => null); return { ok: true }; };
export const disconnect = async url => { const a = await app(true).catch(() => null), prev = siteSettings.get('discord_prev_endpoint') || '';
  let note = '';   // what was there before goes back; if Discord can't reach it any more, the link is cleared so commands go back over the gateway
  if (a && a.endpoint === url) { const set = v => api('/applications/@me', { method: 'PATCH', body: JSON.stringify({ interactions_endpoint_url: v }) });
    try { await set(prev || null); } catch (e) { if (!prev) return { error: e.message }; try { await set(null); note = `Discord couldn’t reach the old link (${prev}), so the application now has none.`; } catch (x) { return { error: x.message }; } } }
  siteSettings.set('discord_cmds', ''); await app(true).catch(() => null); return { ok: true, note }; };

// the server's hands, set up by server.mjs:
// { community(gid), snapshot(c) -> { live, players, max, calls }, units(c), lookup(c, plate), canLookup(c, discordId) -> true | message, link(c), on(c) }
let H = null; export const wire = h => { H = h; };
const say = (text, priv = true) => ({ content: T(text, 1900), flags: priv ? EPHEMERAL : 0, allowed_mentions: { parse: [] } });
const embed = (e, priv = false) => ({ embeds: [{ color: COLOR, ...e }], flags: priv ? EPHEMERAL : 0, allowed_mentions: { parse: [] } });
const ago = t => { const m = Math.round((Date.now() - t) / 60000); return m < 1 ? 'just now' : m < 60 ? `${m} min ago` : `${Math.round(m / 60)} h ago`; };
const field = (name, lines, empty) => ({ name: T(name, 250), value: (lines.length ? lines.join('\n') : empty).slice(0, 1020) });
const NOT_LIVE = 'ER:LC isn’t answering for this server right now, so there’s nothing live to show. Try again in a minute.';

const answer = async (x, c) => { const name = x.data?.name, opt = Object.fromEntries((x.data?.options || []).map(o => [o.name, o.value]));
  if (name === 'cad') return embed({ title: c.name, url: H.link(c), description: `Open the CAD: ${H.link(c)}` });
  if (name === 'status') { const s = await H.snapshot(c), U = H.units(c, s);
    if (!s.live) return embed({ title: c.name, url: H.link(c), description: NOT_LIVE + (s.last ? `\nLast seen with ${s.last.players} players, ${ago(s.last.at)}.` : '') });
    const on = U.reduce((n, d) => n + d.units.length, 0);
    return embed({ title: c.name, url: H.link(c), fields: [{ name: 'Players', value: `${s.players.length}${s.max ? ` / ${s.max}` : ''}`, inline: true }, { name: 'Units on duty', value: String(on), inline: true },
      { name: 'Open calls', value: String(s.calls.length), inline: true }, ...U.map(d => ({ name: d.name, value: String(d.units.length), inline: true }))],
      footer: { text: s.join ? `Join code ${s.join}` : 'Oversite' }, timestamp: new Date().toISOString() }); }
  if (name === 'calls') { const s = await H.snapshot(c); if (!s.live) return say(NOT_LIVE);
    if (!s.calls.length) return embed({ title: 'Open calls', description: 'No open calls right now.' });
    return embed({ title: `Open calls (${s.calls.length})`, url: H.link(c), fields: s.calls.slice(0, 10).map(k => field(`${k.team || 'Call'} · ${k.where || 'Unknown location'}`,
      [T(k.description, 300) || 'No details', k.units.length ? `On it: ${k.units.join(', ')}` : 'No unit assigned yet', k.started ? `Came in ${ago(k.started)}` : ''].filter(Boolean), '')),
      footer: s.calls.length > 10 ? { text: `And ${s.calls.length - 10} more in the CAD` } : undefined }); }
  if (name === 'units') { const s = await H.snapshot(c); if (!s.live) return say(NOT_LIVE); const U = H.units(c, s);
    if (!U.some(d => d.units.length)) return embed({ title: 'Units on duty', description: 'Nobody is on a department team in game right now.' });
    return embed({ title: 'Units on duty', url: H.link(c), fields: U.map(d => field(`${d.name} (${d.units.length})`, d.units.slice(0, 20).map(u => `${u.callsign ? `**${T(u.callsign, 20)}** ` : ''}${T(u.name, 30)}${u.status ? ` · ${u.status}` : ''}`).concat(d.units.length > 20 ? [`And ${d.units.length - 20} more`] : []), 'Nobody on duty')) }); }
  if (name === 'lookup') { const ok = await H.canLookup(c, String(x.member?.user?.id || x.user?.id || '')); if (ok !== true) return say(ok);
    const r = H.lookup(c, T(opt.plate, 12)); if (r.error) return say(r.error);
    const v = r.vehicle, flags = [...(v.stolen ? ['Reported stolen'] : []), ...r.flags.map(f => `${f.kind === 'warrant' ? 'Warrant' : 'BOLO'}: ${T(f.reason || f.charges?.map?.(ch => ch.title).join(', ') || f.subject || 'on file', 120)}`), ...r.owner_flags.map(f => `Owner has a ${f.kind === 'warrant' ? 'warrant' : 'BOLO'}`)];
    return embed({ title: `Plate ${v.plate}`, color: flags.length ? 0xE24B4B : COLOR, fields: [
      { name: 'Vehicle', value: T([v.color, v.model].filter(Boolean).join(' '), 200) || 'Unknown', inline: true }, { name: 'Owner', value: T(v.owner, 60) || 'Unknown', inline: true },
      { name: 'Papers', value: `Registration ${v.reg || 'unknown'}, insurance ${v.ins || 'unknown'}`, inline: false },
      field('Flags', flags, 'None'), field('Recent records', r.history.slice(0, 5).map(h => `${h.kind} · ${h.status} · ${T(h.subject, 40)}${h.at ? ` · ${ago(h.at)}` : ''}`), 'None')],
      footer: { text: v.last_seen ? `Last seen in game ${ago(v.last_seen)}` : 'Oversite' } }, true); }
  return say('That command isn’t Oversite’s.'); };

// Discord gives three seconds to answer: anything slower (ER:LC can be) is answered "thinking…" and filled in after
export const handle = async x => { if (x.type === 1) return { type: 1 };
  if (x.type !== 2) return { type: 4, data: say('Oversite doesn’t do that yet.') };
  const c = x.guild_id ? H.community(String(x.guild_id)) : null;
  if (!c) return { type: 4, data: say('This Discord isn’t linked to an Oversite server. Its owner links it in the server’s Settings, under Discord.') };
  if (c.suspended) return { type: 4, data: say('This Oversite server is suspended.') };
  if (!H.on(c)) return { type: 4, data: say('This server has switched off Discord commands in its Oversite settings.') };
  const priv = x.data?.name === 'lookup', work = answer(x, c).catch(e => say('Something went wrong: ' + e.message));
  const quick = await Promise.race([work, new Promise(r => setTimeout(() => r(null), 2200))]); if (quick) return { type: 4, data: quick };
  work.then(d => fetch(`${DAPI}/webhooks/${x.application_id}/${x.token}/messages/@original`, { method: 'PATCH', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ ...d, flags: undefined }) })).catch(() => {});
  return { type: 5, data: { flags: priv ? EPHEMERAL : 0 } }; };
