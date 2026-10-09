"""Staff MDT: the Server Staff tab. Players in game with warn / message / kick / ban, mod calls, the community's records,
bans and the in-game command log. Imported by rail.py; apply(s) puts the CSS, page and script in place (replacing older copies)."""
import re

CSS = r"""  /* staff:start  Staff MDT (Server Staff tab) */
  .sdock{position:fixed;top:calc(var(--barh) + var(--gap));bottom:var(--gap);left:50%;z-index:7;
    width:min(calc(100vw - 2*var(--gap)),calc((100vh - var(--barh) - 2*var(--gap)) * 1.6));
    transform:translateX(calc(-50% + 100vw));transition:transform .6s cubic-bezier(.32,.72,0,1);pointer-events:none;display:flex;align-items:center;justify-content:center}
  body[data-view="staff"] .sdock{transform:translateX(-50%);pointer-events:auto}
  body[data-view="staff"] .rail,body[data-view="staff"] .stage{transform:translateX(calc(-100% - 60px));opacity:0;pointer-events:none}
  body[data-view="staff"] .pins{display:none}
  body[data-view="staff"] .view::after{opacity:.3}
  .sdock .screen{--fd:#8E8CF5;--fd-soft:rgba(142,140,245,.14)}
  .sdock .tscreen.split.on{display:grid;grid-template-columns:minmax(230px,300px) 1fr;gap:20px;overflow:hidden;padding-bottom:0}
  .sdock .split .col{min-height:0;overflow-y:auto;scrollbar-width:none;padding-bottom:20px}
  .sdock .split .col::-webkit-scrollbar{display:none}
  .sdock .split .col:first-child{border-right:1px solid var(--line);padding-right:16px}
  .sdock .thead h2{margin:0;font-size:17px;font-weight:600}
  .sdock .thead small{display:block;color:var(--mute);font-size:11.5px;margin-top:2px}
  .sdock .st-search{margin:0 0 10px}
  .sdock .tside .ann{margin-top:8px;color:#E9EAEC;border:1px solid var(--line)}
  @media (max-width:1180px){.sdock .tscreen.split.on{grid-template-columns:200px 1fr}}
  /* Map app: every player, civilians included */
  .sdock .tscreen.mapp.on{display:flex;flex-direction:column;overflow:hidden;padding-bottom:18px}
  .sdock .mapp .thead{flex-wrap:wrap}
  .st-mfilt{display:flex;gap:6px;flex-wrap:wrap}
  .st-mfilt button{font:inherit;font-size:12px;padding:6px 11px;border-radius:999px;border:1px solid var(--line);background:none;color:var(--mute);cursor:pointer;display:flex;gap:6px;align-items:center}
  .st-mfilt button b{font-weight:600;color:#E9EAEC}
  .st-mfilt button[aria-pressed="true"]{color:#fff;background:rgba(255,255,255,.08);border-color:rgba(255,255,255,.18)}
  .st-mapwrap{position:relative;flex:1;min-height:0;overflow:hidden;border-radius:12px;background:#3E6973;cursor:grab;touch-action:none;border:1px solid var(--line)}
  .st-mapwrap.drag{cursor:grabbing}
  .st-mapin{position:absolute;left:0;top:0;width:1000px;height:1000px;transform-origin:0 0;will-change:transform}
  .st-mapin img{position:absolute;inset:0;width:100%;height:100%;user-select:none;pointer-events:none}
  .st-dot{position:absolute;left:0;top:0;transition:transform .45s linear}
  .st-dot i{position:absolute;left:0;top:0;width:12px;height:12px;margin:-6px 0 0 -6px;border-radius:50%;background:var(--c);border:2px solid #0C0D0F;box-shadow:0 0 0 1px rgba(255,255,255,.25);transform:scale(var(--inv,1));cursor:pointer}
  .st-dot b{position:absolute;left:0;top:0;white-space:nowrap;font-size:11px;font-weight:600;color:#fff;text-shadow:0 1px 3px #000,0 0 2px #000;transform:translate(9px,-50%) scale(var(--inv,1));transform-origin:-9px 50%;opacity:0;pointer-events:none;transition:opacity .15s}
  .st-dot:hover b,.st-mapwrap.near .st-dot b{opacity:1}
  .st-dot.dim{opacity:.18}
  .st-mapctl{position:absolute;right:10px;top:10px;display:flex;flex-direction:column;gap:6px}
  .st-mapctl button{width:32px;height:32px;border-radius:9px;border:1px solid var(--line);background:rgba(12,13,15,.85);color:#E9EAEC;font:inherit;font-size:16px;cursor:pointer}
  .st-legend{position:absolute;left:10px;bottom:10px;display:flex;gap:10px;flex-wrap:wrap;padding:7px 10px;border-radius:9px;background:rgba(12,13,15,.85);font-size:11px;color:var(--mute)}
  .st-legend span{display:flex;align-items:center;gap:5px}.st-legend i{width:8px;height:8px;border-radius:50%;background:var(--c)}
  .staffp .ph .sv{display:flex;align-items:center;gap:10px;min-width:0}
  .staffp .ph .sv b{display:block;font-size:15px;font-weight:500}
  .staffp .ph .sv small{display:block;font-size:11px;color:var(--dim);margin-top:1px}
  .staffp .live{width:8px;height:8px;border-radius:50%;background:var(--green);box-shadow:0 0 0 3px rgba(70,208,124,.18);flex:none}
  .staffp .live.off{background:var(--faint);box-shadow:none}
  .st-search{margin:12px 18px 4px;display:flex;align-items:center;gap:8px;padding:8px 11px;border-radius:10px;background:rgba(240,242,245,.05);border:1px solid var(--hair)}
  .st-search input{flex:1;min-width:0;background:none;border:0;outline:0;color:var(--ink);font:inherit;font-size:12.5px}
  .st-search svg{color:var(--faint);flex:none}
  .st-list{display:grid;gap:2px}
  .st-p{display:grid;grid-template-columns:30px 1fr auto;align-items:center;gap:10px;padding:8px 10px;border-radius:11px;cursor:pointer;text-align:left;width:100%;background:none;border:1px solid transparent;color:inherit;font:inherit}
  .st-p:hover{background:rgba(240,242,245,.05)}
  .st-p[aria-pressed="true"]{background:rgba(240,242,245,.08);border-color:var(--hair2)}
  .st-av{width:30px;height:30px;border-radius:9px;display:grid;place-items:center;font-size:11px;font-weight:600;background:rgba(240,242,245,.08);color:var(--ink)}
  .st-av,.tuser i{position:relative;overflow:hidden}
  .st-av img,.tuser i img{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;background:#2A2C31}
  .st-p b{display:block;font-size:12.5px;font-weight:500;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
  .st-p small{display:flex;align-items:center;gap:6px;font-size:10.5px;color:var(--dim);white-space:nowrap;overflow:hidden}
  .st-team{display:inline-flex;align-items:center;gap:5px}.st-team i{width:6px;height:6px;border-radius:50%;background:var(--c,#8A8F98)}
  .st-badges{display:flex;gap:4px}
  .st-b{font-size:9.5px;font-weight:600;padding:2px 6px;border-radius:6px;letter-spacing:.02em;white-space:nowrap}
  .st-b.perm{color:#9DBEFF;background:rgba(76,141,255,.14)}
  .st-b.w{color:#F1C48A;background:rgba(233,162,76,.14)} .st-b.k{color:#F0A0A0;background:rgba(226,75,75,.14)} .st-b.bn{color:#fff;background:rgba(226,75,75,.55)}
  .st-tabs{display:flex;gap:4px;padding:10px 14px 0;border-bottom:1px solid var(--hair);overflow-x:auto;scrollbar-width:none}
  .st-tabs button{background:none;border:0;color:var(--dim);font:inherit;font-size:12.5px;padding:9px 12px 11px;border-bottom:2px solid transparent;cursor:pointer;white-space:nowrap;display:flex;align-items:center;gap:6px}
  .st-tabs button[aria-selected="true"]{color:var(--ink);border-bottom-color:var(--ink)}
  .st-tabs .cnt{font-size:10px}
  .st-tabs .st-btn{border:1px solid var(--hair2);background:rgba(240,242,245,.06);color:var(--ink);padding:6px 13px;border-radius:999px}
  .st-pane[hidden]{display:none}
  .st-who{display:flex;align-items:center;gap:14px;margin-bottom:14px}
  .st-who .st-av{width:46px;height:46px;border-radius:13px;font-size:16px}
  .st-who h3{margin:0;font-size:17px;font-weight:500}
  .st-who p{margin:3px 0 0;font-size:11.5px;color:var(--dim)}
  .st-facts{display:grid;grid-template-columns:repeat(auto-fit,minmax(120px,1fr));gap:8px;margin-bottom:14px}
  .st-facts div{padding:10px 12px;border-radius:11px;background:rgba(240,242,245,.04);border:1px solid var(--hair)}
  .st-facts small{display:block;font-size:10px;color:var(--faint);text-transform:uppercase;letter-spacing:.06em}
  .st-facts b{display:block;font-size:13px;font-weight:500;margin-top:3px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
  .st-acts{display:grid;grid-template-columns:repeat(5,1fr);gap:8px;margin-bottom:18px}
  .st-act{display:flex;flex-direction:column;align-items:center;gap:6px;padding:12px 6px;border-radius:12px;border:1px solid var(--hair2);background:rgba(240,242,245,.05);color:var(--ink);font:inherit;font-size:12px;font-weight:500;cursor:pointer;transition:background-color .15s ease,transform .12s cubic-bezier(0.23,1,0.32,1)}
  .st-act:active{transform:scale(.97)}
  .st-act svg{opacity:.85}
  .st-act.k-warn{color:#F1C48A}.st-act.k-kick{color:#F0A0A0}.st-act.k-ban{color:#fff;background:rgba(226,75,75,.22);border-color:rgba(226,75,75,.45)}
  @media (hover:hover) and (pointer:fine){.st-act:hover{background:rgba(240,242,245,.1)}.st-act.k-ban:hover{background:rgba(226,75,75,.32)}}
  .st-h{display:flex;align-items:center;justify-content:space-between;font-size:12px;color:var(--dim);margin:4px 0 8px}
  .st-rec{display:grid;grid-template-columns:62px 1fr auto;gap:4px 12px;align-items:start;padding:11px 0;border-bottom:1px solid var(--hair)}
  .st-rec:last-child{border-bottom:0}
  .st-k{font-size:9.5px;font-weight:600;letter-spacing:.05em;text-transform:uppercase;padding:3px 7px;border-radius:6px;margin-top:1px}
  .st-k.k-warn{color:#F1C48A;background:rgba(233,162,76,.14)}.st-k.k-kick{color:#F0A0A0;background:rgba(226,75,75,.14)}.st-k.k-ban{color:#fff;background:rgba(226,75,75,.55)}
  .st-k.k-unban{color:#7BE3A1;background:rgba(70,208,124,.12)}.st-k.k-note{color:var(--dim);background:rgba(240,242,245,.07)}
  .st-rec b{font-size:12.5px;font-weight:500}.st-rec p{margin:2px 0 0;font-size:12px;color:var(--dim);line-height:1.45;word-break:break-word}
  .st-rec time{font-size:10.5px;color:var(--faint);white-space:nowrap;font-variant-numeric:tabular-nums}
  .st-rec .side{display:flex;flex-direction:column;align-items:flex-end;gap:6px}
  .st-k{justify-self:start}
  .st-rec .x{background:none;border:0;color:var(--faint);font:inherit;font-size:10.5px;cursor:pointer;padding:0}
  .st-rec .x:hover{color:#F0A0A0}
  .st-row{display:flex;align-items:center;gap:10px;padding:10px 0;border-bottom:1px solid var(--hair);font-size:12.5px}
  .st-row:last-child{border-bottom:0}
  .st-row .grow{flex:1;min-width:0}.st-row small{color:var(--faint);font-size:10.5px}
  .st-row code{font-family:ui-monospace,SFMono-Regular,Menlo,monospace;font-size:11.5px;color:var(--ink);word-break:break-all}
  .st-row .lnk{background:none;border:0;color:var(--ink);font:inherit;padding:0;cursor:pointer;text-decoration:underline;text-decoration-color:var(--hair2);text-underline-offset:3px}
  .st-pill{font-size:10.5px;padding:3px 9px;border-radius:999px;white-space:nowrap}
  .st-pill.wait{color:#F1C48A;background:rgba(233,162,76,.14)}.st-pill.done{color:var(--dim);background:rgba(240,242,245,.07)}
  .st-btn{font:inherit;font-size:11.5px;font-weight:500;padding:6px 11px;border-radius:999px;border:1px solid var(--hair2);background:rgba(240,242,245,.06);color:var(--ink);cursor:pointer;white-space:nowrap}
  .st-btn:hover{background:rgba(240,242,245,.12)}
  .st-bulk{display:flex;align-items:center;gap:10px;flex-wrap:wrap;padding:10px 12px;margin:0 0 6px;border:1px solid var(--hair);border-radius:12px;background:rgba(240,242,245,.03);font-size:12px;color:var(--dim)}
  .st-bulk .grow{flex:1;min-width:0}
  .st-bulk .st-go{padding:7px 14px;font-size:12px}
  .st-bychips{display:flex;flex-wrap:wrap;gap:6px;margin:0 0 8px}
  .st-bychips button{font:inherit;font-size:11px;padding:4px 10px;border-radius:999px;border:1px solid var(--hair2);background:none;color:var(--dim);cursor:pointer}
  .st-bychips button:hover{color:var(--ink);border-color:rgba(240,242,245,.3)}
  .st-cb{appearance:none;-webkit-appearance:none;flex:none;width:17px;height:17px;margin:0;border-radius:5px;border:1.5px solid rgba(240,242,245,.28);background:none;cursor:pointer;display:grid;place-items:center;transition:background .12s,border-color .12s}
  .st-cb:checked{background:var(--ink);border-color:var(--ink)}
  .st-cb:checked::after{content:"";width:8px;height:4px;border:2px solid #0B0B0C;border-top:0;border-right:0;transform:translateY(-1px) rotate(-45deg)}
  .st-cb:indeterminate{border-color:var(--ink)}.st-cb:indeterminate::after{content:"";width:8px;height:2px;background:var(--ink);border-radius:1px}
  .st-row.sel{background:rgba(240,242,245,.04);box-shadow:-12px 0 0 rgba(240,242,245,.04),12px 0 0 rgba(240,242,245,.04)}
  .st-empty{padding:28px 6px;text-align:center;color:var(--faint);font-size:12px;line-height:1.5}
  .st-gate{display:grid;place-items:center;text-align:center;padding:40px 20px;color:var(--dim);font-size:13px;grid-column:1/-1}
  .st-gate b{display:block;color:var(--ink);font-size:16px;font-weight:500;margin-bottom:6px}
  /* the action sheet */
  .st-dlg{width:min(440px,calc(100vw - 32px));padding:0;border:1px solid var(--hair2);border-radius:18px;background:rgba(20,21,24,.97);color:var(--ink);box-shadow:0 30px 80px rgba(0,0,0,.55);
    opacity:0;transform:translateY(8px) scale(.98);transition:opacity .18s ease-out,transform .22s cubic-bezier(0.23,1,0.32,1)}
  .st-dlg.in{opacity:1;transform:none}
  .st-dlg::backdrop{background:rgba(6,7,8,.6);backdrop-filter:blur(4px)}
  .st-dlg form{padding:20px}
  .st-dlg h2{margin:0 0 4px;font-size:16px;font-weight:600}
  .st-dlg p{margin:0 0 14px;color:var(--dim);font-size:12.5px;line-height:1.5}
  .st-dlg textarea{width:100%;min-height:84px;resize:vertical;background:rgba(240,242,245,.05);border:1px solid var(--hair2);border-radius:11px;color:var(--ink);font:inherit;font-size:13px;padding:10px 12px;outline:0}
  .st-dlg textarea:focus{border-color:rgba(240,242,245,.4)}
  .st-chips{display:flex;flex-wrap:wrap;gap:6px;margin:10px 0 0}
  .st-chips button{font:inherit;font-size:11px;padding:4px 9px;border-radius:999px;border:1px solid var(--hair2);background:none;color:var(--dim);cursor:pointer}
  .st-chips button:hover{color:var(--ink);border-color:rgba(240,242,245,.3)}
  .st-dlg .acts{display:flex;justify-content:flex-end;gap:8px;margin-top:18px;align-items:center}
  .st-dlg .acts .msg{flex:1;font-size:11.5px;color:var(--dim)}
  .st-dlg .acts .msg.err{color:#F0A0A0}
  .st-go{font:inherit;font-size:12.5px;font-weight:600;padding:9px 16px;border-radius:999px;border:1px solid transparent;background:var(--ink);color:#0B0B0C;cursor:pointer}
  .st-go.danger{background:#E24B4B;color:#fff}.st-go[disabled]{opacity:.55;pointer-events:none}
  @media (max-width:980px){.st-acts{grid-template-columns:repeat(3,1fr)}}
  @media (prefers-reduced-motion:reduce){.st-dlg{transition:opacity .15s}}
  /* staff:end */
"""

