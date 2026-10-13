import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {clinicalBrowserHarness487} from './clinical-browser-harness-487.mjs';
const count=Number(process.env.CLINICAL_PLAYERS)||2;
const stage=process.env.CLINICAL_STAGE||'F',scenario=process.env.CLINICAL_SCENARIO||'all';
const output=process.env.CLINICAL_OUTPUT||'/tmp/atria-clinical-browser-'+count;
await fs.mkdir(output,{recursive:true});
const h=await clinicalBrowserHarness487(count),checks=[];
async function check(label,fn){if(scenario!=='all'&&scenario!==label)return;try{await fn();checks.push({label,pass:true});console.log('CLINICAL_BROWSER_PASS',label)}catch(e){checks.push({label,pass:false,error:e.message});console.log('CLINICAL_BROWSER_FAIL',label,e.message)}}
try{
 if(stage==='F'||stage==='all'){
  await check('lobby-draft',async()=>{
   const a=h.clients[0].page;
   await a.locator('#dieInput').fill('Borrador que aún estoy escribiendo');
   await a.locator('#dieInput').evaluate(e=>e.setSelectionRange(7,12));
   await h.send(1,'Mensaje de B mientras A escribe');
   await a.waitForFunction(()=>nsLobby.messages.some(m=>m.text==='Mensaje de B mientras A escribe'));
   assert.deepEqual(await a.locator('#dieInput').evaluate(e=>({value:e.value,start:e.selectionStart,end:e.selectionEnd,focused:document.activeElement===e})),
    {value:'Borrador que aún estoy escribiendo',start:7,end:12,focused:true},'incoming lobby message must preserve the active native editor');
   assert(await a.evaluate(()=>document.body.classList.contains('keyboardOpen')),'keyboard remains open while typing');
  });
  await check('lobby-retry',async()=>{
   h.faults.push({remaining:1,match:a=>a.path==='/api/lobby/chat'&&a.body.text==='Aceptado con respuesta perdida'});
   await h.send(1,'Aceptado con respuesta perdida');
   await Promise.all(h.clients.map(c=>c.page.waitForFunction(()=>nsLobby.messages.some(m=>m.text==='Aceptado con respuesta perdida'))));
   const deadline=Date.now()+5000;
   while(h.requests.filter(r=>r.path==='/api/lobby/chat'&&r.body.text==='Aceptado con respuesta perdida').length<2&&Date.now()<deadline)await new Promise(r=>setTimeout(r,50));
   for(const c of h.clients)assert.equal(await c.page.evaluate(()=>nsLobby.messages.filter(m=>m.text==='Aceptado con respuesta perdida').length),1);
   assert(h.requests.filter(r=>r.path==='/api/lobby/chat'&&r.body.text==='Aceptado con respuesta perdida').length>=2,'lost response must be retried with the same event identity');
  });
  await h.startGuard('coop');
  await check('team-retry',async()=>{
   h.faults.push({remaining:1,match:a=>a.body.message?.kind==='team_chat'&&a.body.message.text==='Equipo con respuesta perdida'});
   await h.send(0,'/equipo Equipo con respuesta perdida');
   await Promise.all(h.clients.slice(1).map(c=>c.page.waitForFunction(()=>sim.globalChat.some(m=>m[1].includes('Equipo con respuesta perdida')))));
   await h.send(1,'/equipo Respuesta de B');
   await h.clients[0].page.waitForFunction(()=>sim.globalChat.some(m=>m[1].includes('Respuesta de B')));
   for(const c of h.clients.slice(1))assert.equal(await c.page.evaluate(()=>sim.globalChat.filter(m=>m[1].includes('Equipo con respuesta perdida')).length),1,'server retry must not duplicate transcript');
  });
  await check('npc-routing',async()=>{
   await h.select(0);
   await h.send(0,'Paciente, ¿desde cuándo tiene dolor?');
   await h.clients[1].page.waitForFunction(()=>sim.globalChat.some(m=>m[0]==='patient'));
   await h.send(0,'/equipo Solicitaré la tomografía');
   await h.clients[1].page.waitForFunction(()=>sim.globalChat.some(m=>m[1].includes('Solicitaré la tomografía')));
   const snapshots=await h.snapshot();
   assert(snapshots[0].chat.some(m=>m[0]==='patient'),'actual native patient answer');
   assert.equal(snapshots[0].administrations?.length||0,0,'social chat cannot execute medication');
  });
 }
 if(stage==='G'||stage==='all'){
  if(stage==='G')await h.startGuard('coop','PERI-SEC-001');
  await h.select(0);
  await check('combined-nursing',async()=>{
   await h.send(0,'Enfermera, pon vías, monitor, Ringer y oxígeno');
   await h.clients[0].page.waitForFunction(()=>sim.venousAccessCount===2&&sim.monitorConnected&&
    sim.administrationLog.some(a=>a.id==='fluid')&&sim.administrationLog.some(a=>a.id==='oxygen'),{},{timeout:40000});
   const s=(await h.snapshot())[0];
   assert.equal(s.administrations.filter(a=>a.id==='fluid').length,1);
   assert.equal(s.administrations.filter(a=>a.id==='oxygen').length,1);
   console.log('NATIVE_COMBINED_EXECUTION',JSON.stringify({iv:s.iv,monitor:s.monitor,administrations:s.administrations}));
  });
  await check('combined-antibiotics',async()=>{
   await h.send(0,'Enfermera ceftriaxona y metronidazol');
   await h.clients[0].page.waitForFunction(()=>sim.administrationLog.some(a=>a.id==='ceftriaxone')&&sim.administrationLog.some(a=>a.id==='metronidazole'),{},{timeout:25000});
   const a=(await h.snapshot())[0].administrations;
   assert.equal(a.filter(a=>a.id==='ceftriaxone').length,1);
   assert.equal(a.filter(a=>a.id==='metronidazole').length,1);
  });
  await check('deliberate-antibiotic-round',async()=>{
   await h.send(0,'Enfermera ceftriaxona y metronidazol');
   await h.clients[0].page.waitForFunction(()=>sim.administrationLog.filter(a=>a.id==='ceftriaxone').length===2&&sim.administrationLog.filter(a=>a.id==='metronidazole').length===2,{},{timeout:25000});
   const a=(await h.snapshot())[0].administrations;
   assert.equal(a.filter(a=>a.id==='ceftriaxone').at(-1).count,2,'a new deliberate order creates a native second exposure');
  });
 }
 assert.deepEqual(h.errors,[],'no browser runtime errors');
}finally{
 await fs.writeFile(output+'/report.json',JSON.stringify({stage,count,checks,errors:h.errors,snapshots:await h.snapshot(),requests:h.requests},null,2));
 for(let i=0;i<count;i++)await h.clients[i].page.screenshot({path:output+'/client-'+i+'.png'});
 await h.close();
}
assert(checks.every(c=>c.pass),JSON.stringify(checks.filter(c=>!c.pass)));
console.log('CLINICAL_INDEPENDENT_CLIENTS',JSON.stringify({stage,count,checks:checks.length,processes:count,realHTTP:true,androidEmulated:true,physicalAndroid:false}));
