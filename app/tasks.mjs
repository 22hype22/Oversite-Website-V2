// Task boards for businesses: what a worker on shift can pick up, and the mini-games inside them. Each task is a few steps:
//   drive: go somewhere in ER:LC ('rand' a random postal, 'base' the business, 'house' a listing or a random house) and stay `wait` seconds
//   game:  a mini-game played in the CAD: paperwork, pitch, negotiate, timing or sequence
// app/civbiz.mjs turns a template into a job (steps with real places and game content) and pays for it by how well it went.

const pick = a => a[Math.floor(Math.random() * a.length)];
const shuffle = a => { const b = [...a]; for (let i = b.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [b[i], b[j]] = [b[j], b[i]]; } return b; };
export const NAMES = ['Maria Lopez', 'James Carter', 'Aisha Khan', 'Tom Becker', 'Lena Park', 'Marcus Hill', 'Sofia Rossi', 'Derek Owens', 'Priya Nair', 'Ethan Brooks', 'Grace Kim', 'Omar Haddad', 'Chloe Martin', 'Ryan Walsh'];
const STREETS = ['Oak Lane', 'Maple Street', 'Cedar Road', 'Pine Avenue', 'Lakeview Drive', 'Elm Court', 'Ridge Road', 'Harbor Way', 'Willow Bend', 'Birch Street'];
export const houseName = () => `${10 + Math.floor(Math.random() * 280)} ${pick(STREETS)}`;

