// Alerts to Oversite's owners: a Discord webhook (set on /admin, kept sealed like the Stripe keys) gets a message when
// something needs a person: a failed backup, a crash, a nearly full disk, ER:LC failing for many servers at once, a Stripe
// webhook failing. Each kind is sent at most once every half hour, so a problem that keeps happening doesn't flood the channel.
import { siteSettings, seal, unseal } from './db.mjs';

const hook = () => (process.env.ALERT_WEBHOOK || unseal(siteSettings.get('alert_hook')) || '').trim();
export const ready = () => !!hook();
export const okHook = u => /^https:\/\/(?:ptb\.|canary\.)?discord(?:app)?\.com\/api\/webhooks\/\d{5,30}\/[\w-]{20,120}$/.test(String(u || ''));
export const setHook = u => siteSettings.set('alert_hook', u ? seal(u) : '');
const last = new Map();
const COL = { crit: 0xE24B4B, warn: 0xE8B33A, info: 0x3FBF8A };

// a message to the channel; `kind` names what it's about (for the half-hour limit), `level` is crit, warn or info
export const send = async (kind, title, text, level = 'warn', force = false) => { const u = hook(); if (!u) return { error: 'No alert webhook is set.' };
  if (!force && Date.now() - (last.get(kind) || 0) < 30 * 60000) return { ok: true, skipped: true }; last.set(kind, Date.now());
  try { const r = await fetch(u, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ username: 'Oversite alerts',
      embeds: [{ title: String(title).slice(0, 240), description: String(text || '').slice(0, 3800), color: COL[level] || COL.warn, timestamp: new Date().toISOString() }] }) });
    if (!r.ok) return { error: `Discord answered ${r.status}.` }; return { ok: true }; } catch (e) { return { error: 'Discord could not be reached: ' + e.message }; } };

// a file for the channel (the daily backup), when it's small enough for Discord to take
export const sendFile = async (name, buf, text) => { const u = hook(); if (!u) return { error: 'No alert webhook is set.' }; if (buf.length > 24 * 1024 * 1024) return { error: 'The backup is too big for Discord (over 24 MB).' };
  const fd = new FormData(); fd.append('payload_json', JSON.stringify({ username: 'Oversite backups', content: text })); fd.append('files[0]', new Blob([buf]), name);
  try { const r = await fetch(u, { method: 'POST', body: fd }); return r.ok ? { ok: true } : { error: `Discord answered ${r.status}.` }; } catch (e) { return { error: 'Discord could not be reached: ' + e.message }; } };