HTML = r"""<!-- staff:start -->
<aside class="sdock" id="staffMdt" aria-label="Staff MDT" aria-hidden="true">
  <div class="tablet">
    <span class="cam"></span>
    <div class="screen">
      <div class="sbar"><span id="stClock">00:00</span><span class="sb-mid" id="stServer">Server Staff</span><span class="sb-r"><i id="stLive" style="width:7px;height:7px;border-radius:50%;background:var(--faint);display:inline-block"></i></span></div>
      <div class="tbody">
        <nav class="tside" role="tablist" aria-label="Staff apps" id="stTabs">
          <div class="crest" aria-hidden="true"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3 4 6v6c0 4.5 3.4 8.3 8 9 4.6-.7 8-4.5 8-9V6z"/><path d="m9 12 2 2 4-4"/></svg>Staff MDT</div>
          <button role="tab" data-p="player" aria-selected="true"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="9" cy="8" r="3.5"/><path d="M2.5 20a6.5 6.5 0 0 1 13 0M16 4.5a3.5 3.5 0 0 1 0 7M21.5 20a6.5 6.5 0 0 0-4-6"/></svg>Players<i class="badge" id="stCount">0</i></button>
          <button role="tab" data-p="map" aria-selected="false"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="m3 6 6-2 6 2 6-2v14l-6 2-6-2-6 2z"/><path d="M9 4v14M15 6v14"/></svg>Map</button>
          <button role="tab" data-p="calls" aria-selected="false"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M4 5h16v11H8l-4 4z"/><path d="M12 8v3M12 13.5h.01"/></svg>Calls<i class="badge" id="stCallsN" hidden>0</i></button>
          <button role="tab" data-p="records" aria-selected="false"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M6 3h8l4 4v14H6zM14 3v4h4M9 12h6M9 16h6"/></svg>Records</button>
          <button role="tab" data-p="bans" aria-selected="false"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><path d="m6 6 12 12"/></svg>Bans<i class="badge" id="stBansN" hidden>0</i></button>
          <button role="tab" data-p="logs" aria-selected="false"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M4 6h16M4 12h16M4 18h10"/></svg>Logs</button>
          <button class="ann" id="stAnnounce" type="button"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M3 11v2a1 1 0 0 0 1 1h2l5 4V6L6 10H4a1 1 0 0 0-1 1zM15.5 8.5a5 5 0 0 1 0 7"/></svg>Announce</button>
          <div class="tuser" aria-hidden="true"><i id="stMeAv">ST</i><small id="stMe">Staff</small></div>
        </nav>
        <div class="tscreens">
          <section class="tscreen split on st-pane" data-p="player">
            <div class="col"><div class="thead"><div><h2>In game</h2><small id="stSub">Connecting…</small></div></div>
              <label class="st-search"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></svg><input id="stFind" placeholder="Find a player" autocomplete="off" spellcheck="false"></label>
              <div class="st-list" id="stPlayers"></div></div>
            <div class="col" id="stPlayer"></div>
          </section>
          <section class="tscreen st-pane mapp" data-p="map"><div class="thead"><div><h2>Server map</h2><small id="stMapSub">Every player in the server, civilians included</small></div>
            <div class="st-mfilt" id="stMapF"><button data-f="all" aria-pressed="true">All <b id="stMfAll">0</b></button><button data-f="civ" aria-pressed="false">Civilians <b id="stMfCiv">0</b></button><button data-f="resp" aria-pressed="false">First responders <b id="stMfResp">0</b></button></div></div>
            <div class="st-mapwrap" id="stMapWrap"><div class="st-mapin" id="stMapIn"><img src="liberty-county.jpg" alt="" draggable="false" id="stMapImg"><div id="stDots"></div></div>
              <div class="st-mapctl"><button id="stZin" aria-label="Zoom in">+</button><button id="stZout" aria-label="Zoom out">−</button><button id="stZfit" aria-label="Fit map">⤢</button></div>
              <div class="st-legend" id="stLegend"></div></div></section>
          <section class="tscreen st-pane" data-p="calls"><div class="thead"><div><h2>Mod calls</h2><small>Players calling for staff in game</small></div></div><div id="stCalls"></div></section>
          <section class="tscreen st-pane" data-p="records"><div class="thead"><div><h2>Records</h2><small>Every warning, kick, ban and note</small></div></div><label class="st-search"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></svg><input id="stRecFind" placeholder="Search records by player" autocomplete="off" spellcheck="false"></label><div id="stRecords"></div></section>
          <section class="tscreen st-pane" data-p="bans"><div class="thead"><div><h2>Bans</h2><small>Banned from the server</small></div></div><div id="stBans"></div></section>
          <section class="tscreen st-pane" data-p="logs"><div class="thead"><div><h2>Logs</h2><small>In-game commands and kills</small></div></div><div id="stLogs"></div></section>
        </div>
      </div>
    </div>
    <button class="mdt-close" id="stClose" type="button" aria-label="Close staff MDT"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><path d="M6 6l12 12M18 6 6 18"/></svg></button>
  </div>
</aside>
<dialog class="st-dlg" id="stDlg"><form method="dialog"><h2 id="stDlgT">Warn</h2><p id="stDlgP"></p><textarea id="stDlgR" maxlength="180"></textarea><div class="st-chips" id="stDlgC"></div>
  <div class="acts"><span class="msg" id="stDlgM"></span><button type="button" class="st-btn" id="stDlgX">Cancel</button><button class="st-go" id="stDlgGo">Send</button></div></form></dialog>
<!-- staff:end -->
"""

