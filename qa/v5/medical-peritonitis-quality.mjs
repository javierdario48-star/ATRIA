// QA only: original V19 numeric grading + final peritonitis correction and
// actual native finalizer/career. No generated code enters the V5 runtime.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {createHash} from 'node:crypto';
import {apply487} from '../../src/integration/apply-487.js';
import {createRealOutcomeJourney487} from '../native-xp-outcome-fixture-487.mjs';
import {advanceNativeReference487} from '../physiology-pilot/native-reference-487.mjs';
import {createGuardSession} from '../../src/v5/clinical/guard-session.js';
export async function compareMedicalPeritonitisQuality({caseId,diagnosis,destination,questions,studies,orders,consult=false,pendingStudies=[],reportName}){
 const generated=apply487(fs.readFileSync('vendor/atria-4.8.6/index.html','utf8'));
 const between=(s,a,b)=>{const i=s.indexOf(a),j=s.indexOf(b,i+a.length);assert(i>=0&&j>i);return s.slice(i,j);};
 const base=between(generated,'  const ESSENTIAL=','  function csEnsureCompetencies(');
 const peri=generated.match(/<script id="atria-peritonitis-487-disposition">([\s\S]*?)<\/script>/)[1];
 const correction=between(peri,' const oldBreakdown=csBreakdown;',' // The late native ns422');
 const read=n=>JSON.parse(fs.readFileSync('src/v5/content/'+n+'.json'));
 const content={cases:read('cases'),therapies:read('therapies'),defaultDoses:read('default-doses')},results=[];
 for(const spec of [
  {id:'minimum',history:Object.keys(questions).slice(0,1),studies:studies.slice(0,1),reassess:false},
  {id:'complete',history:Object.keys(questions),studies,reassess:true},
  {id:'excess-studies',history:Object.keys(questions),studies:[...studies,caseId==='PERI-PBE-001'?'pbe_cbc':'renal'],reassess:true},
  {id:'alternative-coverage',history:Object.keys(questions),studies,reassess:true,alternative:true}
 ]){
  const native=createRealOutcomeJourney487(caseId),{ctx}=native,p=ctx.sim,c=content.cases.find(x=>x.id===caseId);
  ctx.csCriticalCase=()=>Number(c.vitals.bp.split('/')[0])<90;
  vm.runInContext('(function(){'+base+'\nconst current=()=>window.csPeritonitisAssessment487();\n'+correction+'\n})();',ctx);
  let id=0;const s=createGuardSession({roomId:'quality-'+caseId,mode:'solo',actorId:'doctor',actorName:'Doctor',patient:{uid:'P',caseId},content,resolveContext:()=>({patientUid:'P'})});
  const send=text=>s.post({id:String(++id),text});
  try{
   p.diagnosis=diagnosis;p.lastVitalsKnown=true;p.examDone=true;p.intentHistory=spec.history.map(id=>({id}));p.reassessments=Number(spec.reassess);
   for(const id of spec.studies)p.orders.set(id,{id,status:'done'});
   for(const id of pendingStudies)p.orders.set(id,{id,status:'pending'});
   await send('/diagnostico '+diagnosis);await send('/signos');
   for(const technique of ['general','inspection','auscultation','percussion','palpation'])await send('/examen '+technique);
   for(const key of spec.history)await send(questions[key]);
   for(const key of spec.studies){const reply=await send('/estudio '+key);assert.equal(reply.clinical[0].status,'pending',key);}
   for(const key of pendingStudies)assert.equal((await send('/estudio '+key)).clinical[0].status,'pending');
   if(consult){p.consults??=new Map();p.consults.set('cirugia',{status:'done',accepted:true});await send('Enfermera cirugía');}
   await send('Enfermera una vía');
   for(const text of orders(spec)){assert(ctx.addMonitorTherapy(text));await send('Enfermera '+text);}
   advanceNativeReference487(native,.42);
   s.advance(Math.max(3.51,...s.read().patient.orders.filter(o=>spec.studies.includes(o.id)).map(o=>o.readyAtMinute)));await s.flush();
   for(const key of pendingStudies)assert.equal(s.read().patient.orders.find(o=>o.id===key).status,'pending','late cultures never gate urgent transfer');
   if(spec.reassess)await send('/reevaluar');
   for(const key of spec.history)assert(s.read().patient.intentHistory.some(x=>x.id===key),spec.id+' acquired '+key);
   assert(ctx.window.csPeritonitisAssessment487().ready,spec.id+' native readiness');
   assert.deepEqual(s.read().eligibleDestinations,[destination]);
   assert.equal(ctx.window.csSetDisposition(destination),true);ctx.finishCase('completed');
   assert(p.caseEnded&&p._careerEndProcessed&&p.nsOutcome.career.resolved);
   const transfer=await send('/disposicion '+destination);
   if(transfer.clinical[0].status==='pending'){
    assert.equal(s.read().patient.caseEnded,false,'receiver evaluation is not a completed transfer');
    s.advance(3.5);await s.flush();
   }else assert.equal(transfer.clinical[0].status,'executed');
   assert.equal(s.read().patient.caseEnded,true,'only an accepted receiver can finish the requested transfer');
   const migrated=s.read().patient.closure,original=ctx.csBreakdown();
   for(const field of ['score','diagnosis','history','safety','studies','treatment','efficiency'])assert.equal(migrated.quality[field],original[field],spec.id+'/'+field);
   assert.equal(migrated.xp,p.nsOutcome.career.xpDelta,spec.id+' actual native XP');
   assert(!s.read().patient.treatments.some(x=>x.id==='source_control'));
   const xp=s.read().progress.xp;await send('/disposicion '+destination);assert.equal(s.read().progress.xp,xp);
   results.push({...spec,quality:migrated.quality,xp,nativeXp:p.nsOutcome.career.xpDelta,nativeQuality:JSON.parse(JSON.stringify(original)),oneAward:true,noOperation:true});
  }finally{s.dispose();}
 }
 assert(results[1].quality.score>results[0].quality.score);assert(results[2].quality.score<results[1].quality.score);
 const out=process.env.V5_PERITONITIS_EVIDENCE||'qa/v5-browser-results';fs.mkdirSync(out,{recursive:true});
 fs.writeFileSync(out+'/'+reportName+'.json',JSON.stringify({caseId,allMatched:true,sourceHashes:{base:createHash('sha256').update(base).digest('hex'),correction:createHash('sha256').update(correction).digest('hex')},
  scope:'Original numeric grading and career unchanged; native prerequisite records supplied; V5 uses actual interview, examination, study deadlines, administrations and consultation. No operation.',results},null,2)+'\n');
 console.log(reportName+' PASS',JSON.stringify(results.map(x=>({id:x.id,score:x.quality.score,xp:x.xp}))));
}