// ── the task pools, per type of business. pay is a multiple of the server's pay per job ──
const D = (to, wait, what) => ({ do: 'drive', to, wait, what }), G = (game, what, extra = {}) => ({ do: 'game', game, what, ...extra });
export const TASKS = {
  'Real estate': [
    { title: 'Fill out the paperwork for {house}', pay: 0.8, steps: [G('paperwork', 'Fill out the sale papers', { form: 'sale' })] },
    { title: 'Pick up {client} and show them {house}', pay: 1.6, steps: [D('rand', 10, 'Pick up {client}'), D('house', 45, 'Show {client} around {house}'), D('rand', 5, 'Drop {client} off')] },
    { title: 'Meet {client} about a new home', pay: 1.3, steps: [D('rand', 20, 'Meet {client}'), G('pitch', 'Win {client} over')] },
    { title: 'Sell {house}', pay: 2.4, steps: [D('house', 60, 'Show the buyer {house}'), G('negotiate', 'Agree on a price'), G('paperwork', 'Sign the contract', { form: 'sale' })] },
    { title: 'Take listing photos of {house}', pay: 1.1, steps: [D('house', 15, 'Get to {house}'), G('timing', 'Snap the photos', { hits: 3, verb: 'Snap', look: 'camera' })] },
    { title: 'Put up a For Sale sign at {house}', pay: 0.8, steps: [D('house', 20, 'Put up the sign')] },
    { title: 'Host an open house at {house}', pay: 1.5, steps: [D('house', 40, 'Open up {house} for visitors'), G('pitch', 'Answer the visitors’ questions')] },
    { title: 'Stage {house} for buyers', pay: 1.2, steps: [D('house', 15, 'Get to {house}'), G('sequence', 'Set up the living room', { set: 'stage' })] },
    { title: 'Appraise {house}', pay: 1.3, steps: [D('house', 25, 'Walk through {house}'), G('paperwork', 'Write up the appraisal', { form: 'appraise' })] },
    { title: 'Win a new listing from {client}', pay: 1.6, steps: [D('rand', 15, 'Meet {client} at their home'), G('pitch', 'Convince {client} to sell with you', { bank: 'seller' }), G('paperwork', 'Sign the listing agreement', { form: 'listing' })] },
    { title: 'Rent out {house} to {client}', pay: 1.7, steps: [D('house', 30, 'Show {client} around {house}'), G('negotiate', 'Agree on the rent', { what2: 'rent' }), G('paperwork', 'Sign the lease', { form: 'lease' })] },
    { title: 'Inspect {house} before closing', pay: 1.2, steps: [D('house', 20, 'Get to {house}'), G('sequence', 'Check the house top to bottom', { set: 'inspect' })] },
    { title: 'Hand {client} the keys to {house}', pay: 1.4, steps: [D('rand', 10, 'Pick up {client}'), D('house', 20, 'Walk {client} through {house}'), G('paperwork', 'Sign the closing papers', { form: 'closing' })] }],
  Restaurant: [
    { title: 'Cook an order for table {n}', pay: 0.8, steps: [G('sequence', 'Follow the recipe', { set: 'recipe' })] },
    { title: 'Deliver food to {client}', pay: 1.2, steps: [D('base', 15, 'Bag the order'), D('rand', 15, 'Hand it to {client}')] },
    { title: 'Serve table {n}', pay: 0.9, steps: [G('pitch', 'Take care of the table')] },
    { title: 'Restock the kitchen', pay: 1.2, steps: [D('rand', 30, 'Buy supplies'), D('base', 15, 'Unload the supplies')] },
    { title: 'Pass the health inspection', pay: 1.0, steps: [G('paperwork', 'Fill out the inspection form', { form: 'inspect' })] }],
  Store: [
    { title: 'Stock the shelves', pay: 0.8, steps: [G('sequence', 'Stock them in order', { set: 'shelves' })] },
    { title: 'Help {client} find what they need', pay: 0.9, steps: [G('pitch', 'Help {client}')] },
    { title: 'Deliver an order to {client}', pay: 1.2, steps: [D('base', 15, 'Pack the order'), D('rand', 15, 'Drop it off')] },
    { title: 'Pick up a shipment', pay: 1.2, steps: [D('rand', 30, 'Load the shipment'), D('base', 15, 'Unload at the store')] }],
  'Gas station': [
    { title: 'Fuel delivery for {client}', pay: 1.3, steps: [D('base', 20, 'Fill the tanker'), D('rand', 20, 'Refuel {client}’s car')] },
    { title: 'Fix pump {n}', pay: 1.0, steps: [G('timing', 'Tighten the fittings', { hits: 3, verb: 'Tighten', look: 'gauge' })] },
    { title: 'Restock the snack aisle', pay: 0.8, steps: [G('sequence', 'Restock in order', { set: 'snacks' })] },
    { title: 'Help a driver who’s lost', pay: 0.9, steps: [G('pitch', 'Give directions')] }],
  'Tech store': [
    { title: 'Repair {client}’s phone', pay: 1.0, steps: [G('timing', 'Solder the parts', { hits: 3, verb: 'Solder', look: 'gauge' })] },
    { title: 'House call: fix {client}’s computer', pay: 1.4, steps: [D('rand', 20, 'Get to {client}'), G('timing', 'Fix the computer', { hits: 3, verb: 'Fix', look: 'gauge' }), D('base', 0, 'Head back')] },
    { title: 'Sell {client} a laptop', pay: 1.0, steps: [G('pitch', 'Find them the right laptop')] },
    { title: 'Set up a new phone', pay: 0.8, steps: [G('sequence', 'Set it up in order', { set: 'phone' })] }],
  'Gun store': [
    { title: 'Run a background check for {client}', pay: 0.9, steps: [G('paperwork', 'Fill out the transfer form', { form: 'transfer' })] },
    { title: 'Pick up a stock shipment', pay: 1.3, steps: [D('rand', 30, 'Collect the shipment'), D('base', 20, 'Unload at the store')] },
    { title: 'Give a range safety briefing', pay: 0.9, steps: [G('pitch', 'Brief the shooter')] },
    { title: 'Clean the rental guns', pay: 0.8, steps: [G('sequence', 'Clean in order', { set: 'clean' })] }],
  'Outdoors store': [
    { title: 'Deliver gear to {client}', pay: 1.2, steps: [D('base', 15, 'Load the gear'), D('rand', 15, 'Drop it off')] },
    { title: 'Guide a hike for {client}', pay: 1.6, steps: [D('rand', 45, 'Meet at the trailhead'), D('rand', 45, 'Reach the lookout')] },
    { title: 'Help {client} pick camping gear', pay: 0.9, steps: [G('pitch', 'Kit them out')] },
    { title: 'Restock the shelves', pay: 0.8, steps: [G('sequence', 'Restock in order', { set: 'outdoors' })] }],
  Farm: [
    { title: 'Harvest the north field', pay: 1.4, steps: [D('rand', 40, 'Drive to the field'), G('timing', 'Harvest the crop', { hits: 4, verb: 'Harvest', look: 'gauge' }), D('base', 15, 'Unload at the farm')] },
    { title: 'Feed the animals', pay: 0.8, steps: [G('sequence', 'Feed them in order', { set: 'feed' })] },
    { title: 'Deliver produce to {client}', pay: 1.2, steps: [D('base', 15, 'Load the produce'), D('rand', 15, 'Deliver it')] },
    { title: 'Fix the fence', pay: 1.0, steps: [D('rand', 20, 'Find the broken fence'), G('timing', 'Hammer it back up', { hits: 3, verb: 'Hammer', look: 'gauge' })] }],
  'Movie theater': [
    { title: 'Put up posters for the new movie', pay: 1.4, steps: [D('rand', 15, 'Put up a poster'), D('rand', 15, 'Put up a poster'), D('rand', 15, 'Put up a poster')] },
    { title: 'Make popcorn for the rush', pay: 0.8, steps: [G('sequence', 'Make it in order', { set: 'popcorn' })] },
    { title: 'Usher screen {n}', pay: 0.9, steps: [G('pitch', 'Handle the crowd')] },
    { title: 'Fix the projector', pay: 1.0, steps: [G('timing', 'Line up the lens', { hits: 3, verb: 'Focus', look: 'camera' })] }],
  Mechanic: [
    { title: 'Roadside repair for {client}', pay: 1.4, steps: [D('rand', 20, 'Get to {client}'), G('timing', 'Fix the engine', { hits: 4, verb: 'Tighten', look: 'gauge' })] },
    { title: 'Diagnose {client}’s car', pay: 0.9, steps: [G('pitch', 'Explain what’s wrong')] },
    { title: 'Do an oil change', pay: 0.8, steps: [G('sequence', 'Do it in order', { set: 'oil' })] },
    { title: 'Tow-in pickup for {client}', pay: 1.3, steps: [D('rand', 30, 'Hook up the car'), D('base', 10, 'Drop it at the shop')] }],
  Towing: [
    { title: 'Tow {client}’s car', pay: 1.3, steps: [D('rand', 40, 'Hook up the car'), D('base', 10, 'Drop it at the yard')] },
    { title: 'Winch a car out of a ditch', pay: 1.2, steps: [D('rand', 15, 'Get to the ditch'), G('timing', 'Winch it out', { hits: 3, verb: 'Pull', look: 'gauge' })] },
    { title: 'Fill out the impound papers', pay: 0.8, steps: [G('paperwork', 'Fill out the impound form', { form: 'impound' })] }],
  Taxi: [
    { title: 'Fare: pick up {client}', pay: 1.2, steps: [D('rand', 10, 'Pick up {client}'), D('rand', 10, 'Drop {client} off')], far: true },
    { title: 'Airport run for {client}', pay: 1.6, steps: [D('rand', 10, 'Pick up {client}'), D('rand', 10, 'Drop them at the airport')], far: true },
    { title: 'Chatty passenger: {client}', pay: 1.3, steps: [D('rand', 10, 'Pick up {client}'), G('pitch', 'Keep {client} happy'), D('rand', 10, 'Drop {client} off')], far: true }],
  Security: [
    { title: 'Patrol three spots', pay: 1.4, steps: [D('rand', 20, 'Check the area'), D('rand', 20, 'Check the area'), D('rand', 20, 'Check the area')] },
    { title: 'Write an incident report', pay: 0.8, steps: [G('paperwork', 'Fill out the report', { form: 'incident' })] },
    { title: 'Watch an event for {client}', pay: 1.5, steps: [D('rand', 90, 'Keep watch')] },
    { title: 'Calm a heated guest', pay: 0.9, steps: [G('pitch', 'Talk them down')] }],
  Medical: [
    { title: 'House call for {client}', pay: 1.4, steps: [D('rand', 30, 'Get to {client}'), G('pitch', 'Treat {client}'), D('base', 0, 'Head back')] },
    { title: 'Patient intake for {client}', pay: 0.8, steps: [G('paperwork', 'Fill out the intake form', { form: 'intake' })] },
    { title: 'Stitch up a cut', pay: 1.0, steps: [G('timing', 'Place the stitches', { hits: 4, verb: 'Stitch', look: 'gauge' })] }],
  'Law firm': [
    { title: 'Serve papers on {client}', pay: 1.2, steps: [D('rand', 15, 'Serve the papers'), D('base', 0, 'Report back')] },
    { title: 'Draft a contract for {client}', pay: 0.9, steps: [G('paperwork', 'Draft the contract', { form: 'contract' })] },
    { title: 'Consult with {client}', pay: 1.3, steps: [D('rand', 20, 'Meet {client}'), G('pitch', 'Advise {client}')] },
    { title: 'Settle {client}’s case', pay: 1.8, steps: [G('negotiate', 'Negotiate the settlement', { what2: 'settlement' }), G('paperwork', 'Sign the settlement', { form: 'contract' })] }],
  Bank: [
    { title: 'Cash run for {client}', pay: 1.4, steps: [D('base', 20, 'Collect the cash'), D('rand', 20, 'Deliver it'), D('base', 0, 'Come back')] },
    { title: 'Open an account for {client}', pay: 0.8, steps: [G('paperwork', 'Fill out the account form', { form: 'account' })] },
    { title: 'Loan meeting with {client}', pay: 1.1, steps: [G('pitch', 'Talk through the loan')] },
    { title: 'Count the vault', pay: 0.8, steps: [G('sequence', 'Count in order', { set: 'vault' })] }],
  News: [
    { title: 'Cover a story at {place}', pay: 1.4, steps: [D('rand', 30, 'Get to the scene'), G('pitch', 'Interview a witness'), D('base', 0, 'File the story')] },
    { title: 'Get a photo for the front page', pay: 1.1, steps: [D('rand', 15, 'Find the shot'), G('timing', 'Take the photo', { hits: 3, verb: 'Snap', look: 'camera' })] },
    { title: 'Write up the evening news', pay: 0.8, steps: [G('sequence', 'Put the stories in order', { set: 'news' })] }] };
