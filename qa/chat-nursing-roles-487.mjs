/**
 * ATRIA 4.8.7 — clinical chat roles + medication administration regression.
 * Real integrated V412 / V487 wrappers; native headless medication scheduler.
 * Simulated desktop/Android text routes; NOT physical devices or real WebRTC.
 */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {apply487} from '../src/integration/apply-487.js';
import {CARE_JOURNEYS_487} from './clinical-care-journeys-487.js';
import {createAndroidIntegratedRuntime487} from './android-integrated-runtime-487.mjs';
import {advanceLiveNativeJourney487 as advance} from './physiology-live/native-journey-487.mjs';
const html=apply487(fs.readFileSync('vendor/atria-4.8.6/index.html','utf8'));
const pick=(a,b)=>{const i=html.indexOf(a),j=html.indexOf(b,i+a.length);assert(i>=0&&j>i,'source segment '+a);return html.slice(i,j)};
let routed=0,ack=0,nursing=0,patientReplies=0,medications=0,automaticIV=0;
for(const role of ['desktop-guest','android-guest'])for(const mode of ['coop','competitive']){
 const context={sim:{__csRemoteMirror487:true},window:{csV41Challenge:{active:true}},
  baseSend:function(t){routed++;return 'relay:'+t},nurseNatural:function(){nursing++;return true},
  norm:t=>String(t).toLowerCase(),chatRole:'nurse',pendingAddress:null,C:{studies:[],interventions:[]},
  MONITOR_THERAPY_CATALOG:[],player:{},addGlobalChat(){},refreshChatDock(){}};
 vm.createContext(context);
 const voice=pick(" sendMessage=function(text){\n  // Shared visiting doctors must reach"," // Keep the one existing dispatcher accessible");
 new vm.Script(voice).runInContext(context);
 assert.equal(context.sendMessage('enfermera ringer'),'relay:enfermera ringer');
 assert.equal(context.sendMessage('qué le pasó?'),'relay:qué le pasó?');
 assert.equal(nursing,0,'guest mirror must never administer locally');
 const v412=pick(" sendMessage=function(text){\n  const raw=String(text||'').trim();if(sim?.__csRemoteMirror487", " window.csLanguageV412=");
 const prior=vm.runInContext("sendMessage",context);
 context.base={send:(t)=>prior(t)};
 context.mayTreat=()=>true;context.inferRecipient=()=> 'nurse';
 context.setTimeout=()=>{throw Error('unexpected delayed guest-local nurse dose')};
 new vm.Script(v412).runInContext(context);
 assert.equal(context.sendMessage('enfermera ringer'),'relay:enfermera ringer');
 assert.equal(nursing,0,'V412 also bypasses visitor-local nurse interception');
 context.sim.__csRemoteMirror487=false;context.sim.__csRoomSpectator=true;
 assert.equal(context.sendMessage('enfermera ringer'),'relay:enfermera ringer',
  'unassigned guest/observer chat must reach room routing, not nurse parser');
 assert.equal(nursing,0,'no patient may be treated while in team-chat spectator state');
}
const ownerRelay=pick('function applyAssistAction(p,a,helper){','function requestAssist(index,a){');
for(const mode of ['coop','competitive'])for(const platform of ['desktop','android']){
 const record=[],uid='patient-uid';
 const p={caseId:'PERI-SEC-001',uid,index:0,ownerId:'owner',state:'in_care',instance:{name:'Paciente'}};
 const target={patientInstance:{uid},chats:{patient:[]}};
 const ctx={challenge:{mode},selfId:'owner',sim:target,CASES:[{id:p.caseId}],
  assistTargetSim:()=>target,assistActionAllowed:(_p,a)=>mode==='coop'||['speech','exam','monitor','vitals'].includes(a.kind),
  window:{csWithPatientStateV203:(s,_caseId,fn)=>{assert.equal(s,target);return fn();}},
  nurseNatural:t=>{record.push(['nurse',t]);return true},
  deliverPatientSpeech:t=>{record.push(['patient',t]);patientReplies++;return true},
  patientReply:t=>{patientReplies++;return 'Paciente responde a: '+t},
  complete:()=>{}, 
  processCommand:t=>{record.push(['command',t]);return true},
  sendMessage:()=>{throw Error('owner relay must NOT reclassify through proximity chat')},
  addGlobalChat:()=>{},refreshChatDock:()=>{},
  performExamRegion:t=>record.push(['exam',t]),orderStudy:()=>{},orderIntervention:()=>{},
  addMonitorTherapy:()=>{}};
 vm.createContext(ctx);new vm.Script(ownerRelay).runInContext(ctx);
 assert.equal(ctx.applyAssistAction(p,{kind:'speech',text:'¿Qué le pasó?'},'visitante'),true);
 assert.equal(target.chats.patient.length,2,'guest or opponent interview receives native patient answer');
 assert.equal(target.chats.patient[1][0],'patient');
 assert.equal(ctx.applyAssistAction(p,{kind:'command',text:'enfermera ringer'},'visitante'),mode==='coop');
 assert.equal(record.some(x=>x[0]==='nurse'),mode==='coop');
 if(mode==='competitive')assert.equal(record.filter(x=>x[0]==='nurse').length,0);
 ack++;
}
// All medicinal therapies in the original native catalog (procedures and
// deprescribing excluded). Each of the 13 ED cases is requested through the
// actual integrated native chat, then checked against administrationLog.
const aliases=[
 ['oxygen','oxígeno'],['fluid','ringer'],['albumin','albúmina IV'],
 ['vasopressor','noradrenalina'],['morphine','morfina'],
 ['analgesia','paracetamol'],['antiemetic','ondansetron'],['ppi','pantoprazol'],
 ['transfusion','transfusión'],['espironolactona','espironolactona'],
 ['steroid','corticoide'],['aza','azatioprina'],['ceftriaxone','ceftriaxona'],
 ['metronidazole','metronidazol'],['imipenem','imipenem'],
 ['ceftazidime','ceftazidima'],['cefoperazone','cefoperazona'],
 ['cefepime','cefepime'],['piptazo','piptazo'],['ampicillin','ampicilina'],
 ['amikacin','amikacina'],['gentamicin','gentamicina'],
 ['fluconazole','fluconazol'],['amphotericin','anfotericina'],
 ['furosemide','furosemida'],['beta_blocker','propranolol']
];
const issues=[],cases=Object.keys(CARE_JOURNEYS_487);
for(const caseId of cases)for(const [id,word] of aliases){
 try{
  const r=createAndroidIntegratedRuntime487(caseId,{confirmedIV:1});
  const p=r.ctx.sim;
  r.ctx.sendMessage('enfermera '+word);
  assert.equal(p.administrationLog.length,0,'speech acceptance is not medication evidence');
  advance(r,5,{dt:1/6});
  const given=p.administrationLog.filter(x=>x.id===id&&x.action!=='stop');
  assert.equal(given.length,1,caseId+' '+id+' must be exactly one native dose');
  assert(given[0].doseDisplay&&given[0].doseDisplay!=='—','dose needs native provenance');
  assert(p.monitorTherapies.has(id)||p.interventions.has(id),'drug effect status recorded');
  medications++;
 }catch(e){issues.push({caseId,id,reason:e.message})}
}
// Auto IV should be a genuine patient-bound procedure (never a fabricated
// drug receipt), including orders received before access was available.
for(const caseId of cases)for(const [id,word] of [
 ['fluid','ringer'],['ceftriaxone','ceftriaxona'],
 ['metronidazole','metronidazol'],['morphine','morfina']]){
 try{
  const r=createAndroidIntegratedRuntime487(caseId,{confirmedIV:0}),p=r.ctx.sim;
  r.ctx.sendMessage('enfermera '+word);
  assert.equal(p.administrationLog.length,0,'no premature IV dose');
  advance(r,45,{dt:1/6});
  assert(p.venousAccessCount>=1,'automatic peripheral access physically completed');
  assert.equal(p.administrationLog.filter(x=>x.id===id).length,1,'one actual IV dose after access');
  assert.equal((p.csPhase4Pending487||[]).filter(x=>x.id===id).length,0,'no stale pending IV');
  automaticIV++;
 }catch(e){issues.push({caseId,id,kind:'auto-IV',reason:e.message})}
}
// Original V180 procedures, with the current V487 patient-isolation patches,
// execute against a shared (hospital-wide) nursing actor, not invented queues.
const procStart=html.indexOf('function csQueueMonitor(){');
const procEnd=html.indexOf('window.csQueueMonitor=csQueueMonitor;',procStart);
assert(procStart>=0&&procEnd>procStart,'native monitor and IV scheduling present');
const patientA={venousAccessCount:0,monitorConnected:false},patientB={venousAccessCount:0,monitorConnected:false};
const procedureCtx={sim:patientA,nurse:{task:null,queue:[]},
 csEnsureProcedureState:()=>{},nurseSay:()=>{},csAccessLabel:()=>'Vía',
 window:{},Number,Math};
