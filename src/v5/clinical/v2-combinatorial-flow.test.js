// Exhaustive FINITE contract matrix, not an assertion that continuous physiology
// has finitely many possibilities. Shared owners only; no synthetic executor.
import test from 'node:test';
import assert from 'node:assert/strict';
import {resp01V2Candidate as resp} from '../content/packs/respiratory-v2-candidate.js';
import {varixV2Candidate as varix} from '../content/packs/varix-v2-candidate.js';
import {clinicalContent} from '../server/content.js';
import {createGuardSession} from './guard-session.js';
import {evaluateClinicalPolicyDisposition} from './clinical-policy-closure.js';
import {complicationDispositionRequirements} from './clinical-disposition-safety.js';
import {observedDeteriorationCauses} from './clinical-deterioration-causes.js';
import {observedStabilizationRequirements} from './clinical-stabilization-requirements.js';
import {clinicalRescueAlternatives,outstandingClinicalRescue} from './clinical-rescue-logic.js';
import {validateClinicalGraph,createClinicalGraphObserver} from './clinical-graph-observer.js';

const cases=[resp,varix],modes=['solo','apprentice','coop','competitive'];
const destinations=['alta','observacion','sala','uti','procedimiento','quirofano'];
const episodeStates=['none','candidate','incipient','active','recovering','recovered','future','unrecognized'];
const staged={...clinicalContent,cases:clinicalContent.cases.map(c=>cases.find(v=>v.id===c.id)||c)};
assert.equal(staged.cases.length,55);
assert.equal(new Set(staged.cases.map(c=>c.id)).size,55);
let checked=0;

test('every 6-destination decision cross every 8 manifestation states uses one closure authority',()=>{
 for(const c of cases){
  assert.deepEqual(validateClinicalGraph(c.clinicalGraph,c),[]);
  const s=createGuardSession({roomId:'matrix-closure-'+c.id,mode:'solo',actorId:'doctor',
   patient:{uid:'matrix-patient-'+c.id,caseId:c.id},content:staged,
   resolveContext:()=>({patientUid:'matrix-patient-'+c.id})});
  try{
   const baseline=s.read().patient,def=c.clinicalPolicy.complications[0];
   for(const destination of destinations)for(const status of episodeStates){
    const p=structuredClone(baseline);
    const episode=status==='none'?[]:status==='unrecognized'?
     [{id:'unregistered-secret',onsetAt:1,status:'active'}]:
     [{id:def.id,status:status==='future'?'active':status,
       onsetAt:status==='future'?1e9:0}];
    p.policyState={...p.policyState,nativeMinute:10,complications:episode};
    const before=structuredClone(p),assessment=evaluateClinicalPolicyDisposition(p,c,destination);
    assert.equal(assessment.ready,false,'fresh unprepared case must not close: '+c.id+'/'+destination+'/'+status);
    assert(Array.isArray(assessment.requirements));
    if(!c.clinicalPolicy.closure.destinations.includes(destination))
     assert(assessment.missing.some(m=>m.includes('Destino no autorizado')),
      'unsupported disposition must be rejected by policy: '+c.id+'/'+destination);
    const direct=complicationDispositionRequirements({patient:p,caseData:c,destination,
      fulfilled:[],continuation:{deferredTreatmentIds:[]}});
    const active=['active','incipient','recovering'].includes(status);
    if(!active)assert.deepEqual(direct,[],c.id+': '+status+' must not invent active complication');
    else assert(direct.some(x=>x.reason==='manifested-complication-rescue'),
     c.id+': '+status+' must request actual authored rescue');
    assert.deepEqual(p,before,'policy and closure are read-only');
    checked++;
   }
  }finally{s.dispose();}
 }
});

