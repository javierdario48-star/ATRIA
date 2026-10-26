import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createPancCare} from './panc-care.js';
import {createProgressionLedger} from './progression.js';
import {physicalExamRows} from './physical-exam.js';
const c=JSON.parse(fs.readFileSync(new URL('../content/cases.json',import.meta.url))).find(x=>x.id==='PANC-001');
test('staged pancreatitis has honest abdominal examination and does not pretend hepatic injury',()=>{
 const p={liveVitals:{temp:38,hr:142,rr:28,sys:88,dia:54,spo2:92}};
 assert.match(physicalExamRows('PANC-001',p,'palpation','abdomen')[0].text,/epigástrica/);
 assert.match(physicalExamRows('PANC-001',p,'palpation','liver')[0].text,/Sin hallazgo específico modelado/);
});
test('pancreatitis cannot close before authentic examination, lipase, therapy, reassessment and ICU acceptance',()=>{
 const p={uid:'PANC-stage-QA',caseId:c.id,orders:[],treatments:[],administrationLog:[],
  adverseEvents:[],allergies:[],severeAllergies:[]};
 const care=createPancCare(p,c,{mode:'solo',defaultDoses:{},progress:createProgressionLedger(),cases:[c]});
 const r=care.readiness('uti');
 assert.equal(r.ready,false);
 assert(r.missing.some(x=>/estudio/i.test(x)));
 assert(r.missing.some(x=>/servicio receptor|UTI|uti/i.test(x)));
 assert.equal(p.caseEnded,false);
 assert.equal(p.closure,null);
 assert.deepEqual(p.administrationLog,[]);
 care.dispose();
});
