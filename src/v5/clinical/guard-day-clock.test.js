import test from 'node:test';
import assert from 'node:assert/strict';
import {createGuardClock} from './guard-clock.js';
test('24 real minutes advance 24 visible guard hours (V4 contract), while pharmacology keeps its own rate',()=>{
 const clock=createGuardClock('24h-bot');
 const a=clock.advance(60,false);
 assert.equal(a.gameMinute,60,'60 actual seconds = 60 visible game minutes');
 assert.equal(a.clinicalMinute,a.gameMinute);
 assert(Math.abs(a.nativeMinute-7.2)<1e-9);
 const b=clock.advance(1380,false);
 assert.equal(b.gameMinute,1440,'1440 actual seconds = 1440 game minutes');
 assert(Math.abs(b.nativeMinute-172.8)<1e-8);
 const c=clock.advance(60,true);
 assert.equal(c.gameMinute,1500,'typing never freezes the game clock');
 assert(Math.abs(c.nativeMinute-174.6)<1e-8);
});
test('sealed native clock epochs preserve 24h visible time and never overflow after focus toggles',()=>{
 const clock=createGuardClock('typing-24h');
 for(let i=0;i<256;i++)clock.advance(1,i%2===0);
 const before=clock.read();
 const end=clock.advance(1440-256,false);
 assert.equal(end.gameMinute,1440);
 assert(end.sealedEpochs>0);
 assert(end.nativeMinute>before.nativeMinute);
 assert(end.segmentCount<=128);
});

test('two successive clinical patients have distinct receipt IDs and a cumulative shift clock',async()=>{
 const {createGuardSession}=await import('./guard-session.js');
 const {createProgressionLedger}=await import('./progression.js');
 const fs=await import('node:fs');
 const read=x=>JSON.parse(fs.readFileSync(new URL('../content/'+x+'.json',import.meta.url)));
 const data={cases:read('cases'),therapies:read('therapies'),defaultDoses:read('default-doses')};
 const ledger=createProgressionLedger();let total=0;
 for(let i=1;i<=2;i++){
  const s=createGuardSession({roomId:'shift:'+i,mode:'solo',actorId:'A',actorName:'A',
   patient:{uid:'shift-patient-'+i,caseId:'CIRR-001'},content:data,progress:ledger,
   resolveContext:()=>({patientUid:'shift-patient-'+i})});
  try{
   await s.post({id:'diagnosis',text:'/diagnostico cirrosis'});
   const r=await s.post({id:'closure',text:'/cierre-parcial observacion'});
   assert.equal(r.clinical[0].status,'executed');
   s.advance(12);total+=s.read().clock.gameMinute;
  }finally{s.dispose();}
 }
 assert.equal(total,24);
 assert.equal(ledger.read().receipts.length,2);
 assert.equal(new Set(ledger.read().receipts.map(r=>r.patientUid)).size,2);
});
