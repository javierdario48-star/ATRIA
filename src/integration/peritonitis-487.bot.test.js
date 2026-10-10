// Integrated browserless DOM+clinical closure bot against the generated ATRIA HTML.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {apply487} from './apply-487.js';

const html=apply487(fs.readFileSync('vendor/atria-4.8.6/index.html','utf8'));
const marker='<script id="atria-peritonitis-487-disposition">';
assert.equal(html.split(marker).length,2,'disposition script is installed exactly once');
const source=html.split(marker)[1].split('</script>')[0];
new vm.Script(source,{filename:'peritonitis-runtime-script.js'});

function specimen(id,{sys=112,spo2=96}={}) {
  return {
    diagnosis:'',intentHistory:[],examDone:false,examRegions:new Set(),lastVitalsKnown:false,
    orders:new Map(),administrationLog:[],consults:new Map(),liveVitals:{sys,spo2},
    phys:{sourceControlled:false},patientDied:false,caseEnded:false,disposition:null
  };
}
const scenarios=[
  ['PERI-PBE-001','pbe','pbe_paracentesis',['ceftriaxone','albumin'],null,'sala',110],
  ['PERI-SEC-001','peritonitis secundaria','peri_ct',['ceftriaxone','metronidazole'],'cirugia','quirofano',110],
  ['PERI-TER-001','peritonitis terciaria','ter_ct',['ampicillin','amikacin','fluconazole'],'uti','sala',105]
];
let assertions=0;
for(const [id,dx,study,drugs,consult,dest,sys] of scenarios){
  const sim=specimen(id,{sys}),C={id},notifications=[],buttons=[],game={};
  const context={
    C,sim,patient:{x:110,y:230},performance:{now:()=>1000},
    window:{innerWidth:420,innerHeight:830,nsMayExamine:()=>true,
      nsExperienceEligible:()=>false,
      csSetDisposition:x=>{sim.disposition={id:x};return true;}},
    document:{body:{classList:{contains:()=>false},appendChild:b=>buttons.push(b)},
      createElement:tag=>({tag,style:{},textContent:'',onclick:null})},
    worldToScreen:()=>[205,325],
    nurseSay:t=>notifications.push(String(t)),
    csBreakdown:()=>({diagnosis:15,history:0,safety:5,studies:0,treatment:0,
      efficiency:5,penalty:0,score:25,safe:false,safeReasons:['legacy'],notes:[]}),
    updateSimulation:()=>true,
    finishCase:()=>{const result=context.csBreakdown();sim.caseEnded=true;
      game.receipt={score:result.score,safe:result.safe,xp:context.window.nsExperienceEligible()?100:0};}
  };
  vm.runInNewContext(source,context,{timeout:4000});
  const show=()=>context.window.csPeritonitisRefresh487();
  sim.diagnosis=dx;show();assert.equal(buttons.length,0,id+' must not show button for guessed diagnosis');assertions++;
  sim.intentHistory=[{id:'onset',reveal:'Curso previo'}];
  sim.lastVitalsKnown=true;sim.examDone=true;
  sim.orders.set(study,{id:study,status:'pending'});
  for(const drug of drugs)sim.administrationLog.push({id:drug});
  if(consult)sim.consults.set(consult,{status:'done'});
  show();assert.equal(buttons.length,id==='PERI-SEC-001'?1:0,id+' should expose accepted-surgery blockers but not an unsafe transfer');assertions++;
  if(id==='PERI-SEC-001'){
   assert.equal(buttons[0].textContent,'Cirugía aceptó · Ver pendientes');
   buttons[0].onclick();
   assert.equal(sim.disposition,null,'pending investigation cannot finalize handoff');
  }
  sim.orders.get(study).status='done';show();
  assert.equal(buttons.length,1,id+' verified pathway must show only one button');assertions++;
  assert.equal(buttons[0].textContent, {sala:'Internar en sala',uti:'Derivar a UTI',quirofano:'Derivar a quirófano'}[dest]);assertions++;
  show();assert.equal(notifications.filter(x=>x.includes('El manejo inicial está listo')||x.includes('completamos lo necesario')).length,1,id+' nurse must announce actual readiness once');assertions++;
  buttons[0].onclick();
  assert.equal(sim.disposition.id,dest);assertions++;
  assert.equal(sim.phys.sourceControlled,false,id+' bedside handoff must not pretend surgery finished');assertions++;
  assert.equal(game.receipt.safe,true,id+' must reward safe handoff');assertions++;
  assert.equal(game.receipt.xp,100,id+' XP must survive caseEnded transition');assertions++;
  assert.equal(buttons[0].style.display,'none',id+' remove bedside CTA after closure');assertions++;
}
{
 const C={id:'PERI-SEC-001'},sim=specimen(C.id),ui=[];
 sim.diagnosis='peritonitis secundaria';sim.intentHistory=[{id:'onset'}];sim.examDone=true;sim.lastVitalsKnown=true;
 sim.orders.set('peri_ct',{status:'done'});sim.administrationLog.push({id:'ceftriaxone'},{id:'metronidazole'});
 sim.consults.set('cirugia',{status:'done'});sim.disposition={id:'alta'};
 const c={C,sim,patient:{x:0,y:0},window:{nsMayExamine:()=>true,nsExperienceEligible:()=>true},
   document:{body:{classList:{contains:()=>false},appendChild:b=>ui.push(b)},createElement:()=>({style:{}})},
   performance:{now:()=>1},worldToScreen:()=>[30,30],nurseSay:()=>{},
   csBreakdown:()=>({score:99,safe:true,notes:[],safeReasons:[]}),updateSimulation:()=>{}};
 vm.runInNewContext(source,c,{timeout:4000});
 const b=c.csBreakdown();
 assert.equal(b.safe,false,'unsafe discharge must not get a safe score');assertions++;
 assert.equal(c.window.nsExperienceEligible(),false,'unsafe discharge must not earn XP');assertions++;
 c.window.csPeritonitisRefresh487();
 assert.equal(ui.length,0,'wrong existing destination does not spawn bedside action');assertions++;
}
{
 const C={id:'PANC-001'},sim=specimen(C.id);
 const c={C,sim,window:{nsExperienceEligible:()=>true},csBreakdown:()=>({score:43,safe:false}),
   CASES:[{id:'PERI-SEC-001',physiology:{coverageSets:[['ceftriaxone','metronidazole']]}},
     {id:'PERI-TER-001',physiology:{coverageSets:[['ampicillin','amikacin','fluconazole']]}},
     {id:'PERI-PBE-001',physiology:{coverageSets:[['ceftriaxone']]}}],
   updateSimulation:()=>{},document:{body:{classList:{contains:()=>false}}},
   performance:{now:()=>1}};
 vm.runInNewContext(source,c,{timeout:4000});
 assert.equal(c.csBreakdown().score,43,'non-peritonitis scorer untouched');assertions++;
 assert.equal(c.window.nsExperienceEligible(),true,'non-peritonitis XP policy untouched');assertions++;
 assert(c.CASES[0].physiology.coverageSets.some(a=>a.length===1&&a[0]==='piptazo'),'secondary piptazo must affect physiology');assertions++;
 assert(c.CASES[1].physiology.coverageSets.some(a=>a.includes('imipenem')&&a.includes('fluconazole')),'tertiary matched regimen must affect physiology');assertions++;
 assert(c.CASES[2].physiology.coverageSets.some(a=>a.length===1&&a[0]==='piptazo'),'SBP broader regimen must affect physiology');assertions++;
}
{
 // Screenshot reconstruction: shock, diagnosed abdomen, no interview/CT,
 // manual native medication receipts present, Surgery accepted.
 const C={id:'PERI-SEC-001'},sim=specimen(C.id,{sys:84,spo2:92}),buttons=[],spoke=[];
 C.vitals={bp:'86/50'};
 Object.assign(sim,{diagnosis:'peritonitis secundaria',lastVitalsKnown:true,examDone:true,nsCareBaseline:{sys:86}});
 for(const id of ['oxygen','fluid','ceftriaxone','metronidazole'])sim.administrationLog.push({id,m:3});
 sim.consults.set('cirugia',{status:'done',accepted:true});
 const ctx={C,sim,window:{nsMayExamine:()=>true,nsExperienceEligible:()=>false,
  csSetDisposition:id=>(sim.disposition={id},true)},
 document:{body:{classList:{contains:()=>false},appendChild:b=>buttons.push(b)},
  createElement:()=>({style:{},onclick:null,textContent:''})},
 performance:{now:()=>1000},nurseSay:x=>spoke.push(x),
 csBreakdown:()=>({notes:[],safeReasons:[],score:20,safe:false,diagnosis:15,history:0,safety:20,studies:0,treatment:8,efficiency:5}),
 finishCase:()=>{sim.caseEnded=true},updateSimulation:()=>{}};
 vm.runInNewContext(source,ctx,{timeout:4000});
 ctx.window.csPeritonitisRefresh487();
 assert.equal(buttons.length,1,'accepted, treated emergency must show a prominent disposition control');assertions++;
 assert.equal(buttons[0].textContent,'Derivar a quirófano');assertions++;
 assert.equal(buttons[0].style.bottom.includes('160px'),true,'handoff fixed on screen rather than off-camera box point');assertions++;
 buttons[0].onclick();
 assert.equal(sim.disposition.id,'quirofano');assertions++;
 assert.equal(sim.phys.sourceControlled,false,'handoff cannot invent a completed operation');assertions++;
}
console.log('PERITONITIS INTEGRATION BOT PASS',JSON.stringify({cases:3,assertions,scope:'compiled HTML script + fake DOM + actual path evaluator and reward transition',physicalDevice:false}));
