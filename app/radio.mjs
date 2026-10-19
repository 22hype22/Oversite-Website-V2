// Dispatch radio: push-to-talk channels in the CAD, one per department plus one for all units. Everyone on a channel keeps
// a connection to everyone else (WebRTC, browser to browser, like proximity voice); audio only flows while someone holds
// the talk button. This side relays the connection setup, says who joined or left, and keeps the floor: one talker at a time.
// Someone without an earpiece on their Roblox avatar has their radio out loud: people near them in game, in proximity voice,
// join the channel as listeners (they hear it, can't talk, and don't show as on the channel).
import { earpiece } from './earpiece.mjs';
export const CHANNELS = { pd: 'Police', fd: 'Fire', dot: 'DOT', all: 'All units' };
const ICE = () => { const s = [{ urls: ['stun:stun.l.google.com:19302', 'stun:stun1.l.google.com:19302'] }];
  if (process.env.VOICE_TURN_URL) s.push({ urls: process.env.VOICE_TURN_URL.split(','), username: process.env.VOICE_TURN_USER || '', credential: process.env.VOICE_TURN_PASS || '' }); return s; };
const rooms = new Map();   // `${community}:${channel}` -> { peers: Map<uid, { uid, name, unit, res }>, floor: { uid, name, at } | null }
const send = (res, ev, data) => { try { res.write(`event: ${ev}\ndata: ${JSON.stringify(data)}\n\n`); } catch (e) {} };
const all = (room, ev, data, except) => { for (const p of room.peers.values()) if (p.uid !== except) send(p.res, ev, data); };
const floorOf = room => room.floor && Date.now() - room.floor.at < 30000 ? room.floor : (room.floor = null);   // a stuck talk button lets go after 30 s

const idOf = (user, listen) => (listen ? 'L' : '') + user.id;   // a listener is a separate peer, so the same person can be on the radio and overhear another channel
export const join = (req, res, c, user, ch, unit, listen = false) => { const k = `${c.id}:${ch}`; let room = rooms.get(k); if (!room) rooms.set(k, room = { peers: new Map(), floor: null });
  const uid = idOf(user, listen), old = room.peers.get(uid); if (old) { send(old.res, 'replaced', {}); try { old.res.end(); } catch (e) {} }
  res.writeHead(200, { 'content-type': 'text/event-stream', 'cache-control': 'no-store', connection: 'keep-alive', 'x-accel-buffering': 'no' }); res.write('retry: 3000\n\n');
  const me = { uid, name: user.roblox_name || user.name || 'Unit', unit: String(unit || '').slice(0, 40), res, rid: user.roblox_id ? String(user.roblox_id) : '', listen, ear: null };
  send(res, 'hello', { you: uid, ice: ICE(), channel: ch, peers: [...room.peers.values()].map(p => ({ uid: p.uid, name: p.name, unit: p.unit, listen: p.listen })), floor: floorOf(room) });
  room.peers.set(uid, me); all(room, 'join', { uid, name: me.name, unit: me.unit, listen }, uid);
  if (!listen) earpiece(me.rid).then(v => { me.ear = v; send(res, 'ear', { ear: v }); });
  const ka = setInterval(() => res.write(': ping\n\n'), 15000);
  req.on('close', () => { clearInterval(ka); if (room.peers.get(uid) !== me) return; room.peers.delete(uid);
    if (room.floor?.uid === uid) { room.floor = null; all(room, 'talk', { uid, on: false }); }
    all(room, 'gone', { uid }); if (!room.peers.size) rooms.delete(k); }); };

// connection setup between two people on the same channel, never anything else
export const signal = (c, user, ch, to, data, listen = false) => { const room = rooms.get(`${c.id}:${ch}`), uid = idOf(user, listen);
  if (!room?.peers.has(uid)) return { error: 'Join the channel first.' }; const t = room.peers.get(String(to)); if (!t) return { error: 'They left.' };
  if (JSON.stringify(data || {}).length > 20000) return { error: 'Too big.' }; send(t.res, 'signal', { from: uid, data }); return { ok: true }; };

// press to talk: the floor is yours unless someone else has it; let go and it's free
export const talk = (c, user, ch, on) => { const room = rooms.get(`${c.id}:${ch}`), uid = String(user.id); if (!room?.peers.has(uid)) return { error: 'Join the channel first.' };
  const f = floorOf(room), me = room.peers.get(uid);
  if (on) { if (f && f.uid !== uid) return { busy: f.name }; room.floor = { uid, name: me.unit || me.name, at: Date.now() }; all(room, 'talk', { uid, name: room.floor.name, on: true }); return { ok: true }; }
  if (f?.uid === uid) { room.floor = null; all(room, 'talk', { uid, on: false }); } return { ok: true }; };
export const count = (cid, ch) => rooms.get(`${cid}:${ch}`)?.peers.size || 0;

// who has a radio on right now (not listeners), with where they can be found in game and whether it's out loud
export const speakers = cid => { const out = []; for (const [k, room] of rooms) { const [id, ch] = k.split(':'); if (+id !== +cid) continue;
  for (const p of room.peers.values()) if (!p.listen && p.rid) out.push({ rid: p.rid, ch, ear: p.ear }); } return out; };