test('every authored V2 rescue subset is monotonic and exact for every possible destination',()=>{
 for(const c of cases){
  for(const def of c.clinicalPolicy.complications){
   const alternatives=clinicalRescueAlternatives(def);
   const universe=[...new Set([...def.rescueAllOf||[],...def.rescueAnyOf||[]])];
   assert(universe.length<=12,'finite exhaustive subset enumeration capped');
   for(let mask=0;mask<2**universe.length;mask++){
    const done=new Set(universe.filter((_,i)=>mask&(1<<i)));
    const fulfilled=alternatives.some(group=>group.every(id=>done.has(id)));
    const left=outstandingClinicalRescue(def,done);
    assert.equal(!left.length,fulfilled);
    for(const destination of destinations){
     const patient={policyState:{complications:[{id:def.id,status:'active',onsetAt:1}]}};
     const before=structuredClone(patient);
     const rules=complicationDispositionRequirements({
      patient,caseData:c,destination,fulfilled:done,continuation:{deferredTreatmentIds:[]}});
     if(!fulfilled)assert.deepEqual(rules[0]?.anyOf,left);
     else if(destination==='alta')
      assert(rules.some(r=>r.type==='wait'&&r.reason==='manifested-complication-recovery'));
     else assert.deepEqual(rules,[]);
     assert.deepEqual(patient,before);
     checked++;
    }
   }
  }
 }
});

function administered(p,drug,source,advisories=[]){
 const entry={id:drug,sourceEventId:source,patientUid:p.uid,
  administeredAtNativeMinute:1,route:'iv',dose:{amount:8,unit:'mg'},clinicalAdvisories:advisories};
 p.administrationLog.push(entry);p.treatments.push(structuredClone(entry));
}
test('enumerate all 24 medically consistent joint-origin combinations for each V2',()=>{
 for(const c of cases){
  const def=c.clinicalPolicy.complications[0],baseSys=Number(String(c.vitals.bp).split('/')[0]);
  for(const random of [false,true])for(const harm of [false,true])
   for(const allergy of [false,true])for(const delayed of [false,true])
    for(const caution of harm?[false,true]:[false]){
     const minute=c.clinicalPolicy.trajectory.earlyEnd+10;
     const p={uid:'causal-matrix-patient',caseId:c.id,
      liveVitals:{sys:delayed?Math.max(40,baseSys-40):130,dia:delayed?35:80,
       spo2:delayed?76:98,rr:delayed?38:18,hr:delayed?156:80,temp:37},
      policyState:{nativeMinute:minute,complications:random?
       [{id:def.id,status:'active',onsetAt:2}]:[]},
      administrationLog:[],treatments:[],adverseEvents:[]};
     if(harm){
      administered(p,'morphine','opioid-1',caution?[{code:'clinical-contraindication'}]:[]);
      p.adverseEvents.push({kind:'opioid-respiratory-depression',status:'active',
       patientUid:p.uid,sourceEventId:'opioid-1',drugId:'morphine',atNativeMinute:1});
     }
     if(allergy){
      administered(p,'morphine','allergy-1');
      p.adverseEvents.push({kind:'severe-drug-allergy',status:'active',
       patientUid:p.uid,sourceEventId:'allergy-1',drugId:'morphine',atNativeMinute:1});
     }
     const expected=[
      ...(random?['random']:[]),...(harm?['treatment']:[]),
      ...(caution?['contraindication']:[]),...(allergy?['allergy']:[]),
      ...(delayed?['unattended']:[])
     ];
     const before=structuredClone(p);
     const projection=observedDeteriorationCauses({patient:p,caseData:c});
     assert.deepEqual([...new Set(projection.causes.map(x=>x.origin))].sort(),expected.sort(),
      c.id+': joint origin '+JSON.stringify({random,harm,allergy,delayed,caution}));
     const rescue=observedStabilizationRequirements({patient:p,caseData:c,destination:'alta'});
     assert(Array.isArray(rescue));
     assert.deepEqual(p,before,'origins and stabilization are read-only');
     const other=structuredClone(c);other.id='unrelated-case-'+c.id;
     const alias=observedDeteriorationCauses({patient:p,caseData:other});
     assert.deepEqual(alias.causes.map(x=>x.origin),projection.causes.map(x=>x.origin),
      'same policy and evidence must give the same origins regardless of case ID');
     assert.deepEqual(alias.events,projection.events);
     assert.deepEqual(alias.complications,projection.complications);
     checked++;
    }
  }
});

