import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {apply487} from '../integration/apply-487.js';
import {csAuditExistingCatalog487,csAuditDrugCase487} from './pharmacology-coverage-487.js';

const raw=fs.readFileSync('vendor/atria-4.8.6/index.html','utf8');
const compiled=apply487(raw);
const p=compiled.indexOf('const CASES=')+'const CASES='.length;
const cases=JSON.parse(compiled.slice(p).split('\n')[0].replace(/;\s*$/,''));
const a=compiled.indexOf('const MONITOR_THERAPY_CATALOG=['),b=compiled.indexOf('function findMonitorTherapy(',a);
assert(a>=0&&b>a,'native shared catalog must exist');
const native=vm.runInNewContext(compiled.slice(a,b)+';MONITOR_THERAPY_CATALOG');
const v19=compiled.split('<script id="cs-safe-v0190">')[1]?.split('</script>')[0]||'';
const heparinAdd=v19.match(/MONITOR_THERAPY_CATALOG\.push\(\{id:'anticoagulation',[\s\S]*?\}\);/)?.[0];
assert(heparinAdd,'actual V19 runtime must define the extra heparin catalog entry');
vm.runInNewContext(heparinAdd,{MONITOR_THERAPY_CATALOG:native});
assert.equal(cases.length,13);
assert.equal(native.length,30);
const audit=csAuditExistingCatalog487(cases,native);
assert.equal(audit.pairs,390);
assert.deepEqual(audit.blockedEntries,['anticoagulation'],
 'heparin is a real runtime addition and remains explicitly without a reviewed mechanism');
for(const c of cases)for(const d of native){
 const x=audit.rows.find(r=>r.caseId===c.id&&r.id===d.id);
 assert(x,'missing drug/case pairing '+d.id+'/'+c.id);
 assert(['blocked-unmodelled','conditional-target','no-demonstrated-target',
 'risk-without-benefit','target-with-risks'].includes(x.status));
 assert(x.status==='blocked-unmodelled'||Object.values(x.virtualOffsets).every(Number.isFinite));
}
const C=id=>cases.find(x=>x.id===id),D=id=>native.find(x=>x.id===id);
const caseAudit=(c,d,patient)=>csAuditDrugCase487(C(c),D(d),patient);
assert(caseAudit('MESI-001','anticoagulation').status==='blocked-unmodelled');
assert(caseAudit('HDA-001','anticoagulation').status==='blocked-unmodelled');
assert(caseAudit('PERI-SEC-001','vasopressor').targets.length>0);
assert(caseAudit('HDA-001','furosemide').risks.includes('may-worsen-hypoperfusion'));
assert(caseAudit('PERI-PBE-001','gentamicin').risks.includes('renal-injury-or-accumulation'));
assert(caseAudit('CIRR-001','albumin').risks.includes('colloid-overload'));
assert.equal(caseAudit('CIRR-001','oxygen').targets.length,0,
 'normal initial oxygen does not imply useful oxygen therapy');
assert(caseAudit('PANC-001','oxygen').targets.length>0,
 'hypoxemic pancreatitis seed has an oxygenation target');
// Changing state rather than changing the diagnosis must change the outcome.
const dynamic={liveVitals:{sys:72,dia:39,spo2:86},therapyTotals:{fluidMl:3200},phys:{renalReserve:.25,effectiveVolume:.55}};
const steady={liveVitals:{sys:123,dia:77,spo2:99},therapyTotals:{fluidMl:0},phys:{renalReserve:.95,effectiveVolume:.88}};
assert(caseAudit('COLON-001','oxygen',dynamic).targets.length>0);
assert.equal(caseAudit('COLON-001','oxygen',steady).targets.length,0);
assert(caseAudit('COLON-001','furosemide',dynamic).risks.includes('may-worsen-hypoperfusion'));
assert(caseAudit('COLON-001','cefepime',dynamic).risks.includes('renal-injury-or-accumulation'));
// Growth must not require manual edits to a drug-by-disease matrix.
const mockDrug={id:'qa_conditional_agent',label:'QA drug',aliases:['qa agent'],effects:{},
 pharmacology:{classId:'qa',route:'iv',onsetMin:1,peakMin:10,indications:['hypoxemia'],
 hazards:['agent-specific'],mechanism:'custom',response:{spo2:2},
 defaultDose:{amount:1,unit:'qa',display:'1 qa'}}};
const extra={id:'QA-FUTURE-001',vitals:{bp:'88/54',spo2:88},pharmacology:{traits:['hypoxemia']}};
const extended=csAuditExistingCatalog487([...cases,extra],[...native,mockDrug]);
assert.equal(extended.pairs,14*31);
assert.equal(extended.rows.filter(x=>x.id===mockDrug.id).length,14);
assert(extended.rows.find(x=>x.caseId===extra.id&&x.id===mockDrug.id).targets.length);
assert.equal(extended.rows.find(x=>x.caseId==='CIRR-001'&&x.id===mockDrug.id).targets.length,0);
assert.deepEqual(extended.blockedEntries,['anticoagulation']);
console.log('CLINICAL PHARMACOLOGY COVERAGE AUDIT PASS',JSON.stringify({
 cases:audit.cases,actualPostBootCatalog:audit.entries,crossProduct:audit.pairs,
 blocked:audit.blockedEntries,conditional:audit.conditional,flaggedRiskPairs:audit.risks,
 dynamicPatientResponse:true,newDrugAndCaseCrossProduct:extended.pairs,
 mutatePatient:false,claimClinicalValidation:false,physicalAndroid:false}));
