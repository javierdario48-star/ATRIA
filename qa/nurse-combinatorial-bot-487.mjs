/**
 * QA-only Bot 1. Systematic 6-action subset/permutation covering (1..3),
 * reverse-paired 4-actions and larger mixes, plus ordered staged scenarios.
 * Real generated V412 nurse, native monitor and nursing task scripts; graphics,
 * physical gestures and nurse path collision are fixtures, NOT physical Android.
 */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createAndroidIntegratedRuntime487} from './android-integrated-runtime-487.mjs';
import {advanceLiveNativeJourney487 as advance} from './physiology-live/native-journey-487.mjs';
const A=[
 {text:'vías',id:'iv'},
 {text:'monitor',id:'monitor'},
 {text:'Ringer',id:'fluid'},
 {text:'oxígeno',id:'oxygen'},
 {text:'ceftriaxona',id:'ceftriaxone'},
 {text:'metronidazol',id:'metronidazole'}
];
const drugs=new Set(['fluid','oxygen','ceftriaxone','metronidazole']);
const ivDrugs=new Set(['fluid','ceftriaxone','metronidazole']);
function permute(a){return a.length<2?[a]:a.flatMap((x,i)=>permute(a.filter((_,j)=>j!==i)).map(rest=>[x,...rest]));}
function subsets(n,k,start=0,prefix=[]){
 if(k===0)return [prefix];
 return Array.from({length:n-start-k+1},(_,i)=>subsets(n,k-1,start+i+1,[...prefix,start+i])).flat();
}
const variants=[];
for(let k=1;k<=6;k++){
 for(const indices of subsets(A.length,k)){
  const seq=indices.map(i=>A[i]);
  const variantsForSubset=k<=3?permute(seq):k===4?[seq,[...seq].reverse()]:
   k===5?[seq,[...seq.slice(1),seq[0]]]:
   [seq,[...seq].reverse(),[...seq.slice(2),...seq.slice(0,2)]];
  for(const v of variantsForSubset)variants.push(v);
 }
}
const seen=new Set(),cases=[],errors=[];
const tick=(r,s)=>advance(r,s,{dt:1/6});
function run(label,steps,iv,caseId='PERI-SEC-001',repeat=false){
 const r=createAndroidIntegratedRuntime487(caseId,{confirmedIV:iv}),p=r.ctx.sim;
 try{
  const required=new Set(steps.flat().map(x=>x.id));
  for(let stepIndex=0;stepIndex<steps.length;stepIndex++){
   const step=steps[stepIndex];
   const joiner=stepIndex%3===0?' y ':stepIndex%3===1?', ':' ';
   const message='Enfermera '+step.map(x=>x.text).join(joiner);
   r.ctx.sendMessage(message);
   tick(r,stepIndex===steps.length-1?.25:.4);
   if(repeat&&stepIndex===0){r.ctx.sendMessage(message);tick(r,.15);}
  }
  // Native async preparation, bedside access and monitor completion.
  tick(r,48);
  const receipts=p.administrationLog.filter(x=>x.action!=='stop');
  for(const item of A.filter(x=>drugs.has(x.id))){
   const count=receipts.filter(x=>x.id===item.id).length;
   assert.equal(count,required.has(item.id)?1:0,'real dose count '+item.id);
   if(count){
    assert(p.monitorTherapies.has(item.id),'monitor missing real '+item.id);
    assert.equal(receipts.find(x=>x.id===item.id).defaultApplied,true,
      item.id+' uses native omitted-dose default');
   }
  }
  if(required.has('iv'))assert.equal(p.venousAccessCount,2,'plural vias must place two real IV');
  else if([...required].some(x=>ivDrugs.has(x)))assert(p.venousAccessCount>=1,'IV drugs require access');
  if(required.has('monitor'))assert.equal(p.monitorConnected,true,'monitor must be attached');
  assert(!receipts.some(x=>!required.has(x.id)),'no unintended drug administrations');
  cases.push({label,caseId,startIV:iv,steps:steps.map(s=>s.map(x=>x.id)),passed:true,
   endIV:p.venousAccessCount,monitor:p.monitorConnected,
   administrations:receipts.map(x=>({id:x.id,dose:x.doseDisplay,defaultApplied:x.defaultApplied})),
   simulatedRealSeconds:r.clock.realSeconds});
 }catch(e){
  const fail={label,caseId,startIV:iv,steps:steps.map(s=>s.map(x=>x.id)),passed:false,
   reason:e.message,access:p.venousAccessCount,monitor:p.monitorConnected,
   received:p.administrationLog.map(x=>({id:x.id,dose:x.doseDisplay})),
   pending:(p.csPhase4Pending487||[]).map(x=>x.id)};
  errors.push(fail);cases.push(fail);
 }
}
variants.forEach((seq,i)=>{
 const key=seq.map(x=>x.id).join(',');
 if(seen.has(key))return;seen.add(key);
 // These evaluate all subsets: both access states, permutations and split tokens.
 for(const iv of [0,1])run('combination-'+i,[seq],iv,
  i%4===0?'CIRR-001':'PERI-SEC-001');
});
// Ordered independent orders, including staged IV and later antibiotics.
const scenarios=[
 [['vías'],['monitor'],['Ringer'],['oxígeno'],['ceftriaxona','metronidazol']],
 [['monitor'],['vías'],['ceftriaxona','metronidazol'],['Ringer','oxígeno']],
 [['Ringer','oxígeno'],['vías'],['monitor'],['ceftriaxona','metronidazol']],
 [['ceftriaxona','metronidazol'],['monitor'],['vías'],['oxígeno','Ringer']],
 [['oxígeno'],['monitor'],['vías'],['metronidazol','ceftriaxona','Ringer']],
 [['vías','monitor'],['ceftriaxona'],['metronidazol'],['Ringer'],['oxígeno']],
 [['monitor','vías'],['Ringer'],['ceftriaxona','metronidazol','oxígeno']]
];
for(let i=0;i<scenarios.length;i++){
 const steps=scenarios[i].map(step=>step.map(w=>A.find(x=>x.text===w)));
 for(const iv of [0,1])run('sequence-'+i,steps,iv);
}
// A repeated *pending* composite request must not create a duplicate first dose.
for(const iv of [0,1])run('repeat-pending-all-IV',
 [[A[2],A[4],A[5]]],iv,'PERI-SEC-001',true);
const result={schema:'atria-nurse-combinations-qa/v1',scope:'generated Android native VM (no physical device)',
 sixActions:A.map(x=>x.id),strategy:'all permutations up to 3; 2 representative permutations per 4/5 subset; 3 for full six; plus ordered sequences',
 subsetSequences:variants.length,total:cases.length,passed:cases.length-errors.length,failed:errors.length,
 cases,failures:errors};
fs.mkdirSync('qa/android-fix-results',{recursive:true});
fs.writeFileSync('qa/android-fix-results/nurse-combinations.json',JSON.stringify(result,null,2)+'\n');
console.log('ATRIA NURSE COMBINATORIAL BOT',JSON.stringify({
 total:result.total,passed:result.passed,failed:result.failed,variants:variants.length,
 failures:errors.slice(0,12)}));
assert.equal(errors.length,0,'all requested procedures and medications must have real receipts');
