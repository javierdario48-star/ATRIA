import assert from 'node:assert/strict';
import fs from 'node:fs';
import {csAnamnesisClassify,csAnamnesisFact} from './anamnesis-intents.js';
const src=fs.readFileSync('vendor/atria-4.8.6/index.html','utf8');
const mark='const CASES=',from=src.indexOf(mark)+mark.length;
assert.ok(from>=mark.length,'recover original 13 case fixtures');
let depth=0,quoted=false,escaped=false,end=-1;
for(let i=from;i<src.length;i++){const c=src[i];if(quoted){if(escaped)escaped=false;else if(c==='\\')escaped=true;else if(c==='"')quoted=false;continue}if(c==='"'){quoted=true;continue}if(c==='[')depth++;else if(c===']'&&--depth===0){end=i+1;break}}
const cases=JSON.parse(src.slice(from,end));
assert.equal(cases.length,13,'all 13 existing case fixtures');
const queries=[
 ['age','¿Cuántos años tenés?','common.age'],
 ['pmh','¿Tienes alguna otra enfermedad?','common.pmh'],
 ['pmh','¿Padeces alguna enfermedad crónica?','common.pmh'],
 ['surgeries','¿Te operaron antes?','common.surgeries'],
 ['meds','¿Qué medicación habitual tomás?','common.meds'],
 ['allergies','¿Sos alérgico a algo?','common.allergies'],
 ['familyHistory','¿Antecedentes familiares?','anamnesis.familyHistory'],
 ['habitsSummary','¿Qué hábitos tenés?','anamnesis.habitsSummary'],
 ['otherSymptoms','¿Tenés algún otro síntoma?','anamnesis.otherSymptoms'],
 ['reason','¿Por qué viniste a la guardia?','common.reason'],
 ['intensity','¿Cuánto te duele del 1 al 10?','common.pain'],
 ['tobacco','¿Fumás tabaco?','anamnesis.tobacco'],
 ['drugs','¿Consumís drogas?','anamnesis.drugs'],
 ['bowel','¿Cambios en las deposiciones?','anamnesis.bowel'],
 ['urinary','¿Cómo está la orina?','anamnesis.urinary'],
 ['dyspnea','¿Tenés falta de aire?','anamnesis.dyspnea'],
 ['occupation','¿En qué trabajás?','anamnesis.occupation'],
 ['sleep','¿Cómo dormís?','anamnesis.sleep'],
 ['nauseaVomiting','¿Tenés náuseas?','anamnesis.nauseaVomiting']
];
for(const c of cases)for(const [intent,q,source] of queries){
 const result=csAnamnesisFact(c,q);
 assert.equal(result?.intent,intent,c.id+': '+q);
 assert.equal(result.source,source,c.id+': data origin '+q);
 assert.ok(result.text,c.id+': must have authored response '+q);
 const evidence=source.split('.').reduce((x,k)=>x?.[k],c);
 assert.ok(Array.isArray(evidence)?evidence.includes(result.text):evidence===result.text,c.id+': exact provenance');
 assert.equal(result.caseId,c.id);
}
assert.equal(csAnamnesisClassify('¿Tienes alguna otra enfermedad?'),'pmh');
assert.notEqual(csAnamnesisClassify('enfermedad'),'age');
assert.equal(csAnamnesisClassify('¿Y cuántos años tiene?'),'age');
assert.equal(csAnamnesisClassify('tienes algun antecedente familair?'),null,'do not guess an incompatible data field from garbled transcription');
assert.equal(csAnamnesisFact({...cases[0],common:{...cases[0].common,pmh:undefined}},'¿Tenés otra enfermedad?').text,null,'missing fact cannot be fabricated');
assert.notEqual(csAnamnesisFact(cases[0],'¿Tenés otra enfermedad?').text,csAnamnesisFact(cases[1],'¿Tenés otra enfermedad?').text,'case-specific facts must not leak between boxes');
console.log('13-case deterministic anamnesis provenance matrix OK:',cases.length*queries.length,'records');
