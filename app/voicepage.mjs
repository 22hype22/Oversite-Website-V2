// The proximity voice page (/:slug/voice): join, mute, see who is near. Audio is peer to peer (WebRTC); every second the
// server says who is in range and how far, and this page sets each voice's volume (and muffles it through a vehicle).
import { layout, esc } from './pages.mjs';

const CSS = `
.vc{max-width:760px}
.vc [hidden]{display:none!important}
.vc-hd{display:flex;align-items:flex-end;justify-content:space-between;gap:16px;flex-wrap:wrap;margin:0 0 18px}
.vc-hd h1{margin:0;font-size:clamp(26px,4vw,34px);letter-spacing:-.02em}.vc-hd p{margin:4px 0 0;color:var(--dim)}
.vc-main{display:grid;gap:16px}
.vc-join{display:flex;align-items:center;gap:18px;flex-wrap:wrap}
.vc-orb{position:relative;width:76px;height:76px;flex:none;border-radius:50%;display:grid;place-items:center;background:rgba(240,242,245,.06);border:1px solid var(--hair2);color:var(--dim);transition:background .2s,color .2s,border-color .2s}
.vc-orb svg{width:30px;height:30px}.vc-orb i{position:absolute;inset:-4px;border-radius:50%;border:2px solid #46D07C;opacity:0;transform:scale(calc(.92 + var(--lvl,0) * .25));transition:opacity .08s,transform .08s}
.vc.on .vc-orb{background:rgba(70,208,124,.12);color:#7FDCA4;border-color:rgba(70,208,124,.4)}.vc.on .vc-orb i{opacity:calc(var(--lvl,0) * 1.6)}
.vc.muted .vc-orb{background:rgba(226,75,75,.12);color:#F3A3A3;border-color:rgba(226,75,75,.4)}.vc.muted .vc-orb i{opacity:0}
.vc-st{flex:1;min-width:200px}.vc-st b{display:block;font-size:17px;font-weight:600}.vc-st small{display:block;color:var(--dim);font-size:13px;margin-top:2px}
.vc-acts{display:flex;gap:8px;flex-wrap:wrap}
.vc-near h2{display:flex;align-items:baseline;justify-content:space-between;margin:0 0 10px;font-size:16px}.vc-near h2 span{font-size:12px;color:var(--faint);font-weight:400}
.vc-l{display:grid;gap:6px}
.vc-p{display:flex;align-items:center;gap:12px;padding:9px 12px;border-radius:12px;border:1px solid var(--hair);background:rgba(255,255,255,.02);transition:border-color .15s,background .15s}
.vc-p.talk{border-color:rgba(70,208,124,.55);background:rgba(70,208,124,.07)}
.vc-p .av{position:relative;width:34px;height:34px;border-radius:50%;flex:none;overflow:hidden;display:grid;place-items:center;background:#2a2d33;font-weight:600;font-size:13px}.vc-p .av img{position:absolute;inset:0;width:100%;height:100%;object-fit:cover}
.vc-p .tx{flex:1;min-width:0}.vc-p .tx b{display:block;font-size:14px;font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.vc-p .tx small{color:var(--faint);font-size:12px}
.vc-vol{width:90px;height:5px;border-radius:5px;background:rgba(255,255,255,.08);overflow:hidden;flex:none}.vc-vol i{display:block;height:100%;border-radius:5px;background:#4C8DFF;transition:width .4s}
.vc-p.far .vc-vol i{background:rgba(240,242,245,.25)}.vc-p.muff .vc-vol i{background:#E9B04C}
.vc-e{color:var(--faint);font-size:13px;padding:10px 2px}
.vc-tips{color:var(--dim);font-size:13px;line-height:1.6;margin:0;padding-left:18px}
.vc-off{padding:26px;text-align:center;color:var(--dim)}
@media (max-width:560px){.vc-vol{width:56px}}
`;
const HEADSET = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 15v-3a8 8 0 0 1 16 0v3"/><rect x="3" y="14" width="4.5" height="6.5" rx="1.6"/><rect x="16.5" y="14" width="4.5" height="6.5" rx="1.6"/></svg>';

