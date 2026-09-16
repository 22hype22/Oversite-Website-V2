#!/usr/bin/env node
/**
 * ERLC terrain survey tracker.
 * Polls the ER:LC v2 API and logs your position every few seconds, with markers you add by pressing Enter.
 *
 *   ERLC_SERVER_KEY=xxxx node survey/track.js --player YourRobloxName [--interval 3] [--out survey/track.jsonl]
 *
 * While it runs: press Enter to drop a marker at your current position (type a note first if you like:  "tunnel entrance" + Enter).
 * Take your F12 screenshot at the same moment; the log carries a timestamp so the shot can be matched to the reading.
 * Ctrl+C to stop. Node 18 or newer, no dependencies. The server key never leaves your machine.
 */
const fs = require('fs');
const readline = require('readline');

const args = Object.fromEntries(process.argv.slice(2).map((a, i, arr) => a.startsWith('--') ? [a.slice(2), arr[i + 1] && !arr[i + 1].startsWith('--') ? arr[i + 1] : true] : []).filter(Boolean));
const KEY = process.env.ERLC_SERVER_KEY;
const PLAYER = (args.player || '').toLowerCase();
const INTERVAL = Math.max(2, Number(args.interval || 3)) * 1000;
const OUT = args.out || 'survey/track.jsonl';
const ALL = !!args.all;
if (!KEY) { console.error('Set ERLC_SERVER_KEY in the environment (your private server key). It is never written to the log.'); process.exit(1); }
if (!PLAYER && !ALL) { console.error('Pass --player <your Roblox username> (or --all to log everyone).'); process.exit(1); }

const out = fs.createWriteStream(OUT, { flags: 'a' });
const write = rec => out.write(JSON.stringify(rec) + '\n');
let last = null, count = 0, retryAt = 0;

async function poll() {
  if (Date.now() < retryAt) return;
  try {
    const res = await fetch('https://api.erlc.gg/v2/server?Players=true', { headers: { 'server-key': KEY, 'accept': 'application/json' } });
    if (res.status === 429) { const wait = Number(res.headers.get('retry-after') || 5); retryAt = Date.now() + wait * 1000; console.log(`rate limited, pausing ${wait}s`); return; }
    if (!res.ok) { console.log(`API ${res.status}: ${(await res.text()).slice(0, 200)}`); return; }
    const data = await res.json();
    const players = (data.Players || []).filter(p => ALL || String(p.Player || '').toLowerCase().startsWith(PLAYER + ':') || String(p.Player || '').toLowerCase() === PLAYER);
    if (!players.length) { console.log(`waiting: ${PLAYER || 'anyone'} not in server (${(data.Players || []).length} online)`); return; }
    const t = new Date().toISOString();
    for (const p of players) {
      const L = p.Location || {};
      const rec = { t, player: p.Player, team: p.Team, callsign: p.Callsign, x: L.LocationX, z: L.LocationZ, postal: L.PostalCode, street: L.StreetName, building: L.BuildingNumber };
      write(rec); last = rec; count++;
      console.log(`${t.slice(11, 19)}  x=${fmt(rec.x)}  z=${fmt(rec.z)}  postal=${rec.postal ?? '-'}  ${rec.street ?? ''} ${rec.building ?? ''}`.trim());
    }
  } catch (e) { console.log('request failed:', e.message); }
}
const fmt = n => (typeof n === 'number' ? n.toFixed(1) : '-');

const rl = readline.createInterface({ input: process.stdin });
rl.on('line', line => {
  if (!last) { console.log('no position yet, marker not saved'); return; }
  const rec = { ...last, t: new Date().toISOString(), marker: true, note: line.trim() || `stop ${++markerN}` };
  write(rec); console.log(`>>> MARKER "${rec.note}" at x=${fmt(rec.x)} z=${fmt(rec.z)} (postal ${rec.postal ?? '-'}) — take your screenshot now`);
});
let markerN = 0;
console.log(`Logging ${ALL ? 'all players' : PLAYER} every ${INTERVAL / 1000}s to ${OUT}. Press Enter (optionally after a note) to drop a marker. Ctrl+C to stop.`);
poll(); setInterval(poll, INTERVAL);
process.on('SIGINT', () => { console.log(`\nstopped after ${count} readings → ${OUT}`); out.end(); process.exit(0); });