test('all closure branches of both graphs are exclusive and supported by the native disposition state',()=>{
 for(const c of cases){
  const supported=c.clinicalPolicy.closure.destinations;
  for(const target of destinations){
   const graph=createClinicalGraphObserver(c.clinicalGraph);
   const patient={uid:'graph-matrix-'+c.id,caseId:c.id,
    consults:[{id:'gastro',accepted:true,status:'done',patientUid:'graph-matrix-'+c.id}]};
   const state={patient,clock:{nativeMinute:2,clinicalMinute:2},progress:{receipts:[]}};
   const before=structuredClone(patient);
   graph.observe(state);
   const terminal=(edges)=>edges.filter(edge=>destinations.includes(edge.when));
   assert.deepEqual(terminal(graph.read().evidence),[]);
   assert.deepEqual(patient,before);
   if(!supported.includes(target)){
    assert(!c.clinicalGraph.edges.some(edge=>edge.when===target),
     'graph must not declare unsupported closure: '+c.id+'/'+target);
   }else{
    patient.closure={closed:true,destination:target,eventId:'native-close',patientUid:patient.uid};
    graph.observe(state);
    const visited=graph.read().covered;
    assert.equal(visited.filter(id=>c.clinicalGraph.edges.some(e=>
     e.id===id&&destinations.includes(e.when))).length,1,
     'one native disposition must visit exactly one terminal branch');
    assert(visited.includes(c.clinicalGraph.edges.find(e=>e.when===target).id));
   }
   checked++;
  }
 }
});
test('the same executable contract survives all four game modes with fresh patient references',async()=>{
 // The low-level session only implements solo/apprentice/cooperative. Full
 // competitive game authority is tested via createGuardRuntime in bot CI.
 for(const mode of modes.filter(mode=>mode!=='competitive'))for(const c of cases){
  const uid='native-crossmode-'+mode+'-'+c.id;
  const members=mode==='coop'?[{id:'doctor',name:'Doctor'},{id:'peer',name:'Colega'}]:
   [{id:'doctor',name:'Doctor'}];
  const s=createGuardSession({roomId:'native-crossmode-'+mode+'-'+c.id,mode,members,
   actorId:'doctor',patient:{uid,caseId:c.id},content:staged,
   resolveContext:()=>({patientUid:uid})});
  try{
   const before=s.read(),p=before.patient;
   assert.equal(p.uid,uid);assert.equal(p.caseId,c.id);
   const g=createClinicalGraphObserver(c.clinicalGraph);
   g.observe(before);
   assert.deepEqual(s.read(),before,'the diagram may not alter clinical state');
   assert.equal(s.read().progress.receipts.length,0,'no early XP');
   for(const destination of destinations){
    const a=evaluateClinicalPolicyDisposition(s.read().patient,c,destination);
    assert.equal(a.ready,false,'unprepared clinician cannot close');
    checked++;
   }
  }finally{s.dispose();}
 }
});
test('matrix exercised a declared finite number of clinical permutations',()=>{
 // Includes 2x6x8 dispositions, each authored rescue subset across 6
 // destinations, 2x24 causal combinations and 2x6 graph paths, four modes.
 assert(checked>=200,'finite cross-product coverage regressed: '+checked);
 console.log('ATRIA_V2_FINITE_MATRIX '+JSON.stringify({checked,caseCount:cases.length,
  modes:modes.length,destinations:destinations.length,origins:5,
  graphIds:cases.map(c=>c.clinicalGraph.id)}));
});
