// ATRIA shared chat regression: authentic native app, 2–4 independent browsers.
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {clinicalBrowserHarness487} from './clinical-browser-harness-487.mjs';
const count=Number(process.env.CLINICAL_PLAYERS)||2;
const output=process.env.CLINICAL_OUTPUT||'/tmp/atria-global-chat-'+count;
await fs.mkdir(output,{recursive:true});
const h=await clinicalBrowserHarness487(count),checks=[];
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
async function check(label,fn){try{await fn();checks.push({label,pass:true});console.log('GLOBAL_CHAT_BOT_PASS',label,count)}
 catch(e){checks.push({label,pass:false,error:e.stack||e.message});console.error('GLOBAL_CHAT_BOT_FAIL',label,e.stack||e.message)}}
async function allSee(text,role='doctor'){await Promise.all(h.clients.map(c=>c.page.waitForFunction(v=>
 sim?.globalChat?.some(x=>x[0]===v.role&&x[1].includes(v.text)),{text,role},{timeout:25000})))}
async function one(text,role='doctor'){await allSee(text,role);await sleep(1400);const states=await h.snapshot();
 for(const [k,s] of states.entries())assert.equal(s.chat.filter(x=>x[0]===role&&x[1].includes(text)).length,1,
 'client '+k+' has duplicate or missing message '+text);return states}
async function approach(i,index=0){const p=h.clients[i].page;await p.evaluate(index=>{
 const a=csV41Challenge.patients[index].instance.bed.approach,g=nearestPassable(a[0],a[1],8)||a;
 setPlayerTarget(...worldToScreen((g[0]+.5)*TW,(g[1]+.5)*TH))},index);
 await p.waitForFunction(index=>{const a=csV41Challenge.patients[index]?.instance?.bed?.approach;
 if(!a)return false;const g=nearestPassable(a[0],a[1],8)||a;
 return Math.hypot(player.x-(g[0]+.5)*TW,player.y-(g[1]+.5)*TH)<52},index,{timeout:30000});
 await p.evaluate(()=>csSendPeerState());await sleep(1200)}
