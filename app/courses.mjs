// Staff courses: training a server writes for its team (reading sections, then questions with a pass mark). Staff take them on
// the website or in Discord with /course; a course can be made public so any member of the server can take it. Multiple choice
// and yes/no questions mark themselves; written answers either match accepted answers the admin listed, or wait for an admin
// to mark them. Every attempt is kept, so the staff record shows who passed what and when.
import { db, users } from './db.mjs';
import { emit } from './events.mjs';

db.exec(`CREATE TABLE IF NOT EXISTS staff_courses (id INTEGER PRIMARY KEY, community_id INTEGER NOT NULL REFERENCES communities(id) ON DELETE CASCADE,
  title TEXT NOT NULL, about TEXT NOT NULL DEFAULT '', sections TEXT NOT NULL DEFAULT '[]', questions TEXT NOT NULL, pass INTEGER NOT NULL DEFAULT 80,
  public INTEGER NOT NULL DEFAULT 0, open INTEGER NOT NULL DEFAULT 1, created INTEGER NOT NULL, updated INTEGER NOT NULL);
CREATE TABLE IF NOT EXISTS staff_course_runs (id INTEGER PRIMARY KEY, course_id INTEGER NOT NULL REFERENCES staff_courses(id) ON DELETE CASCADE,
  community_id INTEGER NOT NULL REFERENCES communities(id) ON DELETE CASCADE, user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  answers TEXT NOT NULL, marks TEXT NOT NULL, score INTEGER NOT NULL, max INTEGER NOT NULL, status TEXT NOT NULL, via TEXT NOT NULL DEFAULT 'web',
  by_name TEXT, created INTEGER NOT NULL, decided INTEGER);
CREATE INDEX IF NOT EXISTS staff_course_runs_c ON staff_course_runs (course_id, status);
CREATE INDEX IF NOT EXISTS staff_course_runs_u ON staff_course_runs (community_id, user_id, created);`);
try { db.exec("ALTER TABLE staff_courses ADD COLUMN grad TEXT NOT NULL DEFAULT '{}'"); } catch (e) {}
const q = sql => db.prepare(sql);
const T = (v, n) => String(v ?? '').replace(/[\u0000-\u001f]+/g, ' ').trim().slice(0, n);
const TL = (v, n) => String(v ?? '').replace(/[\u0000-\u0009\u000b-\u001f]+/g, '').trim().slice(0, n);
const nameOf = u => u ? (u.roblox_name || u.name || 'Unknown') : 'Unknown';
const RANK = { member: 1, mod: 2, admin: 3, co_owner: 4, owner: 5 };
const DAY = 864e5, TRIES_A_DAY = 3;
export const QTYPES = { choice: 'Multiple choice', yesno: 'Yes or no', short: 'Written answer' };

// graduation: what is said when someone finishes, where results are posted (a Discord webhook), whether their answers go with it,
// and a second channel that logs every attempt with every answer. Messages fill in {user} {name} {course} {score} {max} {percent} {passmark}.
export const GRAD_DEFAULT = { announce: 'passed', hook: '', log: '', showAnswers: false,
  msgPass: '{user} passed **{course}** with {score}/{max} ({percent}%). Congratulations!',
  msgFail: '{user} did not pass **{course}** this time: {score}/{max} ({percent}%). The pass mark is {passmark}%.',
  msgMarking: 'Thanks {name}, your answers for **{course}** were sent in. An admin will mark them soon.' };
