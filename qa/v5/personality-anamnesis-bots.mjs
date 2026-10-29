// Extends the existing clinical bots: real speech routing, authority and native
// dialogue through public session commands. Never edits live clinical state.
import {createHash} from 'node:crypto';
import {clinicalCertificationContent,deriveClinicalCertificationPlan} from './certify-clinical-cases.mjs';
import {createGuardSession} from '../../src/v5/clinical/guard-session.js';
import {materializeGuardPatient} from '../../src/v5/content/guard-patient-variation.js';
import {buildBehaviorProfile,TRAIT_KEYS} from '../../src/v5/content/patient-behavior.js';
import {PATIENT_PERSONALITIES} from '../../src/v5/content/patient-variation.js';
import {respiratoryPack} from '../../src/v5/content/packs/respiratory-pack.js';
import {cardiologyPack} from '../../src/v5/content/packs/cardiology-pack.js';
import {neurologyPack} from '../../src/v5/content/packs/neurology-pack.js';

export const INTERVIEW_DOCTORS=Object.freeze(['expert','beginner','empathetic','brusque','hurried','meticulous']);
export const personalityContent=()=>clinicalCertificationContent([
 ...respiratoryPack.cases,...cardiologyPack.cases,...neurologyPack.cases]);
export const digest=x=>createHash('sha256').update(JSON.stringify(x)??'undefined').digest('hex');
export const behaviorSignature=b=>b?TRAIT_KEYS.map(k=>b[k]).join(','):'missing';
const unique=xs=>[...new Set(xs.filter(Boolean))];
const question=x=>'¿'+String(x).replace(/^[¿?\s]+|[¿?\s]+$/g,'')+'?';

export function anamnesisQuestions(c,content,doctor='expert'){
 if(!INTERVIEW_DOCTORS.includes(doctor))throw Error('unknown interview doctor');
 const authored=deriveClinicalCertificationPlan(c,content).history.map(x=>x.text);
 const questions=unique(['¿Qué le pasa?',...authored,
  ...c.intents.map(x=>question(x.keys[0])),
  '¿Qué antecedentes personales tiene?','¿Qué medicación toma?','¿Tiene alergias?']);
 // All middle questions come from this case's existing clinical bot plan/bank.
 const selected=questions.slice(0,12);
 for(const text of ['¿Qué edad tiene?','¿Cómo se siente ahora?','¿Qué otros síntomas tiene?'])
  if(selected.length<12&&!selected.includes(text))selected.push(text);
 while(selected.length<12)selected.push(questions[1]||questions[0]);
 if(doctor==='beginner'){
  const background=selected.slice(1).filter(q=>/antecedentes|alerg|medic/i.test(q));
  selected.splice(1,11,...background,...selected.slice(1).filter(q=>!background.includes(q)));
 }
 const repeated=selected[1]||selected[0];
 const repeatBody=repeated.replace(/^[¿?]+|[¿?]+$/g,'');
 selected.push(repeated,'Para confirmar: ¿'+repeatBody+'?',questions[0]);
 const intro={expert:'Le explico: estas preguntas ayudan a entender lo que siente. ',
  beginner:'',empathetic:'Le escucho con calma; tómese su tiempo. ',
  brusque:'Conteste rápido, no tengo tiempo. ',hurried:'Por favor, sea breve. ',
  meticulous:'Necesito precisar los detalles. '}[doctor];
 return selected.map((text,i)=>i===0||i===8?intro+text:text);
}

// Independent snapshot: conversation may acquire history/relationships, but
// must never measure, advance time, treat, award XP or close the case.
export function clinicalInvariant(s){
 const {patient:p,clock,progress}=s.read();
 return {clock,progress,liveVitals:p.liveVitals,phys:p.phys,policyState:p.policyState,
  neurology:p.neurology,treatments:p.treatments,orders:p.orders,
  administrationLog:p.administrationLog,pendingTreatments:p.pendingTreatments,
  reassessments:p.reassessments,lastVitalsKnown:p.lastVitalsKnown,
  exam:p.exam,caseEnded:p.caseEnded,closure:p.closure,patientDied:p.patientDied,
  allergies:p.allergies,severeAllergies:p.severeAllergies,allergyHistory:p.allergyHistory};
}

export function interviewFixture(c,content,{seed='profile-0',archetype='calm',mode='solo',roomId='npc-qa',checkpoint=null}={}){
 const uid=roomId+':patient';
 // Clinical identity/history draw is fixed for ALL compared personalities.
 const fixed=materializeGuardPatient({uid,caseId:c.id,variation:{seed:'npc-facts:'+c.id}},c);
 const patient={...fixed,personality:archetype,behavior:buildBehaviorProfile(seed,archetype)};
 const options={roomId,mode,actorId:'doctor',actorName:'Clinical bot',patient,content,
  resolveContext:()=>({patientUid:uid,focusedNpc:null}),
  ...(mode==='coop'?{members:[{id:'doctor',name:'Clinical bot'},{id:'colleague',name:'Colleague'}]}:{})};
 return {options,session:createGuardSession({...options,checkpoint})};
}

export async function runAnamnesis(c,content,{index=0,profileIndex=index,doctor=INTERVIEW_DOCTORS[index%6],mode='solo',recover=false}={}){
 const archetype=PATIENT_PERSONALITIES[profileIndex%PATIENT_PERSONALITIES.length],seed='npc-profile:'+profileIndex;
 const {options,session:initial}=interviewFixture(c,content,{seed,archetype,mode,roomId:'npc-'+c.id+'-'+index});
 let session=initial;
 const before=clinicalInvariant(session),initialBehavior=session.read().patient.behavior;
 const rows=[],failures=[],questions=anamnesisQuestions(c,content,doctor);
 try{
  for(const [i,text] of questions.entries()){
   if(recover&&i===8){
    const checkpoint=JSON.parse(JSON.stringify(await session.checkpoint()));session.dispose();
    session=createGuardSession({...options,checkpoint});
   }
   const reply=await session.post({id:'anamnesis-'+i,text});
   const executed=reply.clinical?.find(x=>x.kind==='history.ask');
   const receipt=executed?.receipt;
   if(!executed||executed.status!=='executed'||!receipt?.answer)failures.push('unanswered:'+i+':'+text);
   if(digest(clinicalInvariant(session))!==digest(before))failures.push('clinical-state-changed:'+i);
   if(digest(session.read().patient.behavior)!==digest(initialBehavior))failures.push('personality-changed:'+i);
   rows.push({question:text,answer:receipt?.answer??receipt?.message??'',status:executed?.status??'missing',
    evidence:receipt?.dialogue??null});
  }
  const p=session.read().patient;
  if(!initialBehavior)failures.push('behavior-lost-in-session');
  return {caseId:c.id,index,profileIndex,seed,archetype,doctor,mode,
   behavior:initialBehavior,signature:behaviorSignature(initialBehavior),
   physiologicalSpeech:p.neurology??null,relationship:p.interview?.relationships?.doctor??null,
   clinicalInvariant:digest(before),history:p.intentHistory,rows,failures:unique(failures)};
 }finally{session.dispose();}
}
