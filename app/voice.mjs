// Proximity voice: players open the server's voice page next to the game, and hear each other by how close they are in ER:LC.
// Audio goes straight between browsers (WebRTC); this side only relays the connection setup and, every second, tells each
// person who is near them, how far away, and whether either of them is driving (ER:LC doesn't say who sits in a vehicle,
// so anyone moving faster than a sprint counts as in one).
import { speakers } from './radio.mjs';
const RANGES = { short: 56, normal: 90, long: 134 };   // ER:LC map pixels (about 0.45 m each): roughly 25, 40 and 60 metres
export const voiceSettings = c => { const v = c.settings.voice || {}; return { on: !!v.on, range: RANGES[v.range] ? v.range : 'normal', muffle: v.muffle !== false }; };
export const rangePx = c => RANGES[voiceSettings(c).range];
const DRIVE = 22;                                     // px per second: faster than a sprint, so in a vehicle
const ICE = () => { const s = [{ urls: ['stun:stun.l.google.com:19302', 'stun:stun1.l.google.com:19302'] }];
  if (process.env.VOICE_TURN_URL) s.push({ urls: process.env.VOICE_TURN_URL.split(','), username: process.env.VOICE_TURN_USER || '', credential: process.env.VOICE_TURN_PASS || '' }); return s; };

const rooms = new Map();   // community id -> { peers: Map<rid, peer>, timer, keep, feed, c, last, moves }
const send = (res, ev, data) => { try { res.write(`event: ${ev}\ndata: ${JSON.stringify(data)}\n\n`); } catch (e) {} };

// where everyone is, from the feed's latest ER:LC reading; speed comes from the change since the previous reading
const positions = room => { const snap = room.feed.snap; if (!snap || snap.status !== 200) return room.last?.pos || new Map();
  if (room.last && room.last.t === snap.t) return room.last.pos;
  let j; try { j = JSON.parse(snap.body); } catch (e) { return room.last?.pos || new Map(); }
  const pos = new Map(), now = snap.t;
  for (const p of j.Players || []) { const L = p.Location, id = String(p.Player || '').split(':')[1]; if (!L || !id) continue;
    const prev = room.moves.get(id), x = L.LocationX, z = L.LocationZ;
    let veh = prev?.veh || false, vehAt = prev?.vehAt || 0;
    if (prev && now > prev.t) { const v = Math.hypot(x - prev.x, z - prev.z) / ((now - prev.t) / 1000); if (v > DRIVE) { veh = true; vehAt = now; } else if (v < 4 && now - vehAt > 6000) veh = false; }
    room.moves.set(id, { x, z, t: now, veh, vehAt }); pos.set(id, { x, z, veh, name: String(p.Player).split(':')[0] }); }
  room.last = { t: snap.t, pos }; return pos; };

const tick = room => { room.at = Date.now(); const range = rangePx(room.c), pos = positions(room), peers = [...room.peers.values()], radios = speakers(room.c.id);
  for (const me of peers) { const mp = pos.get(me.rid);
    // a radio out loud nearby (its holder has no earpiece): the nearest one on each channel, unless you're on that channel yourself
    const radio = []; if (mp) for (const s of radios) { if (s.ear === true || s.rid === me.rid || radios.some(o => o.rid === me.rid && o.ch === s.ch)) continue; const sp = pos.get(s.rid); if (!sp) continue;
      const d = Math.round(Math.hypot(sp.x - mp.x, sp.z - mp.z)); if (d > range) continue; const had = radio.find(x => x.ch === s.ch); if (had) had.d = Math.min(had.d, d); else radio.push({ ch: s.ch, d }); }
    for (const x of radio) me.hear.set(x.ch, Date.now());
    const near = !mp ? [] : peers.filter(o => o !== me && pos.has(o.rid)).map(o => { const op = pos.get(o.rid); return { rid: o.rid, name: o.name, d: Math.round(Math.hypot(op.x - mp.x, op.z - mp.z)), veh: op.veh, muted: o.muted }; })
      .filter(o => o.d <= range * 2.5).sort((a, b) => a.d - b.d).slice(0, 16);   // well past the range, so the call is already connected when they come within earshot
    send(me.res, 'near', { found: !!mp, veh: !!mp?.veh, range, muffle: voiceSettings(room.c).muffle, live: !!room.feed.snap && Date.now() - room.feed.snap.t < 15000, inVoice: peers.length, peers: near, radio }); } };
// may this player listen in on a channel: someone near them has it out loud (seen in the last few seconds)
export const canOverhear = (cid, user, ch) => Date.now() - (rooms.get(cid)?.peers.get(String(user.roblox_id))?.hear.get(ch) || 0) < 8000;

export const join = (req, res, c, user, feed) => {
  let room = rooms.get(c.id);
  if (!room) { room = { peers: new Map(), feed, c, last: null, moves: new Map(), at: 0 };
    // every new ER:LC reading goes out to everyone in voice the moment it lands, not on the next tick of a clock
    room.keep = { write(msg) { if (msg.startsWith('event: server') && Date.now() - room.at > 100) tick(room); } }; rooms.set(c.id, room);
    feed.clients.add(room.keep); feed.lastClient = Date.now(); feed.wake();   // keep ER:LC positions coming while anyone is in voice
    room.timer = setInterval(() => tick(room), 1000); }
  room.c = c; const rid = String(user.roblox_id), old = room.peers.get(rid); if (old) { send(old.res, 'replaced', {}); try { old.res.end(); } catch (e) {} }
  res.writeHead(200, { 'content-type': 'text/event-stream', 'cache-control': 'no-store', connection: 'keep-alive', 'x-accel-buffering': 'no' });
  res.write('retry: 3000\n\n'); const peer = { rid, name: user.roblox_name, res, muted: false, hear: new Map() }; room.peers.set(rid, peer);
  send(res, 'hello', { you: rid, ice: ICE() }); tick(room);
  const ka = setInterval(() => res.write(': ping\n\n'), 15000);
  req.on('close', () => { clearInterval(ka); if (room.peers.get(rid) === peer) room.peers.delete(rid);
    for (const o of room.peers.values()) send(o.res, 'gone', { rid });
    if (!room.peers.size) { clearInterval(room.timer); feed.clients.delete(room.keep); rooms.delete(c.id); } }); };

// connection setup between two people in the same room (offers, answers, network candidates), never anything else
export const signal = (c, user, to, data) => { const room = rooms.get(c.id), rid = String(user.roblox_id);
  if (!room || !room.peers.has(rid)) return { error: 'Join voice first.' }; const target = room.peers.get(String(to)); if (!target) return { error: 'They left.' };
  const j = JSON.stringify(data || {}); if (j.length > 20000) return { error: 'Too big.' };
  send(target.res, 'signal', { from: rid, data }); return { ok: true }; };
export const setMuted = (c, user, muted) => { const p = rooms.get(c.id)?.peers.get(String(user.roblox_id)); if (p) p.muted = !!muted; return { ok: true }; };
export const count = cid => rooms.get(cid)?.peers.size || 0;
