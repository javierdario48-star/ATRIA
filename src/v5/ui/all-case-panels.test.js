import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createGuardSession} from '../clinical/guard-session.js';
import {createClinicalInterface} from './clinical-controller.js';
const read=n=>JSON.parse(fs.readFileSync(new URL('../content/'+n+'.json',import.meta.url)));
const content={cases:read('cases'),therapies:read('therapies'),defaultDoses:read('default-doses')};
for(const c of content.cases)test('all actual clinical panels open without disrupting the scene / '+c.id,()=>{
 const session=createGuardSession({roomId:'panels-'+c.id,mode:'solo',actorId:'doctor',actorName:'Doctor',
  patient:{uid:'P1',caseId:c.id},content,resolveContext:()=>({patientUid:'P1'})});
 const document={getElementById:()=>null,querySelector:()=>null};
 const ui=createClinicalInterface({document,session:()=>session,open(){},close(){},send(){},onTalk(){},notify(){},
  cases:content.cases,therapies:content.therapies});
 try{
  for(const section of ['examination','clinical-history','treatment','studies'])
   assert.doesNotThrow(()=>ui.openSection({uid:'P1'},section),c.id+' / '+section);
  assert.equal(session.read().patient.administrationLog.length,0);
 }finally{session.dispose();}
});
