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
  await check('coop-guest-first-bedside-question',async()=>{
   const visitor=h.clients[1].page,owner=h.clients[0].page;
   await visitor.evaluate(()=>{
    const a=csV41Challenge.patients[0].instance.bed.approach;
    const g=nearestPassable(a[0],a[1],8)||a;
    setPlayerTarget(...worldToScreen((g[0]+.5)*TW,(g[1]+.5)*TH));
   });
   await visitor.waitForFunction(()=>{
    const a=csV41Challenge.patients[0]?.instance?.bed?.approach;
    if(!a)return false;const g=nearestPassable(a[0],a[1],8)||a;
    return Math.hypot(player.x-(g[0]+.5)*TW,player.y-(g[1]+.5)*TH)<52;
   },{},{timeout:30000});
   await visitor.evaluate(()=>csSendPeerState());
   await new Promise(r=>setTimeout(r,1200));
   const phrase='¿Dónde te duele ahora, paciente?';
   assert.equal(await visitor.evaluate(()=>sim.__csRoomSpectator),true,'visitor has not selected the patient');
   await h.send(1,phrase);
   await owner.waitForFunction(t=>sim.chats.patient.some(x=>x[0]==='doctor'&&x[1].includes(t)),phrase,{timeout:25000});
   await owner.waitForFunction(()=>sim.chats.patient.some(x=>x[0]==='patient'),{},{timeout:25000});
   await visitor.waitForFunction(t=>sim.globalChat.some(x=>x[0]==='doctor'&&x[1].includes(t)),phrase);
   const a=await h.snapshot();
   assert(a[0].chat.some(x=>x[0]==='doctor'&&x[1].includes(phrase)),'native owner transcript has guest question');
   assert(a[1].chat.some(x=>x[0]==='doctor'&&x[1].includes(phrase)),'guest transcript does not disappear');
   assert.equal(a[0].administrations.length,0,'bedside question does not use nursing');
   console.log('COOP_BEDSIDE_GUEST_HEARD',JSON.stringify({players:count,guest:1,owner:0,realNativeAnamnesis:true,noNurseFirst:true}));
  });
 }
 if(stage==='C'){
  await h.startGuard('coop','HDA-001');
  await check('party-host-speaks-before-any-nurse-when-guest-owns-patient',async()=>{
   await h.select(1);
   const clinicalOwner=h.clients[1].page,partyHost=h.clients[0].page;
   await h.send(1,'Paciente, ¿qué molestias tiene?');
   await clinicalOwner.waitForFunction(()=>sim.chats.patient.some(x=>x[0]==='patient'),{},{timeout:20000});
   await partyHost.evaluate(()=>{
    const a=csV41Challenge.patients[0].instance.bed.approach;
    const g=nearestPassable(a[0],a[1],8)||a;
    setPlayerTarget(...worldToScreen((g[0]+.5)*TW,(g[1]+.5)*TH));
   });
   await partyHost.waitForFunction(()=>{
    const a=csV41Challenge.patients[0]?.instance?.bed?.approach;
    if(!a)return false;const g=nearestPassable(a[0],a[1],8)||a;
    return Math.hypot(player.x-(g[0]+.5)*TW,player.y-(g[1]+.5)*TH)<52;
   },{},{timeout:30000});
   await partyHost.evaluate(()=>csSendPeerState());
   await new Promise(r=>setTimeout(r,1200));
   const phrase='¿Desde cuándo comenzaron los síntomas?';
   await h.send(0,phrase);
   await clinicalOwner.waitForFunction(t=>sim.chats.patient.some(x=>x[0]==='doctor'&&x[1].includes(t)),phrase,{timeout:25000});
   const snapshots=await h.snapshot();
   assert(snapshots[1].chat.some(x=>x[0]==='doctor'&&x[1].includes(phrase)));
   assert(snapshots[0].chat.some(x=>x[0]==='doctor'&&x[1].includes(phrase)));
   assert.equal(snapshots[1].administrations.length,0);
   console.log('COOP_HOST_CHAT_PRE_NURSE',JSON.stringify({players:count,owner:1,guest:0,patientHeard:true,realHTTP:true}));
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
 // The F/G combined suite stays in its existing cooperative guard. Race a
 // different guard only in the explicit I invocation with fresh participants.
 if(stage==='I'){
  await h.startGuard('competitive','PERI-SEC-001');
  await check('competitive-atomic-race',async()=>{
   const competitors=h.clients.length>2?h.clients.slice(1,3):h.clients.slice(0,2);
   // Move with the game's original pathfinder, never by setting coordinates.
   await Promise.all(competitors.map(async c=>{
    await c.page.waitForFunction(()=>csV41Challenge.patients[0]?.state==='waiting',{},{timeout:40000});
    await c.page.evaluate(()=>{
     const p=csV41Challenge.patients[0],a=p.instance?.bed?.approach;
     if(!a)throw Error('Native bed approach unavailable');
     const g=nearestPassable(a[0],a[1],8)||a;
     setPlayerTarget(...worldToScreen((g[0]+.5)*TW,(g[1]+.5)*TH));
    });
    await c.page.waitForFunction(()=>{
     const a=csV41Challenge.patients[0]?.instance?.bed?.approach;
     if(!a)return false;const g=nearestPassable(a[0],a[1],8)||a;
     return Math.hypot(player.x-(g[0]+.5)*TW,player.y-(g[1]+.5)*TH)<52;
    },{},{timeout:30000});
   }));
   // Let actual peer presence arrive before the host evaluates distance.
   await Promise.all(competitors.map(c=>c.page.evaluate(()=>csSendPeerState())));
   await new Promise(resolve=>setTimeout(resolve,1300));
   const uid=await h.clients[0].page.evaluate(()=>csV41Challenge.patients[0].uid);
   await Promise.all(competitors.map(c=>c.page.evaluate(()=>csV41TakePatient(0))));
   await Promise.all(h.clients.map(c=>c.page.waitForFunction(uid=>{
    const p=csV41Challenge.patients[0];return p?.uid===uid&&!!p.ownerId;
   },uid,{timeout:25000})));
   const views=await h.snapshot(),owners=views.map(v=>v.patients[0].ownerId);
   assert.equal(new Set(owners).size,1,'exactly one winner across all independent browsers');
   const winner=owners[0],winnerIndex=views.findIndex(v=>v.id===winner);
   assert(winnerIndex>=0,'winner is an authenticated member');
   assert(competitors.some(c=>views[h.clients.indexOf(c)].id===winner),'only a racing doctor can acquire ownership');
   await h.clients[winnerIndex].page.waitForFunction(uid=>sim?.patientInstance?.uid===uid&&!sim.__csRoomSpectator,uid,{timeout:20000});
   const initial=(await h.snapshot())[winnerIndex].administrations.length;
   const denied=competitors.find(c=>views[h.clients.indexOf(c)].id!==winner);
   assert(denied,'the simultaneous loser remains a legitimate read-only rival');
   await denied.page.evaluate(()=>csV41TakePatient(0)); // read-only observer
   // The observer intentionally hides the editable composer. Exercise the
   // native command boundary directly to ensure no hidden keyboard/API bypass.
   await denied.page.evaluate(()=>sendMessage('Enfermera ceftriaxona'));
   // Also inject an unauthorized clinical command through the REAL room API.
   await denied.page.evaluate(({uid})=>csCoop.dc.send(JSON.stringify({
    type:'cs_room_v411',kind:'assist',id:csV41Challenge.id,peerId:csV41Challenge.selfId,
    aid:csV41Challenge.selfId+':FORGED',index:0,uid,
    action:{kind:'therapy',text:'ceftriaxona'},x:player.x,y:player.y
   })),{uid});
   await new Promise(resolve=>setTimeout(resolve,2200));
   const after=await h.snapshot();
   assert(after.every(v=>v.patients[0].ownerId===winner),'rival packets cannot steal the patient');
   assert.equal(after[winnerIndex].administrations.length,initial,'rival text/packet cannot administer a drug');
   console.log('COMPETITIVE_ATOMIC_BROWSER',JSON.stringify({
    players:h.clients.length,challengers:competitors.map(c=>views[h.clients.indexOf(c)].id),winner,
    allViewsAgree:true,unauthorizedDoses:0,realHTTP:true}));
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
