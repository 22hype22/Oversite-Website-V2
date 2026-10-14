// Oversite Premium: one plan per server, $5 a month or $30 a year, paid through Stripe by the server's owner or a co-owner.
// A server is Premium while settings.premium.until is in the future: Stripe keeps moving that date as the subscription renews,
// and a site admin can also grant it by hand. Premium also comes with 3 Explore ad credits a month and a bot API key.
import { createHmac, timingSafeEqual } from 'node:crypto';
import { communities, siteSettings, unseal, sha, token } from './db.mjs';

export const PLANS = { month: { price: 500, label: '$5 a month', interval: 'month' }, year: { price: 3000, label: '$30 a year', interval: 'year' } };
export const CREDITS_PER_MONTH = 3, BOOST_HOURS = 24, FREE_RECORD_DAYS = 30;
const FOREVER = 4102444800000;   // 2100-01-01: a grant with no end

const P = c => communities.byId(c.id)?.settings.premium || {};
export const isPremium = c => !!c && (P(c).until || 0) > Date.now();
const save = (cid, fn) => { const c = communities.byId(cid); if (!c) return null; const s = c.settings; s.premium = fn({ ...(s.premium || {}) }); communities.saveSettings(cid, s); return s.premium; };
const month = () => new Date().toISOString().slice(0, 7);

// what the owner sees in Settings and on the Premium page
export const info = c => { const p = P(c), on = isPremium(c), used = p.credits?.m === month() ? p.credits.used || 0 : 0;
  return { on, until: on ? p.until : 0, forever: on && p.until >= FOREVER, source: p.source || '', plan: p.plan || '', cancelling: !!p.cancel, billing: !!p.customer,
    credits: on ? Math.max(0, CREDITS_PER_MONTH - used) : 0, featured: (communities.byId(c.id)?.settings.profile?.featured_until || 0) > Date.now() ? communities.byId(c.id).settings.profile.featured_until : 0,
    botKey: !!p.bot, botHint: p.botHint || '' }; };

// a site admin turns Premium on (for N days, or for good) or off
export const grant = (cid, days, by) => save(cid, p => ({ ...p, until: days ? Date.now() + days * 864e5 : FOREVER, source: 'grant', plan: days ? `${days} days` : 'forever', by }));
export const revoke = cid => save(cid, p => ({ ...p, until: 0, source: '', plan: '', cancel: false }));

// ── Explore ads: a credit puts the server at the top of Explore, marked Featured, for 24 hours ──
export const boost = c => { if (!isPremium(c)) return { error: 'Explore boosts come with Premium.' };
  const cur = communities.byId(c.id), prof = cur.settings.profile || {};
  if ((prof.featured_until || 0) > Date.now()) return { error: 'This server is already featured. You can boost again when it ends.' };
  const p = P(c), m = month(), used = p.credits?.m === m ? p.credits.used || 0 : 0;
  if (used >= CREDITS_PER_MONTH) return { error: `You have used all ${CREDITS_PER_MONTH} boosts this month. They come back on the 1st.` };
  save(c.id, x => ({ ...x, credits: { m, used: used + 1 } }));
  const s = communities.byId(c.id).settings; s.profile = { ...(s.profile || {}), featured_until: Date.now() + BOOST_HOURS * 3600e3 }; communities.saveSettings(c.id, s);
  return { ok: true, ...info(c) }; };

// ── bot API: one key per server, shown once, stored hashed ──
export const newBotKey = c => { if (!isPremium(c)) return { error: 'Bot access comes with Premium.' };
  const key = 'ovs_' + token(32); save(c.id, p => ({ ...p, bot: sha(key), botHint: key.slice(-4) })); return { ok: true, key, ...info(c) }; };
export const dropBotKey = c => { save(c.id, p => ({ ...p, bot: '', botHint: '' })); return { ok: true, ...info(c) }; };
export const serverForBotKey = key => { if (!/^ovs_[A-Za-z0-9_-]{20,80}$/.test(key || '')) return null; const h = sha(key);
  return communities.all().find(c => c.settings.premium?.bot && c.settings.premium.bot.length === h.length && timingSafeEqual(Buffer.from(c.settings.premium.bot), Buffer.from(h))) || null; };

