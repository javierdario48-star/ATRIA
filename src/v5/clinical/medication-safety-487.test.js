import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {normalizeDocumentedAllergies487,medicationSafety487} from './medication-safety-487.js';
import {createGuardSession} from './guard-session.js';
const read=n=>JSON.parse(readFileSync(new URL('../content/'+n+'.json',import.meta.url)));
const content={cases:read('cases'),therapies:read('therapies'),defaultDoses:read('default-doses')};
const c=id=>content.cases.find(x=>x.id===id);
test('all 390 V4 case/drug safety combinations classified independently',()=>{
 let n=0;for(const x of content.cases)for(const d of content.therapies){
  const verdict=medicationSafety487(x,{},d.id);
  assert.equal(verdict.blocked,false);
  assert(Array.isArray(verdict.cautions));n++;
 }assert.equal(n,390);
 assert(medicationSafety487(c('CIRR-001'),{},'ceftriaxone').cautions.includes('no-established-infection'));
 assert.equal(medicationSafety487(c('APP-001'),{},'ceftriaxone').cautions.includes('no-established-infection'),false);
});
test('actual V4 renal hazard profiles distinguish nephrotoxicity from routine antibiotics',()=>{
 const p={phys:{renalReserve:.4}};
 for(const id of ['amikacin','gentamicin','amphotericin']){
  const v=medicationSafety487(c('PERI-PBE-001'),p,id);
  assert(v.classifiedAsNephrotoxic&&v.cautions.includes('nephrotoxicity-risk'));
  assert.equal(v.blocked,false);
 }
 for(const id of ['ceftriaxone','metronidazole','imipenem'])
  assert.equal(medicationSafety487(c('PERI-PBE-001'),p,id).classifiedAsNephrotoxic,false);
 assert(medicationSafety487(c('PERI-SEC-001'),p,'furosemide').cautions.includes('case-avoid'));
});
test('exact patient allergies and explicit class allergies; no invented cross reactivity',()=>{
 assert(medicationSafety487(c('APP-001'),{allergies:['penicillin']},'ampicillin').contraindicated);
 assert(medicationSafety487(c('APP-001'),{allergies:['penicillin']},'piptazo').contraindicated);
 assert.equal(medicationSafety487(c('APP-001'),{allergies:['penicillin']},'ceftriaxone').blocked,false);
 assert.deepEqual(normalizeDocumentedAllergies487(['ceftriaxone','ceftriaxone']),['ceftriaxone']);
 assert.throws(()=>normalizeDocumentedAllergies487(['bogus']),/unknown documented/);
});
test('documented ceftriaxone allergy permits a valid dose and preserves alternatives',async()=>{
 const uid='P1',s=createGuardSession({roomId:'safety1',mode:'solo',actorId:'doc',actorName:'Doc',
  patient:{uid,caseId:'APP-001',allergies:['ceftriaxone']},content,resolveContext:()=>({patientUid:uid})});
 let i=0;const post=text=>s.post({id:'s'+(++i),text});
 try{
  await post('Enfermera una vía');
  const bad=await post('Enfermera ceftriaxona 1 g');
  assert.equal(bad.clinical[0].status,'pending');
  s.advance(10);await s.flush();
  assert(s.read().patient.administrationLog.some(x=>x.id==='ceftriaxone'));
  const ok=await post('Enfermera metronidazol 500 mg');
  assert.equal(ok.clinical[0].status,'pending');
  s.advance(1.6);await s.flush();
  assert(s.read().patient.administrationLog.some(x=>x.id==='metronidazole'));
 }finally{s.dispose();}
});
test('allergen in a technically valid compound order is administered with the other drug',async()=>{
 const uid='P2',s=createGuardSession({roomId:'safety2',mode:'solo',actorId:'doc',actorName:'Doc',
  patient:{uid,caseId:'APP-001',allergies:['ceftriaxone']},content,resolveContext:()=>({patientUid:uid})});
 try{
  await s.post({id:'iv',text:'Enfermera una vía'});
  const answer=await s.post({id:'pair',text:'Enfermera ceftriaxona 1 g y metronidazol 500 mg'});
  assert.equal(answer.routeError,null);
  s.advance(10);await s.flush();
  assert.deepEqual(s.read().patient.administrationLog.map(x=>x.id),['ceftriaxone','metronidazole']);
 }finally{s.dispose();}
});