JS = r"""<script id="staff">
/* Staff MDT: polls the community's staff view while the tab is open; every action goes through the server, which runs it in game and keeps the record */
(() => {
  const OV = window.OVERSITE, tab = document.querySelector('.menu [data-view="staff"]'); if (!tab) return;
  const page = document.getElementById('staffMdt'), $ = id => document.getElementById(id);
  const isStaff = !!OV && ['staff', 'admin', 'owner'].includes(OV.role), isAdmin = !!OV && ['admin', 'owner'].includes(OV.role);
  if (OV && !isStaff) { tab.remove(); dispatchEvent(new Event('resize')); return; }             // members never see the staff tab
  const toDispatch = () => document.querySelector('.menu [data-view="dispatch"]').click(); $('stClose').addEventListener('click', toDispatch);
  if (!OV) { page.querySelector('.tscreens').innerHTML = '<div class="st-gate" style="height:100%"><div><b>Server Staff</b>Open your server\'s CAD from the dashboard to use the staff tools.</div></div>'; return; }
  const API = OV.api + '/staff', post = (p, b) => fetch(API + p, { method: 'POST', headers: { 'content-type': 'application/json', 'x-oversite': '1' }, body: JSON.stringify(b) }).then(async r => { const j = await r.json().catch(() => ({})); if (!r.ok) throw new Error(j.error || 'Something went wrong.'); return j; });
  const esc = t => String(t ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const COL = { pd: '#4C8DFF', fd: '#E24B4B', dot: '#E9C24C' }, deptOf = team => (OV.teams || {})[team] || '';
  const ago = ms => { const s = Math.max(0, (Date.now() - ms) / 1000); return s < 60 ? 'just now' : s < 3600 ? Math.floor(s / 60) + 'm ago' : s < 86400 ? Math.floor(s / 3600) + 'h ago' : Math.floor(s / 86400) + 'd ago'; };
  const when = ms => new Date(ms).toLocaleString([], { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
  const ini = n => (n || '?').replace(/[^A-Za-z0-9]/g, '').slice(0, 2).toUpperCase() || '?';
  const KIND = { warn: 'Warning', kick: 'Kick', ban: 'Ban', unban: 'Unban', note: 'Note' };
  // Roblox headshot over the initials; if the picture cannot load the initials stay
  const av = (id, name, style) => `<span class="st-av"${style ? ` style="${style}"` : ''}>${esc(ini(name))}${/^\d+$/.test(id || '') ? `<img src="/rbx/avatar/${id}" alt="" loading="lazy" onerror="this.remove()">` : ''}</span>`;
  let D = null, sel = null, pane = 'player', timer = 0, recQ = '';

  // ── data ──
  const load = async () => { try { const r = await fetch(API + '/state'); const j = await r.json(); if (!r.ok) throw new Error(j.error || 'Could not load.'); D = j; render(); }
    catch (e) { $('stSub').textContent = e.message; $('stLive').style.background = 'var(--faint)'; } };
  const start = () => { if (timer) return; load(); timer = setInterval(() => { if (!document.hidden) load(); }, 5000); };
  const stop = () => { clearInterval(timer); timer = 0; };
  addEventListener('viewchange', e => { const on = e.detail === 'staff'; page.setAttribute('aria-hidden', !on); on ? start() : stop(); });
  const clock = () => { $('stClock').textContent = new Date().toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }); }; clock(); setInterval(clock, 15000);
  $('stMe').textContent = OV.me || OV.user || 'Staff'; $('stMeAv').textContent = ini($('stMe').textContent);
  if (/^\d+$/.test(OV.rid || '')) $('stMeAv').insertAdjacentHTML('beforeend', `<img src="/rbx/avatar/${OV.rid}" alt="" onerror="this.remove()">`);

  // ── rendering ──
  const counts = id => (D && D.counts[id]) || {};
  const badges = p => { const c = counts(p.id); return [p.permission && p.permission !== 'Normal' ? `<span class="st-b perm">${esc(p.permission.replace('Server ', ''))}</span>` : '',
    c.warn ? `<span class="st-b w">${c.warn} warn${c.warn > 1 ? 's' : ''}</span>` : '', c.kick ? `<span class="st-b k">${c.kick} kick${c.kick > 1 ? 's' : ''}</span>` : ''].join(''); };
  const renderPlayers = () => { const q = $('stFind').value.trim().toLowerCase(), list = (D.players || []).filter(p => !q || p.name.toLowerCase().includes(q) || p.callsign.toLowerCase().includes(q) || p.team.toLowerCase().includes(q));
    $('stCount').textContent = D.players.length; $('stSub').textContent = D.players.length + (D.players.length === 1 ? ' player' : ' players') + ' in the server';
    $('stPlayers').innerHTML = list.length ? list.map(p => `<button class="st-p" data-id="${esc(p.id)}" aria-pressed="${sel && sel.id === p.id}">${av(p.id, p.name)}<span style="min-width:0"><b>${esc(p.name)}</b><small><span class="st-team" style="--c:${COL[deptOf(p.team)] || '#8A8F98'}"><i></i>${esc(p.team || 'No team')}</span>${p.callsign ? ' · ' + esc(p.callsign) : ''}</small></span><span class="st-badges">${badges(p)}</span></button>`).join('')
      : `<div class="st-empty">${D.players.length ? 'No player matches that.' : 'Nobody is in the server right now.'}</div>`; };
  const recHTML = (r, withName) => `<div class="st-rec"><span class="st-k k-${esc(r.kind)}">${esc(KIND[r.kind] || r.kind)}</span><div>${withName ? `<b>${r.roblox_id ? `<button class="lnk" data-open="${esc(r.roblox_id)}" data-name="${esc(r.name)}" style="background:none;border:0;color:inherit;font:inherit;padding:0;cursor:pointer">${esc(r.name)}</button>` : esc(r.name)}</b>` : ''}<p>${esc(r.reason) || '<i>No reason given</i>'}</p><p style="font-size:10.5px;color:var(--faint);margin-top:3px">by ${esc(r.by_name || 'staff')}${r.result && r.result !== 'sent' ? ' · ' + esc(r.result) : ''}</p></div><span class="side"><time title="${esc(when(r.created))}">${esc(ago(r.created))}</time></span></div>`;
  const ICON = { warn: '<path d="M12 3 2 21h20zM12 10v5M12 18h.01"/>', pm: '<path d="M4 5h16v11H8l-4 4z"/>', kick: '<path d="M15 3h4v18h-4M10 17l5-5-5-5M15 12H3"/>', ban: '<circle cx="12" cy="12" r="9"/><path d="m6 6 12 12"/>', note: '<path d="M6 3h8l4 4v14H6zM14 3v4h4M9 12h6M9 16h6"/>' };
  const actBtn = (k, label) => `<button class="st-act k-${k}" data-act="${k}"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${ICON[k]}</svg>${label}</button>`;
  let shownFor = null;
  const renderPlayer = async () => { const box = $('stPlayer');
    if (!sel) { box.innerHTML = '<div class="st-empty">Pick a player on the left to warn, message, kick or ban them and see their record.</div>'; shownFor = null; return; }
    const live = (D.players || []).find(p => p.id === sel.id), p = live || sel;
    const facts = live ? [['Team', p.team || 'None'], ['Callsign', p.callsign || 'None'], ['Location', p.postal ? `${p.postal} ${p.street}`.trim() : 'Unknown'], ['In-game role', (p.permission || 'Normal').replace('Server ', '')]] : [['Status', 'Not in the server']];
    const head = `<div class="st-who">${av(p.id, p.name)}<div><h3>${esc(p.name)}</h3><p>Roblox ID ${esc(p.id || 'unknown')}${live ? '' : ' · offline'}</p></div></div>
      <div class="st-facts">${facts.map(([k, v]) => `<div><small>${k}</small><b>${esc(v)}</b></div>`).join('')}</div>
      <div class="st-acts">${actBtn('warn', 'Warn')}${actBtn('pm', 'Message')}${actBtn('kick', 'Kick')}${actBtn('ban', 'Ban')}${actBtn('note', 'Note')}</div><div class="st-h"><span>Record</span><span id="stRecN"></span></div><div id="stHist"><div class="st-empty">Loading…</div></div>`;
    if (shownFor !== p.id + ':' + !!live) { box.innerHTML = head; shownFor = p.id + ':' + !!live; }
    else { const f = box.querySelector('.st-facts'); if (f) f.innerHTML = facts.map(([k, v]) => `<div><small>${k}</small><b>${esc(v)}</b></div>`).join(''); }
    const r = await fetch(API + '/records?' + new URLSearchParams({ id: p.id || '', name: p.name })).then(x => x.json()).catch(() => ({ records: [] }));
    if (!sel || sel.id !== p.id) return; const h = $('stHist'); if (!h) return;
    $('stRecN').textContent = r.records.length ? r.records.length + ' on file' : '';
    h.innerHTML = r.records.length ? r.records.map(x => recHTML(x, false)).join('') : '<div class="st-empty">Clean record. Nothing on file for this player.</div>'; };
  const renderCalls = () => { const c = D.modCalls || [], open = c.filter(m => !m.moderator).length; $('stCallsN').textContent = open; $('stCallsN').hidden = !open;
    $('stCalls').innerHTML = c.length ? c.map(m => `<div class="st-row"><span class="grow"><button class="lnk" data-open="${esc(m.caller.id)}" data-name="${esc(m.caller.name)}">${esc(m.caller.name)}</button> called for staff<br><small>${esc(ago(m.at * 1000))}</small></span>${m.moderator ? `<span class="st-pill done">Answered by ${esc(m.moderator.name)}</span>` : '<span class="st-pill wait">Waiting</span>'}</div>`).join('') : '<div class="st-empty">No mod calls right now.</div>'; };
  // bans: tick several (or everyone one staff member banned) and unban them together
  const banSel = new Set();
  const renderBans = () => { const b = D.bans || []; $('stBansN').textContent = b.length; $('stBansN').hidden = !b.length;
    for (const id of [...banSel]) if (!b.some(x => x.id === id)) banSel.delete(id);
    if (!b.length) { $('stBans').innerHTML = '<div class="st-empty">Nobody is banned from this server.</div>'; return; }
    const byCount = {}; for (const x of b) if (x.by) byCount[x.by] = (byCount[x.by] || 0) + 1;
    const n = banSel.size, all = n === b.length;
    $('stBans').innerHTML = `<div class="st-bulk"><input type="checkbox" class="st-cb" id="stBanAll" aria-label="Select everyone"${all ? ' checked' : ''}><span class="grow">${n ? `<b style="color:var(--ink)">${n}</b> selected` : `${b.length} banned`}</span>${n ? '<button class="st-btn" data-bclear>Clear</button>' : ''}<button class="st-go" data-bgo${n ? '' : ' disabled'}>Unban${n ? ' ' + n : ' selected'}</button></div>`
      + (Object.keys(byCount).length ? `<div class="st-bychips">${Object.entries(byCount).sort((a, c) => c[1] - a[1]).map(([who, k]) => `<button data-bby="${esc(who)}">Select all banned by ${esc(who)} (${k})</button>`).join('')}</div>` : '')
      + b.map(x => `<div class="st-row${banSel.has(x.id) ? ' sel' : ''}"><input type="checkbox" class="st-cb" data-bsel="${esc(x.id)}" aria-label="Select ${esc(x.name)}"${banSel.has(x.id) ? ' checked' : ''}>${av(x.id, x.name, "width:28px;height:28px")}<span class="grow"><button class="lnk" data-open="${esc(x.id)}" data-name="${esc(x.name)}">${esc(x.name)}</button><br><small>ID ${esc(x.id)}${x.by ? ` · banned by ${esc(x.by)} ${esc(ago(x.at))}` : ''}</small></span><button class="st-btn" data-unban="${esc(x.id)}" data-name="${esc(x.name)}">Unban</button></div>`).join('');
    const a = $('stBanAll'); a.indeterminate = n > 0 && !all; };
  $('stBans').addEventListener('change', e => { const b = D.bans || [];
    if (e.target.id === 'stBanAll') { if (e.target.checked) b.forEach(x => banSel.add(x.id)); else banSel.clear(); }
    else if (e.target.dataset.bsel) { const id = e.target.dataset.bsel; e.target.checked ? banSel.add(id) : banSel.delete(id); }
    renderBans(); });
  $('stBans').addEventListener('click', e => { const b = D.bans || [];
    const by = e.target.closest('[data-bby]'); if (by) { b.filter(x => x.by === by.dataset.bby).forEach(x => banSel.add(x.id)); return renderBans(); }
    if (e.target.closest('[data-bclear]')) { banSel.clear(); return renderBans(); }
    if (e.target.closest('[data-bgo]')) { const many = b.filter(x => banSel.has(x.id)).map(x => ({ id: x.id, name: x.name })); if (many.length === 1) return sheet('unban', many[0]); if (many.length) sheet('unban', null, many); } });
  const renderLogs = () => { const cmds = D.commands || [], kills = D.kills || [];
    $('stLogs').innerHTML = `<div class="st-h"><span>Commands</span></div>${cmds.length ? cmds.map(m => `<div class="st-row"><span class="grow"><code>${esc(m.command)}</code><br><small>${m.sentBy ? `<b class="st-by">${esc(m.sentBy)}</b> via Oversite` : esc(m.by.name)} · ${esc(ago(m.at * 1000))}</small></span></div>`).join('') : '<div class="st-empty">No commands yet.</div>'}
      <div class="st-h" style="margin-top:16px"><span>Kills</span></div>${kills.length ? kills.map(k => `<div class="st-row"><span class="grow"><button class="lnk" data-open="${esc(k.killer.id)}" data-name="${esc(k.killer.name)}">${esc(k.killer.name)}</button> killed <button class="lnk" data-open="${esc(k.killed.id)}" data-name="${esc(k.killed.name)}">${esc(k.killed.name)}</button><br><small>${esc(ago(k.at * 1000))}</small></span></div>`).join('') : '<div class="st-empty">No kills logged.</div>'}`; };
  const renderRecords = async () => { const r = await fetch(API + '/records?' + new URLSearchParams(recQ ? { q: recQ } : {})).then(x => x.json()).catch(() => ({ records: [] }));
    $('stRecords').innerHTML = r.records.length ? r.records.map(x => recHTML(x, true)).join('') : `<div class="st-empty">${recQ ? 'No records match that.' : 'No records yet. Warnings, kicks, bans and notes you give show up here.'}</div>`; };
  let render = () => { if (!D) return; $('stLive').style.background = 'var(--green)'; $('stServer').textContent = `${D.server.name || 'Server'} · ${D.server.players ?? D.players.length}/${D.server.max ?? '?'}`;
    renderPlayers(); renderCalls(); renderBans(); renderLogs(); if (pane === 'player') renderPlayer(); };

  // ── navigation ──
  let show = p => { pane = p; document.querySelectorAll('#stTabs [data-p]').forEach(b => b.setAttribute('aria-selected', b.dataset.p === p)); document.querySelectorAll('#staffMdt .st-pane').forEach(x => x.classList.toggle('on', x.dataset.p === p));
    if (p === 'records') renderRecords(); if (p === 'player') renderPlayer(); };
  const open = (id, name) => { const live = D && D.players.find(p => p.id === id); sel = live || { id, name, team: '', callsign: '', permission: '' }; show('player'); if (D) renderPlayers(); };
  $('stTabs').addEventListener('click', e => { const b = e.target.closest('[data-p]'); if (b) show(b.dataset.p); });
  $('stFind').addEventListener('input', () => D && renderPlayers());
  let rq; $('stRecFind').addEventListener('input', e => { clearTimeout(rq); rq = setTimeout(() => { recQ = e.target.value.trim(); renderRecords(); }, 250); });
  page.addEventListener('click', async e => {
    const pl = e.target.closest('.st-p'); if (pl) return open(pl.dataset.id, pl.querySelector('b').textContent);
    const o = e.target.closest('[data-open]'); if (o) return open(o.dataset.open, o.dataset.name);
    const a = e.target.closest('[data-act]'); if (a && sel) return sheet(a.dataset.act, sel);
    const u = e.target.closest('[data-unban]'); if (u) return sheet('unban', { id: u.dataset.unban, name: u.dataset.name });
  });
  $('stAnnounce').addEventListener('click', () => sheet('announce', null));

  // ── the action sheet ──
  const SHEETS = {
    warn: { t: 'Warn', p: n => `${n} gets this warning as a private message in game, and it goes on their record.`, ph: 'What did they do?', go: 'Send warning', chips: ['RDM', 'VDM', 'Fail RP', 'Trolling', 'Breaking traffic laws', 'Not following staff instructions'] },
    pm: { t: 'Message', p: n => `Sends a private message to ${n} in game.`, ph: 'Your message', go: 'Send', chips: ['Please come to the staff spot', 'Please stop that', 'Thanks for reporting'] },
    kick: { t: 'Kick', p: n => `Removes ${n} from the server. They can join again.`, ph: 'Reason for the kick', go: 'Kick', danger: true, chips: ['RDM', 'VDM', 'Fail RP', 'Trolling', 'Exploiting'] },
    ban: { t: 'Ban', p: n => `Bans ${n} from the server until someone unbans them. The reason is saved on their record.`, ph: 'Reason for the ban', go: 'Ban', danger: true, chips: ['Exploiting', 'Repeated RDM', 'Harassment', 'Ban evasion'] },
    unban: { t: 'Unban', p: n => `Lets ${n} join the server again.`, ph: 'Why are they being unbanned? (optional)', go: 'Unban', chips: ['Banned by mistake', 'Appeal accepted', 'Ban expired'] },
    note: { t: 'Add note', p: n => `A private note on ${n}'s record. Nothing is sent in game.`, ph: 'Note for other staff', go: 'Save note', chips: [] },
    announce: { t: 'Announce', p: () => 'Shows a message to everyone in the server.', ph: 'Message to the whole server', go: 'Announce', chips: ['Server restart in 5 minutes', 'Staff are watching, roleplay properly', 'Join our Discord for updates'] },
  };
  const dlg = $('stDlg'); let cur = null;
  const sheet = (kind, who, many) => { const S = SHEETS[kind]; cur = { kind, who, many };
    const names = many ? (many.length > 4 ? many.slice(0, 3).map(x => x.name).join(', ') + ` and ${many.length - 3} more` : many.map(x => x.name).join(', ').replace(/, ([^,]*)$/, ' and $1')) : '';
    $('stDlgT').textContent = many ? `${S.t} ${many.length} players` : S.t + (who ? ' ' + who.name : '');
    $('stDlgP').textContent = many ? `${S.p(names)} ER:LC takes one command every 5 seconds, so this takes about ${Math.ceil(many.length * 5.3)} seconds. Keep this open until it finishes.` : S.p(who ? who.name : ''); $('stDlgR').value = ''; $('stDlgR').placeholder = S.ph;
    $('stDlgC').innerHTML = S.chips.map(c => `<button type="button">${esc(c)}</button>`).join(''); $('stDlgM').textContent = ''; $('stDlgM').className = 'msg';
    const go = $('stDlgGo'); go.textContent = S.go; go.className = 'st-go' + (S.danger ? ' danger' : ''); go.disabled = false;
    dlg.showModal(); requestAnimationFrame(() => dlg.classList.add('in')); $('stDlgR').focus(); };
  $('stDlgC').addEventListener('click', e => { const b = e.target.closest('button'); if (!b) return; const r = $('stDlgR'); r.value = r.value ? r.value.replace(/\s*$/, '') + ', ' + b.textContent : b.textContent; r.focus(); });
  let busy = false;
  $('stDlgX').addEventListener('click', () => { if (!busy) dlg.close(); });
  dlg.addEventListener('cancel', e => { if (busy) e.preventDefault(); });
  dlg.addEventListener('close', () => dlg.classList.remove('in'));
  dlg.addEventListener('click', e => { if (e.target === dlg && !busy) dlg.close(); });
  // several players: one request each, in order, showing progress; a failure is reported and the rest carry on
  const runMany = async () => { const go = $('stDlgGo'), m = $('stDlgM'), list = cur.many, reason = $('stDlgR').value, failed = []; busy = true; go.disabled = true; $('stDlgX').disabled = true;
    for (let i = 0; i < list.length; i++) { m.className = 'msg'; m.textContent = `${SHEETS[cur.kind].t === 'Unban' ? 'Unbanning' : 'Working on'} ${list[i].name} (${i + 1} of ${list.length})…`;
      try { const r = await post('/action', { kind: cur.kind, name: list[i].name, id: list[i].id, reason }); if (r.delivered === false) failed.push(list[i].name); else banSel.delete(list[i].id); }
      catch (x) { failed.push(list[i].name); } }
    busy = false; $('stDlgX').disabled = false; dlg.close(); load();
    toast(failed.length ? `Unbanned ${list.length - failed.length} of ${list.length}. Still banned: ${failed.join(', ')}.` : `Unbanned ${list.length} players.`); };
  dlg.querySelector('form').addEventListener('submit', async e => { e.preventDefault(); if (cur.many) return runMany(); const go = $('stDlgGo'), m = $('stDlgM'); go.disabled = true;
    m.className = 'msg'; m.textContent = ['note'].includes(cur.kind) ? 'Saving…' : 'Sending in game…';
    const slow = setTimeout(() => { m.textContent = 'Waiting for ER:LC (one command every 5 seconds)…'; }, 1500);
    try { const r = await post('/action', { kind: cur.kind, name: cur.who ? cur.who.name : '', id: cur.who ? cur.who.id : '', reason: $('stDlgR').value });
      clearTimeout(slow); dlg.close(); toast(r.delivered === false ? r.message : `${SHEETS[cur.kind].t} done${cur.who ? ' for ' + cur.who.name : ''}.`); load(); if (pane === 'player') { shownFor = null; renderPlayer(); } }
    catch (x) { clearTimeout(slow); m.className = 'msg err'; m.textContent = x.message; go.disabled = false; } });
  const toast = msg => { let t = document.querySelector('.toast'); if (!t) { t = document.createElement('div'); t.className = 'toast'; document.body.appendChild(t); } t.textContent = msg; t.classList.add('on'); clearTimeout(t._h); t._h = setTimeout(() => t.classList.remove('on'), 2800); };
  // ── Map app: every player on the official map (ER:LC gives positions as pixels of the 5355 px map) ──
  const MS = 1000, PX = 5355, wrap = $('stMapWrap'), inner = $('stMapIn'), dots = $('stDots'), img = $('stMapImg');
  const TEAMCOL = t => { const d = deptOf(t); if (d) return COL[d]; return /civil/i.test(t) ? '#A3A9B1' : /jail|prison/i.test(t) ? '#F2994A' : '#C9CDD3'; };
  const isCiv = t => !deptOf(t);
  let V = { k: 1, x: 0, y: 0 }, fitted = false, mf = 'all';
  const place = () => { inner.style.transform = `translate(${V.x}px,${V.y}px) scale(${V.k})`; inner.style.setProperty('--inv', (1 / V.k).toFixed(4)); wrap.classList.toggle('near', V.k / fitK() > 2.2);
    if (V.k / fitK() > 1.6 && img.src.indexOf('-hd') < 0) img.src = 'liberty-county-hd.jpg'; };
  const fitK = () => Math.min(wrap.clientWidth, wrap.clientHeight) / MS;
  const fit = () => { const k = fitK(); if (!k) return; V = { k, x: (wrap.clientWidth - MS * k) / 2, y: (wrap.clientHeight - MS * k) / 2 }; fitted = true; place(); };
  const zoomAt = (f, cx, cy) => { const k0 = fitK(), k = Math.min(k0 * 12, Math.max(k0, V.k * f)); V.x = cx - (cx - V.x) * k / V.k; V.y = cy - (cy - V.y) * k / V.k; V.k = k; place(); };
  wrap.addEventListener('wheel', e => { e.preventDefault(); const r = wrap.getBoundingClientRect(); zoomAt(Math.exp(-e.deltaY * 0.0015), e.clientX - r.left, e.clientY - r.top); }, { passive: false });
  let drag = null; wrap.addEventListener('pointerdown', e => { if (e.target.closest('.st-mapctl,.st-dot i')) return; drag = { x: e.clientX, y: e.clientY, vx: V.x, vy: V.y }; wrap.classList.add('drag'); wrap.setPointerCapture(e.pointerId); });
  wrap.addEventListener('pointermove', e => { if (!drag) return; V.x = drag.vx + e.clientX - drag.x; V.y = drag.vy + e.clientY - drag.y; place(); });
  const endDrag = () => { drag = null; wrap.classList.remove('drag'); }; wrap.addEventListener('pointerup', endDrag); wrap.addEventListener('pointercancel', endDrag);
  wrap.addEventListener('dblclick', e => { const r = wrap.getBoundingClientRect(); zoomAt(2, e.clientX - r.left, e.clientY - r.top); });
  const mid = () => [wrap.clientWidth / 2, wrap.clientHeight / 2];
  $('stZin').onclick = () => zoomAt(1.6, ...mid()); $('stZout').onclick = () => zoomAt(1 / 1.6, ...mid()); $('stZfit').onclick = fit;
  addEventListener('resize', () => { if (pane === 'map') fit(); });
  $('stMapF').addEventListener('click', e => { const b = e.target.closest('[data-f]'); if (!b) return; mf = b.dataset.f; $('stMapF').querySelectorAll('[data-f]').forEach(x => x.setAttribute('aria-pressed', x === b)); drawMap(); });
  dots.addEventListener('click', e => { const d = e.target.closest('.st-dot'); if (d) open(d.dataset.id, d.dataset.name); });
  const livePlayers = () => { const L = window.live && window.live.players ? window.live.players() : null;
    if (L && L.length) return L.map(p => { const [name, id] = String(p.Player || '').split(':'); return { name, id, team: p.Team || '', callsign: p.Callsign || '', x: p.Location?.LocationX, z: p.Location?.LocationZ }; });
    return (D && D.players) || []; };
  const drawMap = () => { if (pane !== 'map') return; if (!fitted) fit(); const ps = livePlayers().filter(p => Number.isFinite(p.x) && Number.isFinite(p.z));
    const civ = ps.filter(p => isCiv(p.team)).length; $('stMfAll').textContent = ps.length; $('stMfCiv').textContent = civ; $('stMfResp').textContent = ps.length - civ;
    const seen = new Set();
    for (const p of ps) { const key = p.id || p.name; seen.add(key); let d = dots.querySelector(`[data-key="${CSS.escape(key)}"]`);
      if (!d) { d = document.createElement('div'); d.className = 'st-dot'; d.dataset.key = key; d.innerHTML = '<i></i><b></b>'; dots.appendChild(d); }
      d.dataset.id = p.id || ''; d.dataset.name = p.name; d.style.setProperty('--c', TEAMCOL(p.team)); d.querySelector('b').textContent = p.name + (p.callsign ? ' · ' + p.callsign : '');
      d.title = `${p.name} · ${p.team || 'No team'}`; d.style.transform = `translate(${(p.x / PX * MS).toFixed(1)}px,${(p.z / PX * MS).toFixed(1)}px)`;
      d.classList.toggle('dim', mf === 'civ' ? !isCiv(p.team) : mf === 'resp' ? isCiv(p.team) : false); }
    dots.querySelectorAll('.st-dot').forEach(d => { if (!seen.has(d.dataset.key)) d.remove(); });
    const teams = [...new Set(ps.map(p => p.team || 'No team'))].sort(); $('stLegend').innerHTML = teams.map(t => `<span style="--c:${TEAMCOL(t)}"><i></i>${esc(t)}</span>`).join(''); };
  addEventListener('players', drawMap);
  const _show = show; show = p => { _show(p); if (p === 'map') { requestAnimationFrame(() => { fitted = false; drawMap(); }); } };
  const _render = render; render = () => { _render(); drawMap(); };
  show('player');
})();
</script>
"""

def apply(s):
    s = re.sub(r'  /\* staff:start.*?/\* staff:end \*/\n', '', s, flags=re.S)
    s = re.sub(r'<!-- staff:start -->.*?<!-- staff:end -->\n', '', s, flags=re.S)
    s = re.sub(r'<script id="staff">.*?</script>\n', '', s, flags=re.S)
    s = s.replace('</style>', CSS + '</style>', 1)
    # the Server Staff tab opens this page, routed like Status
    s = s.replace('<button role="tab" aria-selected="false">Server Staff</button>', '<button role="tab" aria-selected="false" data-view="staff">Server Staff</button>', 1)
    s = s.replace("const PAGES = { status: 'pageStatus', staff: 'pageStaff' };", "const PAGES = { status: 'pageStatus' };", 1)   # the staff MDT is a tablet, not a page
    s = s.replace('<!-- ─────────── MDT: iPad on the map ─────────── -->', HTML + '<!-- ─────────── MDT: iPad on the map ─────────── -->', 1)
    s = s.replace('</body>', JS + '</body>', 1)
    return s
