import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createGuardSession} from './guard-session.js';
import {appDiseaseTargetOffsets} from './app-disease-progression.js';
import {createLiveNativeJourney487,advanceLiveNativeJourney487 as advanceLegacy}
 from '../../../qa/physiology-live/native-journey-487.mjs';
const load=n=>JSON.parse(readFileSync(new URL('../content/'+n+'.json',import.meta.url)));
const content={cases:load('cases'),therapies:load('therapies'),defaultDoses:load('default-doses')};
const forms=[
 ['imipenem','imipenem 500 mg',1.5],['ceftazidime','ceftazidima 1 g',.55],
 ['cefoperazone','cefoperazona 1 g',.55],['cefepime','cefepime 1 g',.55],
 ['piptazo','piptazo 4.5 g',1.5],['ampicillin','ampicilina 2 g',1.5],
 ['amikacin','amikacina 500 mg',1.5],['gentamicin','gentamicina 80 mg',1.5],
 ['fluconazole','fluconazol 400 mg',1.5]
];
function fixture(caseId='APP-001',mode='solo',allergies=[]){
 const s=createGuardSession({roomId:'antimicrobials-'+caseId+'-'+mode,mode,actorId:'doc',actorName:'Doctor',
  patient:{uid:'P',caseId,allergies},content,resolveContext:()=>({patientUid:'P'})});
 let n=0;return {s,post:text=>s.post({id:'m'+(++n),text})};
}
test('all nine V5 formulations match authentic 4.8.7 administration delays, doses and early vital trajectories',async()=>{
 for(const [id,order,seconds] of forms){
  const old=createLiveNativeJourney487('APP-001'),{s,post}=fixture();
  try{
   assert.equal(old.ctx.addMonitorTherapy(order),true);
   await post('Enfermera una vía');await post('Enfermera '+order);
   advanceLegacy(old,2);s.advance(2);await s.flush();
   const actual=s.read().patient,original=old.ctx.sim.administrationLog;
   assert.equal(original.length,1,id+' original receipt');
   assert.equal(original[0].id,id);
   assert(Math.abs(original[0].m/.12-seconds)<1e-8,id+' true original preparation');
   assert.equal(actual.administrationLog[0].dose.display,original[0].doseDisplay);
   for(const axis of ['sys','dia','hr','rr','spo2','temp'])
    assert(Math.abs(actual.liveVitals[axis]-old.ctx.sim.liveVitals[axis])<1e-7,id+' '+axis);
  }finally{s.dispose();}
 }
});
for(const mode of ['solo','apprentice'])for(const caseId of ['APP-001','CIRR-001'])
 test(mode+'/'+caseId+': nine original antimicrobials execute with real preparation and receipts',async()=>{
  for(const [id,order,seconds] of forms){
   const {s,post}=fixture(caseId,mode);
   try{
    await post('Enfermera una vía');
    const baseline=s.read().patient.liveVitals;
    const ack=await post('Enfermera '+order);
    assert.equal(ack.clinical[0].status,'pending',id);
    s.advance(seconds-.01);await s.flush();
    assert.equal(s.read().patient.administrationLog.length,0,id+' before preparation');
    assert.deepEqual(s.read().patient.liveVitals,baseline,id+' cannot act from a pending order');
    s.advance(.02);await s.flush();
    const rows=s.read().patient.administrationLog;
    assert.equal(rows.length,1);assert.equal(rows[0].id,id);
    assert.equal(rows[0].dose.amount,content.defaultDoses[id].amount);
    assert(Math.abs(rows[0].administeredAtRealSecond-seconds)<1e-8,id+' original preparation');
    s.advance(10);await s.flush();
    assert.deepEqual(s.read().patient.liveVitals,baseline,'no universal antibiotic vital bonus '+id);
    assert.equal(s.pharmacologyRead().drugs.find(x=>x.id===id).state,'confirmed');
    if(caseId==='CIRR-001')assert(s.read().closure.quality.penalty>=5,id+' unnecessary exposure penalty');
   }finally{s.dispose();}
  }
 });
for(const drug of ['piptazo 4.5 g','imipenem 500 mg'])test('APP real alternative '+drug+' fulfills original handoff and XP once',async()=>{
 const {s,post}=fixture();
 try{
  for(const q of ['¿Desde cuándo empezó?','¿Se movió el dolor?','¿Tiene apetito?'])await post(q);
  await post('/signos');
  for(const section of ['general','inspection','auscultation','percussion','palpation'])await post('/examen '+section);
  await post('/estudio app_cbc');await post('/estudio app_us');
  await post('Enfermera una vía');await post('Enfermera '+drug);
  assert.equal(s.pharmacologyRead().outcomes.coverageComplete,false);
  await post('/consulta cirugia');await post('/diagnostico apendicitis aguda');
  s.advance(120);await s.flush();await post('/reevaluar');
  assert.equal(s.pharmacologyRead().outcomes.coverageComplete,true);
  const p=s.read().patient,c=content.cases.find(x=>x.id==='APP-001');
  assert(appDiseaseTargetOffsets(p,c,173).sys>appDiseaseTargetOffsets({uid:'untreated'},c,173).sys,
   'appropriate alternatives slow future APP progression like the original regimen');
  await post('/consulta cirugia');s.advance(3.5);await s.flush();
  const close=await post('/disposicion quirofano');
  assert.equal(close.clinical[0].status,'executed');
  assert.equal(s.read().patient.closure.quality.score,100);
  assert.equal(s.read().progress.xp,133);
  await post('/disposicion quirofano');assert.equal(s.read().progress.receipts.length,1);
 }finally{s.dispose();}
});
test('a penicillin class allergy allows piptazo delivery, causes real reaction and denies coverage credit',async()=>{
 const {s,post}=fixture('APP-001','solo',[{groupId:'penicillin',severity:'severe'}]);
 try{
  await post('Enfermera una vía');await post('Enfermera piptazo 4.5 g');
  s.advance(26);await s.flush();
  const p=s.read().patient;
  assert.equal(p.administrationLog[0].id,'piptazo');
  assert(p.liveVitals.sys<95&&p.liveVitals.spo2<91);
  assert.equal(p.adverseEvents.length,1);
  assert.equal(s.pharmacologyRead().outcomes.coverageComplete,false);
 }finally{s.dispose();}
});
test('APP coverage/progression agree with the three regimens actually accepted by the original finalizer',async()=>{
 const {s,post}=fixture();
 try{
  await post('Enfermera una vía');
  await post('Enfermera cefepime 1 g y metronidazol 500 mg');
  s.advance(2);await s.flush();
  const p=s.read().patient,c=content.cases.find(x=>x.id==='APP-001');
  assert.deepEqual(p.administrationLog.map(x=>x.id),['cefepime','metronidazole']);
  assert.equal(s.pharmacologyRead().outcomes.coverageComplete,false,
   'an experimental fallback must not promise original-finalizer coverage');
  assert.deepEqual(appDiseaseTargetOffsets(p,c,173),appDiseaseTargetOffsets({uid:'untreated'},c,173));
  assert(s.read().closure.missing.some(x=>/imprescindibles/i.test(x)));
 }finally{s.dispose();}
});
