import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {appDiseaseTargetOffsets} from './app-disease-progression.js';
import {createGuardSession} from './guard-session.js';
const load=n=>JSON.parse(readFileSync(new URL('../content/'+n+'.json',import.meta.url)));
const content={cases:load('cases'),therapies:load('therapies'),defaultDoses:load('default-doses')};
const app=content.cases.find(x=>x.id==='APP-001');
const initial=()=>({uid:'P',treatments:[],administrationLog:[]});
const administer=(p,id,t,uid=p.uid)=>{
 const row={id,sourceEventId:'dose-'+id+'-'+t,patientUid:uid,administeredAtNativeMinute:t};
 p.administrationLog.push(row);p.treatments.push({...row});
};
test('APP case-scoped long-horizon disease evolution starts after unchanged original V4 early baseline',()=>{
 const p=initial();
 assert.deepEqual(appDiseaseTargetOffsets(p,app,0),{temp:0,hr:0,rr:0,sys:0,dia:0,spo2:0});
 assert.equal(appDiseaseTargetOffsets(p,app,20).hr,0);
 const first=appDiseaseTargetOffsets(p,app,173);
 assert(first.hr>10);assert(first.sys<-10);assert(first.temp>0);
 const end=appDiseaseTargetOffsets(p,app,720);
 assert(end.sys<first.sys);assert(end.spo2<first.spo2);
 assert.throws(()=>appDiseaseTargetOffsets(p,app,-1),/invalid APP disease time/);
 assert.throws(()=>appDiseaseTargetOffsets(p,{id:'CIRR-001'},100),/APP-001/);
});
test('only completed native dual antibiotic coverage slows progression prospectively',()=>{
 const untreated=appDiseaseTargetOffsets(initial(),app,173);
 const covered=initial();administer(covered,'ceftriaxone',10);administer(covered,'metronidazole',12);
 const after=appDiseaseTargetOffsets(covered,app,173);
 assert(after.hr<untreated.hr);assert(after.sys>untreated.sys);
 const half=initial();administer(half,'ceftriaxone',10);
 assert.deepEqual(appDiseaseTargetOffsets(half,app,173),untreated);
 const forged=initial();forged.administrationLog.push({id:'ceftriaxone',patientUid:'P',sourceEventId:'fake',administeredAtNativeMinute:10});
 administer(forged,'metronidazole',12);
 assert.deepEqual(appDiseaseTargetOffsets(forged,app,173),untreated);
 const wrongPatient=initial();administer(wrongPatient,'ceftriaxone',10,'other');administer(wrongPatient,'metronidazole',12);
 assert.deepEqual(appDiseaseTargetOffsets(wrongPatient,app,173),untreated);
 const late=initial();administer(late,'ceftriaxone',100);administer(late,'metronidazole',100);
 assert.deepEqual(appDiseaseTargetOffsets(late,app,100),appDiseaseTargetOffsets(initial(),app,100),
  'late antibiotic treatment never rewinds injury');
});
test('actual native APP: untreated disease worsens but stable CIRR does not drift by accident',async()=>{
 const rows=[];
 for(const caseId of ['APP-001','CIRR-001']){
  const s=createGuardSession({roomId:caseId,mode:'solo',actorId:'doc',actorName:'Doctor',
   patient:{uid:'P',caseId},content,resolveContext:()=>({patientUid:'P'})});
  try{
   const before=s.read().patient.liveVitals;
   s.advance(1440);await s.flush();
   const p=s.read().patient;
   rows.push({caseId,before,after:p.liveVitals,died:!!p.patientDied});
  }finally{s.dispose();}
 }
 assert(rows[0].after.hr>rows[0].before.hr+8);
 assert(rows[0].after.sys<rows[0].before.sys-8);
 assert.equal(rows[0].died,false,'early uncomplicated APP progression is not instant terminal sepsis');
 assert.deepEqual(rows[1].after,rows[1].before,'stable CIRR has no invented time decay');
});
