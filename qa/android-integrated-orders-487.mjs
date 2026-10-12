import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createAndroidIntegratedRuntime487} from './android-integrated-runtime-487.mjs';
import {advanceLiveNativeJourney487 as advance} from './physiology-live/native-journey-487.mjs';
const rows=[],errors=[];
const scenarios=[
 ...['vías y monitor','monitor y vías','pon dos vías y monitor','accesos periféricos y monitor',
  'monitor, oxígeno y vías','vías, Ringer y oxígeno','monitor y después dos vías periféricas']
  .map(q=>({q,iv:2,monitor:/monitor/.test(q),meds:[...(/oxígeno/.test(q)?['oxygen']:[]),...(/Ringer/.test(q)?['fluid']:[])]})),
 ...['ceftriaxona y metronidazol','metronidazol y ceftriaxona','aplica ceftriaxona, metronidazol y Ringer',
  'vías, ceftriaxona y metronidazol','ceftriaxona 1 g y metronidazol 500 mg']
  .map(q=>({q,iv:/vías/.test(q)?2:1,confirmedIV:/vías/.test(q)?0:1,
   meds:['ceftriaxone','metronidazole',...(/Ringer/.test(q)?['fluid']:[])]})),
 ...['oxígeno','oxígeno y noradrenalina','vías, oxígeno y Ringer','coloca monitor y oxígeno',
  'oxígeno a 4 litros','oxígeno, ceftriaxona y metronidazol']
  .map(q=>({q,confirmedIV:1,iv:/vías/.test(q)?2:1,monitor:/monitor/.test(q),
   meds:['oxygen',...(/noradrenalina/.test(q)?['vasopressor']:[]),...(/Ringer/.test(q)?['fluid']:[]),
    ...(/ceftriaxona/.test(q)?['ceftriaxone','metronidazole']:[])]})),
 ...[['noradrenalina','vasopressor'],['ceftriaxona','ceftriaxone'],['metronidazol','metronidazole'],
  ['morfina','morphine'],['furosemida','furosemide'],['Ringer','fluid']]
  .map(([q,id])=>({q,confirmedIV:1,iv:1,meds:[id],defaultDose:true})),
 {q:'oxígeno y noradrenalina 0.05 mg IV',confirmedIV:1,iv:1,meds:['oxygen'],absent:['vasopressor']},
 {q:'oxígeno y noradrenalina oral',confirmedIV:1,iv:1,meds:['oxygen'],absent:['vasopressor']},
 {q:'oxígeno y noradrenalina en bolo IV',confirmedIV:1,iv:1,meds:['oxygen'],absent:['vasopressor']},
 {q:'oxígeno dar 0.5 mcg/kg/min noradrenalina IV',confirmedIV:1,iv:1,meds:['oxygen'],absent:['vasopressor'],doses:{oxygen:'4 L/min'}},
 {q:'ceftriaxona vía oral y oxígeno',confirmedIV:1,iv:1,meds:['oxygen'],absent:['ceftriaxone']},
 {q:'oxígeno y noradrenalina SC',confirmedIV:1,iv:1,meds:['oxygen'],absent:['vasopressor']},
 {q:'oxígeno y noradrenalina vía subcutánea',confirmedIV:1,iv:1,meds:['oxygen'],absent:['vasopressor']},
 {q:'dar 2 g de ceftriaxona y 250 mg de metronidazol',confirmedIV:1,iv:1,meds:['ceftriaxone','metronidazole'],doses:{ceftriaxone:'2 g',metronidazole:'250 mg'}},
 {q:'ceftriaxona 0 mg y oxígeno',confirmedIV:1,iv:1,meds:['oxygen'],absent:['ceftriaxone']},
 {q:'metronidazol -500 mg y oxígeno',confirmedIV:1,iv:1,meds:['oxygen'],absent:['metronidazole']},
 {q:'metronidazol -500 mg y oxígeno y noradrenalina',confirmedIV:1,iv:1,meds:['oxygen','vasopressor'],absent:['metronidazole']},
 {q:'ceftriaxona I.M. y oxígeno',confirmedIV:1,iv:1,meds:['oxygen'],absent:['ceftriaxone']},
 {q:'O2 y noradrenalina',confirmedIV:1,iv:1,meds:['oxygen','vasopressor']},
 {q:'vía',iv:1,meds:[]}
];
if(!process.argv.includes('--checkpoint-b')){
 const permute=a=>a.length===1?[a]:a.flatMap((x,i)=>permute(a.filter((_,j)=>j!==i)).map(p=>[x,...p]));
 for(const [words,meds,monitor] of [
  [['vías','monitor','oxígeno'],['oxygen'],true],
  [['ceftriaxona','metronidazol','oxígeno'],['ceftriaxone','metronidazole','oxygen'],false]
 ])for(const order of permute(words))for(const separator of [' y ',', ', ' ', ' y después '])
  for(const confirmedIV of [0,1])for(const caseId of ['PERI-SEC-001','CIRR-001']){
   const access=words.includes('vías')?'':'vías, ';
   scenarios.push({q:access+order.join(separator),iv:2,confirmedIV,caseId,meds,monitor});
  }
}
for(const spec of scenarios.filter(x=>!process.argv.includes('--checkpoint-b')||!x.absent)){
 const r=createAndroidIntegratedRuntime487(spec.caseId||'PERI-SEC-001',{confirmedIV:spec.confirmedIV||0}),p=r.ctx.sim;
 try{
  r.ctx.sendMessage('Enfermera '+spec.q);
  assert.equal(p.administrationLog.length,0,'accepted order is not an administered dose');
  if(!spec.confirmedIV)assert.equal(p.venousAccessCount,0,'no access before native completion');
  advance(r,40,{dt:1/6});
  assert.equal(p.venousAccessCount,spec.iv,'actual IV count');
  if(spec.monitor)assert.equal(p.monitorConnected,true,'actual monitor connection');
  for(const id of spec.meds){
   const receipts=p.administrationLog.filter(x=>x.id===id);
   assert.equal(receipts.length,1,'one actual administration '+id);
   assert(p.monitorTherapies.has(id),'native active treatment '+id);
   if(spec.doses?.[id]){
    assert.equal(receipts[0].doseDisplay,spec.doses[id],'dose belongs to its own clause');
    if(spec.q.startsWith('dar 2 g'))assert.equal(receipts[0].defaultApplied,false,'explicit prefix dose provenance');
   }
   const reported=(p.csNurse487History||[]).flatMap(h=>h.items).filter(x=>x.kind==='therapy'&&x.id===id);
   assert(reported.every(x=>x.status==='COMPLETED'),'execution receipts agree with actual dose '+id);
   if(spec.defaultDose)assert.equal(receipts[0].defaultApplied,true,'native default provenance '+id);
   if(spec.defaultDose){
    const therapy=r.ctx.findMonitorTherapy(spec.q);
    assert.equal(receipts[0].doseDisplay,r.ctx.defaultDoseForTherapy(therapy,spec.q).display,'exact native default dose');
   }
  }
  for(const id of spec.absent||[])assert(!p.administrationLog.some(x=>x.id===id),'invalid clause not administered '+id);
  rows.push({q:spec.q,caseId:spec.caseId||'PERI-SEC-001',pass:true,iv:p.venousAccessCount,monitor:p.monitorConnected,
   actual:p.administrationLog.map(x=>({id:x.id,dose:x.doseDisplay,defaultApplied:x.defaultApplied}))});
 }catch(e){rows.push({q:spec.q,pass:false,error:e.message,iv:p.venousAccessCount,
  monitor:p.monitorConnected,actual:p.administrationLog.map(x=>x.id)});errors.push(spec.q+': '+e.message);}
}
if(!process.argv.includes('--checkpoint-b')){
 const r=createAndroidIntegratedRuntime487(),p=r.ctx.sim;
 r.ctx.nurseNatural('Enfermera ceftriaxona y metronidazol');
 r.ctx.nurseNatural('Enfermera ceftriaxona y metronidazol');
 assert.equal(p.administrationLog.length,0,'no IV-dependent dose before cannulation');
 assert.equal(p.csPhase4Pending487.length,2,'both retained once before IV');
 r.ctx.nurseNatural('Enfermera vías');r.ctx.nurseNatural('Enfermera monitor y vías');
 advance(r,40,{dt:1/6});
 assert.equal(p.venousAccessCount,2,'pending/repeated access reaches two, not four');
 assert.equal(p.monitorConnected,true);
 for(const id of ['ceftriaxone','metronidazole'])assert.equal(p.administrationLog.filter(x=>x.id===id).length,1,'one pending dose '+id);
 assert.equal(p.csPhase4Pending487.length,0);
 rows.push({q:'repeated pending antibiotics + repeated IV/monitor',pass:true});
}
if(!process.argv.includes('--checkpoint-b'))for(const context of [false,true]){
 const r=createAndroidIntegratedRuntime487('PERI-SEC-001',{confirmedIV:1});
 try{
  if(context){r.ctx.sendMessage('Enfermera ceftriaxona y metronidazol');advance(r,1,{dt:1/6});}
  const before=r.ctx.sim.administrationLog.length;
  const accepted=r.ctx.nurseNatural('Enfermera aplica ambos antibióticos');
  assert.equal(accepted,context,'both antibiotics requires an identified pair');
  advance(r,1,{dt:1/6});
  assert.equal(r.ctx.sim.administrationLog.length-before,context?2:0,'two independent actual receipts or none');
  rows.push({q:'ambos antibióticos',context,pass:true});
 }catch(e){errors.push('ambos/'+context+': '+e.message);rows.push({q:'ambos antibióticos',context,pass:false,error:e.message});}
}
fs.mkdirSync('qa/android-fix-results',{recursive:true});
fs.writeFileSync('qa/android-fix-results/orders.json',JSON.stringify({
 scope:'generated native VM with late V412 nurse and send wrappers; local actor/DOM/path fixtures',
 scenarios:rows.length,passed:rows.filter(x=>x.pass).length,physicalAndroid:false,rows},null,2)+'\n');
console.log('ANDROID INTEGRATED ORDERS',JSON.stringify({scenarios:rows.length,passed:rows.filter(x=>x.pass).length,errors}));
assert.equal(errors.length,0,'integrated nursing regressions');
