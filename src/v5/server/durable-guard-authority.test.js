import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
import {createSqliteGuardStore} from '../../../qa/v5/sqlite-guard-store.mjs';
import {createDurableGuardAuthority} from './durable-guard-authority.js';
const load=x=>JSON.parse(fs.readFileSync(new URL('../content/'+x+'.json',import.meta.url)));
const content={map:load('hospital'),beds:load('beds'),cases:load('cases'),therapies:load('therapies'),defaultDoses:load('default-doses')};
async function fixture(){
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'atria-recovery-')),filename=path.join(dir,'guard.sqlite');let clock=100000;
 let store=createSqliteGuardStore(filename),authority;
 function start(wrapper=s=>s){authority=createDurableGuardAuthority({store:wrapper(store),content,now:()=>clock});}
 start();await authority.bootstrap({roomId:'R',caseId:'PERI-PBE-001',members:[{id:'a',name:'A'},{id:'b',name:'B'}],hostId:'a',actorId:'a'});
 return {get authority(){return authority;},get store(){return store;},get clock(){return clock;},tick(ms){clock+=ms;},start,
  async restart(){store.close();store=createSqliteGuardStore(filename);start();},
  async read(){return (await store.read('R')).value;},
  async call(actorId='a',extra={}){return authority.transact({roomId:'R',actorId,...extra});},
  dispose(){store.close();fs.rmSync(dir,{recursive:true,force:true});}};
}
async function nearBed(f){const r=await f.read(),p=r.runtime.world.state.patients[0];
 // Use the actual map navigation target and path; no clinical context override.
 const {createWorld}=await import('../app/world.js');const w=createWorld(content,{id:'a',name:'A'});
 const target=w.navigation.center(...p.approach);await f.call('a',{motion:[target.x,target.y]});await f.call('b',{motion:[target.x,target.y]});
 f.tick(20000);await f.call();assert(await f.read());
}
test('disk/process recreation preserves pending nurse, preparation, aliases and same-event ACK after lost response',async()=>{
 const f=await fixture();try{
  await nearBed(f);
  const envelope={id:'dose',text:'Enfermera monitor y ceftriaxona 1 g y albumina 1.5 g/kg'};
  const ordered=await f.call('b',{commands:[envelope,{id:'study',text:'/estudio pbe_paracentesis'}]});
  assert.equal(ordered.acknowledgements[0].clinical.at(-1).status,'pending');assert.equal(ordered.clinical.patient.administrationLog.length,0);
  const before=await f.read();assert(before.runtime.session.waitingForAccess.length>0,'pending medication waits for real IV');
  await f.restart();f.tick(50000);const recovered=await f.call('a');
  assert.equal(recovered.clinical.patient.administrationLog.length,2);assert.equal(recovered.clinical.patient.orders[0].status,'done');
  const retry=await f.call('b',{commands:[envelope]});assert(retry.acknowledgements[0].clinical.every(x=>x.status==='executed'));
  assert.equal(retry.clinical.patient.administrationLog.length,2);assert.equal(new Set(retry.clinical.patient.administrationLog.map(x=>x.sourceEventId)).size,2);
  assert.equal(retry.clinical.patient.uid,ordered.clinical.patient.uid);assert.equal(retry.clinical.clock.gameMinute,70);
  assert.equal(retry.clinical.messages.filter(x=>x.id==='player:b:dose').length,1);
 }finally{f.dispose();}
});
test('concurrent orders serialize through one durable lease, reject stale ownership and retain original event identities',async()=>{
 const f=await fixture();try{await nearBed(f);
  const requests=[{actorId:'a',commands:[{id:'one',text:'Enfermera monitor'}]},{actorId:'b',commands:[{id:'two',text:'/estudio pbe_paracentesis'}]}];
  const results=await Promise.allSettled(requests.map(x=>f.authority.transact({roomId:'R',...x})));
  assert.equal(results.filter(x=>x.status==='fulfilled').length,1);
  const failed=results.findIndex(x=>x.status==='rejected');assert.equal(results[failed].reason.code,'busy');
  await f.authority.transact({roomId:'R',...requests[failed]});
  f.tick(45000);const final=await f.call();assert.equal(final.clinical.patient.orders.length,1);assert(final.clinical.patient.procedures.monitor.connected);
  assert.equal(final.clinical.room.transcript.length,2);assert.equal(final.clinical.patient.administrationLog.length,0);
  await assert.rejects(f.call('intruder'),e=>e.code==='forbidden');
 }finally{f.dispose();}
});
test('expired worker cannot publish or ACK after a new generation recovers; crash lease survives reopening',async()=>{
 const f=await fixture();try{
  let release,entered;const paused=new Promise(r=>release=r),started=new Promise(r=>entered=r);let writes=0;
  f.start(store=>({read:store.read,async compareAndSwap(...args){writes++;if(writes===2){entered();await paused;}return store.compareAndSwap(...args);}}));
  const old=f.call('a',{commands:[{id:'old',text:'Hola desde la autoridad anterior'}]});await started;
  const leased=await f.read();assert(leased.lease);f.tick(11000);
  const replacement=createDurableGuardAuthority({store:f.store,content,now:()=>f.clock});
  const winner=await replacement.transact({roomId:'R',actorId:'b',commands:[{id:'new',text:'Hola desde la recuperación'}]});
  release();await assert.rejects(old,e=>e.code==='fenced');
  assert(winner.epoch>leased.epoch);const saved=await f.read();assert.equal(saved.lease,null);
  assert.deepEqual(saved.runtime.session.authority.transcript.map(x=>x.id),['new']);
  await f.restart();const retried=await f.call('a',{commands:[{id:'old',text:'Hola desde la autoridad anterior'}]});
  assert.deepEqual(retried.clinical.room.transcript.map(x=>x.id),['new','old']);
 }finally{f.dispose();}
});
test('elapsed recovery is bounded without discarding time; abandonment reaches original shock/death once',async()=>{
 const f=await fixture();try{f.tick(480000);await f.restart();let recovered,calls=0;
  do{recovered=await f.call('b',{commands:[{id:'deferred',text:'Llegué después de la interrupción'}]});calls++;assert(calls<=9);}while(recovered.recovering);
  assert(calls>1);assert.equal(recovered.clinical.clock.gameMinute,480);assert(recovered.clinical.patient.patientDied);
  assert.equal(recovered.clinical.room.events.filter(x=>x.type==='clinical.patient-died').length,1);assert.equal(recovered.clinical.progress.xp,0);
  assert.equal(recovered.acknowledgements.length,1,'orders are admitted only after the entire catch-up');
  await f.restart();const again=await f.call('a');assert.equal(again.clinical.room.events.filter(x=>x.type==='clinical.patient-died').length,1);
 }finally{f.dispose();}
});

