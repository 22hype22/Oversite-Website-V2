// A Premium person's own MDT setup, shared by the CAD and the MDT setup on the account page, so the preview there is exactly
// what the MDT plays and shows: the alert sounds (MdtSounds) and the tablet's accent, wallpaper and colour (MdtLook).
// Sounds:
// All drawn with Web Audio: nothing to download. At the default volume (90) they play exactly as loud as before. 'station' and 'erlc' are the sounds the MDT always had.
(() => {
  let ctx = null;
  const ac = () => { try { ctx = ctx || new (window.AudioContext || window.webkitAudioContext)(); if (ctx.state === 'suspended') ctx.resume(); } catch (e) {} return ctx; };
  // one tone: a quick fade in, held, a quick fade out, sliding from f1 to f2
  const tone = (c, out, t, f1, f2, d, g, type = 'square') => { const o = c.createOscillator(), e = c.createGain(); o.type = type; o.frequency.setValueAtTime(f1, t); o.frequency.linearRampToValueAtTime(f2, t + d);
    e.gain.setValueAtTime(0.0001, t); e.gain.exponentialRampToValueAtTime(g, t + Math.min(0.015, d / 4)); e.gain.setValueAtTime(g, t + Math.max(0.02, d - 0.03)); e.gain.exponentialRampToValueAtTime(0.0001, t + d);
    o.connect(e).connect(out); o.start(t); o.stop(t + d + 0.02); };
  const CALL = {
    station: (c, o, t, pri) => { for (let b = 0; b < (pri === 1 ? 3 : 2); b++) { const s = t + b * 0.75; tone(c, o, s, 740, 740, 0.16, 0.35); tone(c, o, s + 0.2, 880, 880, 0.16, 0.35); tone(c, o, s + 0.4, 1046, 1180, 0.26, 0.4); } },
    pager: (c, o, t, pri) => { for (let i = 0; i < (pri === 1 ? 8 : 4); i++) tone(c, o, t + i * 0.14, i % 2 ? 1050 : 1400, i % 2 ? 1050 : 1400, 0.11, 0.22); },
    chime: (c, o, t, pri) => { for (let r = 0; r < (pri === 1 ? 2 : 1); r++) [1318, 1046, 784].forEach((f, i) => tone(c, o, t + r * 1.1 + i * 0.22, f, f, 0.6, 0.5, 'sine')); },
    soft: (c, o, t, pri) => { for (let r = 0; r < (pri === 1 ? 2 : 1); r++) { tone(c, o, t + r * 0.5, 620, 880, 0.18, 0.45, 'sine'); tone(c, o, t + r * 0.5 + 0.2, 880, 880, 0.22, 0.4, 'sine'); } },
  };
  const PANIC = {
    erlc: (c, o, t) => { for (let i = 0; i < 8; i++) tone(c, o, t + i * 0.13, 1180, 1180, 0.08, 0.1); },
    siren: (c, o, t) => { const n = c.createOscillator(), e = c.createGain(); n.type = 'sawtooth';
      n.frequency.setValueAtTime(620, t); n.frequency.linearRampToValueAtTime(1350, t + 0.7); n.frequency.linearRampToValueAtTime(620, t + 1.4);
      e.gain.setValueAtTime(0.0001, t); e.gain.exponentialRampToValueAtTime(0.18, t + 0.05); e.gain.setValueAtTime(0.18, t + 1.3); e.gain.exponentialRampToValueAtTime(0.0001, t + 1.45);
      n.connect(e).connect(o); n.start(t); n.stop(t + 1.5); },
    klaxon: (c, o, t) => { for (let i = 0; i < 3; i++) { tone(c, o, t + i * 0.45, 440, 400, 0.34, 0.2, 'sawtooth'); tone(c, o, t + i * 0.45, 554, 520, 0.34, 0.12, 'square'); } },
  };
  const play = (set, kind, vol, ...a) => { const c = ac(); if (!c) return false;
    const go = () => { const m = c.createGain(); m.gain.value = Math.max(0, Math.min(100, vol ?? 100)) / 100; m.connect(c.destination); (set[kind] || Object.values(set)[0])(c, m, c.currentTime + 0.02, ...a); };
    if (c.state === 'running') go(); else c.resume().then(go, () => {}); return true; };
  window.MdtSounds = {
    CALL: { station: 'Station alert', pager: 'Pager', chime: 'Chime', soft: 'Soft' }, PANIC: { erlc: 'ER:LC beeps', siren: 'Siren', klaxon: 'Klaxon' },
    unlock: ac, call: (kind, pri, vol) => play(CALL, kind, vol, pri), panic: (kind, vol) => play(PANIC, kind, vol) };
  const ACC = { blue: '#4C8DFF', teal: '#2EC4B6', violet: '#8E7CF5', amber: '#F0A43A', gold: '#E8B33A', rose: '#F0607E' };
  const WALL = { grid: 'linear-gradient(rgba(255,255,255,.035) 1px,transparent 1px) 0 0/26px 26px,linear-gradient(90deg,rgba(255,255,255,.035) 1px,transparent 1px) 0 0/26px 26px,#0C0D0F',
    topo: 'repeating-radial-gradient(circle at 82% 14%,transparent 0 26px,rgba(255,255,255,.04) 27px 28px),repeating-radial-gradient(circle at 10% 92%,transparent 0 34px,rgba(255,255,255,.03) 35px 36px),#0C0D0F',
    carbon: 'repeating-linear-gradient(45deg,rgba(255,255,255,.028) 0 2px,transparent 2px 6px),repeating-linear-gradient(-45deg,rgba(0,0,0,.28) 0 2px,transparent 2px 6px),#111215',
    glow: 'radial-gradient(90% 70% at 100% 0,color-mix(in srgb,var(--fd) 20%,transparent),transparent 62%),radial-gradient(70% 60% at 0 100%,color-mix(in srgb,var(--fd) 10%,transparent),transparent 60%),#0C0D0F' };
  const FRAME = { silver: ['linear-gradient(145deg,#DADDE2,#9EA3AB)', '#B4B8BF'], gold: ['linear-gradient(145deg,#EBD08C,#B08A3E)', '#9C7A34'], white: ['#ECEDEF', '#D3D5D9'] };
  // the CSS for one setup; scr and tab are the selectors of the MDT's screen and of the tablet around it
  const css = (M, scr, tab) => { let c = ''; const a = ACC[M.accent], f = FRAME[M.frame];
    if (a) c += `${scr}{--fd:${a};--fd-soft:color-mix(in srgb,${a} 15%,transparent)}`;
    if (WALL[M.wall]) c += `${scr}{background:${WALL[M.wall]}}`;
    if (f) c += `${tab}{background:${f[0]};box-shadow:0 30px 70px rgba(0,0,0,.55),0 0 0 1px rgba(255,255,255,.25) inset,0 0 0 3px ${f[1]} inset}`;
    return c; };
  window.MdtLook = { ACC, WALL, FRAME, css,
    NAMES: { accent: { dept: 'Department', blue: 'Blue', teal: 'Teal', violet: 'Violet', amber: 'Amber', gold: 'Gold', rose: 'Rose' }, wall: { none: 'Plain', grid: 'Grid', topo: 'Contours', carbon: 'Carbon', glow: 'Glow' }, frame: { graphite: 'Graphite', silver: 'Silver', gold: 'Gold', white: 'White' } } };
})();
