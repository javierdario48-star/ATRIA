import test from 'node:test';
import assert from 'node:assert/strict';
import {createClinicalHintPresenter} from './clinical-hint-presenter.js';
const a={roomId:'R',encounterId:'A-care',patientUid:'A',actorId:'doctor',selectionRevision:1};
const hint={...a,status:'verified',offerId:'offer',text:'Una sola acción.',key:'action',chargeable:true};
function fixture(){
 let context=a,delayed=null;const requests=[],shown=[];
 const presenter=createClinicalHintPresenter({context:()=>context,request:async r=>{
  requests.push(r);if(delayed)return delayed;
  return r.op==='prepare'?{...a,status:'prepared',offerId:'offer'}:r.op==='revalidate'?hint:{status:'displayed',hintCount:1};
 },show:value=>{shown.push(value);return true;},hide:()=>{},notify:()=>{}});
 return {presenter,requests,shown,select:value=>context=value,delay:promise=>delayed=promise};
}
test('one patient-bound Vega instruction is displayed before its acknowledgement',async()=>{
 const f=fixture();await f.presenter.reveal();
 assert.deepEqual(f.requests.map(r=>r.op),['prepare','revalidate','displayed']);assert.equal(f.shown.length,1);
 assert.equal(f.shown[0].patientUid,'A');assert(f.requests.every(r=>r.patientUid==='A'&&r.encounterId==='A-care'));
});
test('late response for A cannot display or charge after selecting B',async()=>{
 const f=fixture();let finish;f.delay(new Promise(r=>finish=r));const pending=f.presenter.reveal();
 f.select({...a,patientUid:'B',encounterId:'B-care'});finish(hint);await pending;
 assert.equal(f.shown.length,0);assert(!f.requests.some(r=>r.op==='displayed'));
});
test('closing the encounter or changing guard discards a verified reply',async()=>{
 let state=a,resolve,started;const requests=[],shown=[],revalidation=new Promise(r=>started=r);
 const presenter=createClinicalHintPresenter({context:()=>state,show:v=>{shown.push(v);return true;},hide:()=>{},notify:()=>{},
  request:r=>{requests.push(r);return r.op==='prepare'?Promise.resolve({status:'prepared',offerId:'x'}):new Promise(r=>{resolve=r;started();});}});
 const pending=presenter.reveal();await revalidation;state=null;resolve(hint);await pending;
 assert.equal(shown.length,0);assert(!requests.some(r=>r.op==='displayed'));
});
test('a hint hidden before paint is discarded without an XP event',async()=>{
 const requests=[];let finish;const painter=new Promise(r=>finish=r);
 const p=createClinicalHintPresenter({context:()=>a,show:()=>true,hide:()=>{},notify:()=>{},paint:()=>painter,
  request:async r=>{requests.push(r);return r.op==='prepare'?{status:'prepared',offerId:'x'}:hint;}});
 const pending=p.reveal();await Promise.resolve();await Promise.resolve();p.cancel();finish();await pending;
 assert(!requests.some(r=>r.op==='displayed'));
});
test('one verified offer is requested immediately and displayed before billing',async()=>{
 const requests=[],events=[];let complete;
 const p=createClinicalHintPresenter({context:()=>a,hide:()=>{},notify:()=>{},pending:value=>events.push(['pending',value]),
  show:value=>{events.push(['show',value.text]);return true;},request:r=>{
   requests.push(r);
   if(r.op==='prepare')return new Promise(resolve=>complete=resolve);
   if(r.op==='revalidate')return Promise.resolve(hint);
   assert(events.some(row=>row[0]==='show'));return Promise.resolve({status:'displayed',hintCount:1});
  }});
 const first=p.reveal(),duplicate=p.reveal();
 assert.deepEqual(requests.map(r=>[r.op,r.verify]),[['prepare',true]]);
 assert.deepEqual(events,[['pending',true]]);
 complete(hint);await Promise.all([first,duplicate]);
 assert.deepEqual(requests.map(r=>r.op),['prepare','displayed']);
 assert(events.some(row=>row[0]==='show'&&row[1]===hint.text));
});