export const voicePage = ({ logo, user, c, settings, keyOk }) => layout({ title: `Voice · ${c.name}`, logo, user, body: `<style>${CSS}</style>
<main class="vc" id="vc"><div class="vc-hd"><div><h1>Proximity voice</h1><p>${esc(c.name)} · hear the players near you in ER:LC</p></div><a class="btn sm" href="/${esc(c.slug)}">Open CAD</a></div>
${!settings.on ? `<section class="card vc-off">Proximity voice is turned off for this server. The owner can turn it on in <a href="/${esc(c.slug)}/settings#voice">Settings</a>.</section>`
  : !keyOk ? `<section class="card vc-off">This server isn't linked to ER:LC yet, so Oversite can't tell where anyone is. The owner can connect it in <a href="/${esc(c.slug)}/settings">Settings</a>.</section>`
  : `<div class="vc-main">
<section class="card vc-join"><span class="vc-orb" aria-hidden="true">${HEADSET}<i></i></span><div class="vc-st"><b id="vS">Not connected</b><small id="vSub">Join to hear players near you in game. Keep this tab open while you play.</small></div>
<div class="vc-acts"><button class="btn pri" id="vJoin">Join voice</button><button class="btn" id="vMute" hidden>Mute</button><button class="btn" id="vLeave" hidden>Leave</button></div></section>
<section class="card vc-near"><h2>Nearby <span id="vCount"></span></h2><div class="vc-l" id="vL"><p class="vc-e">Nobody yet. People show up here when they're in voice and close to you in game.</p></div></section>
<section class="card"><ul class="vc-tips"><li>Wear headphones, or other players hear themselves through your speakers.</li><li>Voices get quieter with distance and stop at about ${settings.range === 'short' ? '25' : settings.range === 'long' ? '60' : '40'} m.${settings.muffle ? ' Inside a vehicle, people outside sound muffled, and so do you to them.' : ''}</li><li>Your position comes from ER:LC every few seconds, so volume follows you with a short delay.</li></ul></section></div>`}
</main>`, script: !settings.on || !keyOk ? '' : `
const API=${JSON.stringify(`/c/${c.slug}/api`)};
const $=id=>document.getElementById(id),vc=$('vc'),S=$('vS'),SUB=$('vSub'),L=$('vL');
const e=t=>String(t??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
let es=null,me='',ice=[],mic=null,ac=null,muted=false,near={range:90,peers:[],found:false,veh:false,muffle:true};
const peers=new Map();   // rid -> { pc, gain, filter, an, el, queue, name, seen }
window.__voicePeers=peers;   // for checking a connection from the browser console
const post=(p,b)=>fetch(API+p,{method:'POST',headers:{'content-type':'application/json','x-oversite':'1'},body:JSON.stringify(b)}).then(r=>r.json()).catch(()=>({}));
const sig=(to,data)=>post('/voice/signal',{to,data});
const status=(t,s)=>{S.textContent=t;SUB.textContent=s};

// how loud someone is: full volume up close, fading to silence at the edge of the range; through a vehicle, quieter and muffled
const level=p=>{const R=near.range,full=R*.25;let g=p.d<=full?1:Math.max(0,1-(p.d-full)/(R-full));const through=near.muffle&&(near.veh!==p.veh||(near.veh&&p.veh&&p.d>8));return{g:through?g*.45:g,muff:through}};
const tune=()=>{for(const p of near.peers){const x=peers.get(p.rid);if(!x||!x.gain)continue;const{g,muff}=level(p),t=ac.currentTime;
  x.gain.gain.setTargetAtTime(p.muted?0:g,t,.25);x.filter.frequency.setTargetAtTime(muff?650:20000,t,.2)}};

const ensure=rid=>{let x=peers.get(rid);if(x)return x;
  const pc=new RTCPeerConnection({iceServers:ice});x={pc,queue:[],seen:Date.now()};peers.set(rid,x);
  for(const t of mic.getTracks())pc.addTrack(t,mic);
  pc.onicecandidate=ev=>{if(ev.candidate)sig(rid,{ice:ev.candidate})};
  pc.ontrack=ev=>{const st=ev.streams[0];if(x.src)return;
    x.el=new Audio();x.el.srcObject=st;x.el.muted=true;x.el.play().catch(()=>{});   // Chrome only plays WebRTC audio into Web Audio while an element holds the stream
    x.src=ac.createMediaStreamSource(st);x.filter=ac.createBiquadFilter();x.filter.type='lowpass';x.filter.frequency.value=20000;x.gain=ac.createGain();x.gain.gain.value=0;
    x.an=ac.createAnalyser();x.an.fftSize=256;x.src.connect(x.filter).connect(x.gain).connect(ac.destination);x.src.connect(x.an);tune()};
  pc.onconnectionstatechange=()=>{if(pc.connectionState==='failed')drop(rid);draw()};
  if(me<rid)(async()=>{await pc.setLocalDescription(await pc.createOffer());sig(rid,{sdp:pc.localDescription})})();   // the lower id starts the call, so both sides never offer at once
  return x};
const drop=rid=>{const x=peers.get(rid);if(!x)return;try{x.pc.close()}catch(_){}if(x.el)x.el.srcObject=null;peers.delete(rid)};
const onSignal=async({from,data})=>{if(!mic)return;const x=ensure(from),pc=x.pc;
  try{if(data.sdp){await pc.setRemoteDescription(data.sdp);if(data.sdp.type==='offer'){await pc.setLocalDescription(await pc.createAnswer());sig(from,{sdp:pc.localDescription})}
      for(const c of x.queue.splice(0))await pc.addIceCandidate(c).catch(()=>{})}
    else if(data.ice){if(pc.remoteDescription)await pc.addIceCandidate(data.ice).catch(()=>{});else x.queue.push(data.ice)}}catch(err){console.warn('voice',err)}};

const draw=()=>{const ps=near.peers;$('vCount').textContent=ps.length?ps.length+' in range':'';
  L.innerHTML=ps.length?ps.map(p=>{const{g,muff}=level(p),x=peers.get(p.rid),ok=x&&x.pc.connectionState==='connected';
    return '<div class="vc-p'+(g<=0?' far':'')+(muff?' muff':'')+'" data-rid="'+e(p.rid)+'"><span class="av">'+e((p.name||'?').slice(0,1).toUpperCase())+'<img src="/rbx/avatar/'+e(p.rid)+'" alt="" onerror="this.remove()"></span><div class="tx"><b>'+e(p.name)+'</b><small>'+Math.round(p.d*.45)+' m'+(p.veh?' · in a vehicle':'')+(p.muted?' · muted':'')+(ok?'':' · connecting')+'</small></div><span class="vc-vol" title="How loud you hear them"><i style="width:'+Math.round(g*100)+'%"></i></span></div>'}).join('')
    :'<p class="vc-e">'+(near.found?'Nobody in voice is close to you right now.':'Nobody yet. People show up here when they\\'re in voice and close to you in game.')+'</p>'};

// talking glow on people you can hear, and your own mic level on the ring
let raf=0;const meter=()=>{raf=requestAnimationFrame(meter);const buf=new Uint8Array(128);
  for(const [rid,x] of peers){if(!x.an)continue;x.an.getByteTimeDomainData(buf);let m=0;for(const v of buf)m=Math.max(m,Math.abs(v-128));const row=L.querySelector('[data-rid="'+rid+'"]');if(row)row.classList.toggle('talk',m>12&&x.gain&&x.gain.gain.value>.02)}
  if(meter.an){meter.an.getByteTimeDomainData(buf);let m=0;for(const v of buf)m=Math.max(m,Math.abs(v-128));vc.style.setProperty('--lvl',muted?0:Math.min(1,m/50).toFixed(2))}};

const join=async()=>{$('vJoin').disabled=true;status('Starting…','Allow microphone access when your browser asks.');
  try{mic=await navigator.mediaDevices.getUserMedia({audio:{echoCancellation:true,noiseSuppression:true,autoGainControl:true}})}
  catch(err){$('vJoin').disabled=false;return status('No microphone','Your browser blocked the mic. Allow it in the address bar and try again.')}
  ac=new (window.AudioContext||window.webkitAudioContext)();await ac.resume();meter.an=ac.createAnalyser();meter.an.fftSize=256;ac.createMediaStreamSource(mic).connect(meter.an);meter();
  es=new EventSource(API+'/voice/stream');
  es.addEventListener('hello',ev=>{const j=JSON.parse(ev.data);me=j.you;ice=j.ice;vc.classList.add('on');$('vJoin').hidden=true;$('vMute').hidden=false;$('vLeave').hidden=false});
  es.addEventListener('near',ev=>{near=JSON.parse(ev.data);
    if(!near.live)status('Waiting for ER:LC','Oversite is reading positions from the game. This takes a few seconds.');
    else if(!near.found)status('Not in the server','Join the ER:LC server with your Roblox account and you\\'ll hear people near you.');
    else status(muted?'Muted':'Connected'+(near.veh?' · in a vehicle':''),near.peers.length?'You can hear '+near.peers.filter(p=>level(p).g>0).length+' of '+near.peers.length+' nearby.':near.inVoice>1?near.inVoice-1+' other'+(near.inVoice>2?'s':'')+' in voice, none close to you.':'You\\'re the only one in voice right now.');
    const want=new Set(near.peers.map(p=>p.rid));for(const p of near.peers)ensure(p.rid).seen=Date.now();
    for(const [rid,x] of peers)if(!want.has(rid)&&Date.now()-x.seen>5000)drop(rid);   // a short grace period so walking along the edge doesn't keep reconnecting
    tune();draw()});
  es.addEventListener('signal',ev=>onSignal(JSON.parse(ev.data)));
  es.addEventListener('gone',ev=>drop(JSON.parse(ev.data).rid));
  es.addEventListener('replaced',()=>{leave();status('Opened somewhere else','You joined voice in another tab or device, so this one stopped.')});
  es.onerror=()=>{if(es&&es.readyState===2){leave();status('Disconnected','The connection dropped. Join again.')}}};
const leave=()=>{if(es){es.close();es=null}for(const rid of [...peers.keys()])drop(rid);if(mic){for(const t of mic.getTracks())t.stop();mic=null}cancelAnimationFrame(raf);
  vc.classList.remove('on','muted');muted=false;$('vMute').textContent='Mute';$('vJoin').hidden=false;$('vJoin').disabled=false;$('vMute').hidden=true;$('vLeave').hidden=true;near.peers=[];draw();status('Not connected','Join to hear players near you in game.')};
$('vJoin').onclick=join;$('vLeave').onclick=leave;
$('vMute').onclick=()=>{muted=!muted;if(mic)for(const t of mic.getAudioTracks())t.enabled=!muted;vc.classList.toggle('muted',muted);$('vMute').textContent=muted?'Unmute':'Mute';post('/voice/mute',{muted});status(muted?'Muted':'Connected','')};
addEventListener('pagehide',()=>{if(es)es.close()});
` });
