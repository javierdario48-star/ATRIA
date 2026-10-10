// Exhaustive, deterministic combinatorial nursing intent QA against ATRIA's
// shipped clinical catalogue. Clinical procedures are NOT executed in this
// lexical matrix; the native bedside/administration bots remain separate.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {csNurseScan487} from './nurse-scanner-487.js';
import {apply487} from '../integration/apply-487.js';

const original=fs.readFileSync('vendor/atria-4.8.6/index.html','utf8');
const begin=original.indexOf('const MONITOR_THERAPY_CATALOG=[');
const end=original.indexOf('function findMonitorTherapy(text){',begin);
assert(begin>0&&end>begin,'native therapy catalogue anchors must exist');
const nativeCatalogue=vm.runInNewContext(original.slice(begin,end)+';MONITOR_THERAPY_CATALOG');
assert(nativeCatalogue.length>=25,'catalogue unexpectedly shrunk');
assert.equal(new Set(Array.from(nativeCatalogue,x=>x.id)).size,nativeCatalogue.length,
 'native medication IDs must be unambiguous');
const casesTag='const CASES=';
const cs=original.indexOf(casesTag);
assert(cs>=0);
const cases=JSON.parse(original.slice(cs+casesTag.length).split('\n')[0].replace(/;\s*$/,''));
assert(cases.length>=13);

const preferred={
 oxygen:'oxígeno',fluid:'Ringer',albumin:'albúmina IV',
 vasopressor:'noradrenalina',morphine:'morfina',analgesia:'paracetamol',
 antiemetic:'ondansetron',ppi:'omeprazol',transfusion:'transfusión',
 paracentesis_ter:'paracentesis terapéutica',espironolactona:'espironolactona',
 steroid:'corticoide',aza:'azatioprina',ceftriaxone:'ceftriaxona',
 metronidazole:'metronidazol',imipenem:'imipenem',ceftazidime:'ceftazidima',
 cefoperazone:'cefoperazona',cefepime:'cefepime',
 piptazo:'piperacilina tazobactam',ampicillin:'ampicilina',
 amikacin:'amikacina',gentamicin:'gentamicina',fluconazole:'fluconazol',
 amphotericin:'anfotericina b',furosemide:'furosemida',
 beta_blocker:'propranolol'
};
// Intraabdominal surgery must remain a real referral; "suspender" is not
// permission to administer a drug. Both are tested as separate safety paths.
const excluded=new Set(['source_control','stop_beta_blocker']);
const therapyEntries=nativeCatalogue.filter(x=>!excluded.has(x.id)).map(x=>({
 id:x.id,kind:'therapy',phrase:preferred[x.id]||x.aliases?.[0]||x.label
}));
assert.equal(therapyEntries.length,nativeCatalogue.length-excluded.size,
 'every available ordinary native therapy covered');
const procedures=[
 {id:'monitor',kind:'monitor',phrase:'monitor'},
 {id:'iv',kind:'iv',phrase:'vías',count:2},
 {id:'vitals',kind:'vitals',phrase:'signos vitales'},
 {id:'cirugia',kind:'surgery',phrase:'cirugía'}
];
const entries=[...therapyEntries,...procedures];
const scan=text=>csNurseScan487(text,[],nativeCatalogue,[]);
function check(selected,format='plain'){
 const ordered=selected;
 const phrase='Enfermera '+(format==='commas'?
  ordered.map(x=>x.phrase).join(', '):ordered.map(x=>x.phrase).join(' '));
 const actual=scan(phrase);
 const wanted=ordered.map(x=>x.id);
 const got=actual.items.filter(x=>!x.negated).map(x=>x.id);
 assert.deepEqual(got,wanted,'nurse lost or changed an intent: '+phrase);
 assert.equal(actual.active,true,'valid instruction marked inactive: '+phrase);
 const iv=actual.items.find(x=>x.id==='iv');
 if(iv)assert.equal(iv.count,ordered.find(x=>x.id==='iv').count,
  'wrong one-vs-two IV semantics: '+phrase);
 // Every missing term should fail, not be silently swallowed.
 assert.equal(actual.unknown.length,0,'unrecognized residue: '+phrase+' -> '+actual.unknown.join('|'));
}
let exhaustive=0;
for(let k=1;k<=4;k++){
 const indices=Array.from({length:k},(_,i)=>i);
 while(true){
  const group=indices.map(i=>entries[i]);
  check(group);exhaustive++;
  if(k>1){check(group.slice().reverse(),'commas');exhaustive++;}
  let n=k-1;
  while(n>=0&&indices[n]===entries.length-k+n)n--;
  if(n<0)break;
  indices[n]++;
  for(let j=n+1;j<k;j++)indices[j]=indices[j-1]+1;
 }
}
const variants=[
 ['vía',1],['una vía',1],['1 vía',1],['vía periférica',1],
 ['vías',2],['dos vías',2],['2 vías',2],['vías periféricas',2],
 ['acceso venoso',1],['accesos venosos',2],['dos accesos periféricos',2]
];
let accessChecks=0;
for(const [phrase,count] of variants){
 const replacement={id:'iv',kind:'iv',phrase,count};
 check([replacement]);accessChecks++;
 for(const med of therapyEntries){
  for(const order of [[replacement,med],[med,replacement],
   [procedures[0],replacement,med],[med,replacement,procedures[2]]]){
    check(order);accessChecks++;
  }
 }
}
let seed=0x4872026;
function random(){
 seed=(Math.imul(seed,1664525)+1013904223)>>>0;
 return seed/4294967296;
}
let long=0;
for(let k=5;k<=entries.length;k++){
 for(let iteration=0;iteration<72;iteration++){
  const ordered=entries.slice();
  for(let i=ordered.length-1;i>0;i--){
   const j=Math.floor(random()*(i+1));
   [ordered[i],ordered[j]]=[ordered[j],ordered[i]];
  }
  check(ordered.slice(0,k),iteration%2?'commas':'plain');
  long++;
 }
}
check(entries,'plain');
check(entries.slice().reverse(),'commas');
long+=2;
// Case-specific studies and clinical interventions use actual case data,
// rather than a fabricated fixed list unrelated to ATRIA case files.
let studies=0,caseActions=0;
for(const c of cases){
 for(const st of c.studies||[]){
  // A bare 'TC', 'RX' or similarly underspecified abbreviation cannot
  // safely identify an exact case-specific study; use the full study label.
  const alias=st.label;
  const result=csNurseScan487('Enfermera monitor '+alias+' y vía',
   c.studies,nativeCatalogue,c.interventions);
  assert(result.items.some(x=>x.id===st.id&&x.kind==='study'),
   c.id+': nursing study not detected: '+alias);
  assert(result.items.some(x=>x.id==='iv'&&x.count===1),
   c.id+': singular peripheral line omitted next to '+alias);
  studies++;
 }
 for(const intervention of c.interventions||[]){
  if(intervention.id==='source_control'||intervention.id==='stop_beta_blocker')continue;
  const q='Enfermera '+(intervention.aliases?.[0]||intervention.label);
  const r=csNurseScan487(q,c.studies,nativeCatalogue,c.interventions);
  assert(r.items.some(x=>x.id===intervention.id),
   c.id+': case-specific intervention not detected: '+q);
  caseActions++;
 }
}
assert.equal(scan('Enfermera vía').items[0].count,1);
assert.equal(scan('Enfermera vías').items[0].count,2);
assert.equal(scan('Enfermera monitor y vía').items.at(-1).count,1);
assert.equal(scan('Enfermera monitor y vías').items.at(-1).count,2);
assert.equal(scan('Enfermera metronidazol').items.length,1,
 'asking only metronidazole must never imply ceftriaxone');
