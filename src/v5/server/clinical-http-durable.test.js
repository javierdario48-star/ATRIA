import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {createSqliteGuardStore} from '../../../qa/v5/sqlite-guard-store.mjs';
import {createDurableGuardAuthority} from './durable-guard-authority.js';
import {createClinicalHttp,clinicalActorId} from './clinical-http.js';

const load=name=>JSON.parse(fs.readFileSync(new URL('../content/'+name+'.json',import.meta.url)));
const content={map:load('hospital'),beds:load('beds'),cases:load('cases'),
 therapies:load('therapies'),defaultDoses:load('default-doses')};
const hostKey='h'.repeat(64),guestKey='g'.repeat(64),strangerKey='s'.repeat(64);
const hostId=clinicalActorId(hostKey),guestId=clinicalActorId(guestKey);
const accepted={id:'test_room',mode:'coop',allAccepted:true,hostUserId:hostId,
 members:[{userId:hostId,name:'Host'},{userId:guestId,name:'Guest'}]};

test('HTTP → durable store → two clinical actors: recovery, actor fencing and replay',async()=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'atria-clinical-http-'));
 const file=path.join(dir,'clinical.sqlite');let store=createSqliteGuardStore(file),now=1700000000000,roomAvailable=true;
 const route=()=>createClinicalHttp({enabled:true,
  authority:createDurableGuardAuthority({store,content,now:()=>now}),
  verifiedRoom:async()=>roomAvailable?accepted:null,
  probe:async()=>({durable:true,kind:'test-atomic-cas'})});
 let http=route();
 const call=(key,action,extra={})=>http({method:'POST',headers:{},body:{
  clientKey:key,action,roomId:accepted.id,...extra}});
 try{
  const intruderStart=await call(guestKey,'start',{caseId:'PERI-PBE-001'});
  assert.equal(intruderStart.status,403,'nonhost cannot create clinical authority');
  const created=await call(hostKey,'start',{caseId:'PERI-PBE-001'});
  assert.equal(created.status,200);
  assert.equal(created.body.clinical.patient.caseId,'PERI-PBE-001');
  assert.equal((await call(hostKey,'start',{caseId:'PERI-PBE-001'})).status,409,
   'duplicate bootstrap must not overwrite existing patient');

  roomAvailable=false; // social cache disappeared, durable roster remains.
  const first=await call(guestKey,'sync',{commands:[{id:'greeting',text:'Hola desde la guardia'}]});
  assert.equal(first.status,200,'guest recovers without ephemeral social cache');
  assert.equal(first.body.acknowledgements.length,1);
  const savedPatient=first.body.clinical.patient.uid;
  store.close();store=createSqliteGuardStore(file);http=route();

  const repeat=await call(guestKey,'sync',{commands:[{id:'greeting',text:'Hola desde la guardia'}]});
  assert.equal(repeat.status,200,'guest can sync after service worker restart');
  assert.equal(repeat.body.clinical.patient.uid,savedPatient);
  assert.equal(repeat.body.clinical.room.transcript.filter(x=>x.id==='greeting').length,1,
   'the same command does not post twice after lost ACK');
  assert.equal((await call(strangerKey,'sync')).status,403,
   'a device outside durable roster must not become a physician');

  now+=5000;
  const hostReturn=await call(hostKey,'sync');
  assert.equal(hostReturn.status,200,'host resumes same saved guard');
  assert.equal(hostReturn.body.clinical.patient.uid,savedPatient);
  const db=await store.read(accepted.id);
  assert(db?.value?.runtime?.session,'checkpoint persisted in SQLite');
  assert.equal(db.value.runtime.session.authority.transcript.filter(x=>x.id==='greeting').length,1);
 }finally{
  store.close();fs.rmSync(dir,{recursive:true,force:true});
 }
});
