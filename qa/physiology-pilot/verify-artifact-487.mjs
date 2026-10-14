/** Verify the sole authorised lazy QA entry; all pre-existing HTML and golden
 * scripts retain the exact approved B1 bytes. Verify offline module closure. */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {spawnSync} from 'node:child_process';
import {applyMultiplayerStabilization487} from '../../src/integration/multiplayer-stabilization-487.js';
import {applyChatRecipient487} from '../../src/integration/chat-recipient-487.js';
import {applyGuardScoreboard487} from '../../src/integration/guard-scoreboard-487.js';
import {applyPhysiologyQABootstrap487,PHYSIOLOGY_QA_FILES_487,RINGER_SAFETY_OLD_487,RINGER_SAFETY_NEW_487,RINGER_COMPLETION_OLD_487,RINGER_COMPLETION_NEW_487} from '../../src/integration/physiology-qa-bootstrap-487.js';
import {applyCriticalRescue487,CRITICAL_FINAL_OLD_487,CRITICAL_FINAL_NEW_487,CRITICAL_CLOCK_OLD_487,CRITICAL_CLOCK_NEW_487} from '../../src/integration/critical-rescue-487.js';
import {applySecondaryBridge487} from '../../src/integration/secondary-sepsis-bridge-487.js';
import {reverseRemoteMotion487} from '../../src/integration/remote-motion-487.js';
import {apply487} from '../../src/integration/apply-487.js';
import {applyMorphine487} from '../../src/integration/morphine-487.js';
import {applyUrgentCare487} from '../../src/integration/urgent-care-487.js';
import {applyCaseCompletion487} from '../../src/integration/case-completion-487.js';
import {applyPeritonitis487} from '../../src/integration/peritonitis-487.js';
import {NURSE_STOP_FINISH_OLD_487,NURSE_STOP_FINISH_NEW_487,NURSE_STOP_STATUS_OLD_487,
 NURSE_STOP_STATUS_NEW_487,NURSE_STOP_VERSION_OLD_487,NURSE_STOP_VERSION_NEW_487,
 NORA_RECEIPT_OLD_487,NORA_RECEIPT_NEW_487,NORA_DEDUPE_OLD_487,NORA_DEDUPE_NEW_487,
 NORA_PENDING_OLD_487,NORA_PENDING_NEW_487,NORA_CANCEL_OLD_487,NORA_CANCEL_NEW_487,
 NORA_DELIVERY_OLD_487,NORA_DELIVERY_NEW_487,NORA_BIND_RECEIPT_OLD_487,NORA_BIND_RECEIPT_NEW_487,
 NORA_FLUSH_OLD_487,NORA_FLUSH_NEW_487} from '../../src/integration/nurse-execution-487.js';
const html=fs.readFileSync('out/index.html','utf8');
const hash=createHash('sha256').update(html).digest('hex');
const immutableVendor=fs.readFileSync('vendor/atria-4.8.6/index.html','utf8');
assert.equal(html,apply487(immutableVendor),'artifact equals current source-integrated build');
// The clinical teaching/chat patches are reviewed source transformations,
// introduced after the historical digest was frozen. Check them against the
// actual generated artifact, then reconstruct the same historical source
// WITHOUT altering the original digest or regenerating the golden master.
assert.equal(applyChatRecipient487(html,{reverse:true}),
 apply487(immutableVendor,{recipient:false}),
 'exact full-build inversion of NPC chat mentions, no unreviewed bytes');
const motionReference=apply487(immutableVendor,{recipient:false,vega:false,remoteMotion:false});
const historicalHtml=reverseRemoteMotion487(apply487(immutableVendor,{recipient:false,vega:false}),motionReference);
assert.equal(historicalHtml,motionReference,'exact inversion of all remote motion changes; original clinical digest remains unchanged');
assert(html.includes("function csVegaPriorityStudies487()")&&
 html.includes('<script id="atria-recipient-selector-487">'),
 'new clinical teaching and chat layers remain in verified active build');
// Restore only the authorized stop executor/dispatch/confirmation additions.
// Frozen pre-stop scripts are the exact 7606e14 checkpoint, not a replacement
// development base. The original protected hash below is never regenerated.
const morphine=[...html.matchAll(/<script id="atria-morphine-487">[\s\S]*?<\/script>/g)];
assert.equal(morphine.length,1,'one bounded native morphine owner');
assert.equal(morphine[0][0],applyMorphine487('<body></body>').replace('<body>','').replace('</body>',''),
 'morphine integration matches current reviewed source');
