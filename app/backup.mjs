// Backups: every hour a consistent copy of the whole database (SQLite's VACUUM INTO, safe while the site is running),
// gzipped into DATA/backups. The last 24 hourly copies and one a day for 14 days are kept. Site admins can download the
// latest from /admin, and with the off-site option on, the day's first copy goes to the alerts channel too, so a lost
// volume isn't a lost Oversite. Anything that goes wrong is an alert.
import { db, DB_FILE, siteSettings } from './db.mjs';
import { mkdirSync, readdirSync, statSync, unlinkSync, readFileSync, writeFileSync, existsSync, statfsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { gzipSync } from 'node:zlib';
import * as alerts from './alerts.mjs';

export const DIR = join(dirname(DB_FILE), 'backups');
const KEEP_HOURLY = 24, KEEP_DAILY = 14;
const stamp = d => d.toISOString().slice(0, 13).replace(/[-T]/g, '');   // 2026101614: year, month, day, hour (UTC)
export const list = () => { if (!existsSync(DIR)) return []; return readdirSync(DIR).filter(f => /^oversite-(hourly|daily)-\d{10}\.db\.gz$/.test(f))
  .map(f => { const s = statSync(join(DIR, f)); return { name: f, kind: f.includes('daily') ? 'daily' : 'hourly', size: s.size, at: s.mtimeMs }; }).sort((a, b) => b.at - a.at); };
export const offsite = () => siteSettings.get('backup_offsite') === '1';
export const setOffsite = on => siteSettings.set('backup_offsite', on ? '1' : '');

let running = false;
export const run = async (why = 'hourly') => { if (running) return { error: 'A backup is already running.' }; running = true;
  const now = new Date(), tmp = join(DIR, `.tmp-${process.pid}-${Date.now()}.db`);
  try { mkdirSync(DIR, { recursive: true });
    db.exec(`VACUUM INTO '${tmp.replace(/'/g, "''")}'`);
    const gz = gzipSync(readFileSync(tmp), { level: 9 }); unlinkSync(tmp);
    const day = stamp(now).slice(0, 8), haveDaily = list().some(b => b.kind === 'daily' && b.name.includes(`-daily-${day}`));
    const name = `oversite-hourly-${stamp(now)}.db.gz`; writeFileSync(join(DIR, name), gz);
    if (!haveDaily) writeFileSync(join(DIR, `oversite-daily-${stamp(now)}.db.gz`), gz);
    // keep the newest of each kind
    const all = list(); for (const b of [...all.filter(x => x.kind === 'hourly').slice(KEEP_HOURLY), ...all.filter(x => x.kind === 'daily').slice(KEEP_DAILY)]) unlinkSync(join(DIR, b.name));
    siteSettings.set('backup_last', JSON.stringify({ at: now.getTime(), size: gz.length, why }));
    console.log(`backup: ${name}, ${(gz.length / 1048576).toFixed(1)} MB`);
    if (!haveDaily && offsite()) { const r = await alerts.sendFile(`oversite-${stamp(now).slice(0, 8)}.db.gz`, gz, `Daily backup, ${now.toUTCString()}`);
      if (r.error) alerts.send('backup-offsite', 'Off-site backup didn’t send', r.error, 'warn'); }
    return { ok: true, name, size: gz.length }; }
  catch (e) { try { if (existsSync(tmp)) unlinkSync(tmp); } catch (x) {} console.log('backup failed:', e.message);
    alerts.send('backup', 'Backup failed', `The ${why} backup didn’t complete: ${e.message}`, 'crit'); return { error: e.message }; }
  finally { running = false; } };
export const latest = () => list()[0] || null;
export const file = name => { if (!/^oversite-(hourly|daily)-\d{10}\.db\.gz$/.test(name)) return null; const p = join(DIR, name); return existsSync(p) ? p : null; };

// how full the volume is, as a share from 0 to 1
export const disk = () => { try { const s = statfsSync(dirname(DB_FILE)); return { used: 1 - s.bavail / s.blocks, free: s.bavail * s.bsize, total: s.blocks * s.bsize }; } catch (e) { return null; } };

export const start = () => {
  setTimeout(() => run('startup'), 2 * 60000);
  setInterval(() => run('hourly'), 3600000);
  setInterval(() => { const d = disk(); if (d && d.used > 0.9) alerts.send('disk', 'The disk is nearly full', `${Math.round(d.used * 100)}% used, ${(d.free / 1048576).toFixed(0)} MB free. Backups and saving may start failing.`, 'crit'); }, 10 * 60000); };
