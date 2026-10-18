// Slash commands in a server's own Discord, answered by the Oversite bot: /status, /calls, /units, /lookup and /cad.
// Discord sends each command to /api/discord/interactions, signed with the application's public key; the Discord server it
// came from picks the Oversite server (the one linked under Settings → Discord). Commands are added to each linked Discord
// one by one (never replacing commands that aren't Oversite's), and only after a site admin connects them on /admin, because
// pointing a Discord application's interactions at a URL takes them away from anything else that answered for it.
import { createPublicKey, verify } from 'node:crypto';
import { siteSettings } from './db.mjs';
import * as courses from './courses.mjs';
import { randomBytes } from 'node:crypto';

const DAPI = process.env.DISCORD_API || 'https://discord.com/api', BOT = process.env.DISCORD_BOT_TOKEN || '', VERSION = 2;
const T = (v, n) => String(v ?? '').replace(/[\u0000-\u001f]/g, ' ').trim().slice(0, n);
const COLOR = 0x3987E5, EPHEMERAL = 64;
export const COMMANDS = [
  { name: 'status', description: 'How the server is doing: players, units on duty and open calls' },
  { name: 'calls', description: 'The open 911 calls and who is on them' },
  { name: 'units', description: 'Units on duty in each department, with their status' },
  { name: 'lookup', description: 'Look up a plate in the police records (staff and police only)', options: [{ type: 3, name: 'plate', description: 'The license plate', required: true, max_length: 12 }] },
  { name: 'cad', description: 'A link to this server’s CAD' },
  { name: 'course', description: 'Take one of your server’s courses', options: [{ type: 3, name: 'name', description: 'The course', required: true, autocomplete: true },
    { type: 5, name: 'public', description: 'Post it in this channel so anyone can take it (public courses only)', required: false }] }];

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
// ── /course: a course in Discord. Everything happens in messages only the person taking it can see, so nobody else is pinged
// or can answer for them; a public course can be posted in the channel with a Start button anyone can press for their own run.
const runs = new Map();   // token -> { cid, course, did, answers, at }
const BTN = (id, label, style = 2, disabled = false) => ({ type: 2, custom_id: id, label: T(label, 80) || '…', style, disabled });
const rows = list => { const out = []; for (let i = 0; i < list.length && out.length < 5; i += 5) out.push({ type: 1, components: list.slice(i, i + 5) }); return out; };
const priv = d => ({ ...d, flags: EPHEMERAL, allowed_mentions: { parse: [] } });
const intro = (k, start) => ({ embeds: [{ color: COLOR, title: T(k.title, 250), description: T([k.about, `${k.questions.length} question${k.questions.length === 1 ? '' : 's'} · pass mark ${k.pass}%`].filter(Boolean).join('\n\n'), 4000),
    fields: k.sections.slice(0, 10).map(x => ({ name: T(x.title || 'Reading', 250), value: T(x.body || '…', 1020) })) }], components: rows([BTN(start, 'Start', 1)]) });
const question = r => { const x = r.course.questions[r.i], n = r.course.questions.length, tok = r.tok;
  const opts = x.type === 'choice' ? x.options.map((o, k) => BTN(`crs:a:${tok}:${r.i}:${k}`, o)) : x.type === 'yesno' ? ['Yes', 'No'].map(o => BTN(`crs:a:${tok}:${r.i}:${o}`, o)) : [BTN(`crs:w:${tok}:${r.i}`, 'Write your answer', 1)];
  return { embeds: [{ color: COLOR, title: T(`${r.course.title} · ${r.i + 1} of ${n}`, 250), description: T(x.q, 4000) + `\n\n*${x.points} point${x.points === 1 ? '' : 's'}*` }],
    components: [...rows(opts), { type: 1, components: [BTN(`crs:x:${tok}`, 'Stop', 4)] }] }; };
const finish = async (r, x) => { runs.delete(r.tok); const who = await H.courseUser(r.c, r.did); if (typeof who === 'string') return { embeds: [], content: who, components: [] };
  const res = courses.submit(r.c, who.user, who.role, r.course.id, r.answers, 'discord'); if (res.error) return { embeds: [], content: res.error, components: [] };
  const head = { passed: 'Passed', failed: 'Not passed', marking: 'Handed in' }[res.status];
  return { content: '', components: [], embeds: [{ color: res.status === 'passed' ? 0x46D07C : res.status === 'failed' ? 0xE24B4B : 0xE9B04C, title: T(`${r.course.title}: ${head}`, 250),
    description: T(res.message.replace(/<@\d+>/g, who.user.roblox_name || 'You'), 4000), fields: res.status === 'marking' ? [] : [{ name: 'Score', value: `${res.score}/${res.max}`, inline: true }, { name: 'Pass mark', value: `${res.pass}%`, inline: true }] }] }; };
