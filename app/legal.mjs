// Oversite CAD's Terms of Service and Privacy Policy. Every section opens with a plain-language "In short" so people can see
// what they are agreeing to without reading legal text; the full wording follows. Edit the text here; pages.mjs only lays it out.
export const UPDATED = 'October 9, 2026';
const CONTACT = '<a href="mailto:support@oversite.shop">support@oversite.shop</a>';

export const DOCS = {
  terms: {
    title: 'Terms of Service', path: '/terms',
    intro: 'These terms are the rules for using Oversite CAD. We have kept them short and in plain language. Each section starts with a summary, then the details.',
    sections: [
      { id: 'about', h: 'Who we are', short: 'Oversite CAD is a dispatch tool for ER:LC private servers, run by Oversite.',
        body: `<p>Oversite CAD ("Oversite", "we", "us") is a computer-aided dispatch (CAD) and MDT website for Emergency Response: Liberty County (ER:LC) private servers, available at oversitescad.com. It is run by Oversite (Oversite Marketplace, Minnesota, United States). By signing in or using the site you agree to these terms and to our <a href="/privacy">Privacy Policy</a>. If you do not agree, please do not use Oversite CAD.</p>` },
      { id: 'notaffiliated', h: 'We are independent', short: 'We are not part of Roblox, Police Roleplay Community (the makers of ER:LC) or Discord.',
        body: `<p>Oversite CAD is an independent project. It is not made, endorsed or supported by Roblox Corporation, Police Roleplay Community (PRC), or Discord Inc. "Roblox", "ER:LC", "Emergency Response: Liberty County" and "Discord" are the names and trademarks of their owners. When you use Oversite you must also follow the Roblox Terms of Use, the ER:LC and PRC API rules, and the Discord Terms of Service.</p>` },
      { id: 'age', h: 'Who can use it', short: 'You need to be at least 13 years old.',
        body: `<p>You must be at least 13 years old to use Oversite CAD, which is the same minimum age Discord uses. If you are under the age of majority where you live, you should have a parent or guardian's permission. If we learn that someone under 13 has an account, we will delete it.</p>` },
      { id: 'account', h: 'Your account', short: 'Link your own Roblox account, keep your codes private, and you are responsible for what happens on your account.',
        body: `<ul><li>To open a CAD you must link a Roblox account that belongs to you. Linking someone else's account, or pretending to be someone else, is not allowed.</li>
<li>Owner codes, member codes and invite links work like passwords for a server. Keep them private. Anyone who has an owner code can control that server's settings.</li>
<li>You are responsible for what is done with your account and your codes. Tell us at ${CONTACT} if you think your account has been taken over.</li></ul>` },
      { id: 'servers', h: 'Running a server on Oversite', short: 'Owners are responsible for their server, its key, its members and what its staff do.',
        body: `<ul><li>When you create a server you confirm you are allowed to manage it, and that you have the right to connect its ER:LC server key and Discord server.</li>
<li>Your server key is stored encrypted and is only used to read your server's live data and run the commands your staff choose. You can disconnect it at any time in Settings.</li>
<li>You decide who becomes owner, co-owner, admin, mod or member, and which Discord roles give staff tools. You are responsible for the people you give those powers to.</li>
<li>New servers need a connected Discord server. The Oversite bot only reads your server's roles and member count; it does not read messages.</li></ul>` },
      { id: 'staff', h: 'Staff tools and logs', short: 'Staff actions really happen in game, they are signed with the staff member\'s Roblox name, and the command log can never be deleted.',
        body: `<ul><li>Warnings, kicks, bans, unbans, messages and announcements sent from the Staff MDT are real commands in your ER:LC server. Use them fairly and follow your own server's rules.</li>
<li>Every action is signed with the Roblox name of the person who did it, so it can always be traced.</li>
<li>The owner and co-owners can delete staff records (warnings, kicks, bans and notes). The command history, which lists every command that ran in game, is kept for good and cannot be deleted by anyone on the server. This keeps staff accountable.</li>
<li>Misusing staff tools to harass players, or banning people without reason, can lead to the server being removed from Oversite.</li></ul>` },
      { id: 'explore', h: 'Explore, listings and votes', short: 'Listing is optional and public. Keep it honest, and vote fairly: one person, one vote every 12 hours.',
        body: `<ul><li>Listing a server on the Explore page is optional. A listed server shows its name, icon, bio, Discord invite, owner's Roblox name, player count and ER:LC join code to anyone who is signed in.</li>
<li>Listings must be accurate. No misleading names or descriptions, no impersonating other servers, and nothing hateful, sexual or illegal in names, bios or icons.</li>
<li>Each person can vote for a server once every 12 hours. Using alternate accounts, bots, scripts, or offering rewards in exchange for votes is not allowed. We may remove votes or listings that break this rule.</li>
<li>We may change how servers are ranked, and we may hide or remove any listing.</li></ul>` },
      { id: 'conduct', h: 'Things you must not do', short: 'Do not break the site, abuse it, or use it to hurt anyone.',
        body: `<ul><li>Do not try to break into accounts, servers or our systems, or get around security, rate limits or the preview lock.</li>
<li>Do not overload the site, scrape it, or use automated tools against it beyond normal use.</li>
<li>Do not use Oversite to harass, threaten, dox or discriminate against anyone.</li>
<li>Do not upload content you do not have the right to use, or anything illegal.</li>
<li>Do not resell, copy or rebrand Oversite CAD.</li></ul>` },
      { id: 'content', h: 'Your content', short: 'What you add stays yours; you let us show it so the site works.',
        body: `<p>Server names, bios, icons, notes, reports and other things you add ("your content") stay yours. You give Oversite permission to store and show your content as needed to run the site, for example showing a listed server's bio on the Explore page. You confirm you have the right to share it. We may remove content that breaks these terms.</p>` },
      { id: 'availability', h: 'Availability and changes', short: 'Oversite CAD is still growing. Features can change and the site can be down sometimes.',
        body: `<p>Oversite CAD is provided "as is" and "as available". It is in active development and currently in private preview, so features may change, move or be removed, and the site may sometimes be unavailable. Live data depends on Roblox, ER:LC and Discord, which we do not control. Oversite CAD is a roleplay tool for a game: never use it for real emergencies. In a real emergency, call your local emergency number.</p>` },
      { id: 'ending', h: 'Ending your use', short: 'You can leave any time. We can suspend accounts or servers that break these terms.',
        body: `<p>You can stop using Oversite at any time, leave servers from your account page, unlink Roblox, or ask us to delete your account at ${CONTACT}. We may suspend or remove accounts, servers or listings that break these terms or put others at risk, and we will try to explain why when we can.</p>` },
      { id: 'liability', h: 'Limits of our responsibility', short: 'We do our best, but we are not responsible for losses caused by using a free roleplay tool.',
        body: `<p>To the fullest extent the law allows, Oversite is not liable for indirect, incidental or consequential losses, lost data, or anything that happens in your ER:LC server, Roblox or Discord as a result of using Oversite CAD, including actions taken by your staff. Nothing in these terms limits rights you have under laws that cannot be changed by agreement.</p>` },
      { id: 'changes', h: 'Changes to these terms', short: 'If the terms change, we update this page and the date at the top.',
        body: `<p>We may update these terms as Oversite CAD grows. The new version is posted here with a new date. If a change is significant, we will also let people know on the site. Using Oversite after a change means you accept the new terms.</p>` },
      { id: 'contact', h: 'Contact', short: `Questions? Email ${CONTACT}.`,
        body: `<p>For questions about these terms, reports about a server or listing, or account requests, email ${CONTACT}.</p>` },
    ],
  },
  privacy: {
    title: 'Privacy Policy', path: '/privacy',
    intro: 'This explains exactly what Oversite CAD stores about you, why, who else sees it, and how to get it deleted. No ads, no selling your data, no tracking cookies.',
    sections: [
      { id: 'summary', h: 'The short version', short: 'We keep only what the CAD needs to work, we never sell it, and you can ask for it to be deleted.',
        body: `<ul><li>We store your Roblox and Discord identity, the servers you are in, and what you do in them.</li>
<li>We never sell your data, show ads, or use tracking or advertising cookies.</li>
<li>We only share data with the services that make the CAD work (Roblox, Discord, the ER:LC API and our hosting provider).</li>
<li>Email ${CONTACT} to get a copy of your data or have your account deleted.</li></ul>` },
      { id: 'collect', h: 'What we collect', short: 'Your linked accounts, your servers and roles, server settings, and activity inside the CAD.',
        body: `<table class="lg-t"><tr><th>What</th><th>Details</th></tr>
<tr><td>Roblox account</td><td>Your Roblox user ID, username, display name and avatar picture, from Roblox's sign-in or the profile check you complete. We never see your Roblox password.</td></tr>
<tr><td>Discord account</td><td>If you sign in with Discord: your Discord user ID, name, avatar and the Roblox account verified in your Discord connections.</td></tr>
<tr><td>Your servers</td><td>Which servers you belong to and your rank in each (owner, co-owner, admin, mod or member).</td></tr>
<tr><td>Server settings</td><td>Server name, address, departments, codes (stored only as one-way hashes), invite links, the ER:LC server key (encrypted, never shown to members), the linked Discord server and the chosen staff roles.</td></tr>
<tr><td>Server profile</td><td>Bio, icon, Discord invite, region, language and whether it is listed, plus details read from ER:LC: in-game name, join code, owner, co-owners, size and settings, and the Discord member count.</td></tr>
<tr><td>Staff activity</td><td>Staff records (warnings, kicks, bans, notes), every command sent through the Staff MDT with who sent it, and the server's in-game command history.</td></tr>
<tr><td>Votes</td><td>Which servers you voted for on Explore, and when, to enforce the one vote every 12 hours rule.</td></tr>
<tr><td>Live game data</td><td>While a CAD is open we read player names, teams, callsigns, positions, vehicles and 911 calls from the ER:LC API to draw the map. This stays in memory; a short recent route per player (about 15 minutes) is used for smooth movement and is not saved.</td></tr>
<tr><td>Technical</td><td>Your IP address is used briefly to slow down repeated sign-in attempts and is not stored by us. Our hosting provider may keep standard server logs.</td></tr></table>` },
      { id: 'use', h: 'How we use it', short: 'Only to run Oversite CAD: signing you in, showing your servers, and powering the CAD, staff tools and Explore.',
        body: `<p>We use your information to sign you in, show the servers you belong to, place you and your unit on the map, open the right department MDT, let staff manage their server and keep accountable logs, show listed servers on Explore, and keep the site secure. We do not use it for advertising and we do not build profiles of you.</p>` },
      { id: 'sharing', h: 'Who else sees it', short: 'People in your servers, people browsing Explore (for listed servers), and the services that make the CAD work.',
        body: `<ul><li><b>People in your server</b> can see your Roblox name and avatar, your rank, and, for staff, the records and logs of that server.</li>
<li><b>Anyone signed in</b> can see a listed server's profile on Explore, including the owner's Roblox name and the ER:LC join code.</li>
<li><b>Roblox</b> handles Roblox sign-in and serves avatar pictures. <b>Discord</b> handles Discord sign-in, and our bot reads your server's roles and member count. <b>The ER:LC API</b> receives your server key to return live data and run staff commands. <b>Our hosting provider</b> stores the database.</li>
<li>We do not sell or rent your information. We would only share it beyond this if the law requires it.</li></ul>` },
      { id: 'cookies', h: 'Cookies and browser storage', short: 'A few cookies to keep you signed in and secure. No tracking or advertising cookies.',
        body: `<table class="lg-t"><tr><th>Name</th><th>Purpose</th><th>Lasts</th></tr>
<tr><td><code>ov_sess</code></td><td>Keeps you signed in.</td><td>30 days</td></tr>
<tr><td><code>ov_access</code></td><td>Remembers the preview access code.</td><td>30 days</td></tr>
<tr><td><code>ov_rbx</code>, <code>ov_dg</code></td><td>Protect the Roblox and Discord sign-in and bot-connect steps.</td><td>10 minutes</td></tr></table>
<p>Your browser also keeps a few settings on your own device: your 2D or 3D map choice, whether you dismissed the graphics notice, reports you write in the department MDT, and whether you have already seen the opening animation this session. These never leave your device.</p>` },
      { id: 'keeping', h: 'How long we keep it', short: 'Your account stays until you ask us to delete it. Server data stays until the server is deleted; command history is kept for good.',
        body: `<ul><li>Your account and linked identities stay until you ask us to delete them. Unlinking Roblox removes it from your account straight away.</li>
<li>When an owner deletes a server, its settings, codes, invites, member list, profile, icon, votes, staff records and command history are deleted with it.</li>
<li>Staff records can be deleted by the server's owner or co-owners. The command history cannot be deleted while the server exists, so staff stay accountable.</li>
<li>Live game data is never saved.</li></ul>` },
      { id: 'rights', h: 'Your choices and rights', short: 'See, change, download or delete your data by emailing us.',
        body: `<p>You can unlink Roblox, leave servers and sign out from your account page at any time. To get a copy of your data, correct it, or have your account deleted, email ${CONTACT}. Depending on where you live (for example in the EU, UK or California), you may have further rights such as objecting to how we use your data or complaining to a data protection authority. We will answer requests within 30 days.</p>` },
      { id: 'security', h: 'Keeping it safe', short: 'Keys are encrypted, codes are hashed, and the site uses HTTPS.',
        body: `<p>ER:LC server keys are encrypted at rest and never sent to anyone's browser. Server codes are stored only as one-way hashes. The site is served over HTTPS and sign-in cookies are protected from other sites. No system is perfect; if something goes wrong that affects you, we will tell you.</p>` },
      { id: 'children', h: 'Children', short: 'Oversite CAD is for people aged 13 and over.',
        body: `<p>Oversite CAD is not meant for children under 13 and we do not knowingly collect information from them. If you believe a child under 13 has an account, email ${CONTACT} and we will delete it.</p>` },
      { id: 'changes', h: 'Changes to this policy', short: 'If this policy changes, we update this page and the date at the top.',
        body: `<p>If we change what we collect or how we use it, we will post the new version here with a new date, and tell people on the site when the change is significant.</p>` },
      { id: 'contact', h: 'Contact', short: `Questions or requests: ${CONTACT}.`,
        body: `<p>Oversite (Oversite Marketplace, Minnesota, United States). Email ${CONTACT} for anything about your data or this policy.</p>` },
    ],
  },
};
