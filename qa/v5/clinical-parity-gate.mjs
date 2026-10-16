// QA-only executable clinical parity gate. Never imported by src/v5 or builds.
// Read the *effective generated V4.8.7* through its pinned VM reference,
// not orphaned experimental B1 prototypes or a copied legacy wrapper.
import assert from 'node:assert/strict';
import {createNativeReferenceRuntime487,orderNativeReference487,
 advanceNativeReference487,snapshotNativeReference487,loadNativeReferenceSources487}
 from '../physiology-pilot/native-reference-487.mjs';
import {initialAppVitals,advanceAppVitals} from '../../src/v5/clinical/native-app.js';
import {initialCirrVitals,advanceCirrVitals} from '../../src/v5/clinical/native-cirr.js';
import {readFileSync} from 'node:fs';

const cases=JSON.parse(readFileSync(new URL('../../src/v5/content/cases.json',import.meta.url)));
const select=id=>cases.find(c=>c.id===id);
const sources=loadNativeReferenceSources487();
const evaluated=[];
const scenarios=[
 {caseId:'APP-001',id:'no-care',order:null},
 {caseId:'APP-001',id:'fluid-500',order:'Ringer 500 ml'},
 {caseId:'CIRR-001',id:'no-care',order:null},
 {caseId:'CIRR-001',id:'fluid-500',order:'Ringer 500 ml'},
 {caseId:'PERI-SEC-001',id:'no-care',order:null},
 {caseId:'PERI-SEC-001',id:'fluid-500',order:'Ringer 500 ml'},
 {caseId:'PERI-SEC-001',id:'fluid-3000',order:'Ringer 3000 ml'}
];
for(const {caseId,id,order} of scenarios){
 const runtime=createNativeReferenceRuntime487({caseId,sources});
 assert.equal(runtime.ctx.window.csPharm487,undefined,
  'unsupported heparin must not silently install an experimental second pharmacology writer');
 const before=snapshotNativeReference487(runtime);
 if(order)orderNativeReference487(runtime,{id:'fluid',text:order});
 const at05=advanceNativeReference487(runtime,.06);
 const at20=advanceNativeReference487(runtime,.24);
 const at05min=advanceNativeReference487(runtime,.6);
 const expectedMl=order?Number(/(\\d+) ml/.exec(order)[1]):0;
 assert.equal(at05.administrationCount,order?0:0,'an acknowledged order is never a dose');
 assert.equal(at20.administrationCount,order?1:0,'native preparation must produce exactly one receipt');
 assert.equal(at05min.fluidMl,expectedMl,'native cumulative volume follows administered milliliters');
 const snapshots=[before,at05,at20,at05min];
 for(const item of snapshots){
  for(const x of Object.values(item.vitals))assert(Number.isFinite(x),'finite legacy observed vital');
  assert(item.fluidMl>=0&&item.administrationCount>=0,'finite exposure ledger');
 }
 // Baselines for the two migrated cases are compared to their original
 // executable. Do not force V5 to copy harmful historical mistakes.
 if(caseId==='APP-001'||caseId==='CIRR-001'){
  const c=select(caseId);
  const v5={liveVitals:caseId==='APP-001'?initialAppVitals(c):initialCirrVitals(c),treatments:[]};
  assert.deepEqual(v5.liveVitals,before.vitals,'case V5 baseline must be executable parity');
  const advance=caseId==='APP-001'?advanceAppVitals:advanceCirrVitals;
  // No treatment: native smoothing must be equivalent over this short window.
  if(!order){advance(v5,c,5);for(const axis of Object.keys(v5.liveVitals))
   assert(Math.abs(v5.liveVitals[axis]-at05min.vitals[axis])<1e-6,'no-treatment parity '+caseId+'/'+axis);}
 }
 evaluated.push({caseId,id,received:!!order,administeredMl:at05min.fluidMl,
  receiptCount:at05min.administrationCount,
  baselineVitals:before.vitals,atFiveSeconds:at05min.vitals,
  physiologyActive:!!at05min.physiology,deathAtFiveSeconds:at05min.patientDied,
  toxicology:at05min.toxicity});
}
const find=(caseId,id)=>evaluated.find(r=>r.caseId===caseId&&r.id===id);
assert.equal(find('CIRR-001','no-care').physiologyActive,false,
 'the original CIRR seed has no physiological volume compartments to copy');
assert.equal(find('APP-001','no-care').physiologyActive,false,
 'the original APP seed has no physiological volume compartments to copy');
assert.equal(find('PERI-SEC-001','no-care').physiologyActive,true,
 'sepsis is the existing native dynamic patient, unlike APP/CIRR');
assert.equal(find('PERI-SEC-001','fluid-3000').administeredMl,3000);
assert.equal(find('PERI-SEC-001','fluid-500').administeredMl,500);
assert.equal(find('PERI-SEC-001','no-care').administeredMl,0);
const diagnostics={
 status:'characterized-not-migrated',reference:'effective generated legacy VM, not isolated B1',
 legacySourceHashes:sources.compiled.map(x=>({id:x.id,sha256:x.hash})),
 gaps:{v5CIRRFluidOverload:'not-modeled',v5APPFluidOverload:'not-modeled',
  sepsisClinicalEngine:'not-migrated',fatalExposure:'not-migrated',grace:'not-migrated'},
 cases:evaluated
};
console.log('V5 CLINICAL PARITY GATE PASS '+JSON.stringify(diagnostics));
