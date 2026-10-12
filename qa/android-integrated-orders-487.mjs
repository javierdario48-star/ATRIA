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
 {q:'vía',iv:1,meds:[]}
];
for(const spec of scenarios.filter(x=>!process.argv.includes('--checkpoint-b')||!x.absent)){
 const r=createAndroidIntegratedRuntime487('PERI-SEC-001',{confirmedIV:spec.confirmedIV||0}),p=r.ctx.sim;
 try{
  r.ctx.sendMessage('Enfermera '+spec.q);
  if(!spec.confirmedIV)assert.equal(p.venousAccessCount,0,'no access before native completion');
  advance(r,40,{dt:1/6});
  assert.equal(p.venousAccessCount,spec.iv,'actual IV count');
  if(spec.monitor)assert.equal(p.monitorConnected,true,'actual monitor connection');
  for(const id of spec.meds){
   const receipts=p.administrationLog.filter(x=>x.id===id);
   assert.equal(receipts.length,1,'one actual administration '+id);
   assert(p.monitorTherapies.has(id),'native active treatment '+id);
   if(spec.defaultDose)assert.equal(receipts[0].defaultApplied,true,'native default provenance '+id);
  }
  for(const id of spec.absent||[])assert(!p.administrationLog.some(x=>x.id===id),'invalid clause not administered '+id);
  rows.push({q:spec.q,pass:true,iv:p.venousAccessCount,monitor:p.monitorConnected,
   actual:p.administrationLog.map(x=>({id:x.id,dose:x.doseDisplay,defaultApplied:x.defaultApplied}))});
 }catch(e){rows.push({q:spec.q,pass:false,error:e.message,iv:p.venousAccessCount,
  monitor:p.monitorConnected,actual:p.administrationLog.map(x=>x.id)});errors.push(spec.q+': '+e.message);}
}
fs.mkdirSync('qa/android-fix-results',{recursive:true});
fs.writeFileSync('qa/android-fix-results/orders.json',JSON.stringify({
 scope:'generated native VM with late V412 nurse and send wrappers; local actor/DOM/path fixtures',
 scenarios:rows.length,passed:rows.filter(x=>x.pass).length,physicalAndroid:false,rows},null,2)+'\n');
console.log('ANDROID INTEGRATED ORDERS',JSON.stringify({scenarios:rows.length,passed:rows.filter(x=>x.pass).length,errors}));
assert.equal(errors.length,0,'integrated nursing regressions');