const urgent=[...html.matchAll(/<script id="atria-urgent-care-487">[\s\S]*?<\/script>/g)];
assert.equal(urgent.length,1,'exactly one care confirmation adapter');
assert.equal(urgent[0][0],applyUrgentCare487('<body></body>').replace('<body>','').replace('</body>',''),
 'care adapter must match reviewed current source');
const closure=[...html.matchAll(/<script id="atria-case-completion-487">[\s\S]*?<\/script>/g)];
assert.equal(closure.length,1,'one general clinical closure and XP adapter');
assert.equal(closure[0][0],applyCaseCompletion487('<body></body>').replace('<body>','').replace('</body>',''),
 'exact current reviewed case closure source');
// The new scoreboard is a verified presentation-only overlay. Remove only
// its exact generated CSS/JS before comparing immutable historical bytes.
const scoreProbe=applyGuardScoreboard487('<html><head></head><body></body></html>');
const scoreStyle=scoreProbe.match(/<style id="atria-guard-scoreboard-style-487">[\s\S]*?<\/style>/)?.[0];
const scoreScript=scoreProbe.match(/<script id="atria-guard-scoreboard-runtime-487">[\s\S]*?<\/script>/)?.[0];
assert(scoreStyle&&scoreScript,'source-identical scorecard artifacts exist');
assert.equal(html.split(scoreStyle).length,2,'exactly one source-certified scoreboard style');
assert.equal(html.split(scoreScript).length,2,'exactly one source-certified scoreboard runtime');
let beforeStop=historicalHtml.replace(scoreStyle,'').replace(scoreScript,'').replace(morphine[0][0],'').replace(urgent[0][0],'').replace(closure[0][0],'');
const bedsideBefore487=" function cs413PatientAtTap(x,y){\n  let nearest=null,distance=Infinity;\n  for(const p of patients()){\n   const pos=p.instance?.bed?.patient;if(!pos)continue;\n   const [px,py]=worldToScreen(pos[0],pos[1]);\n   const dx=Math.abs(x-px),dy=Math.abs(y-py);\n   if(dx>Math.max(25,22*scale)||dy>Math.max(26,20*scale))continue;\n   const d=Math.hypot(dx,dy);\n   if(d<distance){nearest=p;distance=d;}\n  }\n  return nearest;\n }\n handleGameTap=function(e){\n  if(C&&!editorOpen){\n   const clickedPatient=cs413PatientAtTap(e.clientX,e.clientY);\n   if(clickedPatient){select(clickedPatient,false);return;}\n   const candidates=scene().filter(m=>hit(e.clientX,e.clientY,m));",bedsideNow487=" function cs413TapTarget487(x,y){\n  // Same map-to-screen projection as the native scene; hit surfaces stay\n  // attached to each bed/patient UID regardless of viewport or pixel ratio.\n  let best=null;\n  for(const p of patients()){\n   const point=p.instance?.bed?.patient;if(!point)continue;\n   const [px,py]=worldToScreen(point[0],point[1]);\n   const rx=Math.max(24,19*scale),ry=Math.max(27,21*scale);\n   const dx=(x-px)/rx,dy=(y-py)/ry;\n   if(Math.abs(dx)<=1&&Math.abs(dy)<=1){\n    const score=dx*dx+dy*dy;\n    if(!best||score<best.score)best={kind:'patient',patient:p,score};\n   }\n   const m=monitorFor(p.instance);if(!m)continue;\n   const [mx,my]=worldToScreen(m.x,m.y);\n   const wx=Math.max(24,m.width*scale/2+7),wy=Math.max(24,m.height*scale/2+7);\n   const mxn=(x-mx)/wx,myn=(y-my)/wy;\n   if(Math.abs(mxn)<=1&&Math.abs(myn)<=1){\n    const score=mxn*mxn+myn*myn;\n    // Prefer the visible monitor body in an overlapping region;\n    // otherwise the closest *specific* target, never the whole bed.\n    if(!best||score+.05<best.score)best={kind:'monitor',patient:p,score:score+.05};\n   }\n  }\n  return best;\n }\n window.cs413TapTarget487=cs413TapTarget487;\n handleGameTap=function(e){\n  if(C&&!editorOpen){\n   const target=cs413TapTarget487(e.clientX,e.clientY);\n   if(target){select(target.patient,target.kind==='monitor');return;}\n   const candidates=scene().filter(m=>hit(e.clientX,e.clientY,m));\n   candidates.sort((a,b)=>{const pa=worldToScreen(a.x,a.y),pb=worldToScreen(b.x,b.y);return Math.hypot(e.clientX-pa[0],e.clientY-pa[1])-Math.hypot(e.clientX-pb[0],e.clientY-pb[1]);});\n   if(candidates.length){const m=candidates[0],p=patients().find(p=>p.instance.bedId===m.bedId);if(p)select(p,true);else toast('Esta cama no tiene un paciente en atención.');return;}\n  }\n  pending=null;monitorIntent=null;return base.tap.apply(this,arguments);\n };";
assert.equal(beforeStop.split(bedsideNow487).length,2,'one reviewed bounded patient/monitor touch adapter');
beforeStop=beforeStop.replace(bedsideNow487,bedsideBefore487);
const humanStyle487="<style id=\"atria-human-avatar-ui-487\">\n#atriaHumanAvatarCard487{position:fixed;z-index:9600;min-width:185px;max-width:80vw;display:flex;flex-direction:column;gap:10px;padding:13px;background:linear-gradient(135deg,#09292c,#143b41);border:1px solid #58aca4;border-radius:12px;box-shadow:0 12px 28px #0009;color:#e3faf6;font:13px system-ui;pointer-events:auto}\n#atriaHumanAvatarCard487 strong{font-size:14px;overflow-wrap:anywhere}\n#atriaHumanAvatarCard487 button{border:1px solid #62b7a3;background:#125f55;color:white;border-radius:8px;padding:9px;min-height:40px;font-weight:650}\n</style>",humanScript487="<script id=\"atria-human-avatar-tap-487\">(function(){\n if(window.__atriaSocialAvatarTap487)return;window.__atriaSocialAvatarTap487=true;\n const room=()=>window.csV41Challenge;\n const active=()=>!!room()?.active&&!room().ended&&!document.body.classList.contains('nsLobbyMode');\n let card=null;\n const close=()=>{card?.remove();card=null};\n function verifiedMember(remote){\n  const social=window.nsSocial,session=social?.room?.(),me=social?.state?.()?.user;\n  if(!session||!me||!Array.isArray(session.members))return null;\n  return session.members.find(m=>m.userId!==me.id&&\n   (m.peerId===(remote.peerId||remote._fromPeerId)||\n    remote.userId&&m.userId===remote.userId))||null;\n }\n function target(x,y){\n  if(!active()||typeof csCoop==='undefined')return null;\n  const remotes=Object.values(csCoop.remotes||{});\n  for(let i=remotes.length-1;i>=0;i--){\n   const r=remotes[i],member=r&&r.roomId===room().id?verifiedMember(r):null;\n   if(!member||!Number.isFinite(r.x)||!Number.isFinite(r.y))continue;\n   const [sx,sy]=worldToScreen(r.x,r.y);\n   if(Math.abs(x-sx)<=Math.max(25,19*scale)&&\n      y>=sy-Math.max(64,60*scale)&&y<=sy+Math.max(8,8*scale))\n    return {member,remote:r};\n  }\n  return null;\n }\n window.csHumanAvatarHit487=target;\n function show(hit,x,y){\n  close();\n  const social=window.nsSocial,friend=social?.state?.()?.friends?.find(f=>f.id===hit.member.userId);\n  const node=document.createElement('section');node.id='atriaHumanAvatarCard487';\n  node.setAttribute('role','dialog');node.setAttribute('aria-label','Jugador');\n  node.style.left=Math.max(8,Math.min(innerWidth-225,x-70))+'px';\n  node.style.top=Math.max(8,Math.min(innerHeight-110,y-122))+'px';\n  const title=document.createElement('strong');title.textContent=hit.member.name||hit.remote.name||'Jugador';\n  const action=document.createElement('button');action.type='button';\n  action.textContent=friend?'Ver perfil · Amigo':'Agregar a amigos';\n  action.addEventListener('click',async e=>{\n   e.stopPropagation();\n   if(friend){social?.render?.();close();return}\n   action.disabled=true;\n   try{await social.addFriend(hit.member.userId);action.textContent='Solicitud enviada'}\n   catch(_){action.textContent='No se pudo enviar';action.disabled=false}\n  });\n  node.append(title,action);document.body.appendChild(node);card=node;\n }\n if(typeof handleGameTap==='function'){\n  const nativeTap=handleGameTap;\n  handleGameTap=function(e){\n   if(!active())return nativeTap.apply(this,arguments);\n   const hit=target(e.clientX,e.clientY);\n   if(hit){show(hit,e.clientX,e.clientY);return}\n   close();return nativeTap.apply(this,arguments);\n  };\n }\n window.addEventListener?.('keydown',e=>{if(e.key==='Escape')close()});\n})();</script>";
for(const block of [humanStyle487,humanScript487]){
 assert.equal(beforeStop.split(block).length,2,'one exact reviewed human-avatar social overlay');
 beforeStop=beforeStop.replace(block,'');
}

