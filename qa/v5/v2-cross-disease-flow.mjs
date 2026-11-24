#!/usr/bin/env node
// Real guard-runtime smoke/positive/negative matrix. Distinct from the pure
// finite state-property matrix; it never writes vitals, RNG or native receipts.
import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
import {clinicalContent} from '../../src/v5/server/content.js';
import {createGuardSession} from '../../src/v5/clinical/guard-session.js';
import {createClinicalGraphObserver,validateClinicalGraph} from '../../src/v5/clinical/clinical-graph-observer.js';
import {resp01V2Candidate as resp} from '../../src/v5/content/packs/respiratory-v2-candidate.js';
import {varixV2Candidate as varix} from '../../src/v5/content/packs/varix-v2-candidate.js';
import {runClinicalCaseScenario} from './certify-clinical-cases.mjs';

const mode=process.env.V2_MATRIX_MODE;
assert(['solo','apprentice','coop','competitive'].includes(mode),'V2_MATRIX_MODE required');
const allDestinations=['alta','observacion','sala','uti','procedimiento','quirofano'];
const cases=[resp,varix],content={...clinicalContent,cases:clinicalContent.cases.map(c=>
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
const modes=[mode];
for(const c of cases){
 try{assert.deepEqual(validateClinicalGraph(c.clinicalGraph,c),[]);}
 catch(e){fail(c.id+'/graph-contract',e);}
 for(const destination of allDestinations){
  const uid='negative-close-'+mode+'-'+c.id+'-'+destination;
  const s=createGuardSession({roomId:uid,mode,actorId:'doctor',actorName:'QA',patient:{uid,caseId:c.id},
   content,resolveContext:()=>({patientUid:uid})});
  try{
   const before=s.read(),graph=createClinicalGraphObserver(c.clinicalGraph);
   graph.observe(before);
   const reply=await s.post({id:'attempt-'+destination,text:'/disposicion '+destination});
   const after=s.read(),p=after.patient;
   assert.equal(p.caseEnded,false,'unprepared patient may not close');
   assert.notEqual(p.closure?.closed,true,'unprepared patient may not close');
   assert.equal(after.progress.receipts.length,0,'no XP for unprepared disposition');
   graph.observe(after);
   const terminal=graph.read().covered.filter(id=>c.clinicalGraph.edges.some(e=>
    e.id===id&&allDestinations.includes(e.when)));
   assert.deepEqual(terminal,[],'rejected destination cannot light terminal graph route');
   report.attempts.push({caseId:c.id,destination,allowed:c.clinicalPolicy.closure.destinations.includes(destination),
    replyStatus:reply.clinical?.[0]?.status||reply.status,closed:false,xp:0,graphTerminals:terminal});
  }catch(e){fail(c.id+'/premature-'+destination,e);}
  finally{s.dispose();}
 }
 const positives=c.id===resp.id?[
  {destination:'alta',profile:'competent'},
  {destination:'observacion',profile:'competent'},
  {destination:'sala',profile:'complication-rescue'}
 ]:[
  {destination:'procedimiento',profile:'competent'},
  {destination:'uti',profile:'competent'}
 ];
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
    wrongMedicationCommand:c.id==='VARIX-001'?'Enfermera heparina 5000 UI IV':'Enfermera furosemida 40 mg',
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
     assert((run.rescueActions||[]).length>0,'no actual clinical rescue');
    }
   }else{
    assert.notEqual(run.outcome,'accepted-destination','wrong care received a safe handoff');
    assert.notEqual(run.closureReceipt?.closed,true,'wrong care must not close');
    assert.equal((run.xpReceipts||[]).length,0,'no credit for wrong care');
    assert.deepEqual(terminal,[],'negative outcome may not light closure edge');
    if(scenario.profile==='abandon')assert.equal((run.administrations||[]).length,0,
     'abandoned patient cannot acquire a treatment receipt');
   }
   const entry={caseId:c.id,mode,profile:scenario.profile,destination:scenario.destination,
    outcome:run.outcome,passed:true,terminal,complications:run.complicationObservations?.length||0,
    harms:(run.adverseEvents||[]).filter(e=>e.status==='active').length,
    administrations:(run.administrations||[]).length,rawXP:run.xpReceipts?.length||0,
    graphEdgesCovered:coverage.covered.length,graphEdgesUncovered:coverage.uncovered};
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
 graphEdges:[...new Set(report.paths.flatMap(x=>x.graphEdgesCovered))].length};
await writeFile(out+'/summary.json',JSON.stringify(report,null,2)+'\n');
console.log('ATRIA_CROSS_CASE_FLOW_SUMMARY '+JSON.stringify({
 mode,passed:report.passed,coverage:report.coverage,errors:report.errors}));
if(report.errors.length)process.exitCode=1;
