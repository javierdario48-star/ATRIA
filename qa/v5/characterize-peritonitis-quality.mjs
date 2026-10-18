// QA only. Execute the genuine V19 numeric breakdown, the later peritonitis
// correction and actual native finishCase/career. The old outcome fixture's
// empty breakdown alone cannot certify graded quality; install the real source.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {createHash} from 'node:crypto';
import {apply487} from '../../src/integration/apply-487.js';
import {createRealOutcomeJourney487} from '../native-xp-outcome-fixture-487.mjs';
import {advanceNativeReference487} from '../physiology-pilot/native-reference-487.mjs';
import {createGuardSession} from '../../src/v5/clinical/guard-session.js';
const generated=apply487(fs.readFileSync('vendor/atria-4.8.6/index.html','utf8'));
const between=(source,a,b)=>{const start=source.indexOf(a),end=source.indexOf(b,start+a.length);assert(start>=0&&end>start);return source.slice(start,end);};
const base=between(generated,'  const ESSENTIAL=','  function csEnsureCompetencies(');
const peri=generated.match(/<script id="atria-peritonitis-487-disposition">([\s\S]*?)<\/script>/)[1];
const correction=between(peri,' const oldBreakdown=csBreakdown;',' // The late native ns422');
const read=name=>JSON.parse(fs.readFileSync('src/v5/content/'+name+'.json'));
const content={cases:read('cases'),therapies:read('therapies'),defaultDoses:read('default-doses')},results=[];
for(const spec of [
 {id:'emergency-minimum',history:[],studies:[],reassess:false},
 {id:'minimum-reassessed',history:['migration'],studies:[],reassess:true},
 {id:'full-care',history:['onset','migration','movement','ileus'],studies:['peri_cbc','peri_ct','peri_gas'],reassess:true},
 {id:'overtesting',history:['onset','migration','movement','ileus'],studies:['peri_cbc','peri_ct','peri_gas','renal'],reassess:true},
 {id:'original-alternative-quality',history:['onset','migration','movement','ileus'],studies:['peri_cbc','peri_ct','peri_gas'],reassess:true,alternative:true}
]){
 const legacy=createRealOutcomeJourney487('PERI-SEC-001'),{ctx}=legacy,p=ctx.sim;
 // The native helpers are already present except the original numeric block,
 // deliberately excluded by the old reduced fixture. Critical is true for
 // this actual shock seed; it affects metadata, never the six numeric weights.
 ctx.csCriticalCase=()=>true;
 vm.runInContext('(function(){'+base+'\nconst current=()=>window.csPeritonitisAssessment487();\n'+correction+'\n})();',ctx);
 let sequence=0;const s=createGuardSession({roomId:'peri-quality',mode:'solo',actorId:'doctor',actorName:'Doctor',
  patient:{uid:'P',caseId:'PERI-SEC-001'},content,resolveContext:()=>({patientUid:'P'})});
 const send=text=>s.post({id:String(++sequence),text});const c=content.cases.find(x=>x.id==='PERI-SEC-001');
 try{
  p.diagnosis='peritonitis secundaria';p.lastVitalsKnown=true;p.examDone=true;
  p.intentHistory=spec.history.map(id=>({id}));p.reassessments=Number(spec.reassess);
  for(const id of spec.studies)p.orders.set(id,{id,status:'done'});
  p.consults??=new Map();p.consults.set('cirugia',{status:'done',accepted:true});
  await send('/diagnostico peritonitis secundaria');await send('/signos');
  for(const technique of ['general','inspection','auscultation','percussion','palpation'])await send('/examen '+technique);
  const questions={onset:'¿Desde cuándo empezó?',migration:'¿Dónde empezó el dolor?',movement:'¿Duele al moverte?',ileus:'¿Elimina gases?'};
  for(const id of spec.history)await send(questions[id]);
  for(const id of spec.studies){const reply=await send('/estudio '+id);assert.equal(reply.clinical[0].status,'pending',id+' real study request');}
  await send('Enfermera cirugía');await send('Enfermera una vía');
  const orders=['Ringer 500 ml',...(spec.alternative?['piperacilina tazobactam 4.5 g']:['ceftriaxona 1 g','metronidazol 500 mg'])];
  for(const text of orders){assert(ctx.addMonitorTherapy(text));await send('Enfermera '+text);}
  advanceNativeReference487(legacy,.42);
  const until=Math.max(3.51,...s.read().patient.orders.map(order=>order.readyAtMinute));
  s.advance(until);await s.flush();
  assert.equal(s.read().patient.orders.filter(order=>order.status==='done').length,spec.studies.length);
  if(spec.reassess)await send('/reevaluar');
  // Verify that the actual V5 interview acquired precisely these case facts.
  for(const id of spec.history)assert(s.read().patient.intentHistory.some(x=>x.id===id),spec.id+' acquired '+id);
  const originalEligibility=ctx.window.csPeritonitisAssessment487();assert(originalEligibility.ready,spec.id);
  assert.deepEqual(s.read().eligibleDestinations,['quirofano']);
  assert.equal(ctx.window.csSetDisposition('quirofano'),true);ctx.finishCase('completed');
  assert(p.caseEnded&&p._careerEndProcessed&&p.nsOutcome.career.resolved);
  const actual=await send('/disposicion quirofano');assert.equal(actual.clinical[0].status,'executed');
  const migrated=s.read().patient.closure,original=ctx.csBreakdown();
  for(const field of ['score','diagnosis','history','safety','studies','treatment','efficiency'])
   assert.equal(migrated.quality[field],original[field],spec.id+'/'+field);
  assert.equal(migrated.xp,p.nsOutcome.career.xpDelta,spec.id+' actual native career award');
  assert.equal(s.read().patient.phys.sourceControlled,false);assert.equal(p.phys.sourceControlled,false);
  const xp=s.read().progress.xp;await send('/disposicion quirofano');assert.equal(s.read().progress.xp,xp);
  results.push({...spec,quality:migrated.quality,xp:migrated.xp,nativeXp:p.nsOutcome.career.xpDelta,
   nativeQuality:JSON.parse(JSON.stringify(original)),oneAward:true,sourceControlUnchanged:true});
 }finally{s.dispose();}
}
assert(results.find(x=>x.id==='full-care').quality.score>results.find(x=>x.id==='minimum-reassessed').quality.score);
assert(results.find(x=>x.id==='overtesting').quality.score<results.find(x=>x.id==='full-care').quality.score);
const out=process.env.V5_PERITONITIS_EVIDENCE||'qa/v5-browser-results';fs.mkdirSync(out,{recursive:true});
fs.writeFileSync(out+'/peritonitis-quality-parity.json',JSON.stringify({schema:'atria-secondary-quality-parity/v1',allMatched:true,
 sourceHashes:{base:createHash('sha256').update(base).digest('hex'),correction:createHash('sha256').update(correction).digest('hex')},
 fixtureLimits:'Native diagnostic/study/consult prerequisites supplied; V5 uses actual dialogue, examination, studies, IV administration and consultation. Native numeric quality and native career/finalizer run unchanged.',results},null,2)+'\n');
console.log('PERITONITIS ORIGINAL QUALITY/XP PASS',JSON.stringify(results.map(x=>({id:x.id,score:x.quality.score,xp:x.xp}))));