TASKS.Other = TASKS.Store;

// ── what the mini-games are made of ──
// pitch: three questions, each with a best, an okay and a bad answer (scored 1, .5, 0)
const PITCH = {
  'Real estate': [['“Is this neighborhood safe?”', 'Share the real crime numbers and point out the patrols', 'Say it’s fine, you think', 'Change the subject'],
    ['“Why is it priced so high?”', 'Walk them through recent sales nearby', 'Say prices only go up', 'Tell them to take it or leave it'],
    ['“How are the schools?”', 'Show them the ratings for the nearby schools', 'Say kids seem happy around here', 'Say you don’t have kids'],
    ['“Can we move in quickly?”', 'Explain the closing timeline step by step', 'Promise next week without checking', 'Shrug'],
    ['“What’s wrong with the house?”', 'Be upfront about the old roof and the fix', 'Say nothing, it’s perfect', 'Say they’ll find out']],
  seller: [['“Why should I sell with you?”', 'Show them the homes you sold nearby and how fast', 'Say you’re the best, just trust you', 'Say every agent is the same'],
    ['“What do you think it’s worth?”', 'Walk through what sold on the street this year', 'Name the biggest number you can', 'Say whatever they want to hear'],
    ['“What’s your commission?”', 'Explain it up front and what it covers', 'Say you’ll sort that out later', 'Dodge the question'],
    ['“How long will it take to sell?”', 'Give an honest range for this market', 'Promise it’ll sell in a week', 'Say no idea'],
    ['“Should I fix anything first?”', 'Point out the cheap fixes that add value', 'Tell them to redo the whole kitchen', 'Say don’t bother']],
  Medical: [['“Is it serious?”', 'Explain calmly what you see and what happens next', 'Say probably not', 'Say you’re not sure, good luck'],
    ['“Will it hurt?”', 'Be honest and explain how you’ll keep it to a minimum', 'Say not at all', 'Say yes, a lot'],
    ['“Do I need the hospital?”', 'Check the signs and explain when they should go', 'Tell them no without checking', 'Tell them to look it up']],
  Mechanic: [['“What’s that noise?”', 'Show them the worn brake pads and explain', 'Say cars make noises', 'Say it’s probably the engine, who knows'],
    ['“Is it safe to drive?”', 'Explain what’s safe now and what needs fixing soon', 'Say yeah, drive it', 'Say you wouldn’t'],
    ['“Why does it cost that much?”', 'Break down parts and labor', 'Say that’s the price', 'Add a bit more']],
  'Law firm': [['“Do I have a case?”', 'Walk through the facts and the likely outcome', 'Say definitely', 'Say probably not, next'],
    ['“How long will it take?”', 'Give a realistic timeline and the steps', 'Say a week', 'Say forever'],
    ['“What will it cost?”', 'Explain your fee clearly up front', 'Say we’ll see', 'Change the subject']],
  Taxi: [['“Can you go faster?”', 'Say you’ll get them there safely and on time', 'Floor it', 'Slow down out of spite'],
    ['“Know any good places to eat?”', 'Recommend a spot near where they’re going', 'Say no', 'Rant about food'],
    ['“Can you turn the music down?”', 'Turn it down right away', 'Turn it down a little', 'Turn it up']],
  _: [['“My order is wrong.”', 'Apologize and fix it right away', 'Tell them it’s close enough', 'Argue with them'],
    ['“What do you recommend?”', 'Ask what they like and suggest something that fits', 'Point at the most expensive thing', 'Say it’s all the same'],
    ['“I’m in a real hurry.”', 'Get them sorted quickly and politely', 'Tell them to wait their turn', 'Ignore them'],
    ['“Got any discounts?”', 'Explain the deals you actually have', 'Make one up', 'Laugh'],
    ['“I’m lost. Can you help?”', 'Give clear directions and a landmark', 'Point vaguely', 'Say you’re busy'],
    ['“Why is it so expensive?”', 'Explain what they get for it', 'Say tough luck', 'Walk away']] };
