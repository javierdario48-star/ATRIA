import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {createSqliteGuardStore} from '../../../qa/v5/sqlite-guard-store.mjs';
import {createDurableGuardAuthority} from './durable-guard-authority.js';
import {createWorld} from '../app/world.js';
import {CLINICAL_EXECUTORS} from '../content/clinical-cases.js';
const load=x=>JSON.parse(fs.readFileSync(new URL('../content/'+x+'.json',import.meta.url)));
const content={map:load('hospital'),beds:load('beds'),cases:load('cases'),therapies:load('therapies'),defaultDoses:load('default-doses')};
const cases=Object.keys(CLINICAL_EXECUTORS),report=[];
for(const caseId of cases)for(const doctors of [2,3,4]){
 test('competitive chaotic bot '+caseId+' '+doctors+' doctors: reception race, stale orders, restart and no XP theft',async()=>{
  const dir=fs.mkdtempSync(path.join(os.tmpdir(),'atria-bot-')),store=createSqliteGuardStore(path.join(dir,'guard.sqlite'));
  const roomId='race-'+caseId+'-'+doctors,members=Array.from({length:doctors},(_,i)=>({id:String.fromCharCode(97+i),name:'Bot'+i}));
  let now=1700000000000,server=()=>createDurableGuardAuthority({store,content,now:()=>now,maxSteps:11400}),auth=server();
  const call=(actorId,extra={})=>auth.transact({roomId,actorId,...extra});
  try{
   const opened=await auth.bootstrap({roomId,caseId,members,hostId:'a',actorId:'a',mode:'competitive'});
   const [p,q]=opened.clinical.shift.patients;
   assert(p&&q&&p.uid!==q.uid&&p.bedId!==q.bedId);
   for(const m of members){
    const before=await call(m.id,{claim:p.uid});
    assert(before.clinical.shift.patients.every(x=>!x.ownerId),'remote patient claim succeeded');
   }
   const nav=createWorld(content,{id:'a',name:'Bot'}).navigation;
   const bed=id=>nav.center(...content.beds.find(b=>b.id===id).approach);
   const a=bed(q.bedId),b=bed(p.bedId);
   await call('a',{motion:[a.x,a.y],motionSequence:1});
   await call('b',{motion:[b.x,b.y],motionSequence:1});
   now+=20000;await call('a');
   const first=await call('b',{claim:p.uid});
   assert.equal(first.clinical.shift.patients[0].ownerId,'b');
   const next=await call('a',{claim:q.uid});
   assert.equal(next.clinical.shift.patients[1].ownerId,'a');
   await call('a',{claim:p.uid});
   for(const m of members.slice(2))await call(m.id,{claim:p.uid});
   const wrong=await call('a',{commands:[{id:'cross-order',text:'Enfermera ceftriaxona 1 g',targetPatientUid:p.uid}]});
   assert.equal(wrong.acknowledgements[0].reason,'patient-selection-changed');
   const legitimate=await call('b',{commands:[{id:'bedside-signs',text:'/signos'}]});
   assert.equal(legitimate.clinical.patient.uid,p.uid);
   assert.equal(legitimate.clinical.shift.patients[0].ownerId,'b');
   assert.equal(legitimate.clinical.shift.patients[1].ownerId,'a');
   assert.equal(legitimate.claims.length,0,'nonterminal orders granted XP');
   auth=server();
   const resumed=await call('a');
   assert.equal(resumed.clinical.shift.patients[0].ownerId,'b');
   assert.equal(resumed.clinical.shift.patients[1].ownerId,'a');
   assert.equal(resumed.claims.length,0);
   report.push({caseId,doctors,owners:['b','a'],recovered:true});
  }finally{store.close();fs.rmSync(dir,{recursive:true,force:true});}
 });
}
test('21 competitive bot runs cover all seven cases and the 2/3/4-physician capacities',()=>{
 assert.equal(cases.length,7);
 console.log('ATRIA_COMPETITIVE_CHAOS_BOTS='+JSON.stringify(report));
});
