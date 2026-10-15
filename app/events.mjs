// Everything that happens on a server, as one stream of events (shift started, application received, ...). Bot connections
// (webhooks to a server's own roleplay, dispatch and department bots) will subscribe here; until then the last few hundred
// per server are kept in memory, so the feed can be shown and a newly connected bot can catch up.
const RECENT = new Map(), listeners = new Set(), KEEP = 300;

export const emit = (cid, type, data = {}) => { const e = { type, at: Date.now(), ...data };
  const L = RECENT.get(cid) || []; L.unshift(e); if (L.length > KEEP) L.length = KEEP; RECENT.set(cid, L);
  for (const f of listeners) { try { f(cid, e); } catch (x) {} } return e; };
export const on = f => { listeners.add(f); return () => listeners.delete(f); };
export const recent = (cid, n = 50) => (RECENT.get(cid) || []).slice(0, n);