procedureCtx.queueNurse=task=>{
 task._targetSim=procedureCtx.sim;
 if(!procedureCtx.nurse.task)procedureCtx.nurse.task=task;
 else procedureCtx.nurse.queue.push(task);
 return true;
};
vm.createContext(procedureCtx);
new vm.Script(html.slice(procStart,procEnd)).runInContext(procedureCtx);
assert.equal(procedureCtx.csQueueIV(1),true);
assert.equal(procedureCtx.nurse.task._targetSim,patientA);
procedureCtx.sim=patientB;
assert.equal(procedureCtx.csQueueIV(2),true,'second patient must not inherit first patient access request');
assert.equal(procedureCtx.nurse.queue.at(-1)._targetSim,patientB);
assert.equal(procedureCtx.nurse.queue.at(-1).count,2);
assert.equal(procedureCtx.csQueueIV(2),false,'same patient IV request deduplicated');
assert.equal(procedureCtx.csQueueMonitor(),true);
procedureCtx.sim=patientA;
assert.equal(procedureCtx.csQueueMonitor(),true,'A needs a monitor even if B already requested one');
assert.equal(procedureCtx.csQueueIV(1),false,'A IV request still deduplicated');
assert.equal(procedureCtx.nurse.queue.filter(t=>t.kind==='monitor').length,2);
assert.equal(procedureCtx.nurse.queue.filter(t=>t.kind==='iv_access').length,1);
assert(html.includes("t.kind==='iv_access'&&t._targetSim===sim"),
 'clinical IV dedupe is patient-specific');
assert(html.includes("t.kind==='monitor'&&t._targetSim===sim"),
 'clinical monitor dedupe is patient-specific');

console.log('ATRIA CHAT AND NURSING ROLE MATRIX',JSON.stringify({
 totalMedicineCases:cases.length*aliases.length,confirmed:medications,
 autoIVCases:cases.length*4,autoIVConfirmed:automaticIV,
 rolesTested:['host','guest','coop','competitive','desktop-simulated','android-simulated'],
 realPatientResponses:patientReplies,guestDelegatedMessages:routed,
 ownerRelaySessions:ack,issues:issues.slice(0,22),issueCount:issues.length,
 physicalDevices:false,realNetwork:false
}));
assert.equal(issues.length,0,'native medication registry and automatic IV must log verifiable administrations');
