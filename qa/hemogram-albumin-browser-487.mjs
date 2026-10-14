// Real browser QA: a hemogram request must never create an albumin dose.
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {clinicalBrowserHarness487} from './clinical-browser-harness-487.mjs';
const count=Number(process.env.CLINICAL_PLAYERS)||2;
const dir=process.env.CLINICAL_OUTPUT||'/tmp/atria-study-dose-safety-'+count;
await fs.mkdir(dir,{recursive:true});
const h=await clinicalBrowserHarness487(count),checks=[];
const check=async(name,fn)=>{try{const detail=await fn();checks.push({name,pass:true,detail});
 console.log('STUDY_DOSE_SAFETY_PASS',name,JSON.stringify({players:count,detail}));}
 catch(error){checks.push({name,pass:false,error:String(error.stack||error)});
 console.error('STUDY_DOSE_SAFETY_FAIL',name,error.stack||error)}};
try{
 await h.startGuard('coop','APP-001');
 await h.select(0);
 const initial=await h.clients[0].page.evaluate(()=>{
  const study=C.studies.find(s=>/hemograma/i.test(s.label));
  if(!study)throw Error('APP-001 has no real native hemogram');
  return {studyId:study.id,uid:sim.patientInstance.uid,
   admin:sim.administrationLog.length,orders:[...sim.orders.keys()]};
 });
 await check('hemogram-is-study-not-medication',async()=>{
  assert.equal(initial.admin,0,'start in a fresh patient with no medication');
  await h.send(0,'Enfermera hemograma',{tap:true});
  await h.clients[0].page.waitForFunction(id=>sim.orders.has(id),initial.studyId,{timeout:14000});
  await new Promise(r=>setTimeout(r,2700));
  const after=await h.clients[0].page.evaluate(()=>({
   caseId:C.id,uid:sim.patientInstance.uid,
   labs:[...sim.orders].map(([id,o])=>({id,status:o.status})),
   drugs:sim.administrationLog.map(x=>({id:x.id,dose:x.doseDisplay})),
   pending:sim.csPhase4Pending487?.map(x=>({id:x.id,text:x.text}))||[],
   nurseReceipts:(sim.csNurse487History||[]).flatMap(h=>h.items||[]).map(i=>({id:i.id,kind:i.kind,status:i.status})),
   nurseMessages:sim.chats.nurse.slice(-10)}));
  assert.equal(after.uid,initial.uid);
  assert(after.labs.some(x=>x.id===initial.studyId),'actual hemogram requested');
  assert.deepEqual(after.drugs,[],'study-only message must not administer any medication');
  assert.deepEqual(after.pending,[],'study-only message must not enqueue a drug');
  assert(!after.nurseReceipts.some(x=>x.kind==='therapy'),'study-only message never creates a treatment receipt');
  return after;
 });
 await check('guest-repeat-never-converts-laboratory-to-albumin',async()=>{
  await h.send(1,'Enfermera, hemograma',{tap:true});
  await new Promise(r=>setTimeout(r,2500));
  const state=await h.clients[0].page.evaluate(()=>({
   uid:sim.patientInstance.uid,labs:[...sim.orders.keys()],
   drugs:sim.administrationLog.map(x=>x.id),pending:sim.csPhase4Pending487?.map(x=>x.id)||[]
  }));
  assert(state.labs.includes(initial.studyId));
  assert.deepEqual(state.drugs,[]);
  assert.deepEqual(state.pending,[]);
  return state;
 });
 assert.deepEqual(h.errors,[],'no browser runtime exceptions');
}finally{
 await fs.writeFile(dir+'/report.json',JSON.stringify({checks,errors:h.errors,snapshots:await h.snapshot()},null,2));
 for(let i=0;i<count;i++)await h.clients[i].page.screenshot({path:dir+'/client-'+i+'.png'});
 await h.close();
}
assert(checks.every(x=>x.pass),JSON.stringify(checks.filter(x=>!x.pass)));
console.log('STUDY_DOSE_SAFETY_SUMMARY',JSON.stringify({players:count,checks:checks.length,
 independentChromium:true,emulatedAndroid:true,physicalAndroid:false}));
