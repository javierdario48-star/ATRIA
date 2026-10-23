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
 assert.equal(suggestion('Enfermera, ceftr',{...c,mode:'monitor'}).command,mon.command,
  'monitor accepts the same spoken addressed query');
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
 assert.deepEqual(spellingSuggestions('hols'),[
  {kind:'spelling',label:'hola',replacement:'hola'}]);
 assert.deepEqual(correctEverydayBeforeSpace('hols',4),{value:'hola',cursor:4});
 assert.deepEqual(correctEverydayBeforeSpace('te pregintl',11),{value:'te pregunto',cursor:11});
 assert(spellingSuggestions('te pregintl').some(x=>x.replacement==='te pregunto'),
  'frequent Spanish conjugation with preceding context must be suggested');
 assert.equal(correctEverydayBeforeSpace('Enfermera, ceftriaxna',20),null,
  'nursing commands may not autocorrect medical terms');
 assert.equal(correctEverydayBeforeSpace('morfins',7),null,
  'pharmacological terms may only be chosen explicitly');
 assert.equal(correctEverydayBeforeSpace('hola',4),null,'correct words must stay intact');
 assert.equal(correctEverydayBeforeSpace('morfins',7),null,'unrecognized drug names are not guessed');
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


test('every offered nursing command is recognized by the real interpreter in its case',()=>{
 for(const c of cases){
  for(const item of clinicalVocabulary({...context(c.id),studies:c.studies})){
   const r=routeWardSpeech('Enfermera, '+item.command,{
    patientUid:'P',clinicalEvaluation:true,studies:c.studies,
    therapies,interventions:c.interventions,venousAccessCount:2
   });
   assert.equal(r.error,undefined,c.id+' / '+item.id+' / '+item.command+' '+r.error);
   assert(r.intents.length>0,c.id+' / '+item.id+' cannot become an inert button');
   if(item.kind==='study')
    assert(r.intents.some(x=>x.kind==='study.request'&&x.id===item.id.slice(6)),
     c.id+' / '+item.id+' must not silently select another study');
  }
 }
});
