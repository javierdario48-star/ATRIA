import fs from 'node:fs/promises';
const BASE='https://night-shift-clinical.vercel.app';
const out='out';
await fs.mkdir(out,{recursive:true});
let html=await (await fetch(BASE+'/',{headers:{'cache-control':'no-cache'}})).text();
if(!html.includes("version:'4.8.6'")&&!html.includes('4.8.6')) throw new Error('Expected public 4.8.6 baseline');
const rep=(a,b,label)=>{const n=html.split(a).length-1;if(n!==1)throw new Error(label+' match count '+n);html=html.replace(a,b)};
rep("#chatHistoryMini{display:none!important}#commandPalette","#chatHistoryMini{display:none!important}#chatHistoryMini.show{display:block!important}#commandPalette",'history');
rep("function csStartPeerSync(){if(csCoop.syncTimer)clearInterval(csCoop.syncTimer);csCoop.syncTimer=setInterval(()=>{csSendPeerState();csUpdateRemoteAudio()},220)}",
"function csStartPeerSync(){if(csCoop.syncTimer){clearInterval(csCoop.syncTimer);clearTimeout(csCoop.syncTimer)}const tick=()=>{csCoop.syncTimer=null;if(!csCoop?.dc||csCoop.dc.readyState!=='open')return;csSendPeerState();csUpdateRemoteAudio();csCoop.syncTimer=setTimeout(tick,player?.moving?110:220)};csCoop.syncTimer=setTimeout(tick,0)}",'peer sync');
rep("if(parsed?.type==='state'&&parsed.roomId===challenge.id&&parsed.name){csCoop.remotes=csCoop.remotes||{};const pid=parsed.peerId||parsed._fromPeerId;if(pid)csCoop.remotes[pid]={...(csCoop.remotes[pid]||{}),...parsed,online:true}}",
"if(parsed?.type==='state'&&parsed.roomId===challenge.id&&parsed.name){csCoop.remotes=csCoop.remotes||{};const pid=parsed.peerId||parsed._fromPeerId;if(pid&&pid!==selfId&&(!dc.peerGameIds?.length||dc.peerGameIds.includes(pid))){const old=csCoop.remotes[pid]||{};csCoop.remotes[pid]={...old,...parsed,__tx:Number(parsed.x)||0,__ty:Number(parsed.y)||0,__vx:Number.isFinite(old.__vx)?old.__vx:Number(parsed.x)||0,__vy:Number.isFinite(old.__vy)?old.__vy:Number(parsed.y)||0,online:true}}else if(pid)delete csCoop.remotes[pid]}",
'peer identity');
rep("csDrawRemote=function(){if(!shared())return oldRemoteDraw.apply(this,arguments);const remotes=Object.values(csCoop.remotes||{});for(const r of remotes){if(!r||r.roomId!==challenge.id)continue;const im=csVariantImgs[r.coat?'coat':r.color||'navy']||csVariantImgs.navy;if(!im?.complete)continue;const actor={x:r.x||0,y:r.y||0,dir:r.dir||'S',moving:!!r.moving,walkPhase:r.walkPhase||0};drawSprite(im,actor,60);csDrawNameplate(actor,r.name||'Compañero',r.level||1,true)}}",
"csDrawRemote=function(){if(!shared())return oldRemoteDraw.apply(this,arguments);const remotes=Object.values(csCoop.remotes||{});for(const r of remotes){if(!r||r.roomId!==challenge.id)continue;const im=csVariantImgs[r.coat?'coat':r.color||'navy']||csVariantImgs.navy;if(!im?.complete)continue;const tx=Number.isFinite(r.__tx)?r.__tx:(Number(r.x)||0),ty=Number.isFinite(r.__ty)?r.__ty:(Number(r.y)||0);if(!Number.isFinite(r.__vx))r.__vx=tx;if(!Number.isFinite(r.__vy))r.__vy=ty;const d=Math.hypot(tx-r.__vx,ty-r.__vy);if(d>320){r.__vx=tx;r.__vy=ty}else{const a=1-Math.exp(-16/80);r.__vx+=(tx-r.__vx)*a;r.__vy+=(ty-r.__vy)*a}const actor={x:r.__vx,y:r.__vy,dir:r.dir||'S',moving:!!r.moving,walkPhase:r.walkPhase||0};drawSprite(im,actor,60);csDrawNameplate(actor,r.name||'Compañero',r.level||1,true)}}",
'peer interpolation');
{
 const variants=[
  "next.set(p.userId,{...old,...p,online:true})",
  "next.set(p.userId,{...old,...p,online:!0})",
  "next.set(p.userId,{...old,...p,online:true,})"
 ];
 const hits=variants.map(v=>[v,html.split(v).length-1]).filter(([,n])=>n===1);
 if(hits.length===1){
  const a=hits[0][0];
  html=html.replace(a,"next.set(p.userId,{...old,...p,__tx:Number(p.x)||0,__ty:Number(p.y)||0,__vx:Number.isFinite(old.__vx)?old.__vx:Number(p.x)||0,__vy:Number.isFinite(old.__vy)?old.__vy:Number(p.y)||0,online:true})");
 }else{
  const re=/next\.set\(p\.userId,\{\.\.\.old,\.\.\.p,online:(?:true|!0),?\}\)/g;
  const m=[...html.matchAll(re)];
  if(m.length!==1) throw new Error('lobby target match count '+m.length);
  html=html.replace(re,"next.set(p.userId,{...old,...p,__tx:Number(p.x)||0,__ty:Number(p.y)||0,__vx:Number.isFinite(old.__vx)?old.__vx:Number(p.x)||0,__vy:Number.isFinite(old.__vy)?old.__vy:Number(p.y)||0,online:true})");
 }
}
rep("if(rim?.complete)drawSprite(rim,{x:p.x,y:p.y,dir:p.dir||'S',moving:!!p.moving,walkPhase:p.walkPhase||0},60);csDrawNameplate({x:p.x,y:p.y},p.name||'Jugador',p.level||1,true);if(p.bubble&&performance.now()<(p.bubbleUntil||0)&&isVisible(p.x,p.y))speech(p.bubble,p.x,p.y-6,'#ccecff',p.bubbleUntil)",
"const tx=Number.isFinite(p.__tx)?p.__tx:(Number(p.x)||0),ty=Number.isFinite(p.__ty)?p.__ty:(Number(p.y)||0);if(!Number.isFinite(p.__vx))p.__vx=tx;if(!Number.isFinite(p.__vy))p.__vy=ty;const dd=Math.hypot(tx-p.__vx,ty-p.__vy);if(dd>320){p.__vx=tx;p.__vy=ty}else{const aa=1-Math.exp(-16/80);p.__vx+=(tx-p.__vx)*aa;p.__vy+=(ty-p.__vy)*aa}if(rim?.complete)drawSprite(rim,{x:p.__vx,y:p.__vy,dir:p.dir||'S',moving:!!p.moving,walkPhase:p.walkPhase||0},60);csDrawNameplate({x:p.__vx,y:p.__vy},p.name||'Jugador',p.level||1,true);if(p.bubble&&performance.now()<(p.bubbleUntil||0)&&isVisible(p.__vx,p.__vy))speech(p.bubble,p.__vx,p.__vy-6,'#ccecff',p.bubbleUntil)",
'lobby interpolation');
rep("if(!state.demo&&t-state.lastStateSent>280)sendState();if(!state.demo&&!state.polling&&(state._lastPoll||0)+650<t)",
"if(!state.demo&&t-state.lastStateSent>(player.moving?110:220))sendState();if(!state.demo&&!state.polling&&(state._lastPoll||0)+180<t)",
'lobby cadence');
{const n=html.split("version:'4.8.6'").length-1;if(n!==1)throw new Error('version marker count '+n);html=html.replace("version:'4.8.6'","version:'4.8.7'");}
const scripts=[...html.matchAll(/<script[^>]+src=["'](\/task\d+\.js[^"']*)["']/g)].map(m=>m[1]);
for(const src of [...new Set(scripts)]){const u=new URL(src,BASE);const body=await (await fetch(u)).text();await fs.writeFile(out+'/'+u.pathname.split('/').pop(),body)}
await fs.writeFile(out+'/index.html',html);
console.log('ATRIA 4.8.7 built from public 4.8.6; tasks copied:',scripts.length);
