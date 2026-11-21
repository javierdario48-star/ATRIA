import test from 'node:test';
import assert from 'node:assert/strict';
import {clinicalContent} from '../../server/content.js';
import {createGuardSession} from '../../clinical/guard-session.js';
import {resp01V2Candidate as candidate} from './respiratory-v2-candidate.js';

const content={...clinicalContent,cases:clinicalContent.cases.map(c=>c.id===candidate.id?candidate:c)};
const expected=new Set(['calm','uncooperative','reserved','irritable','talkative','scared','anxious']);
const facts=['Hola, ¿qué le pasó?','¿Desde cuándo?','¿Tiene alergias?',
 '¿Qué antecedentes personales tiene?','¿Tomó medicación recientemente?','¿Con quién vive?'];
test('all seven personalities of the same V2 patient use one history owner without fabricating care',async()=>{
 const seen=new Map;
 for(let i=0;i<100&&seen.size<expected.size;i++){
  const roomId='v2-personality-audit-'+i,uid=roomId+':patient';
  const s=createGuardSession({roomId,mode:'solo',actorId:'doctor',actorName:'Auditor',
   patient:{uid,caseId:candidate.id},content,resolveContext:()=>({patientUid:uid})});
  const p=s.read().patient,kind=p.personality;
  if(expected.has(kind)&&!seen.has(kind)){
   seen.set(kind,i);
   try{
    const first=structuredClone(s.read().patient.liveVitals),answers=[];
    for(const [j,question] of facts.entries()){
     const r=await s.post({id:'personality-'+i+'-'+j,text:question});
     assert.equal(r.clinical[0]?.status,'executed',kind+': '+question);
     const text=r.clinical[0]?.receipt?.answer||'';
     assert(text.length>0,kind+': missing patient answer '+question);
     assert(!/^(?:Paciente dice:)\s*$/i.test(text));
     answers.push(text);
    }
    assert(answers.some(x=>/tres dias|tres días/i.test(x)),kind+': onset changed');
    assert(answers.some(x=>/paracetamol/i.test(x)),kind+': recent medication absent');
    assert(s.read().patient.intentHistory.some(x=>x.id==='onset'),kind+': answer not preserved in history');
    assert.deepEqual(s.read().patient.liveVitals,first,'patient conversation must not write physiology');
    assert.equal(s.read().patient.treatments?.length,0);
    assert.equal(s.read().patient.orders?.length,0);
   }finally{s.dispose();}
  }else s.dispose();
 }
 assert.deepEqual([...seen.keys()].sort(),[...expected].sort(),
  'not every seeded bedside personality was represented: '+JSON.stringify([...seen]));
});
