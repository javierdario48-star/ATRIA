import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {createSqliteGuardStore} from '../../../qa/v5/sqlite-guard-store.mjs';
import {createDurableGuardAuthority} from './durable-guard-authority.js';
import {createClinicalHttp} from './clinical-http.js';
const read=n=>JSON.parse(readFileSync(new URL('../content/'+n+'.json',import.meta.url),'utf8'));
const content={map:read('hospital'),beds:read('beds'),cases:read('cases'),therapies:read('therapies'),defaultDoses:read('default-doses')};
for(const mode of ['solo','apprentice'])test('account '+mode+' uses one durable clinical clock and recovers its physical world',async()=>{
 const dir=mkdtempSync(path.join(tmpdir(),'atria-account-')),store=createSqliteGuardStore(path.join(dir,'g.sqlite'));let now=1700000000000;
 const build=()=>createClinicalHttp({authority:createDurableGuardAuthority({content,store,now:()=>now}),enabled:true,
  resolveActor:async()=>({id:'verified-doctor',account:{name:'Doctora Real'}}),
  verifiedRoom:async()=>{throw Error('personal guard must not require a second actor');},
  probe:async()=>({durable:true}),memberProfile:async m=>({...m,level:5,sex:'female',scrubColor:'pink'})});
 try{
  let route=build();const start=await route({method:'POST',body:{action:'start',roomId:'personal',caseId:'CIRR-001',mode,members:[{id:'forged'}],level:999}});
  assert.equal(start.status,200);assert.equal(start.body.spatial.doctors.length,1);
  assert.equal(start.body.spatial.doctors[0].id,'verified-doctor');
  assert.equal(start.body.spatial.doctors[0].level,5);
  assert.equal(start.body.spatial.doctors[0].color,'pink');
  assert.equal(start.body.clinical.room.mode,mode);
  now+=1000;route=build();const recovered=await route({method:'POST',body:{action:'sync',roomId:'personal'}});
  assert.equal(recovered.status,200);assert.equal(recovered.body.clinical.patient.uid,start.body.clinical.patient.uid);
  assert.equal(recovered.body.spatial.doctors[0].level,5);
  const raw=await store.read('personal');assert.equal(raw.value.runtime.members.length,1);
  assert.equal(raw.value.runtime.mode,mode);
 }finally{store.close();rmSync(dir,{recursive:true,force:true});}
});