// ── Stripe ──
// keys come from STRIPE_SECRET_KEY / STRIPE_WEBHOOK_SECRET, or from the site admin page (sealed in the database)
const sk = () => (process.env.STRIPE_SECRET_KEY || unseal(siteSettings.get('stripe_key')) || '').trim();
const whsec = () => (process.env.STRIPE_WEBHOOK_SECRET || unseal(siteSettings.get('stripe_whsec')) || '').trim();
export const stripeReady = () => /^(sk|rk)_(live|test)_/.test(sk());
export const stripeStatus = () => ({ ready: stripeReady(), live: /^(sk|rk)_live_/.test(sk()), webhook: !!whsec(), portal: !!siteSettings.get('stripe_portal'), fromEnv: !!process.env.STRIPE_SECRET_KEY });
const form = (o, pre = '', out = []) => { for (const [k, v] of Object.entries(o)) { const key = pre ? `${pre}[${k}]` : k; if (v == null) continue;
  if (typeof v === 'object') form(v, key, out); else out.push(encodeURIComponent(key) + '=' + encodeURIComponent(v)); } return out.join('&'); };
const stripe = async (method, path, body) => { const r = await fetch('https://api.stripe.com/v1' + path, { method, headers: { authorization: 'Bearer ' + sk(), 'content-type': 'application/x-www-form-urlencoded' }, body: body ? form(body) : undefined });
  const j = await r.json().catch(() => ({})); if (!r.ok) throw new Error(j.error?.message || `Stripe answered ${r.status}`); return j; };

// a Checkout page for this server; the price is set here, so nothing has to be made in the Stripe dashboard first
export const checkout = async (c, user, plan, origin) => { if (!stripeReady()) return { error: 'Payments are not switched on yet. Ask Oversite support to turn on Premium for your server.' };
  const pl = PLANS[plan]; if (!pl) return { error: 'Pick monthly or yearly.' };
  if (isPremium(c) && P(c).source === 'stripe' && !P(c).cancel) return { error: 'This server already has Premium. Manage it from Settings.' };
  const p = P(c), meta = { community_id: String(c.id), slug: c.slug, user_id: String(user.id) };
  const s = await stripe('POST', '/checkout/sessions', { mode: 'subscription', client_reference_id: String(c.id), ...(p.customer ? { customer: p.customer } : {}), metadata: meta, subscription_data: { metadata: meta },
    line_items: { 0: { quantity: 1, price_data: { currency: 'usd', unit_amount: pl.price, recurring: { interval: pl.interval }, product_data: { name: `Oversite Premium for ${c.name}`.slice(0, 120) } } } },
    allow_promotion_codes: 'true', success_url: `${origin}/c/${c.slug}/premium/done?session_id={CHECKOUT_SESSION_ID}`, cancel_url: `${origin}/${c.slug}/settings#premium` });
  return { ok: true, url: s.url }; };

const periodEnd = sub => (sub.current_period_end || sub.items?.data?.[0]?.current_period_end || 0) * 1000;
// a subscription's state, written onto its server
export const applySub = sub => { const cid = +(sub?.metadata?.community_id || 0); if (!cid || !communities.byId(cid)) return null;
  const end = periodEnd(sub), live = ['active', 'trialing', 'past_due'].includes(sub.status), interval = sub.items?.data?.[0]?.price?.recurring?.interval || '';
  return save(cid, p => ({ ...p, source: 'stripe', sub: sub.id, customer: typeof sub.customer === 'string' ? sub.customer : sub.customer?.id || p.customer, plan: interval === 'year' ? 'year' : 'month',
    cancel: !!sub.cancel_at_period_end, until: live ? end + 2 * 864e5 : Math.min(p.until || 0, Date.now()) })); };   // two days' grace for a late renewal

