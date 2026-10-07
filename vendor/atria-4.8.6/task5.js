(function(){
'use strict';
if(window.__ATRIA_TASK5_469__)return;window.__ATRIA_TASK5_469__=true;

var style=document.createElement('style');style.id='atria-task5-469-style';style.textContent="\n#atriaLobbyVoiceBtn{display:grid!important;place-items:center!important;min-width:32px!important;width:32px!important;height:32px!important;padding:0!important;border-radius:9px!important}\n#atriaLobbyVoiceBtn.connected,#radioPttBtn.atriaVoiceReady{border-color:rgba(142,227,201,.62)!important;box-shadow:0 0 0 1px rgba(142,227,201,.10) inset!important}\n#atriaLobbyVoiceBtn.talking,#radioPttBtn.atriaVoiceTalking{background:#8ee3c9!important;color:#0b2730!important;border-color:#8ee3c9!important}\n#atriaLobbyVoiceBtn.waiting,#radioPttBtn.atriaVoiceWaiting{opacity:.78}\n#chatDock.nsLobbyChat .chatGlass{grid-template-columns:30px minmax(58px,76px) minmax(0,1fr) 32px 32px!important;gap:4px!important}\n#chatDock.nsLobbyChat .chatLogBtn{grid-column:1!important}\n#chatDock.nsLobbyChat .chatTarget{grid-column:2!important}\n#chatDock.nsLobbyChat .chatPreview{grid-column:3!important}\n#chatDock.nsLobbyChat #atriaLobbyVoiceBtn{grid-column:4!important;grid-row:1!important}\n#chatDock.nsLobbyChat .chatSend{grid-column:5!important;grid-row:1!important}\n@media(max-width:420px){\n  #chatDock.nsLobbyChat .chatGlass{grid-template-columns:28px 54px minmax(0,1fr) 30px 30px!important;gap:3px!important}\n  #atriaLobbyVoiceBtn{min-width:30px!important;width:30px!important;height:30px!important}\n}\nbody.keyboardOpen #atriaLobbyVoiceBtn{display:none!important}\nbody.keyboardOpen #chatDock.nsLobbyChat .chatGlass{grid-template-columns:minmax(0,1fr) 34px!important}\nbody.keyboardOpen #chatDock.nsLobbyChat .chatPreview{grid-column:1!important}\nbody.keyboardOpen #chatDock.nsLobbyChat .chatSend{grid-column:2!important}\n";document.head.appendChild(style);

var V={stream:null,peers:new Map(),pressed:false,talking:false,needsUnlock:false,lastNoTarget:0,lastPreparing:0,lastMode:'',lastTargetKey:'',micPromise:null};

function social(){try{return window.nsSocial&&window.nsSocial.state?window.nsSocial.state():{}}catch(_){return {}}}
function me(){var s=social();return s&&s.user||null}
function ownPeerId(room){
  try{
    var uid=me()&&me().id;
    var m=room&&Array.isArray(room.members)?room.members.find(function(x){return x.userId===uid}):null;
    if(m&&m.peerId)return String(m.peerId);
    if(window.csV41Challenge&&window.csV41Challenge.selfId)return String(window.csV41Challenge.selfId);
    var k='atria.lobby.peer.v2',v=sessionStorage.getItem(k);
    if(!v){v='L_'+Math.random().toString(36).slice(2)+Date.now().toString(36);sessionStorage.setItem(k,v)}
    return v;
  }catch(_){return 'L_'+Math.random().toString(36).slice(2)}
}
function currentContext(){
  var s=social(),u=s&&s.user,room=s&&s.room;
  if(u&&room&&room.id&&Array.isArray(room.members)){
    var mine=ownPeerId(room),targets=room.members.filter(function(m){return m&&m.userId!==u.id&&m.peerId}).map(function(m){return {userId:m.userId,name:m.name||m.handle||'Jugador',peerId:String(m.peerId),online:m.online!==false}});
    return {mode:'room',scope:'room-'+String(room.id).replace(/[^a-zA-Z0-9_.:-]/g,''),self:mine,targets:targets};
  }
  if(document.body.classList.contains('nsLobbyMode')&&u&&window.nsLobby&&window.nsLobby.players instanceof Map){
    var friends=new Set((s.friends||[]).map(function(f){return f.id}));
    var arr=[];
    window.nsLobby.players.forEach(function(p){
      if(p&&p.userId&&p.userId!==u.id&&p.peerId&&friends.has(p.userId)&&p.online!==false)arr.push({userId:p.userId,name:p.name||p.handle||'Jugador',peerId:String(p.peerId),online:true});
    });
    return {mode:'lobby',scope:'lobby',self:ownPeerId(null),targets:arr};
  }
  return {mode:'none',scope:'none',self:ownPeerId(null),targets:[]};
}
function nonce(){return Math.random().toString(36).slice(2)+Date.now().toString(36)}
async function sig(method,ctx,remote,type,payload){
  var c=new AbortController(),to=setTimeout(function(){c.abort()},5000);
  try{
    var base='/api/voice-signal';
    if(method==='GET'){
      var qs='?scope='+encodeURIComponent(ctx.scope)+'&to='+encodeURIComponent(ctx.self)+'&from='+encodeURIComponent(remote.peerId)+'&type='+encodeURIComponent(type);
      var r=await fetch(base+qs,{method:'GET',cache:'no-store',signal:c.signal});
      var d=await r.json();if(!r.ok)throw Error(d.error||'voice signal');return d.signal||null;
    }
    var body=Object.assign({scope:ctx.scope,from:ctx.self,to:remote.peerId,type:type},payload||{});
    var rr=await fetch(base,{method:'POST',cache:'no-store',signal:c.signal,headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});
    var dd=await rr.json();if(!rr.ok)throw Error(dd.error||'voice signal');return dd;
  }finally{clearTimeout(to)}
}
async function waitIce(pc,ms){
  if(pc.iceGatheringState==='complete')return;
  await new Promise(function(resolve){
    var done=false;
    function finish(){if(done)return;done=true;clearTimeout(t);pc.removeEventListener('icegatheringstatechange',on);resolve()}
    function on(){if(pc.iceGatheringState==='complete')finish()}
    var t=setTimeout(finish,ms||3500);pc.addEventListener('icegatheringstatechange',on);
  });
}
function audioFor(rec){
  if(rec.audio)return rec.audio;
  var a=document.createElement('audio');a.autoplay=true;a.playsInline=true;a.setAttribute('playsinline','');a.style.display='none';a.dataset.atriaVoicePeer=rec.key;document.body.appendChild(a);rec.audio=a;return a;
}
function unlockAudio(){
  V.peers.forEach(function(rec){
    try{if(rec.audio&&rec.audio.srcObject)rec.audio.play().then(function(){V.needsUnlock=false}).catch(function(){V.needsUnlock=true})}catch(_){}
  });
}
document.addEventListener('pointerdown',unlockAudio,{passive:true,capture:true});

function closeRec(rec){
  try{rec.pc&&rec.pc.close()}catch(_){}
  try{if(rec.audio){rec.audio.srcObject=null;rec.audio.remove()}}catch(_){}
  rec.closed=true;
}
function updateButtons(){
  var connected=0,connecting=0;V.peers.forEach(function(r){if(r.connected)connected++;else if(r.connecting)connecting++});
  var ctx=currentContext(),has=ctx.targets.length>0;
  var btns=[document.getElementById('atriaLobbyVoiceBtn'),document.getElementById('radioPttBtn')].filter(Boolean);
  btns.forEach(function(b){
    var unavailable=b.id==='radioPttBtn'&&ctx.mode==='none';
    if(b.disabled!==unavailable)b.disabled=unavailable;
    b.classList.toggle('connected',connected>0);b.classList.toggle('atriaVoiceReady',connected>0);
    b.classList.toggle('talking',V.talking);b.classList.toggle('atriaVoiceTalking',V.talking);
    b.classList.toggle('waiting',!connected&&connecting>0);b.classList.toggle('atriaVoiceWaiting',!connected&&connecting>0);
    var icon=V.talking?'🎙':'📻';
    if(b.textContent!==icon)b.textContent=icon;
    var targetText=ctx.mode==='room'?'grupo de la guardia':ctx.mode==='lobby'?'amigos conectados en el lobby':'guardias Cooperativas o Competitivas';
    var tip=unavailable?'La radio se usa en guardias Cooperativas o Competitivas.':(!has?'No hay '+targetText:(connected?'Mantener para hablar con '+targetText:'Preparando voz con '+targetText));
    if(b.title!==tip)b.title=tip;
    if(b.getAttribute('aria-label')!==tip)b.setAttribute('aria-label',tip);
  });
}
function addTrackTo(rec){
  try{
    var tr=V.stream&&V.stream.getAudioTracks&&V.stream.getAudioTracks()[0];
    if(rec.sender&&tr&&rec.sender.track!==tr)return rec.sender.replaceTrack(tr);
  }catch(_){}
}
async function setupPeer(ctx,remote){
  var key=ctx.scope+'|'+remote.userId+'|'+remote.peerId,old=V.peers.get(key);
  if(old&&(old.connected||old.connecting)&&!old.closed){old.lastSeen=Date.now();return old}
  if(old)closeRec(old);
  var rec={key:key,scope:ctx.scope,remote:remote,self:ctx.self,pc:null,sender:null,audio:null,connecting:true,connected:false,closed:false,lastSeen:Date.now(),lastOffer:null};
  V.peers.set(key,rec);
  try{
    var pc=new RTCPeerConnection({iceServers:[{urls:'stun:stun.l.google.com:19302'},{urls:'stun:stun1.l.google.com:19302'}]});rec.pc=pc;
    var trans=pc.addTransceiver('audio',{direction:'sendrecv'});rec.sender=trans.sender;await addTrackTo(rec);
    pc.ontrack=function(e){
      var a=audioFor(rec);a.srcObject=(e.streams&&e.streams[0])||new MediaStream([e.track]);
      a.play().then(function(){V.needsUnlock=false}).catch(function(){V.needsUnlock=true});
    };
    pc.onconnectionstatechange=function(){
      var st=pc.connectionState;
      rec.connected=st==='connected';rec.connecting=st==='new'||st==='connecting';
      if(st==='failed'||st==='closed'||st==='disconnected'){rec.connected=false;rec.connecting=false;rec.retryAt=Date.now()+6000}
      updateButtons();
    };
    var initiator=String(ctx.self)<String(remote.peerId);
    if(initiator){
      var offer=await pc.createOffer({offerToReceiveAudio:true});await pc.setLocalDescription(offer);await waitIce(pc,3500);
      var n=nonce();rec.lastOffer=n;await sig('POST',ctx,remote,'offer',{description:pc.localDescription,nonce:n});
      var until=Date.now()+10000,ans=null;
      while(!rec.closed&&Date.now()<until){
        ans=await sig('GET',ctx,remote,'answer');
        if(ans&&ans.description&&ans.replyTo===n)break;
        await new Promise(function(r){setTimeout(r,420)});
      }
      if(!ans||!ans.description||ans.replyTo!==n)throw Error('answer timeout');
      await pc.setRemoteDescription(ans.description);
    }else{
      var end=Date.now()+10000,off=null;
      while(!rec.closed&&Date.now()<end){
        off=await sig('GET',ctx,remote,'offer');
        if(off&&off.description&&off.nonce)break;
        await new Promise(function(r){setTimeout(r,420)});
      }
      if(!off||!off.description)throw Error('offer timeout');
      rec.lastOffer=off.nonce;await pc.setRemoteDescription(off.description);
      var answer=await pc.createAnswer();await pc.setLocalDescription(answer);await waitIce(pc,3500);
      await sig('POST',ctx,remote,'answer',{description:pc.localDescription,nonce:nonce(),replyTo:off.nonce});
    }
    rec.connecting=pc.connectionState!=='connected';rec.connected=pc.connectionState==='connected';updateButtons();return rec;
  }catch(err){
    rec.connecting=false;rec.connected=false;rec.retryAt=Date.now()+6500;updateButtons();return rec;
  }
}
async function ensureMic(){
  var live=V.stream&&V.stream.getAudioTracks&&V.stream.getAudioTracks().some(function(t){return t.readyState==='live'});
  if(live)return V.stream;
  if(V.micPromise)return V.micPromise;
  V.micPromise=(async function(){
    var stream=null;
    try{
      if(typeof csCoopEnsureMic==='function')stream=await csCoopEnsureMic();
    }catch(_){}
    if(!stream){
      if(!navigator.mediaDevices||!navigator.mediaDevices.getUserMedia)throw Error('Micrófono no disponible.');
      stream=await navigator.mediaDevices.getUserMedia({audio:{echoCancellation:true,noiseSuppression:true,autoGainControl:true},video:false});
    }
    V.stream=stream;
    for(const t of V.stream.getAudioTracks())t.enabled=!!V.talking;
    var jobs=[];V.peers.forEach(function(rec){jobs.push(Promise.resolve(addTrackTo(rec)))});await Promise.allSettled(jobs);
    return stream;
  })();
  try{return await V.micPromise}finally{V.micPromise=null}
}
function patchMicPolicy(){
  try{
    if(typeof csUpdateMicTrack!=='function'||csUpdateMicTrack.__atriaVoice469)return;
    var wrapped=function(){
      var on=V.talking;
      try{on=on||!!(typeof csVoice!=='undefined'&&csVoice.localActive)||!!(typeof csCoop!=='undefined'&&csCoop.radioHeld)}catch(_){}
      var stream=V.stream;try{if(!stream&&typeof csCoop!=='undefined')stream=csCoop.stream}catch(_){}
      for(const t of stream&&stream.getAudioTracks?stream.getAudioTracks():[])t.enabled=!!on;
    };
    wrapped.__atriaVoice469=true;csUpdateMicTrack=wrapped;
  }catch(_){}
}
async function startTalk(){
  if(V.pressed)return;V.pressed=true;
  var ctx=currentContext();
  if(!ctx.targets.length){
    V.pressed=false;var n=Date.now();
    if(n-V.lastNoTarget>1600){V.lastNoTarget=n;try{toast(ctx.mode==='room'?'Todavía no hay otro compañero conectado a esta guardia.':ctx.mode==='lobby'?'No hay amigos conectados en el lobby para hablar por voz.':'La radio se usa en guardias Cooperativas o Competitivas.')}catch(_){}}
    updateButtons();return;
  }
  try{
    patchMicPolicy();
    await ensureMic();
    if(!V.pressed)return;
    V.talking=true;
    try{window.nsStopLocalVoice&&window.nsStopLocalVoice()}catch(_){}
    try{if(typeof csVoice!=='undefined'&&csVoice.recognition)csVoice.recognition.stop()}catch(_){}
    for(const t of V.stream.getAudioTracks())t.enabled=true;
    await maintain(true);
    var connected=0;V.peers.forEach(function(r){if(r.connected)connected++});
    if(!connected&&Date.now()-V.lastPreparing>2400){V.lastPreparing=Date.now();try{toast('Preparando voz automática… mantené 📻 para hablar.')}catch(_){}}
  }catch(err){
    V.talking=false;V.pressed=false;
    try{toast('No pude usar el micrófono. Revisá el permiso del sitio.')}catch(_){}
  }
  updateButtons();
}
function stopTalk(){
  V.pressed=false;if(!V.talking){updateButtons();return}
  V.talking=false;
  if(V.stream)for(const t of V.stream.getAudioTracks())t.enabled=false;
  try{
    if(typeof csVoice!=='undefined'&&csVoice.localActive)setTimeout(function(){try{if(typeof csEnsureRecognition==='function')csEnsureRecognition().start()}catch(_){}},280);
  }catch(_){}
  updateButtons();
}
function wireButton(b){
  if(!b||b.dataset.atriaVoice469)return;b.dataset.atriaVoice469='1';
  function down(e){e.preventDefault();e.stopImmediatePropagation();startTalk()}
  function up(e){e.preventDefault();e.stopImmediatePropagation();stopTalk()}
  b.addEventListener('pointerdown',down,true);b.addEventListener('pointerup',up,true);b.addEventListener('pointercancel',up,true);
  b.addEventListener('pointerleave',function(e){if(V.pressed)up(e)},true);
}
function injectLobbyButton(){
  if(!document.body.classList.contains('nsLobbyMode'))return;
  var glass=document.querySelector('#chatDock.nsLobbyChat .chatGlass');if(!glass)return;
  var b=document.getElementById('atriaLobbyVoiceBtn');
  if(!b){
    b=document.createElement('button');b.id='atriaLobbyVoiceBtn';b.type='button';b.className='radioBtn';b.textContent='📻';
    var send=glass.querySelector('#dieSend');glass.insertBefore(b,send||null);
  }
  wireButton(b);
}
function wireClinical(){
  var b=document.getElementById('radioPttBtn');if(!b)return;
  b.title='Mantener para hablar con el grupo de la guardia';wireButton(b);
}
async function maintain(force){
  if(!window.RTCPeerConnection)return;
  var ctx=currentContext(),valid=new Set(),jobs=[];
  for(const remote of ctx.targets){
    var k=ctx.scope+'|'+remote.userId+'|'+remote.peerId;valid.add(k);
    var rec=V.peers.get(k);
    if(rec){rec.lastSeen=Date.now();if(rec.retryAt&&Date.now()<rec.retryAt)continue}
    jobs.push(setupPeer(ctx,remote));
  }
  V.peers.forEach(function(rec,k){
    if(!valid.has(k)&&(Date.now()-Number(rec.lastSeen||0)>3500)){closeRec(rec);V.peers.delete(k)}
  });
  if(force)await Promise.allSettled(jobs);
  updateButtons();
}
function tick(){patchMicPolicy();injectLobbyButton();wireClinical();maintain(false)}
window.nsVoiceAuto={
  state:function(){var c=currentContext(),connected=0;V.peers.forEach(function(r){if(r.connected)connected++});return {mode:c.mode,targets:c.targets.map(function(x){return {userId:x.userId,name:x.name,peerId:x.peerId}}),connected:connected,talking:V.talking,mic:!!V.stream,needsUnlock:V.needsUnlock}},
  refresh:function(){return maintain(true)},
  stop:function(){stopTalk()}
};
var moQueued=false;
function scheduleUi(){
  if(moQueued)return;moQueued=true;
  requestAnimationFrame(function(){moQueued=false;injectLobbyButton();wireClinical();updateButtons()});
}
var mo=new MutationObserver(scheduleUi);mo.observe(document.body,{childList:true,subtree:true});
window.addEventListener('beforeunload',function(){V.peers.forEach(closeRec);try{V.stream&&V.stream.getTracks().forEach(function(t){t.stop()})}catch(_){}});
setInterval(tick,1800);tick();
})();