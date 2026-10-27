import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {createSqliteGuardStore} from '../../../qa/v5/sqlite-guard-store.mjs';
import {createDurableGuardAuthority} from './durable-guard-authority.js';
import {createClinicalHttp} from './clinical-http.js';
import {createGuardRuntime} from '../clinical/guard-runtime.js';
const read=n=>JSON.parse(readFileSync(new URL('../content/'+n+'.json',import.meta.url),'utf8'));
const content={map:read('hospital'),beds:read('beds'),cases:read('cases'),therapies:read('therapies'),defaultDoses:read('default-doses')};
test('Postgres JSONB object ordering does not invalidate a selected guard on its first sync',async()=>{
 const runtime=await createGuardRuntime({content,roomId:'jsonb',mode:'solo',hostId:'a',members:[{id:'a',name:'A'}],
  nowMs:1000,guardSelection:{scope:'specific',selection:'FECAL-001'}});
 const checkpoint=await runtime.checkpoint();runtime.dispose();
 const p=checkpoint.guardSelection;
 checkpoint.guardSelection={scope:p.scope,caseIds:p.caseIds,version:p.version,selection:p.selection};
 const restored=await createGuardRuntime({content,roomId:'jsonb',nowMs:1001,checkpoint});
 try{assert.equal(restored.view().clinical.shift.guardSelection.scope,'specific');}
 finally{restored.dispose();}
});
for(const mode of ['solo','apprentice','coop','competitive'])for(const [scope,selection,multiplier] of [
 ['random','',1.5],['specialty','Gastroenterología',1.2],['specific','FECAL-001',1]
])test(`${mode}: ${scope} is server-selected, shared and survives service recreation and later admission`,async()=>{
 const dir=mkdtempSync(path.join(tmpdir(),'atria-selection-')),store=createSqliteGuardStore(path.join(dir,'g.sqlite'));
 let now=1700000000000,actorId='a';
 const build=()=>createClinicalHttp({authority:createDurableGuardAuthority({content,store,now:()=>now}),enabled:true,
  resolveActor:async()=>({id:actorId,account:{name:'Doctora'}}),probe:async()=>({durable:true}),
  verifiedRoom:async()=>({id:'selection',mode,allAccepted:true,hostUserId:'a',members:[{userId:'a',name:'A'},{userId:'b',name:'B'}]})});
 let route=build();const call=body=>route({method:'POST',body:{roomId:'selection',...body}});
 try{
  const started=await call({action:'start',mode,caseId:'FORGED',guardSelection:{scope,selection,multiplier:999,caseIds:['FORGED']},xp:999999});
  assert.equal(started.status,200);assert.deepEqual(started.body.clinical.shift.guardSelection,{scope,selection,multiplier});
  const saved=(await store.read('selection')).value.runtime;
  assert.equal(saved.guardSelection.version,1);assert.equal(saved.guardSelection.multiplier,undefined);
  assert.equal(saved.shift.caseSequence.length,6);
  if(scope==='specific')assert(saved.shift.caseSequence.every(id=>id==='FECAL-001'));
  else assert.equal(new Set(saved.shift.caseSequence).size,6,'randomized pool does not collapse into the first case');
  now+=180000;route=build();if(['coop','competitive'].includes(mode))actorId='b';
  let recovered;do{recovered=await call({action:'sync',guardSelection:{scope:'specific',selection:'CIRR-001'},multiplier:999});}while(recovered.body.recovering);
  assert.equal(recovered.status,200);assert.deepEqual(recovered.body.clinical.shift.guardSelection,{scope,selection,multiplier});
  assert.equal(recovered.body.clinical.shift.patients.length,mode==='competitive'?3:2);
  assert(Math.abs(recovered.body.clinical.shift.remainingSeconds-1260)<1e-8);
  assert.deepEqual(recovered.body.clinical.shift.patients.map(p=>p.caseId),saved.shift.caseSequence.slice(0,mode==='competitive'?3:2));
  const replay=await call({action:'start',mode,guardSelection:{scope:'specific',selection:'CIRR-001'}});
  assert.equal(replay.status,actorId==='b'?403:409);
 }finally{store.close();rmSync(dir,{recursive:true,force:true});}
});

test('invalid selection never creates a persistent guard; old guards retain their unbonused admission policy',async()=>{
 const dir=mkdtempSync(path.join(tmpdir(),'atria-selection-')),store=createSqliteGuardStore(path.join(dir,'g.sqlite'));
 const authority=createDurableGuardAuthority({content,store,now:()=>1700000000000});
 const base={roomId:'bad',actorId:'a',hostId:'a',mode:'solo',caseId:'FECAL-001',members:[{id:'a',name:'A'}]};
 try{
  for(const guardSelection of [{scope:'specialty',selection:'Cardiología'},{scope:'specific',selection:'FORGED'},{scope:'hack'},{}])
   await assert.rejects(authority.bootstrap({...base,guardSelection}),e=>e.code==='invalid');
  assert.equal(await store.read('bad'),null);
  const legacy=await authority.bootstrap({...base,roomId:'legacy'});
  assert.equal(legacy.clinical.patient.caseId,'FECAL-001');assert.equal(legacy.clinical.shift.guardSelection,null);
 }finally{store.close();rmSync(dir,{recursive:true,force:true});}
});
