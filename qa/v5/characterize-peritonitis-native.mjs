// QA only: genuine effective V4 medicine preparation and original physiology,
// compared with the owned V5 guard. No B1, generated code or VM in the game.
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {createLiveNativeJourney487,advanceLiveNativeJourney487 as advanceOriginal,liveNativeJourneySources487} from '../physiology-live/native-journey-487.mjs';
import {createGuardSession} from '../../src/v5/clinical/guard-session.js';
const load=async name=>JSON.parse(await fs.readFile(new URL('../../src/v5/content/'+name+'.json',import.meta.url)));
const content={cases:await load('cases'),therapies:await load('therapies'),defaultDoses:await load('default-doses')};
const axes=['temp','hr','rr','sys','dia','spo2'],physAxes=['inflammation','effectiveVolume','svr','contractility','oxygenation','renalReserve','renalStress'];
const scenarios=[
 {id:'abandonment',orders:[]},
 ...[500,1000,2000,6000].map(ml=>({id:'crystalloid-'+ml,orders:['Ringer '+ml+' ml']})),
 {id:'reference-antibiotics',orders:['ceftriaxona 1 g','metronidazol 500 mg']},
 {id:'broad-spectrum-alternative',orders:['piperacilina tazobactam 4.5 g']},
 {id:'wrong-incomplete-coverage',orders:['metronidazol 500 mg']},
 {id:'pressor-without-source-control',orders:['noradrenalina 0.05 mcg/kg/min IV']},
 {id:'albumin-volume-and-renal-response',orders:['albumina 1.5 g/kg']},
 {id:'hypovolemic-diuresis',orders:['furosemida 40 mg']},
 {id:'correct-treatment-accepted-surgeon',orders:['Ringer 1000 ml','ceftriaxona 1 g','metronidazol 500 mg'],consult:true}
];
const results=[];
for(const spec of scenarios){
 const original=createLiveNativeJourney487('PERI-SEC-001');let sequence=0,elapsed=0;
 assert.equal(original.ctx.window.csPharm487,undefined,'the failed experimental general owner must remain uninstalled');
 const s=createGuardSession({roomId:'peri-parity',mode:'solo',actorId:'doctor',actorName:'Doctor',
  patient:{uid:'P',caseId:'PERI-SEC-001'},content,resolveContext:()=>({patientUid:'P'})});
 const send=text=>s.post({id:String(++sequence),text});
 const advance=async target=>{const delta=target-elapsed;advanceOriginal(original,delta);s.advance(delta);await s.flush();elapsed=target;};
 try{
  await send('Enfermera una vía');
  if(spec.consult){
   // Actual surgeon response to documented suspicion and initial shock; no
   // complete abdominal exam, so neither engine can auto-finalize this fixture.
   original.ctx.sim.diagnosis='peritonitis secundaria';original.ctx.sim.lastVitalsKnown=true;
   original.ctx.nurseNatural('Enfermera cirugía');
   await send('/diagnostico peritonitis secundaria');await send('/signos');await send('Enfermera cirugía');
  }
  for(const text of spec.orders){
   assert(original.ctx.addMonitorTherapy(text),'native medicine recognizer '+text);
   const reply=await send('Enfermera '+text);assert.equal(reply.clinical.at(-1).status,'pending',text);
  }
  const points=[],maxError={vitals:0,state:0};
  // Observe both sides of the real consultant deadline as well as drug
  // deadlines. This keeps the original 60Hz Euler reference partition explicit.
  for(const target of [.54,.56,.79,.81,1.49,1.51,3.49,3.5,3.51,5,30,60,120]){
   await advance(target);const p=s.read().patient,o=original.ctx.sim;
   assert.equal(p.administrationLog.length,o.administrationLog.length,spec.id+' real receipt timing at '+target);
   for(let i=0;i<p.administrationLog.length;i++){
    assert.equal(p.administrationLog[i].id,o.administrationLog[i].id);
    assert(Math.abs(p.administrationLog[i].administeredAtNativeMinute-o.administrationLog[i].m)<1e-8,spec.id+' authentic administration time');
   }
   for(const axis of axes){const error=Math.abs(p.liveVitals[axis]-o.liveVitals[axis]);maxError.vitals=Math.max(maxError.vitals,error);assert(error<1e-6,spec.id+'/'+target+'/'+axis+': '+error);}
   for(const axis of physAxes){const error=Math.abs(p.phys[axis]-o.phys[axis]);maxError.state=Math.max(maxError.state,error);assert(error<1e-7,spec.id+'/'+target+'/'+axis+': '+error);}
   assert.equal(p.phys.sourceControlled,false);assert.equal(o.phys.sourceControlled,false);
   const cov=original.ctx.antibioticCoverageStatus();assert(Math.abs((p.coverage?.score??0)-cov.score)<1e-8);
   assert(Math.abs((p.coverage?.ramp??0)-cov.ramp)<1e-8);
   points.push({realSeconds:target,vitals:p.liveVitals,phys:p.phys,coverage:p.coverage,receipts:p.administrationLog.length});
  }
  if(spec.consult){assert(original.ctx.sim.consults.get('cirugia').accepted);assert(s.read().patient.consults.at(-1).accepted);}
  results.push({...spec,maxError,points});
 }finally{s.dispose();}
}
const final=id=>results.find(x=>x.id===id).points.at(-1);
assert(final('correct-treatment-accepted-surgeon').phys.effectiveVolume>final('abandonment').phys.effectiveVolume+.1);
assert(final('reference-antibiotics').phys.inflammation<final('wrong-incomplete-coverage').phys.inflammation);
assert(final('crystalloid-6000').vitals.spo2<final('crystalloid-500').vitals.spo2-5);
assert(final('hypovolemic-diuresis').phys.renalReserve<final('abandonment').phys.renalReserve);
const out=process.env.V5_PERITONITIS_EVIDENCE||'qa/v5-browser-results';await fs.mkdir(out,{recursive:true});
await fs.writeFile(out+'/peritonitis-native-parity.json',JSON.stringify({schema:'atria-secondary-native-parity/v1',
 scope:'PERI-SEC original typical phenotype, native timing and physiology; no auto surgery/source control',allMatched:true,
 sourceHashes:liveNativeJourneySources487.compiled.map(({id,code})=>({id,sha256:createHash('sha256').update(code).digest('hex')})),results},null,2)+'\n');
console.log('PERITONITIS V4/V5 PARITY PASS',JSON.stringify({scenarios:results.length,points:results.reduce((sum,x)=>sum+x.points.length,0),
 maxVitalError:Math.max(...results.map(x=>x.maxError.vitals)),maxStateError:Math.max(...results.map(x=>x.maxError.state))}));
