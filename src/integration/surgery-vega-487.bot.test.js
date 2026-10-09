import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {apply487} from './apply-487.js';

const html=apply487(fs.readFileSync('vendor/atria-4.8.6/index.html','utf8'));
const surgery='<script id="atria-surgical-nursing-487">';
assert.equal(html.split(surgery).length,2,'surgical consult integrated exactly once');
const code=html.split(surgery)[1].split('</script>')[0];
new vm.Script(code,{filename:'surgery-nurse-runtime.js'});
const vega=html.slice(html.indexOf('<script id="ns422-vega-rescue">'),
 html.indexOf('</script>',html.indexOf('<script id="ns422-vega-rescue">')));
assert.match(vega,/function csVegaPriorityStudies487\(\)/);
assert.match(vega,/job\.phase='workup487'/);
assert.match(vega,/¿Lo pedís vos o lo pido yo\?/);
assert.match(vega,/¿La indicás vos o querés que lo haga yo\?/);
assert.match(vega,/const nextId=C\.keyInterventions\.find/);
assert.match(vega,/csVegaInterventionComplete487/);
assert.match(vega,/Los cultivos tardíos no detienen la guardia/);
assert.doesNotMatch(vega,/if\(C\.keyInterventions\.includes\('source_control'\)\)give\(job,'source_control'\)/,
 'Vega must not perform source control in the patient box');

let sim={
 diagnosis:'',lastVitalsKnown:false,examDone:false,examRegions:new Set(),liveVitals:{sys:84},orders:new Map(),
 consults:new Map(),events:[],gameMinute:0,caseEnded:false,patientDied:false
};
const C={id:'PERI-SEC-001',keyInterventions:['fluid','ceftriaxone','metronidazole','source_control'],
 vitals:{bp:'86/50'},dx:['peritonitis secundaria']};
const spoken=[],oldTreat=[],doctors=[],timeout=[];
const context={
 C,sim,window:{
  nsMayExamine:()=>true,
  csDx487:{matchesCase:(id,v)=>id==='PERI-SEC-001'&&/peritonitis secundaria/.test(v)},
  csWithPatientStateV203:(s,id,callback)=>callback(),
  csPeritonitisRefresh487:()=>{}
 },
 nurseSay:t=>spoken.push(t),
 nurseNatural:t=>{oldTreat.push(t);return true},
 addMonitorTherapy:t=>{oldTreat.push('monitor '+t);return true},
 processCommand:t=>{oldTreat.push('slash '+t);return true},
 sendMessage:t=>{oldTreat.push('chat '+t);return true},
 addGlobalChat:(role,t)=>doctors.push([role,t]),
 norm:t=>String(t).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().trim(),
 setTimeout:fn=>{timeout.push(fn);return timeout.length}
};
vm.runInNewContext(code,context,{timeout:3500});
context.nurseNatural('Enfermera cirugía');
assert.equal(timeout.length,1,'request creates one real response timer');
assert.equal(sim.consults.get('cirugia').status,'pending');
assert.match(spoken.at(-1),/Voy a solicitar evaluación/);
assert.equal(oldTreat.length,0,'surgery does not call a treatment or source control');
context.nurseNatural('Enfermera cirugía');
assert.equal(timeout.length,1,'duplicates do not create new timers');
assert.match(spoken.at(-1),/ya fue avisada/);
timeout.shift()();
assert.equal(sim.consults.get('cirugia').status,'rejected','without diagnostic impression specialist asks for one');
assert(spoken.at(-1).includes('Falta registrar'),'response is visible in nurse chat color');
sim.diagnosis='peritonitis secundaria';sim.lastVitalsKnown=true;sim.examDone=true;
context.nurseNatural('Enfermera quirófano');
assert.equal(timeout.length,1);
timeout.shift()();
assert.equal(sim.consults.get('cirugia').status,'done','clinical shock with examined abdomen gets accepted');
assert.match(spoken.at(-1),/Aceptamos el traslado/);
assert.equal(oldTreat.length,0,'no surgical procedure performed after acceptance');
context.nurseNatural('Enfermera cirugía');
assert.equal(timeout.length,0);
assert.match(spoken.at(-1),/ya aceptó/);
sim.consults.delete('cirugia');
context.nurseNatural('Enfermera, Ringer y cirugía');
assert.equal(oldTreat.filter(x=>x==='enfermera ringer').length,1,'mixed order preserves other treatment');
assert.equal(sim.consults.get('cirugia').status,'pending');
timeout.shift()();
sim.consults.delete('cirugia');
context.addMonitorTherapy('cirugía');
assert.equal(sim.consults.get('cirugia').status,'pending','monitor surgery uses consultation, never instant procedure');
assert.equal(oldTreat.filter(x=>x.startsWith('monitor')).length,0);
timeout.shift()();
sim.consults.delete('cirugia');
context.processCommand('/consulta cirugía');
assert.equal(sim.consults.get('cirugia').status,'pending','slash surgery reaches same consultation');
timeout.shift()();
assert.equal(sim.consults.get('cirugia').status,'done');
assert(spoken.length>=7);
console.log('SURGICAL NURSING + VEGA BOT PASS',JSON.stringify({
 surgeryRequests:6,nurseColorReceipts:true,duplicateSafe:true,mixedOrders:true,
 simulatedSpecialistReply:true,vegaStepsSourced:true,realMobile:false
}));
