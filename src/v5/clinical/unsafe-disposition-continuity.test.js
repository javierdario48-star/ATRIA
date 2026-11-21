import test from 'node:test';
import assert from 'node:assert/strict';
import {createGuardSession} from './guard-session.js';
import {clinicalContent} from '../server/content.js';
import {resp01V2Candidate} from '../content/packs/respiratory-v2-candidate.js';
import {createProgressionLedger} from './progression.js';

const content={...clinicalContent,cases:clinicalContent.cases.map(c=>
 c.id==='RESP-01'?resp01V2Candidate:c)};
const members=[{id:'A',name:'Médico A'},{id:'B',name:'Médico B'}];
const credentials=new Map([['token-A','A'],['token-B','B']]);
function fixture(id,caseId='RESP-01',checkpoint=null){
 const roomId='wrong-disposition-'+id,uid=roomId+':P';
 const opts={roomId,mode:'coop',actorId:'A',actorName:'Médico A',
  members,patient:{uid,caseId},content,checkpoint,
  authenticate:key=>credentials.has(key)?{id:credentials.get(key),roomId}:null,
  resolveContext:({actorId})=>({patientUid:members.some(x=>x.id===actorId)?uid:null})};
 const s=createGuardSession(opts);
 const send=(who,key,text)=>s.post({id:key,text},'token-'+who);
 return {s,send,uid,opts};
}
function checkRebuke(result,dest,kind){
 assert.equal(result.clinical?.[0]?.status,'executed',JSON.stringify(result.clinical));
 const item=result.clinical[0].receipt,dispo=item?.disposition;
 assert.equal(dispo?.kind,kind);
 assert.equal(dispo?.closed,false);
 assert.equal(dispo?.destination,dest);
 assert.equal(dispo?.penaltyLoss,15);
 assert.match(item.message,/Dr\. Vega:.*¿Cómo se te ocurre/);
 assert.match(item.message,/15 XP/);
 return item;
}
test('unsafe alta is a physician decision: Vega rebukes, debits XP, and patient remains intact',async()=>{
 const {s,send,uid}=fixture('alta');
 try{
  const prior=structuredClone(s.read().patient);
  const out=await send('A','unsafe-alta','/disposicion alta');
  checkRebuke(out,'alta','clinical.unsafe-discharge');
  const now=s.read();
  assert.equal(now.patient.uid,uid);
  assert.equal(now.patient.caseEnded,false);
  assert.equal(now.patient.patientDied||false,false);
  assert.equal(now.patient.closure,null);
  assert.deepEqual(now.patient,prior,'a bad closure decision must not mutate the patient');
  assert.equal(now.progress.xp,0);
  assert.equal(now.progress.xpDebt,15);
  assert.equal(now.progress.penalties.length,1);
  assert(now.messages.some(x=>x.role==='mentor'&&x.name==='Dr. Vega'&&/alta/.test(x.text)));
  const followup=await send('A','vitals-after-alta','/signos');
  assert.equal(followup.clinical?.[0]?.status,'executed');
  assert.equal(s.read().patient.uid,uid);
  assert.equal(s.read().progress.receipts.length,0);
 }finally{s.dispose();}
});
test('unsafe formal observation triggers an INDEPENDENT Vega rebuke; active monitoring remains legitimate',async()=>{
 const {s,send,uid}=fixture('observation');
 try{
  const open=await send('A','unsafe-obs','/disposicion observacion');
  checkRebuke(open,'observacion','clinical.unsafe-observation');
  const before=s.read();
  assert.equal(before.patient.caseEnded,false);
  assert.equal(before.progress.xpDebt,15);
  assert.equal(before.progress.penalties[0].actorId,'A');
  assert.equal(before.patient.uid,uid);
  const ongoing=await send('A','active-observation','/observacion');
  assert(ongoing.status!=='rejected','active monitoring should remain available without XP penalty');
  assert.equal(s.read().progress.penalties.length,1,'active monitoring cannot be treated as another closure error');
  const second=await send('A','unsafe-again','/disposicion observacion');
  assert.equal(second.clinical?.[0]?.receipt?.disposition?.penaltyPreviouslyApplied,true);
  assert.equal(s.read().progress.penalties.length,1);
  assert.equal(s.read().progress.xpDebt,15);
 }finally{s.dispose();}
});
test('bad choices do not lock the patient: a second authenticated doctor continues from same state after checkpoint',async()=>{
 const f=fixture('handoff');
 let restored;
 try{
  const afterDx=await f.send('A','dx','/diagnostico neumonía adquirida en la comunidad');
  assert(afterDx.clinical?.[0]?.status==='executed');
  await f.send('A','study','/estudio g_resp01_cxr');
  let before=f.s.read();
  assert.equal(before.patient.orders.length,1);
  const failure=await f.send('A','wrong-disposition','/disposicion observacion');
  checkRebuke(failure,'observacion','clinical.unsafe-observation');
  const current=f.s.read();
  assert.deepEqual(current.patient.orders,before.patient.orders);
  assert.equal(current.patient.diagnosis,before.patient.diagnosis);
  assert.equal(current.patient.caseEnded,false);
  const saved=await f.s.checkpoint();
  restored=createGuardSession({...f.opts,checkpoint:saved});
  assert.equal(restored.read().progress.xpDebt,15);
  assert.equal(restored.read().patient.uid,f.uid);
  assert.deepEqual(restored.read().patient.orders,current.patient.orders);
  const byOther=await restored.post({id:'B-vitals',text:'/signos'},'token-B');
  assert.equal(byOther.clinical?.[0]?.status,'executed');
  assert.equal(restored.read().patient.lastVitalsKnown.patientUid,f.uid);
  assert.equal(restored.read().patient.diagnosis,current.patient.diagnosis);
  assert.equal(restored.read().progress.penalties[0].actorId,'A');
  assert.equal(restored.read().progress.receipts.length,0);
 }finally{restored?.dispose();f.s.dispose();}
});
test('unsafe alta and observation each incur one durable penalty per doctor; later earned XP services debt',()=>{
 const p=createProgressionLedger();
 const wrongA=p.penalizeUnsafeDischarge({eventId:'a1',actorId:'A',patientUid:'p'});
 const wrongO=p.penalizeUnsafeObservation({eventId:'o1',actorId:'A',patientUid:'p'});
 assert.equal(wrongA.loss,15);
 assert.equal(wrongO.loss,15);
 assert.equal(p.read().xpDebt,30);
 const repeat=p.penalizeUnsafeObservation({eventId:'o2',actorId:'A',patientUid:'p'});
 assert.equal(repeat.eventId,'o1');
 const byB=p.penalizeUnsafeDischarge({eventId:'b1',actorId:'B',patientUid:'p'});
 assert.equal(byB.loss,15,'other player must have a separate authored mistake receipt');
 const saved=createProgressionLedger(p.read());
 assert.equal(saved.read().penalties.length,3);
 assert.equal(saved.read().xpDebt,45);
 saved.award({kind:'clinical.closure',eventId:'later-award',patientUid:'another-patient',actorId:'A',closed:true,xp:100});
 assert.equal(saved.read().xp,55);
 assert.equal(saved.read().xpDebt,0);
});


