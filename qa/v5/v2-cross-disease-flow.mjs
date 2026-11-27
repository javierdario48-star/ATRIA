#!/usr/bin/env node
// Real guard-runtime smoke/positive/negative matrix. Distinct from the pure
// finite state-property matrix; it never writes vitals, RNG or native receipts.
import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
import {clinicalContent} from '../../src/v5/server/content.js';
import {createGuardSession} from '../../src/v5/clinical/guard-session.js';
import {createGuardRuntime} from '../../src/v5/clinical/guard-runtime.js';
import {createNavigation} from '../../src/v5/engine/navigation.js';
import {createClinicalGraphObserver,validateClinicalGraph} from '../../src/v5/clinical/clinical-graph-observer.js';
import {stagedV2Candidates} from '../../src/v5/content/packs/v2-staging-candidates.js';
import {runClinicalCaseScenario,treatmentCommand} from './certify-clinical-cases.mjs';

const mode=process.env.V2_MATRIX_MODE;
assert(['solo','apprentice','coop','competitive'].includes(mode),'V2_MATRIX_MODE required');
const allDestinations=['alta','observacion','sala','uti','procedimiento','quirofano'];
const cases=stagedV2Candidates,content={...clinicalContent,cases:clinicalContent.cases.map(c=>
 cases.find(v=>v.id===c.id)||c)};
