import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {clinicalCompletions,clinicalVocabulary,activeClinicalClause,
 replaceClinicalClause,shortNursePrefix,spellingSuggestions,
 correctEverydayBeforeSpace} from './clinical-autocomplete.js';
import {routeWardSpeech} from '../core/speech-router.js';
const cases=JSON.parse(fs.readFileSync(new URL('../content/cases.json',import.meta.url)));
const therapies=JSON.parse(fs.readFileSync(new URL('../content/therapies.json',import.meta.url)));
const context=id=>({caseId:id,cases,therapies});
const suggestion=(text,ctx,kind)=>clinicalCompletions(text,ctx).find(x=>!kind||x.kind===kind);
test('medical completion searches valid case study, common medical therapy and procedures',()=>{
 const c=context('CIRR-001');
 for(const [partial,label] of [['ceftr','Ceftriaxona'],['hemogra','Hemograma'],
  ['paracen','Paracentesis'],['album','Albúmina'],['furo','Furosemida'],['dos vi','Dos vías']]){
  const matches=clinicalCompletions('Enfermera, '+partial,c);
  assert(matches.some(x=>x.label.toLowerCase().includes(label.toLowerCase())),
   partial+' should find '+label);
  assert(matches.every(x=>x.replacement.startsWith('Enfermera, ')));
 }
 assert.equal(clinicalCompletions('Enfermera, xx',c).length,0);
 assert.equal(clinicalCompletions('Enfermera, c',c).length,0);
});
test('exact same engine serves chat and monitor and does not infer hidden case results',()=>{
 const c=context('APP-001');
 const chat=suggestion('Enfermera, ceftr',c);
 const mon=suggestion('ceftr',{...c,mode:'monitor'});
 assert(chat&&mon);
 assert.equal(chat.command,mon.command);
 assert.equal(chat.replacement,'Enfermera, '+chat.command);
 assert.equal(mon.replacement,mon.command);
 const appStudies=clinicalVocabulary(c).filter(x=>x.kind==='study').map(x=>x.id);
 assert(!appStudies.includes('study:hepatograma'),'only selected case studies are shown');
 assert(!JSON.stringify(clinicalCompletions('hemog',c)).includes('AST 82'));
});
test('chat completion replaces only final clause, preserving earlier combined orders',()=>{
 const initial='Enfermera, monitor y ceftr';
 assert.deepEqual(activeClinicalClause(initial),{query:'ceftr',start:21});
 const finish=suggestion(initial,context('CIRR-001'));
 assert(finish);
 assert.equal(finish.replacement,'Enfermera, monitor y '+finish.command);
 assert.equal(shortNursePrefix('Enfermera, monitor'),'Enfermera, monitor');
 assert.equal(replaceClinicalClause('Ringer','Ringer 500 ml'),'Enfermera, Ringer 500 ml');
});
test('safe fuzzy recognition offers corrections without editing a dose or clinical phrase',()=>{
 const c=context('PERI-PBE-001');
 for(const error of ['ceftriaxna','metronidazl','hemogarma']){
  const results=clinicalCompletions('Enfermera, '+error,c);
  assert(results.length>0,error);
 }
 assert.deepEqual(spellingSuggestions('Doctor qeu'),[
  {kind:'spelling',label:'que',replacement:'Doctor que'}]);
 assert.deepEqual(correctEverydayBeforeSpace('Enfemera',8),{value:'enfermera',cursor:9});
 assert.equal(correctEverydayBeforeSpace('500 mg',6),null,'numbers and dosage are never auto-corrected');
 assert.equal(correctEverydayBeforeSpace('metronidazl',11),null,'drug names never change without a tap');
});
test('suggestions remain display-only; the real speech router enforces patient identity and commands',()=>{
 const c=context('APP-001');
 const s=suggestion('Enfermera, ceftr',c);
 assert(s&&s.command);
 const response=routeWardSpeech(s.replacement,{
  patientUid:null,clinicalEvaluation:true,studies:cases[1].studies,therapies,
  interventions:cases[1].interventions
 });
 assert.equal(response.error,'no-patient-target');
 assert.equal(response.intents.length,0);
 assert(Object.keys(s).every(x=>!['patient','execute','administer'].includes(x)));
});