try{
 await h.startGuard('coop','APP-001');
 await check('full-roster-ready-before-message-fanout',async()=>{
  await Promise.all(h.clients.map(c=>c.page.waitForFunction(n=>
   csV41Challenge.players?.length>=n&&csV41Challenge.players.every(p=>p.id&&p.name),
   count,{timeout:30000})));
  const rosters=await Promise.all(h.clients.map(c=>c.page.evaluate(()=>({
   self:csV41Challenge.selfId,players:csV41Challenge.players.map(p=>({id:p.id,name:p.name,online:p.online}))
  }))));
  console.log('GLOBAL_CHAT_ROSTERS',JSON.stringify(rosters));
  const actualIds=new Set(rosters.map(r=>r.self));
  for(const r of rosters)assert.deepEqual(new Set(r.players.map(p=>p.id)),actualIds,
   'all room participants must know every authenticated peer');
  await sleep(1600);
 });
 await check('all-physicians-meet-within-local-hearing-range',async()=>{
  await Promise.all(h.clients.map((_,i)=>approach(i)));
  const p=await Promise.all(h.clients.map(c=>c.page.evaluate(()=>({x:player.x,y:player.y}))));
  for(let i=0;i<p.length;i++)for(let j=i+1;j<p.length;j++)
   assert(Math.hypot(p[i].x-p[j].x,p[i].y-p[j].y)<=280,'clients must be nearby to hear each other');
 });
 await check('everyone-sends-unprefixed-message-correct-identity',async()=>{
  for(let i=0;i<count;i++){const msg='BOT_DOCTOR_'+count+'_'+i;
   await h.send(i,msg,{tap:i%2===0});const views=await one(msg);
   for(const s of views){assert(s.chat.some(x=>x[0]==='doctor'&&x[1].includes(h.clients[i].name+': '+msg)),
     'lost true author '+i);assert(!s.chat.some(x=>x[0]==='system'&&x[1].includes(msg)))}}
 });
 await check('remote-avatar-shows-nearby-speech-bubble',async()=>{
  const painter=h.clients[0].page;
  await painter.evaluate(()=>{
   window.__atriaPaintedChat487=[];
   window.__atriaOriginalSpeech487=speech;
   speech=function(...args){
    if(String(args[0]).startsWith('BOT_REMOTE_SPEECH_BUBBLE_'))
     window.__atriaPaintedChat487.push(String(args[0]));
    return window.__atriaOriginalSpeech487.apply(this,args);
   };
  });
  const msg='BOT_REMOTE_SPEECH_BUBBLE_'+count;
  await h.send(1,msg,{tap:true});await allSee(msg);
  await h.clients[0].page.waitForFunction(()=>window.csWardChatState487?.().bubbles>0,{},{timeout:7000});
  const state=await h.clients[0].page.evaluate(()=>window.csWardChatState487());
  assert.equal(state.active,true);assert(state.history>0);
  await painter.waitForFunction(text=>window.__atriaPaintedChat487?.includes(text),msg,{timeout:7000});
  await painter.evaluate(()=>{speech=window.__atriaOriginalSpeech487;delete window.__atriaOriginalSpeech487;});
 });
 await check('hearing-range-distinguishes-near-and-far',async()=>{
  for(const c of h.clients){
   const d=await c.page.evaluate(()=>({
    near:window.csWardChatAudible487({x:player.x+30,y:player.y}),
    far:window.csWardChatAudible487({x:player.x+600,y:player.y}),
    radius:window.csWardChatState487().audibleRadius
   }));
   assert.equal(d.near,true);assert.equal(d.far,false);
   assert(d.radius>=180&&d.radius<=400);
  }
 });
 await check('guard-history-persists-across-patient-state-switch',async()=>{
  const state=await h.clients[0].page.evaluate(()=>{
   const previous=sim,before=activeChatArray().map(x=>x.slice());
   try{sim={...previous,globalChat:[]};const other=activeChatArray();
    return {before:before.length,after:other.length,
     retained:JSON.stringify(before)===JSON.stringify(other)}}
   finally{sim=previous}
  });
  assert(state.before>0&&state.retained,'ward conversation independent of patient record');
 });
 await check('all-doctors-send-concurrently',async()=>{
  const words=Array.from({length:count},(_,i)=>'BOT_RACE_'+count+'_'+i);
  await Promise.all(words.map((w,i)=>h.send(i,w,{tap:i%2===1})));
  for(const w of words)await one(w)
 });
 await check('incoming-message-preserves-IME-draft-and-caret',async()=>{
  const p=h.clients[0].page,inp=p.locator('#dieInput');
  await inp.fill('Mi borrador de anamnesis');await inp.evaluate(e=>{e.focus();e.setSelectionRange(3,11)});
  await h.send(1,'BOT_INCOMING_DRAFT_'+count);await allSee('BOT_INCOMING_DRAFT_'+count);
  assert.deepEqual(await inp.evaluate(e=>({value:e.value,start:e.selectionStart,end:e.selectionEnd,focus:document.activeElement===e})),
   {value:'Mi borrador de anamnesis',start:3,end:11,focus:true});
  await inp.fill('BOT_DRAFT_SENT_'+count);await inp.press('Enter');await one('BOT_DRAFT_SENT_'+count)
 });
 await check('owner-native-anamnesis-and-public-NPC-answer',async()=>{
  await h.select(0);await Promise.all(h.clients.slice(1).map((_,i)=>approach(i+1)));const msg='¿Desde cuándo tiene dolor '+count+'?';await h.send(0,'Paciente, '+msg);
  await one(msg);await Promise.all(h.clients.map(c=>c.page.waitForFunction(()=>
   sim?.globalChat?.some(x=>x[0]==='patient'),{},{timeout:25000})));
  const n=await h.clients[0].page.evaluate(t=>sim.chats.patient.filter(x=>x[0]==='doctor'&&x[1].includes(t)).length,msg);
  assert.equal(n,1,'native patient history contains one question')
 });
 await check('owner-tap-send-publishes-same-clinical-chat',async()=>{
  const msg='¿Qué ocurrió con el dolor '+count+'?';
  await h.send(0,'Paciente, '+msg,{tap:true});await one(msg);
  const n=await h.clients[0].page.evaluate(t=>
   sim.chats.patient.filter(x=>x[0]==='doctor'&&x[1].includes(t)).length,msg);
  assert.equal(n,1,'native history must register tap-sent question exactly once');
 });
 await check('unassigned-guest-nearest-patient-before-any-nurse',async()=>{
  await approach(1);const msg='¿Qué síntomas presenta hoy '+count+'?';await h.send(1,msg,{tap:true});
  await one(msg);await h.clients[0].page.waitForFunction(t=>
   sim.chats.patient.some(x=>x[0]==='doctor'&&x[1].includes(t)),msg,{timeout:25000});
  const owner=await h.clients[0].page.evaluate(t=>({questions:sim.chats.patient.filter(x=>x[0]==='doctor'&&x[1].includes(t)).length,
   medicines:sim.administrationLog.length}),msg);
  assert.equal(owner.questions,1);assert.equal(owner.medicines,0)
 });
 await check('patient-nurse-vega-mention-preserves-editor',async()=>{
  const p=h.clients[count-1].page,inp=p.locator('#dieInput');
  await inp.fill('Reevaluemos ahora');assert(await p.evaluate(()=>window.nsSelectChatTarget487('nurse')));
  assert.equal(await inp.inputValue(),'Enfermera, Reevaluemos ahora');
  assert(await p.evaluate(()=>window.nsSelectChatTarget487('expert')));
  assert.equal(await inp.inputValue(),'Dr. Vega, Reevaluemos ahora');
  assert(await p.evaluate(()=>window.nsSelectChatTarget487('patient')));
  assert.equal(await inp.inputValue(),'Paciente, Reevaluemos ahora');
  assert(await p.evaluate(()=>window.nsSelectChatTarget487(null)));
  assert.equal(await inp.inputValue(),'Reevaluemos ahora');
  assert(await inp.evaluate(e=>document.activeElement===e));await inp.fill('')
 });
 await check('guest-nurse-shared-ward-native-owner',async()=>{
  const msg='Enfermera, colocá dos vías y conectá el monitor';await h.send(1,msg,{tap:true});await one(msg);
  await h.clients[0].page.waitForFunction(()=>sim.venousAccessCount===2&&sim.monitorConnected,{},{timeout:40000});
  const a=(await h.snapshot())[0];assert.equal(a.iv,2);assert.equal(a.monitor,true);
  assert.equal(a.administrations.filter(x=>x.id==='ceftriaxone').length,0)
 });
 await check('movement-patient-selection-then-global-chat',async()=>{
  const p=h.clients[count-1].page;await approach(count-1);await p.evaluate(()=>csV41TakePatient(0));
  const msg='BOT_AFTER_MOVEMENT_'+count;await h.send(count-1,msg);await one(msg);
  await h.send(0,'BOT_OWNER_AFTER_MOVEMENT_'+count);await one('BOT_OWNER_AFTER_MOVEMENT_'+count)
 });
 assert.deepEqual(h.errors,[],'no uncaught Chromium errors')
}finally{
 const wire=h.requests.filter(x=>x.method==='POST'&&x.path.includes('/messages')&&
  x.body?.message?.kind==='team_chat').map(x=>({status:x.status,
  peerId:x.body.message.peerId,kind:x.body.message.kind,
  text:x.body.message.text,messageId:x.body.message.messageId,
  originPeerId:x.body.message.originPeerId})).filter(x=>/BOT_|CHAT_/.test(String(x.text))).slice(-200);
 const transports=await Promise.all(h.clients.map(c=>c.page.evaluate(()=>({
  self:csV41Challenge.selfId,hostId:csV41Challenge.hostId,
  role:csCoop.role,ready:csCoop.dc?.readyState,
  peers:csCoop.dc?.peerGameIds||[],known:csV41Challenge.players.map(p=>p.id)
 }))));
 await fs.writeFile(output+'/report.json',JSON.stringify({
  players:count,checks,errors:h.errors,snapshots:await h.snapshot(),wire,transports
 },null,2));
 for(let i=0;i<count;i++)await h.clients[i].page.screenshot({path:output+'/client-'+i+'.png'});
 await h.close()
}
assert(checks.every(x=>x.pass),JSON.stringify(checks.filter(x=>!x.pass)));
console.log('GLOBAL_CHAT_BOT_SUMMARY',JSON.stringify({players:count,checks:checks.length,realHTTP:true,
 independentBrowsers:true,androidEmulated:true,physicalAndroid:false}))