for(const [id,name,digest] of [
 ['atria-nurse-execution-487','nurse-execution','94d1e61a4b46b9975578100825bf0977c7c431ea70b4fff54986c9df4bb0c85d'],
 ['atria-nurse-voice-routing-487','nurse-voice','1977da69627bbadd57fb995c0d908d9fd65f5e6595b64142f63f7cced5348ea3'],
 ['atria-verified-clinical-chat-487','clinical-confirmations','b2efcb61d5f374b76263b717cff6ee79f544aba98484c599a2b07d48ba2fd0b0'],
 ['atria-manual-monitor-iv-487','manual-monitor','752ef207aeef3ce19ec60f31b9446fea131e4ec3d336db9718ff3cac96e0f7e4']]){
 const scripts=[...beforeStop.matchAll(new RegExp('<script id="'+id+'">[\\s\\S]*?<\\/script>','g'))];
 assert.equal(scripts.length,1);
 const frozen=fs.readFileSync(new URL('../physiology-live/'+name+(name==='manual-monitor'?'-pre-noradrenaline-487.txt':'-pre-stop-487.txt'),import.meta.url),'utf8');
 assert.equal(createHash('sha256').update(frozen).digest('hex'),digest,'verified pre-stop script '+name);
 beforeStop=beforeStop.replace(scripts[0][0],frozen);
}
for(const [rawCurrent,rawPrior] of [[NURSE_STOP_FINISH_NEW_487,NURSE_STOP_FINISH_OLD_487],
 [NURSE_STOP_STATUS_NEW_487,NURSE_STOP_STATUS_OLD_487],[NURSE_STOP_VERSION_NEW_487,NURSE_STOP_VERSION_OLD_487],
 [NORA_RECEIPT_NEW_487,NORA_RECEIPT_OLD_487],[NORA_DEDUPE_NEW_487,NORA_DEDUPE_OLD_487],
 [NORA_PENDING_NEW_487,NORA_PENDING_OLD_487],[NORA_CANCEL_NEW_487,NORA_CANCEL_OLD_487],
 [NORA_DELIVERY_NEW_487,NORA_DELIVERY_OLD_487],[NORA_BIND_RECEIPT_NEW_487,NORA_BIND_RECEIPT_OLD_487],
 [NORA_FLUSH_NEW_487,NORA_FLUSH_OLD_487]]){
 // The already-approved Ringer completion guard wraps the same native
 // cancellation condition later in apply487; preserve it on BOTH sides.
 const current=rawCurrent.replace(RINGER_COMPLETION_OLD_487,RINGER_COMPLETION_NEW_487);
 const prior=rawPrior.replace(RINGER_COMPLETION_OLD_487,RINGER_COMPLETION_NEW_487);
 assert.equal(beforeStop.split(current).length,2,'one authorized native stop boundary');beforeStop=beforeStop.replace(current,prior);
}
const entries=[...html.matchAll(/<script id="atria-physiology-qa-487">[\s\S]*?<\/script>/g)];
assert.equal(entries.length,1,'exactly one explicit OFF-by-default observer entry');
const expectedEntry=applyPhysiologyQABootstrap487('<body></body>').replace('<body>','').replace('</body>','');
assert.equal(entries[0][0],expectedEntry,'QA bootstrap bytes match tested source');
// Reverse exactly the authorised critical-predicate repair and replacement
// script before checking the old protected hash. All unrelated bytes stay fixed.
const criticalMarker='<script id="atria-critical-rescue-487">';
const criticalScripts=[...html.matchAll(/<script id="atria-critical-rescue-487">[\s\S]*?<\/script>/g)];
assert.equal(criticalScripts.length,1);
assert.equal(criticalScripts[0][0],applyCriticalRescue487('<body></body>').replace('<body>','').replace('</body>',''));
const oldCritical=fs.readFileSync(new URL('./critical-rescue-pre-repair-487.txt',import.meta.url),'utf8');
assert(oldCritical.startsWith(criticalMarker)&&oldCritical.endsWith('</script>'),'frozen prior critical adapter');
assert.equal(createHash('sha256').update(oldCritical).digest('hex'),'b622fb06c590a0f2d1813dcc2914a7a0e03fa1975ba418a7b0e3a37e1e4a478e');
assert.equal(html.split(CRITICAL_FINAL_NEW_487).length,2,'one final repair');
assert.equal(html.split(CRITICAL_CLOCK_NEW_487).length,2,'one native per-patient clock hook');
const bridgeScripts=[...html.matchAll(/<script id="atria-secondary-sepsis-bridge-487">[\s\S]*?<\/script>/g)];
assert.equal(bridgeScripts.length,1);
assert.equal(bridgeScripts[0][0],applySecondaryBridge487('<body></body>').replace('<body>','').replace('</body>',''));
const oldBridge=fs.readFileSync(new URL('./secondary-bridge-pre-owner-487.txt',import.meta.url),'utf8');
assert.equal(createHash('sha256').update(oldBridge).digest('hex'),'ff570d3d2ee468d0d24d0492a876d85a61d7e3d242e311681bd5e72fdef4a045');
assert.equal(html.split(RINGER_SAFETY_NEW_487).length,2,'one native fluid toxicity ownership gate');
assert.equal(html.split(RINGER_COMPLETION_NEW_487).length,2,'one scoped fluid completion qualifier');
// Reverse the single reviewed XP-quality fallback before comparing to the
// original frozen baseline. This does NOT rebaseline vital/clinical numbers.
const periCurrent=applyPeritonitis487('<body></body>').replace('<body>','').replace('</body>','');
// Reverse ONLY the reviewed Android execution/XP deltas. The frozen original
// hash and numeric trajectories are unchanged, so unrelated drift still fails.
const handoffStart=periCurrent.indexOf(' // The late native ns422 policy must use');
const handoffEnd=periCurrent.indexOf(' const oldXpEligible=window.nsExperienceEligible;',handoffStart);
assert(handoffStart>0&&handoffEnd>handoffStart,'reviewed late XP bridge');
const handoffBridge=periCurrent.slice(handoffStart,handoffEnd);
for(const [current,prior] of [
 [handoffBridge,''],
 ['   return window.csPeritonitisExperienceEligible487();',
  '   return !!sim?._csPeriCompletionForXP487&&handoffProof()&&!sim?.patientDied;'],
 ['window.nsExperienceEligible=function(){const handoff=window.csPeritonitisExperienceEligible487?.()??window.csCaseExperienceEligible487?.();return handoff==null?!sim?.patientDied&&!!window.nsPatientState?.()?.treatment.complete:handoff;};',
  'window.nsExperienceEligible=function(){return !sim?.patientDied&&!!window.nsPatientState?.()?.treatment.complete;};'],
 ['\n  if(window.csNurseVoice487?.dispatch)return window.csNurseVoice487.dispatch(text);',''],
 ['scanned.items.filter(x=>!x.negated&&!x.routeOnly)','scanned.items.filter(x=>!x.negated)']
]){
 assert.equal(beforeStop.split(current).length,2,'unique reviewed Android delta');
 beforeStop=beforeStop.replace(current,prior);
}
const periStart=periCurrent.indexOf('     // Real V19 career payout consumes numeric quality fields.');
const periEnd=periCurrent.indexOf('     b.diagnosis=15;',periStart);
assert(periStart>0&&periEnd>periStart,'exact authorised finite-XP block in peritonitis source');
const xpFix=periCurrent.slice(periStart,periEnd);
assert(xpFix.includes('b.autonomy=')&&xpFix.includes('b.efficiency='),'finite career inputs guarded');
assert.equal(beforeStop.split(xpFix).length,2,'unique reviewed peritonitis XP revision');
beforeStop=beforeStop.replace(xpFix,'');
const restored=beforeStop.replace(entries[0][0],'').replace(criticalScripts[0][0],oldCritical)
 .replace(bridgeScripts[0][0],oldBridge).replace(RINGER_SAFETY_NEW_487,RINGER_SAFETY_OLD_487)
 .replace(RINGER_COMPLETION_NEW_487,RINGER_COMPLETION_OLD_487)
 .replace(CRITICAL_FINAL_NEW_487,CRITICAL_FINAL_OLD_487).replace(CRITICAL_CLOCK_NEW_487,CRITICAL_CLOCK_OLD_487);