assert.equal(content.cases.length,55);
const report={schema:'atria.v2-cross-disease-flow-matrix.1',mode,sourceSha:process.env.GITHUB_SHA||'local',
 paths:[],attempts:[],errors:[],limitations:[
 'Finite declarative graph and known profile coverage, not every continuous medication dose, patient seed or timing.',
 'Flow graph is an independent read-only observation of native outcomes, not a decision engine.',
 'Procedure transfer does not mean endoscopic/surgical treatment already performed.'
]};
const out='qa/v5-v2-cross-disease-'+mode;await mkdir(out,{recursive:true});
function fail(label,error){report.errors.push(label+': '+String(error?.stack||error));}
// Adversarial inputs are QA fixtures, not clinical rules or motor exceptions.
const wrongInputs={
 'RESP-01':{drug:'furosemide',harm:'diuretic-volume-depletion'},
 'VARIX-001':{drug:'aspirin',harm:'antithrombotic-bleeding'},
 'CARD-08':{drug:'aspirin',harm:'antithrombotic-bleeding'},
 'NEUR-01':{drug:'furosemide',harm:'diuretic-volume-depletion'}
};
for(const c of cases){
 try{assert.deepEqual(validateClinicalGraph(c.clinicalGraph,c),[]);}
 catch(e){fail(c.id+'/graph-contract',e);}
 for(const destination of allDestinations){
  const uid='negative-close-'+mode+'-'+c.id+'-'+destination;
  let session,runtime;
  try{
   let before,after,reply;
   if(mode==='competitive'){
    // Competitive permissions/claims exist ONLY in createGuardRuntime.
    // Never simulate competitive play by pretending the solo session is equivalent.
    const members=[{id:'host',name:'QA host'},{id:'doctor',name:'QA doctor'}];
    let nowMs=1700000000000;
    runtime=await createGuardRuntime({content,roomId:uid,mode,caseId:c.id,members,
     hostId:'host',nowMs});
    const first=runtime.view('doctor').clinical;
    const patientUid=first.patient.uid;
    const bedId=first.shift.patients.find(x=>x.uid===patientUid)?.bedId;
    const bed=content.beds.find(x=>x.id===bedId);
    assert(bed,'real competitive patient bed required');
    const nav=createNavigation(content.map),point=nav.center(...bed.approach);
    assert(runtime.motion('doctor',[point.x,point.y],1));
    let claimed=false;
    for(let n=0;n<180&&!claimed;n++){
     claimed=!!runtime.claim('doctor',patientUid);
     if(!claimed){
      nowMs+=250;
      let task=await runtime.advanceTo(nowMs);
      while(task.recovering)task=await runtime.advanceTo(nowMs);
     }
    }
    assert(claimed,'competitive physician must claim the real bedside patient');
    before=runtime.view('doctor').clinical;
    reply=await runtime.post('doctor',{id:'attempt-'+destination,
     text:'/disposicion '+destination,targetPatientUid:patientUid});
    after=runtime.view('doctor').clinical;
   }else{
    const members=mode==='coop'?[{id:'doctor',name:'QA doctor'},{id:'peer',name:'QA colleague'}]:
     [{id:'doctor',name:'QA doctor'}];
    session=createGuardSession({roomId:uid,mode,members,actorId:'doctor',
     actorName:'QA',patient:{uid,caseId:c.id},content,resolveContext:()=>({patientUid:uid})});
    before=session.read();
    reply=await session.post({id:'attempt-'+destination,text:'/disposicion '+destination});
    after=session.read();
   }
   const graph=createClinicalGraphObserver(c.clinicalGraph);
   graph.observe(before);
   const p=after.patient;
   assert.equal(p.caseEnded,false,'unprepared patient may not close');
   assert.notEqual(p.closure?.closed,true,'unprepared patient may not close');
   assert.equal(after.progress.receipts.length,0,'no XP for unprepared disposition');
   graph.observe(after);
   const terminal=graph.read().covered.filter(id=>c.clinicalGraph.edges.some(e=>
    e.id===id&&allDestinations.includes(e.when)));
   assert.deepEqual(terminal,[],'rejected destination cannot light terminal graph route');
   report.attempts.push({caseId:c.id,destination,allowed:c.clinicalPolicy.closure.destinations.includes(destination),
    replyStatus:reply.clinical?.[0]?.status||reply.status,closed:false,xp:0,graphTerminals:terminal,
    graphEdgeIds:graph.read().covered});
  }catch(e){fail(c.id+'/premature-'+destination,e);}
  finally{session?.dispose();runtime?.dispose();}
 }
 const positives=c.clinicalPolicy.closure.destinations.map(destination=>({
  destination,profile:c.clinicalPolicy.closure.escalationDestinations?.includes(destination)?
   'complication-rescue':'competent'
 }));
 const wrong=wrongInputs[c.id];
 assert(wrong,'missing adversarial QA input for '+c.id);
 const negatives=[
  {destination:null,profile:'wrong-medication'},
  {destination:null,profile:'abandon'}
 ];
 for(const scenario of [...positives,...negatives]){
  const label=c.id+'/'+mode+'/'+scenario.profile+'/'+(scenario.destination||'default');
  const graph=createClinicalGraphObserver(c.clinicalGraph);
  try{
   const run=await runClinicalCaseScenario(c,{content,mode,profile:scenario.profile,
    seed:'cross-v2-closure:'+label,horizon:720,recovery:true,traceEvery:20,
    ...(scenario.destination?{preferredDestination:scenario.destination}:{}),
    wrongMedicationCommand:treatmentCommand(c,content,wrong.drug),
    onObservation:state=>graph.observe(state),
    source:{kind:'cross-v2-closure-branch-certification'}});
   const coverage=graph.read(),terminal=coverage.covered.filter(id=>c.clinicalGraph.edges.some(e=>
    e.id===id&&allDestinations.includes(e.when)));
   const check=Object.entries(run.integrityChecks||{}).filter(([k,v])=>v===false).map(([k])=>k);
   assert.equal(check.length,0,'native integrity failed: '+check.join(','));
   assert.equal(run.patientIdentity?.identityUnchanged,true,'variation identity changed');
   assert.equal(run.patientIdentity?.restoredIdentityUnchanged,true,'checkpoint corrupted variation');
   assert.equal(new Set((run.administrations||[]).map(x=>x.sourceEventId)).size,
    (run.administrations||[]).length,'duplicate administration receipts');
   if(scenario.destination){
    assert.equal(run.outcome,'accepted-destination',JSON.stringify(run.failures||[]));
    assert.equal(run.passed,true,'competent clinical performance not certified');
    assert.equal(run.closureReceipt?.closed,true,'destination lacks native closure');
    assert.equal(run.closureReceipt?.destination,scenario.destination,'wrong destination');
    assert.equal((run.xpReceipts||[]).length,1,'expected exactly one XP receipt');
    assert.equal(terminal.length,1,'only one terminal graph edge may fire');
    assert.equal(terminal[0],c.clinicalGraph.edges.find(e=>e.when===scenario.destination).id,
     'native closure and graph disagree');
    if(scenario.profile==='complication-rescue'){
     assert((run.complicationObservations||[]).length>0,'no manifested complication');
     // An already CONFIRMED prophylactic/support treatment may satisfy a
     // rescue when an episode manifests later. Do not require a redundant
     // second administration just to label it an explicit "rescue action".
     const complication=c.clinicalPolicy.complications[0];
     const given=new Set((run.administrations||[]).map(row=>row.id));
     assert((complication.rescueAllOf||[]).every(id=>given.has(id)),
      'actual required rescue receipts absent after manifested episode');
     if(complication.rescueAnyOf?.length)
      assert(complication.rescueAnyOf.some(id=>given.has(id)),
       'none of the native rescue alternatives was administered');
    }
   }else{
    assert.notEqual(run.outcome,'accepted-destination','wrong care received a safe handoff');
    assert.notEqual(run.closureReceipt?.closed,true,'wrong care must not close');
    assert.equal((run.xpReceipts||[]).length,0,'no credit for wrong care');
    assert.deepEqual(terminal,[],'negative outcome may not light closure edge');
    if(scenario.profile==='abandon')assert.equal((run.administrations||[]).length,0,
     'abandoned patient cannot acquire a treatment receipt');
    if(scenario.profile==='wrong-medication'){
     const doses=(run.administrations||[]).filter(x=>x.id===wrong.drug&&x.sourceEventId&&
      Number.isFinite(x.administeredAtNativeMinute)&&x.dose?.amount>0);
     assert(doses.length,'wrong-medication path lacks delivered medication: '+wrong.drug);
     assert((run.adverseEvents||[]).some(e=>e.kind===wrong.harm&&
      doses.some(d=>d.sourceEventId===e.sourceEventId&&d.patientUid===e.patientUid)),
      'wrong-medication path lacks native harm linked to actual dose: '+wrong.harm);
     assert(coverage.covered.includes('iatrogenia'),'native harm not observed in graph');
    }
   }
   const entry={caseId:c.id,mode,profile:scenario.profile,destination:scenario.destination,
    outcome:run.outcome,passed:true,terminal,complications:run.complicationObservations?.length||0,
    harms:(run.adverseEvents||[]).filter(e=>e.status==='active').length,
    administrations:(run.administrations||[]).length,rawXP:run.xpReceipts?.length||0,
    graphEdgesCovered:coverage.covered.length,graphEdgeIds:coverage.covered,graphEdgesUncovered:coverage.uncovered};
   report.paths.push(entry);
   await writeFile(out+'/'+c.id+'-'+scenario.profile+'-'+(scenario.destination||'default')+'.json',
    JSON.stringify({...run,graphCoverage:coverage},null,2)+'\n');
   console.log('ATRIA_CROSS_CASE_PATH '+JSON.stringify(entry));
  }catch(e){fail(label,e);console.error('ATRIA_CROSS_CASE_ERROR '+label+' '+String(e.message||e));}
 }
}
report.passed=report.errors.length===0;
report.coverage={cases:cases.map(x=>x.id),mode,prematureDestinations:report.attempts.length,
 nativePaths:report.paths.length,positive:report.paths.filter(x=>x.destination).length,
 negative:report.paths.filter(x=>!x.destination).length,
 graphEdges:[...new Set([...report.paths,...report.attempts].flatMap(x=>(x.graphEdgeIds||[]).map(id=>x.caseId+'/'+id)))].length,
 graphByCase:cases.map(c=>{const covered=[...new Set([...report.paths,...report.attempts].filter(x=>x.caseId===c.id).flatMap(x=>x.graphEdgeIds||[]))];
  return {caseId:c.id,covered,total:c.clinicalGraph.edges.length,uncovered:c.clinicalGraph.edges.map(e=>e.id).filter(id=>!covered.includes(id))};})};
await writeFile(out+'/summary.json',JSON.stringify(report,null,2)+'\n');
console.log('ATRIA_CROSS_CASE_FLOW_SUMMARY '+JSON.stringify({
 mode,passed:report.passed,coverage:report.coverage,errors:report.errors}));
if(report.errors.length)process.exitCode=1;
