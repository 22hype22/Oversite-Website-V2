// Does a player wear an earpiece on their Roblox avatar (an earpiece, earbuds, a headset or headphones)? With one, only they hear
// their radio; without one, people near them in game hear it too. Read from Roblox: what the avatar wears, then each item's name.
// Item names never change, so they're kept; what someone wears is kept for ten minutes.
const EAR = /ear ?piece|ear ?bud|ear ?phone|head ?set|head ?phone|air ?pods?\b|bluetooth/i;
const WORN = new Map(), NAMES = new Map(), TTL = 600000;
const get = url => fetch(url, { signal: AbortSignal.timeout(6000), headers: { accept: 'application/json' } }).then(r => r.ok ? r.json() : null).catch(() => null);
const nameOf = async id => { if (NAMES.has(id)) return NAMES.get(id); const j = await get(`https://economy.roblox.com/v2/assets/${id}/details`);
  if (j && typeof j.Name === 'string') { NAMES.set(id, j.Name); if (NAMES.size > 20000) NAMES.clear(); } return j?.Name || ''; };

// true: wears one; false: doesn't; null: Roblox didn't answer (the radio then plays out loud, as without an earpiece)
export const earpiece = async rid => { rid = String(rid || ''); if (!/^\d{1,15}$/.test(rid)) return null;
  const c = WORN.get(rid); if (c && Date.now() - c.at < TTL) return c.v;
  const j = await get(`https://avatar.roblox.com/v1/users/${rid}/currently-wearing`); if (!j || !Array.isArray(j.assetIds)) return c ? c.v : null;
  const ids = j.assetIds.slice(0, 40).map(String); let v = false;
  for (let i = 0; i < ids.length && !v; i += 6) v = (await Promise.all(ids.slice(i, i + 6).map(nameOf))).some(n => EAR.test(n));
  WORN.set(rid, { v, at: Date.now() }); if (WORN.size > 5000) WORN.delete(WORN.keys().next().value); return v; };
