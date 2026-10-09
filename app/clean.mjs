// Keeps names people pick for their servers (name, address, bio, departments) free of slurs, swearing and sexual words.
// Text is folded first (case, look-alike numbers and symbols, spacing tricks like "f.u.c.k") so the easy dodges don't work.
// ROOTS are caught anywhere, even inside other words; WORDS only as a whole word, because they hide inside innocent ones
// ("class", "document", "Sussex", "analysis", "cocktail").
const ROOTS = ['fuck', 'fck', 'shit', 'bitch', 'cunt', 'nigg', 'nigga', 'niger', 'faggot', 'fagot', 'whore', 'slut', 'porn', 'pussy', 'penis', 'vagina',
  'retard', 'asshole', 'dildo', 'jizz', 'hentai', 'molest', 'pedophil', 'paedophil', 'rapist', 'tranny', 'kike', 'wetback', 'beaner', 'hitler', 'nazi', 'gestapo',
  'blowjob', 'handjob', 'cumshot', 'masturbat', 'orgasm', 'boobs', 'bollock', 'motherf', 'bastard', 'kkk', 'onlyfans', 'xxx'];
const WORDS = new Set(['ass', 'arse', 'fag', 'fags', 'cum', 'cock', 'cocks', 'dick', 'dicks', 'sex', 'sexy', 'anal', 'anus', 'tit', 'boob', 'rape', 'raped', 'raping',
  'pedo', 'pedos', 'nude', 'nudes', 'naked', 'milf', 'twat', 'chink', 'spic', 'gook', 'coon', 'dyke', 'negro', 'thot', 'hoe', 'hoes',
  'puss', 'fuk', 'horny', 'tits', 'wank', 'wanker', 'heil', 'damn', 'crap', 'piss', 'prick', 'clit', 'semen', 'nsfw', 'nazis', 'nig', 'nigs', 'kys']);
// some short names that contain a root are fine
const ALLOW = ['scunthorpe', 'cockburn', 'shitake', 'shiitake', 'therapist', 'grapist', 'nigeria', 'nigerian', 'dickens', 'bassett', 'hancock', 'peacock', 'babcock', 'woodcock'];

const LEET = { 0: 'o', 1: 'i', 2: 'z', 3: 'e', 4: 'a', 5: 's', 6: 'g', 7: 't', 8: 'b', 9: 'g', '@': 'a', '$': 's', '!': 'i', '|': 'i', '+': 't', '€': 'e', '£': 'l' };
const fold = t => String(t || '').normalize('NFKD').replace(/\p{M}/gu, '').toLowerCase().replace(/[0-9@$!|+€£]/g, c => LEET[c] || c);
const squeeze = t => t.replace(/(.)\1+/g, '$1');

// true when the text has something not allowed
export const rude = text => {
  let t = fold(text); for (const a of ALLOW) t = t.split(a).join(' ');
  const words = t.split(/[^a-z]+/).filter(Boolean);
  // letters split up to dodge the filter ("f u c k", "s.h.i.t") are glued back together
  const glued = words.reduce((o, w) => { if (w.length === 1) o[o.length - 1] += w; else o.push(w, ''); return o; }, ['']).filter(Boolean);
  return [...words, ...glued].some(w => { const l = squeeze(w);
    return WORDS.has(w) || WORDS.has(l) || ROOTS.some(r => w.includes(r) || (squeeze(r) === r && l.includes(r))); });
};

export const RUDE_MSG = 'That has a word that isn\'t allowed on Oversite. Please pick something else.';
