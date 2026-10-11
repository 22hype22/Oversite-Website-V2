// The proximity voice page (/:slug/prox; the old /c/:slug/voice sends you there): join, mute, see who is near. Audio is peer to peer (WebRTC); every second the
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
.vc-set h2{margin:0 0 4px;font-size:16px}.vc-set>p{margin:0 0 14px;color:var(--faint);font-size:12.5px}
.vc-g{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:14px 18px}
.vc-f{display:grid;gap:6px;min-width:0}.vc-f>span{font-size:12.5px;color:var(--dim);display:flex;justify-content:space-between;gap:8px}.vc-f>span em{font-style:normal;color:var(--faint)}
.vc-f select{width:100%;min-width:0;max-width:100%;padding:8px 30px 8px 10px;font-size:13px;overflow:hidden;white-space:nowrap;text-overflow:ellipsis}.vc-f input[type=range]{width:100%;accent-color:#4C8DFF}
.vc-f small{color:var(--faint);font-size:12px}
.vc-mtr{position:relative;height:6px;border-radius:6px;background:rgba(255,255,255,.08);overflow:hidden}.vc-mtr i{display:block;height:100%;width:0;background:#46D07C;transition:width .06s}.vc-mtr b{position:absolute;top:-2px;bottom:-2px;width:2px;background:#E9B04C;left:0}
.vc-mtr.low i{background:rgba(240,242,245,.3)}
.vc-sw{display:flex;flex-wrap:wrap;gap:8px 18px;margin:16px 0 0}.vc-sw .chk{margin:0}
.vc-tst{display:flex;align-items:center;gap:10px;flex-wrap:wrap;margin:16px 0 0}.vc-tst small{color:var(--faint);font-size:12px}
@media (max-width:560px){.vc-g{grid-template-columns:1fr}}
@media (max-width:560px){.vc-vol{width:56px}}
`;
// inside the CAD's voice panel: no site header, footer or page title, and links open in the CAD's own window
const EMBED_CSS = `body{background:transparent}.vc{max-width:none;margin:0;padding:12px 12px 24px}.vc-hd{display:none}.vc-g{grid-template-columns:1fr}.vc-join{gap:12px}.vc-orb{width:56px;height:56px}.vc-orb svg{width:24px;height:24px}`;
const HEADSET = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 15v-3a8 8 0 0 1 16 0v3"/><rect x="3" y="14" width="4.5" height="6.5" rx="1.6"/><rect x="16.5" y="14" width="4.5" height="6.5" rx="1.6"/></svg>';

export const voicePage = ({ logo, user, c, settings, keyOk, embed = false }) => layout({ title: `Voice · ${c.name}`, logo, user, ...(embed ? { top: false, bg: false, intro: false, foot: false } : {}), body: `<style>${CSS}${embed ? EMBED_CSS : ''}</style>
<main class="vc" id="vc"><div class="vc-hd"><div><h1>Proximity voice</h1><p>${esc(c.name)} · hear the players near you in ER:LC</p></div><a class="btn sm" href="/${esc(c.slug)}">Open CAD</a></div>
${!settings.on ? `<section class="card vc-off">Proximity voice is turned off for this server. The owner can turn it on in <a href="/${esc(c.slug)}/settings#voice"${embed ? ' target="_top"' : ''}>Settings</a>.</section>`
  : !keyOk ? `<section class="card vc-off">This server isn't linked to ER:LC yet, so Oversite can't tell where anyone is. The owner can connect it in <a href="/${esc(c.slug)}/settings"${embed ? ' target="_top"' : ''}>Settings</a>.</section>`
  : `<div class="vc-main">
<section class="card vc-join"><span class="vc-orb" aria-hidden="true">${HEADSET}<i></i></span><div class="vc-st"><b id="vS">Not connected</b><small id="vSub">Join to hear players near you in game. Keep this tab open while you play.</small></div>
<div class="vc-acts"><button class="btn pri" id="vJoin">Join voice</button><button class="btn" id="vMute" hidden>Mute</button><button class="btn" id="vLeave" hidden>Leave</button></div></section>
<section class="card vc-set" id="vSet"><h2>Audio settings</h2><p>Saved on this browser. Changes apply straight away, even while you're in voice.</p>
<div class="vc-g">
<label class="vc-f"><span>Microphone</span><select id="sIn"><option value="">Default microphone</option></select></label>
<label class="vc-f"><span>Speakers or headphones</span><select id="sOut"><option value="">Default output</option></select><small id="sOutNote" hidden>Your browser plays voice through your system's default output. Chrome and Edge let you pick one here.</small></label>
<label class="vc-f"><span>Input volume <em id="sInV">100%</em></span><input type="range" id="sInVol" min="0" max="200" step="5" value="100"></label>
<label class="vc-f"><span>Output volume <em id="sOutV">100%</em></span><input type="range" id="sOutVol" min="0" max="200" step="5" value="100"></label>
<label class="vc-f"><span>Voice mode</span><select id="sMode"><option value="vad">Voice activity</option><option value="hold">Push to talk: hold the key</option><option value="toggle">Push to talk: press to turn on and off</option></select></label>
<div class="vc-f" id="sKeyF" hidden><span>Push-to-talk key</span><button class="btn sm" type="button" id="sKey">Set a key</button></div>
<p class="vc-f" id="sKeyNote" style="grid-column:1/-1;margin:0" hidden><small>The key works while this browser window is in front, for example on a second monitor while you play. Roblox doesn't pass key presses to websites, so it can't see the key while the game window is focused. Mouse side buttons work too.</small></p>
<label class="vc-f" id="sSensF" style="grid-column:1/-1"><span>Input sensitivity <em id="sSensV">Off</em></span><input type="range" id="sSens" min="0" max="100" step="1" value="0"><span class="vc-mtr" id="sMtr"><i></i><b></b></span><small>Off sends everything your mic hears. Turn it up and your voice only goes out when it's louder than the yellow line, which keeps keyboard and background noise out.</small></label>
</div>
<div class="vc-sw"><label class="chk"><input type="checkbox" id="sNs" checked> Noise suppression</label><label class="chk"><input type="checkbox" id="sEc" checked> Echo cancellation</label><label class="chk"><input type="checkbox" id="sAgc" checked> Automatic gain control</label></div>
<div class="vc-tst"><button class="btn sm" id="sTest" type="button">Test microphone</button><small id="sTestNote">Hear yourself the way others will. Wear headphones.</small></div>
<p id="sNames" class="vc-e" style="padding:8px 0 0" hidden>Device names show once you allow the microphone (press Join voice or Test microphone).</p></section>
<section class="card vc-near"><h2>Nearby <span id="vCount"></span></h2><div class="vc-l" id="vL"><p class="vc-e">Nobody yet. People show up here when they're in voice and close to you in game.</p></div></section>
<section class="card"><ul class="vc-tips"><li>Wear headphones, or other players hear themselves through your speakers.</li><li>Voices get quieter with distance and stop at about ${settings.range === 'short' ? '25' : settings.range === 'long' ? '60' : '40'} m.${settings.muffle ? ' Inside a vehicle, people outside sound muffled, and so do you to them.' : ''}</li><li>Your position comes from ER:LC about once a second, so volume follows you with a short delay.</li></ul></section></div>`}
</main>`, script: !settings.on || !keyOk ? '' : `
const API=${JSON.stringify(`/c/${c.slug}/api`)};
const $=id=>document.getElementById(id),vc=$('vc'),S=$('vS'),SUB=$('vSub'),L=$('vL');
const e=t=>String(t??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
let es=null,me='',ice=[],mic=null,ac=null,muted=false,near={range:90,peers:[],found:false,veh:false,muffle:true};
// ── audio settings, kept on this browser ──
const DEF={inId:'',outId:'',inVol:100,outVol:100,sens:0,ns:true,ec:true,agc:true,mode:'vad',key:null};
let cfg={...DEF};try{cfg={...DEF,...JSON.parse(localStorage.getItem('ov-voice')||'{}')}}catch(_){}
const save=()=>{try{localStorage.setItem('ov-voice',JSON.stringify(cfg))}catch(_){}};
// mic -> input volume -> sensitivity gate -> what is sent; everyone you hear -> output volume -> speakers.
// What is sent is its own track, so changing the mic or its settings never touches the calls.
let micSrc=null,inGain=null,gate=null,sendDest=null,sendTrack=null,master=null,monitor=false,loudAt=0,talkKey=false;
// The gate (sensitivity and push to talk) runs on the audio thread: drawing loops stop while this panel or tab is hidden,
// and you are usually in the game window then. It reports the mic level back for the meter.
const GATE=\`class G extends AudioWorkletProcessor{constructor(){super();this.th=0;this.mode='vad';this.key=false;this.hold=0;this.g=0;this.n=0;this.port.onmessage=e=>Object.assign(this,e.data)}
process(ins,outs){const i=ins[0],o=outs[0];if(!i||!i.length)return true;let m=0;for(const ch of i)for(let k=0;k<ch.length;k++){const v=ch[k]<0?-ch[k]:ch[k];if(v>m)m=v}
const pct=Math.min(100,m*200);let open;if(this.mode!=='vad')open=this.key;else{if(!this.th||pct>=this.th)this.hold=currentTime+.35;open=currentTime<this.hold}
const t=open?1:0,a=open?.01:.0006;let g=this.g;const gs=new Float32Array(o[0].length);for(let k=0;k<gs.length;k++){g+=(t-g)*a;gs[k]=g}this.g=g;
for(let c=0;c<o.length;c++){const s=i[c]||i[0],d=o[c];for(let k=0;k<d.length;k++)d[k]=s[k]*gs[k]}
if(++this.n%4===0)this.port.postMessage({pct,open});return true}}registerProcessor('ov-gate',G)\`;
const sendGate=()=>{if(gate&&gate.port)gate.port.postMessage({th:cfg.sens,mode:cfg.mode,key:talkKey});else if(gate&&cfg.mode!=='vad')gate.gain.setTargetAtTime(talkKey?1:0,ac.currentTime,.01)};
const selfLevel=({pct,open})=>{const bar=$('sMtr');bar.querySelector('i').style.width=pct.toFixed(0)+'%';bar.classList.toggle('low',!open);
  vc.style.setProperty('--lvl',muted||!open?0:Math.min(1,pct/100).toFixed(2));vc.classList.toggle('tx',!!open&&!muted)};
const tell=()=>{try{if(parent!==window)parent.postMessage({type:'ov-voice',on:!!es,muted},location.origin)}catch(_){}};
const canSink=!!(window.AudioContext&&AudioContext.prototype.setSinkId);
const audio=async()=>{if(ac)return;ac=new (window.AudioContext||window.webkitAudioContext)();await ac.resume();
  inGain=ac.createGain();sendDest=ac.createMediaStreamDestination();master=ac.createGain();
  try{await ac.audioWorklet.addModule(URL.createObjectURL(new Blob([GATE],{type:'text/javascript'})));gate=new AudioWorkletNode(ac,'ov-gate');gate.port.onmessage=ev=>selfLevel(ev.data)}
  catch(_){gate=ac.createGain()}   // an old browser: the gate falls back to the page's own loop below
  inGain.connect(gate).connect(sendDest);master.connect(ac.destination);sendTrack=sendDest.stream.getAudioTracks()[0];
  meter.an=ac.createAnalyser();meter.an.fftSize=256;inGain.connect(meter.an);applyLevels();sendGate();await applyOut();meter()};
const applyLevels=()=>{if(!ac)return;inGain.gain.setTargetAtTime(cfg.inVol/100,ac.currentTime,.05);master.gain.setTargetAtTime(cfg.outVol/100,ac.currentTime,.05)};
const applyOut=async()=>{if(!ac||!canSink)return;try{await ac.setSinkId(cfg.outId||'')}catch(_){cfg.outId='';save();fill()}};
const openMic=async()=>{const want=(id)=>({audio:{...(id?{deviceId:{exact:id}}:{}),echoCancellation:cfg.ec,noiseSuppression:cfg.ns,autoGainControl:cfg.agc}});
  let s;try{s=await navigator.mediaDevices.getUserMedia(want(cfg.inId))}catch(err){if(!cfg.inId)throw err;cfg.inId='';save();s=await navigator.mediaDevices.getUserMedia(want(''))}
  if(micSrc)try{micSrc.disconnect()}catch(_){}if(mic)for(const t of mic.getTracks())t.stop();
  mic=s;micSrc=ac.createMediaStreamSource(mic);micSrc.connect(inGain);fill()};
const closeAudio=()=>{if(mic){for(const t of mic.getTracks())t.stop();mic=null}cancelAnimationFrame(raf);if(ac){ac.close().catch(()=>{});ac=null}micSrc=inGain=gate=sendDest=sendTrack=master=null;monitor=false;$('sTest').textContent='Test microphone';vc.style.setProperty('--lvl',0)};
const fill=async()=>{if(!navigator.mediaDevices||!navigator.mediaDevices.enumerateDevices)return;let ds=[];try{ds=await navigator.mediaDevices.enumerateDevices()}catch(_){}
  const put=(sel,kind,first,cur)=>{const list=ds.filter(d=>d.kind===kind&&d.deviceId&&d.deviceId!=='default'&&d.deviceId!=='communications');
    const name=(d,i)=>(d.label||(kind==='audioinput'?'Microphone ':'Output ')+(i+1)).replace(/\s*\([0-9a-f]{4}:[0-9a-f]{4}\)\s*$/i,'');   // drop the USB id Chrome adds
    sel.innerHTML='<option value="">'+first+'</option>'+list.map((d,i)=>'<option value="'+e(d.deviceId)+'" title="'+e(name(d,i))+'">'+e(name(d,i))+'</option>').join('');
    sel.value=list.some(d=>d.deviceId===cur)?cur:'';sel.title=sel.selectedOptions[0]?sel.selectedOptions[0].textContent:''};
  put($('sIn'),'audioinput','Default microphone',cfg.inId);put($('sOut'),'audiooutput','Default output',cfg.outId);
  $('sNames').hidden=ds.some(d=>d.label)};
const show=()=>{$('sInVol').value=cfg.inVol;$('sInV').textContent=cfg.inVol+'%';$('sOutVol').value=cfg.outVol;$('sOutV').textContent=cfg.outVol+'%';
  $('sSens').value=cfg.sens;$('sSensV').textContent=cfg.sens?cfg.sens+'%':'Off';$('sMtr').querySelector('b').style.left=cfg.sens+'%';$('sMtr').querySelector('b').hidden=!cfg.sens;
  $('sNs').checked=cfg.ns;$('sEc').checked=cfg.ec;$('sAgc').checked=cfg.agc;$('sOut').hidden=!canSink;$('sOutNote').hidden=canSink;
  const ptt=cfg.mode!=='vad';$('sMode').value=cfg.mode;$('sKeyF').hidden=!ptt;$('sKeyNote').hidden=!ptt;$('sSensF').hidden=ptt;
  $('sKey').textContent=capturing?'Press a key or mouse button…':cfg.key?cfg.key.label:'Set a key'};
const remic=async()=>{save();if(mic)try{await openMic()}catch(_){status('No microphone','That microphone could not be opened. Pick another one.')}};
$('sIn').onchange=()=>{cfg.inId=$('sIn').value;remic()};
$('sOut').onchange=async()=>{cfg.outId=$('sOut').value;save();await applyOut()};
$('sInVol').oninput=()=>{cfg.inVol=+$('sInVol').value;save();show();applyLevels()};
$('sOutVol').oninput=()=>{cfg.outVol=+$('sOutVol').value;save();show();applyLevels()};
$('sSens').oninput=()=>{cfg.sens=+$('sSens').value;save();show();sendGate()};
$('sMode').onchange=()=>{cfg.mode=$('sMode').value;talkKey=false;save();show();sendGate()};
// push to talk: hold the key (or press it to switch talking on and off). Keys reach this page while its window is in front;
// inside the CAD's panel the CAD's own keys count too. Typing in a box never triggers it.
let capturing=false;
const keyName=c=>c.startsWith('Mouse')?'Mouse '+c.slice(5):c.replace(/^Key/,'').replace(/^Digit/,'').replace(/^Numpad(.+)/,'Numpad $1').replace(/(Left|Right)$/,' ($1)').replace(/^Arrow(.+)/,'$1 arrow')||c;
const typing=t=>t&&(t.isContentEditable||/^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName))&&!(t.tagName==='INPUT'&&/^(range|checkbox|radio|button)$/.test(t.type));
const press=(code,down,ev)=>{if(capturing&&down){if(code!=='Escape')cfg.key={code,label:keyName(code)};capturing=false;save();show();ev.preventDefault();ev.stopPropagation();return}
  if(cfg.mode==='vad'||!cfg.key||code!==cfg.key.code||(down&&typing(ev.target)))return;
  if(cfg.mode==='hold'){if(ev.repeat)return;talkKey=down}else if(down&&!ev.repeat)talkKey=!talkKey;else return;
  ev.preventDefault();sendGate()};
const bind=w=>{w.addEventListener('keydown',ev=>press(ev.code,true,ev),true);w.addEventListener('keyup',ev=>press(ev.code,false,ev),true);
  w.addEventListener('mousedown',ev=>{if(ev.button>=3||(capturing&&ev.button===1))press('Mouse'+(ev.button+1),true,ev)},true);
  w.addEventListener('mouseup',ev=>{if(ev.button>=3||ev.button===1)press('Mouse'+(ev.button+1),false,ev);if(ev.button>=3&&cfg.key&&cfg.key.code==='Mouse'+(ev.button+1))ev.preventDefault()},true);   // the side buttons would go back a page otherwise
  w.addEventListener('blur',()=>{if(cfg.mode==='hold'&&talkKey){talkKey=false;sendGate()}})};
bind(window);try{if(parent!==window&&parent.location.origin===location.origin)bind(parent)}catch(_){}
$('sKey').onclick=()=>{capturing=true;show()};
for(const [id,k] of [['sNs','ns'],['sEc','ec'],['sAgc','agc']])$(id).onchange=()=>{cfg[k]=$(id).checked;remic()};
$('sTest').onclick=async()=>{if(monitor){monitor=false;try{gate.disconnect(master)}catch(_){}$('sTest').textContent='Test microphone';if(!es)closeAudio();return}
  try{await audio();if(!mic)await openMic()}catch(_){return status('No microphone','Your browser blocked the mic. Allow it in the address bar and try again.')}
  gate.connect(master);monitor=true;$('sTest').textContent='Stop test'};
for(const id of ['sIn','sOut'])$(id).addEventListener('change',()=>{const o=$(id).selectedOptions[0];$(id).title=o?o.textContent:''});
if(navigator.mediaDevices)navigator.mediaDevices.ondevicechange=fill;
show();fill();sendGate();
const peers=new Map();   // rid -> { pc, gain, filter, an, el, queue, name, seen }
window.__voicePeers=peers;   // for checking a connection from the browser console
const post=(p,b)=>fetch(API+p,{method:'POST',headers:{'content-type':'application/json','x-oversite':'1'},body:JSON.stringify(b)}).then(r=>r.json()).catch(()=>({}));
const sig=(to,data)=>post('/voice/signal',{to,data});
const status=(t,s)=>{S.textContent=t;SUB.textContent=s};

// how loud someone is: full volume up close, fading to silence at the edge of the range; through a vehicle, quieter and muffled
const level=p=>{const R=near.range,full=R*.25;let g=p.d<=full?1:Math.max(0,1-(p.d-full)/(R-full));const through=near.muffle&&(near.veh!==p.veh||(near.veh&&p.veh&&p.d>8));return{g:through?g*.45:g,muff:through}};
const tune=()=>{for(const p of near.peers){const x=peers.get(p.rid);if(!x||!x.gain)continue;const{g,muff}=level(p),t=ac.currentTime;
  x.gain.gain.setTargetAtTime(p.muted?0:g,t,.08);x.filter.frequency.setTargetAtTime(muff?650:20000,t,.08)}};

const ensure=rid=>{let x=peers.get(rid);if(x)return x;
  const pc=new RTCPeerConnection({iceServers:ice});x={pc,queue:[],seen:Date.now()};peers.set(rid,x);
  pc.addTrack(sendTrack,sendDest.stream);
  pc.onicecandidate=ev=>{if(ev.candidate)sig(rid,{ice:ev.candidate})};
  pc.ontrack=ev=>{const st=ev.streams[0];if(x.src)return;
    x.el=new Audio();x.el.srcObject=st;x.el.muted=true;x.el.play().catch(()=>{});   // Chrome only plays WebRTC audio into Web Audio while an element holds the stream
    x.src=ac.createMediaStreamSource(st);x.filter=ac.createBiquadFilter();x.filter.type='lowpass';x.filter.frequency.value=20000;x.gain=ac.createGain();x.gain.gain.value=0;
    x.an=ac.createAnalyser();x.an.fftSize=256;x.src.connect(x.filter).connect(x.gain).connect(master);x.src.connect(x.an);tune()};
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
  if(meter.an&&gate&&!gate.port){meter.an.getByteTimeDomainData(buf);let m=0;for(const v of buf)m=Math.max(m,Math.abs(v-128));
    const pct=Math.min(100,m/64*100),open=cfg.mode!=='vad'?talkKey:(!cfg.sens||pct>=cfg.sens);if(open)loudAt=performance.now();const on=cfg.mode!=='vad'?talkKey:open||performance.now()-loudAt<350;   // hold briefly so word endings aren't cut
    selfLevel({pct,open:on});gate.gain.setTargetAtTime(on?1:0,ac.currentTime,on?.01:.08)}};

const join=async()=>{$('vJoin').disabled=true;status('Starting…','Allow microphone access when your browser asks.');
  try{await audio();if(!mic)await openMic()}
  catch(err){closeAudio();$('vJoin').disabled=false;return status('No microphone','Your browser blocked the mic. Allow it in the address bar and try again.')}
  es=new EventSource(API+'/voice/stream');
  es.addEventListener('hello',ev=>{const j=JSON.parse(ev.data);me=j.you;ice=j.ice;vc.classList.add('on');$('vJoin').hidden=true;$('vMute').hidden=false;$('vLeave').hidden=false;tell()});
  es.addEventListener('near',ev=>{near=JSON.parse(ev.data);
    if(!near.live)status('Waiting for ER:LC','Oversite is reading positions from the game. This takes a few seconds.');
    else if(!near.found)status('Not in the server','Join the ER:LC server with your Roblox account and you\\'ll hear people near you.');
    else status(muted?'Muted':'Connected'+(near.veh?' · in a vehicle':''),near.peers.length?'You can hear '+near.peers.filter(p=>level(p).g>0).length+' of '+near.peers.length+' nearby.':near.inVoice>1?near.inVoice-1+' other'+(near.inVoice>2?'s':'')+' in voice, none close to you.':'You\\'re the only one in voice right now.');
    const want=new Set(near.peers.map(p=>p.rid));for(const p of near.peers)ensure(p.rid).seen=Date.now();
    for(const [rid,x] of peers)if(!want.has(rid)&&Date.now()-x.seen>15000)drop(rid);   // a grace period so walking along the edge doesn't keep reconnecting
    tune();draw()});
  es.addEventListener('signal',ev=>onSignal(JSON.parse(ev.data)));
  es.addEventListener('gone',ev=>drop(JSON.parse(ev.data).rid));
  es.addEventListener('replaced',()=>{leave();status('Opened somewhere else','You joined voice in another tab or device, so this one stopped.')});
  es.onerror=()=>{if(es&&es.readyState===2){leave();status('Disconnected','The connection dropped. Join again.')}}};
const leave=()=>{if(es){es.close();es=null}for(const rid of [...peers.keys()])drop(rid);closeAudio();
  vc.classList.remove('on','muted');muted=false;$('vMute').textContent='Mute';$('vJoin').hidden=false;$('vJoin').disabled=false;$('vMute').hidden=true;$('vLeave').hidden=true;near.peers=[];draw();status('Not connected','Join to hear players near you in game.');tell()};
$('vJoin').onclick=join;$('vLeave').onclick=leave;
$('vMute').onclick=()=>{muted=!muted;if(sendTrack)sendTrack.enabled=!muted;vc.classList.toggle('muted',muted);$('vMute').textContent=muted?'Unmute':'Mute';post('/voice/mute',{muted});status(muted?'Muted':'Connected','');tell()};
addEventListener('pagehide',()=>{if(es)es.close()});
` });
