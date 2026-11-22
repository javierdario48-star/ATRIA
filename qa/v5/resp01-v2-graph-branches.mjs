// Additional branches of the declarative graph, not another copy of the
// original 40-profile matrix. All effects use public commands/native receipts.
import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
import {createGuardRuntime} from '../../src/v5/clinical/guard-runtime.js';
import {createClinicalGraphObserver} from '../../src/v5/clinical/clinical-graph-observer.js';
import {createNavigation} from '../../src/v5/engine/navigation.js';
import {generatePatientVariation} from '../../src/v5/content/patient-variation.js';
import {resp01V2Candidate as c} from '../../src/v5/content/packs/respiratory-v2-candidate.js';
import {clinicalCertificationContent,runClinicalCaseScenario} from './certify-clinical-cases.mjs';
const content=await clinicalCertificationContent([c]),out='qa/v5-resp01-v2-graph';await mkdir(out,{recursive:true});
const results=[];
for(const mode of ['solo','apprentice','coop','competitive']){
 const graph=createClinicalGraphObserver(c.clinicalGraph),members=['coop','competitive'].includes(mode)?
  [{id:'doctor',name:'Doctora'},{id:'colleague',name:'Colega'}]:[{id:'doctor',name:'Doctora'}];
 let roomId;
 for(let i=0;i<1000&&!roomId;i++){
  const candidate='graph-branches-'+mode+'-'+i;
  if(generatePatientVariation(c.variation,candidate+':patient:'+c.id).allergies.some(x=>x.drugId==='morphine'&&x.severity==='severe'))roomId=candidate;
 }
 assert(roomId,'ordinary seeded severe allergy must be available');
 let nowMs=1700000000000,runtime,seq=0;
 const observations=[],commands=[];
 const make=checkpoint=>createGuardRuntime({content,roomId,mode,caseId:c.id,members,hostId:'doctor',nowMs,checkpoint});
 const observe=()=>{const s=runtime.view('doctor').clinical;if(s.readOnly)return;
  graph.observe(s);observations.push({at:s.clock,vitals:s.patient.liveVitals,administrations:s.patient.administrationLog,
   complications:s.patient.policyState?.complications,adverseEvents:s.patient.adverseEvents,progress:s.progress});};
 const advance=async seconds=>{nowMs+=seconds*1000;while((await runtime.advanceTo(nowMs)).recovering){}observe();};
 let uid,initial;
 const send=async(text,id='command-'+(++seq))=>{
  // Unsafe competitive disposition releases ownership. Reacquisition is the
  // ordinary bedside claim, never an assignment of the clinical patient.
  if(mode==='competitive')runtime.claim('doctor',uid);
  const reply=await runtime.post('doctor',{id,text,targetPatientUid:uid});commands.push({id,text,reply});observe();return reply;
 };
 try{
  runtime=await make(null);uid=runtime.view('doctor').clinical.patient.uid;
  const bed=content.beds.find(b=>b.id===runtime.view('doctor').clinical.shift.patients[0].bedId);
  const target=createNavigation(content.map).center(...bed.approach);runtime.motion('doctor',[target.x,target.y],1);
  for(let i=0;i<180&&!runtime.claim('doctor',uid);i++)await advance(.25);
  assert.equal(runtime.view('doctor').clinical.patient.uid,uid);initial=structuredClone(runtime.view('doctor').clinical);observe();
  for(const destination of ['alta','observacion']){
   const before=structuredClone(runtime.view('doctor').clinical.patient),id='unsafe-'+destination;
   const first=await send('/disposicion '+destination,id),p=runtime.view('doctor').clinical.patient;
   assert.deepEqual(p,before,'unsafe destination preserves this patient');
   assert.equal(first.clinical[0].receipt.disposition.kind,destination==='alta'?'clinical.unsafe-discharge':'clinical.unsafe-observation');
   const penalties=runtime.view('doctor').clinical.progress.penalties.length;
   await send('/disposicion '+destination,id);assert.equal(runtime.view('doctor').clinical.progress.penalties.length,penalties);
  }
  await send('/signos');await send('/diagnostico '+c.dx[0]);
  for(const method of ['general','inspection','auscultation','percussion','palpation'])await send('/examen '+method);
  for(const destination of ['uti','procedimiento','quirofano']){
   const result=await send('/disposicion '+destination);assert(!runtime.view('doctor').clinical.patient.caseEnded);
   assert(result.clinical.some(x=>x.status==='rejected'),JSON.stringify(result));
  }
  const binding=runtime.view('doctor').clinical.hintBinding;
  const prepare=await runtime.hint('doctor',{...binding,op:'prepare',requestId:'graph-hint',verify:true});
  assert.equal(prepare.status,'verified');
  const hint=await runtime.hint('doctor',{...binding,op:'displayed',requestId:'graph-hint-display',offerId:prepare.offerId});
  assert.equal(hint.status,'displayed');observe();
  const invalid=await send('Enfermera morfina 0 mg');
  assert(!runtime.view('doctor').clinical.patient.administrationLog.some(x=>x.id==='morphine'),'zero dose is not converted to default');
  await send('¿Tiene alergias?');await send('Enfermera una vía');await advance(5);
  await send('Enfermera morfina 8 mg');
  for(let i=0;i<100&&!runtime.view('doctor').clinical.patient.adverseEvents.some(x=>x.kind==='severe-drug-allergy');i++)await advance(1);
  const harmed=runtime.view('doctor').clinical.patient;
  assert(harmed.adverseEvents.some(x=>x.kind==='severe-drug-allergy'),'real pre-existing allergy must manifest');
  assert(harmed.administrationLog.some(x=>x.id==='morphine'&&x.dose.amount===8),'a technically possible excessive dose must actually reach this patient');
  const nadir=structuredClone(harmed.liveVitals);
  await send('/tratamiento epi_im');await send('Enfermera oxígeno 4 L/min');
  for(let i=0;i<60&&!runtime.view('doctor').clinical.patient.administrationLog.some(x=>x.id==='epi_im');i++)await advance(1);
  assert(runtime.view('doctor').clinical.patient.administrationLog.some(x=>x.id==='epi_im'),'rescue needs its real administration receipt');
  await advance(30);await send('/reevaluar');
  assert(!runtime.view('doctor').clinical.patient.patientDied,'the immediate rescue path remains alive');
  const saved=await runtime.checkpoint(),before=structuredClone(runtime.view('doctor').clinical.patient);
  runtime.dispose();runtime=await make(saved);assert.deepEqual(runtime.view('doctor').clinical.patient,before);
  graph.observe({...runtime.view('doctor').clinical,checkpointRecovered:true});
  const row={mode,roomId,patientUid:uid,seed:uid+':'+c.id,initial,beforeRescue:nadir,commands,observations,
   final:runtime.view('doctor').clinical,graph:graph.read(),passed:true,limitations:'No safe closure is claimed after intentionally unsafe and allergic care.'};
  results.push({mode,kind:'unsafe-destinations-dose-allergy-rescue-hint-recovery',passed:true,covered:row.graph.covered});
  await writeFile(out+'/'+mode+'-branches.json',JSON.stringify(row,null,2)+'\n');
 }catch(error){results.push({mode,passed:false,error:String(error.stack||error),covered:graph.read().covered});}
 finally{runtime?.dispose();}
 const observationGraph=createClinicalGraphObserver(c.clinicalGraph);
 const run=await runClinicalCaseScenario(c,{content,mode,profile:'competent',seed:'graph-observation-'+mode,
  preferredDestination:'observacion',horizon:300,recovery:true,onObservation:s=>observationGraph.observe(s)});
 results.push({mode,kind:'legal-observation',passed:run.passed&&run.final?.destination==='observacion',
  failures:run.failures,covered:observationGraph.read().covered});
 await writeFile(out+'/'+mode+'-observation.json',JSON.stringify({...run,graphCoverage:observationGraph.read()},null,2)+'\n');
}
const covered=[...new Set(results.flatMap(x=>x.covered))],summary={graphId:c.clinicalGraph.id,results,covered,
 uncovered:c.clinicalGraph.edges.filter(e=>!covered.includes(e.id)).map(e=>e.id),passed:results.every(x=>x.passed),
 note:'Union this coverage with the existing 40-scenario matrix. Uncovered edges remain explicit.'};
await writeFile(out+'/summary.json',JSON.stringify(summary,null,2)+'\n');console.log(JSON.stringify(summary));
if(!summary.passed)process.exitCode=1;
