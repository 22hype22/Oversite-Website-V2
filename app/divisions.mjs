// Departments a server adds beside its three built-in ones (Law enforcement, Fire and EMS, Transportation): a Sheriff's Office next
// to the police, EMS next to the fire service. Each works like one of the three (its kind): the same MDT, calls and tools, under its
// own name, short name and units. Its players are the ones on an in-game team given to it (Sheriff → Sheriff's Office) or, on a team
// it shares with its built-in department (Fire, for EMS), the ones who pick one of its units in the MDT. One that works like Fire and
// EMS can take medical calls only, so EMS answers the EMS calls and the players who call for EMS.
// c.settings.divs = [{ id, kind, name, short, units, calls: 'all' | 'medical' }], c.settings.teamDiv = { <team>: id }
export const MAX = 4, KINDS = ['pd', 'fd', 'dot'];
const T = (v, n) => String(v ?? '').replace(/[\u0000-\u001f<>]/g, '').replace(/\s+/g, ' ').trim().slice(0, n);
export const list = c => (Array.isArray(c.settings.divs) ? c.settings.divs : []).filter(d => d && KINDS.includes(d.kind));
export const teamDiv = c => { const ids = new Set(list(c).map(d => d.id)), m = c.settings.teamDiv || {};
  return Object.fromEntries(Object.entries(m).filter(([t, id]) => ids.has(id) && t in (c.settings.teams || {}))); };

// the departments sent from Settings, checked; ids are kept for ones that already existed so players' unit picks still match
export const clean = (c, raw, rude) => { if (!Array.isArray(raw)) return { divs: list(c) }; if (raw.length > MAX) return { error: `A server can add up to ${MAX} departments.` };
  const old = new Set(list(c).map(d => d.id)), used = new Set(), divs = [];
  for (const x of raw) { const kind = KINDS.includes(x?.kind) ? x.kind : null, name = T(x?.name, 40), short = T(x?.short, 6).toUpperCase();
    if (!kind) return { error: 'Pick what each added department works like.' }; if (!name || !short) return { error: 'Every added department needs a name and a short name.' };
    const units = [...new Set((Array.isArray(x.units) ? x.units : String(x.units || '').split(',')).map(u => T(u, 40)).filter(Boolean))].slice(0, 20);
    if (units.some(u => u.length > 24)) return { error: 'Keep each unit name to 24 characters.' }; if ([name, short, ...units].some(v => rude(v))) return { rude: true };
    let id = old.has(x.id) && !used.has(x.id) ? x.id : ''; for (let i = 1; !id; i++) if (!old.has('d' + i) && !used.has('d' + i) && !raw.some(y => y?.id === 'd' + i)) id = 'd' + i;
    used.add(id); divs.push({ id, kind, name, short, units, calls: kind === 'fd' && x.calls === 'medical' ? 'medical' : 'all' }); }
  return { divs }; };