test('closing while a colleague is offline durably awards each doctor once across all reloads',async()=>{
 const f=await fixture();try{await nearBed(f);
  const texts=['¿Tiene cirrosis?','¿Tiene ascitis?','¿Tuvo fiebre?','¿Notó confusión?','/signos','/diagnostico PBE',
   ...['general','inspection','auscultation','percussion','palpation'].map(x=>'/examen '+x),
   '/estudio pbe_paracentesis','/estudio pbe_renal','Enfermera ceftriaxona 1 g y albumina 1.5 g/kg'];
  for(let n=0;n<texts.length;n++)await f.call('a',{commands:[{id:'care-'+n,text:texts[n]}]});
  f.tick(50000);const ready=await f.call('a');assert.deepEqual(ready.clinical.eligibleDestinations,['sala']);
  await f.call('a',{commands:[{id:'reassess',text:'/reevaluar'}]});
  const closed=await f.call('a',{commands:[{id:'close',text:'/disposicion sala'}]});assert(closed.clinical.patient.caseEnded);
  assert.equal(closed.claims.length,2);assert(closed.claims.every(([,r])=>r.xp===111));assert.equal(closed.clinical.progress.receipts.length,1);
  for(let n=0;n<3;n++){await f.restart();const recovered=await f.call('b',{commands:[{id:'close-again',text:'/disposicion sala'}]});
   assert.deepEqual(recovered.claims,closed.claims);assert.equal(recovered.clinical.progress.xp,111);
   assert.equal(recovered.acknowledgements[0].clinical[0].status,'rejected');
  }
 }finally{f.dispose();}
});

test('an original case without a migrated executor cannot create a durable clinical guard',async()=>{
 const f=await fixture();try{
  await assert.rejects(f.authority.bootstrap({roomId:'unsupported',caseId:'HDA-001',members:[{id:'a',name:'A'},{id:'b',name:'B'}],hostId:'a',actorId:'a'}),/migrated|supported/);
  assert.equal(await f.store.read('unsupported'),null,'no incomplete patient may be committed');
 }finally{f.dispose();}
});

test('independent Node processes contend on the same durable SQLite revision with exactly one winner',async()=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'atria-cas-processes-')),filename=path.join(dir,'guard.sqlite');
 const store=createSqliteGuardStore(filename);try{
  const etag=await store.compareAndSwap('R',null,{marker:'original'});
  const moduleUrl=new URL('../../../qa/v5/sqlite-guard-store.mjs',import.meta.url).href;
  const code=`import {createSqliteGuardStore} from ${JSON.stringify(moduleUrl)}; const [file,etag,marker]=process.argv.slice(1);const s=createSqliteGuardStore(file);try{console.log(JSON.stringify(await s.compareAndSwap('R',etag,{marker})));}finally{s.close();}`;
  const results=await Promise.all(['a','b'].map(marker=>promisify(execFile)(process.execPath,['--input-type=module','-e',code,filename,etag,marker])));
  assert.equal(results.map(x=>JSON.parse(x.stdout)).filter(Boolean).length,1);
  const final=await store.read('R');assert.equal(final.etag,'2');assert(['a','b'].includes(final.value.marker));
 }finally{store.close();fs.rmSync(dir,{recursive:true,force:true});}
});

test('real epoch timestamps cannot accumulate fractional-step drift during long recovery',async()=>{
 const f=await fixture();try{
  const old=await f.store.read('R');const epoch=1790000000000;
  old.value.runtime.lastWallMs=epoch;await f.store.compareAndSwap('R',old.etag,old.value);
  const server=createDurableGuardAuthority({store:f.store,content,now:()=>epoch+480000});let result;
  do{result=await server.transact({roomId:'R',actorId:'a'});}while(result.recovering);
  assert.equal(result.clinical.clock.gameMinute,480,'480,000 actual milliseconds require exactly 28,800 original world steps');
 }finally{f.dispose();}
});
