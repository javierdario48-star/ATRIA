import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createGuardSession} from './guard-session.js';
import {CLINICAL_EXECUTORS} from '../content/clinical-cases.js';
import {CASE_CLOSURE_RULES_487} from '../../clinical/case-completion-487.js';
const load=n=>JSON.parse(fs.readFileSync(new URL('../content/'+n+'.json',import.meta.url)));
const content={cases:load('cases'),therapies:load('therapies'),defaultDoses:load('default-doses')};
const destinations={
 'PANC-001':['uti'],'CROHN-001':['sala','observacion'],
 'HDA-001':['procedimiento','uti'],'COLON-001':['alta','sala'],
 'ILEO-001':['sala','quirofano','uti'],'MESI-001':['quirofano']
};
for(const [caseId,authorized] of Object.entries(destinations)){
 for(const mode of ['solo','apprentice','coop']){
  test(caseId+' '+mode+' enforces patient-local closure and never invents an intervention',async()=>{
   const uid=caseId+':QA-'+mode;
   const s=createGuardSession({roomId:uid,mode,actorId:'doctor',actorName:'Test',patient:{uid,caseId},
    members:mode==='coop'?[{id:'doctor',name:'Test'},{id:'other',name:'Other'}]:[{id:'doctor',name:'Test'}],
    content,resolveContext:()=>({patientUid:uid})});
   try{
    assert.equal(s.read().patient.caseId,caseId);
    assert.equal(s.read().patient.caseEnded,false);
    assert.equal(s.read().patient.treatments.length,0);
    assert.equal(s.read().progress.xp,0);
    assert.deepEqual(CASE_CLOSURE_RULES_487[caseId].destinations,authorized);
    assert(!s.read().eligibleDestinations.length);
    const bad=(await s.post({id:'bad-dest',text:'/disposicion '+(authorized.includes('alta')?'quirofano':'alta')})).clinical;
    assert.equal(bad[0]?.status,'rejected','invalid transfer cannot close');
    const premature=(await s.post({id:'early',text:'/disposicion '+authorized[0]})).clinical;
    assert(['pending','rejected'].includes(premature[0]?.status), 'destination cannot directly grant closure');
    assert.equal(s.read().patient.caseEnded,false);
    assert.equal(s.read().patient.closure,null);
    assert.equal(s.read().progress.xp,0);
    assert.equal(s.read().progress.receipts.length,0);
    assert.deepEqual(s.read().patient.administrationLog,[]);
   }finally{s.dispose();}
  });
 }
}
test('the original seven cases keep their native executors and all six new cases have explicit policies',()=>{
 const ids=Object.keys(CLINICAL_EXECUTORS);
 assert.equal(ids.length,25);
 assert.equal(Object.keys(destinations).length,6);
 for(const id of Object.keys(destinations))
  assert(Object.hasOwn(CLINICAL_EXECUTORS,id),'no catalogue-only clinically playable case');
 for(const id of ['APP-001','CIRR-001','CHOLANG-001','CHOLE-001',
  'PERI-PBE-001','PERI-SEC-001','PERI-TER-001'])
  assert(Object.hasOwn(CLINICAL_EXECUTORS,id));
});
