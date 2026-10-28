import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createGuardSession} from './guard-session.js';
import {createClinicalContent} from '../content/clinical-content.js';
import {cardiologyPack} from '../content/packs/cardiology-pack.js';
import {clinicalPolicyTargets} from './clinical-policy-effects.js';
const read=name=>JSON.parse(readFileSync(new URL('../content/'+name+'.json',import.meta.url)));
function fixture(){
 const c=cardiologyPack.cases.find(x=>x.id==='CARD-03'),jobs=[];let arrivals=[];
 const content=createClinicalContent({cases:read('cases'),therapies:read('therapies'),defaultDoses:read('default-doses')},{additionalCases:[c]});
 const s=createGuardSession({roomId:'native-stop',mode:'solo',actorId:'doctor',actorName:'Doctor',
  patient:{uid:'P',caseId:c.id},content,resolveContext:()=>({patientUid:'P'}),nursing:{
   enqueue:job=>{jobs.push(job);return {status:'travelling'};},
   takeArrivals:()=>{const rows=arrivals;arrivals=[];return rows;},accept:()=>({status:'confirmed'})}});
 async function arrive(){arrivals=jobs.filter(j=>!j.arrived);for(const j of arrivals)j.arrived=true;s.finishNurseArrivals();s.advance(3);await s.flush();}
 return {s,jobs,arrive};
}
test('stopping a native continuous medicine requires the same physical nursing confirmation as starting it',async()=>{
 const f=fixture();try{
  await f.s.post({id:'history',text:'¿Qué medicamentos toma?'});
  await f.s.post({id:'access',text:'Enfermera una vía'});await f.arrive();
  await f.s.post({id:'start',text:'/tratamiento nitroglycerin 10 mcg/min IV'});await f.arrive();
  assert.equal(f.s.read().patient.procedures.nitroglycerin.active,true);
  const trips=f.jobs.length;
  const stop=await f.s.post({id:'stop',text:'Enfermera suspender nitroglicerina'});
  assert.equal(stop.clinical[0].status,'pending');assert.equal(f.jobs.length,trips+1);
  f.s.advance(3);assert.equal(f.s.read().patient.procedures.nitroglycerin.active,true);
  await f.arrive();assert.equal(f.s.read().patient.procedures.nitroglycerin.active,false);
  const stopped=f.s.read().patient,c=cardiologyPack.cases.find(x=>x.id===stopped.caseId),
   untreated={...stopped,treatments:[],administrationLog:[],procedures:{}};
  assert.deepEqual(clinicalPolicyTargets(stopped,c,60),clinicalPolicyTargets(untreated,c,60),
   'a historical infusion must not retain an indefinite physiological benefit after the confirmed stop');
 }finally{f.s.dispose();}
});
test('a compound native infusion stop uses the current native formulary',async()=>{
 const f=fixture();try{
  await f.s.post({id:'history',text:'¿Qué medicamentos toma?'});
  await f.s.post({id:'access',text:'Enfermera una vía'});await f.arrive();
  await f.s.post({id:'start',text:'/tratamiento nitroglycerin 10 mcg/min IV'});await f.arrive();
  const result=await f.s.post({id:'compound',text:'Enfermera suspender nitroglicerina y monitor'});
  assert.notEqual(result.routeError,'unsafe-compound-order');
  assert(result.clinical.some(x=>x.id==='nitroglycerin'&&x.kind==='therapy.stop'&&x.status==='pending'));
 }finally{f.s.dispose();}
});
