import assert from 'node:assert/strict';
import fs from 'node:fs';
import {csDxNorm487,csDxCatalog487,csDxSuggest487,csDxSpecificity487,csDxMatchesCase487}
 from './diagnostic-impression-487.js';

// Seed contract: diagnoses are supplied by the existing case catalogue,
// so no manual widget update is required when a clinical case is added.
const source=fs.readFileSync('vendor/atria-4.8.6/index.html','utf8');
const line=source.slice(source.indexOf('const CASES=')+'const CASES='.length).split('\n')[0];
const cases=JSON.parse(line.replace(/;\s*$/,''));
assert(cases.length>=13,'baseline case corpus available');
const terms=csDxCatalog487(cases);
for(const c of cases){
 assert(c.dx?.length>0,c.id+' needs a diagnostic vocabulary');
 assert(csDxMatchesCase487(cases,c.id,c.dx[0]),c.id+' must match its canonical diagnosis');
 assert(terms.some(x=>x.aliases.some(a=>csDxNorm487(a)===csDxNorm487(c.dx[0]))),c.id+' must join global autocomplete');
}
assert.equal(csDxNorm487('PERITONÍTIS  secundaria'), 'peritonitis secundaria');
const p=csDxSuggest487(terms,'peritonitis',12);
assert(p.some(x=>/espontanea|espontánea/i.test(x)),'PBE appears globally');
assert(p.some(x=>/secundaria/i.test(x)),'secondary appears globally');
assert(p.some(x=>/terciaria/i.test(x)),'tertiary appears globally');
assert(p.some(x=>/perforaci[oó]n/i.test(x)),'perforation appears as concrete selectable phrase');
assert.equal(csDxSpecificity487(cases,'peritonitis').level,'broad','generic peritonitis is not sufficient');
assert.equal(csDxSpecificity487(cases,'abdomen agudo').level,'broad');
assert.equal(csDxSpecificity487(cases,'peritonitis secundaria').level,'specific');
assert(!csDxMatchesCase487(cases,'PERI-SEC-001','peritonitis'),'unspecified peritonitis never earns disease match');
assert(!csDxMatchesCase487(cases,'PERI-PBE-001','peritonitis secundaria'),'wrong subtype not credited');
assert(csDxMatchesCase487(cases,'PERI-PBE-001','PBE'),'common acronym credited');
assert(csDxMatchesCase487(cases,'PERI-SEC-001','peritonitis por perforación'));
assert(csDxMatchesCase487(cases,'PERI-SEC-001','abdomen agudo perforativo'));
assert(csDxMatchesCase487(cases,'PERI-TER-001','peritonitis posoperatoria persistente'));
const added=[...cases,{id:'NEW-CLINICAL-001',dx:['Síndrome clínico nuevo','Enfermedad clínica nueva']}];
const newTerms=csDxCatalog487(added);
assert(csDxSuggest487(newTerms,'síndrome clínico',12).some(x=>x==='Síndrome clínico nuevo'),
 'a new case automatically adds its diagnoses to autocomplete');
assert(csDxMatchesCase487(added,'NEW-CLINICAL-001','síndrome clínico nuevo'),
 'a new case automatically participates in diagnosis matching');
assert(!csDxSuggest487(terms,'síndrome clínico',12).some(x=>x==='Síndrome clínico nuevo'),
 'baseline remains unmutated');
assert.deepEqual(csDxSuggest487(terms,'p',8),[],'one character does not flood the screen');
assert.equal(csDxSpecificity487(cases,'').level,'empty');
assert(!csDxMatchesCase487(cases,'PERI-SEC-001','diagnóstico inventado'));
console.log('DIAGNOSTIC AUTOCOMPLETE BOTS PASS',JSON.stringify({
 existingCases:cases.length, globalTerms:terms.length,subtypeSuggestions:p.length,
 newCaseAutoIncluded:true,unspecifiedDiagnosisDenied:true
}));
