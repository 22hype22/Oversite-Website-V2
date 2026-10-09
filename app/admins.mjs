// Site admins: the people who run Oversite itself (not a server's owner). Matched by Discord user ID, which never changes,
// so the account has to have Discord connected. SITE_ADMINS (comma separated IDs) replaces the default list.
const IDS = new Set((process.env.SITE_ADMINS || '787136885054111784').split(',').map(s => s.trim()).filter(Boolean));
export const isSiteAdmin = u => !!u?.discord_id && IDS.has(String(u.discord_id));
