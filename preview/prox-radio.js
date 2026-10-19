// Radios overheard in proximity voice. Someone on the CAD's radio without an earpiece on their Roblox avatar has it out loud,
// so when they're near you in game you hear that channel too, quieter the further away they are, through the same output as
// proximity voice. Listen only: you join the channel as a listener (/radio/join?listen=1), which the server allows only
// while such a radio is near you. The voice page tells this file who is near ('ov-near') and when you leave voice.
(() => { const API = window.OV_VOICE_API; if (!API) return;
  const chans = new Map(), failed = new Map();   // channel -> { es, me, ice, peers: Map<uid, { pc, queue, el }>, input, gain, seen }; channel -> when it was last turned away
  const sig = (ch, to, data) => fetch(API + '/radio/signal', { method: 'POST', headers: { 'content-type': 'application/json', 'x-oversite': '1' }, body: JSON.stringify({ ch, to, data, listen: true }) }).catch(() => {});
  const level = (d, range) => d >= range ? 0 : 0.75 * Math.pow(1 - d / range, 1.3) + 0.05;   // loud right next to them, gone at the edge of earshot

  const drop = (C, uid) => { const x = C.peers.get(uid); if (!x) return; try { x.pc.close(); } catch (e) {} if (x.el) x.el.srcObject = null; C.peers.delete(uid); };
  // radio users always start the connection to a listener (their ids sort first), so a listener only answers
  const ensure = (C, uid, ac) => { let x = C.peers.get(uid); if (x) return x; const pc = new RTCPeerConnection({ iceServers: C.ice || [] }); x = { pc, queue: [] }; C.peers.set(uid, x);
    pc.onicecandidate = ev => { if (ev.candidate) sig(C.ch, uid, { ice: ev.candidate }); };
    pc.ontrack = ev => { if (x.src) return; const st = ev.streams[0] || new MediaStream([ev.track]); x.el = new Audio(); x.el.srcObject = st; x.el.muted = true; x.el.play().catch(() => {});   // Chrome plays WebRTC into Web Audio only while an element holds it
      x.src = ac.createMediaStreamSource(st); x.src.connect(C.input); };
    pc.onconnectionstatechange = () => { if (pc.connectionState === 'failed') drop(C, uid); };
    return x; };
  const onSignal = async (C, ac, { from, data }) => { const x = ensure(C, from, ac), pc = x.pc;
    try { if (data.sdp) { await pc.setRemoteDescription(data.sdp); if (data.sdp.type === 'offer') { await pc.setLocalDescription(await pc.createAnswer()); sig(C.ch, from, { sdp: pc.localDescription }); } for (const c of x.queue.splice(0)) await pc.addIceCandidate(c).catch(() => {}); }
      else if (data.ice) { if (pc.remoteDescription) await pc.addIceCandidate(data.ice).catch(() => {}); else x.queue.push(data.ice); } } catch (e) { console.warn('overheard radio', e); } };

  const open = (ch, A) => { const ac = A.ac, C = { ch, peers: new Map(), seen: Date.now() };
    // sounds like a radio speaker: the telephone band, then the volume for how far away it is
    const hp = ac.createBiquadFilter(), lp = ac.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = 350; lp.type = 'lowpass'; lp.frequency.value = 3000;
    C.input = hp; C.gain = ac.createGain(); C.gain.gain.value = 0; hp.connect(lp).connect(C.gain).connect(A.master);
    C.es = new EventSource(API + '/radio/join?listen=1&ch=' + encodeURIComponent(ch));
    C.es.addEventListener('hello', e => { const j = JSON.parse(e.data); C.me = j.you; C.ice = j.ice; });
    C.es.addEventListener('gone', e => drop(C, JSON.parse(e.data).uid));
    C.es.addEventListener('signal', e => onSignal(C, ac, JSON.parse(e.data)));
    C.es.addEventListener('replaced', () => close(ch));
    C.es.onerror = () => { if (C.es.readyState === 2) { failed.set(ch, Date.now()); close(ch); } };   // turned away (the radio moved off): try again a little later
    chans.set(ch, C); return C; };
  const close = ch => { const C = chans.get(ch); if (!C) return; chans.delete(ch); try { C.es.close(); } catch (e) {} for (const uid of [...C.peers.keys()]) drop(C, uid); try { C.gain.disconnect(); } catch (e) {} };

  addEventListener('ov-near', e => { const n = e.detail || {}, A = window.ovVoiceAudio && window.ovVoiceAudio(); if (!A || !A.ac || !A.master) return;
    const want = new Map((n.radio || []).map(x => [x.ch, x.d])), range = n.range || 90;
    for (const [ch, d] of want) { if (!chans.has(ch) && Date.now() - (failed.get(ch) || 0) < 15000) continue; const C = chans.get(ch) || open(ch, A); C.seen = Date.now(); C.gain.gain.setTargetAtTime(level(d, range), A.ac.currentTime, 0.25); }
    for (const [ch, C] of chans) if (!want.has(ch)) { C.gain.gain.setTargetAtTime(0, A.ac.currentTime, 0.3); if (Date.now() - C.seen > 6000) close(ch); } });   // a grace period so stepping along the edge doesn't keep reconnecting
  addEventListener('ov-voice-leave', () => { for (const ch of [...chans.keys()]) close(ch); });
  addEventListener('pagehide', () => { for (const ch of [...chans.keys()]) close(ch); });
})();
