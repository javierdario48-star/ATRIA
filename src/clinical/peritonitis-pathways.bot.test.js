// Source-level clinical bots. Simulate real question/exam/order/admin/consult/result transitions
// in the exact per-patient state shape consumed by ATRIA; no browser or fake "already done" shortcuts.
import assert from 'node:assert/strict';
import {csPeritonitisEvaluate487,csPeritonitisSnapshot487} from './peritonitis-pathways.js';

function patient(id,{sys=115,spo2=97}={}) {
  const c={id},s={
    diagnosis:'',intentHistory:[],examDone:false,examRegions:new Set(),
    lastVitalsKnown:false,orders:new Map(),administrationLog:[],consults:new Map(),
    liveVitals:{sys,spo2},phys:{sourceControlled:false},patientDied:false,caseEnded:false
  };
  const bot={
    s,c,logs:[],
    state(){return csPeritonitisEvaluate487(csPeritonitisSnapshot487(s,c));},
    check(label,expected){const e=this.state();assert.equal(e.ready,expected,id+': '+label+' '+JSON.stringify(e.missing));this.logs.push({step:label,ready:e.ready,missing:[...e.missing]});return e;},
    talk(n=1){for(let i=0;i<n;i++)s.intentHistory.push({id:'onset'+i,reveal:'Evolución del paciente'});return this;},
    vitals(){s.lastVitalsKnown=true;return this;},
    exam(){s.examDone=true;return this;},
    dx(x){s.diagnosis=x;return this;},
    order(id,status='pending'){s.orders.set(id,{id,status});return this;},
    result(id){assert(s.orders.has(id));s.orders.get(id).status='done';return this;},
    prescribe(id){s.pendingTherapies??=new Map();s.pendingTherapies.set(id,{status:'pending'});return this;},
    administer(id){s.pendingTherapies?.delete(id);s.administrationLog.push({id,label:id});return this;},
    consult(id,status='pending'){s.consults.set(id,{status});return this;},
    answered(id){s.consults.get(id).status='done';return this;},
    sourceControlled(){s.phys.sourceControlled=true;return this;}
  };
  return bot;
}
const results=[];
function finish(bot,label,destination){
  const e=bot.check(label,true);assert.equal(e.action,destination);
  results.push({caseId:bot.c.id,scenario:label,action:e.action,steps:bot.logs.length});
}
{
 const b=patient('PERI-PBE-001');
 b.check('diagnosis guessed without evidence',false);
 b.dx('peritonitis bacteriana espontánea').talk().vitals().exam().order('pbe_paracentesis').prescribe('ceftriaxone').prescribe('albumin');
 b.check('all orders merely pending',false);
 b.result('pbe_paracentesis').check('no medications actually administered',false);
 b.administer('ceftriaxone').check('missing albumin',false);
 b.administer('albumin');
 finish(b,'SBP confirmed and treated; renal study optional for handoff', 'sala');
 assert.equal(b.s.phys.sourceControlled,false,'SBP is medical, not surgical');
 const u=patient('PERI-PBE-001',{sys:82});
 u.dx('PBE').talk().exam().vitals().order('pbe_paracentesis','done')
  .administer('ceftriaxone').administer('albumin');
 u.check('shock not treated',false);
 u.administer('fluid');finish(u,'SBP hypotension: transfer to UTI', 'uti');
}
{
 const b=patient('PERI-SEC-001',{sys:110});
 b.dx('peritonitis secundaria').talk().vitals().exam().order('peri_ct');
 b.check('CT requested is not a result',false);
 b.result('peri_ct').administer('ceftriaxone').administer('metronidazole').consult('cirugia');
 b.check('surgical consultation pending is not accepted',false);
 b.answered('cirugia');
 finish(b,'secondary peritonitis safe surgical handoff without simulated surgery','quirofano');
 assert.equal(b.s.phys.sourceControlled,false,'referral must not impersonate surgery');
 const alternate=patient('PERI-SEC-001',{sys:105});
 alternate.dx('diverticulitis perforada').talk().vitals().exam()
 .order('peri_rx','done').administer('piptazo').consult('cirugia','done');
 finish(alternate,'radiography + alternative antibiotic regimen','quirofano');
 const urgent=patient('PERI-SEC-001',{sys:78});
 urgent.dx('peritonitis secundaria').talk(2).vitals().exam()
 .administer('fluid').administer('ceftriaxone').administer('metronidazole').consult('cirugia','done');
 finish(urgent,'emergency surgical transfer before CT','quirofano');
 const wrong=patient('PERI-SEC-001');
 wrong.dx('peritonitis secundaria').talk().vitals().exam().order('peri_ct','done').consult('cirugia','done');
 wrong.administer('ceftriaxone');
 wrong.check('anaerobic coverage absent',false);
 wrong.administer('metronidazole');
 finish(wrong,'added anaerobic coverage','quirofano');
}
{
 const b=patient('PERI-TER-001',{sys:101});
 b.dx('peritonitis terciaria').talk().exam().vitals().order('ter_ct','done');
 b.administer('ampicillin').administer('amikacin').consult('uti','done');
 b.check('missing antifungal from seed-specific legacy combination',false);
 b.administer('fluconazole');
 finish(b,'persistent infection treated, no gratuitous repeat surgery','sala');
 const alternative=patient('PERI-TER-001',{sys:92});
 alternative.dx('peritonitis terciaria').talk().exam().vitals()
 .order('ter_culture','done').administer('imipenem').consult('uti','done');
 finish(alternative,'alternative broad-spectrum treatment and a culture','sala');
 const severe=patient('PERI-TER-001',{sys:78,spo2:86});
 severe.dx('peritonitis terciaria').talk(2).exam().vitals()
 .administer('fluid').administer('oxygen').administer('imipenem').consult('uti','done');
 finish(severe,'urgent ICU transfer before CT or culture','uti');
}
for(const id of ['PERI-PBE-001','PERI-SEC-001','PERI-TER-001']){
 const g=patient(id);
 g.dx(id==='PERI-PBE-001'?'pbe':id==='PERI-SEC-001'?'peritonitis secundaria':'peritonitis terciaria');
 g.check('guessing diagnosis alone never resolves',false);
 g.s.patientDied=true;g.check('death cannot grant ready state',false);
}
assert.equal(csPeritonitisEvaluate487({caseId:'PANC-001'}),null,'non-peritonitis cases untouched');
console.log('PERITONITIS PATHWAY BOTS PASS '+JSON.stringify({positive:results.length,negative:13,results}));
