// Browser execution of the built ESM clinical owner with real spatial nursing.
// The severe-allergy scenario is supplied at patient creation (no mutation of a
// live patient, fabricated arrival, administration receipt or vital sign).
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {browserHarness} from './browser-harness.mjs';
const h=await browserHarness(),out=process.env.V5_QA_OUTPUT||'qa/v5-browser-results',reports=[];
try{
 await fs.mkdir(out,{recursive:true});
 for(const mobile of [false,true])for(const mode of ['solo','apprentice']){
  const context=await h.browser.newContext(mobile?h.devices['Pixel 5']:{viewport:{width:1200,height:850}});
  const page=await context.newPage(),errors=[];
  page.on('pageerror',e=>errors.push(e.message));await page.goto(h.url);
  await page.waitForFunction(()=>document.body.dataset.boot==='ready');
  const report=await page.evaluate(async({mode})=>{
   const [{createWorld},{createGuardSession},{historyHTML}]=await Promise.all([
    import('/src/v5/app/world.js'),import('/src/v5/clinical/guard-session.js'),import('/src/v5/ui/clinical-panels.js')]);
   const names={map:'hospital',beds:'beds',cases:'cases',therapies:'therapies',defaultDoses:'default-doses'},content={};
   for(const [key,name] of Object.entries(names))content[key]=await (await fetch('/src/v5/content/'+name+'.json')).json();
   const world=createWorld(content,{name:'Freedom QA',scrubColor:'navy'});
   world.enterLobby();world.enterGuard({mode,caseId:'APP-001'});
   const patient={...world.snapshot().patients[0],allergies:[{drugId:'ceftriaxone',severity:'severe'}]};
   const s=createGuardSession({roomId:'browser-freedom',mode,actorId:'doc',actorName:'Doctor',patient,content,
    resolveContext:()=>({patientUid:patient.uid}),nursing:{
     enqueue:x=>world.enqueueNurseJourney(x),takeArrivals:()=>world.takeNurseArrivals(),accept:x=>world.acceptNurseClinicalResult(x)}});
   const check=(v,label)=>{if(!v)throw Error(label);};
   let id=0;const send=text=>s.post({id:'m'+(++id),text});
   const step=async seconds=>{
    for(let t=0;t<seconds-1e-9;t+=1/30){const dt=Math.min(1/30,seconds-t);world.step(dt);s.finishNurseArrivals();s.advance(dt);}
    await s.flush();
   };
   try{
    check(!/ceftriaxona/i.test(historyHTML(s.read().patient)),'hidden allergy leaked before questioning');
    const answer=await send('¿Tiene alergias?');
    check(/ceftriaxona.*grave/i.test(answer.clinical[0].receipt.answer),'patient must report actual allergy');
    await send('Enfermera una vía');await step(30);
    check(s.read().patient.venousAccessCount===1,'physical IV did not complete');
    const ack=await send('Enfermera ceftriaxona 1 g y metronidazol 500 mg');
    check(ack.clinical.every(x=>x.status==='pending'),'contraindication blocked a valid compound order');
    check(s.read().patient.administrationLog.length===0,'dose arrived before nurse');
    await step(40);
    const state=s.read();
    check(state.patient.administrationLog.length===2,'both drugs must have authentic receipts');
    check(state.patient.liveVitals.sys<100&&state.patient.liveVitals.spo2<94,'no physiological allergy');
    check(state.patient.adverseEvents.length===1,'missing/duplicate complication');
    check(state.room.events.filter(x=>x.type==='clinical.complication').length===1,'complication transcript');
    check(state.closure.quality.penalty>=5,'missing adverse score');
    const panel=document.createElement('section');panel.id='freedom-history';
    panel.style.cssText='position:fixed;inset:0;overflow:auto;background:#10212b;color:white;padding:20px;z-index:99999';
    panel.innerHTML=historyHTML(state.patient);document.body.append(panel);
    return {mode,sys:state.patient.liveVitals.sys,spo2:state.patient.liveVitals.spo2,
     receipts:state.patient.administrationLog.length,complications:state.patient.adverseEvents.length,
     penalty:state.closure.quality.penalty,journeys:world.nurseJourneySnapshot().map(x=>x.stage)};
   }finally{s.dispose();}
  },{mode});
  assert.equal(errors.length,0,JSON.stringify(errors));
  await page.screenshot({path:out+'/freedom-'+mode+'-'+(mobile?'mobile':'desktop')+'.png'});
  reports.push({mobile,...report});await context.close();
 }
 await fs.writeFile(out+'/clinical-freedom.json',JSON.stringify(reports,null,2)+'\n');
 console.log('V5 CLINICAL FREEDOM BROWSER',JSON.stringify(reports));
}finally{await h.close();}
