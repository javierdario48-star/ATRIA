import assert from 'node:assert/strict';
import fs from 'node:fs';
assert(fs.existsSync(new URL('../../qa/physiology-pilot/run-pilot-487.mjs',import.meta.url)),
 'B1 needs a reproducible native/shadow comparison and independent trajectory expectations');
const {runPhysiologyPilot487}=await import('../../qa/physiology-pilot/run-pilot-487.mjs');
const hypotheses=JSON.parse(fs.readFileSync(new URL('../../qa/physiology-pilot/clinical-expectations-487.json',import.meta.url),'utf8'));
const result=runPhysiologyPilot487();let directionChecks=0;
assert.equal(result.nativeComparison.length,24);assert.equal(result.newScenarios.length,3*34);
assert.equal(result.nativeWrites,0);assert.equal(result.clinicalValidated,false);
for(const t of result.nativeComparison){
 assert.equal(t.points.length,5);
 for(const [key,value]of Object.entries(t.points[0].native))
  assert(Math.abs(value-t.points[0].experimentalInitialVitals[key])<1e-8,'initial observation '+key);
 assert.equal(t.points[0].administeredFluidMl,0);
 assert(t.points.every(p=>p.requestedClinicalMinute-p.integratedClinicalMinute<.25+1e-9));
 assert.equal(t.issues.length,0);assert.equal(t.actualAdministrations.length,t.orders.length);
}
for(const caseId of ['PERI-SEC-001','HDA-001','CIRR-001'])for(const h of hypotheses.expectations){
 if(h.cases&&!h.cases.includes(caseId))continue;
 const treated=result.newScenarios.find(t=>t.caseId===caseId&&t.scenarioId===h.scenario);
 const control=result.newScenarios.find(t=>t.caseId===caseId&&t.scenarioId===h.control);
 assert(treated&&control,h.id);
 const points=treated.points.filter(p=>p.clinicalMinute>=h.fromMinute&&p.clinicalMinute<=h.toMinute);
 assert(points.length>=2,'trajectory, not only final value: '+h.id);
 for(const p of points){
  const c=control.points.find(x=>x.clinicalMinute===p.clinicalMinute);
  assert(Number.isFinite(p[h.field])&&Number.isFinite(c[h.field]),h.id);
  assert(h.relation==='greater'?p[h.field]>c[h.field]+1e-9:p[h.field]<c[h.field]-1e-9,
   `${caseId} ${h.id} at ${p.clinicalMinute}: ${p[h.field]} vs ${c[h.field]}`);directionChecks++;
 }
}
for(const t of result.newScenarios){
 assert(t.points.every(p=>Object.values(p).filter(x=>typeof x==='number').every(Number.isFinite)),t.scenarioId);
 assert(t.points.every(p=>p.spo2>=40&&p.spo2<=99&&p.perfusion>=0&&p.fluidOverloadRisk<=1));
 if(t.caseId==='PERI-SEC-001')assert.equal(t.final.sourceControlled,false,'support is not source control');
 if(t.caseId==='HDA-001')assert(t.final.cumulativeBloodLossMl>0,'support is not hemostasis');
}
console.log('B1 CLINICAL-DIRECTION TRAJECTORIES PASS',JSON.stringify({nativeTrajectories:24,
 newTrajectories:result.newScenarios.length,directionChecks,clinicalValidated:false,baselineCommit:result.baselineCommit}));
