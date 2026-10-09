import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {apply487} from './apply-487.js';
const html=apply487(fs.readFileSync('vendor/atria-4.8.6/index.html','utf8'));
const marker='<script id="atria-nurse-voice-routing-487">';
assert.equal(html.split(marker).length,2,'single active nurse dispatcher');
const source=html.split(marker)[1].split('</script>')[0];
new vm.Script(source,{filename:'nurse-voice-runtime.js'});
const seed={id:'PERI-SEC-001',interventions:[
 {id:'ceftriaxone',label:'Ceftriaxona IV',aliases:['ceftriaxona']},
 {id:'metronidazole',label:'Metronidazol IV',aliases:['metronidazol']},
 {id:'fluid',label:'Reposición con cristaloides',aliases:['ringer','suero']},
 {id:'source_control',label:'Cirugía',aliases:['cirugia','quirofano']}],
 studies:[{id:'peri_cbc',label:'Hemograma',aliases:['hemograma']}]};
let C=seed,sim={caseEnded:false,venousAccessCount:0,monitorConnected:false,
 gameMinute:0,events:[],monitorTherapies:new Map(),orders:new Map(),administrationLog:[]};
const sent=[],nurse=[],tasks=[],operations=[],consults=[],renders=[];
const window={nsMayExamine:()=>true,csQueueMonitor:()=>{tasks.push('monitor');return true},
 csQueueIV:n=>{tasks.push('iv:'+n);return true},
 csSurgery487Request:()=>{consults.push('cirugia');nurse.push('Cirugía: solicitud en curso');return true}};
const ctx={window,sim,C,MONITOR_THERAPY_CATALOG:[
 {id:'oxygen',label:'Oxígeno suplementario',aliases:['oxigeno','o2']},
 {id:'fluid',label:'Ringer',aliases:['ringer','suero']}],
 norm:s=>String(s||'').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9 ]/g,' ').trim(),
 nurseNatural:q=>{operations.push(q);nurse.push('Recibido: '+q);(sim.csNurse487History??=[]).push({text:q});return true},
 sendMessage:q=>sent.push('old '+q),
 nurseSay:t=>nurse.push(t),
 addMonitorTherapy:txt=>{sim.monitorTherapies.set('oxygen',{id:'oxygen',label:'Oxígeno suplementario'});
   sim.administrationLog.push({id:'oxygen',label:'Oxígeno suplementario'});nurse.push('Oxígeno iniciado');return true},
 renderMonitorTherapies:()=>renders.push('therapy'),renderAdministrationHistory:()=>renders.push('history'),
 updateMonitorDOM:()=>renders.push('monitor'),
 addGlobalChat:(role,t)=>sent.push(role+': '+t),
 player:{bubble:'',bubbleUntil:0},performance:{now:()=>100},pendingAddress:null,chatRole:'patient',
 document:{getElementById:()=>null},refreshChatDock:()=>{}};
vm.runInNewContext(source,ctx,{timeout:4000});
ctx.sendMessage('enfermera monitor vias hemograma y honograma');
assert.deepEqual(tasks,['monitor','iv:1'],'independent real nurse procedures');
assert(operations.some(x=>x.includes('Hemograma')),'hemograma actually dispatched');
assert(nurse.some(x=>x.includes('honograma')),'unknown study gets explicit nurse rejection');
assert(nurse.some(x=>x.includes('recib')||x.includes('Recib')),'instant acknowledgment');
assert.equal(sent.filter(x=>x.startsWith('doctor: ')).length,1,'player message logged exactly once');
ctx.sendMessage('enfermera oxigeno 4 litros, ceftriaxona y metronidazol');
assert(sim.monitorTherapies.has('oxygen'),'oxygen started through nurse, no manual monitor');
assert(sim.administrationLog.some(x=>x.id==='oxygen'),'oxygen actually recorded in administration log');
assert.deepEqual(renders,['therapy','history','monitor'],'monitor active list, history and numeric metrics refresh');
assert(operations.some(x=>x.includes('ceftriaxona')));
assert(operations.some(x=>x.includes('metronidazol')));
ctx.nurseNatural('vías');
assert(tasks.includes('iv:1'),'nearby nurse understands bare vías without manual action');
ctx.nurseNatural('dos vías');
assert(tasks.includes('iv:2'),'bare two venous lines are understood');
ctx.sendMessage('enfermera cirugia');
assert.equal(consults.length,1,'consult requested rather than operation');
ctx.sendMessage('enfermera no cirugia');
assert.equal(consults.length,1,'negated request cannot execute');
assert(nurse.some(x=>x.includes('no ejecuté')),'nurse explains no action on negated instruction');
window.nsMayExamine=()=>false;ctx.sendMessage('enfermera dos vias');
assert(!tasks.includes('iv:2'),'spectator cannot alter care');
assert(nurse.some(x=>x.includes('No hay una atención activa')),'spectator gets explicit colored refusal');
console.log('NURSE VOICE RUNTIME BOTS PASS',JSON.stringify({multipleOrders:true,oxygenByNurse:true,
 caseStudy:true,surgicalConsult:true,negationSafe:true,permissions:true,receipts:true,physicalDevice:false}));
