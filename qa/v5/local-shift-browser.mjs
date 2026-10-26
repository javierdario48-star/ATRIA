import assert from 'node:assert/strict';
import {browserHarness} from './browser-harness.mjs';
const h=await browserHarness(),errors=[];
try{
 const results=[];
 for(const mode of ['solo','apprentice']){
  const ctx=await h.browser.newContext(h.devices['Pixel 5']);
  try{
   const p=await ctx.newPage();p.setDefaultTimeout(20000);
   p.on('pageerror',e=>errors.push({mode,message:e.message}));
   await p.goto(h.url);await p.waitForFunction(()=>document.body.dataset.boot==='ready');
   await p.locator('#playerName').fill('Guardia '+mode);
   // The player sees and controls the EXACT outfit they will wear in game;
   // hidden form values must never be used as a shortcut in browser QA.
   await p.locator('[data-avatar-sex="'+(mode==='apprentice'?'female':'male')+'"]').click();
   const clicks=mode==='apprentice'?3:5; // navy -> pink / burgundy
   for(let i=0;i<clicks;i++)await p.locator('#avatarNextColor').click();
   assert.equal(await p.locator('#startingColor').inputValue(),
    mode==='apprentice'?'pink':'burgundy');
   assert.equal(await p.locator('#startingSex').inputValue(),
    mode==='apprentice'?'female':'male');
   // Loading and decoding the HD atlas is asynchronous: assert visible
   // completion, not the arbitrary timing of a network/paint race.
   await p.waitForFunction(()=>{
    const canvas=document.getElementById('avatarPreview');
    if(!canvas)return false;
    const d=canvas.getContext('2d').getImageData(0,0,canvas.width,canvas.height).data;
    let painted=0;for(let i=3;i<d.length;i+=4)if(d[i]>0)painted++;
    return painted>10000;
   },null,{timeout:20000});
   const prev=await p.locator('#startingColor').inputValue();
   await p.locator('#avatarPreviousColor').click();
   await p.locator('#avatarNextColor').click();
   assert.equal(await p.locator('#startingColor').inputValue(),prev,
    'back/next arrows must round-trip without changing the selected outfit');
   const atlas=await p.evaluate(async()=>{
    const img=new Image();img.src='/src/v5/content/assets/player-wardrobe.avif';
    await img.decode();return [img.naturalWidth,img.naturalHeight];
   });
   assert.deepEqual(atlas,[1536,1152],'the full-quality 384×576 frame must replace the former miniature');
   const backing=await p.locator('#avatarPreview').evaluate(canvas=>{
    const rect=canvas.getBoundingClientRect();
    return [canvas.width/rect.width,canvas.height/rect.height];
   });
   assert(backing[0]>=1.9&&backing[1]>=1.9,'preview backing store must match a retina display');
   await p.locator('#enterButton').click();
   await p.waitForFunction(mode=>{
    const player=atriaV5.snapshot().player;
    return player.color===(mode==='apprentice'?'pink':'burgundy')&&
      player.sex===(mode==='apprentice'?'female':'male');
   },mode);
   await p.locator('#guardButton').click();
   await p.locator('[data-mode="'+mode+'"]').click();
   await p.locator('#caseChoice').selectOption('PERI-TER-001');
   await p.locator('[data-action="start-guard"]').click();
   await p.waitForFunction(expected=>atriaV5.snapshot().mode===expected,mode);
   const state=await p.evaluate(()=>atriaV5.snapshot());
   assert.equal(!!state.expert,mode==='apprentice','Dr. Vega belongs to apprentice mode only');
   assert.equal(state.player.color,mode==='apprentice'?'pink':'burgundy');
   assert.equal(state.player.sex,mode==='apprentice'?'female':'male');
   assert.equal((await p.evaluate(()=>atriaV5.diagnostics().renderer.images)),22,
    'the selected wardrobe has all decoded sprites, rather than a default placeholder');
   assert.equal(state.patients.length,1,'the first arrival must be at the initial bed');
   await p.waitForFunction(()=>document.querySelector('#receptionGuide')?.hidden===false&&
    document.querySelectorAll('.unassigned-patient-marker').length>0);
   assert.equal(await p.locator('#receptionButton').evaluate(e=>e.classList.contains('reception-highlight')),true);
   await p.locator('#receptionButton').click();
   assert.equal(await p.locator('.reception-patient').count(),1);
   const triage=await p.locator('.reception-patient').first().getAttribute('data-acuity');
   assert(['critical','urgent','warning','stable'].includes(triage));
   assert.match(await p.locator('#modalContent').innerText(),/24 min reales/);
   const patientUid=state.patients[0].uid;
   await p.locator('[data-action="reception-approach"][data-patient-uid="'+patientUid+'"]').click();
   await p.waitForFunction(uid=>{
    const s=atriaV5.snapshot();
    return s.clinical?.patient?.uid===uid&&s.clinical.messages.some(m=>
     m.role==='player'&&m.text==='Hola ¿Qué te pasó?')&&
     s.clinical.messages.some(m=>m.role==='patient');
   },patientUid,{timeout:90000});
   assert.equal(await p.locator('#receptionGuide').isHidden(),true);
   assert.equal(await p.locator('#patientWheel').isHidden(),false,
    'arrival from reception must expose the existing bedside wheel');
   assert.equal(await p.locator('#patientWheel [data-patient-action="talk"]').evaluate(
    e=>e.classList.contains('patient-wheel-guided')),true,
    'shared bedside policy must guide Talk for both local modes');
   assert.equal((await p.evaluate(()=>atriaV5.snapshot().clinical)).messages.filter(
    m=>m.role==='player'&&m.text==='Hola ¿Qué te pasó?').length,1);
   results.push({mode,triage,mentor:!!state.expert,firstPatient:true,nativeConversation:true});
  }finally{await ctx.close();}
 }
 assert.deepEqual(errors,[]);
 console.log('LOCAL CONTINUOUS SHIFT BROWSER PASS',JSON.stringify({results,errors}));
}finally{await h.close();}