test('wrong observation after measured vitals does not manufacture a phantom reassessment',async()=>{
 const {s,send}=fixture('no-phantom-observation');
 try{
  const vital=await send('A','measured','/signos');
  assert.equal(vital.clinical?.[0]?.status,'executed');
  assert.equal(s.read().patient.reassessments,0);
  const before=structuredClone(s.read().patient);
  const bad=await send('A','wrong-obs-after-vitals','/disposicion observacion');
  checkRebuke(bad,'observacion','clinical.unsafe-observation');
  assert.deepEqual(s.read().patient,before,'unsafe choice must never insert a fabricated routine reassessment');
  assert.equal(s.read().patient.reassessments,0);
  assert.equal(s.read().progress.xpDebt,15);
 }finally{s.dispose();}
});


for(const destination of ['alta','observacion'])test(
 'V2: legacy partial '+destination+' cannot bypass native safety, Vega sanction or continuation',async()=>{
 const {s,send}=fixture('partial-'+destination);
 try{
  const before=structuredClone(s.read().patient);
  const reply=await send('A','partial-attempt','/cierre-parcial '+destination);
  checkRebuke(reply,destination,destination==='alta'?
   'clinical.unsafe-discharge':'clinical.unsafe-observation');
  const now=s.read();
  assert.deepEqual(now.patient,before,'a bad partial choice must not fake a completed case');
  assert.equal(now.progress.xpDebt,15);
  const next=await send('B','continue-after-partial','/signos');
  assert.equal(next.clinical?.[0]?.status,'executed');
  assert.equal(s.read().patient.caseEnded,false);
 }finally{s.dispose();}
});