// sequence: the order things go in
const SEQ = { recipe: ['Bun', 'Sauce', 'Patty', 'Cheese', 'Lettuce', 'Bun'], shelves: ['Cereal', 'Bread', 'Milk', 'Eggs', 'Juice'], snacks: ['Chips', 'Candy', 'Drinks', 'Jerky', 'Gum'],
  phone: ['Insert SIM', 'Power on', 'Pick language', 'Connect Wi-Fi', 'Sign in', 'Restore backup'], clean: ['Unload', 'Strip', 'Clean barrel', 'Oil', 'Reassemble'],
  outdoors: ['Tents', 'Sleeping bags', 'Rods', 'Boots', 'Lanterns'], feed: ['Chickens', 'Cows', 'Pigs', 'Horses', 'Water troughs'], popcorn: ['Kernels', 'Oil', 'Heat', 'Butter', 'Salt'],
  oil: ['Lift the car', 'Drain the oil', 'New filter', 'Add oil', 'Check the level'], vault: ['$100s', '$50s', '$20s', '$10s', 'Coins'], news: ['Breaking news', 'Local', 'Weather', 'Sports', 'Goodnight'],
  stage: ['Rug', 'Sofa', 'Coffee table', 'Lamp', 'Plants', 'Art'], inspect: ['Roof', 'Attic', 'Wiring', 'Plumbing', 'Foundation'] };
