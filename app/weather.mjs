// Real weather for the Civilian phone's weather widget, where the server is: the place its owner set (Settings app on the phone),
// or, until then, a guess from the server's name ("Florida State Roleplay" is Florida) or its country. Places and weather come from
// Open-Meteo (free, no key), looked up here so the page never calls out itself, and kept 15 minutes per server.
// Settings: c.settings.weather = { name, lat, lon }
import { communities } from './db.mjs';

const GEO = 'https://geocoding-api.open-meteo.com/v1/search', API = 'https://api.open-meteo.com/v1/forecast';
const STATES = ['Alabama', 'Alaska', 'Arizona', 'Arkansas', 'California', 'Colorado', 'Connecticut', 'Delaware', 'Florida', 'Georgia', 'Hawaii', 'Idaho',
  'Illinois', 'Indiana', 'Iowa', 'Kansas', 'Kentucky', 'Louisiana', 'Maine', 'Maryland', 'Massachusetts', 'Michigan', 'Minnesota', 'Mississippi', 'Missouri',
  'Montana', 'Nebraska', 'Nevada', 'New Hampshire', 'New Jersey', 'New Mexico', 'New York', 'North Carolina', 'North Dakota', 'Ohio', 'Oklahoma', 'Oregon',
  'Pennsylvania', 'Rhode Island', 'South Carolina', 'South Dakota', 'Tennessee', 'Texas', 'Utah', 'Vermont', 'Virginia', 'Washington', 'West Virginia',
  'Wisconsin', 'Wyoming', 'Atlanta', 'Chicago', 'Los Angeles', 'Miami', 'Houston', 'Dallas', 'Phoenix', 'Seattle', 'Boston', 'Detroit', 'Denver', 'Las Vegas',
  'Nashville', 'Orlando', 'Tampa', 'Austin', 'San Diego', 'San Francisco', 'Philadelphia', 'Baltimore', 'New Orleans', 'Toronto', 'London', 'Liverpool'];
// a state's weather is its biggest or best-known city's; the search finds cities, not states
const CITY = { Florida: 'Orlando', Georgia: 'Atlanta, Georgia', California: 'Los Angeles', Texas: 'Dallas', 'New York': 'New York City', Washington: 'Seattle',
  Virginia: 'Richmond, Virginia', 'West Virginia': 'Charleston, West Virginia', 'North Carolina': 'Charlotte', 'South Carolina': 'Columbia, South Carolina',
  'North Dakota': 'Fargo', 'South Dakota': 'Sioux Falls', 'New Jersey': 'Newark', 'New Hampshire': 'Manchester, New Hampshire', 'New Mexico': 'Albuquerque',
  'Rhode Island': 'Providence', Massachusetts: 'Boston', Pennsylvania: 'Philadelphia', Michigan: 'Detroit', Illinois: 'Chicago', Ohio: 'Columbus, Ohio',
  Tennessee: 'Nashville', Louisiana: 'New Orleans', Nevada: 'Las Vegas', Arizona: 'Phoenix', Colorado: 'Denver', Oregon: 'Portland, Oregon', Minnesota: 'Minneapolis',
  Missouri: 'St. Louis', Maryland: 'Baltimore', Kentucky: 'Louisville', Indiana: 'Indianapolis', Wisconsin: 'Milwaukee', Alabama: 'Birmingham, Alabama',
  Mississippi: 'Jackson, Mississippi', Arkansas: 'Little Rock', Oklahoma: 'Oklahoma City', Kansas: 'Wichita', Nebraska: 'Omaha', Iowa: 'Des Moines', Utah: 'Salt Lake City',
  Idaho: 'Boise', Montana: 'Billings', Wyoming: 'Cheyenne', Alaska: 'Anchorage', Hawaii: 'Honolulu', Maine: 'Portland, Maine', Vermont: 'Burlington, Vermont',
  Connecticut: 'Hartford', Delaware: 'Wilmington, Delaware' };
const BY_REGION = { us: 'New York City', ca: 'Toronto', uk: 'London', eu: 'Brussels', de: 'Berlin', nl: 'Amsterdam', fr: 'Paris', cz: 'Prague', pl: 'Warsaw',
  au: 'Sydney', nz: 'Auckland', br: 'São Paulo', mx: 'Mexico City', es: 'Madrid', it: 'Rome', se: 'Stockholm', no: 'Oslo', dk: 'Copenhagen', fi: 'Helsinki',
  ie: 'Dublin', pt: 'Lisbon', tr: 'Istanbul', in: 'Mumbai', ph: 'Manila', sg: 'Singapore', jp: 'Tokyo', kr: 'Seoul', za: 'Johannesburg' };
