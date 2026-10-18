/**
 * Extended characterization of the ACTUAL generated 4.8.7 physiology owner
 * versus the one V5 PERI-SEC clinical owner. QA-only. No stubs for drug
 * delivery, no manual edits to patient state, and no V4 VM in the game build.
 *
 * Scope: original PERI-SEC-001 DEFAULT phenotype. Distinct prescriptions at
 * later times and (optionally) slower native clock while the player types.
 * This intentionally does NOT claim the other 10 native V5 case owners,
 * randomized V3 phenotypes, a full day, or a postmortem V4 VM equivalent.
 */
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {createLiveNativeJourney487,advanceLiveNativeJourney487} from '../physiology-live/native-journey-487.mjs';
import {createGuardSession} from '../../src/v5/clinical/guard-session.js';
const load=async name=>JSON.parse(await fs.readFile(new URL('../../src/v5/content/'+name+'.json',import.meta.url)));
const content={cases:await load('cases'),therapies:await load('therapies'),defaultDoses:await load('default-doses')};
const axes=['temp','hr','rr','sys','dia','spo2'];
const physAxes=['inflammation','effectiveVolume','svr','contractility','oxygenation','renalReserve','renalStress'];
const at=(second,...medications)=>medications.map(text=>({second,text}));
const specs=[
 {id:'ceftriaxone-then-metronidazole',orders:[...at(0,'ceftriaxona 1 g'),...at(12,'metronidazol 500 mg')]},
 {id:'metronidazole-then-ceftriaxone',orders:[...at(0,'metronidazol 500 mg'),...at(18,'ceftriaxona 1 g')]},
 {id:'five-separated-ringer-doses',orders:[...at(0,'Ringer 500 ml'),...at(4,'Ringer 500 ml'),...at(9,'Ringer 500 ml'),...at(16,'Ringer 500 ml'),...at(26,'Ringer 500 ml')]},
 {id:'sequential-crystalloid-overload',orders:[...at(0,'Ringer 1000 ml'),...at(8,'Ringer 2000 ml'),...at(18,'Ringer 2000 ml')]},
 {id:'late-antimicrobial-and-volume-rescue',orders:[...at(24,'ceftriaxona 1 g','metronidazol 500 mg','Ringer 1000 ml')]},
 {id:'albumin-before-renal-risk',orders:[...at(0,'albumina 1.5 g/kg'),...at(14,'amikacina 500 mg')]},
 {id:'diuresis-after-resuscitation',orders:[...at(0,'Ringer 1000 ml'),...at(13,'furosemida 40 mg'),...at(25,'Ringer 500 ml')]},
 {id:'broad-coverage-and-timed-pressure-support',orders:[...at(0,'piperacilina tazobactam 4.5 g'),...at(10,'noradrenalina 0.05 mcg/kg/min IV'),...at(23,'Ringer 1000 ml')]},
 {id:'typing-during-antibiotic-coverage',orders:[...at(0,'ceftriaxona 1 g','metronidazol 500 mg'),...at(18,'Ringer 500 ml')],typing:[[8,16],[30,36]]}
];
const observationBase=[0,.54,.56,.79,.81,1.49,1.51,2.59,2.61,4,7,8,10,12,14,16,18,20,23,25,27,30,36,45,60];
const round=x=>Number(x.toFixed(8)),report=[];
for(const spec of specs){
 const original=createLiveNativeJourney487('PERI-SEC-001');
 const uid='sequence-'+spec.id,s=createGuardSession({roomId:'sequence-'+spec.id,mode:'solo',
  actorId:'doctor',actorName:'Doctor',patient:{uid,caseId:'PERI-SEC-001'},
  content,resolveContext:()=>({patientUid:uid})});
 let counter=0,elapsed=0,submitted=0,maxVitalError=0,maxStateError=0;
 const prescribed=[];
 const events=spec.orders.map((x,index)=>({...x,index})).sort((a,b)=>a.second-b.second||a.index-b.index);
 const typing=spec.typing||[];
 const checkpoints=new Set(observationBase);
 for(const e of events){
  checkpoints.add(e.second);
  for(const delay of [.54,.56,.79,.81,1.49,1.51,2.59,2.61])
   if(e.second+delay<=60)checkpoints.add(round(e.second+delay));
 }
 for(const [begin,end] of typing){checkpoints.add(begin);checkpoints.add(end);}
 const times=[...checkpoints].sort((a,b)=>a-b).filter(x=>x<=60);
 const step=async target=>{
  if(target<elapsed-1e-9)throw Error('nonmonotonic QA');
  const delta=target-elapsed;
  if(delta<=1e-12)return;
  const slow=typing.some(([begin,end])=>elapsed>=begin-1e-9&&target<=end+1e-9);
  advanceLiveNativeJourney487(original,delta,{typing:slow});
  s.advance(delta,{typing:slow});await s.flush();elapsed=target;
 };
 const dose=async e=>{
  assert(original.ctx.addMonitorTherapy(e.text),spec.id+' native medicine '+e.text);
  const reply=await s.post({id:String(++counter),text:'Enfermera '+e.text});
  assert.equal(reply.clinical.at(-1)?.status,'pending',spec.id+' V5 pending '+e.text);
  prescribed.push({at:e.second,text:e.text});
 };
 try{
  await s.post({id:'access',text:'Enfermera una vía'});
  const samples=[];
  for(const t of times){
   while(submitted<events.length&&events[submitted].second<=t+1e-9){
    const e=events[submitted++];
    await step(e.second);await dose(e);
   }
   await step(t);
   const p=s.read().patient,o=original.ctx.sim;
   assert.equal(p.administrationLog.length,o.administrationLog.length,spec.id+' receipt count @'+t);
   for(let i=0;i<p.administrationLog.length;i++){
    const a=p.administrationLog[i],b=o.administrationLog[i];
    assert.equal(a.id,b.id,spec.id+' receipt ID @'+t);
    assert.equal(a.patientUid,uid);
    assert(Math.abs(a.administeredAtNativeMinute-b.m)<1e-7,spec.id+' receipt time @'+t+' '+a.id);
   }
   for(const axis of axes){
    const error=Math.abs(p.liveVitals[axis]-o.liveVitals[axis]);
    maxVitalError=Math.max(maxVitalError,error);
    assert(error<2e-6,spec.id+' '+axis+' @'+t+': '+error);
   }
   for(const axis of physAxes){
    const error=Math.abs(p.phys[axis]-o.phys[axis]);
    maxStateError=Math.max(maxStateError,error);
    assert(error<2e-7,spec.id+' '+axis+' @'+t+': '+error);
   }
   assert.equal(p.phys.sourceControlled,false,spec.id+' transfer cannot perform surgery');
   assert.equal(o.phys.sourceControlled,false);
   const coverage=original.ctx.antibioticCoverageStatus();
   assert(Math.abs((p.coverage?.score??0)-coverage.score)<1e-7,spec.id+' coverage @'+t);
   assert(Math.abs((p.coverage?.ramp??0)-coverage.ramp)<1e-7,spec.id+' coverage ramp @'+t);
   samples.push({second:t,receiptCount:p.administrationLog.length,systemicSystolic:p.liveVitals.sys,
    spo2:p.liveVitals.spo2,effectiveVolume:p.phys.effectiveVolume,renalReserve:p.phys.renalReserve,
    inflammation:p.phys.inflammation,coverage:p.coverage?.score??0});
  }
  assert.equal(submitted,events.length);
  assert.equal(s.read().patient.administrationLog.length,events.length,spec.id+' every confirmed prescription');
  report.push({id:spec.id,orders:prescribed,samples,maxVitalError,maxStateError,
   typingWindows:typing,allMatched:true});
 }finally{s.dispose();}
}
const get=id=>report.find(x=>x.id===id).samples.at(-1);
assert(get('ceftriaxone-then-metronidazole').coverage>0.95);
assert(get('metronidazole-then-ceftriaxone').coverage>0.95);
assert(get('sequential-crystalloid-overload').spo2<get('five-separated-ringer-doses').spo2);
const out=process.env.V5_PERITONITIS_EVIDENCE||'qa/v5-browser-results';
await fs.mkdir(out,{recursive:true});
await fs.writeFile(out+'/peritonitis-sequence-parity.json',
 JSON.stringify({schema:'atria-secondary-sequence-parity/v1',
 scope:'Default PERI-SEC phenotype only; real V4/V5 native medicine timing and state up to 60s',
 allMatched:true,comparisons:report.reduce((n,x)=>n+x.samples.length,0),results:report},null,2)+'\n');
console.log('SECONDARY PERITONITIS SEQUENCE PARITY PASS',JSON.stringify({
 scenarios:report.length,measurements:report.reduce((n,x)=>n+x.samples.length,0),
 maxVitalError:Math.max(...report.map(x=>x.maxVitalError)),
 maxPhysiologyError:Math.max(...report.map(x=>x.maxStateError))}));
