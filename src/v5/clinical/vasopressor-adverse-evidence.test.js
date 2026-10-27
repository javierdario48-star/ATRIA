import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createGuardSession} from './guard-session.js';
import {confirmedClinicalMissteps} from './clinical-risk.js';

const load=n=>JSON.parse(readFileSync(new URL('../content/'+n+'.json',import.meta.url)));
const content={cases:load('cases'),therapies:load('therapies'),defaultDoses:load('default-doses')};
function fixture(caseId){
 let sequence=0;
 const patient={uid:'pressor-'+caseId,caseId};
 const s=createGuardSession({roomId:patient.uid,mode:'solo',actorId:'doctor',actorName:'Doctor',
  patient,content,resolveContext:()=>({patientUid:patient.uid})});
 return {s,send:text=>s.post({id:'rx-'+(++sequence),text}),
  async advance(seconds){for(let t=0;t<seconds;t++){s.advance(1);await s.flush();}}};
}

test('a confirmed excessive norepinephrine response is documented and retains its safety consequence after stopping',async()=>{
 const f=fixture('CIRR-001');
 try{
  await f.send('Enfermera una vía');
  const ack=await f.send('Enfermera noradrenalina 1 mcg/kg/min IV');
  assert.equal(ack.clinical[0].status,'pending');
  assert.equal(f.s.read().patient.administrationLog.length,0);
  assert.deepEqual(f.s.read().patient.adverseEvents,[],'an order alone is no observed complication');
  await f.advance(30);
  const high=f.s.read();
  assert(high.patient.liveVitals.sys>155,'the inherited native excessive pressure response must be real');
  const event=high.patient.adverseEvents.find(x=>x.kind==='vasopressor-excess-response');
  assert(event,'the actual excessive pressure response must enter the patient history');
  assert.equal(event.sourceEventId,high.patient.administrationLog[0].sourceEventId);
  assert(high.closure.quality.penalty>=5,'debrief must account for the observed unsafe exposure');
  await f.send('Enfermera suspender noradrenalina');
  await f.advance(30);
  const stopped=f.s.read(),history=stopped.patient.adverseEvents.filter(x=>x.kind==='vasopressor-excess-response');
  assert.equal(history.length,1,'stopping or repeated observation must not erase or duplicate the complication');
  assert.equal(history[0].status,'resolved');
  assert(stopped.patient.liveVitals.sys<120,'the original native stop must remove the pressure effect');
  assert(confirmedClinicalMissteps(stopped.patient,content.cases.find(c=>c.id==='CIRR-001')).adverseCount>=1);
  assert.equal(stopped.progress.xp,0);
 }finally{f.s.dispose();}
});

for(const caseId of ['CIRR-001','PERI-SEC-001'])test(caseId+' ordinary confirmed support does not become an excessive-pressor complication',async()=>{
 const f=fixture(caseId);
 try{
  await f.send('Enfermera una vía');
  await f.send('Enfermera noradrenalina 0.05 mcg/kg/min IV');
  await f.advance(30);
  assert.equal(f.s.read().patient.administrationLog.length,1);
  assert(!f.s.read().patient.adverseEvents.some(x=>x.kind==='vasopressor-excess-response'));
 }finally{f.s.dispose();}
});
