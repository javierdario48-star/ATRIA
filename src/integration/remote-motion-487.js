import {createRemoteMotionRuntime} from '../social/remote-motion.js';
const replace=(s,a,b,label)=>{const i=s.indexOf(a);if(i<0||s.indexOf(a,i+1)>=0)throw Error('remote motion anchor changed: '+label);return s.slice(0,i)+b+s.slice(i+a.length)};
const section=(s,a,b,code,label)=>{const i=s.indexOf(a),j=s.indexOf(b,i+a.length);if(i<0||j<0||s.indexOf(a,i+1)>=0)throw Error('remote motion section changed: '+label);return s.slice(0,i)+code+s.slice(j)};
export function applyRemoteMotion487(html){
 let s=html;
 const runtime=`<script id="atria-remote-motion-487">
const csRemoteMotion487=(${createRemoteMotionRuntime.toString()})();
const csMotionSequences487=new Map();
const csMotionPage487=window.crypto?.randomUUID?.()||Date.now().toString(36)+'-'+Math.random().toString(36).slice(2);
function csMotionMeta487(session,cadence){const seq=(csMotionSequences487.get(session)||0)+1;csMotionSequences487.set(session,seq);return {motionSession:csMotionPage487+':'+session,seq,motionAt:performance.now(),sentAt:Date.now(),motionCadence:cadence}}
function csMotionAcceptState487(prev,m){if(!prev)return true;const session=m.motionSession||m.peerId,old=prev.motionSession||prev.peerId,retired=prev._motionRetired||[];if(retired.includes(session))return false;if(session!==old){m._motionRetired=[...retired,old].slice(-8);return true}const seq=Number(m.stateSeq||m.seq)||0;return !seq||seq>Number(prev.stateSeq||prev.seq||0)}
// Explicitly enabled diagnostics stay on this device, bounded to 6000 entries.
window.csRemoteMotionDiagnostics487={enabled:false,events:[],clear(){this.events.length=0}};
function csMotionLog487(kind,id,p,data){const d=window.csRemoteMotionDiagnostics487;if(!d.enabled)return;d.events.push({kind,id,session:p.session,seq:p.seq,sourceTime:data?.motionAt,now:performance.now(),transport:p.transport,x:p.x,y:p.y,receivedX:data?.x,receivedY:data?.y,speed:p.visualSpeed||0,dir:p.dir,phase:p.walkPhase,moving:p.moving,delay:p.delay,effectiveDelay:p.renderAge,fps:p.fps,resetReason:p.resetReason,cadence:p.cadence});if(d.events.length>6000)d.events.splice(0,1000)}
function csMotionSegment487(ax,ay,bx,by){if(typeof circleBlocked!=='function')return true;const n=Math.max(1,Math.ceil(Math.hypot(bx-ax,by-ay)/4));for(let i=1;i<=n;i++)if(circleBlocked(ax+(bx-ax)*i/n,ay+(by-ay)*i/n,10.5))return false;return true}
function csMotionReceive487(p,m,transport,now,cadence){
 if(!p)p=csRemoteMotion487.create({x:Number(m.x)||0,y:Number(m.y)||0,now,cadence});
 const seq=Number(m.stateSeq??m.seq)||0,session=String(m.motionSession||m.peerId||p.session||'');
 if(seq&&p.seq&&seq<=p.seq&&session===p.session){csMotionLog487('obsolete',m.peerId||m.userId,p,m);return p}
 let route=null;const last=p.samples.at(-1);
 if(last&&typeof astar==='function'&&!csMotionSegment487(last.x,last.y,m.x,m.y)){
  const tiles=astar(tileAt(last.x,last.y),tileAt(m.x,m.y));
  if(tiles.length)route=[{x:last.x,y:last.y},...tiles.slice(1).map(v=>({x:(v[0]+.5)*TW,y:(v[1]+.5)*TH})),{x:m.x,y:m.y}];
 }
 csRemoteMotion487.receive(p,{...m,route,now,transport,motionCadence:cadence});
 csMotionLog487('receive',m.peerId||m.userId,p,m);return p;
}
window.csLobbyMotionSample487=function(q,now){if(!q._motion)return;const p=csRemoteMotion487.sample(q._motion,now,{canMove:csMotionSegment487});q.x=p.x;q.y=p.y;q.dir=p.dir;q.moving=p.moving;q.walkPhase=p.walkPhase;csMotionLog487('render',q.userId,p)};
</script>`;
 s=replace(s,'</head>',runtime+'</head>','shared-sampler');
 // A single session stream is transmitted over either lobby transport.
 s=replace(s,'seq:(state._qaSeq=(state._qaSeq||0)+1),x:player.x','...csMotionMeta487(pid,260),x:player.x','http-session-sequence');
 s=replace(s,'coat:coat,level:level,seq:net.seq,lastSeen:Date.now()','coat:coat,level:level,...csMotionMeta487(peerId(),100),lastSeen:Date.now()','rtc-session-sequence');
 // Repair the escaped newlines which commented out the existing RTC diagnostics.
 s=replace(s,'// Leave window.fetch unchanged: the authenticated lobby API is authoritative.\\n  // RTC merely accelerates position updates, never fabricates HTTP responses.\\n\\n',
 '// Leave window.fetch unchanged: the authenticated lobby API is authoritative.\n  // RTC accelerates position updates; HTTP remains the fallback.\n\n','rtc-diagnostics-line-endings');
 s=section(s,'function mergeRemote(p,source){','  function mergeRoster(list){',`function mergeRemote(p,source){
    if(!p||!p.userId||p.userId===myId())return;
    if(source==='rtc'&&p.peerId!==net.peers.get(p.userId)?.peerId)return;
    var now=performance.now(),q=ensureMapEntry(p);if(!q)return;
    var session=String(p.motionSession||p.peerId||''),seq=Number(p.seq)||0;
    if(q._motion?.retired.includes(session)||q._motion&&q._motion.session===session&&seq&&seq<=q._motion.seq)return;
    if(source!=='rtc'&&window.nsLobbyRtcHasFresh?.(p.userId))return;
    q._motion=csMotionReceive487(q._motion,p,source==='rtc'?'rtc':'http',now,source==='rtc'?100:260);
    var r=net.remotes.get(p.userId)||{};
    Object.assign(r,{data:p,tx:p.x,ty:p.y,at:now,seq,rtc:source==='rtc',last:now});net.remotes.set(p.userId,r);
    net.roster.set(p.userId,Object.assign({},net.roster.get(p.userId)||{},p,{seenAt:Date.now()}));
  }
`, 'lobby-receive');
 const pulse=s.slice(s.indexOf('window.nsLobbyRtcPulse=function(ts){'),s.indexOf('\n',s.indexOf('window.nsLobbyRtcPulse=function(ts){')));
 s=replace(s,pulse,`window.nsLobbyRtcPulse=function(ts){if(!window.nsLobby?.active)return;ts=Number(ts)||performance.now();if(ts-net.lastRtcSend>=100){net.lastRtcSend=ts;var p=localState();if(p)sendRtc(p)}if(ts-net.lastDiscovery>=2500){net.lastDiscovery=ts;discovery()}};
`, 'lobby-single-transmitter');
 const from=s.indexOf('for(const q of state.players.values()){const beforeX=q.x');
 const to=s.indexOf('}catch(_){}if(!state.demo&&t-state.lastStateSent',from);
 if(from<0||to<0)throw Error('remote lobby render owner changed');
 s=s.slice(0,from)+'for(const q of state.players.values())window.csLobbyMotionSample487(q,t)'+s.slice(to);
 // Sample fresh fallback states frequently enough to retain actual turns.
 // RTC peers use the previous low-rate roster polling; fallback uses existing tick.
 s=replace(s,"(state._lastPoll||0)+900<t", "(state._lastPoll||0)+([...state.players.keys()].some(id=>!window.nsLobbyRtcHasFresh?.(id))?260:900)<t",'fallback-moving-poll');
 const pollFrom=s.indexOf('for(const p of data.players||[]){if(p.userId===mine)continue;');
 const pollTo=s.indexOf('for(const[id,q]of state.players)',pollFrom);
 if(pollFrom<0||pollTo<0)throw Error('remote lobby poll changed');
 s=s.slice(0,pollFrom)+`for(const p of data.players||[]){if(p.userId===mine)continue;const old=state.players.get(p.userId)||{};
 const q={...old,...p,x:Number.isFinite(old.x)?old.x:p.x,y:Number.isFinite(old.y)?old.y:p.y,dir:old.dir||p.dir,moving:!!old.moving,walkPhase:old.walkPhase||0,online:true};
 q._motion=old._motion&&window.nsLobbyRtcHasFresh?.(p.userId)?old._motion:csMotionReceive487(old._motion,p,'http',performance.now(),260);q._seen=performance.now();next.set(p.userId,q)}
 `+s.slice(pollTo);
 // Legacy direct peer mode uses the same sampler, and resets on scene/peer changes.
 s=section(s,'let csRemotePose=null,csRemoteLegs=null;','const __csBaseDraw=draw;',`let csRemotePose=null,csRemoteLegs=null;
function csRemoteVisual(r,now=performance.now()){csRemotePose=csMotionReceive487(csRemotePose,{...r,motionSession:r.motionSession||r.peerId||r.caseId},'rtc',now,220);return csRemoteMotion487.sample(csRemotePose,now,{canMove:csMotionSegment487})}
function csDrawRemote(){
 const r=csCoop.remote;if(!csCoop.connected||!r||!C||r.caseId!==C.id){csRemotePose=null;return}
 const im=csVariantImgs[r.coat?'coat':r.color||'navy']||csVariantImgs.navy;if(!im?.complete)return;
 const p=csRemoteVisual(r);drawSprite(im,p,60);csDrawNameplate(p,r.name||'Compañero',r.level||1,true)
}
`, 'legacy-remote-adapter');
 // Keep the entire cs-v410-modes protected clock/clinical block byte-identical.
 // Mount only position transport/render adapters after all original scripts.
 const adapter=`<script id="atria-guard-remote-adapter-487">
(function(){
 const challenge=window.csV41Challenge,selfId=challenge.selfId;
 const shared=()=>!!challenge.id&&['coop','competitive'].includes(challenge.mode);
 const oldRemoteDraw=csDrawRemote,csSharedRemotePose=new Map();
 const wire=csWireDataChannel;
 csWireDataChannel=function(dc){
  const result=wire.apply(this,arguments),send=dc.send.bind(dc),receive=dc.onmessage;
  dc.send=function(value){let m;try{m=JSON.parse(value)}catch(_){return send(value)}
   if(m.type==='state'){Object.assign(m,csMotionMeta487((m.roomId||'direct')+':'+(m.peerId||selfId),220));csMotionLog487('send',m.peerId||selfId,{...m,session:m.motionSession,walkPhase:m.walkPhase},m);value=JSON.stringify(m)}return send(value)};
  dc.onmessage=function(e){let m;try{m=JSON.parse(e.data)}catch(_){return receive?.call(dc,e)}
   if(m.type!=='state')return receive?.call(dc,e);
   const pid=m.peerId||m._fromPeerId,prev=csCoop.remotes?.[pid];
   if(!csMotionAcceptState487(prev,m))return;
   // A restarted generation is passed through ALL original transport validators.
   // Only its comparison against the old generation's counter is reset.
   const restart=prev&&prev.motionSession!==m.motionSession,previousSeq=prev?.stateSeq;
   if(restart)prev.stateSeq=0;
   try{receive?.call(dc,{...e,data:JSON.stringify(m)})}finally{if(restart)prev.stateSeq=previousSeq}
  };return result;
 };
 csDrawRemote=function(){if(!shared()){csSharedRemotePose.clear();return oldRemoteDraw.apply(this,arguments)}
 const now=performance.now(),live=new Set();for(const r of Object.values(csCoop.remotes||{})){
  if(!r||r.roomId!==challenge.id||r.peerId===selfId||r._fromPeerId===selfId||r.userId===window.nsSocial?.state?.()?.user?.id||!Number.isFinite(r.x)||!Number.isFinite(r.y))continue;
  const id=String(r.peerId||r._fromPeerId||r.userId||r.name),key=challenge.id+':'+id;live.add(key);
  const p=csMotionReceive487(csSharedRemotePose.get(key),r,typeof csCoop.dc?.addEventListener==='function'?'rtc':'http',now,220);csSharedRemotePose.set(key,p);
  csRemoteMotion487.sample(p,now,{canMove:csMotionSegment487});
  const im=csVariantImgs[r.coat?'coat':r.color||'navy']||csVariantImgs.navy;if(!im?.complete)continue;
  drawSprite(im,p,60);csDrawNameplate(p,r.name||'Compañero',r.level||1,true);csMotionLog487('render',id,p);
 }for(const id of csSharedRemotePose.keys())if(!live.has(id))csSharedRemotePose.delete(id)};
 // remote renderer end
})();
</script>`;
 // The golden master appends several later scripts after its original body close.
 // Append after those owners so they cannot replace this adapter at boot.
 return s+adapter;
}