const okHook = u => (process.env.BOT_HOOKS_ALLOW_LOCAL === '1' && /^http:\/\/127\.0\.0\.1:\d+\//.test(String(u || ''))) || /^https:\/\/(?:ptb\.|canary\.)?discord(?:app)?\.com\/api\/webhooks\/\d{5,30}\/[\w-]{20,120}$/.test(String(u || ''));
const cleanGrad = g => { g = g && typeof g === 'object' ? g : {}; const hook = String(g.hook || '').trim(), log = String(g.log || '').trim();
  if (hook && !okHook(hook)) return { error: 'The graduation channel needs a Discord webhook link (channel settings, Integrations, Webhooks, Copy Webhook URL).' };
  if (log && !okHook(log)) return { error: 'The log channel needs a Discord webhook link.' };
  return { grad: { announce: ['passed', 'all', 'off'].includes(g.announce) ? g.announce : 'passed', hook, log, showAnswers: !!g.showAnswers,
    msgPass: TL(g.msgPass, 600) || GRAD_DEFAULT.msgPass, msgFail: TL(g.msgFail, 600) || GRAD_DEFAULT.msgFail, msgMarking: TL(g.msgMarking, 600) || GRAD_DEFAULT.msgMarking } }; };
const gradOf = row => ({ ...GRAD_DEFAULT, ...(() => { try { return JSON.parse(row.grad || '{}'); } catch (e) { return {}; } })() });
export const fill = (msg, v) => String(msg || '').replace(/\{(user|name|course|score|max|percent|passmark)\}/g, (m, k) => v[k] ?? m);

// ── writing a course (admins and up) ──
const cleanQs = qs => (Array.isArray(qs) ? qs : []).slice(0, 40).map(x => { const type = QTYPES[x?.type] ? x.type : 'choice', o = { q: TL(x?.q, 300), type, points: Math.max(1, Math.min(10, Math.round(+x?.points || 1))) };
  if (type === 'choice') { o.options = (Array.isArray(x.options) ? x.options : []).map(v => T(v, 100)).filter(Boolean).slice(0, 8); o.answer = Math.max(0, Math.min(o.options.length - 1, Math.round(+x.answer || 0))); }
  if (type === 'yesno') o.answer = x.answer === 'No' ? 'No' : 'Yes';
  if (type === 'short') o.accept = [...new Set((Array.isArray(x.accept) ? x.accept : String(x.accept || '').split(',')).map(v => T(v, 60).toLowerCase()).filter(Boolean))].slice(0, 12);
  return o; }).filter(x => x.q);
const cleanSections = ss => (Array.isArray(ss) ? ss : []).slice(0, 20).map(x => ({ title: T(x?.title, 80), body: TL(x?.body, 4000) })).filter(x => x.title || x.body);
const out = (c, admin) => c && { id: c.id, title: c.title, about: c.about, sections: JSON.parse(c.sections), pass: c.pass, public: !!c.public, open: !!c.open, created: c.created, updated: c.updated, ...(admin ? { grad: gradOf(c) } : {}),
  questions: JSON.parse(c.questions).map(x => admin ? x : { q: x.q, type: x.type, points: x.points, ...(x.type === 'choice' ? { options: x.options } : {}) }) };   // takers never see the answers
export const get = (cid, id, admin = false) => out(q('SELECT * FROM staff_courses WHERE id = ? AND community_id = ?').get(+id, cid), admin);
export const save = (c, role, j) => { if ((RANK[role] || 0) < RANK.admin) return { error: 'Only admins and up can write courses.' };
  const title = T(j.title, 70); if (!title) return { error: 'Give the course a title.' };
  const qs = cleanQs(j.questions); if (!qs.length) return { error: 'Add at least one question.' };
  const bad = qs.findIndex(x => x.type === 'choice' && x.options.length < 2); if (bad >= 0) return { error: `Question ${bad + 1} needs at least two answers to pick from.` };
  const G = cleanGrad(j.grad); if (G.error) return G;
  const about = TL(j.about, 600), sections = JSON.stringify(cleanSections(j.sections)), pass = Math.max(1, Math.min(100, Math.round(+j.pass || 80))), pub = j.public ? 1 : 0, open = j.open !== false ? 1 : 0, t = Date.now();
  if (j.id) { const r = q('UPDATE staff_courses SET title = ?, about = ?, sections = ?, questions = ?, pass = ?, public = ?, open = ?, grad = ?, updated = ? WHERE id = ? AND community_id = ?')
      .run(title, about, sections, JSON.stringify(qs), pass, pub, open, JSON.stringify(G.grad), t, +j.id, c.id); return r.changes ? { ok: true, id: +j.id } : { error: 'That course is gone.' }; }
  if (q('SELECT COUNT(*) AS n FROM staff_courses WHERE community_id = ?').get(c.id).n >= 30) return { error: 'A server can have up to 30 courses.' };
  return { ok: true, id: q('INSERT INTO staff_courses (community_id, title, about, sections, questions, pass, public, open, grad, created, updated) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)')
    .run(c.id, title, about, sections, JSON.stringify(qs), pass, pub, open, JSON.stringify(G.grad), t, t).lastInsertRowid }; };
export const remove = (c, role, id) => { if ((RANK[role] || 0) < RANK.co_owner) return { error: 'Only the owner and co-owners can delete a course and its results.' };
  q('DELETE FROM staff_courses WHERE id = ? AND community_id = ?').run(+id, c.id); return { ok: true }; };

// who may take it: staff (Mod and up) take every open course; any member takes public ones
export const canTake = (course, role) => !!course && course.open && ((RANK[role] || 0) >= RANK.mod || (course.public && (RANK[role] || 0) >= RANK.member));
const best = (cid, uid, courseId) => { const r = q("SELECT status, score, max, created FROM staff_course_runs WHERE community_id = ? AND user_id = ? AND course_id = ? ORDER BY (status = 'passed') DESC, created DESC LIMIT 1").get(cid, uid, courseId);
  return r ? { status: r.status, score: r.score, max: r.max, at: r.created } : null; };
// the courses someone sees: what they can take, with their own best result; admins also see closed courses and how many wait for marking
export const list = (c, user, role) => { const admin = (RANK[role] || 0) >= RANK.admin;
  return q('SELECT * FROM staff_courses WHERE community_id = ? ORDER BY id').all(c.id).map(x => out(x, false)).filter(x => admin || canTake(x, role)).map(x => ({
    id: x.id, title: x.title, about: x.about, public: x.public, open: x.open, pass: x.pass, questions: x.questions.length, sections: x.sections.length, mine: best(c.id, user.id, x.id),
    ...(admin ? { marking: q("SELECT COUNT(*) AS n FROM staff_course_runs WHERE course_id = ? AND status = 'marking'").get(x.id).n, taken: q('SELECT COUNT(DISTINCT user_id) AS n FROM staff_course_runs WHERE course_id = ?').get(x.id).n } : {}) })); };

// ── taking it ──
const norm = s => String(s || '').toLowerCase().replace(/[^a-z0-9 ]+/g, ' ').replace(/\s+/g, ' ').trim();
// marks: per question true/false (right or wrong), or null (a written answer an admin has to mark)
const grade = (course, answers) => { const marks = course.questions.map((x, i) => { const a = answers[i];
  if (x.type === 'choice') return +a === x.answer; if (x.type === 'yesno') return a === x.answer;
  return x.accept?.length ? x.accept.some(k => norm(a).includes(norm(k))) || null : null; });   // a written answer with no listed match still goes to an admin
  return marks; };
const total = (course, marks) => ({ score: course.questions.reduce((n, x, i) => n + (marks[i] === true ? x.points : 0), 0), max: course.questions.reduce((n, x) => n + x.points, 0) });
const verdict = (course, marks) => { const { score, max } = total(course, marks); return { score, max, status: marks.some(m => m === null) ? 'marking' : score * 100 >= course.pass * max ? 'passed' : 'failed' }; };
export const submit = (c, user, role, id, answers, via = 'web') => { const course = get(c.id, id, true); if (!canTake(course, role)) return { error: 'This course is closed, or not open to you.' };
  if (q("SELECT COUNT(*) AS n FROM staff_course_runs WHERE course_id = ? AND user_id = ? AND status = 'marking'").get(course.id, user.id).n) return { error: 'Your last attempt is waiting to be marked. Try again once it is.' };
  if (q('SELECT COUNT(*) AS n FROM staff_course_runs WHERE course_id = ? AND user_id = ? AND created > ?').get(course.id, user.id, Date.now() - DAY).n >= TRIES_A_DAY) return { error: `You can take a course ${TRIES_A_DAY} times a day at most.` };
  const A = Array.isArray(answers) ? answers : [], clean = course.questions.map((x, i) => x.type === 'short' ? TL(A[i], 1500) : x.type === 'choice' ? (Number.isInteger(+A[i]) && A[i] !== '' && A[i] != null ? +A[i] : null) : (['Yes', 'No'].includes(A[i]) ? A[i] : null));
  const miss = clean.findIndex(a => a === null || a === ''); if (miss >= 0) return { error: `Answer question ${miss + 1}.` };
  const marks = grade(course, clean), v = verdict(course, marks);
  const rid = q('INSERT INTO staff_course_runs (course_id, community_id, user_id, answers, marks, score, max, status, via, created, decided) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)')
    .run(course.id, c.id, user.id, JSON.stringify(clean), JSON.stringify(marks), v.score, v.max, v.status, via, Date.now(), v.status === 'marking' ? null : Date.now()).lastInsertRowid;
  emit(c.id, 'course.taken', { id: rid, course: course.id, title: course.title, user: user.id, name: nameOf(user), status: v.status, score: v.score, max: v.max, via });
  tell(course, user.id, { ...v, answers: clean, marks, via }, v.status !== 'marking');
  return { ok: true, run: rid, ...v, pass: course.pass, title: course.title, right: marks.map(m => m === null ? null : m), message: messageFor(course, user, v).replace(/<@\d+>/g, nameOf(user)) }; };

// ── posting to Discord: the graduation channel (by the course's choice) and the log channel (every attempt, every answer) ──
const clip = (s, n) => { s = String(s ?? ''); return s.length > n ? s.slice(0, n - 1) + '…' : s; };
const answerFields = (course, answers, marks) => course.questions.slice(0, 22).map((x, i) => ({ name: clip(`${i + 1}. ${x.q}`, 250),
  value: clip((x.type === 'choice' ? x.options?.[answers[i]] ?? '' : answers[i]) || '(no answer)', 900) + (marks[i] === true ? '  ✓' : marks[i] === false ? '  ✗' : '  (to mark)') }));
const post = (url, body) => fetch(url, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body), signal: AbortSignal.timeout(8000) }).then(r => r.ok || console.log(`courses: Discord answered ${r.status}`)).catch(e => console.log('courses:', e.message));
export const vars = (course, u, v) => ({ user: u?.discord_id ? `<@${u.discord_id}>` : nameOf(u), name: nameOf(u), course: course.title, score: v.score, max: v.max, percent: v.max ? Math.round(v.score * 100 / v.max) : 0, passmark: course.pass });
export const messageFor = (course, u, v) => { const g = course.grad || GRAD_DEFAULT; return fill(v.status === 'passed' ? g.msgPass : v.status === 'failed' ? g.msgFail : g.msgMarking, vars(course, u, v)); };
const tell = (course, uid, run, final, by) => { const g = course.grad; if (!g) return; const u = users.byId(uid), v = { score: run.score, max: run.max, status: run.status }, mention = u?.discord_id ? { users: [u.discord_id] } : { parse: [] };
  const colour = v.status === 'passed' ? 0x46D07C : v.status === 'failed' ? 0xE24B4B : 0xE9B04C, result = { passed: 'Passed', failed: 'Not passed', marking: 'Waiting for marking' }[v.status];
  if (final && g.hook && (g.announce === 'all' || (g.announce === 'passed' && v.status === 'passed')))
    post(g.hook, { username: 'Courses', content: clip(messageFor(course, u, v), 1900), allowed_mentions: mention,   // only the candidate is pinged, never a role
      embeds: g.showAnswers ? [{ title: clip(`${nameOf(u)}: ${course.title}`, 250), color: colour, fields: answerFields(course, run.answers, run.marks) }] : [] });
  if (g.log) post(g.log, { username: 'Course log', allowed_mentions: { parse: [] }, embeds: [{ title: clip(`${course.title}: ${nameOf(u)}`, 250), color: colour,
    description: `${result} · ${v.score}/${v.max} (${vars(course, u, v).percent}%, pass mark ${course.pass}%)${by ? ` · marked by ${by}` : ''} · ${run.via === 'discord' ? 'in Discord' : 'on the website'}${u?.discord_id ? ` · <@${u.discord_id}>` : ''}`,
    fields: answerFields(course, run.answers, run.marks), timestamp: new Date().toISOString() }] }); };