// back from Checkout: look the session up rather than trust the link
export const confirm = async (c, sessionId) => { if (!stripeReady() || !/^cs_[A-Za-z0-9_]+$/.test(sessionId || '')) return { error: 'That payment link is not valid.' };
  const s = await stripe('GET', `/checkout/sessions/${sessionId}?expand[]=subscription`);
  if (String(s.metadata?.community_id) !== String(c.id)) return { error: 'That payment was for a different server.' };
  if (s.status !== 'complete' || !s.subscription) return { error: 'The payment has not gone through yet. If you were charged, it will switch on within a few minutes.' };
  applySub(typeof s.subscription === 'string' ? await stripe('GET', `/subscriptions/${s.subscription}`) : s.subscription); return { ok: true }; };

// Stripe's own page for changing the card, switching plans or cancelling
export const portal = async (c, origin) => { const p = P(c); if (!stripeReady() || !p.customer) return { error: 'This server has no subscription to manage.' };
  const conf = siteSettings.get('stripe_portal'); const s = await stripe('POST', '/billing_portal/sessions', { customer: p.customer, return_url: `${origin}/${c.slug}/settings#premium`, ...(conf ? { configuration: conf } : {}) }); return { ok: true, url: s.url }; };
// one click after the secret key is saved: Oversite makes its own webhook (and keeps the signing secret, which Stripe shows only now)
// and its own billing page settings, so nothing has to be done by hand in the Stripe dashboard
export const setupStripe = async (origin, seal) => { if (!stripeReady()) return { error: 'Save the Stripe secret key first.' };
  const url = `${origin}/api/stripe/webhook`, events = ['checkout.session.completed', 'customer.subscription.created', 'customer.subscription.updated', 'customer.subscription.deleted', 'invoice.paid', 'invoice.payment_failed'];
  const mine = (await stripe('GET', '/webhook_endpoints?limit=100')).data.filter(w => w.url === url);
  for (const w of mine) await stripe('DELETE', `/webhook_endpoints/${w.id}`);   // an old one's secret can't be read back, so replace it
  const w = await stripe('POST', '/webhook_endpoints', { url, enabled_events: Object.fromEntries(events.map((e, i) => [i, e])), description: 'Oversite Premium' });
  siteSettings.set('stripe_whsec', seal(w.secret));
  const pc = await stripe('POST', '/billing_portal/configurations', { business_profile: { headline: 'Oversite Premium', privacy_policy_url: `${origin}/privacy`, terms_of_service_url: `${origin}/terms` },
    features: { subscription_cancel: { enabled: 'true', mode: 'at_period_end' }, payment_method_update: { enabled: 'true' }, invoice_history: { enabled: 'true' } } });
  siteSettings.set('stripe_portal', pc.id); return { ok: true, ...stripeStatus() }; };

// webhook: the signature is checked against the raw body before anything is believed
export const webhook = async (raw, sig) => { const secret = whsec(); if (!secret) return { error: 'Webhook secret not set.', status: 400 };
  const parts = Object.fromEntries(String(sig || '').split(',').map(x => x.split('=')).filter(x => x.length === 2)), t = +parts.t;
  const want = createHmac('sha256', secret).update(`${parts.t}.${raw}`).digest('hex'), got = String(sig || '').split(',').filter(x => x.startsWith('v1=')).map(x => x.slice(3));
  if (!t || Math.abs(Date.now() / 1000 - t) > 300 || !got.some(g => g.length === want.length && timingSafeEqual(Buffer.from(g), Buffer.from(want)))) return { error: 'Bad signature.', status: 400 };
  let ev; try { ev = JSON.parse(raw); } catch (e) { return { error: 'Bad body.', status: 400 }; }
  const o = ev.data?.object || {};
  if (ev.type?.startsWith('customer.subscription.')) applySub(o);
  else if (ev.type === 'checkout.session.completed' && o.subscription) applySub(await stripe('GET', `/subscriptions/${o.subscription}`));
  else if ((ev.type === 'invoice.paid' || ev.type === 'invoice.payment_failed') && (o.subscription || o.parent?.subscription_details?.subscription)) applySub(await stripe('GET', `/subscriptions/${o.subscription || o.parent.subscription_details.subscription}`));
  return { ok: true }; };
