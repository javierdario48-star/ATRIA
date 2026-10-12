/** Intentional malpractice simulator: do not mistake harm flags for real harm.
 * Every administered treatment is verified; vital signs are measured against
 * a time-matched UN-treated patient with identical risk flags.
 */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createLiveNativeJourney487,advanceLiveNativeJourney487 as advance}
 from './physiology-live/native-journey-487.mjs';
import {GLOBAL_TREATMENTS_487,csAssessGeneralTreatment487}
 from '../src/clinical/general-therapy-487.js';
import {CASE_CLOSURE_RULES_487} from '../src/clinical/case-completion-487.js';
const cases=['CIRR-001','PANC-001','CROHN-001','HDA-001','COLON-001',
 'PERI-PBE-001','PERI-SEC-001','PERI-TER-001','APP-001',
 'CHOLE-001','ILEO-001','MESI-001','CHOLANG-001'];
const ids=Object.keys(GLOBAL_TREATMENTS_487);
assert.equal(cases.length,13);assert.equal(ids.length,30);
const orders=['heparina IV','furosemida 40 mg','propranolol 40 mg',
 'ceftriaxona 1 g','morfina 4 mg IV'];
let policyPairs=0;
const hazards=[];
for(const caseId of cases)for(const id of ids){
 const c={id:caseId},p={patientInstance:{uid:caseId},
  therapyExposure:new Map(),administrationLog:[],phys:{renalReserve:.38},
  clinicalFlags:{activeBleeding:true,renalImpairment:true,
   severeAllergies:[id],drugAllergies:[id],riskFlags:[...(GLOBAL_TREATMENTS_487[id].hazards||[])]}};
 const v=csAssessGeneralTreatment487(id,c,p);
 assert(v.known&&v.administered===false&&v.appropriate===false,caseId+'/'+id);
 for(const h of GLOBAL_TREATMENTS_487[id].hazards||[])
  assert(v.risk.includes('context:'+h),caseId+'/'+id+' '+h);
 policyPairs++;hazards.push({caseId,id,indicated:v.indicated,
  contraindicated:v.contraindicated,hazards:v.risk});
}
const vital=p=>Object.fromEntries(['sys','dia','hr','rr','spo2']
 .map(id=>[id,Number(p.liveVitals?.[id]??NaN)]));
const trajectories=[],gaps=[];
for(const caseId of cases){
 const bad=createLiveNativeJourney487(caseId),
  noDrug=createLiveNativeJourney487(caseId);
 const risk={activeBleeding:true,renalImpairment:true,bleedingRisk:true,
  drugAllergies:['ceftriaxone'],severeAllergies:['ceftriaxone']};
 for(const rt of [bad,noDrug])rt.ctx.sim.clinicalFlags={...risk};
 const p=bad.ctx.sim,confirmed=[],pre=vital(p);
 for(let i=0;i<orders.length;i++){
  const order=orders[i],id=bad.ctx.findMonitorTherapy(order)?.id;
  assert(id,'native recognized '+order);
  const count=Number(p.therapyExposure?.get(id)?.count||0);
  // Deliberately no diagnosis, no histories, no exam, no studies, no consult.
  if(i%2===0)bad.ctx.nurseNatural('enfermera '+order);
  else bad.ctx.addMonitorTherapy(order);
  advance(bad,2.7,{dt:1/30});
  const administered=Number(p.therapyExposure?.get(id)?.count||0)>count;
  confirmed.push({id,order,administered});
  if(!administered)gaps.push({caseId,type:'delivery',id});
 }
 const now=bad.clock.realSeconds;
 advance(bad,30,{dt:1/30});
 advance(noDrug,now+30,{dt:1/30});
 const after=vital(p),control=vital(noDrug.ctx.sim);
 const delta=Object.fromEntries(Object.keys(after).map(axis=>
  [axis,Number((after[axis]-control[axis]).toFixed(2))]));
 const heparin=bad.ctx.window.csCare487.heparinHarm();
 const allergy=bad.ctx.window.csCare487.allergy();
 assert(heparin.active&&heparin.bleedingSeverity>.05,caseId+' confirmed heparin harm');
 assert(allergy.active&&allergy.severity>.05,caseId+' confirmed allergic reaction');
 const closure=bad.ctx.window.csCaseHandoffOptions487?.()||[];
 if(CASE_CLOSURE_RULES_487[caseId]){
  assert.equal(closure.length,0,caseId+' no close options after intentional malpractice');
  assert.equal(bad.ctx.window.csFinalizeCase487('alta'),false,caseId+' unsafe discharge blocked');
  assert.equal(p._careerEndProcessed,undefined,caseId+' no fabricated XP');
 }
 // The dynamics must actually be harmful, not just label an adverse effect.
 if(!(delta.sys< -2&&delta.hr>1))gaps.push({caseId,type:'vital-worsening',
  deltas:delta,heparinSeverity:heparin.bleedingSeverity,allergySeverity:allergy.severity});
 if(confirmed.some(x=>!x.administered))gaps.push({caseId,type:'unconfirmed-orders'});
 trajectories.push({caseId,initial:pre,untreated:control,after,
  delta,confirmed,heparinSeverity:heparin.bleedingSeverity,
  allergySeverity:allergy.severity,unsafeClosureBlocked:closure.length===0});
 console.log('BOT EVERYTHING WRONG',JSON.stringify({
  caseId,medications:confirmed.filter(x=>x.administered).length,
  delta,blocked:closure.length===0}));
}
assert.equal(policyPairs,390);
assert.equal(trajectories.length,13);
fs.mkdirSync('qa/adversarial-results',{recursive:true});
const report={schema:'atria-487-malpractice/v1',clinicalRules:policyPairs,
 realPatientJourneys:13,medicineAttempts:65,trajectories,gaps,
 note:'Known active hemorrhage + severe ceftriaxone allergy injected in EVERY seed. Worst-case stress variant, not each seed default. No physical browser.'};
fs.writeFileSync('qa/adversarial-results/malpractice-487.json',JSON.stringify(report,null,2)+'\n');
console.log('BOT MEDICATION MALPRACTICE SUMMARY',JSON.stringify({
 rules:390,cases:13,medicines:65,confirmed:trajectories.reduce((a,b)=>a+b.confirmed.filter(x=>x.administered).length,0),
 harmed:trajectories.filter(x=>x.delta.sys< -2&&x.delta.hr>1).length,
 actualGaps:gaps.length,gapKinds:gaps.reduce((a,x)=>(a[x.type]=(a[x.type]||0)+1,a),{})}));
assert.equal(gaps.length,0,'All intentionally unsafe 13-case scenarios must worsen real hemodynamics; see emitted report');
