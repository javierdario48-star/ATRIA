// Geometry and screenshots from the actual game, without clinical campaigns.
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {createRequire} from 'node:module';
import {browserHarness} from './browser-harness.mjs';

const output=process.env.V5_QA_OUTPUT||'qa/v5-guard-score-results';await fs.mkdir(output,{recursive:true});
const h=await browserHarness(),results=[],errors=[];
const {webkit}=createRequire(import.meta.url)(process.env.PLAYWRIGHT_MODULE_PATH||process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES+'/playwright');
let safari,webkitFailure;
try{safari=await webkit.launch({headless:true});}catch(error){
 if(process.env.CI==='true'||process.env.V5_REQUIRE_WEBKIT==='1')webkitFailure=error;
 else results.push({browser:'WebKit',skipped:true,reason:error.message.split('\n')[0]});
}
const views=[['android-portrait',h.devices['Pixel 5']],
 ['android-medium-portrait',{...h.devices['Pixel 5'],viewport:{width:480,height:850}}],
 ['android-landscape',{...h.devices['Pixel 5'],viewport:{width:851,height:393}}],
 ['desktop',{viewport:{width:1280,height:900}}],
 ['iphone-chromium',h.devices['iPhone 13']]];
if(safari)views.push(['iphone-webkit',h.devices['iPhone 13']]);
const requested=process.env.V5_QA_SCORE_VIEW;
try{
 if(webkitFailure)throw webkitFailure;
 assert(!requested||views.some(([name])=>name===requested),'unknown score viewport');
 for(const [name,options] of views.filter(([name])=>!requested||name===requested)){
  const context=await (name==='iphone-webkit'?safari:h.browser).newContext(options);
  try{
   const p=await context.newPage();p.setDefaultTimeout(45000);p.on('pageerror',e=>errors.push({name,error:e.message}));
   await p.goto(h.url);await p.waitForFunction(()=>document.body.dataset.boot==='ready');
   await p.locator('#playerName').fill('QA marcador');await p.locator('#enterButton').click();
   await p.locator('#guardButton').click();await p.locator('[data-mode="solo"]').click();
   await p.locator('input[name="guardScope"][value="specific"]').check();await p.locator('#caseChoice').selectOption('PUD-001');
   await p.locator('[data-action="start-guard"]').click();await p.waitForFunction(()=>atriaV5.snapshot().phase==='guard');
   const geometry=await p.evaluate(()=>{
    const score=document.getElementById('guardScoreboard'),a=score.getBoundingClientRect();
    const overlaps=[...document.querySelectorAll('#guardTime,#hud,#chatDock,#patientWheel,#clinicalPanel,button')]
     .filter(el=>!el.closest('[hidden],details:not([open])')&&getComputedStyle(el).visibility!=='hidden').filter(el=>{
      const b=el.getBoundingClientRect();return b.width&&b.height&&a.left<b.right&&a.right>b.left&&a.top<b.bottom&&a.bottom>b.top;
     }).map(el=>el.id||el.className);
    return {score:a.toJSON(),clock:document.getElementById('guardTime').getBoundingClientRect().toJSON(),overlaps,
     hudLeft:document.getElementById('hud').getBoundingClientRect().left,
     pointerEvents:getComputedStyle(score).pointerEvents,viewport:{width:innerWidth,height:innerHeight}};
   });
   await p.screenshot({path:output+'/'+name+'.png'});
   assert.deepEqual(geometry.overlaps,[],name+' scoreboard must leave the clock, HUD and controls unobstructed: '+JSON.stringify(geometry));
   assert.equal(geometry.pointerEvents,'none');
   assert(geometry.score.top>=0&&geometry.score.bottom<=geometry.viewport.height);
   assert(geometry.score.left>=0&&geometry.score.right<=geometry.viewport.width);
   assert(Math.abs(geometry.score.left-geometry.hudLeft)<=2,name+' scoreboard must align with the upper-left HUD');
   // Do not silently undo the requested elevation to make the overlap pass.
   assert(geometry.score.top<(name==='android-portrait'||name.startsWith('iphone')?130:141));
   if(await p.locator('#keyboardToggleButton').getAttribute('aria-pressed')==='true')await p.locator('#keyboardToggleButton').click();
   const uid=await p.evaluate(()=>atriaV5.snapshot().patients[0].uid);
   await p.locator('#receptionButton').click();await p.locator('[data-action="reception-approach"][data-patient-uid="'+uid+'"]').click();
   await p.locator('#patientWheel').waitFor({state:'visible',timeout:60000});
   await p.waitForFunction(()=>{
    const player=atriaV5.snapshot().player,camera=atriaV5.diagnostics().renderer.camera;
    return !player.moving&&!player.target&&Math.hypot(player.x-camera.x,player.y-camera.y)<1;
   });
   const bedside=await p.evaluate(async uid=>{
    const s=atriaV5.snapshot(),r=atriaV5.diagnostics().renderer,patient=s.patients.find(x=>x.uid===uid),canvas=document.getElementById('game').getBoundingClientRect();
    const image=new Image();image.src='/src/v5/content/assets/patient.webp';await image.decode();
    const height=40*r.scale,width=height*image.naturalWidth/image.naturalHeight,
     x=canvas.left+(patient.x-r.camera.x)*r.scale+r.anchorX,y=canvas.top+(patient.y-r.camera.y)*r.scale+r.anchorY;
    const sprite={left:x-width/2,right:x+width/2,top:y-height/2,bottom:y+height/2},score=document.getElementById('guardScoreboard').getBoundingClientRect();
    const overlaps=b=>score.left<b.right&&score.right>b.left&&score.top<b.bottom&&score.bottom>b.top;
    const controls=[...document.querySelectorAll('#patientWheel,#bedsideChecklist,button')].filter(el=>{
     if(el.closest('[hidden],details:not([open])'))return false;
     const b=el.getBoundingClientRect();return b.width&&b.height&&getComputedStyle(el).visibility!=='hidden'&&overlaps(b);
    }).map(el=>el.id||el.className);
    return {patient:sprite,patientOverlapped:overlaps(sprite),controls};
   },uid);
   await p.screenshot({path:output+'/'+name+'-bedside.png'});
   assert.equal(bedside.patientOverlapped,false,name+' patient must remain visible beside the scoreboard: '+JSON.stringify(bedside));
   assert.deepEqual(bedside.controls,[],name+' bedside controls must remain clear');
   const wheelLayouts=[];
   if(name==='android-landscape'){
    assert.equal(await p.locator('#bedsideChecklist [data-action="toggle-clinical-checklist"]').getAttribute('aria-expanded'),'true');
    for(const keyboardOpen of [false,true]){
     if(keyboardOpen)await p.locator('#keyboardToggleButton').tap();
     assert.equal(await p.locator('#keyboardToggleButton').getAttribute('aria-pressed'),String(keyboardOpen));
     const layout=await p.locator('#patientWheel').evaluate(async(wheel,keyboardOpen)=>{
      await new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)));
      const overlays=Object.fromEntries(['hud','chatDock','guardScoreboard','bedsideChecklist'].map(id=>
       [id,document.getElementById(id).getBoundingClientRect().toJSON()]));
      const overlaps=(a,b)=>a.left<b.right&&a.right>b.left&&a.top<b.bottom&&a.bottom>b.top;
      const wheelRect=wheel.getBoundingClientRect().toJSON();
      const actions=[...wheel.querySelectorAll('button:not([hidden])')].map(button=>{
       const rect=button.getBoundingClientRect().toJSON();
       const target=document.elementFromPoint(rect.x+rect.width/2,rect.y+rect.height/2);
       const withinWheel=rect.left>=wheelRect.left&&rect.top>=wheelRect.top&&rect.right<=wheelRect.right&&rect.bottom<=wheelRect.bottom;
       return {id:button.dataset.patientAction,rect,label:button.getAttribute('aria-label'),hit:button.contains(target),withinWheel};
      });
      return {keyboardOpen,wheel:wheelRect,overlays,actions,
       withinViewport:wheelRect.left>=0&&wheelRect.top>=0&&wheelRect.right<=innerWidth&&wheelRect.bottom<=innerHeight,
       overlaps:Object.keys(overlays).filter(id=>overlaps(wheelRect,overlays[id])),
       actionOverlaps:actions.filter((a,i)=>actions.slice(i+1).some(b=>overlaps(a.rect,b.rect))).map(a=>a.id)};
     },keyboardOpen);
     wheelLayouts.push(layout);
     if(keyboardOpen)await p.screenshot({path:output+'/'+name+'-bedside-keyboard.png'});
    }
    for(const layout of wheelLayouts){
     const detail=' keyboard '+(layout.keyboardOpen?'open':'closed')+': '+JSON.stringify(layout);
     assert.deepEqual(layout.overlaps,[],name+' wheel must clear the HUD, dock, score and expanded route with'+detail);
     assert(layout.withinViewport,name+' wheel must stay inside the viewport with'+detail);
     assert.deepEqual(layout.actions.map(action=>action.id),
      ['talk','diagnosis','examination','history','studies','treatment','patient','hint']);
     assert.deepEqual(layout.actionOverlaps,[],name+' each action needs its own touch target with'+detail);
     assert(layout.actions.every(a=>a.hit&&a.label&&a.withinWheel&&a.rect.width>=44&&a.rect.height>=44),
      name+' visible actions must have a labeled, reachable touch target with'+detail);
    }
    await p.locator('#patientWheel [data-patient-action="diagnosis"]').tap();
    assert.equal(await p.locator('#modal').getAttribute('data-panel'),'diagnosis');
   }
   results.push({name,physicalDevice:false,geometry,bedside,...(wheelLayouts.length?{wheelLayouts}:{})});
  }finally{await context.close();}
 }
 assert.deepEqual(errors,[]);
 await fs.rm(output+'/failure.json',{force:true});
 await fs.writeFile(output+'/results.json',JSON.stringify({passed:true,results,errors},null,2));
 console.log('GUARD SCORE GEOMETRY PASS '+JSON.stringify(results));
}catch(error){await fs.writeFile(output+'/failure.json',JSON.stringify({passed:false,error:error.message,results,errors},null,2));throw error;}
finally{await safari?.close();await h.close();}
