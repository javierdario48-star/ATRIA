// Platform-only response audit; public-browser actions, no patient/medical state injection.
// Separates nurse responsiveness and Vega latency from correctness of each disease.
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {browserHarness} from './browser-harness.mjs';
import {walk} from './cooperative-ui.mjs';

const report={sha:process.env.GITHUB_SHA||'unknown',physicalAndroid:false,
 deployedVercel:false,transport:'local in-process clinical session; no WAN latency',
 samples:[],errors:[],began:new Date().toISOString()};
const output='qa/v5-responsiveness-results';await fs.mkdir(output,{recursive:true});
const h=await browserHarness();
function p95(samples){const a=samples.slice().sort((a,b)=>a-b);return a[Math.max(0,Math.ceil(.95*a.length)-1)]??null;}
function stats(rows){const values=rows.map(x=>x.ms);
 return {count:rows.length,minMs:Math.min(...values),medianMs:values.slice().sort((a,b)=>a-b)[Math.floor(values.length/2)],
 p95Ms:p95(values),maxMs:Math.max(...values)};}
async function measure(page,{device,feature,action,done}){
 const begun=Date.now(),previous=await page.evaluate(done);
 await action();
 await page.waitForFunction(({fn,before})=>{
  const c=window.atriaV5?.snapshot()?.clinical;
  if(!c)return false;
  return (c.messages||[]).filter(x=>x.role===fn).length>before;
 },{fn:feature==='nurse-question'?'nurse':'mentor',before:previous},{timeout:14000});
 const ms=Date.now()-begun;
 report.samples.push({device,feature,ms});
 assert(ms<8000,device+' '+feature+' response took '+ms+' ms in local offline mode');
 return ms;
}
let failures=[];
try{
 for(const [device,options,mode] of [
  ['desktop',{viewport:{width:1100,height:820}},'solo'],
  ['android-emulated',h.devices['Pixel 5'],'apprentice']]){
  const ctx=await h.browser.newContext(options),page=await ctx.newPage();
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  page.setDefaultTimeout(18000);
  try{
   await page.goto(h.url);
   await page.waitForFunction(()=>document.body.dataset.boot==='ready');
   await page.locator('#enterButton').click();
   await page.locator('#guardButton').click();
   await page.locator('[data-mode="'+mode+'"]').click();
   await page.locator('input[name="guardScope"][value="specific"]').check();
   await page.locator('#caseChoice').selectOption('CIRR-001');
   await page.locator('[data-action="start-guard"]').click();
   await page.waitForFunction(()=>atriaV5.snapshot().phase==='guard');
   if(await page.locator('#keyboardToggleButton').getAttribute('aria-pressed')==='true')
    await page.locator('#keyboardToggleButton').click();
   await walk(page,144);
   const coords=await page.evaluate(()=>{
    const entity=atriaV5.snapshot().entities.find(e=>e.kind==='patient'),r=atriaV5.diagnostics().renderer;
    return {x:(entity.x-r.camera.x)*r.scale+r.anchorX,
      y:(entity.y-r.camera.y)*r.scale+r.anchorY};
   });
   await page.locator('#game').click({position:coords});
   await page.locator('#patientWheel').waitFor({state:'visible'});
   assert(await page.locator('#patientWheel [data-patient-action="hint"]').isVisible());
   for(let index=0;index<3;index++){
    if(index>0){
     await page.locator('#vegaClinicalHint button').click();
     const pt=await page.evaluate(()=>{
      const e=atriaV5.snapshot().entities.find(x=>x.kind==='patient'),r=atriaV5.diagnostics().renderer;
      return {x:(e.x-r.camera.x)*r.scale+r.anchorX,y:(e.y-r.camera.y)*r.scale+r.anchorY};
     });
     await page.locator('#game').click({position:pt});
    }
    const start=Date.now();
    await page.locator('#patientWheel [data-patient-action="hint"]').click();
    await page.locator('#vegaClinicalHint').waitFor({state:'visible',timeout:14000});
    await page.waitForFunction(()=>atriaV5.snapshot().clinical.hintCount===1);
    const ms=Date.now()-start;
    report.samples.push({device,feature:'vega-button-to-painted-charged',ms,attempt:index+1});
    assert(ms<8000,'local Vega response too slow '+ms+' ms');
   }
   await page.locator('#vegaClinicalHint button').click();
   for(let index=0;index<12;index++){
    await measure(page,{device,feature:'nurse-question',
     done:()=>window.atriaV5.snapshot().clinical.messages.filter(x=>x.role==='nurse').length,
     action:async()=>{
      await page.locator('#dieInput').fill('Enfermera, alergias');
      await page.locator('#chatForm [type="submit"]').click();
     }});
   }
   for(let index=0;index<4;index++){
    await measure(page,{device,feature:'vega-chat',
     done:()=>window.atriaV5.snapshot().clinical.messages.filter(x=>x.role==='mentor').length,
     action:async()=>{
      await page.locator('#dieInput').fill('Vega, ¿Qué hago ahora?');
      await page.locator('#chatForm [type="submit"]').click();
     }});
   }
   const nurseCount=await page.evaluate(()=>atriaV5.snapshot().clinical.messages.filter(m=>m.role==='nurse').length);
   const visibleCount=await page.locator('#chatHistory [data-role="nurse"]').count();
   assert(nurseCount>=12,'12 nurse questions must have 12 clinical replies');
   assert(visibleCount>=12,'12 nurse responses must appear in the displayed transcript');
   assert.deepEqual(errors,[],'page JS errors');
   report.samples.push({device,feature:'nurse-answered-all',requests:12,replies:nurseCount,visibleReplies:visibleCount});
   await page.screenshot({path:output+'/'+device+'.png'});
  }catch(e){
   const details={device,error:String(e?.stack||e)};failures.push(details);
   try{await page.screenshot({path:output+'/'+device+'-failure.png'});}catch{}
  }finally{await ctx.close();}
 }
}finally{await h.close();}
report.failed=failures;report.completed=new Date().toISOString();
report.stats=Object.fromEntries([...new Set(report.samples.map(x=>x.feature))].filter(x=>x!=='nurse-answered-all').map(key=>
 [key,Object.fromEntries(['desktop','android-emulated'].map(device=>[device,
 stats(report.samples.filter(x=>x.feature===key&&x.device===device))]))]));
await fs.writeFile(output+'/summary.json',JSON.stringify(report,null,2)+'\n');
console.log('ATRIA_RESPONSE_LATENCY='+JSON.stringify({stats:report.stats,failed:failures,silentNurseSamples:report.samples.filter(x=>x.feature==='nurse-answered-all')}));
assert.deepEqual(failures,[],'Response benchmark failed; inspect screenshots and report');