// paperwork: which fields the form has, and the form's own heading
const FORMS = { sale: ['Purchase agreement', ['Client', 'Address', 'Price', 'Closing date']], inspect: ['Health inspection', ['Inspector', 'Kitchen', 'Fridge temp', 'Result']],
  transfer: ['Firearm transfer', ['Buyer', 'Item', 'ID number', 'Result']], impound: ['Impound notice', ['Owner', 'Plate', 'Location', 'Fee']],
  incident: ['Incident report', ['Reported by', 'Location', 'Time', 'What happened']], intake: ['Patient intake', ['Patient', 'Age', 'Complaint', 'Allergies']],
  contract: ['Agreement', ['Client', 'Other party', 'Amount', 'Signed on']], account: ['New account', ['Customer', 'Address', 'Account type', 'Opening deposit']],
  appraise: ['Appraisal report', ['Address', 'Bedrooms', 'Condition', 'Value']], listing: ['Listing agreement', ['Seller', 'Address', 'List price', 'Commission']],
  lease: ['Residential lease', ['Tenant', 'Address', 'Rent a week', 'Move-in']], closing: ['Closing statement', ['Buyer', 'Address', 'Price', 'Keys handed over']] };
const VALS = { Client: () => pick(NAMES), Buyer: () => pick(NAMES), Owner: () => pick(NAMES), Customer: () => pick(NAMES), Patient: () => pick(NAMES), 'Reported by': () => pick(NAMES), 'Other party': () => pick(NAMES),
  Inspector: () => pick(NAMES), Address: () => houseName(), Location: () => 'Postal ' + (100 + Math.floor(Math.random() * 1100)), Price: () => '$' + (Math.floor(80 + Math.random() * 420) * 1000).toLocaleString('en-US'),
  Amount: () => '$' + (Math.floor(2 + Math.random() * 98) * 1000).toLocaleString('en-US'), Fee: () => '$' + (150 + Math.floor(Math.random() * 6) * 50), 'Opening deposit': () => '$' + (100 + Math.floor(Math.random() * 40) * 50),
  'Closing date': () => pick(['June 4', 'June 12', 'July 1', 'July 19', 'Aug 8', 'Sept 2']), 'Signed on': () => pick(['June 4', 'June 12', 'July 1', 'July 19']), Time: () => pick(['9:15 PM', '11:40 PM', '2:05 AM', '6:30 PM']),
  Kitchen: () => pick(['Clean', 'Needs work']), 'Fridge temp': () => pick(['36°F', '38°F', '41°F', '45°F']), Result: () => pick(['Pass', 'Fail', 'Approved', 'Denied']), Item: () => pick(['Pistol', 'Hunting rifle', 'Shotgun']),
  'ID number': () => String(100000 + Math.floor(Math.random() * 899999)), Plate: () => pick(['LC4-219', 'RTX 882', '7KDA021', 'MOV 551']), 'What happened': () => pick(['Fight in the lobby', 'Broken window', 'Trespassing', 'Lost child']),
  Age: () => String(18 + Math.floor(Math.random() * 60)), Complaint: () => pick(['Sprained ankle', 'Fever', 'Cut hand', 'Headache']), Allergies: () => pick(['None', 'Penicillin', 'Peanuts']), 'Account type': () => pick(['Checking', 'Savings']),
  Seller: () => pick(NAMES), Tenant: () => pick(NAMES), Bedrooms: () => String(1 + Math.floor(Math.random() * 5)), Condition: () => pick(['Excellent', 'Good', 'Fair', 'Needs work']),
  Value: () => '$' + (Math.floor(80 + Math.random() * 420) * 1000).toLocaleString('en-US'), 'List price': () => '$' + (Math.floor(80 + Math.random() * 420) * 1000).toLocaleString('en-US'),
  Commission: () => pick(['2%', '2.5%', '3%', '4%']), 'Rent a week': () => '$' + ((30 + Math.floor(Math.random() * 120)) * 50).toLocaleString('en-US'), 'Move-in': () => pick(['June 1', 'June 15', 'July 1', 'Aug 1']),
  'Keys handed over': () => pick(['Yes, 2 sets', 'Yes, 3 sets', 'Yes, 1 set']) };
