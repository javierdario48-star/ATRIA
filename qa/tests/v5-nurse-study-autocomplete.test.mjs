import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {clinicalCompletions} from '../../src/v5/ui/clinical-autocomplete.js';
const cases=JSON.parse(fs.readFileSync(new URL('../../src/v5/content/cases.json',import.meta.url)));
const therapies=JSON.parse(fs.readFileSync(new URL('../../src/v5/content/therapies.json',import.meta.url)));
const studiesFor=caseId=>[...(cases.find(c=>c.id===caseId)?.studies||[]),...cases.flatMap(c=>c.studies||[])];
test('nurse suggestions include abdominal ultrasound from the entire clinical catalog',()=>{
 const ctx={caseId:'APP-001',cases,therapies,studies:studiesFor('APP-001'),limit:8};
 const found=clinicalCompletions('Enfermera, ecografía abdominal',ctx);
 assert.ok(found.some(x=>x.kind==='study'&&/ecograf/i.test(x.label)),JSON.stringify(found));
});
test('nurse autocomplete does not execute orders and retains case-specific study priority',()=>{
 const ctx={caseId:'CIRR-001',cases,therapies,studies:studiesFor('CIRR-001'),limit:8};
 const found=clinicalCompletions('Enfermera, eco',ctx);
 assert.ok(found.some(x=>x.label==='Ecografía abdominal'));
 assert.ok(found.every(x=>typeof x.replacement==='string'&&x.replacement.startsWith('Enfermera, ')));
});