const courseInteraction = async (x, c) => { const did = String(x.member?.user?.id || x.user?.id || ''), id = x.data?.custom_id || '';
  if (x.type === 4) { const who = await H.courseUser(c, did); const typed = String((x.data?.options || []).find(o => o.focused)?.value || '').toLowerCase();
    const list = typeof who === 'string' ? [] : courses.list(c, who.user, who.role).filter(k => k.open && (!typed || k.title.toLowerCase().includes(typed)));
    return { type: 8, data: { choices: list.slice(0, 25).map(k => ({ name: T(k.title + (k.public ? ' (public)' : ''), 100), value: String(k.id) })) } }; }
  if (x.type === 2) { const opt = Object.fromEntries((x.data.options || []).map(o => [o.name, o.value])), who = await H.courseUser(c, did); if (typeof who === 'string') return { type: 4, data: priv({ content: who }) };
    const k = courses.get(c.id, String(opt.name || '').replace(/\D/g, '') || 0); if (!courses.canTake(k, who.role)) return { type: 4, data: priv({ content: 'That course isn’t open to you. Pick one from the list as you type.' }) };
    if (opt.public) { if (!k.public) return { type: 4, data: priv({ content: 'Only a public course can be posted for everyone. An admin can make it public on the Staff page.' }) };
      return { type: 4, data: { ...intro(k, `crs:s:${k.id}`), allowed_mentions: { parse: [] } } }; }   // in the channel, pinging nobody; each Start opens a private run
    return { type: 4, data: priv(intro(k, `crs:s:${k.id}`)) }; }
  const [, act, a, b, v] = id.split(':');
  if (act === 's') { const who = await H.courseUser(c, did); if (typeof who === 'string') return { type: 4, data: priv({ content: who }) };
    const k = courses.get(c.id, a, true); if (!courses.canTake(k, who.role)) return { type: 4, data: priv({ content: 'That course isn’t open to you.' }) };
    for (const [t, r] of runs) if (Date.now() - r.at > 3600e3) runs.delete(t);
    const r = { tok: randomBytes(6).toString('hex'), c, course: k, did, answers: [], i: 0, at: Date.now() }; runs.set(r.tok, r);
    const ephemeralStart = (x.message?.flags || 0) & EPHEMERAL;
    return ephemeralStart ? { type: 7, data: question(r) } : { type: 4, data: priv(question(r)) }; }
  const r = runs.get(a); if (!r || r.c.id !== c.id) return { type: 4, data: priv({ content: 'That course run has ended. Start it again with /course.' }) };
  if (r.did !== did) return { type: 4, data: priv({ content: 'This isn’t your course. Start your own with /course.' }) };   // only the person who started it is listened to
  r.at = Date.now();
  if (act === 'x') { runs.delete(r.tok); return { type: 7, data: { content: 'Stopped. Nothing was handed in.', embeds: [], components: [] } }; }
  if (+b !== r.i) return { type: 7, data: question(r) };
  if (act === 'w') return { type: 9, data: { custom_id: `crs:m:${r.tok}:${r.i}`, title: T(`Question ${r.i + 1}`, 45), components: [{ type: 1, components: [{ type: 4, custom_id: 'a', label: T(r.course.questions[r.i].q, 45), style: 2, max_length: 1500, required: true }] }] } };
  if (act === 'a') r.answers[r.i] = r.course.questions[r.i].type === 'choice' ? +v : v;
  else if (act === 'm') r.answers[r.i] = String(x.data?.components?.[0]?.components?.[0]?.value || '');
  else return { type: 7, data: question(r) };
  r.i++; return { type: 7, data: r.i < r.course.questions.length ? question(r) : await finish(r, x) }; };

export const handle = async x => { if (x.type === 1) return { type: 1 };
  if (![2, 3, 4, 5].includes(x.type)) return { type: 4, data: say('Oversite doesn’t do that yet.') };
  if (x.type !== 2 || x.data?.name === 'course') { const c = x.guild_id ? H.community(String(x.guild_id)) : null;
    if (!c) return x.type === 4 ? { type: 8, data: { choices: [] } } : { type: 4, data: say('This Discord isn’t linked to an Oversite server. Its owner links it in the server’s Settings, under Discord.') };
    if (c.suspended || !H.on(c) || !H.coursesOn(c)) return x.type === 4 ? { type: 8, data: { choices: [] } } : { type: 4, data: say('Courses are switched off on this server.') };
    if (x.type === 2 || x.type === 4 || String(x.data?.custom_id || '').startsWith('crs:')) return courseInteraction(x, c);
    return { type: 4, data: say('Oversite doesn’t do that yet.') }; }
  const c = x.guild_id ? H.community(String(x.guild_id)) : null;
  if (!c) return { type: 4, data: say('This Discord isn’t linked to an Oversite server. Its owner links it in the server’s Settings, under Discord.') };
  if (c.suspended) return { type: 4, data: say('This Oversite server is suspended.') };
  if (!H.on(c)) return { type: 4, data: say('This server has switched off Discord commands in its Oversite settings.') };
  const priv = x.data?.name === 'lookup', work = answer(x, c).catch(e => say('Something went wrong: ' + e.message));
  const quick = await Promise.race([work, new Promise(r => setTimeout(() => r(null), 2200))]); if (quick) return { type: 4, data: quick };
  work.then(d => fetch(`${DAPI}/webhooks/${x.application_id}/${x.token}/messages/@original`, { method: 'PATCH', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ ...d, flags: undefined }) })).catch(() => {});
  return { type: 5, data: { flags: priv ? EPHEMERAL : 0 } }; };