const PEOPLE = new Set(['Client', 'Customer', 'Patient', 'Buyer', 'Owner', 'Seller', 'Tenant']);
// each field shows the right value among three wrong ones
const choices = (k, right) => { const out = new Set([right]); for (let i = 0; i < 20 && out.size < 4; i++) out.add((VALS[k] || (() => right))()); return shuffle([...out]); };

// build a step's game content (and, for negotiate, the hidden limit the server keeps)
export const makeGame = (st, kind, ctx) => {
  const fill = s => fillText(s, ctx);
  if (st.game === 'paperwork') { const [title, keys] = FORMS[st.form] || FORMS.sale;
    const fields = keys.map(k => { const v = PEOPLE.has(k) ? ctx.client : k === 'Address' && ctx.house ? ctx.house : (VALS[k] || (() => '—'))(); return { k, v, opts: choices(k, v) }; });
    return { game: 'paperwork', what: fill(st.what), p: { title, fields, ref: 'No. ' + (10000 + Math.floor(Math.random() * 89999)) } }; }
  if (st.game === 'pitch') { const bank = PITCH[st.bank] || PITCH[kind] || PITCH._; const qs = shuffle(bank).slice(0, 3).map(([q, best, ok, bad]) => ({ q: fill(q), a: shuffle([[best, 1], [ok, .5], [bad, 0]]) }));
    return { game: 'pitch', what: fill(st.what), p: { qs, who: ctx.client } }; }
  if (st.game === 'negotiate') { const rent = st.what2 === 'rent', u = rent ? 50 : 500;
    const ask = st.what2 === 'settlement' ? (20 + Math.floor(Math.random() * 60)) * 1000 : rent ? (40 + Math.floor(Math.random() * 110)) * 50 : (120 + Math.floor(Math.random() * 380)) * 1000;
    const max = Math.round(ask * (0.88 + Math.random() * 0.14) / u) * u, open = Math.round(ask * (0.7 + Math.random() * 0.1) / u) * u;
    return { game: 'negotiate', what: fill(st.what), p: { ask, open, round: 0, rounds: 4, last: open, unit: u, who: ctx.client, label: st.what2 === 'settlement' ? 'settlement' : rent ? 'rent' : 'price' }, secret: { max } }; }
  if (st.game === 'timing') return { game: 'timing', what: fill(st.what), p: { hits: st.hits || 3, verb: st.verb || 'Go', look: st.look || 'gauge', speed: 0.9 + Math.random() * 0.5 } };
  if (st.game === 'sequence') return { game: 'sequence', what: fill(st.what), p: { items: SEQ[st.set] || SEQ.shelves } };
  return { game: st.game, what: fill(st.what), p: {} }; };
export const fillText = (s, ctx) => String(s || '').replace(/\{client\}/g, ctx.client).replace(/\{house\}/g, ctx.house).replace(/\{n\}/g, ctx.n).replace(/\{place\}/g, ctx.place);
export const pickTasks = (kind, n, pool) => shuffle(pool || (TASKS[kind] || TASKS.Store).map((t, i) => i)).slice(0, n);
// how long a game must at least take, so a script can't rush them
export const MIN_GAME_MS = { paperwork: 6000, pitch: 4000, negotiate: 3000, timing: 2500, sequence: 3500 };
