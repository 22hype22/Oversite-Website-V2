// Oversite's image check: before a server owner's picture is shown to every player (the ID card's front and back), the oversite.shop
// side looks at it for nudity, hate symbols, slurs and gore. It fails closed: a picture that couldn't be checked is never saved.
// Uses the same secret as linking Oversite bots (app/bots.mjs), so there is nothing new to set up.
const CHECK_URL = process.env.OVERSITE_IMAGE_CHECK_URL || 'https://kqhyjxtylvigrezlxzpl.supabase.co/functions/v1/cad-image-check';
export const UNCHECKED = 'Couldn’t check the image right now. Try again in a few minutes.';
// { ok: true } when the picture may be kept, otherwise { error } with the reason the owner reads (the check's own words when it refused one)
export const checkImage = async (dataUrl, purpose, c) => { const secret = process.env.CAD_LINK_SECRET || ''; if (!secret) return { error: UNCHECKED };
  let x, r = {}; try { x = await fetch(CHECK_URL, { method: 'POST', signal: AbortSignal.timeout(20000), headers: { 'content-type': 'application/json', 'x-cad-link-secret': secret },
      body: JSON.stringify({ image: dataUrl, purpose, server: { slug: c.slug } }) }); r = await x.json().catch(() => ({})); }
  catch (e) { console.log(`image check: ${c.slug} ${purpose} unreachable (${e.name === 'TimeoutError' ? 'timed out' : e.message})`); return { error: UNCHECKED }; }
  if (x.status === 200 && r?.ok === true) return { ok: true };
  // a refusal (or the check's own limit) comes with a reason for the owner; anything else (503, a bad secret, a strange answer) counts as unchecked
  if ([200, 400, 429].includes(x.status) && r?.ok === false && r.reason) { console.log(`image check: ${c.slug} ${purpose} refused`); return { error: String(r.reason).slice(0, 240) }; }
  console.log(`image check: ${c.slug} ${purpose} not checked (${x.status})`); return { error: UNCHECKED }; };