const FAHRENHEIT = new Set(['US', 'LR', 'MM', 'BS', 'BZ', 'KY', 'PW']);

const get = async (url) => { const r = await fetch(url, { signal: AbortSignal.timeout(8000), headers: { 'user-agent': 'Oversite CAD (oversitescad.com)' } });
  if (!r.ok) throw new Error('weather service answered ' + r.status); return r.json(); };
// a place by name: { name, lat, lon, cc } or null
export const find = async q => { q = String(q || '').trim().slice(0, 80); if (!q) return null;
  const [city, ...rest] = q.split(','), want = rest.join(',').trim().toLowerCase();
  const j = await get(`${GEO}?name=${encodeURIComponent(city.trim())}&count=10&language=en&format=json`); const L = j.results || [];
  const r = (want && L.find(x => [x.admin1, x.country, x.country_code].some(v => String(v || '').toLowerCase() === want || String(v || '').toLowerCase().startsWith(want)))) || L[0];
  return r ? { name: [r.name, r.country_code === 'US' ? r.admin1 : r.country].filter(Boolean).join(', '), lat: r.latitude, lon: r.longitude, cc: r.country_code } : null; };
const guess = c => { const n = ` ${String(c.name || '')} `; const hit = STATES.filter(s => new RegExp(`[^a-z]${s}[^a-z]`, 'i').test(n)).sort((a, b) => b.length - a.length)[0];
  return hit ? CITY[hit] || hit : BY_REGION[c.settings.profile?.region] || 'New York City'; };
const where = async c => { const w = c.settings.weather; if (w && Number.isFinite(w.lat)) return { ...w, set: true };
  const k = 'g:' + guess(c); if (!PLACES.has(k)) PLACES.set(k, await find(guess(c))); const p = PLACES.get(k); return p ? { ...p, set: false } : null; };
const PLACES = new Map(), CACHE = new Map();

// the weather now where the server is: { place, set, temp, unit, code, day, hi, lo, text }
export const now = async c => { const p = await where(c); if (!p) return { error: 'No place for the weather yet.' };
  const key = `${c.id}:${p.lat},${p.lon}`, hit = CACHE.get(key); if (hit && Date.now() - hit.at < 15 * 60000) return hit.v;
  const f = FAHRENHEIT.has(p.cc), j = await get(`${API}?latitude=${p.lat}&longitude=${p.lon}&current=temperature_2m,weather_code,is_day&daily=temperature_2m_max,temperature_2m_min&timezone=auto&forecast_days=1${f ? '&temperature_unit=fahrenheit' : ''}`);
  const v = { place: p.name.split(',')[0], full: p.name, set: p.set, temp: Math.round(j.current?.temperature_2m), unit: f ? 'F' : 'C', code: j.current?.weather_code ?? 0, day: !!j.current?.is_day,
    hi: Math.round(j.daily?.temperature_2m_max?.[0]), lo: Math.round(j.daily?.temperature_2m_min?.[0]), text: TEXT(j.current?.weather_code ?? 0) };
  CACHE.set(key, { at: Date.now(), v }); return v; };
// the owner sets where the server is (empty: back to the guess)
export const setPlace = async (c, q) => { const st = communities.byId(c.id).settings;
  if (!String(q || '').trim()) { delete st.weather; communities.saveSettings(c.id, st); c.settings.weather = undefined; return { ok: true }; }
  const p = await find(q); if (!p) return { error: `Couldn't find "${String(q).slice(0, 40)}". Try a city, like "Miami" or "Atlanta, Georgia".` };
  st.weather = p; communities.saveSettings(c.id, st); c.settings.weather = p; return { ok: true }; };
// WMO weather codes, in words
const TEXT = c => c === 0 ? 'Clear' : c <= 2 ? 'Partly Cloudy' : c === 3 ? 'Cloudy' : c <= 48 ? 'Foggy' : c <= 57 ? 'Drizzle' : c <= 67 ? 'Rain' : c <= 77 ? 'Snow'
  : c <= 82 ? 'Showers' : c <= 86 ? 'Snow Showers' : 'Thunderstorms';
