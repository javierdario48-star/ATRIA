import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createGuardSession} from './guard-session.js';
import {confirmedRespiratoryAdverse} from './clinical-risk.js';
const read=n=>JSON.parse(readFileSync(new URL('../content/'+n+'.json',import.meta.url)));
const content={cases:read('cases'),therapies:read('therapies'),defaultDoses:read('default-doses')};
let seed=0;
function bot(caseId,mode='solo'){
 const n=++seed,p={uid:caseId+'-'+n,caseId};
 const s=createGuardSession({roomId:'stress-'+n,mode,actorId:'bot',actorName:'Bot',patient:p,
 content,resolveContext:()=>({patientUid:p.uid})});
 let command=0;
 return {s,post:text=>s.post({id:'cmd-'+(++command),text})};
}
test('24 bots: native Ringer 0/0.5/2/4/6/10L gradients, both cases, both modes',async()=>{
 const records=[];
 for(const caseId of ['APP-001','CIRR-001'])
  for(const mode of ['solo','apprentice'])
   for(const ml of [0,500,2000,4000,6000,10000]){
    const f=bot(caseId,mode),start=f.s.read().patient.liveVitals;
    try{
     if(ml){
      await f.post('Enfermera una vía');
      const reply=await f.post('Enfermera Ringer '+ml+' ml');
      assert.equal(reply.clinical[0].status,'pending');
      assert.equal(f.s.read().exposure.confirmedCrystalloidMl,0,'order has no effect');
      f.s.advance(.81);await f.s.flush();
      assert.equal(f.s.read().exposure.confirmedCrystalloidMl,ml);
     }
     f.s.advance(60);await f.s.flush();
     const now=f.s.read().patient;
     const delta=Number((now.liveVitals.spo2-start.spo2).toFixed(3));
     if(ml<=2000)assert(delta>-.5,caseId+' '+ml+' no invented lung injury');
     if(ml===4000){
      assert(delta< -3,'4L must cause visible clinical oxygen decline');
      assert(now.liveVitals.rr>start.rr+3);
      assert.equal(!!now.patientDied,false,'4L is not an instant fatal switch');
      assert.equal(confirmedRespiratoryAdverse(now,content.cases.find(c=>c.id===caseId)).adverseCount,1);
     }
     if(ml>=6000)assert(delta < -9,caseId+' '+ml+' should be more harmful than 4L');
     if(ml===10000){
      f.s.advance(600);await f.s.flush();
      assert.equal(f.s.read().patient.patientDied,true,'sustained critical exposure is fatal after grace');
      assert.equal(f.s.read().progress.xp,0);
     }
     records.push({caseId,mode,ml,spo2Delta:delta,rr:Number(now.liveVitals.rr.toFixed(2)),
      died:!!f.s.read().patient.patientDied});
    }finally{f.s.dispose();}
   }
 console.log('ATRIA_GRADED_FLUID_BOTS='+JSON.stringify(records));
});
test('non-treatment APP eventually deteriorates; stable CIRR not killed merely by time',async()=>{
 for(const caseId of ['APP-001','CIRR-001']){
  const f=bot(caseId);
  try{
   const initial=f.s.read().patient.liveVitals;
   f.s.advance(6000);await f.s.flush();
   const mid=f.s.read().patient.liveVitals;
   if(caseId==='APP-001'){
    assert(mid.sys<initial.sys-40&&mid.hr>initial.hr+35,'APP progression is disease-driven');
    f.s.advance(700);await f.s.flush();
    assert.equal(f.s.read().patient.patientDied,true,'untreated severe APP eventually reaches collapse');
   }else{
    assert.deepEqual(mid,initial,'CIRR stable baseline must not automatically decline');
    f.s.advance(700);await f.s.flush();
    assert.equal(!!f.s.read().patient.patientDied,false,'do not kill stable CIRR on timer');
   }
  }finally{f.s.dispose();}
 }
});
test('wrong and extreme IV prescriptions: reject invalid medication dose, document extreme real crystalloid harm',async()=>{
 const f=bot('CIRR-001');
 try{
  await f.post('Enfermera una vía');
  for(const bad of ['Enfermera furosemida 400 mg','Enfermera ceftriaxona 4 g',
    'Enfermera Ringer 40001 ml','Enfermera Ringer 300 ml']){
   const x=await f.post(bad);assert.equal(x.clinical[0]?.status,'rejected',bad);
  }
  assert.equal(f.s.read().patient.administrationLog.length,0);
  const extreme=await f.post('Enfermera Ringer 40 litros');
  assert.equal(extreme.clinical[0].status,'pending');
  f.s.advance(.81);await f.s.flush();
  assert.equal(f.s.read().exposure.confirmedCrystalloidMl,40000);
  f.s.advance(60);await f.s.flush();
  assert(f.s.read().patient.liveVitals.spo2<=73);
  f.s.advance(600);await f.s.flush();
  assert.equal(f.s.read().patient.patientDied,true);
  assert.equal(f.s.read().progress.xp,0);
 }finally{f.s.dispose();}
});