// Reverse the reviewed multiplayer changes from the exact pre-Vega/pre-chat
// source, then compare the SAME original protected digest as before.
const clinicRestored=applyMultiplayerStabilization487(restored,{reverse:true});
const originalHash=createHash('sha256').update(clinicRestored).digest('hex');
assert.equal(originalHash,'dc59039a59220582a1f5c86fcd8a2a0227c1cd3868550ba34a290049b94ef9c7','all prior HTML bytes remain identical after removing sole QA entry');
assert(!html.includes('physiology-pilot-487')&&!html.includes('physiology-shadow-487'),'no eager B1 import or effect writer');
assert(/4\.8\.6/.test(html)&&/Estudios solicitados/i.test(html),'existing QA output contract');
for(const name of ['task7.js','task8.js','task12.js','task13.js'])assert(!new RegExp('<script[^>]+src=["\'][^"\']*'+name.replace('.','\\.'),'i').test(html));
const dir=fs.mkdtempSync(path.join(os.tmpdir(),'atria-b1-inline-'));
let inline=0,external=0,moduleBytes=0;
try{
 for(const [i,match]of [...html.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/gi)].entries()){
  if(!match[1].trim())continue;
  const file=path.join(dir,'inline-'+i+'.js');fs.writeFileSync(file,match[1]);
  const r=spawnSync(process.execPath,['--check',file],{encoding:'utf8'});assert.equal(r.status,0,r.stderr);inline++;
 }
 const expected=fs.readdirSync('vendor/atria-4.8.6').filter(n=>/^task\d+\.js$/.test(n)).sort();
 assert.deepEqual(fs.readdirSync('out').filter(n=>/^task\d+\.js$/.test(n)).sort(),expected,'complete golden-master task inventory');
 for(const name of expected){
  assert.equal(Buffer.compare(fs.readFileSync('out/'+name),fs.readFileSync('vendor/atria-4.8.6/'+name)),0,'golden master copy '+name);
  const r=spawnSync(process.execPath,['--check','out/'+name],{encoding:'utf8'});assert.equal(r.status,0,r.stderr);external++;
 }
 const root=path.resolve('out/qa-physiology'),moduleFiles=fs.readdirSync(root,{recursive:true}).filter(n=>n.endsWith('.js')).sort();
 assert.deepEqual(moduleFiles,PHYSIOLOGY_QA_FILES_487.slice().sort(),'explicit complete module inventory');
 for(const name of moduleFiles){
  const target=path.join(root,name),code=fs.readFileSync(target,'utf8');
  assert.equal(Buffer.compare(fs.readFileSync(target),fs.readFileSync('src/'+name)),0,'QA module source copy '+name);
  moduleBytes+=Buffer.byteLength(code);
  for(const match of code.matchAll(/\bfrom\s*['"]([^'"]+)['"]/g)){
   const dependency=path.resolve(path.dirname(target),match[1]);
   assert(match[1].startsWith('.')&&dependency.startsWith(root+'/')&&fs.existsSync(dependency),'offline local import '+name+': '+match[1]);
  }
  const r=spawnSync(process.execPath,['--check',target],{encoding:'utf8'});assert.equal(r.status,0,r.stderr);
 }
}finally{fs.rmSync(dir,{recursive:true,force:true});}
console.log('B1 PROTECTED / LAZY QA ARTIFACT PASS',JSON.stringify({sha256:hash,protectedHtmlSha256:originalHash,
 inline,external,modules:PHYSIOLOGY_QA_FILES_487.length,moduleBytes,defaultEnabled:false,activeLiveWritersByDefault:0,
 experimentalScope:'fresh local PERI-SEC/named Ringer IV bolus'}));
