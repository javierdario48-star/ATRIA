// Real Chromium DOM/pointer events with the generated canvas and chat code.
// Mobile viewport/touch and synthetic IME events; no physical soft keyboard.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createRequire} from 'node:module';
import {apply487} from '../src/integration/apply-487.js';
const require=createRequire(import.meta.url);
const {chromium,devices}=require(process.env.PLAYWRIGHT_MODULE_PATH||'playwright');
const html=apply487(fs.readFileSync('vendor/atria-4.8.6/index.html','utf8'));
const part=(a,b)=>{const from=html.indexOf(a),to=html.indexOf(b,from+a.length);
 assert(from>=0&&to>from,a);return html.slice(from,to)};
const tap=part('function handleGameTap(e){','function diegeticTick(){');
const hit=part('function pointerHitsNpc(e){',"canvas.addEventListener('pointerdown'");
const pointer=html.split('\n').find(x=>x.startsWith("canvas.addEventListener('pointerdown',e=>"));
const hospital=html.split('\n').find(x=>x.startsWith(' handleGameTap=function(e){for(const a of actors)'));
assert(pointer&&hospital,'actual canvas and late hospital tap wrappers');
const selector=html.split('<script id="atria-recipient-selector-487">')[1].split('</script>')[0];
const browser=await chromium.launch({headless:true,args:['--no-sandbox'],
 ...(process.env.CHROMIUM_EXECUTABLE_PATH?{executablePath:process.env.CHROMIUM_EXECUTABLE_PATH}:{})});
try{
 for(const device of ['desktop','android-emulated']){
  const context=await browser.newContext(device==='desktop'?{viewport:{width:1024,height:768}}:
   {...devices['Pixel 5']});
  const page=await context.newPage(),errors=[];
  page.on('pageerror',e=>errors.push(e.message));
  await page.setContent('<meta name="viewport" content="width=device-width,initial-scale=1">'+
   '<style>body{margin:0}canvas{position:absolute;top:0;left:0;touch-action:none}#chatDock{position:absolute;top:370px;left:10px}input{width:340px;font-size:16px}</style>'+
   '<canvas id="game" width="390" height="320"></canvas><div id="chatDock">'+
   '<button id="chatTargetBtn"><span></span></button><input id="dieInput"></div><button id="mentorBtn"></button>');
  await page.addScriptTag({content:`
   var C={id:'CASE'},sim={mentor:{enabled:true},patientInstance:{uid:'A'},chats:{expert:[],patient:[],nurse:[]}};
   var editorOpen=false,near='patient',wardNurses=[],records=[],moves=0,radials=0,steerHold=null;
   var canvas=document.getElementById('game'),player={x:200,y:100},nurse={x:200,y:100};
   var pendingAddress=null,chatRole='patient';
   function npcScreen(role){return {patient:[80,100],nurse:[200,100],expert:[310,100]}[role]}
   function tapNear(x,y,px,py,d){return Math.hypot(x-px,y-py)<=d}
   function worldToScreen(x,y){return [x,y]}
   function showRadial(){radials++}function moveToEntity(){moves++}
   function syncDiegeticViewport(){}function monitorHotspotAt(){return null}
   function hideRadial(){}function closeFloatCard(){}function setPlayerTarget(){moves++}
   function refreshChatDock(){document.getElementById('dieInput').outerHTML='<input id="dieInput">'}
   function sendMessage(t){records.push(['system',t]);return true}
   function mentorUserMessage(t){records.push(['expert',t])}
   function nurseNatural(t){records.push(['nurse',t])}
   function deliverPatientSpeech(t){records.push(['patient',t])}
   function addGlobalChat(){}
   window.nsMayExamine=()=>true;
   ${tap}${hit}
   var actors=[nurse],base={tap:handleGameTap};function nurseFor(){return nurse}
   ${hospital}
   ${selector}
   ${pointer}`});
  const input=()=>page.locator('#dieInput');
  const click=async(role)=>{const x={patient:80,nurse:200,expert:310}[role];
   if(device==='desktop')await page.mouse.click(x,100);else await page.touchscreen.tap(x,100);};
  const state=()=>page.evaluate(()=>{const i=document.getElementById('dieInput');return {
   value:i.value,focused:document.activeElement===i,start:i.selectionStart,end:i.selectionEnd,
   sent:records.length,y:window.scrollY,height:window.innerHeight,moves,radials};});
  await input().fill('Creo que necesitamos antibióticos.');
  const initial=await state();
  for(const role of ['expert','nurse','patient','expert','expert','nurse']){
   await click(role);const s=await state(),prefix={expert:'Dr. Vega, ',nurse:'Enfermera, ',patient:'Paciente, '}[role];
   assert.equal(s.value,prefix+'Creo que necesitamos antibióticos.');
   assert(s.focused);assert.equal(s.start,prefix.length);assert.equal(s.end,prefix.length);
   assert.equal(s.sent,0);assert.equal(s.y,initial.y);assert.equal(s.height,initial.height);
  }
  await page.evaluate(()=>document.getElementById('dieInput').blur());
  await click('expert');assert((await state()).focused,'gesture recovers focus');
  await page.evaluate(()=>{const i=document.getElementById('dieInput');i.value='Necesitamos antibióti';
   i.dispatchEvent(new CompositionEvent('compositionstart',{bubbles:true,data:'antibióti'}));});
  await click('nurse');await click('expert');
  assert.equal((await state()).value,'Necesitamos antibióti');
  await page.evaluate(()=>{const i=document.getElementById('dieInput');window.imeNode=i;refreshChatDock();});
  assert(await page.evaluate(()=>imeNode===document.getElementById('dieInput')));
  await page.evaluate(()=>{const i=document.getElementById('dieInput');i.value='Necesitamos antibióticos.';
   i.dispatchEvent(new CompositionEvent('compositionend',{bubbles:true,data:'antibióticos'}));});
  assert.equal((await state()).value,'Dr. Vega, Necesitamos antibióticos.');
  await page.evaluate(()=>{const i=document.getElementById('dieInput');i.setSelectionRange(12,16);refreshChatDock();});
  assert.equal((await state()).start,12);assert.equal((await state()).end,16);assert((await state()).focused);
  await page.evaluate(()=>{sendMessage('Dr. Vega, ¿debo administrar noradrenalina?');
   sendMessage('Enfermero, conectá el monitor');sendMessage('¿La enfermera ya pasó?');
   sendMessage('/equipo ceftriaxona');});
  assert.deepEqual(await page.evaluate(()=>records.map(x=>x[0])),['expert','nurse','patient','system']);
  await page.evaluate(()=>document.body.classList.add('nsLobbyMode'));
  await click('expert');await page.evaluate(()=>sendMessage('Enfermera, noradrenalina'));
  assert.equal((await page.evaluate(()=>records)).at(-1)[0],'system','lobby remains social');
  assert.deepEqual(errors,[]);
  console.log('CHROMIUM NPC CHAT PASS',JSON.stringify({device,imeSynthetic:true,
   nativeCanvasEvents:true,nativeHospitalWrapper:true,focus:true,physicalAndroid:false}));
  await context.close();
 }
}finally{await browser.close();}