assert(scan('Enfermera no ceftriaxona').items.every(x=>x.negated),
 'negative commands cannot be executable');
assert.equal(scan('Enfermera ¿monitor?').active,false);
assert(scan('Enfermera suspender beta bloqueante').items.every(x=>x.negated),
 'suspension must not turn into administration');
assert(scan('Enfermera cirugía').items.some(x=>x.kind==='surgery'),
 'surgery is a referral, not a medication');
const fractional=scan('Enfermera noradrenalina 0,05 µg/kg/min');
assert.match(fractional.items.find(x=>x.id==='vasopressor')?.text||'',/0\.05/,
 'decimal-comma vasopressor amount must be preserved');

// Verify the legacy adapters independently using the ACTUAL compiled scripts.
const integrated=apply487(original);
const script=id=>{
 const marker='<script id="'+id+'">';
 assert.equal(integrated.split(marker).length,2,id+' must be injected once');
 return integrated.split(marker)[1].split('</script>')[0];
};
const context={
 window:{nsMayExamine:()=>true},C:{id:'PERI-SEC-001',studies:[],interventions:[]},
 sim:{caseEnded:false,venousAccessCount:0,monitorTherapies:new Map(),administrationLog:[]},
 nurseNatural:()=>false,sendMessage:()=>false,
 inferRecipient:()=>null,processCommand:()=>false,updateSimulation:()=>{},
 shiftSession:null,mayTreat:()=>true,nurseSay:()=>{},nurse:{queue:[],task:null},
 MONITOR_THERAPY_CATALOG:nativeCatalogue,
 norm:t=>String(t||'').toLowerCase().normalize('NFD')
  .replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9 ]/g,' ').replace(/\s+/g,' ').trim()
};
vm.createContext(context);
for(const id of ['atria-phase4-composite-orders','atria-phase7-nursing-receipts',
 'atria-nurse-voice-routing-487'])vm.runInContext(script(id),context,{timeout:5000});
let adapters=0;
for(let k=1;k<=12;k++){
 for(let j=0;j<20;j++){
  const offset=(j*7+k)%entries.length;
  const group=Array.from({length:k},(_,i)=>entries[(offset+i)%entries.length]);
  const cmd='Enfermera '+group.map(x=>x.phrase).join(' ');
  for(const name of ['csNursingParse487','csNurse487Parse']){
   const results=context.window[name](cmd);
   assert.deepEqual(Array.from(results,x=>x.id),group.map(x=>x.id),
    name+' silently discarded part of '+cmd);
   adapters++;
  }
 }
}
console.log('NURSE FULL CATALOG COMBINATORIAL BOT PASS '+JSON.stringify({
 nativeTherapies:therapyEntries.length,procedures:procedures.length,
 exhaustiveSubsetsTo4:exhaustive,venousAccessVariants:accessChecks,
 generatedSizes5ToAll:long,caseStudyChecks:studies,
 caseInterventionChecks:caseActions,integratedLegacyParses:adapters,
 allCatalogItemsCovered:true,physicalAndroid:false
}));
