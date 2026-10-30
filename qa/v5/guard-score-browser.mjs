// Geometry and screenshots from the actual game, without clinical campaigns.
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {createRequire} from 'node:module';
import {browserHarness} from './browser-harness.mjs';

const output='qa/v5-guard-score-results';await fs.mkdir(output,{recursive:true});
const h=await browserHarness(),results=[],errors=[];
const {webkit}=createRequire(import.meta.url)(process.env.PLAYWRIGHT_MODULE_PATH||process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES+'/playwright');
let safari;
try{safari=await webkit.launch({headless:true});}catch{results.push({browser:'WebKit',skipped:true,reason:'WebKit executable unavailable; iPhone Chromium emulation is reported separately'});}
const views=[['android-portrait',h.devices['Pixel 5']],
 ['android-landscape',{...h.devices['Pixel 5'],viewport:{width:851,height:393}}],
 ['desktop',{viewport:{width:1280,height:900}}],
 ['iphone-chromium',h.devices['iPhone 13']]];
if(safari)views.push(['iphone-webkit',h.devices['iPhone 13']]);
try{
 for(const [name,options] of views){
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
     .filter(el=>!el.hidden&&getComputedStyle(el).visibility!=='hidden').filter(el=>{
      const b=el.getBoundingClientRect();return b.width&&b.height&&a.left<b.right&&a.right>b.left&&a.top<b.bottom&&a.bottom>b.top;
     }).map(el=>el.id||el.className);
    return {score:a.toJSON(),clock:document.getElementById('guardTime').getBoundingClientRect().toJSON(),overlaps,
     pointerEvents:getComputedStyle(score).pointerEvents,viewport:{width:innerWidth,height:innerHeight}};
   });
   await p.screenshot({path:output+'/'+name+'.png'});
   assert.deepEqual(geometry.overlaps,[],name+' scoreboard must leave the clock, HUD and controls unobstructed: '+JSON.stringify(geometry));
   assert.equal(geometry.pointerEvents,'none');
   assert(geometry.score.top>=0&&geometry.score.bottom<=geometry.viewport.height);
   assert(geometry.score.left>=0&&geometry.score.right<=geometry.viewport.width);
   // Do not silently undo the requested elevation to make the overlap pass.
   assert(geometry.score.top<(name==='android-portrait'||name.startsWith('iphone')?130:141));
   results.push({name,physicalDevice:false,geometry});
  }finally{await context.close();}
 }
 assert.deepEqual(errors,[]);
 await fs.writeFile(output+'/results.json',JSON.stringify({passed:true,results,errors},null,2));
 console.log('GUARD SCORE GEOMETRY PASS '+JSON.stringify(results));
}catch(error){await fs.writeFile(output+'/failure.json',JSON.stringify({passed:false,error:error.message,results,errors},null,2));throw error;}
finally{await safari?.close();await h.close();}