// ── results and marking (admins and up) ──
export const runs = (c, role, id) => { if ((RANK[role] || 0) < RANK.admin) return { error: 'Only admins and up can see course results.' }; const course = get(c.id, id, true); if (!course) return { error: 'That course is gone.' };
  return { course, runs: q(`SELECT r.*, u.roblox_name, u.name, u.roblox_id FROM staff_course_runs r JOIN users u ON u.id = r.user_id WHERE r.course_id = ? ORDER BY r.status = 'marking' DESC, r.created DESC LIMIT 300`).all(course.id)
    .map(r => ({ id: r.id, user: r.user_id, name: r.roblox_name || r.name, rid: r.roblox_id || '', answers: JSON.parse(r.answers), marks: JSON.parse(r.marks), score: r.score, max: r.max, status: r.status, via: r.via, by: r.by_name, at: r.created, decided: r.decided })) }; };
export const mark = (c, actor, role, runId, verdicts) => { if ((RANK[role] || 0) < RANK.admin) return { error: 'Only admins and up can mark courses.' };
  const r = q('SELECT * FROM staff_course_runs WHERE id = ? AND community_id = ?').get(+runId, c.id); if (!r) return { error: 'That attempt is gone.' };
  const course = get(c.id, r.course_id, true); if (!course) return { error: 'That course is gone.' };
  const marks = JSON.parse(r.marks), V = Array.isArray(verdicts) ? verdicts : [];
  for (let i = 0; i < marks.length; i++) if (marks[i] === null || (course.questions[i]?.type === 'short' && typeof V[i] === 'boolean')) { if (typeof V[i] === 'boolean') marks[i] = V[i]; }
  if (marks.some(m => m === null)) return { error: 'Mark every written answer right or wrong.' };
  const v = verdict(course, marks); q('UPDATE staff_course_runs SET marks = ?, score = ?, status = ?, by_name = ?, decided = ? WHERE id = ?').run(JSON.stringify(marks), v.score, v.status, nameOf(actor), Date.now(), r.id);
  emit(c.id, 'course.marked', { id: r.id, course: course.id, title: course.title, user: r.user_id, name: nameOf(users.byId(r.user_id)), status: v.status, score: v.score, max: v.max, by: nameOf(actor) });
  tell(course, r.user_id, { ...v, answers: JSON.parse(r.answers), marks, via: r.via }, true, nameOf(actor));
  return { ok: true, ...v }; };
// one person's course record, for their staff page
export const record = (cid, uid) => q(`SELECT r.id, r.course_id, r.status, r.score, r.max, r.created, c.title FROM staff_course_runs r JOIN staff_courses c ON c.id = r.course_id WHERE r.community_id = ? AND r.user_id = ? ORDER BY r.created DESC LIMIT 30`).all(cid, uid)
  .map(r => ({ id: r.id, course: r.course_id, title: r.title, status: r.status, score: r.score, max: r.max, at: r.created }));
